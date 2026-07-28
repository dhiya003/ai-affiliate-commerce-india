import { ApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/products/repository";
import type { FeedbackInput } from "./schema";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Learning storage is unavailable.",
    );
  }
  return env.DB;
}

export async function recordRecommendationFeedback(
  input: FeedbackInput,
  email: string,
) {
  const db = await database();
  if (!(await getProduct(input.productId, email))) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  if (input.scoreEvidenceId) {
    const evidence = await db
      .prepare(
        `SELECT id FROM opportunity_score_evidence
         WHERE id = ? AND product_id = ?`,
      )
      .bind(input.scoreEvidenceId, input.productId)
      .first<{ id: string }>();
    if (!evidence) {
      throw new ApiError(
        404,
        "SCORE_EVIDENCE_NOT_FOUND",
        "Score evidence not found for this product.",
      );
    }
  }
  const id = crypto.randomUUID();
  const recordedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO recommendation_feedback (
        id, owner_email, product_id, score_evidence_id, action, reason,
        audience, season, festival, metadata_json, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      email,
      input.productId,
      input.scoreEvidenceId ?? null,
      input.action,
      input.reason ?? null,
      input.audience ?? null,
      input.season ?? null,
      input.festival ?? null,
      JSON.stringify(input.metadata),
      recordedAt,
    )
    .run();
  return { id, ...input, recordedAt };
}

