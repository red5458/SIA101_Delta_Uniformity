"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeletionRequest {
  request_id: string;
  status: "pending";
  requested_at: string;
}

export function AccountActions() {
  const router = useRouter();
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function loadRequest() {
    try {
      const response = await fetch("/api/profile/deletion-request", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load account request status.");
      setRequest(payload.data ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load account request status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRequest(); }, []);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      toast.error("Could not contact the server; signing out of this page anyway.");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  async function submitDeletionRequest() {
    setPending(true);
    try {
      const response = await fetch("/api/profile/deletion-request", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not submit the request.");
      setRequest(payload.data ?? null);
      setConfirmOpen(false);
      toast.success("Account deletion request recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the request.");
    } finally {
      setPending(false);
    }
  }

  async function cancelRequest() {
    setPending(true);
    try {
      const response = await fetch("/api/profile/deletion-request", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not cancel the request.");
      setRequest(null);
      toast.success("Account deletion request cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink"><LogOut className="h-4 w-4 text-brand-600" /> Sign out</h3>
          <p className="mt-1 text-sm text-muted">Sign out of Uniformity on this device.</p>
          <button type="button" disabled={pending} onClick={() => void signOut()} className="btn-secondary mt-3 py-2 text-sm"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="flex items-center gap-2 font-semibold text-ink"><Trash2 className="h-4 w-4 text-red-600" /> Request account deletion</h3>
          <p className="mt-1 text-sm text-muted">Submit a request to have your Uniformity account reviewed for deletion. This request does not immediately remove your account.</p>
          {request ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-50 px-3 py-2.5 text-sm">
              <span className="text-ink">Request submitted · {new Date(request.requested_at).toLocaleDateString()}</span>
              <button type="button" disabled={pending} onClick={() => void cancelRequest()} className="btn-ghost py-1.5 text-xs text-muted">Cancel request</button>
            </div>
          ) : (
            <button type="button" disabled={pending || loading} onClick={() => setConfirmOpen(true)} className="btn-danger mt-3 py-2 text-sm">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Request account deletion
            </button>
          )}
        </div>
      </section>
      <ConfirmDialog
        open={confirmOpen}
        title="Request account deletion?"
        description="This submits a request for review. Your account and listings will remain available until the request is reviewed."
        confirmLabel="Submit request"
        destructive={false}
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submitDeletionRequest()}
      />
    </>
  );
}
