import { randomUUID } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

let transporter: Transporter | null = null;
let gmailToken: { value: string; expiresAt: number } | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.EMAIL_MODE === "smtp") {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
    return transporter;
  }

  // console mode: keep the message in memory and log it.
  transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "windows",
  });
  return transporter;
}

function otpHtml(code: string) {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
    <h1 style="font-size:20px;margin:0 0 8px">Verify your Uniformity account</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563">
      Enter this 6-digit code to confirm your Bicol University student email.
      The code is single-use and expires in ${env.OTP_TTL_MINUTES} minutes.
    </p>
    <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:24px 0;color:#166534">
      ${code}
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280">
      If you did not create a Uniformity account you can ignore this message.
    </p>
  </div>`;
}

/* -------------------------------------------------------------------------- */
/* Gmail API (OAuth2 refresh token, scope gmail.send)                          */
/* -------------------------------------------------------------------------- */

function gmailAuthHint(reason: string) {
  if (reason.includes("invalid_grant")) {
    return "Gmail refresh token is invalid or revoked. Re-run the OAuth consent with the gmail.send scope and update GMAIL_REFRESH_TOKEN.";
  }
  if (reason.includes("invalid_client")) {
    return "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET do not match the OAuth client.";
  }
  if (reason.includes("unauthorized_client")) {
    return "This OAuth client is not allowed to use the refresh-token grant. Use a Desktop app OAuth client.";
  }
  return "Check GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.";
}

/** Exchanges the long-lived refresh token for a short-lived access token. */
async function getGmailAccessToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    gmailToken &&
    gmailToken.expiresAt > Date.now() + 60_000
  ) {
    return gmailToken.value;
  }

  const response = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID!,
      client_secret: env.GMAIL_CLIENT_SECRET!,
      refresh_token: env.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string }
    | null;

  if (!response.ok || !payload?.access_token) {
    const reason = payload?.error ?? `HTTP ${response.status}`;
    throw new Error(`Gmail token exchange failed (${reason}). ${gmailAuthHint(reason)}`);
  }

  gmailToken = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };

  return gmailToken.value;
}

function encodeHeader(value: string) {
  // RFC 2047 for anything outside printable ASCII.
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function senderAddress() {
  const configured = env.MAIL_FROM?.trim();
  if (!configured || configured.includes("uniformity.local")) {
    // Gmail only accepts the authenticated mailbox (or a verified alias).
    return `Uniformity <${env.GMAIL_USER}>`;
  }
  return configured;
}

function formatFrom(from: string) {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return from;
  const name = match[1] ?? "";
  const address = match[2]!;
  return name ? `${encodeHeader(name)} <${address}>` : address;
}

function wrap76(value: string) {
  return value.match(/.{1,76}/g) ?? [""];
}

/** RFC 2822 multipart/alternative message, base64url encoded for the API. */
function buildRawMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const boundary = `uniformity_${randomUUID()}`;
  const lines = [
    `From: ${formatFrom(input.from)}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    ...wrap76(Buffer.from(input.text, "utf8").toString("base64")),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    ...wrap76(Buffer.from(input.html, "utf8").toString("base64")),
    `--${boundary}--`,
    "",
  ];

  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

async function sendViaGmailApi(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const raw = buildRawMessage({ from: senderAddress(), ...input });

  const post = (token: string) =>
    fetch(GMAIL_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

  let response = await post(await getGmailAccessToken());

  // The cached token can be revoked between calls; retry once on 401.
  if (response.status === 401) {
    response = await post(await getGmailAccessToken(true));
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; status?: string } }
      | null;
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    const scopeHint = /insufficient|scope|permission/i.test(message)
      ? " Grant the gmail.send scope when generating GMAIL_REFRESH_TOKEN."
      : "";
    throw new Error(`Gmail API rejected the message: ${message}.${scopeHint}`);
  }

  const result = (await response.json().catch(() => null)) as
    | { id?: string }
    | null;

  logger.info({ to: input.to, messageId: result?.id }, "[email:gmail] sent");
}

/** Sends the OTP. Throws when delivery fails so the caller can surface it. */
export async function sendVerificationEmail(to: string, code: string) {
  const subject = "Your Uniformity verification code";
  const text = `Your Uniformity verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`;
  const html = otpHtml(code);

  if (env.EMAIL_MODE === "console") {
    logger.info({ to, code }, "[email:console] verification code generated");
    return;
  }

  if (env.EMAIL_MODE === "gmail") {
    await sendViaGmailApi({ to, subject, text, html });
    return;
  }

  await getTransporter().sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

/** Sends a single-use password reset code. */
export async function sendPasswordResetEmail(to: string, code: string) {
  const subject = "Reset your Uniformity password";
  const text = `Your Uniformity password reset code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes. If you did not request this, ignore this message.`;
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
    <h1 style="font-size:20px;margin:0 0 8px">Reset your Uniformity password</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563">Enter this 6-digit code to choose a new password. It is single-use and expires in ${env.OTP_TTL_MINUTES} minutes.</p>
    <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:24px 0;color:#166534">${code}</p>
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280">If you did not request this, you can ignore this message.</p>
  </div>`;

  if (env.EMAIL_MODE === "console") {
    logger.info({ to, code }, "[email:console] password reset code generated");
    return;
  }
  if (env.EMAIL_MODE === "gmail") {
    await sendViaGmailApi({ to, subject, text, html });
    return;
  }
  await getTransporter().sendMail({ from: env.MAIL_FROM, to, subject, text, html });
}

/** Used by `npm run email:test` to fail fast on misconfiguration. */
export async function verifyEmailTransport(): Promise<string> {
  if (env.EMAIL_MODE === "console") {
    return "console (no delivery; the OTP is logged and returned in development)";
  }

  if (env.EMAIL_MODE === "gmail") {
    await getGmailAccessToken(true);
    return `gmail (${env.GMAIL_USER})`;
  }

  await getTransporter().verify();
  return `smtp (${env.SMTP_HOST}:${env.SMTP_PORT})`;
}
