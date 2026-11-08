"use client";

import { useEffect, useState } from "react";
import { Laptop, Loader2, LogOut, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SessionItem {
  family_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string;
  current: boolean;
}

function deviceName(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const os = /Windows/i.test(userAgent) ? "Windows" : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad|iPod/i.test(userAgent) ? "iPhone/iPad" : /Mac OS/i.test(userAgent) ? "Mac" : /Linux/i.test(userAgent) ? "Linux" : "Device";
  const browser = /Edg\//i.test(userAgent) ? "Edge" : /Firefox\//i.test(userAgent) ? "Firefox" : /Chrome\//i.test(userAgent) ? "Chrome" : /Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function refresh() {
    try {
      const response = await fetch("/api/auth/sessions", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load active sessions.");
      setSessions(Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load active sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function signOutOthers() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/sessions/sign-out-others", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not sign out other devices.");
      toast.success(payload.data?.revoked ? "Other devices signed out" : "No other active sessions found");
      setConfirmOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out other devices.");
    } finally {
      setPending(false);
    }
  }

  const otherSessions = sessions.filter((session) => !session.current);

  return (
    <>
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-ink"><Laptop className="h-4 w-4 text-brand-600" /> Active sessions</h3>
            <p className="mt-1 text-sm text-muted">Review devices signed in to your account.</p>
          </div>
          <button type="button" disabled={loading || pending || otherSessions.length === 0} onClick={() => setConfirmOpen(true)} className="btn-secondary py-2 text-xs text-red-700">
            <LogOut className="h-4 w-4" /> Sign out other devices
          </button>
        </div>
        {loading ? <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div> : sessions.length ? (
          <ul className="mt-4 divide-y divide-line">
            {sessions.map((session) => (
              <li key={session.family_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {/Android|iPhone|iPad|iPod/i.test(session.user_agent ?? "") ? <Smartphone className="h-5 w-5 shrink-0 text-muted" /> : <Laptop className="h-5 w-5 shrink-0 text-muted" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{deviceName(session.user_agent)}{session.current && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">This device</span>}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{session.ip ? `${session.ip} · ` : ""}Signed in {new Date(session.created_at).toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-sm text-muted">No active sessions found.</p>}
      </section>
      <ConfirmDialog
        open={confirmOpen}
        title="Sign out other devices?"
        description="Other devices' refresh sessions will be revoked. Any already-issued access token can remain active for up to 15 minutes. This device will stay signed in."
        confirmLabel="Sign out other devices"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void signOutOthers()}
      />
    </>
  );
}
