import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/http";
import { getDeletionRequest, requestDeletion, cancelDeletionRequest, updateContactVisibility, updateProfile } from "./profile.controller";
import { updateAvatar } from "./avatar.controller";

export const profileRouter = Router();

profileRouter.patch("/", authenticate, asyncHandler(updateProfile));
profileRouter.patch("/avatar", authenticate, asyncHandler(updateAvatar));
profileRouter.patch("/privacy", authenticate, asyncHandler(updateContactVisibility));
profileRouter.get("/deletion-request", authenticate, asyncHandler(getDeletionRequest));
profileRouter.post("/deletion-request", authenticate, asyncHandler(requestDeletion));
profileRouter.delete("/deletion-request", authenticate, asyncHandler(cancelDeletionRequest));
