import { query } from "../../config/db";
import type { Listing } from "../../types";
import { badRequest, forbidden, notFound } from "../../utils/ApiError";
import { getListingsByIds } from "../listings/listings.service";
import { createNotification } from "../notifications/notifications.service";

export interface WishlistRow {
  wishlist_id: string;
  listing: Listing | null;
}

export interface WishlistStudent {
  user_id: string;
  name: string;
  department: string | null;
  program: string | null;
  avatar_url: string | null;
  created_at: string;
}

export async function getListingWishlistStudents(userId: string, listingId: string): Promise<WishlistStudent[]> {
  const listing = await query<{ seller_id: string }>(
    `SELECT seller_id FROM listings WHERE listing_id = $1`,
    [listingId],
  );
  if (!listing.rowCount) throw notFound("Listing not found");
  if (listing.rows[0]!.seller_id !== userId) throw forbidden("You can only view wishlist students for your own listing.", "NOT_OWNER");

  const { rows } = await query<Omit<WishlistStudent, "created_at"> & { created_at: Date | string }>(
    `SELECT u.user_id, u.name, u.department, u.program, u.avatar_url, w.created_at
       FROM wishlists w
       JOIN users u ON u.user_id = w.user_id
      WHERE w.listing_id = $1
      ORDER BY w.created_at DESC`,
    [listingId],
  );
  return rows.map((row) => ({ ...row, created_at: new Date(row.created_at).toISOString() }));
}

export async function getWishlistListings(userId: string): Promise<WishlistRow[]> {
  const { rows } = await query<{ wishlist_id: string; listing_id: string; created_at: Date }>(
    `SELECT wishlist_id, listing_id, created_at
       FROM wishlists
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId],
  );

  const listings = await getListingsByIds(rows.map((row) => row.listing_id));
  const byId = new Map(listings.map((listing) => [listing.listing_id, listing]));

  return rows.map((row) => ({
    wishlist_id: row.wishlist_id,
    listing: byId.get(row.listing_id) ?? null,
  }));
}

export async function isWishlisted(userId: string, listingId: string) {
  const { rowCount } = await query(
    `SELECT 1 FROM wishlists WHERE user_id = $1 AND listing_id = $2`,
    [userId, listingId],
  );
  return Boolean(rowCount);
}

export async function toggleWishlist(userId: string, listingId: string) {
  const { rows: listingRows } = await query<{ seller_id: string; title: string }>(
    `SELECT seller_id, title FROM listings WHERE listing_id = $1`,
    [listingId],
  );
  const listing = listingRows[0];
  if (!listing) throw notFound("Listing not found");

  const { rows } = await query<{ wishlist_id: string }>(
    `SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND listing_id = $2`,
    [userId, listingId],
  );

  const existing = rows[0];
  if (existing) {
    await query(`DELETE FROM wishlists WHERE wishlist_id = $1`, [
      existing.wishlist_id,
    ]);
    return { wishlisted: false };
  }

  try {
    const { rowCount: inserted } = await query(
      `INSERT INTO wishlists (user_id, listing_id) VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [userId, listingId],
    );
    if (inserted && listing.seller_id !== userId) {
      await createNotification({
        userId: listing.seller_id,
        actorId: userId,
        type: "wishlist",
        title: "Someone saved your listing",
        body: `A student added "${listing.title}" to their wishlist.`,
        linkUrl: `/listings/${listingId}`,
        listingId,
      });
    }
  } catch (error) {
    // Notifications are best-effort; concurrent duplicate saves are ignored.
    if ((error as { code?: string }).code !== "23505") throw error;
  }

  return { wishlisted: true };
}

export function assertListingId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw badRequest("Invalid listing id", "INVALID_ID");
  }
  return value;
}
