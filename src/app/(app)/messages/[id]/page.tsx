import { notFound } from "next/navigation";
import { ConversationThread } from "@/components/chat/conversation-thread";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getConversationMessages, getConversations } from "@/lib/data/chat";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireVerifiedUser();
  const [conversations, messagePage] = await Promise.all([
    getConversations(),
    getConversationMessages(id),
  ]);
  const conversation = conversations.find((item) => item.conversation_id === id);
  if (!conversation || !messagePage) notFound();

  return (
    <ConversationThread
      conversation={conversation}
      initialMessages={messagePage.items}
      initialHasMore={messagePage.hasMore}
      currentUserId={session.authUser.id}
    />
  );
}
