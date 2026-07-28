import { z } from "zod";

export const savedProductInputSchema = z.object({
  productId: z.string().trim().min(1).max(160),
});
