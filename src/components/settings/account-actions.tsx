"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export function AccountActions() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  async function deleteAccount(password: string) {
    setPending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not delete your account.");
      }
      setConfirmOpen(false);
      toast.success("Your account was deleted");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      // Keep the dialog open so the student can retry or back out.
      toast.error(error instanceof Error ? error.message : "Could not delete your account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="card space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <LogOut className="h-4 w-4 text-brand-600" /> Sign out
          </h3>
          <p className="mt-1 text-sm text-muted">
            Sign out of Uniformity on this device.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => void signOut()}
            className="btn-secondary mt-3 py-2 text-sm"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <Trash2 className="h-4 w-4 text-red-600" /> Delete account
          </h3>
          <p className="mt-1 text-sm text-muted">
            Permanently delete your account and everything attached to it —
            listings, comments, wishlist saves, and conversations. There is no
            review step and no way to undo it.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
            className="btn-danger mt-3 py-2 text-sm"
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        </div>
      </section>
      <DeleteAccountDialog
        open={confirmOpen}
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(password) => void deleteAccount(password)}
      />
    </>
  );
}
