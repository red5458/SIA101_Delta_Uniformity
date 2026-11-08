import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { writeLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  deleteHandler,
  deleteAllHandler,
  listHandler,
  markAllReadHandler,
  markReadHandler,
  subscribeHandler,
  unreadCountHandler,
  unsubscribeHandler,
} from "./notifications.controller";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// Static paths first so `/subscriptions` is not swallowed by `/:id`.
notificationsRouter.get("/unread-count", asyncHandler(unreadCountHandler));
notificationsRouter.post("/read-all", asyncHandler(markAllReadHandler));
notificationsRouter.post(
  "/subscriptions",
  writeLimiter,
  asyncHandler(subscribeHandler),
);
notificationsRouter.delete(
  "/subscriptions",
  writeLimiter,
  asyncHandler(unsubscribeHandler),
);

notificationsRouter.get("/", asyncHandler(listHandler));
notificationsRouter.delete("/", writeLimiter, asyncHandler(deleteAllHandler));
notificationsRouter.patch("/:id/read", asyncHandler(markReadHandler));
notificationsRouter.delete("/:id", asyncHandler(deleteHandler));
