import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  resendHandler,
  verifyHandler,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(registerHandler));
authRouter.post("/verify", authLimiter, asyncHandler(verifyHandler));
authRouter.post("/resend", authLimiter, asyncHandler(resendHandler));
authRouter.post("/login", authLimiter, asyncHandler(loginHandler));
authRouter.post("/refresh", asyncHandler(refreshHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
authRouter.get("/me", authenticate, asyncHandler(meHandler));
