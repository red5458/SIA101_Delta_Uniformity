"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Replays the first-run walkthrough. Clearing `onboarding_completed_at` makes
 * the app layout show the tour again as soon as the router refreshes, so there
 * is no separate client-side "start tour" state to keep in sync.
 */
export function TourSettings() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function replay() {
    setPending(true);
    try {
      const response = await fetch("/api/profile/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Could not restart the tutorial.",
        );
      }
      toast.success("Tutorial restarted");
      router.push("/browse");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restart the tutorial.",
      );
      setPending(false);
    }
  }

  return (
    <section className="card flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink">Welcome tour</h3>
        <p className="mt-0.5 text-sm text-muted">
          Walk through browsing, saving, chatting, and selling again. It opens
          on your next screen.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void replay()}
        disabled={pending}
        className="btn-secondary mt-0.5 shrink-0 text-sm"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PlayCircle className="h-4 w-4" />
        )}
        {pending ? "…" : "Replay"}
      </button>
    </section>
  );
}
