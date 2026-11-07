import { z } from "zod";

export const commentSchema = z.object({
  listingId: z.string().uuid(),
  text: z.string().trim().min(1, "Write a question or reply").max(1000),
  parentId: z.string().uuid().optional().nullable(),
});
