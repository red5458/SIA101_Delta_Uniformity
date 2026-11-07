import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/http";
import { updateProfile } from "./profile.controller";

export const profileRouter = Router();

profileRouter.patch("/", authenticate, asyncHandler(updateProfile));