export async function listRecommendationFeedback(email: string) {
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT rf.id, rf.product_id, p.name AS product_name, p.marketplace,
        p.category, rf.score_evidence_id, rf.action, rf.reason, rf.audience,
        rf.season, rf.festival, rf.metadata_json, rf.recorded_at
       FROM recommendation_feedback rf
       JOIN products p ON p.id = rf.product_id
       WHERE rf.owner_email = ?
       ORDER BY rf.recorded_at DESC LIMIT 200`,
    )
    .bind(email)
    .all<{
      id: string;
      product_id: string;
      product_name: string;
      marketplace: string;
      category: string;
      score_evidence_id: string | null;
      action: string;
      reason: string | null;
      audience: string | null;
      season: string | null;
      festival: string | null;
      metadata_json: string;
      recorded_at: string;
    }>();
  return rows.results.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    marketplace: row.marketplace,
    category: row.category,
    scoreEvidenceId: row.score_evidence_id,
    action: row.action,
    reason: row.reason,
    audience: row.audience,
    season: row.season,
    festival: row.festival,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    recordedAt: row.recorded_at,
  }));
}

interface AggregateRow {
  dimension_key: string;
  observation_count: number;
  promotion_count: number;
  conversion_count: number;
  commission: number;
  clicks: number;
}

const trackedDimensions = {
  MARKETPLACE: "tl.marketplace",
  CATEGORY: "p.category",
  PRICE_BAND: `CASE
    WHEN p.current_price < 500 THEN 'UNDER_500'
    WHEN p.current_price < 1500 THEN '500_TO_1499'
    WHEN p.current_price < 5000 THEN '1500_TO_4999'
    ELSE '5000_PLUS' END`,
  COMMISSION_BAND: `CASE
    WHEN COALESCE(p.commission_rate, 0) < 3 THEN 'UNDER_3_PERCENT'
    WHEN COALESCE(p.commission_rate, 0) < 7 THEN '3_TO_6_99_PERCENT'
    ELSE '7_PERCENT_PLUS' END`,
  CREATOR: "COALESCE(ca.handle, 'UNMAPPED')",
  AUDIENCE: "COALESCE(NULLIF(cv.audience_angle, ''), 'UNSPECIFIED')",
  HOOK: "COALESCE(NULLIF(cv.hook, ''), 'UNSPECIFIED')",
  CTA: "COALESCE(NULLIF(cv.cta, ''), 'UNSPECIFIED')",
  CAPTION_TONE: "COALESCE(NULLIF(cv.tone, ''), 'UNSPECIFIED')",
} as const;

function confidenceForObservations(observations: number): number {
  return Math.min(0.99, 1 - Math.exp(-Math.max(0, observations) / 50));
}

async function aggregateTrackedDimension(
  db: D1Database,
  email: string,
  range: { from: string; to: string },
  dimension: keyof typeof trackedDimensions,
): Promise<AggregateRow[]> {
  const expression = trackedDimensions[dimension];
  const rows = await db
    .prepare(
      `WITH click_agg AS (
         SELECT tracked_link_id, COUNT(*) AS clicks
         FROM click_events
         WHERE clicked_at BETWEEN ? AND ? AND is_bot = 0 AND is_duplicate = 0
         GROUP BY tracked_link_id
       ), conversion_agg AS (
         SELECT tracked_link_id, COUNT(*) AS conversions
         FROM conversion_events
         WHERE converted_at BETWEEN ? AND ?
           AND order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
         GROUP BY tracked_link_id
       ), commission_agg AS (
         SELECT cv.tracked_link_id, SUM(cm.amount) AS commission
         FROM commission_events cm
         JOIN conversion_events cv ON cv.id = cm.conversion_event_id
         WHERE cm.observed_at BETWEEN ? AND ?
           AND cm.status IN ('APPROVED', 'PAID')
         GROUP BY cv.tracked_link_id
       )
       SELECT ${expression} AS dimension_key,
         COALESCE(SUM(cla.clicks), 0) AS observation_count,
         COUNT(DISTINCT tl.promotion_id) AS promotion_count,
         COALESCE(SUM(va.conversions), 0) AS conversion_count,
         COALESCE(SUM(ma.commission), 0) AS commission,
         COALESCE(SUM(cla.clicks), 0) AS clicks
       FROM tracked_links tl
       JOIN products p ON p.id = tl.product_id
       JOIN campaigns c ON c.id = tl.campaign_id
       LEFT JOIN creator_accounts ca ON ca.id = c.creator_account_id
       LEFT JOIN content_variations cv ON cv.id = tl.content_variation_id
       LEFT JOIN click_agg cla ON cla.tracked_link_id = tl.id
       LEFT JOIN conversion_agg va ON va.tracked_link_id = tl.id
       LEFT JOIN commission_agg ma ON ma.tracked_link_id = tl.id
       WHERE tl.owner_email = ?
       GROUP BY ${expression}`,
    )
    .bind(
      range.from,
      range.to,
      range.from,
      range.to,
      range.from,
      range.to,
      email,
    )
    .all<AggregateRow>();
  return rows.results;
}

async function feedbackDimensionRows(
  db: D1Database,
  email: string,
  range: { from: string; to: string },
  field: "season" | "festival",
): Promise<AggregateRow[]> {
  const rows = await db
    .prepare(
      `SELECT ${field} AS dimension_key, COUNT(*) AS observation_count,
        SUM(CASE WHEN action = 'PROMOTED' THEN 1 ELSE 0 END) AS promotion_count,
        SUM(CASE WHEN action = 'SUCCESSFUL' THEN 1 ELSE 0 END)
          AS conversion_count,
        0 AS commission, 0 AS clicks
       FROM recommendation_feedback
       WHERE owner_email = ? AND recorded_at BETWEEN ? AND ?
         AND ${field} IS NOT NULL AND ${field} != ''
       GROUP BY ${field}`,
    )
    .bind(email, range.from, range.to)
    .all<AggregateRow>();
  return rows.results;
}

export async function refreshLearningProfiles(
  email: string,
  range: { from: string; to: string },
) {
  const db = await database();
  const tracked = await Promise.all(
    Object.keys(trackedDimensions).map(async (dimension) => ({
      dimension,
      rows: await aggregateTrackedDimension(
        db,
        email,
        range,
        dimension as keyof typeof trackedDimensions,
      ),
    })),
  );
  const [season, festival] = await Promise.all([
    feedbackDimensionRows(db, email, range, "season"),
    feedbackDimensionRows(db, email, range, "festival"),
  ]);
  const groups = [
    ...tracked,
    { dimension: "SEASON", rows: season },
    { dimension: "FESTIVAL", rows: festival },
  ];
  const updatedAt = new Date().toISOString();
  const statements = groups.flatMap(({ dimension, rows }) =>
    rows.map((row) => {
      const conversionRate = row.clicks
        ? (row.conversion_count / row.clicks) * 100
        : row.observation_count
          ? (row.conversion_count / row.observation_count) * 100
          : 0;
      const averageCommission = row.conversion_count
        ? row.commission / row.conversion_count
        : 0;
      const earningsPerClick = row.clicks ? row.commission / row.clicks : 0;
      return db
        .prepare(
          `INSERT INTO learning_profiles (
            id, owner_email, dimension, dimension_key, observation_count,
            promotion_count, conversion_count, conversion_rate,
            average_commission, earnings_per_click, confidence, evidence_from,
            evidence_to, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(owner_email, dimension, dimension_key) DO UPDATE SET
            observation_count = excluded.observation_count,
            promotion_count = excluded.promotion_count,
            conversion_count = excluded.conversion_count,
            conversion_rate = excluded.conversion_rate,
            average_commission = excluded.average_commission,
            earnings_per_click = excluded.earnings_per_click,
            confidence = excluded.confidence,
            evidence_from = excluded.evidence_from,
            evidence_to = excluded.evidence_to,
            updated_at = excluded.updated_at`,
        )
        .bind(
          crypto.randomUUID(),
          email,
          dimension,
          row.dimension_key,
          row.observation_count,
          row.promotion_count,
          row.conversion_count,
          conversionRate,
          averageCommission,
          earningsPerClick,
          confidenceForObservations(row.observation_count),
          range.from,
          range.to,
          updatedAt,
        );
    }),
  );
  if (statements.length) await db.batch(statements);
  return listLearningProfiles(email);
}

export async function listLearningProfiles(email: string) {
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT id, dimension, dimension_key, observation_count, promotion_count,
        conversion_count, conversion_rate, average_commission,
        earnings_per_click, confidence, evidence_from, evidence_to, updated_at
       FROM learning_profiles
       WHERE owner_email = ?
       ORDER BY confidence DESC, observation_count DESC LIMIT 500`,
    )
    .bind(email)
    .all<{
      id: string;
      dimension: string;
      dimension_key: string;
      observation_count: number;
      promotion_count: number;
      conversion_count: number;
      conversion_rate: number;
      average_commission: number;
      earnings_per_click: number;
      confidence: number;
      evidence_from: string;
      evidence_to: string;
      updated_at: string;
    }>();
  return rows.results.map((row) => ({
    id: row.id,
    dimension: row.dimension,
    dimensionKey: row.dimension_key,
    observationCount: row.observation_count,
    promotionCount: row.promotion_count,
    conversionCount: row.conversion_count,
    conversionRate: row.conversion_rate,
    averageCommission: row.average_commission,
    earningsPerClick: row.earnings_per_click,
    confidence: row.confidence,
    evidenceFrom: row.evidence_from,
    evidenceTo: row.evidence_to,
    updatedAt: row.updated_at,
  }));
}
