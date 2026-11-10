import { z } from "zod";

export const conversationIdSchema = z.string().uuid();

export const createConversationSchema = z.object({
  listingId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().max(2000).default(""),
  attachments: z.array(z.object({
    url: z.string().min(1).max(2048),
    key: z.string().min(1).max(500),
    resourceType: z.enum(["image", "video"]),
    contentType: z.string().min(3).max(100),
    fileName: z.string().trim().min(1).max(255),
    fileSize: z.number().int().positive().max(25 * 1024 * 1024),
  })).max(4).default([]),
}).superRefine((value, ctx) => {
  if (!value.body && value.attachments.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Write a message or attach a photo or video.",
      path: ["body"],
    });
  }
});

export const messageQuerySchema = z
  .object({
    beforeId: z.string().uuid().optional(),
    afterId: z.string().uuid().optional(),
  })
  .refine((value) => !(value.beforeId && value.afterId), {
    message: "Use either beforeId or afterId, not both.",
  });
