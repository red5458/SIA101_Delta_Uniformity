"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "uniformity:otp-cooldown:";

/**
 * Client-side mirror of the API's OTP resend cooldown. The deadline is kept in
 * sessionStorage so a refresh cannot be used to skip the wait.
 */
export function useResendCooldown(
  key: string,
  durationSeconds = 60,
  startOnMount = true,
) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const deadlineRef = useRef(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let deadline = Number(sessionStorage.getItem(storageKey) ?? 0);
    if (!deadline || deadline <= Date.now()) {
      if (startOnMount) {
        deadline = Date.now() + durationSeconds * 1000;
        sessionStorage.setItem(storageKey, String(deadline));
      } else {
        deadline = 0;
        sessionStorage.removeItem(storageKey);
      }
    }
    deadlineRef.current = deadline;

    const tick = () => {
      const target = deadlineRef.current;
      setRemaining(target ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [storageKey, durationSeconds, startOnMount]);

  function start() {
    const deadline = Date.now() + durationSeconds * 1000;
    sessionStorage.setItem(storageKey, String(deadline));
    deadlineRef.current = deadline;
    setRemaining(durationSeconds);
  }

  return { remaining, start };
}
