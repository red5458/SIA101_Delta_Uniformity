import "server-only";

import { apiFetch, apiFetchSafe } from "@/lib/api/server";
import type { ChatConversationSummary, ChatMessagesPage } from "@/types/db";

export function getConversations(): Promise<ChatConversationSummary[]> {
  return apiFetch<ChatConversationSummary[]>("/conversations");
}

export function getConversationMessages(
  conversationId: string,
): Promise<ChatMessagesPage | null> {
  return apiFetchSafe<ChatMessagesPage>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}
