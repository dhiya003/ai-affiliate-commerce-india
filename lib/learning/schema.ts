import { z } from "zod";

export const feedbackInputSchema = z.object({
  productId: z.string().trim().min(1).max(160),
  scoreEvidenceId: z.string().trim().min(1).max(160).nullable().optional(),
  action: z.enum([
    "APPROVED",
    "REJECTED",
    "PROMOTED",
    "SKIPPED",
    "SUCCESSFUL",
    "UNSUCCESSFUL",
  ]),
  reason: z.string().trim().max(2000).nullable().optional(),
  audience: z.string().trim().max(300).nullable().optional(),
  season: z.string().trim().max(120).nullable().optional(),
  festival: z.string().trim().max(120).nullable().optional(),
  metadata: z
    .record(
      z.string().max(100),
      z.union([
        z.string().max(500),
        z.number().finite(),
        z.boolean(),
        z.null(),
      ]),
    )
    .default({})
    .refine((value) => JSON.stringify(value).length <= 10_000, {
      message: "Feedback metadata is too large.",
    }),
});

export const learningRefreshSchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .transform((value) => {
    const to = value.to ? new Date(value.to) : new Date();
    const from = value.from
      ? new Date(value.from)
      : new Date(to.getTime() - 90 * 24 * 60 * 60_000);
    return { from: from.toISOString(), to: to.toISOString() };
  })
  .refine(({ from, to }) => new Date(from) <= new Date(to), {
    message: "Learning evidence range start cannot be after its end.",
  });

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
