import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/http";
import { deleteAccountHandler, updateContactVisibility, updateOnboarding, updateProfile } from "./profile.controller";
import { updateAvatar } from "./avatar.controller";

export const profileRouter = Router();

profileRouter.patch("/", authenticate, asyncHandler(updateProfile));
profileRouter.delete("/", authenticate, asyncHandler(deleteAccountHandler));
profileRouter.patch("/avatar", authenticate, asyncHandler(updateAvatar));
profileRouter.patch("/privacy", authenticate, asyncHandler(updateContactVisibility));
profileRouter.patch("/onboarding", authenticate, asyncHandler(updateOnboarding));
