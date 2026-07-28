import { z } from "zod";
import { BASE_WEIGHTS, SCORING_FACTOR_NAMES } from "../scoring/v2.ts";

const factorWeightsSchema = z
  .object(
    Object.fromEntries(
      SCORING_FACTOR_NAMES.map((factor) => [
        factor,
        z.number().finite().min(0.01).max(0.3),
      ]),
    ) as Record<(typeof SCORING_FACTOR_NAMES)[number], z.ZodNumber>,
  )
  .refine(
    (weights) =>
      Math.abs(
        Object.values(weights).reduce((total, weight) => total + weight, 0) - 1,
      ) < 0.0001,
    "Factor weights must total 1.",
  );

const multiplierSetSchema = z
  .record(
    z.string().trim().min(1).max(120),
    z
      .partialRecord(
        z.enum(SCORING_FACTOR_NAMES as [string, ...string[]]),
        z.number().finite().min(0.5).max(1.5),
      )
      .refine((value) => Object.keys(value).length > 0),
  )
  .default({});

export const scoringWeightsSchema = z.object({
  factorWeights: factorWeightsSchema,
  marketplaceMultipliers: multiplierSetSchema,
  categoryMultipliers: multiplierSetSchema,
});

export const scoringWeightDraftSchema = z
  .object({
    version: z
      .string()
      .trim()
      .regex(/^v\d+\.\d+\.\d+$/, "Use a semantic version such as v2.1.0."),
    weights: scoringWeightsSchema,
    evidenceFrom: z.iso.datetime(),
    evidenceTo: z.iso.datetime(),
    observationCount: z.number().int().min(0).max(100_000_000),
    reason: z.string().trim().min(20).max(4000),
  })
  .refine(
    ({ evidenceFrom, evidenceTo }) =>
      new Date(evidenceFrom) <= new Date(evidenceTo),
    {
      path: ["evidenceTo"],
      message: "Evidence end cannot be before evidence start.",
    },
  );

export const scoringWeightActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("rollback") }),
]);

export const qualitySnapshotSchema = z
  .object({
    modelVersion: z.string().trim().min(1).max(80),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
  })
  .refine(({ from, to }) => new Date(from) <= new Date(to), {
    path: ["to"],
    message: "Quality window end cannot be before its start.",
  });

export const defaultScoringWeights = {
  factorWeights: { ...BASE_WEIGHTS },
  marketplaceMultipliers: {},
  categoryMultipliers: {},
};

export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;
export type ScoringWeightDraft = z.infer<typeof scoringWeightDraftSchema>;
export type QualitySnapshotInput = z.infer<typeof qualitySnapshotSchema>;
