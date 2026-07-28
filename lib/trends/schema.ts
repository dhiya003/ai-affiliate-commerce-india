import { z } from "zod";
import { TREND_SIGNAL_TYPES } from "./types.ts";

export const trendSignalInputSchema = z
  .object({
    type: z.enum(TREND_SIGNAL_TYPES),
    source: z.string().trim().min(2).max(120),
    value: z.number().finite(),
    normalizedScore: z.number().finite().min(0).max(100),
    confidence: z.number().finite().min(0).max(1),
    observedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .refine(
    (signal) =>
      !signal.expiresAt ||
      new Date(signal.expiresAt).getTime() >
        new Date(signal.observedAt).getTime(),
    {
      message: "Signal expiry must be after its observation time.",
      path: ["expiresAt"],
    },
  );

export const trendSignalsSchema = z.array(trendSignalInputSchema).max(1000);
