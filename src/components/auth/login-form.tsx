"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Sign in failed");
      }

      if (payload.data?.requiresVerification) {
        toast.info("Verify your email to continue");
        router.push(`/verify-email?email=${encodeURIComponent(payload.data.email)}`);
        return;
      }

      toast.success("Welcome back");
      router.push(payload.data?.redirect ?? "/browse");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          BU student email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="juan.delacruz@bicol-u.edu.ph"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </button>

      <p className="text-center text-sm text-muted">
        New to Uniformity?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
