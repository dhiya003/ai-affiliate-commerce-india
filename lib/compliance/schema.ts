import { z } from "zod";

export const complianceOverrideSchema = z.object({
  reason: z.string().trim().min(20).max(1000),
});
