import { z } from "zod";

export const contentVariationInputSchema = z
  .object({
    productId: z.string().trim().min(1).max(160),
    generatedContentId: z.string().trim().min(1).max(160).nullable().optional(),
    label: z.string().trim().min(1).max(120),
    hook: z.string().trim().max(1000).nullable().optional(),
    caption: z.string().trim().max(5000).nullable().optional(),
    cta: z.string().trim().max(1000).nullable().optional(),
    hashtags: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    audienceAngle: z.string().trim().max(1000).nullable().optional(),
    contentLength: z.string().trim().max(80).nullable().optional(),
    tone: z.string().trim().max(80).nullable().optional(),
    platform: z.string().trim().min(2).max(80),
  })
  .refine(({ hook, caption, cta }) => Boolean(hook || caption || cta), {
    message: "A content variation needs a hook, caption, or CTA.",
  });

const experimentVariationSchema = z.object({
  variationId: z.string().trim().min(1).max(160),
  allocationPercent: z.number().finite().positive().max(100),
});

export const experimentInputSchema = z
  .object({
    productId: z.string().trim().min(1).max(160),
    campaignId: z.string().trim().min(1).max(160).nullable().optional(),
    name: z.string().trim().min(3).max(160),
    hypothesis: z.string().trim().min(10).max(2000),
    primaryMetric: z.enum([
      "CLICKS",
      "CONVERSIONS",
      "CONVERSION_RATE",
      "COMMISSION",
      "EARNINGS_PER_CLICK",
    ]),
    confidenceThreshold: z.number().finite().min(0.8).max(0.999),
    variations: z.array(experimentVariationSchema).min(2).max(5),
  })
  .refine(
    ({ variations }) =>
      Math.abs(
        variations.reduce(
          (total, variation) => total + variation.allocationPercent,
          0,
        ) - 100,
      ) < 0.001,
    {
      message: "Experiment allocation must total 100%.",
      path: ["variations"],
    },
  )
  .refine(
    ({ variations }) =>
      new Set(variations.map(({ variationId }) => variationId)).size ===
      variations.length,
    {
      message: "Experiment variations must be unique.",
      path: ["variations"],
    },
  );

export const experimentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("calculate") }),
  z.object({
    action: z.literal("select-winner"),
    variationId: z.string().trim().min(1).max(160),
  }),
  z.object({ action: z.literal("archive") }),
]);

export type ContentVariationInput = z.infer<typeof contentVariationInputSchema>;
export type ExperimentInput = z.infer<typeof experimentInputSchema>;
