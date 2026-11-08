"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  LoaderCircle,
  MessageSquare,
  Reply,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import type { Notification } from "@/types/db";

function typeIcon(type: Notification["type"]) {
  const className = "h-3.5 w-3.5";
  switch (type) {
    case "comment":
      return <MessageSquare className={className} />;
    case "reply":
      return <Reply className={className} />;
    case "listing_removed":
    case "comment_removed":
      return <Trash2 className={className} />;
    case "suspended":
      return <ShieldAlert className={className} />;
    case "reinstated":
      return <ShieldCheck className={className} />;
    default:
      return <Bell className={className} />;
  }
}

function typeTone(type: Notification["type"]) {
  switch (type) {
    case "suspended":
      return "bg-red-50 text-red-600";
    case "reinstated":
      return "bg-emerald-50 text-emerald-600";
    case "listing_removed":
    case "comment_removed":
      return "bg-gold-100 text-gold-700";
    default:
      return "bg-brand-50 text-brand-700";
  }
}

/**
 * Header bell. The badge is seeded by the server layout and refreshed by
 * polling only while the tab is visible, so an idle background tab does not
 * keep waking the API.
 */
export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  /** Loads the dropdown preview and syncs the badge with it. */
  const loadItems = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=6", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.data) {
        setItems(payload.data.items ?? []);
        setCount(Number(payload.data.unreadCount ?? 0));
      }
    } catch {
      // Keep whatever preview is already displayed.
    }
  }, []);

  const refreshCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch("/api/notifications/unread-count", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      setCount(Number(payload?.data?.count ?? 0));
    } catch {
      // Offline or API asleep; keep the last known badge.
    }
  }, []);

  // Seed on mount (the server layout can hand down a cached RSC payload), then
  // poll only while the tab is visible.
  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshCount]);

  // A Web Push that lands while a tab is open pings the page, so the badge
  // updates immediately instead of waiting for the next poll.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "UNREAD_CHANGED") return;
      void refreshCount();
      if (openRef.current) void loadItems();
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [refreshCount, loadItems]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    setLoading(true);
    try {
      await loadItems();
    } finally {
      setLoading(false);
    }
  }

  function markLocalRead(notification: Notification) {
    if (notification.read_at) return;
    setItems((current) =>
      current.map((item) =>
        item.notification_id === notification.notification_id
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    );
    setCount((current) => Math.max(0, current - 1));
    void fetch(`/api/notifications/${notification.notification_id}/read`, {
      method: "PATCH",
    }).catch(() => undefined);
  }

  async function markAll() {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
    setCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(
      () => undefined,
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        aria-expanded={open}
        className="btn-ghost relative h-9 w-9 !px-0 text-muted hover:text-brand-700"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <button
                type="button"
                onClick={markAll}
                disabled={count === 0}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 disabled:text-muted/50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>

            <div className="max-h-[22rem] overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="grid place-items-center py-10 text-muted">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto h-6 w-6 text-muted/50" />
                  <p className="mt-2 text-sm font-medium text-ink">
                    You are all caught up
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Questions and replies will show up here.
                  </p>
                </div>
              ) : (
                <ul>
                  {items.map((item) => (
                    <li key={item.notification_id}>
                      <Link
                        href={item.link_url ?? "/notifications"}
                        onClick={() => {
                          markLocalRead(item);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex gap-2.5 border-b border-line/70 px-3.5 py-3 transition-colors last:border-0 hover:bg-brand-50/60",
                          !item.read_at && "bg-brand-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                            typeTone(item.type),
                          )}
                        >
                          {typeIcon(item.type)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-ink">
                              {item.title}
                            </span>
                            {!item.read_at && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                            )}
                          </span>
                          {item.body && (
                            <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                              {item.body}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] text-muted/80">
                            {formatRelative(item.created_at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-line bg-cream/60 px-3.5 py-2.5 text-center text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
