"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function StartConversationButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function startConversation() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not start a conversation");
      }
      window.dispatchEvent(new CustomEvent("uniformity:route-transition"));
      router.push(`/messages/${payload.data.conversation_id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start a conversation");
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startConversation}
      disabled={pending}
      aria-busy={pending}
      className="btn-primary px-3 text-xs sm:px-4 sm:text-sm"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      <span>Message seller</span>
    </button>
  );
}
