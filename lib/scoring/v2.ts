import { z } from "zod";
import type { ReturnRiskLevel } from "./types.ts";

export const SCORE_VERSION_V2 = "v2.0.0";

const factorSchema = z.number().finite().min(0).max(100).nullable().optional();

export const productScoringV2InputSchema = z.object({
  productId: z.string().trim().min(1),
  marketplace: z.enum(["Amazon", "Flipkart", "Meesho", "Myntra", "AJIO"]),
  category: z.string().trim().min(1),
  currentPrice: z.number().finite().positive(),
  commissionRate: z.number().finite().min(0).max(100).nullable(),
  returnRisk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
  ratingScore: factorSchema,
  reviewGrowthScore: factorSchema,
  demandScore: factorSchema,
  trendScore: factorSchema,
  sellerReliabilityScore: factorSchema,
  saturationScore: factorSchema,
  viralityScore: factorSchema,
  priceBandScore: factorSchema,
  categoryConversionScore: factorSchema,
  festivalRelevanceScore: factorSchema,
  targetAudienceSizeScore: factorSchema,
  visualAppealScore: factorSchema,
  urgencyScore: factorSchema,
  stockStabilityScore: factorSchema,
  sourceConfidence: z.number().finite().min(0).max(1),
  marketplaceWeights: z.record(z.string(), z.number().positive()).optional(),
  categoryWeights: z.record(z.string(), z.number().positive()).optional(),
});

export type ProductScoringV2Input = z.infer<typeof productScoringV2InputSchema>;

const BASE_WEIGHTS = {
  ratingScore: 0.07,
  reviewGrowthScore: 0.08,
  demandScore: 0.11,
  trendScore: 0.11,
  commissionScore: 0.1,
  sellerReliabilityScore: 0.07,
  saturationScore: 0.06,
  viralityScore: 0.08,
  priceBandScore: 0.05,
  categoryConversionScore: 0.06,
  festivalRelevanceScore: 0.04,
  targetAudienceSizeScore: 0.05,
  visualAppealScore: 0.04,
  urgencyScore: 0.04,
  stockStabilityScore: 0.04,
} as const;

type FactorName = keyof typeof BASE_WEIGHTS;

const RETURN_LEAKAGE: Record<ReturnRiskLevel, number> = {
  LOW: 0.04,
  MEDIUM: 0.12,
  HIGH: 0.28,
  UNKNOWN: 0.15,
};

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function commissionScore(rate: number | null) {
  return rate == null ? null : clamp((rate / 15) * 100);
}

export function calculateOpportunityScoreV2(rawInput: ProductScoringV2Input) {
  const input = productScoringV2InputSchema.parse(rawInput);
  const factors: Record<FactorName, number | null | undefined> = {
    ratingScore: input.ratingScore,
    reviewGrowthScore: input.reviewGrowthScore,
    demandScore: input.demandScore,
    trendScore: input.trendScore,
    commissionScore: commissionScore(input.commissionRate),
    sellerReliabilityScore: input.sellerReliabilityScore,
    saturationScore: input.saturationScore,
    viralityScore: input.viralityScore,
    priceBandScore: input.priceBandScore,
    categoryConversionScore: input.categoryConversionScore,
    festivalRelevanceScore: input.festivalRelevanceScore,
    targetAudienceSizeScore: input.targetAudienceSizeScore,
    visualAppealScore: input.visualAppealScore,
    urgencyScore: input.urgencyScore,
    stockStabilityScore: input.stockStabilityScore,
  };
  const weights = Object.fromEntries(
    Object.entries(BASE_WEIGHTS).map(([factor, baseWeight]) => [
      factor,
      round(
        baseWeight *
          (input.marketplaceWeights?.[factor] ?? 1) *
          (input.categoryWeights?.[factor] ?? 1),
        4,
      ),
    ]),
  ) as Record<FactorName, number>;
  const available = (Object.keys(factors) as FactorName[]).filter(
    (factor) => factors[factor] != null,
  );
  const availableWeight = available.reduce(
    (total, factor) => total + weights[factor],
    0,
  );
  const weighted =
    availableWeight === 0
      ? 0
      : available.reduce(
          (total, factor) =>
            total + (factors[factor] as number) * weights[factor],
          0,
        ) / availableWeight;
  const missingFactors = (Object.keys(factors) as FactorName[]).filter(
    (factor) => factors[factor] == null,
  );
  const missingDataPenalty = Math.min(24, missingFactors.length * 2);
  const sourceConfidencePenalty = round((1 - input.sourceConfidence) * 20);
  const returnRiskPenalty = {
    LOW: 2,
    MEDIUM: 7,
    HIGH: 15,
    UNKNOWN: 6,
  }[input.returnRisk];
  const opportunityScore = round(
    clamp(
      weighted -
        missingDataPenalty -
        sourceConfidencePenalty -
        returnRiskPenalty,
    ),
  );
  const grossCommissionEstimate = round(
    input.currentPrice * ((input.commissionRate ?? 0) / 100),
  );
  const netCommissionEstimate = round(
    grossCommissionEstimate * (1 - RETURN_LEAKAGE[input.returnRisk]),
  );
  const contributions = available
    .map((factor) => ({
      factor,
      score: factors[factor] as number,
      weight: round(weights[factor], 4),
      contribution: round(
        ((factors[factor] as number) * weights[factor]) / availableWeight,
      ),
    }))
    .sort((left, right) => right.contribution - left.contribution);

  return {
    productId: input.productId,
    version: SCORE_VERSION_V2,
    opportunityScore,
    grossCommissionEstimate,
    netCommissionEstimate,
    breakdown: Object.fromEntries(
      Object.entries(factors).map(([factor, value]) => [factor, value ?? null]),
    ),
    weights,
    penalties: {
      missingDataPenalty,
      sourceConfidencePenalty,
      returnRiskPenalty,
    },
    explanation: {
      summary: `Opportunity score ${opportunityScore}/100 using evidence-backed ${SCORE_VERSION_V2}.`,
      strongestFactors: contributions.slice(0, 3).map(({ factor }) => factor),
      cautions: [
        ...(missingFactors.length
          ? [`Missing evidence: ${missingFactors.join(", ")}.`]
          : []),
        ...(input.sourceConfidence < 0.7
          ? ["Low source confidence materially reduces this score."]
          : []),
        ...(input.returnRisk === "HIGH"
          ? ["High return risk reduces score and net commission."]
          : []),
      ],
      missingFactors,
      contributions,
      formula:
        "Available weighted evidence, normalized across marketplace and category multipliers, minus missing-data, source-confidence, and return-risk penalties.",
    },
  };
}
