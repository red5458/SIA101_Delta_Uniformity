import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireActive } from "../../middleware/require";
import { writeLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  createConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
  markMessagesReadHandler,
  sendMessageHandler,
} from "./chat.controller";

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.get("/", asyncHandler(listConversationsHandler));
chatRouter.post("/", requireActive, writeLimiter, asyncHandler(createConversationHandler));
chatRouter.get("/:id/messages", asyncHandler(listMessagesHandler));
chatRouter.post("/:id/messages", requireActive, writeLimiter, asyncHandler(sendMessageHandler));
chatRouter.post("/:id/read", asyncHandler(markMessagesReadHandler));
