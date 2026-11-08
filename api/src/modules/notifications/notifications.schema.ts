import { z } from "zod";

export const notificationIdSchema = z.string().uuid("Invalid notification id");

export const notificationListQuerySchema = z.object({
  /** ISO timestamp of the last item already seen (cursor pagination). */
  before: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: z
    .enum(["1", "0", "true", "false"])
    .optional()
    .transform((value) => value === "1" || value === "true"),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1024),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(128),
  }),
  userAgent: z.string().max(400).optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(1024),
});
