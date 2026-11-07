import { env } from "../../config/env";
import { query } from "../../config/db";
import { sendVerificationEmail } from "../../config/mailer";
import type { UserRow } from "../../types";
import {
  badRequest,
  conflict,
  unauthorized,
} from "../../utils/ApiError";
import { generateOtp, hashOtp, safeEqualHex } from "../../utils/crypto";
import { hashPassword, verifyPassword } from "../../utils/password";
import type { RegisterInput } from "./auth.schema";

interface VerificationRow {
  code_id: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

interface OtpResult {
  sent: boolean;
  code?: string;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    `SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(userId: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE user_id = $1`, [
    userId,
  ]);
  return rows[0] ?? null;
}

async function latestCode(userId: string): Promise<VerificationRow | null> {
  const { rows } = await query<VerificationRow>(
    `SELECT code_id, code_hash, attempts, expires_at, consumed_at, created_at
       FROM email_verification_codes
      WHERE user_id = $1 AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Invalidates previous codes, stores a keyed hash of a fresh 6-digit code, and
 * delivers it. A short cooldown prevents an attacker from spamming an inbox.
 */
async function issueVerificationCode(
  user: UserRow,
  options: { enforceCooldown: boolean },
): Promise<OtpResult> {
  if (options.enforceCooldown) {
    const previous = await latestCode(user.user_id);
    if (previous) {
      const ageMs = Date.now() - previous.created_at.getTime();
      if (ageMs < env.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
        return { sent: false };
      }
    }
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await query(
    `UPDATE email_verification_codes
        SET consumed_at = now()
      WHERE user_id = $1 AND consumed_at IS NULL`,
    [user.user_id],
  );

  await query(
    `INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.user_id, hashOtp(user.email, code), expiresAt],
  );

  await sendVerificationEmail(user.email, code);

  return {
    sent: true,
    ...(env.exposeDevOtp ? { code } : {}),
  };
}

export async function register(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    if (existing.is_verified) {
      throw conflict(
        "An account with this email already exists. Try signing in instead.",
        "EMAIL_TAKEN",
      );
    }

    // Resume a registration that never completed verification.
    const otp = await issueVerificationCode(existing, { enforceCooldown: true });
    return {
      email: existing.email,
      requiresVerification: true as const,
      ...(otp.code ? { devOtp: otp.code } : {}),
    };
  }

  const passwordHash = await hashPassword(input.password);

  const { rows } = await query<UserRow>(
    `INSERT INTO users
       (email, password_hash, name, year_level, department, program,
        contact_email, contact_mobile, contact_messenger, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $1, $7, $8, false)
     RETURNING *`,
    [
      input.email,
      passwordHash,
      input.name,
      input.yearLevel,
      input.department,
      input.program,
      input.contactMobile,
      input.contactMessenger || null,
    ],
  );

  const user = rows[0]!;
  const otp = await issueVerificationCode(user, { enforceCooldown: false });

  return {
    email: user.email,
    requiresVerification: true as const,
    ...(otp.code ? { devOtp: otp.code } : {}),
  };
}

export async function resendVerification(email: string) {
  const user = await findUserByEmail(email);

  // Do not reveal whether an address is registered.
  if (!user || user.is_verified) return { sent: true };

  const otp = await issueVerificationCode(user, { enforceCooldown: true });
  if (!otp.sent) {
    throw badRequest(
      "Wait a minute before requesting another code.",
      "RESEND_COOLDOWN",
    );
  }

  return { sent: true, ...(otp.code ? { devOtp: otp.code } : {}) };
}

export async function verifyEmailOtp(email: string, code: string): Promise<UserRow> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw badRequest("That code is invalid or has expired.", "INVALID_OTP");
  }

  if (user.is_verified) {
    // Never mint a session from the verify endpoint alone: the code was already
    // consumed, so any caller could otherwise sign in with a guessed code.
    throw badRequest(
      "This email is already verified. Sign in instead.",
      "ALREADY_VERIFIED",
    );
  }

  const record = await latestCode(user.user_id);
  if (!record) {
    throw badRequest(
      "That code has expired. Request a new one.",
      "OTP_EXPIRED",
    );
  }

  if (record.expires_at.getTime() <= Date.now()) {
    await query(
      `UPDATE email_verification_codes SET consumed_at = now() WHERE code_id = $1`,
      [record.code_id],
    );
    throw badRequest("That code has expired. Request a new one.", "OTP_EXPIRED");
  }

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw badRequest(
      "Too many incorrect attempts. Request a new code.",
      "OTP_LOCKED",
    );
  }

  if (!safeEqualHex(record.code_hash, hashOtp(user.email, code))) {
    const attempts = record.attempts + 1;
    await query(
      `UPDATE email_verification_codes SET attempts = $2 WHERE code_id = $1`,
      [record.code_id, attempts],
    );
    const remaining = Math.max(0, env.OTP_MAX_ATTEMPTS - attempts);
    throw badRequest(
      remaining > 0
        ? `That code is not correct. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
        : "Too many incorrect attempts. Request a new code.",
      "INVALID_OTP",
    );
  }

  await query(
    `UPDATE email_verification_codes SET consumed_at = now() WHERE code_id = $1`,
    [record.code_id],
  );

  const { rows } = await query<UserRow>(
    `UPDATE users
        SET is_verified = true
      WHERE user_id = $1
      RETURNING *`,
    [user.user_id],
  );

  return rows[0]!;
}

export interface LoginResult {
  user: UserRow;
  requiresVerification?: boolean;
  devOtp?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findUserByEmail(email);

  if (!user) {
    throw unauthorized("Incorrect email or password.", "SIGNIN_FAILED");
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw unauthorized("Incorrect email or password.", "SIGNIN_FAILED");
  }

  if (!user.is_verified) {
    const otp = await issueVerificationCode(user, { enforceCooldown: true });
    return {
      user,
      requiresVerification: true,
      ...(otp.code ? { devOtp: otp.code } : {}),
    };
  }

  return { user };
}
