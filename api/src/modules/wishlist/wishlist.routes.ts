import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { requireActive } from "../../middleware/require";
import { writeLimiter } from "../../middleware/rateLimit";
import type { Request, Response } from "express";
import { unauthorized } from "../../utils/ApiError";
import { asyncHandler, ok } from "../../utils/http";
import { getWishlistIds } from "../listings/listings.service";
import { getWishlistListings, toggleWishlist } from "./wishlist.service";

const toggleSchema = z.object({ listingId: z.string().uuid() });

async function listHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();
  return ok(res, await getWishlistListings(user.user_id));
}

async function idsHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const ids = await getWishlistIds(user.user_id);
  return ok(res, Array.from(ids));
}

async function toggleHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const { listingId } = toggleSchema.parse(req.body);
  return ok(res, await toggleWishlist(user.user_id, listingId));
}

export const wishlistRouter = Router();

wishlistRouter.use(authenticate);
wishlistRouter.get("/", asyncHandler(listHandler));
wishlistRouter.get("/ids", asyncHandler(idsHandler));
wishlistRouter.post(
  "/toggle",
  requireActive,
  writeLimiter,
  asyncHandler(toggleHandler),
);
