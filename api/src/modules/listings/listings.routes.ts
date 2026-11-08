import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { requireActive } from "../../middleware/require";
import { writeLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import {
  categoriesHandler,
  createListingHandler,
  deleteListingHandler,
  feedHandler,
  listingDetailHandler,
  myListingsHandler,
  publicPreviewHandler,
  updateListingHandler,
} from "./listings.controller";

export const listingsRouter = Router();

// Public landing-page previews expose listing and seller-card fields only; contact details stay private.
listingsRouter.get("/public-preview", asyncHandler(publicPreviewHandler));

listingsRouter.use(authenticate);

listingsRouter.get("/categories", asyncHandler(categoriesHandler));
listingsRouter.get("/", asyncHandler(feedHandler));
listingsRouter.post("/", requireActive, writeLimiter, asyncHandler(createListingHandler));
listingsRouter.get("/mine", asyncHandler(myListingsHandler));
listingsRouter.get("/:id", asyncHandler(listingDetailHandler));
listingsRouter.patch("/:id", requireActive, writeLimiter, asyncHandler(updateListingHandler));
listingsRouter.delete("/:id", writeLimiter, asyncHandler(deleteListingHandler));
