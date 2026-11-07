import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/http";
import { updateProfile } from "./profile.controller";
import { updateAvatar } from "./avatar.controller";

export const profileRouter = Router();

profileRouter.patch("/", authenticate, asyncHandler(updateProfile));
profileRouter.patch("/avatar", authenticate, asyncHandler(updateAvatar));
