"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that powers offline handling and Web Push.
 * Only enabled in production: a stale worker caching Next's dev assets makes
 * local development confusing, and push needs HTTPS (or localhost).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failures are non-fatal: the app still works online.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
