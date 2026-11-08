import { query } from "../../config/db";
import type { CommentRow, UserRow } from "../../types";
import { badRequest, forbidden, notFound } from "../../utils/ApiError";
import { createNotification } from "../notifications/notifications.service";
import type { z } from "zod";
import type { commentSchema } from "./comments.schema";

type CommentInput = z.infer<typeof commentSchema>;

const EXCERPT_LENGTH = 140;

function excerpt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > EXCERPT_LENGTH
    ? `${clean.slice(0, EXCERPT_LENGTH - 1)}…`
    : clean;
}

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
    title: string;
    seller_suspended: boolean;
  }>(
    `SELECT l.seller_id, l.title, u.is_suspended AS seller_suspended
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

  let parent: { listing_id: string; user_id: string } | undefined;
  if (input.parentId) {
    const { rows: parentRows } = await query<{ listing_id: string; user_id: string }>(
      `SELECT listing_id, user_id FROM comments WHERE comment_id = $1`,
      [input.parentId],
    );
    parent = parentRows[0];
    if (!parent || parent.listing_id !== input.listingId) {
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

  const commentId = rows[0]!.comment_id;
  const snippet = excerpt(input.text);

  await createNotification({
    userId: listing.seller_id,
    type: "comment",
    title: "New question on your listing",
    body: `${user.name} asked about "${listing.title}": ${snippet}`,
    linkUrl: `/listings/${input.listingId}#comments`,
    listingId: input.listingId,
    commentId,
    actorId: user.user_id,
  });

  // The parent author already gets the seller notification when they are the
  // seller, so only send a second one when it is someone else.
  if (parent && parent.user_id !== listing.seller_id) {
    await createNotification({
      userId: parent.user_id,
      type: "reply",
      title: "New reply to your question",
      body: `${user.name} replied: ${snippet}`,
      linkUrl: `/listings/${input.listingId}#comments`,
      listingId: input.listingId,
      commentId,
      actorId: user.user_id,
    });
  }

  return { commentId };
}

export async function deleteComment(commentId: string, user: UserRow) {
  const { rows } = await query<{ user_id: string; listing_id: string }>(
    `SELECT user_id, listing_id FROM comments WHERE comment_id = $1`,
    [commentId],
  );

  const comment = rows[0];
  if (!comment) throw notFound("Comment not found");

  if (comment.user_id !== user.user_id && !user.is_admin) {
    throw forbidden("You cannot delete this comment.", "FORBIDDEN");
  }

  await query(`DELETE FROM comments WHERE comment_id = $1`, [commentId]);

  // Only moderation is worth a notification; authors know they deleted their
  // own comment.
  if (user.is_admin && comment.user_id !== user.user_id) {
    await createNotification({
      userId: comment.user_id,
      type: "comment_removed",
      title: "Your comment was removed",
      body: "An administrator removed a comment you posted on a listing.",
      linkUrl: `/listings/${comment.listing_id}`,
      listingId: comment.listing_id,
      actorId: user.user_id,
    });
  }

  return { deleted: true };
}
