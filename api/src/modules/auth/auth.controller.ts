import type { Request, Response } from "express";
import { isActiveProfile, toProfile, type UserRow } from "../../types";
import { env } from "../../config/env";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "./auth.cookies";
import {
  loginSchema,
  registerSchema,
  resendSchema,
  verifySchema,
} from "./auth.schema";
import {
  findUserById,
  login,
  register,
  resendVerification,
  verifyEmailOtp,
} from "./auth.service";
import {
  issueSession,
  revokeRefreshToken,
  rotateRefreshToken,
  type SessionMeta,
} from "./auth.tokens";

function meta(req: Request): SessionMeta {
  return { userAgent: req.get("user-agent"), ip: req.ip };
}

function redirectFor(user: UserRow): string {
  if (user.is_suspended) return "/suspended";
  if (!user.is_verified) return "/verify-email";
  if (!isActiveProfile(user)) return "/complete-profile";
  return "/browse";
}

export async function registerHandler(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const result = await register(input);
  return ok(res, result, 201);
}

export async function verifyHandler(req: Request, res: Response) {
  const { email, otp } = verifySchema.parse(req.body);
  const user = await verifyEmailOtp(email, otp);

  const tokens = await issueSession(user, meta(req));
  setAuthCookies(res, tokens);

  return ok(res, {
    verified: true,
    userId: user.user_id,
    redirect: redirectFor(user),
  });
}

export async function resendHandler(req: Request, res: Response) {
  const { email } = resendSchema.parse(req.body);
  const result = await resendVerification(email);
  return ok(res, result);
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const result = await login(email, password);

  if (result.requiresVerification) {
    return ok(res, {
      requiresVerification: true,
      email: result.user.email,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  }

  const tokens = await issueSession(result.user, meta(req));
  setAuthCookies(res, tokens);

  return ok(res, {
    redirect: redirectFor(result.user),
    user: { id: result.user.user_id, email: result.user.email },
  });
}

export async function refreshHandler(req: Request, res: Response) {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) {
    clearAuthCookies(res);
    throw unauthorized("No refresh session found.", "REFRESH_MISSING");
  }

  try {
    const { tokens, user } = await rotateRefreshToken(raw, meta(req));
    setAuthCookies(res, tokens);

    return ok(res, {
      refreshed: true,
      user: {
        id: user.user_id,
        email: user.email,
        emailVerified: user.is_verified,
      },
    });
  } catch (error) {
    // Expired, revoked or replayed refresh tokens must not stay in the browser.
    clearAuthCookies(res);
    throw error;
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await revokeRefreshToken(raw);
  clearAuthCookies(res);
  return ok(res, { signedOut: true });
}

export async function meHandler(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();

  // Re-read so a suspension applied by an admin shows up immediately.
  const user = (await findUserById(current.user_id)) ?? current;

  return ok(res, {
    user: {
      id: user.user_id,
      email: user.email,
      emailVerified: user.is_verified,
    },
    profile: toProfile(user),
    tokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}
