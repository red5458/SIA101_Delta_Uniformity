import type { Request, Response } from "express";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import {
  createListing,
  deleteListing,
  getCategories,
  getFeed,
  getListingById,
  getPublicPreviewListings,
  getSellerListings,
  updateListing,
} from "./listings.service";
import {
  feedQuerySchema,
  listingSchema,
  listingUpdateSchema,
} from "./listings.schema";
import type { FeedFilters } from "../../types";

export async function categoriesHandler(_req: Request, res: Response) {
  return ok(res, await getCategories());
}

export async function publicPreviewHandler(_req: Request, res: Response) {
  return ok(res, await getPublicPreviewListings());
}

export async function feedHandler(req: Request, res: Response) {
  const cleaned: Record<string, unknown> = {};
  Object.entries(req.query).forEach(([key, value]) => {
    if (key === "department" && Array.isArray(value)) {
      const departments = value.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      );
      if (departments.length) cleaned[key] = departments;
    } else if (typeof value === "string" && value.trim() !== "") {
      cleaned[key] = value;
    }
  });

  const params = feedQuerySchema.parse(cleaned);

  const filters: FeedFilters = {
    department: params.department,
    category: params.category,
    itemType: params.item_type,
    size: params.size,
    condition: params.condition,
    minPrice: params.min_price,
    maxPrice: params.max_price,
    sort: params.sort,
    q: params.q,
    page: params.page,
  };

  return ok(res, await getFeed(filters));
}

export async function myListingsHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  return ok(res, await getSellerListings(user.user_id));
}

export async function listingDetailHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const listing = await getListingById(String(req.params.id), {
    userId: user.user_id,
    isAdmin: user.is_admin,
  });

  if (!listing) {
    return res.status(404).json({
      error: { message: "Listing not found", code: "NOT_FOUND" },
    });
  }

  return ok(res, listing);
}

export async function createListingHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const input = listingSchema.parse(req.body);
  const result = await createListing(user.user_id, input);
  return ok(res, result, 201);
}

export async function updateListingHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const input = listingUpdateSchema.parse(req.body);
  const result = await updateListing(String(req.params.id), {
    userId: user.user_id,
    isAdmin: user.is_admin,
  }, input);

  return ok(res, result);
}

export async function deleteListingHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const result = await deleteListing(String(req.params.id), {
    userId: user.user_id,
    isAdmin: user.is_admin,
  });

  return ok(res, result);
}
