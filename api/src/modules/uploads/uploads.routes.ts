import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/authenticate";
import { requireActive } from "../../middleware/require";
import { writeLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  MAX_PHOTO_BYTES,
  directUploadHandler,
  signatureHandler,
} from "./uploads.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
});

export const uploadsRouter = Router();

uploadsRouter.use(authenticate, requireActive, writeLimiter);

uploadsRouter.post("/signature", asyncHandler(signatureHandler));
uploadsRouter.post("/direct", upload.single("photo"), asyncHandler(directUploadHandler));
