import { z } from "zod";

export const sellerIdSchema = z.string().uuid("Invalid student id");
