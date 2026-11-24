import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireActive } from "../../middleware/require";
import { writeLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  createConversationHandler,
  deleteConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
  markMessagesReadHandler,
  sendMessageHandler,
  unreadCountHandler,
  unsendMessageHandler,
} from "./chat.controller";

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.get("/unread-count", asyncHandler(unreadCountHandler));
chatRouter.get("/", asyncHandler(listConversationsHandler));
chatRouter.post("/", requireActive, writeLimiter, asyncHandler(createConversationHandler));
chatRouter.delete("/:id", requireActive, writeLimiter, asyncHandler(deleteConversationHandler));
chatRouter.get("/:id/messages", asyncHandler(listMessagesHandler));
chatRouter.post("/:id/messages", requireActive, writeLimiter, asyncHandler(sendMessageHandler));
chatRouter.delete("/:id/messages/:messageId", requireActive, writeLimiter, asyncHandler(unsendMessageHandler));
chatRouter.post("/:id/read", asyncHandler(markMessagesReadHandler));
