import { ZodError } from "zod";
import { productScoringInputSchema } from "./schema.ts";
import {
  type BulkScoreResult,
  type ProductScoreResult,
  type ProductScoringInput,
  type ScoreBreakdown,
  SCORE_VERSION,
} from "./types.ts";

const SCORE_WEIGHTS = {
  ratingScore: 0.16,
  reviewVolumeScore: 0.12,
  discountScore: 0.12,
  commissionScore: 0.15,
  priceAttractivenessScore: 0.1,
  sellerQualityScore: 0.1,
  competitionScore: 0.1,
  trendScore: 0.08,
  demandScore: 0.07,
} satisfies Record<Exclude<keyof ScoreBreakdown, "returnRiskPenalty">, number>;

const RETURN_RISK_PENALTY = {
  LOW: 2,
  MEDIUM: 7,
  HIGH: 15,
  UNKNOWN: 5,
} as const;

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function ratingScore(rating: number | null): number {
  return rating === null ? 40 : clamp((rating / 5) * 100);
}

function reviewVolumeScore(reviewCount: number): number {
  if (reviewCount === 0) return 0;
  return clamp((Math.log10(reviewCount + 1) / Math.log10(10_001)) * 100);
}

function discountScore(
  currentPrice: number,
  originalPrice: number | null,
): number {
  if (originalPrice === null || originalPrice <= currentPrice) return 0;
  const discountPercentage =
    ((originalPrice - currentPrice) / originalPrice) * 100;
  return clamp((discountPercentage / 60) * 100);
}

function commissionScore(commissionRate: number | null): number {
  return commissionRate === null ? 30 : clamp((commissionRate / 15) * 100);
}

function priceAttractivenessScore(price: number): number {
  if (price <= 499) return 100;
  if (price <= 999) return 90;
  if (price <= 1_999) return 75;
  if (price <= 4_999) return 55;
  if (price <= 9_999) return 35;
  return 20;
}

function sellerQualityScore(sellerRating: number | null): number {
  return sellerRating === null ? 45 : clamp((sellerRating / 5) * 100);
}

function placeholderScore(value: number | null | undefined): number {
  return value ?? 50;
}

function strongestFactors(breakdown: ScoreBreakdown): string[] {
  return Object.entries(SCORE_WEIGHTS)
    .map(([factor, weight]) => ({
      factor,
      contribution: breakdown[factor as keyof typeof SCORE_WEIGHTS] * weight,
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(({ factor }) => factor);
}

export function calculateOpportunityScore(
  rawInput: ProductScoringInput,
): ProductScoreResult {
  const input = productScoringInputSchema.parse(rawInput);
  const breakdown: ScoreBreakdown = {
    ratingScore: round(ratingScore(input.rating)),
    reviewVolumeScore: round(reviewVolumeScore(input.reviewCount)),
    discountScore: round(
      discountScore(input.currentPrice, input.originalPrice),
    ),
    commissionScore: round(commissionScore(input.commissionRate)),
    priceAttractivenessScore: priceAttractivenessScore(input.currentPrice),
    sellerQualityScore: round(sellerQualityScore(input.sellerRating)),
    competitionScore: round(placeholderScore(input.competitionScore)),
    trendScore: round(placeholderScore(input.trendScore)),
    demandScore: round(placeholderScore(input.demandScore)),
    returnRiskPenalty: RETURN_RISK_PENALTY[input.returnRisk],
  };

  const weightedScore = Object.entries(SCORE_WEIGHTS).reduce(
    (total, [factor, weight]) =>
      total + breakdown[factor as keyof typeof SCORE_WEIGHTS] * weight,
    0,
  );
  const opportunityScore = round(
    clamp(weightedScore - breakdown.returnRiskPenalty),
  );
  const missingFields = [
    input.rating === null ? "rating" : null,
    input.commissionRate === null ? "commissionRate" : null,
    input.sellerRating === null ? "sellerRating" : null,
  ].filter((value): value is string => value !== null);
  const placeholderFields = [
    input.competitionScore == null ? "competition" : null,
    input.trendScore == null ? "trend" : null,
    input.demandScore == null ? "demand" : null,
  ].filter((value): value is string => value !== null);

  return {
    productId: input.productId,
    version: SCORE_VERSION,
    opportunityScore,
    commissionEstimate: round(
      input.currentPrice * ((input.commissionRate ?? 0) / 100),
    ),
    breakdown,
    explanation: {
      summary: `Opportunity score ${opportunityScore}/100 using ${SCORE_VERSION}.`,
      strongestFactors: strongestFactors(breakdown),
      cautions: [
        ...(missingFields.length > 0
          ? [`Missing data: ${missingFields.join(", ")}.`]
          : []),
        ...(input.returnRisk === "HIGH"
          ? ["High return risk materially reduces this score."]
          : []),
      ],
      placeholders: placeholderFields,
      formula:
        "Weighted rating, review volume, discount, commission, price, seller, competition, trend, and demand scores minus return-risk penalty.",
    },
  };
}

export function calculateOpportunityScores(
  inputs: ProductScoringInput[],
): BulkScoreResult[] {
  return inputs.map((input) => {
    try {
      return {
        success: true,
        score: calculateOpportunityScore(input),
      };
    } catch (error) {
      return {
        success: false,
        productId: input.productId,
        error:
          error instanceof ZodError
            ? error.issues.map((issue) => issue.message).join("; ")
            : "Score calculation failed.",
      };
    }
  });
}
