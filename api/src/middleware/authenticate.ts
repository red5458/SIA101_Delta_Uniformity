import type { RequestHandler } from "express";
import { query } from "../config/db";
import { ACCESS_COOKIE } from "../modules/auth/auth.cookies";
import type { UserRow } from "../types";
import { unauthorized } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

function readToken(req: Parameters<RequestHandler>[0]): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.[ACCESS_COOKIE];
}

/**
 * Verifies the access JWT, then reloads the user so suspension and role changes
 * take effect immediately instead of waiting for the token to expire.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = readToken(req);
    if (!token) throw unauthorized();

    const payload = verifyAccessToken(token);
    const { rows } = await query<UserRow>(`SELECT * FROM users WHERE user_id = $1`, [
      payload.sub,
    ]);

    const user = rows[0];
    if (!user) throw unauthorized("Your account no longer exists.", "ACCOUNT_MISSING");

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
