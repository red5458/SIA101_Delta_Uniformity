import * as webpush from "web-push";
import { query } from "../../config/db";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export interface PushPayload {
  title: string;
  body?: string | null;
  url?: string | null;
  /** Collapses repeated pushes from the same notification on some platforms. */
  tag?: string;
}

const configured = (() => {
  if (!env.pushEnabled) return false;
  try {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    );
    return true;
  } catch (error) {
    logger.warn({ err: error }, "invalid VAPID configuration; web push disabled");
    return false;
  }
})();

interface SubscriptionRow {
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Delivers a push to every browser the student has registered for. Expired
 * endpoints (404/410 from the push service) are deleted instead of retried
 * forever. Failure is always swallowed: push is a bonus, not part of the write.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configured) return;

  const { rows } = await query<SubscriptionRow>(
    `SELECT subscription_id, endpoint, p256dh, auth
       FROM push_subscriptions
      WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) return;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/notifications",
    tag: payload.tag ?? "uniformity",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          message,
          { TTL: 60 * 60 * 12 },
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await query(
            `DELETE FROM push_subscriptions WHERE subscription_id = $1`,
            [row.subscription_id],
          ).catch(() => undefined);
          return;
        }
        logger.warn({ err: error, statusCode }, "web push delivery failed");
      }
    }),
  );
}

export const pushConfigured = configured;
