import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { unauthorized } from "./ApiError";
import type { UserRow } from "../types";

export interface AccessTokenPayload {
  sub: string;
  role: "admin" | "student";
}

const ISSUER = "uniformity-api";
const AUDIENCE = "uniformity-web";

export function signAccessToken(user: Pick<UserRow, "user_id" | "is_admin">) {
  const payload = {
    role: user.is_admin ? "admin" : "student",
  } satisfies Omit<AccessTokenPayload, "sub">;

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    subject: user.user_id,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof decoded === "string" || !decoded.sub) {
      throw new Error("Malformed token");
    }

    return {
      sub: String(decoded.sub),
      role: decoded.role === "admin" ? "admin" : "student",
    };
  } catch {
    throw unauthorized("Your session has expired. Please sign in again.", "TOKEN_INVALID");
  }
}
