"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, LoaderCircle, Share } from "lucide-react";
import { toast } from "sonner";

type PushState =
  | "loading"
  | "unsupported"
  | "idle"
  | "subscribed"
  | "denied"
  | "pending";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

/**
 * Registers this browser for Web Push. Permission is only requested from the
 * tap handler, which iOS requires, and a missing VAPID key in the build simply
 * disables the card instead of failing.
 */
export function PushToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sync() {
    if (!PUBLIC_KEY) {
      setState("unsupported");
      return;
    }
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      setState("unsupported");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    setState(subscription ? "subscribed" : "idle");
  }

  async function enable() {
    if (!PUBLIC_KEY) return;
    setState("pending");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        if (permission === "denied") {
          toast.error("Notifications are blocked in your browser settings.");
        }
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("This browser returned an incomplete subscription.");
      }

      const response = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        await subscription.unsubscribe();
        throw new Error("The server could not save this device.");
      }

      setState("subscribed");
      toast.success("Push notifications enabled on this device");
    } catch (error) {
      setState("idle");
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not enable push notifications",
      );
    }
  }

  async function disable() {
    setState("pending");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe();
      }

      setState("idle");
      toast.success("Push notifications disabled on this device");
    } catch {
      setState("subscribed");
      toast.error("Could not disable push notifications");
    }
  }

  return (
    <section className="card p-4" aria-label="Push notifications">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-ink">
            Push notifications
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Get a phone alert for questions on your listings and replies to your
            comments, even when Uniformity is closed.
          </p>

          {isIos && !standalone && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-gold-100/70 px-3 py-2 text-xs text-gold-800">
              <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              On iPhone or iPad, add Uniformity to your Home Screen first
              (Share → Add to Home Screen), then enable push here.
            </p>
          )}

          {state === "denied" && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              Notifications are blocked for this site. Re-allow them in your
              browser&apos;s site settings, then reload.
            </p>
          )}

          {state === "unsupported" && (
            <p className="mt-2 text-xs text-muted">
              {PUBLIC_KEY
                ? "Push needs the installed app (or a production build over HTTPS). Open Uniformity from your Home Screen to enable it."
                : "Push is not configured on this deployment yet."}
            </p>
          )}

          <div className="mt-3">
            {state === "subscribed" ? (
              <button
                type="button"
                onClick={disable}
                className="btn-secondary text-sm text-red-600"
              >
                <BellOff className="h-4 w-4" />
                Disable on this device
              </button>
            ) : (
              <button
                type="button"
                onClick={enable}
                disabled={state !== "idle"}
                className="btn-primary text-sm disabled:opacity-60"
              >
                {state === "pending" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
                Enable push notifications
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
