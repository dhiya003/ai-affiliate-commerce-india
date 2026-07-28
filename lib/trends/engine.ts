import { trendSignalsSchema } from "./schema.ts";
import type {
  TrendAssessment,
  TrendDirection,
  TrendSignalInput,
  TrendWindow,
} from "./types.ts";

const SOURCE_WEIGHTS: Record<string, number> = {
  GOOGLE_TRENDS: 1,
  SOCIAL_MENTIONS: 0.8,
  MARKETPLACE_BESTSELLER: 1,
  REVIEW_GROWTH: 0.9,
  PRICE_DROP: 0.65,
  DISCOUNT_GROWTH: 0.6,
  AVAILABILITY: 0.8,
  CATEGORY_MOMENTUM: 0.75,
  SEASONAL_DEMAND: 0.8,
  FESTIVAL_DEMAND: 0.85,
  NEW_PRODUCT_VELOCITY: 0.75,
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculateWindow(
  signals: TrendSignalInput[],
  days: 7 | 30,
  now: Date,
): TrendWindow {
  const windowMs = days * 86_400_000;
  const active = signals.filter((signal) => {
    const age = now.getTime() - new Date(signal.observedAt).getTime();
    const unexpired =
      !signal.expiresAt || new Date(signal.expiresAt).getTime() > now.getTime();
    return age >= 0 && age <= windowMs && unexpired;
  });
  if (!active.length) {
    return { windowDays: days, score: 0, confidence: 0, signalCount: 0 };
  }
  let weightedScore = 0;
  let totalWeight = 0;
  let confidenceWeight = 0;
  for (const signal of active) {
    const age = now.getTime() - new Date(signal.observedAt).getTime();
    const recency = Math.max(0.2, 1 - age / windowMs);
    const sourceWeight = SOURCE_WEIGHTS[signal.type] ?? 0.5;
    const weight = recency * sourceWeight * signal.confidence;
    weightedScore += signal.normalizedScore * weight;
    confidenceWeight += signal.confidence * sourceWeight;
    totalWeight += weight;
  }
  return {
    windowDays: days,
    score: round(totalWeight ? weightedScore / totalWeight : 0),
    confidence: round(
      Math.min(1, confidenceWeight / Math.max(1, active.length)),
      4,
    ),
    signalCount: active.length,
  };
}

function trendDirection(sevenDay: number, thirtyDay: number): TrendDirection {
  const delta = sevenDay - thirtyDay;
  if (delta >= 15) return "SPIKING";
  if (delta >= 5) return "RISING";
  if (delta <= -8) return "DECAYING";
  return "STABLE";
}

export function assessTrendSignals(
  rawSignals: TrendSignalInput[],
  now = new Date(),
): TrendAssessment {
  const signals = trendSignalsSchema.parse(rawSignals);
  const sevenDay = calculateWindow(signals, 7, now);
  const thirtyDay = calculateWindow(signals, 30, now);
  const bySource = new Map<
    string,
    { score: number; confidence: number; count: number; weight: number }
  >();
  for (const signal of signals) {
    const current = bySource.get(signal.source) ?? {
      score: 0,
      confidence: 0,
      count: 0,
      weight: SOURCE_WEIGHTS[signal.type] ?? 0.5,
    };
    current.score += signal.normalizedScore;
    current.confidence += signal.confidence;
    current.count += 1;
    bySource.set(signal.source, current);
  }
  const weightedSources = [...bySource.entries()]
    .map(([source, aggregate]) => ({
      source,
      score: round(aggregate.score / aggregate.count),
      confidence: round(aggregate.confidence / aggregate.count, 4),
      weight: aggregate.weight,
    }))
    .sort((left, right) => right.weight - left.weight);

  return {
    sevenDay,
    thirtyDay,
    direction: trendDirection(sevenDay.score, thirtyDay.score),
    spikeMagnitude: round(sevenDay.score - thirtyDay.score),
    weightedSources,
  };
}
