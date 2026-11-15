"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Store,
  X,
} from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}

const LOSSES = [
  { icon: Store, text: "Your listings and their photos" },
  { icon: MessageCircle, text: "Your comments, wishlist saves, and conversations" },
];

/**
 * Destructive, irreversible action: the password re-authenticates the request
 * instead of relying on the session cookie alone.
 */
export function DeleteAccountDialog({
  open,
  pending,
  onCancel,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setShowPassword(false);
    const timer = window.setTimeout(
      () => passwordRef.current?.focus({ preventScroll: true }),
      50,
    );
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        className="my-auto w-full max-w-sm rounded-3xl border border-line bg-white p-5 shadow-2xl animate-menu-drop sm:p-6"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) onCancel();
        }}
      >
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="delete-account-title"
              className="font-display text-lg font-bold text-ink"
            >
              Delete your account?
            </h2>
            <p
              id="delete-account-description"
              className="mt-1.5 text-sm leading-relaxed text-muted"
            >
              This happens immediately and cannot be undone. Everything tied to
              your account is removed for good:
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-ink disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ul className="mt-3 space-y-1.5 rounded-xl bg-red-50/70 px-3 py-2.5">
          {LOSSES.map((loss) => (
            <li
              key={loss.text}
              className="flex items-start gap-2 text-xs leading-relaxed text-red-800"
            >
              <loss.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {loss.text}
            </li>
          ))}
        </ul>

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (password && !pending) onConfirm(password);
          }}
        >
          <label className="label" htmlFor="delete-account-password">
            Confirm with your password
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="delete-account-password"
              type={showPassword ? "text" : "password"}
              className="input pr-11"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={pending}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || password.length === 0}
              className="btn-danger"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Deleting…" : "Delete my account"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
