import type { Request, Response } from "express";
import type { UserRow } from "../../types";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import {
  notificationIdSchema,
  notificationListQuerySchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "./notifications.schema";
import {
  countUnread,
  deleteNotification,
  deleteAllNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushSubscription,
  removePushSubscription,
} from "./notifications.service";

function currentUser(req: Request): UserRow {
  if (!req.user) throw unauthorized();
  return req.user;
}

export async function listHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const params = notificationListQuerySchema.parse(req.query);
  return ok(res, await listNotifications(user.user_id, params));
}

export async function unreadCountHandler(req: Request, res: Response) {
  const user = currentUser(req);
  return ok(res, { count: await countUnread(user.user_id) });
}

export async function markReadHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const id = notificationIdSchema.parse(req.params.id);
  return ok(res, await markNotificationRead(user.user_id, id));
}

export async function markAllReadHandler(req: Request, res: Response) {
  const user = currentUser(req);
  return ok(res, await markAllNotificationsRead(user.user_id));
}

export async function deleteHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const id = notificationIdSchema.parse(req.params.id);
  return ok(res, await deleteNotification(user.user_id, id));
}

export async function deleteAllHandler(req: Request, res: Response) {
  const user = currentUser(req);
  return ok(res, await deleteAllNotifications(user.user_id));
}

export async function subscribeHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const input = pushSubscriptionSchema.parse(req.body);
  const result = await registerPushSubscription(user.user_id, input);
  return ok(res, result, 201);
}

export async function unsubscribeHandler(req: Request, res: Response) {
  const user = currentUser(req);
  const { endpoint } = pushUnsubscribeSchema.parse(req.body);
  return ok(res, await removePushSubscription(user.user_id, endpoint));
}
