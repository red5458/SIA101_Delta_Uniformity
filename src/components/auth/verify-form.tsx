"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck, RotateCw } from "lucide-react";
import { toast } from "sonner";

export function VerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Verification failed");
      }
      toast.success("Email verified. Welcome to Uniformity!");
      router.push("/browse");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not resend");
      }
      toast.success("A new code is on its way");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
        <p className="flex items-center gap-2 font-semibold">
          <MailCheck className="h-4 w-4" />
          Code sent to
        </p>
        <p className="mt-1 break-all">{email}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="otp">
            6-digit verification code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            className="input text-center text-2xl font-bold tracking-[0.5em]"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            required
          />
        </div>

        <button type="submit" disabled={pending || otp.length !== 6} className="btn-primary w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify my account
        </button>
      </form>

      <button
        type="button"
        onClick={resend}
        disabled={resending}
        className="btn-ghost w-full text-sm"
      >
        {resending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="h-4 w-4" />
        )}
        Resend code
      </button>
    </div>
  );
}
