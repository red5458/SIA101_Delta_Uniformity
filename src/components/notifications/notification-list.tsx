"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  LoaderCircle,
  MessageSquare,
  MessagesSquare,
  Reply,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import type { Notification, NotificationPage } from "@/types/db";

function typeIcon(type: Notification["type"]) {
  const className = "h-4 w-4";
  switch (type) {
    case "comment":
      return <MessageSquare className={className} />;
    case "reply":
      return <Reply className={className} />;
    case "message":
      return <MessagesSquare className={className} />;
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

export function NotificationList({
  initialItems,
  initialCursor,
  initialUnread,
}: {
  initialItems: Notification[];
  initialCursor: string | null;
  initialUnread: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [unread, setUnread] = useState(initialUnread);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const hasUnread = items.some((item) => !item.read_at);

  function markLocalRead(notification: Notification) {
    if (notification.read_at) return;
    setItems((current) =>
      current.map((item) =>
        item.notification_id === notification.notification_id
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    );
    setUnread((current) => Math.max(0, current - 1));
    void fetch(`/api/notifications/${notification.notification_id}/read`, {
      method: "PATCH",
    }).catch(() => undefined);
  }

  async function markAll() {
    if (markingAll || !hasUnread) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? now })),
    );
    setUnread(0);
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Could not mark notifications read");
      toast.success("All notifications marked read");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update notifications",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function remove(notification: Notification) {
    const snapshot = items;
    setItems((current) =>
      current.filter(
        (item) => item.notification_id !== notification.notification_id,
      ),
    );
    if (!notification.read_at) setUnread((current) => Math.max(0, current - 1));

    try {
      const response = await fetch(
        `/api/notifications/${notification.notification_id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Could not delete notification");
    } catch (error) {
      setItems(snapshot);
      toast.error(
        error instanceof Error ? error.message : "Could not delete notification",
      );
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/notifications?limit=30&before=${encodeURIComponent(cursor)}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Failed");
      const page = payload.data as NotificationPage;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.notification_id));
        return [...current, ...page.items.filter((item) => !seen.has(item.notification_id))];
      });
      setCursor(page.nextCursor);
      setUnread(page.unreadCount);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load more",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {unread > 0 ? `${unread} unread` : "You are all caught up"}
        </p>
        <button
          type="button"
          onClick={markAll}
          disabled={markingAll || !hasUnread}
          className="btn-secondary h-9 text-sm disabled:opacity-50"
        >
          {markingAll ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card mt-4 grid place-items-center px-4 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Bell className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-xl font-bold text-ink">
            No notifications yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            When someone asks about your listing, replies to your question, or an
            admin acts on your account, it shows up here.
          </p>
          <Link href="/browse" className="btn-secondary mt-4">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="card mt-4 divide-y divide-line overflow-hidden">
          {items.map((item) => (
            <li
              key={item.notification_id}
              className={cn(
                "flex items-start gap-3 px-3 py-3 sm:px-4",
                !item.read_at && "bg-brand-50/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                  typeTone(item.type),
                )}
              >
                {typeIcon(item.type)}
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  href={item.link_url ?? "/notifications"}
                  onClick={() => markLocalRead(item)}
                  className="group block"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-ink group-hover:text-brand-700">
                      {item.title}
                    </span>
                    {!item.read_at && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                        aria-label="Unread"
                      />
                    )}
                  </span>
                  {item.body && (
                    <span className="mt-0.5 block text-sm text-muted">
                      {item.body}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-muted/80">
                    {formatRelative(item.created_at)}
                  </span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => remove(item)}
                aria-label="Delete notification"
                title="Delete notification"
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary text-sm"
          >
            {loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Load older notifications
          </button>
        </div>
      )}
    </div>
  );
}
