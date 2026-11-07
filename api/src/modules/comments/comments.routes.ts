import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireActive } from "../../middleware/require";
import { writeLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  createCommentHandler,
  deleteCommentHandler,
  listCommentsHandler,
} from "./comments.controller";

export const commentsRouter = Router();

commentsRouter.use(authenticate);

commentsRouter.get("/", asyncHandler(listCommentsHandler));
commentsRouter.post("/", requireActive, writeLimiter, asyncHandler(createCommentHandler));
commentsRouter.delete("/:id", writeLimiter, asyncHandler(deleteCommentHandler));
