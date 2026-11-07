"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AdminDeleteButton({
  endpoint,
  label = "Delete",
  confirmText = "Delete this record permanently?",
}: {
  endpoint: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm(confirmText)) return;
    setPending(true);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Delete failed");
      }
      toast.success("Removed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
