import "server-only";

import { apiFetch } from "@/lib/api/server";
import type { Comment, Listing } from "@/types/db";

export interface WishlistRow {
  wishlist_id: string;
  listing: Listing | null;
}

export function getComments(listingId: string): Promise<Comment[]> {
  return apiFetch<Comment[]>(
    `/comments?listing_id=${encodeURIComponent(listingId)}`,
  );
}

export function getWishlistListings(): Promise<WishlistRow[]> {
  return apiFetch<WishlistRow[]>("/wishlist");
}

export async function isWishlisted(listingId: string): Promise<boolean> {
  const ids = await apiFetch<string[]>("/wishlist/ids");
  return ids.includes(listingId);
}
