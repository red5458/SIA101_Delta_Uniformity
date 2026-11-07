import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const jsonLimit = (message: string) => ({
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => {
    res.status(429).json({ error: { message, code: "RATE_LIMITED" } });
  },
});

/** Login, registration, OTP verification and resend. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  ...jsonLimit("Too many attempts. Wait a few minutes and try again."),
});

/** Mutating marketplace endpoints. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  ...jsonLimit("You are doing that too often. Slow down a little."),
});
