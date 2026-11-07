"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function StatusToggle({
  listingId,
  status,
}: {
  listingId: string;
  status: "Active" | "Sold";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const next = status === "Active" ? "Sold" : "Active";
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not update status");
      }
      toast.success(next === "Sold" ? "Marked as sold" : "Relisted as active");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-brand-50 disabled:opacity-50"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === "Active" ? "Mark as sold" : "Relist"}
    </button>
  );
}
