"use client";

import { AlertTriangle, Check, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  destructive = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/35 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-sm rounded-3xl border border-line bg-white p-5 shadow-2xl animate-menu-drop sm:p-6"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) onCancel();
        }}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              destructive ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700"
            }`}
          >
            {destructive ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="confirm-dialog-title" className="font-display text-lg font-bold text-ink">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-1.5 text-sm leading-relaxed text-muted">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Close confirmation"
            className="-mr-1 -mt-1 rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-ink disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={pending} autoFocus className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={destructive ? "btn-danger" : "btn-primary"}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
