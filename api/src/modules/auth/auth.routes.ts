import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  loginHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  resendHandler,
  resetPasswordHandler,
  sessionsHandler,
  signOutOtherSessionsHandler,
  verifyHandler,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(registerHandler));
authRouter.post("/verify", authLimiter, asyncHandler(verifyHandler));
authRouter.post("/resend", authLimiter, asyncHandler(resendHandler));
authRouter.post("/login", authLimiter, asyncHandler(loginHandler));
authRouter.post("/forgot-password", authLimiter, asyncHandler(forgotPasswordHandler));
authRouter.post("/reset-password", authLimiter, asyncHandler(resetPasswordHandler));
authRouter.post("/change-password", authenticate, authLimiter, asyncHandler(changePasswordHandler));
authRouter.get("/sessions", authenticate, asyncHandler(sessionsHandler));
authRouter.post("/sessions/sign-out-others", authenticate, authLimiter, asyncHandler(signOutOtherSessionsHandler));
authRouter.post("/refresh", asyncHandler(refreshHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
authRouter.get("/me", authenticate, asyncHandler(meHandler));
