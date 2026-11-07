import { z } from "zod";
import { DEPARTMENTS } from "../auth/auth.schema";

export const CONDITIONS = ["Like New", "Good", "Fair"] as const;
export const SIZES = ["S", "M", "L", "XL", "N/A"] as const;
export const ITEM_TYPES = ["Uniform", "Equipment"] as const;

export const MAX_PHOTOS = 6;

export const listingPhotoSchema = z
  .object({
    url: z.string().min(1).max(1000),
    key: z.string().min(1).max(500),
  })
  .superRefine((photo, ctx) => {
    // `local:` keys are produced by the development disk driver and by the
    // one-off legacy import. They pass schema validation; ownership checks in
    // the service restrict them to the uploader (or photos already attached to
    // the listing being edited).
    if (photo.key.startsWith("local:")) {
      if (!photo.url.startsWith("/uploads/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Legacy photos must point at a local upload path",
          path: ["url"],
        });
      }
      return;
    }

    try {
      if (new URL(photo.url).hostname === "res.cloudinary.com") return;
    } catch {
      // Fall through to the shared error message.
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Photos must be uploaded through Cloudinary",
      path: ["url"],
    });
  });

export const listingSchema = z.object({
  title: z.string().trim().min(5, "Title is too short").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Describe the item in at least 10 characters")
    .max(5000),
  price: z.coerce.number().min(0).max(100000),
  itemType: z.enum(ITEM_TYPES),
  categoryId: z.string().uuid("Choose a category"),
  condition: z.enum(CONDITIONS),
  size: z.enum(SIZES),
  measurements: z.string().trim().max(200).optional().or(z.literal("")),
  department: z.enum(DEPARTMENTS),
  photos: z.array(listingPhotoSchema).min(1, "Add at least one photo").max(MAX_PHOTOS),
});

export const listingUpdateSchema = listingSchema.partial().extend({
  status: z.enum(["Active", "Sold"]).optional(),
});

export const feedQuerySchema = z.object({
  department: z.enum(DEPARTMENTS).optional(),
  category: z.string().uuid().optional(),
  item_type: z.enum(ITEM_TYPES).optional(),
  size: z.enum(SIZES).optional(),
  condition: z.enum(CONDITIONS).optional(),
  min_price: z.coerce.number().min(0).max(100000).optional(),
  max_price: z.coerce.number().min(0).max(100000).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export type ListingInput = z.infer<typeof listingSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
