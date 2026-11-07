"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteListingButton({
  listingId,
  redirectTo = "/dashboard",
  compact = true,
}: {
  listingId: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm("Delete this listing permanently? This cannot be undone.")) return;
    setPending(true);
    try {
      const response = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not delete listing");
      }
      toast.success("Listing deleted");
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete listing");
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className={
        compact
          ? "inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          : "btn-danger"
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Delete
    </button>
  );
}
