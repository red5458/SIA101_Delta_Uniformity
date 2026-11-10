import "server-only";

import { apiFetch, apiFetchSafe } from "@/lib/api/server";
import type { Category, FeedFilters, Listing, SellerWishlistSaver } from "@/types/db";

export interface FeedResult {
  listings: Listing[];
  total: number;
  page: number;
  pageCount: number;
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/listings/categories");
}

export function getFeed(filters: FeedFilters = {}): Promise<FeedResult> {
  const query = new URLSearchParams();

  if (Array.isArray(filters.department)) {
    filters.department.forEach((department) => query.append("department", department));
  } else if (filters.department) {
    query.set("department", filters.department);
  }
  if (filters.category) query.set("category", filters.category);
  if (filters.itemType) query.set("item_type", filters.itemType);
  if (filters.size) query.set("size", filters.size);
  if (filters.condition) query.set("condition", filters.condition);
  if (typeof filters.minPrice === "number")
    query.set("min_price", String(filters.minPrice));
  if (typeof filters.maxPrice === "number")
    query.set("max_price", String(filters.maxPrice));
  if (filters.sort) query.set("sort", filters.sort);
  if (filters.q) query.set("q", filters.q);
  if (filters.page) query.set("page", String(filters.page));

  const search = query.toString();
  return apiFetch<FeedResult>(`/listings${search ? `?${search}` : ""}`);
}

export function getPublicPreviewListings(): Promise<Listing[]> {
  return apiFetch<Listing[]>("/listings/public-preview");
}

export function getListingById(id: string): Promise<Listing | null> {
  return apiFetchSafe<Listing>(`/listings/${encodeURIComponent(id)}`);
}

export function getSellerListings(): Promise<Listing[]> {
  return apiFetch<Listing[]>("/listings/mine");
}

export function getSellerWishlistSavers(): Promise<SellerWishlistSaver[]> {
  return apiFetch<SellerWishlistSaver[]>("/wishlist/seller-savers");
}

export async function getWishlistIds(): Promise<Set<string>> {
  const ids = await apiFetch<string[]>("/wishlist/ids");
  return new Set(ids);
}
