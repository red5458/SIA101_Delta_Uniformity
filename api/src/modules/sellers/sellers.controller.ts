import type { Request, Response } from "express";
import { notFound } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { sellerIdSchema } from "./sellers.schema";
import { getSellerPage } from "./sellers.service";

export async function sellerPageHandler(req: Request, res: Response) {
  const sellerId = sellerIdSchema.parse(req.params.id);

  const page = await getSellerPage(sellerId);
  if (!page) throw notFound("Student not found", "SELLER_NOT_FOUND");

  return ok(res, page);
}
