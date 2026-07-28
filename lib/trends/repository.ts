import { ApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/products/repository";
import { calculateOpportunityScoreV2 } from "@/lib/scoring/v2";
import { assessTrendSignals } from "./engine.ts";
import type { TrendSignalInput, TrendSignalType } from "./types.ts";

interface SignalRow {
  signal_type: TrendSignalType;
  value: number;
  normalized_score: number;
  confidence: number;
  observed_at: string;
  expires_at: string | null;
  metadata_json: string;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Trend intelligence storage is unavailable.",
    );
  }
  return env.DB;
}

function averageSignal(
  signals: TrendSignalInput[],
  types: TrendSignalType[],
): number | null {
  const matching = signals.filter((signal) => types.includes(signal.type));
  if (!matching.length) return null;
  const weight = matching.reduce(
    (total, signal) => total + signal.confidence,
    0,
  );
  return weight
    ? matching.reduce(
        (total, signal) => total + signal.normalizedScore * signal.confidence,
        0,
      ) / weight
    : null;
}

export async function listProductTrendSignals(
  productId: string,
  email: string,
) {
  const product = await getProduct(productId, email);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT signal_type, value, normalized_score, confidence, observed_at,
        expires_at, metadata_json
       FROM trend_signals WHERE product_id = ?
       ORDER BY observed_at DESC LIMIT 1000`,
    )
    .bind(productId)
    .all<SignalRow>();
  const signals: TrendSignalInput[] = rows.results.map((row) => {
    const metadata = JSON.parse(row.metadata_json) as { source?: string };
    return {
      type: row.signal_type,
      source: metadata.source ?? "Unknown source",
      value: row.value,
      normalizedScore: row.normalized_score,
      confidence: row.confidence,
      observedAt: row.observed_at,
      expiresAt: row.expires_at,
    };
  });
  return { signals, assessment: assessTrendSignals(signals) };
}

export async function recordProductTrendSignals(
  productId: string,
  signals: TrendSignalInput[],
  email: string,
) {
  const product = await getProduct(productId, email);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  const db = await database();
  const now = new Date().toISOString();
  await db.batch(
    signals.map((signal) =>
      db
        .prepare(
          `INSERT INTO trend_signals (
            id, product_id, source_id, signal_type, value, normalized_score,
            confidence, observed_at, expires_at, metadata_json, created_at
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          productId,
          signal.type,
          signal.value,
          signal.normalizedScore,
          signal.confidence,
          signal.observedAt,
          signal.expiresAt ?? null,
          JSON.stringify({ source: signal.source }),
          now,
        ),
    ),
  );

  const history = await listProductTrendSignals(productId, email);
  const { assessment } = history;
  const sourceConfidence = Math.max(
    assessment.sevenDay.confidence,
    assessment.thirtyDay.confidence,
  );
  const score = calculateOpportunityScoreV2({
    productId,
    marketplace: product.marketplace,
    category: product.category,
    currentPrice: product.currentPrice,
    commissionRate: product.commissionRate,
    returnRisk: product.returnRisk,
    ratingScore: product.rating == null ? null : (product.rating / 5) * 100,
    reviewGrowthScore: averageSignal(history.signals, ["REVIEW_GROWTH"]),
    demandScore: averageSignal(history.signals, [
      "GOOGLE_TRENDS",
      "MARKETPLACE_BESTSELLER",
      "CATEGORY_MOMENTUM",
      "SEASONAL_DEMAND",
      "FESTIVAL_DEMAND",
    ]),
    trendScore:
      assessment.sevenDay.signalCount > 0
        ? assessment.sevenDay.score
        : assessment.thirtyDay.signalCount > 0
          ? assessment.thirtyDay.score
          : null,
    sellerReliabilityScore:
      product.sellerRating == null ? null : (product.sellerRating / 5) * 100,
    saturationScore: null,
    viralityScore: averageSignal(history.signals, ["SOCIAL_MENTIONS"]),
    priceBandScore:
      product.currentPrice <= 999
        ? 90
        : product.currentPrice <= 2_499
          ? 75
          : product.currentPrice <= 4_999
            ? 60
            : 40,
    categoryConversionScore: null,
    festivalRelevanceScore: averageSignal(history.signals, ["FESTIVAL_DEMAND"]),
    targetAudienceSizeScore: null,
    visualAppealScore: null,
    urgencyScore: averageSignal(history.signals, [
      "PRICE_DROP",
      "DISCOUNT_GROWTH",
    ]),
    stockStabilityScore:
      product.stockStatus === "IN_STOCK"
        ? 90
        : product.stockStatus === "LOW_STOCK"
          ? 55
          : product.stockStatus === "OUT_OF_STOCK"
            ? 0
            : null,
    sourceConfidence,
  });

  await db.batch([
    ...([assessment.sevenDay, assessment.thirtyDay] as const).map((window) =>
      db
        .prepare(
          `INSERT INTO source_trend_scores (
            id, product_id, source_name, window_days, score, confidence,
            signal_count, direction, calculated_at, provenance_json
          ) VALUES (?, ?, 'combined', ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          productId,
          window.windowDays,
          window.score,
          window.confidence,
          window.signalCount,
          assessment.direction,
          now,
          JSON.stringify(assessment.weightedSources),
        ),
    ),
    db
      .prepare(
        `INSERT INTO opportunity_score_evidence (
          id, product_id, version, marketplace, category, opportunity_score,
          input_json, weights_json, breakdown_json, penalties_json,
          explanation_json, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        productId,
        score.version,
        product.marketplace,
        product.category,
        score.opportunityScore,
        JSON.stringify({
          signalCount: history.signals.length,
          sourceConfidence,
        }),
        JSON.stringify(score.weights),
        JSON.stringify(score.breakdown),
        JSON.stringify(score.penalties),
        JSON.stringify(score.explanation),
        now,
      ),
  ]);
  return { signalCount: history.signals.length, assessment, score };
}
