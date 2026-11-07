import type { Request, Response } from "express";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { commentSchema } from "./comments.schema";
import { createComment, deleteComment, getComments } from "./comments.service";

export async function listCommentsHandler(req: Request, res: Response) {
  const listingId = typeof req.query.listing_id === "string" ? req.query.listing_id : "";
  if (!listingId) {
    return res.status(422).json({
      error: { message: "listing_id is required", code: "VALIDATION_ERROR" },
    });
  }

  return ok(res, await getComments(listingId));
}

export async function createCommentHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const input = commentSchema.parse(req.body);
  const result = await createComment(user, input);
  return ok(res, result, 201);
}

export async function deleteCommentHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const result = await deleteComment(String(req.params.id), user);
  return ok(res, result);
}
