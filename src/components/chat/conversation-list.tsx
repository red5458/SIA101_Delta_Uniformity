"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { formatRelative, initials } from "@/lib/utils";
import type { ChatConversationSummary } from "@/types/db";

export function ConversationList({
  initialConversations,
  currentUserId,
}: {
  initialConversations: ChatConversationSummary[];
  currentUserId: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/conversations", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (active && Array.isArray(payload?.data)) setConversations(payload.data);
      } catch {
        // Keep the latest list during temporary network or API failures.
      }
    };

    const timer = window.setInterval(() => void refresh(), 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (!conversations.length) {
    return (
      <div className="card grid place-items-center px-5 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <MessageSquareText className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-display text-xl font-bold text-ink">No conversations yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">Open a listing and tap “Message seller” to ask a private question.</p>
        <Link href="/browse" className="btn-primary mt-4">Browse listings</Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {conversations.map((conversation) => {
        const unread = Number(conversation.unread_count) || 0;
        return (
          <Link
            key={conversation.conversation_id}
            href={`/messages/${conversation.conversation_id}`}
            className="card flex items-center gap-3 p-3 transition-colors hover:bg-brand-50/40 sm:gap-4 sm:p-4"
          >
            <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-800">
              {conversation.other_user.avatar_url ? (
                <Image src={conversation.other_user.avatar_url} alt="" fill sizes="48px" className="object-cover" />
              ) : initials(conversation.other_user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-ink">{conversation.other_user.name}</span>
                {conversation.listing_status === "Sold" && <span className="badge border-line bg-cream px-2 py-0.5 text-[10px] text-muted">Sold</span>}
              </span>
              <span className="mt-0.5 block truncate text-xs font-medium text-brand-700">{conversation.listing_title}</span>
              <span className={`mt-1 block truncate text-xs ${unread ? "font-semibold text-ink" : "text-muted"}`}>
                {conversation.last_message
                  ? `${conversation.last_message.sender_id === currentUserId ? "You: " : ""}${conversation.last_message.body}`
                  : "No messages yet — say hello!"}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <time className="text-[10px] text-muted sm:text-xs">
                {conversation.last_message ? formatRelative(conversation.last_message.created_at) : "New"}
              </time>
              {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
