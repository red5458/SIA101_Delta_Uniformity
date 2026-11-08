import { query } from "../../config/db";
import { logger } from "../../config/logger";
import type { NotificationRow, NotificationType } from "../../types";
import { notFound } from "../../utils/ApiError";
import { sendPushToUser } from "./push.service";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  listingId?: string | null;
  commentId?: string | null;
  actorId?: string | null;
}

export interface NotificationList {
  items: NotificationRow[];
  nextCursor: string | null;
  unreadCount: number;
}

const NOTIFICATION_SELECT = `
  SELECT
    n.notification_id,
    n.user_id,
    n.type,
    n.title,
    n.body,
    n.link_url,
    n.listing_id,
    n.comment_id,
    n.actor_id,
    n.read_at,
    n.created_at,
    CASE
      WHEN a.user_id IS NULL THEN NULL
      ELSE json_build_object(
        'user_id', a.user_id,
        'name', a.name,
        'avatar_url', a.avatar_url
      )
    END AS actor
  FROM notifications n
  LEFT JOIN users a ON a.user_id = n.actor_id
`;

type RawNotification = Omit<NotificationRow, "created_at" | "read_at"> & {
  created_at: Date | string;
  read_at: Date | string | null;
};

function serialize(row: RawNotification): NotificationRow {
  return {
    ...row,
    read_at: row.read_at ? new Date(row.read_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
  };
}

/**
 * Inserts a notification and fires a push in the background. Never throws:
 * a notification is a side effect, so a failure here must not roll back the
 * comment, deletion, or suspension that triggered it.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<string | null> {
  if (!input.userId || input.userId === input.actorId) return null;

  try {
    const { rows } = await query<{ notification_id: string }>(
      `INSERT INTO notifications
         (user_id, type, title, body, link_url, listing_id, comment_id, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING notification_id`,
      [
        input.userId,
        input.type,
        input.title,
        input.body ?? null,
        input.linkUrl ?? null,
        input.listingId ?? null,
        input.commentId ?? null,
        input.actorId ?? null,
      ],
    );

    const notificationId = rows[0]!.notification_id;

    void sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      url: input.linkUrl,
      tag: notificationId,
    }).catch((error) => {
      logger.warn({ err: error }, "push notification dispatch failed");
    });

    return notificationId;
  } catch (error) {
    logger.warn(
      { err: error, type: input.type },
      "notification insert failed",
    );
    return null;
  }
}

export async function countUnread(userId: string): Promise<number> {
  const { rows } = await query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM notifications
      WHERE user_id = $1
        AND read_at IS NULL`,
    [userId],
  );
  return rows[0]?.count ?? 0;
}

export async function listNotifications(
  userId: string,
  options: { before?: string; limit?: number; unread?: boolean } = {},
): Promise<NotificationList> {
  const limit = options.limit ?? 20;
  const conditions = ["n.user_id = $1"];
  const params: unknown[] = [userId];

  if (options.before) {
    params.push(options.before);
    conditions.push(`n.created_at < $${params.length}`);
  }
  if (options.unread) conditions.push("n.read_at IS NULL");

  params.push(limit + 1);

  const { rows } = await query<RawNotification>(
    `${NOTIFICATION_SELECT}
      WHERE ${conditions.join(" AND ")}
      ORDER BY n.created_at DESC
      LIMIT $${params.length}`,
    params,
  );

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(serialize);

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.created_at : null,
    unreadCount: await countUnread(userId),
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { rows } = await query<{ notification_id: string }>(
    `UPDATE notifications
        SET read_at = COALESCE(read_at, now())
      WHERE notification_id = $1
        AND user_id = $2
      RETURNING notification_id`,
    [notificationId, userId],
  );

  if (!rows[0]) throw notFound("Notification not found", "NOTIFICATION_NOT_FOUND");
  return { read: true, unreadCount: await countUnread(userId) };
}

export async function markAllNotificationsRead(userId: string) {
  const result = await query(
    `UPDATE notifications
        SET read_at = now()
      WHERE user_id = $1
        AND read_at IS NULL`,
    [userId],
  );

  return { updated: result.rowCount ?? 0, unreadCount: 0 };
}

export async function deleteNotification(userId: string, notificationId: string) {
  const result = await query(
    `DELETE FROM notifications
      WHERE notification_id = $1
        AND user_id = $2`,
    [notificationId, userId],
  );

  if (!result.rowCount) {
    throw notFound("Notification not found", "NOTIFICATION_NOT_FOUND");
  }
  return { deleted: true, unreadCount: await countUnread(userId) };
}

export async function registerPushSubscription(
  userId: string,
  input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  },
) {
  const { rows } = await query<{ subscription_id: string }>(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth,
            user_agent = EXCLUDED.user_agent,
            last_seen_at = now()
     RETURNING subscription_id`,
    [
      userId,
      input.endpoint,
      input.keys.p256dh,
      input.keys.auth,
      input.userAgent ?? null,
    ],
  );

  return { subscriptionId: rows[0]!.subscription_id };
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const result = await query(
    `DELETE FROM push_subscriptions
      WHERE user_id = $1
        AND endpoint = $2`,
    [userId, endpoint],
  );

  return { removed: (result.rowCount ?? 0) > 0 };
}
