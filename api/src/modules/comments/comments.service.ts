import { query } from "../../config/db";
import type { CommentRow, UserRow } from "../../types";
import { badRequest, forbidden, notFound } from "../../utils/ApiError";
import type { z } from "zod";
import type { commentSchema } from "./comments.schema";

type CommentInput = z.infer<typeof commentSchema>;

export async function getComments(listingId: string): Promise<CommentRow[]> {
  const { rows } = await query<CommentRow>(
    `SELECT
       c.comment_id,
       c.listing_id,
       c.user_id,
       c.parent_id,
       c.text,
       c.created_at,
       json_build_object(
         'user_id', u.user_id,
         'name', u.name,
         'program', u.program,
         'year_level', u.year_level,
         'department', u.department,
         'avatar_url', u.avatar_url
       ) AS author
     FROM comments c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.listing_id = $1
     ORDER BY c.created_at ASC`,
    [listingId],
  );
  return rows;
}

export async function createComment(user: UserRow, input: CommentInput) {
  const { rows: listingRows } = await query<{
    seller_id: string;
    seller_suspended: boolean;
  }>(
    `SELECT l.seller_id, u.is_suspended AS seller_suspended
       FROM listings l
       JOIN users u ON u.user_id = l.seller_id
      WHERE l.listing_id = $1`,
    [input.listingId],
  );

  const listing = listingRows[0];
  if (!listing) throw notFound("Listing not found");
  if (listing.seller_suspended && listing.seller_id !== user.user_id && !user.is_admin) {
    throw notFound("Listing not found");
  }

  if (input.parentId) {
    const { rows: parentRows } = await query<{ listing_id: string }>(
      `SELECT listing_id FROM comments WHERE comment_id = $1`,
      [input.parentId],
    );
    if (!parentRows[0] || parentRows[0].listing_id !== input.listingId) {
      throw badRequest(
        "That reply is not part of this listing's Q&A.",
        "PARENT_INVALID",
      );
    }
  }

  const { rows } = await query<{ comment_id: string }>(
    `INSERT INTO comments (listing_id, user_id, parent_id, text)
     VALUES ($1, $2, $3, $4)
     RETURNING comment_id`,
    [input.listingId, user.user_id, input.parentId ?? null, input.text],
  );

  return { commentId: rows[0]!.comment_id };
}

export async function deleteComment(commentId: string, user: UserRow) {
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM comments WHERE comment_id = $1`,
    [commentId],
  );

  const comment = rows[0];
  if (!comment) throw notFound("Comment not found");

  if (comment.user_id !== user.user_id && !user.is_admin) {
    throw forbidden("You cannot delete this comment.", "FORBIDDEN");
  }

  await query(`DELETE FROM comments WHERE comment_id = $1`, [commentId]);
  return { deleted: true };
}
