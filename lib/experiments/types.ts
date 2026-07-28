export interface ContentVariation {
  id: string;
  productId: string;
  generatedContentId: string | null;
  label: string;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
  audienceAngle: string | null;
  contentLength: string | null;
  tone: string | null;
  platform: string;
  status: string;
  isWinner: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentResult {
  sampleSize: number;
  clicks: number;
  conversions: number;
  commission: number;
  conversionRate: number;
  earningsPerClick: number;
  confidence: number;
  calculatedAt: string;
  confidenceMethod: string;
}

export interface ExperimentVariationSummary {
  id: string;
  label: string;
  platform: string;
  status: string;
  isWinner: boolean;
  allocationPercent: number;
  result: ExperimentResult | null;
}

export interface ContentExperiment {
  id: string;
  productId: string;
  campaignId: string | null;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  status: string;
  confidenceThreshold: number;
  winnerVariationId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variations: ExperimentVariationSummary[];
}
