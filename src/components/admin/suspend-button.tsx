"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function SuspendButton({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !suspended }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not update user");
      }
      toast.success(suspended ? "Account reinstated" : "Account suspended");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={
        suspended
          ? "inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          : "inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : suspended ? (
        <ShieldCheck className="h-3.5 w-3.5" />
      ) : (
        <ShieldOff className="h-3.5 w-3.5" />
      )}
      {suspended ? "Reinstate" : "Suspend"}
    </button>
  );
}
