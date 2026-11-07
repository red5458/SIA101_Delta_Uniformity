"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function WishlistButton({
  listingId,
  initial,
  compact = false,
}: {
  listingId: string;
  initial: boolean;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    setPending(true);
    const next = !saved;
    setSaved(next);

    try {
      const response = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed");
      setSaved(Boolean(payload.data?.wishlisted));
      toast.success(
        payload.data?.wishlisted ? "Saved to your wishlist" : "Removed from wishlist",
      );
    } catch (error) {
      setSaved(!next);
      toast.error(error instanceof Error ? error.message : "Could not update wishlist");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-busy={pending}
      aria-label={pending ? "Updating wishlist" : saved ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border bg-white/95 font-semibold shadow-sm backdrop-blur transition",
        compact ? "h-9 w-9" : "px-4 py-2.5 text-sm",
        saved
          ? "border-brand-200 text-brand-700"
          : "border-line text-muted hover:text-brand-700",
      )}
    >
      {pending ? (
        <LoaderCircle className={cn(compact ? "h-4 w-4" : "h-5 w-5", "animate-spin")} />
      ) : saved ? (
        <BookmarkCheck className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
      ) : (
        <Bookmark className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
      )}
      {!compact && (saved ? "Saved" : "Save to wishlist")}
    </button>
  );
}
