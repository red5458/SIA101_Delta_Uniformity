"use client";

import { cn } from "@/lib/utils";
import { useChatUnread } from "./chat-unread-provider";

export function ChatUnreadBadge({ className }: { className?: string }) {
  const { count } = useChatUnread();
  if (count <= 0) return null;

  return (
    <span
      aria-label={`${count} unread message${count === 1 ? "" : "s"}`}
      className={cn(
        "grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
