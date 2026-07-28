export interface RecommendationFeedback {
  id: string;
  productId: string;
  productName: string;
  marketplace: string;
  category: string;
  scoreEvidenceId: string | null;
  action: string;
  reason: string | null;
  audience: string | null;
  season: string | null;
  festival: string | null;
  metadata: Record<string, unknown>;
  recordedAt: string;
}

export interface LearningProfile {
  id: string;
  dimension: string;
  dimensionKey: string;
  observationCount: number;
  promotionCount: number;
  conversionCount: number;
  conversionRate: number;
  averageCommission: number;
  earningsPerClick: number;
  confidence: number;
  evidenceFrom: string;
  evidenceTo: string;
  updatedAt: string;
}
