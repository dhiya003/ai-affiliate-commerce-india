export const SCORE_VERSION = "v1.0.0";

export type ReturnRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface ProductScoringInput {
  productId: string;
  rating: number | null;
  reviewCount: number;
  currentPrice: number;
  originalPrice: number | null;
  commissionRate: number | null;
  sellerRating: number | null;
  returnRisk: ReturnRiskLevel;
  competitionScore?: number | null;
  trendScore?: number | null;
  demandScore?: number | null;
}

export interface ScoreBreakdown {
  ratingScore: number;
  reviewVolumeScore: number;
  discountScore: number;
  commissionScore: number;
  priceAttractivenessScore: number;
  sellerQualityScore: number;
  competitionScore: number;
  trendScore: number;
  demandScore: number;
  returnRiskPenalty: number;
}

export interface ScoreExplanation {
  summary: string;
  strongestFactors: string[];
  cautions: string[];
  placeholders: string[];
  formula: string;
}

export interface ProductScoreResult {
  productId: string;
  version: typeof SCORE_VERSION;
  opportunityScore: number;
  commissionEstimate: number;
  breakdown: ScoreBreakdown;
  explanation: ScoreExplanation;
}

export type BulkScoreResult =
  | { success: true; score: ProductScoreResult }
  | {
      success: false;
      productId: string;
      error: string;
    };
