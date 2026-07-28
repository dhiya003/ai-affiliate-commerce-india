import { z } from "zod";
import { cronExpressionSchema } from "./cron.ts";

export const automationJobUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    cronExpression: cronExpressionSchema.optional(),
    timeoutSeconds: z.number().int().min(30).max(3600).optional(),
    maxAttempts: z.number().int().min(1).max(5).optional(),
    retryBaseSeconds: z.number().int().min(30).max(3600).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one job setting is required.",
  });

export const automationRunActionSchema = z.object({
  action: z.literal("run"),
});

export type AutomationJobUpdate = z.infer<typeof automationJobUpdateSchema>;
