import type { Request, Response } from "express";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import {
  createConversationSchema,
  conversationIdSchema,
  messageQuerySchema,
  sendMessageSchema,
} from "./chat.schema";
import {
  getConversations,
  getMessages,
  getOrCreateConversation,
  markMessagesRead,
  sendMessage,
} from "./chat.service";

function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}

export async function listConversationsHandler(req: Request, res: Response) {
  return ok(res, await getConversations(currentUser(req).user_id));
}

export async function createConversationHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const input = createConversationSchema.parse(req.body);
  return ok(res, await getOrCreateConversation(user, input.listingId), 201);
}

export async function listMessagesHandler(req: Request, res: Response) {
  const conversationId = conversationIdSchema.parse(req.params.id);
  const cursor = messageQuerySchema.parse({
    beforeId: req.query.before_id,
    afterId: req.query.after_id,
  });
  return ok(
    res,
    await getMessages(currentUser(req).user_id, conversationId, cursor),
  );
}

export async function sendMessageHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const conversationId = conversationIdSchema.parse(req.params.id);
  const input = sendMessageSchema.parse(req.body);
  return ok(res, await sendMessage(user, conversationId, input), 201);
}

export async function markMessagesReadHandler(req: Request, res: Response) {
  const conversationId = conversationIdSchema.parse(req.params.id);
  return ok(res, await markMessagesRead(currentUser(req).user_id, conversationId));
}
