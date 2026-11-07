import { z } from "zod";
import { DEPARTMENTS, YEAR_LEVELS } from "../auth/auth.schema";

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  yearLevel: z.enum(YEAR_LEVELS),
  department: z.enum(DEPARTMENTS),
  program: z.string().trim().min(2).max(20),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactMobile: z.string().trim().min(7).max(20),
  contactMessenger: z.string().trim().max(120).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
