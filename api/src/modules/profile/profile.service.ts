import { query, withTransaction } from "../../config/db";
import type { UserRow } from "../../types";
import { badRequest } from "../../utils/ApiError";
import { verifyPassword } from "../../utils/password";
import { destroyUserUploads } from "../listings/media.service";

/**
 * Self-service, permanent account deletion.
 *
 * The schema cascades most rows, but notifications addressed to *other*
 * students keep their text after `actor_id` is nulled, so those are removed
 * explicitly first. Everything else — listings and their photos, comments and
 * replies, wishlist saves, conversations and messages/attachments, sessions,
 * push subscriptions — goes with the `users` row. Uploaded media lives under a
 * per-student folder, which is erased afterwards so no orphaned files remain.
 */
export async function deleteAccount(user: UserRow, password: string) {
  if (!(await verifyPassword(password, user.password_hash))) {
    throw badRequest("Your password is incorrect.", "PASSWORD_INCORRECT");
  }

  if (user.is_admin) {
    const { rows } = await query<{ remaining: number }>(
      `SELECT count(*)::int AS remaining
         FROM users
        WHERE is_admin AND user_id <> $1`,
      [user.user_id],
    );
    if (rows[0]?.remaining === 0) {
      throw badRequest(
        "You are the only administrator. Create another administrator with `npm run bootstrap-admin` before deleting this account.",
        "LAST_ADMIN",
      );
    }
  }

  await withTransaction(async (client) => {
    // Notifications are written for the *other* side of an interaction, so a
    // cascade would leave renamed "someone" entries behind. Remove anything
    // this student caused or anything about their listings and comments.
    await client.query(
      `DELETE FROM notifications
        WHERE actor_id = $1
           OR listing_id IN (
                SELECT listing_id FROM listings WHERE seller_id = $1
              )
           OR comment_id IN (
                SELECT c.comment_id
                  FROM comments c
                 WHERE c.user_id = $1
                    OR c.listing_id IN (
                         SELECT listing_id FROM listings WHERE seller_id = $1
                       )
              )`,
      [user.user_id],
    );

    const deleted = await client.query(
      `DELETE FROM users WHERE user_id = $1`,
      [user.user_id],
    );
    if (!deleted.rowCount) {
      throw badRequest("This account no longer exists.", "ACCOUNT_MISSING");
    }
  });

  // Best-effort: the rows are already gone, so a storage hiccup must not turn a
  // completed deletion into an error the student can retry.
  await destroyUserUploads(user.user_id);

  return { deleted: true };
}
