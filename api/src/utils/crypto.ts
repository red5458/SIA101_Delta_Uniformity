import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

/** 6-digit numeric code, uniformly distributed. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * OTPs are stored as keyed hashes so a database leak does not expose live
 * verification codes. The email is part of the message to bind a code to an
 * address even if two users somehow receive the same digits.
 */
export function hashOtp(email: string, code: string): string {
  return createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
