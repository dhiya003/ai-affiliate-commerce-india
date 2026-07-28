export const TREND_SIGNAL_TYPES = [
  "GOOGLE_TRENDS",
  "SOCIAL_MENTIONS",
  "MARKETPLACE_BESTSELLER",
  "REVIEW_GROWTH",
  "PRICE_DROP",
  "DISCOUNT_GROWTH",
  "AVAILABILITY",
  "CATEGORY_MOMENTUM",
  "SEASONAL_DEMAND",
  "FESTIVAL_DEMAND",
  "NEW_PRODUCT_VELOCITY",
] as const;

export type TrendSignalType = (typeof TREND_SIGNAL_TYPES)[number];
export type TrendDirection = "SPIKING" | "RISING" | "STABLE" | "DECAYING";

export interface TrendSignalInput {
  type: TrendSignalType;
  source: string;
  value: number;
  normalizedScore: number;
  confidence: number;
  observedAt: string;
  expiresAt?: string | null;
}

export interface TrendWindow {
  windowDays: 7 | 30;
  score: number;
  confidence: number;
  signalCount: number;
}

export interface TrendAssessment {
  sevenDay: TrendWindow;
  thirtyDay: TrendWindow;
  direction: TrendDirection;
  spikeMagnitude: number;
  weightedSources: Array<{
    source: string;
    score: number;
    confidence: number;
    weight: number;
  }>;
}
