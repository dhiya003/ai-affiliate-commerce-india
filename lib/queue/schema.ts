import { z } from "zod";

export const backgroundJobInputSchema = z.object({
  queueName: z.enum(["maintenance", "ingestion", "content", "notifications"]),
  jobType: z.enum([
    "RATE_LIMIT_CLEANUP",
    "EXPIRED_REPORT_CLEANUP",
    "OPERATIONAL_METRIC_ROLLUP",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  nextAttemptAt: z.iso.datetime().optional(),
});

export type BackgroundJobInput = z.infer<typeof backgroundJobInputSchema>;
