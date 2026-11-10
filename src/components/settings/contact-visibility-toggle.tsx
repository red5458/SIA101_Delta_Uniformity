"use client";

import { useState } from "react";
import { Eye, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function ContactVisibilityToggle({ initialValue }: { initialValue: boolean }) {
  const [visible, setVisible] = useState(initialValue);
  const [pending, setPending] = useState(false);

  async function change(next: boolean) {
    setPending(true);
    try {
      const response = await fetch("/api/profile/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showContactDetails: next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not update privacy settings.");
      setVisible(next);
      toast.success(next ? "Contact details are visible on your seller profile" : "Contact details are hidden from your seller profile");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update privacy settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        {visible ? <Eye className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink">Show contact details on my seller profile</h3>
        <p className="mt-0.5 text-sm text-muted">Controls your contact email, mobile number, and Messenger link on public listings and your seller page.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label="Show contact details on my seller profile"
        disabled={pending}
        onClick={() => void change(!visible)}
        className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${visible ? "bg-brand-700" : "bg-slate-300"} disabled:opacity-60`}
      >
        {pending ? <Loader2 className="absolute left-1/2 h-4 w-4 -translate-x-1/2 animate-spin text-white" /> : <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${visible ? "translate-x-6" : "translate-x-1"}`} />}
      </button>
    </section>
  );
}
