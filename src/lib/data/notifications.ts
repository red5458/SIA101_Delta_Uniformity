import "server-only";

import { cache } from "react";
import { apiFetch } from "@/lib/api/server";
import type { NotificationPage } from "@/types/db";

export const getNotifications = cache(
  (): Promise<NotificationPage> => apiFetch<NotificationPage>("/notifications?limit=30"),
);

/**
 * Used by the app/admin layouts to seed the bell. A notifications outage should
 * not take down every page, so a failure degrades to "no badge".
 */
export const getUnreadCount = cache(async (): Promise<number> => {
  try {
    const { count } = await apiFetch<{ count: number }>(
      "/notifications/unread-count",
    );
    return count;
  } catch {
    return 0;
  }
});
