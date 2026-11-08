import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Support running from the api/ folder as well as the repository root.
for (const candidate of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "api/.env"),
]) {
  if (fs.existsSync(candidate)) dotenv.config({ path: candidate });
}

const optional = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const booleanish = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // `auto` (default) enables TLS for Supabase and for `sslmode=require` URLs.
  // Set to `true`/`false` to override, which local Postgres needs.
  DATABASE_SSL: z
    .enum(["auto", "true", "false", "1", "0", "require", "disable"])
    .optional()
    .transform((value) => value?.toLowerCase() as
      | "auto"
      | "true"
      | "false"
      | "1"
      | "0"
      | "require"
      | "disable"
      | undefined),
  // Never disable this against a managed provider in production.
  DATABASE_SSL_STRICT: booleanish,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(12),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Concurrent requests can race a rotation. Within this window a just-rotated
  // token may mint another token in the same family instead of being treated as
  // replay theft.
  REFRESH_REUSE_GRACE_SECONDS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  WEB_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  COOKIE_DOMAIN: optional,
  COOKIE_SECURE: booleanish,

  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  EXPOSE_DEV_OTP: booleanish,

  EMAIL_MODE: z.enum(["console", "smtp", "gmail"]).default("console"),
  MAIL_FROM: z.string().default("Uniformity <no-reply@uniformity.local>"),
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanish,
  SMTP_USER: optional,
  SMTP_PASS: optional,
  GMAIL_USER: optional,
  GMAIL_CLIENT_ID: optional,
  GMAIL_CLIENT_SECRET: optional,
  GMAIL_REFRESH_TOKEN: optional,

  // Web Push (VAPID). Optional: push delivery is skipped when unset.
  VAPID_PUBLIC_KEY: optional,
  VAPID_PRIVATE_KEY: optional,
  VAPID_SUBJECT: z.string().min(1).default("mailto:no-reply@uniformity.local"),

  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
  // `auto` uses Cloudinary when configured and falls back to local disk in
  // development. Production always requires Cloudinary.
  UPLOAD_DRIVER: z.enum(["auto", "cloudinary", "local"]).default("auto"),
  PUBLIC_DIR: optional,
});

function requireTogether(
  value: Record<string, unknown>,
  keys: readonly string[],
  mode: string,
  ctx: z.RefinementCtx,
) {
  const missing = keys.filter((key) => !value[key]);
  if (missing.length === 0) return;
  for (const key of missing) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [key],
      message: `Required when EMAIL_MODE=${mode}`,
    });
  }
}

const envSchemaWithRules = envSchema.superRefine((value, ctx) => {
  if (value.EMAIL_MODE === "gmail") {
    requireTogether(
      value,
      [
        "GMAIL_USER",
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
      ],
      "gmail",
      ctx,
    );
  }

  if (value.EMAIL_MODE === "smtp" && !value.SMTP_HOST) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SMTP_HOST"],
      message: "Required when EMAIL_MODE=smtp",
    });
  }

  // VAPID keys are a pair: half a pair would silently disable push delivery.
  if (Boolean(value.VAPID_PUBLIC_KEY) !== Boolean(value.VAPID_PRIVATE_KEY)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [value.VAPID_PUBLIC_KEY ? "VAPID_PRIVATE_KEY" : "VAPID_PUBLIC_KEY"],
      message: "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set together",
    });
  }
});

const parsed = envSchemaWithRules.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid API environment:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

function resolvePublicDir() {
  if (raw.PUBLIC_DIR) return path.resolve(raw.PUBLIC_DIR);

  // tsx/ts-node runs with the `api/` folder as cwd, while the built server may
  // be started from the repository root. Prefer an existing sibling `public`.
  const candidates = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "../public"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]!;
}

/**
 * Supabase (and most managed Postgres providers) require TLS. Detect it so a
 * plain connection string works without an extra flag, while local Postgres
 * keeps working. An explicit DATABASE_SSL always wins.
 */
function resolveDatabaseSsl() {
  if (
    raw.DATABASE_SSL === "true" ||
    raw.DATABASE_SSL === "1" ||
    raw.DATABASE_SSL === "require"
  ) {
    return true;
  }
  if (
    raw.DATABASE_SSL === "false" ||
    raw.DATABASE_SSL === "0" ||
    raw.DATABASE_SSL === "disable"
  ) {
    return false;
  }

  let host = "";
  try {
    host = new URL(raw.DATABASE_URL).hostname;
  } catch {
    host = "";
  }

  return (
    /(^|\.)supabase\.(co|com)$/.test(host) ||
    /sslmode=(require|verify-ca|verify-full)/.test(raw.DATABASE_URL)
  );
}

function databaseHost() {
  try {
    return new URL(raw.DATABASE_URL).hostname;
  } catch {
    return "unknown";
  }
}

const uploadDriver =
  raw.UPLOAD_DRIVER === "cloudinary"
    ? "cloudinary"
    : raw.UPLOAD_DRIVER === "local"
      ? raw.NODE_ENV === "production"
        ? "cloudinary"
        : "local"
      : raw.NODE_ENV !== "production" &&
          !(raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET)
        ? "local"
        : "cloudinary";

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  // Secure cookies must default to on in production; local http needs them off.
  cookieSecure: raw.COOKIE_SECURE || raw.NODE_ENV === "production",
  cloudinaryEnabled: Boolean(
    raw.CLOUDINARY_CLOUD_NAME &&
      raw.CLOUDINARY_API_KEY &&
      raw.CLOUDINARY_API_SECRET,
  ),
  uploadDriver,
  publicDir: resolvePublicDir(),
  databaseSsl: resolveDatabaseSsl(),
  databaseSslStrict: raw.DATABASE_SSL_STRICT,
  databaseHost: databaseHost(),
  databaseProvider: /supabase\.(co|com)$/.test(databaseHost())
    ? "supabase"
    : "postgres",
  pushEnabled: Boolean(raw.VAPID_PUBLIC_KEY && raw.VAPID_PRIVATE_KEY),
  // In development the OTP can be returned to make end-to-end testing possible.
  exposeDevOtp:
    raw.EXPOSE_DEV_OTP && raw.NODE_ENV !== "production",
};

export type Env = typeof env;
