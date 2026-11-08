import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/http";
import { sellerPageHandler } from "./sellers.controller";

export const sellersRouter = Router();

// Signed-in students only. Contact details are the same ones the verified
// seller card already exposes on a listing; suspended accounts return 404.
sellersRouter.get("/:id", authenticate, asyncHandler(sellerPageHandler));
