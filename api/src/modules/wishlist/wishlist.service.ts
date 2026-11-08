import { query } from "../../config/db";
import type { Listing } from "../../types";
import { badRequest, notFound } from "../../utils/ApiError";
import { getListingsByIds } from "../listings/listings.service";

export interface WishlistRow {
  wishlist_id: string;
  listing: Listing | null;
}

export interface SellerWishlistSaverRow {
  wishlist_id: string;
  listing_id: string;
  created_at: Date | string;
  user_id: string;
  name: string;
  department: string | null;
  program: string | null;
  year_level: string | null;
  avatar_url: string | null;
}

export async function getSellerWishlistSavers(
  sellerId: string,
): Promise<SellerWishlistSaverRow[]> {
  const { rows } = await query<SellerWishlistSaverRow>(
    `SELECT
       w.wishlist_id,
       w.listing_id,
       w.created_at,
       u.user_id,
       u.name,
       u.department,
       u.program,
       u.year_level,
       u.avatar_url
     FROM wishlists w
     JOIN listings l ON l.listing_id = w.listing_id
     JOIN users u ON u.user_id = w.user_id
     WHERE l.seller_id = $1
       AND u.is_verified = true
       AND u.is_suspended = false
     ORDER BY w.created_at DESC`,
    [sellerId],
  );

  return rows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
  }));
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
  const { rowCount } = await query(
    `SELECT 1 FROM listings WHERE listing_id = $1`,
    [listingId],
  );
  if (!rowCount) throw notFound("Listing not found");

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
    await query(
      `INSERT INTO wishlists (user_id, listing_id) VALUES ($1, $2)`,
      [userId, listingId],
    );
  } catch (error) {
    // Concurrent double-click: the unique constraint already means "saved".
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
