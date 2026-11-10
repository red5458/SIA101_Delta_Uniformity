"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not request a reset code.");
      if (payload.data?.devOtp) setOtp(payload.data.devOtp);
      setSent(true);
      toast.success("If that verified student account exists, a reset code has been sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request a reset code.");
    } finally {
      setPending(false);
    }
  }

  async function reset(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), password, confirmPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not reset password.");
      toast.success("Password reset. Sign in with your new password.");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setPending(false);
    }
  }

  return sent ? (
    <form onSubmit={reset} className="space-y-4">
      <p className="text-sm text-muted">If the account exists, a 6-digit code was sent to {email}. The code expires in 10 minutes.</p>
      <div>
        <label className="label" htmlFor="reset-otp">Email code</label>
        <input id="reset-otp" className="input text-center tracking-[0.35em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
      </div>
      <div>
        <label className="label" htmlFor="new-password">New password</label>
        <div className="relative">
          <input id="new-password" type={showPassword ? "text" : "password"} className="input pr-11" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="confirm-new-password">Confirm new password</label>
        <div className="relative">
          <input id="confirm-new-password" type={showConfirmPassword ? "text" : "password"} className="input pr-11" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <button type="button" onClick={() => setShowConfirmPassword((show) => !show)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400">
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={pending || otp.length !== 6} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Reset password
      </button>
      <button type="button" onClick={() => setSent(false)} className="btn-ghost w-full text-sm">Use a different email</button>
    </form>
  ) : (
    <form onSubmit={requestCode} className="space-y-4">
      <div>
        <label className="label" htmlFor="reset-email">BU student email</label>
        <input id="reset-email" type="email" className="input" autoComplete="email" placeholder="juan.delacruz@bicol-u.edu.ph" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Send reset code
      </button>
      <p className="text-center text-sm text-muted"><Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link></p>
    </form>
  );
}
