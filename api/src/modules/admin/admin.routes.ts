import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/require";
import { asyncHandler } from "../../utils/http";
import {
  commentsHandler,
  accountDeletionRequestsHandler,
  deleteCommentHandler,
  deleteListingHandler,
  listingsHandler,
  statsHandler,
  suspendHandler,
  usersHandler,
} from "./admin.controller";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/stats", asyncHandler(statsHandler));
adminRouter.get("/listings", asyncHandler(listingsHandler));
adminRouter.delete("/listings/:id", asyncHandler(deleteListingHandler));
adminRouter.get("/users", asyncHandler(usersHandler));
adminRouter.post("/users/:id/suspend", asyncHandler(suspendHandler));
adminRouter.get("/comments", asyncHandler(commentsHandler));
adminRouter.get("/account-deletion-requests", asyncHandler(accountDeletionRequestsHandler));
adminRouter.delete("/comments/:id", asyncHandler(deleteCommentHandler));
