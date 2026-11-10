import { MessageCircle } from "lucide-react";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/data/chat";
import { ConversationList } from "@/components/chat/conversation-list";

export const metadata = { title: "Messages | Uniformity" };

export default async function MessagesPage() {
  const session = await requireVerifiedUser();
  const conversations = await getConversations();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Messages</h1>
          <p className="mt-1 text-sm text-muted">Private conversations about campus listings.</p>
        </div>
        <MessageCircle className="mb-1 h-6 w-6 text-brand-600" />
      </div>

      <ConversationList
        initialConversations={conversations}
        currentUserId={session.authUser.id}
      />
    </div>
  );
}
