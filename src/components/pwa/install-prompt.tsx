"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "uniformity:install-dismissed";

/**
 * A small, dismissible install nudge. Android/Chrome uses the native
 * `beforeinstallprompt`; iOS Safari has no such API, so it gets the Share →
 * Add to Home Screen instruction instead (needed before push works there).
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !/crios|fxios/i.test(navigator.userAgent);
    setIos(isIos);

    // Only nudge iOS users who arrived in Safari, where install actually works.
    if (isIos) setVisible(true);

    const onPrompt = (promptEvent: Event) => {
      promptEvent.preventDefault();
      setEvent(promptEvent as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setVisible(false);
      setEvent(null);
      window.localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (!visible) return null;

  return (
    <section className="card mt-5 p-4" aria-label="Install Uniformity">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-ink">
            Install Uniformity
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Add the marketplace to your Home Screen for faster browsing and push
            notifications.
          </p>

          {ios ? (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-gold-100/70 px-3 py-2 text-xs text-gold-800">
              <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Tap the Share button in Safari, then choose{" "}
              <strong className="font-semibold">Add to Home Screen</strong>.
            </p>
          ) : (
            <button
              type="button"
              onClick={install}
              className="btn-primary mt-3 text-sm"
            >
              <Download className="h-4 w-4" />
              Install app
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
