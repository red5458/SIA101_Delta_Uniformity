import type { RequestHandler } from "express";
import { isActiveProfile } from "../types";
import { forbidden, unauthorized } from "../utils/ApiError";

export const requireVerified: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!req.user.is_verified) {
    return next(
      forbidden("Verify your student email to continue.", "EMAIL_UNVERIFIED"),
    );
  }
  next();
};

/** Verified, not suspended, and profile complete — the write-access gate. */
export const requireActive: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!isActiveProfile(req.user)) {
    const message = req.user.is_suspended
      ? "Your account is suspended."
      : "Complete your student profile to continue.";
    return next(forbidden(message, "NOT_ACTIVE"));
  }
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!req.user.is_admin || req.user.is_suspended) {
    return next(forbidden("Admin access required", "FORBIDDEN"));
  }
  next();
};
