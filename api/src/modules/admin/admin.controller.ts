import type { Request, Response } from "express";
import { z } from "zod";
import type { UserRow } from "../../types";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { deleteComment } from "../comments/comments.service";
import { deleteListing } from "../listings/listings.service";
import {
  getAdminStats,
  listAdminComments,
  listAdminListings,
  listAdminUsers,
  setUserSuspension,
} from "./admin.service";

const suspendSchema = z.object({ suspended: z.boolean() });

function admin(req: Request): UserRow {
  if (!req.user) throw unauthorized();
  return req.user;
}

export async function statsHandler(req: Request, res: Response) {
  admin(req);
  return ok(res, await getAdminStats());
}

export async function listingsHandler(req: Request, res: Response) {
  admin(req);
  return ok(res, await listAdminListings());
}

export async function usersHandler(req: Request, res: Response) {
  admin(req);
  return ok(res, await listAdminUsers());
}

export async function commentsHandler(req: Request, res: Response) {
  admin(req);
  return ok(res, await listAdminComments());
}

export async function deleteListingHandler(req: Request, res: Response) {
  const user = admin(req);
  const result = await deleteListing(String(req.params.id), {
    userId: user.user_id,
    isAdmin: true,
  });
  return ok(res, result);
}

export async function deleteCommentHandler(req: Request, res: Response) {
  const user = admin(req);
  return ok(res, await deleteComment(String(req.params.id), user));
}

export async function suspendHandler(req: Request, res: Response) {
  const user = admin(req);
  const { suspended } = suspendSchema.parse(req.body);
  return ok(res, await setUserSuspension(user, String(req.params.id), suspended));
}
