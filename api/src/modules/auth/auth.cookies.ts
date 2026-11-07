import type { Response } from "express";
import { env } from "../../config/env";

export const ACCESS_COOKIE = "uniformity_access";
export const REFRESH_COOKIE = "uniformity_refresh";

function baseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.cookieSecure,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, baseOptions());
  res.clearCookie(REFRESH_COOKIE, baseOptions());
}
