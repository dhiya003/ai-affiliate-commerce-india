import type { ScoringWeights } from "./schema";

export interface ScoringWeightVersion {
  id: string;
  version: string;
  status: "DRAFT" | "ACTIVE" | "ROLLED_BACK";
  weights: ScoringWeights;
  evidenceFrom: string;
  evidenceTo: string;
  observationCount: number;
  reason: string;
  previousVersionId: string | null;
  createdByEmail: string;
  createdAt: string;
  activatedAt: string | null;
  rolledBackAt: string | null;
}

export interface RecommendationQualitySnapshot {
  id: string;
  ownerEmail: string;
  modelVersion: string;
  recommendationCount: number;
  approvalRate: number;
  promotionRate: number;
  conversionRate: number;
  averageCommission: number;
  confidence: number;
  windowFrom: string;
  windowTo: string;
  calculatedAt: string;
}
