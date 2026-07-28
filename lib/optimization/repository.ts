import { ApiError } from "@/lib/api/errors";
import type {
  QualitySnapshotInput,
  ScoringWeightDraft,
  ScoringWeights,
} from "./schema";
import type {
  RecommendationQualitySnapshot,
  ScoringWeightVersion,
} from "./types";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Optimization storage is unavailable.",
    );
  }
  return env.DB;
}

interface WeightRow {
  id: string;
  version: string;
  status: "DRAFT" | "ACTIVE" | "ROLLED_BACK";
  weights_json: string;
  evidence_from: string;
  evidence_to: string;
  observation_count: number;
  reason: string;
  previous_version_id: string | null;
  created_by_email: string;
  created_at: string;
  activated_at: string | null;
  rolled_back_at: string | null;
}

function mapWeightVersion(row: WeightRow): ScoringWeightVersion {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    weights: JSON.parse(row.weights_json) as ScoringWeights,
    evidenceFrom: row.evidence_from,
    evidenceTo: row.evidence_to,
    observationCount: row.observation_count,
    reason: row.reason,
    previousVersionId: row.previous_version_id,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    rolledBackAt: row.rolled_back_at,
  };
}

const WEIGHT_SELECT = `SELECT id, version, status, weights_json, evidence_from,
  evidence_to, observation_count, reason, previous_version_id,
  created_by_email, created_at, activated_at, rolled_back_at
  FROM scoring_weight_versions`;

export async function listScoringWeightVersions() {
  const rows = await (
    await database()
  )
    .prepare(`${WEIGHT_SELECT} ORDER BY created_at DESC LIMIT 100`)
    .all<WeightRow>();
  return rows.results.map(mapWeightVersion);
}

async function getWeightVersion(id: string) {
  const row = await (
    await database()
  )
    .prepare(`${WEIGHT_SELECT} WHERE id = ?`)
    .bind(id)
    .first<WeightRow>();
  if (!row) {
    throw new ApiError(
      404,
      "SCORING_VERSION_NOT_FOUND",
      "Scoring-weight version not found.",
    );
  }
  return mapWeightVersion(row);
}

export async function createScoringWeightDraft(
  input: ScoringWeightDraft,
  email: string,
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const active = await (
    await database()
  )
    .prepare(
      "SELECT id FROM scoring_weight_versions WHERE status = 'ACTIVE' LIMIT 1",
    )
    .first<{ id: string }>();
  try {
    await (
      await database()
    )
      .prepare(
        `INSERT INTO scoring_weight_versions (
          id, version, status, weights_json, evidence_from, evidence_to,
          observation_count, reason, previous_version_id, created_by_email,
          created_at
        ) VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.version,
        JSON.stringify(input.weights),
        input.evidenceFrom,
        input.evidenceTo,
        input.observationCount,
        input.reason,
        active?.id ?? null,
        email,
        now,
      )
      .run();
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed/i.test(error.message)
    ) {
      throw new ApiError(
        409,
        "SCORING_VERSION_EXISTS",
        "This scoring version already exists.",
      );
    }
    throw error;
  }
  return getWeightVersion(id);
}

interface QualityRow {
  id: string;
  owner_email: string;
  model_version: string;
  recommendation_count: number;
  approval_rate: number;
  promotion_rate: number;
  conversion_rate: number;
  average_commission: number;
  confidence: number;
  window_from: string;
  window_to: string;
  calculated_at: string;
}

function mapQuality(row: QualityRow): RecommendationQualitySnapshot {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    modelVersion: row.model_version,
    recommendationCount: row.recommendation_count,
    approvalRate: row.approval_rate,
    promotionRate: row.promotion_rate,
    conversionRate: row.conversion_rate,
    averageCommission: row.average_commission,
    confidence: row.confidence,
    windowFrom: row.window_from,
    windowTo: row.window_to,
    calculatedAt: row.calculated_at,
  };
}

const QUALITY_SELECT = `SELECT id, owner_email, model_version,
  recommendation_count, approval_rate, promotion_rate, conversion_rate,
  average_commission, confidence, window_from, window_to, calculated_at
  FROM recommendation_quality_snapshots`;

export async function listRecommendationQualitySnapshots(email: string) {
  const rows = await (
    await database()
  )
    .prepare(
      `${QUALITY_SELECT}
       WHERE owner_email = ? ORDER BY calculated_at DESC LIMIT 200`,
    )
    .bind(email)
    .all<QualityRow>();
  return rows.results.map(mapQuality);
}

export async function calculateRecommendationQualitySnapshot(
  input: QualitySnapshotInput,
  email: string,
) {
  const db = await database();
  const draftRow = await db
    .prepare(`${WEIGHT_SELECT} WHERE version = ? AND status = 'DRAFT'`)
    .bind(input.modelVersion)
    .first<WeightRow>();
  let feedback: {
    recommendations: number;
    approvals: number;
    promotions: number;
    successes: number;
  };
  let eligibleProductIds: string[];
  if (draftRow) {
    const draft = mapWeightVersion(draftRow);
    const evidence = await db
      .prepare(
        `SELECT rf.product_id, rf.action, ose.marketplace, ose.category,
          ose.breakdown_json, ose.penalties_json
         FROM recommendation_feedback rf
         JOIN opportunity_score_evidence ose ON ose.id = rf.score_evidence_id
         WHERE rf.owner_email = ? AND rf.recorded_at BETWEEN ? AND ?
         ORDER BY rf.recorded_at DESC LIMIT 10000`,
      )
      .bind(email, input.from, input.to)
      .all<{
        product_id: string;
        action: string;
        marketplace: string;
        category: string;
        breakdown_json: string;
        penalties_json: string;
      }>();
    const recommended = evidence.results.filter((row) => {
      const factors = JSON.parse(row.breakdown_json) as Record<
        string,
        number | null
      >;
      const penalties = JSON.parse(row.penalties_json) as Record<
        string,
        number
      >;
      const factorWeights = draft.weights.factorWeights as Record<
        string,
        number
      >;
      const marketplace =
        draft.weights.marketplaceMultipliers[row.marketplace] ?? {};
      const category = draft.weights.categoryMultipliers[row.category] ?? {};
      const available = Object.entries(factors).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && factorWeights[entry[0]] != null,
      );
      const weighted = available.map(([factor, value]) => ({
        value,
        weight:
          factorWeights[factor]! *
          (marketplace[factor] ?? 1) *
          (category[factor] ?? 1),
      }));
      const totalWeight = weighted.reduce(
        (total, item) => total + item.weight,
        0,
      );
      const rawScore = totalWeight
        ? weighted.reduce(
            (total, item) => total + item.value * item.weight,
            0,
          ) / totalWeight
        : 0;
      const penalty = Object.values(penalties).reduce(
        (total, value) => total + value,
        0,
      );
      return Math.max(0, Math.min(100, rawScore - penalty)) >= 60;
    });
    const actions = recommended.map(({ action }) => action);
    feedback = {
      recommendations: recommended.length,
      approvals: actions.filter((action) =>
        ["APPROVED", "PROMOTED", "SUCCESSFUL"].includes(action),
      ).length,
      promotions: actions.filter((action) =>
        ["PROMOTED", "SUCCESSFUL"].includes(action),
      ).length,
      successes: actions.filter((action) => action === "SUCCESSFUL").length,
    };
    eligibleProductIds = [
      ...new Set(recommended.map(({ product_id }) => product_id)),
    ];
  } else {
    feedback = (await db
      .prepare(
        `SELECT COUNT(*) AS recommendations,
            SUM(CASE WHEN rf.action IN ('APPROVED', 'PROMOTED', 'SUCCESSFUL')
              THEN 1 ELSE 0 END) AS approvals,
            SUM(CASE WHEN rf.action IN ('PROMOTED', 'SUCCESSFUL')
              THEN 1 ELSE 0 END) AS promotions,
            SUM(CASE WHEN rf.action = 'SUCCESSFUL' THEN 1 ELSE 0 END)
              AS successes
           FROM recommendation_feedback rf
           JOIN opportunity_score_evidence ose ON ose.id = rf.score_evidence_id
           WHERE rf.owner_email = ? AND ose.version = ?
             AND rf.recorded_at BETWEEN ? AND ?`,
      )
      .bind(email, input.modelVersion, input.from, input.to)
      .first<{
        recommendations: number;
        approvals: number;
        promotions: number;
        successes: number;
      }>()) ?? {
      recommendations: 0,
      approvals: 0,
      promotions: 0,
      successes: 0,
    };
    const eligible = await db
      .prepare(
        `SELECT DISTINCT rf.product_id
         FROM recommendation_feedback rf
         JOIN opportunity_score_evidence ose ON ose.id = rf.score_evidence_id
         WHERE rf.owner_email = ? AND ose.version = ?
           AND rf.recorded_at BETWEEN ? AND ? LIMIT 1000`,
      )
      .bind(email, input.modelVersion, input.from, input.to)
      .all<{ product_id: string }>();
    eligibleProductIds = eligible.results.map(({ product_id }) => product_id);
  }
  const recommendationCount = feedback?.recommendations ?? 0;
  const commission =
    eligibleProductIds.length > 0
      ? await db
          .prepare(
            `SELECT COALESCE(AVG(cm.amount), 0) AS average_commission
             FROM commission_events cm
             JOIN conversion_events cv ON cv.id = cm.conversion_event_id
             JOIN tracked_links tl ON tl.id = cv.tracked_link_id
             WHERE cm.owner_email = ? AND cm.status IN ('APPROVED', 'PAID')
               AND cm.observed_at BETWEEN ? AND ?
               AND tl.product_id IN (${eligibleProductIds
                 .slice(0, 100)
                 .map(() => "?")
                 .join(", ")})`,
          )
          .bind(
            email,
            input.from,
            input.to,
            ...eligibleProductIds.slice(0, 100),
          )
          .first<{ average_commission: number }>()
      : null;
  const rate = (count: number) =>
    recommendationCount ? (count / recommendationCount) * 100 : 0;
  const confidence = Math.min(0.99, 1 - Math.exp(-recommendationCount / 50));
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO recommendation_quality_snapshots (
        id, owner_email, model_version, recommendation_count, approval_rate,
        promotion_rate, conversion_rate, average_commission, confidence,
        window_from, window_to, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_email, model_version, window_from, window_to)
      DO UPDATE SET
        recommendation_count = excluded.recommendation_count,
        approval_rate = excluded.approval_rate,
        promotion_rate = excluded.promotion_rate,
        conversion_rate = excluded.conversion_rate,
        average_commission = excluded.average_commission,
        confidence = excluded.confidence,
        calculated_at = excluded.calculated_at`,
    )
    .bind(
      id,
      email,
      input.modelVersion,
      recommendationCount,
      rate(feedback?.approvals ?? 0),
      rate(feedback?.promotions ?? 0),
      rate(feedback?.successes ?? 0),
      commission?.average_commission ?? 0,
      confidence,
      input.from,
      input.to,
      calculatedAt,
    )
    .run();
  const row = await db
    .prepare(
      `${QUALITY_SELECT}
       WHERE owner_email = ? AND model_version = ?
         AND window_from = ? AND window_to = ?`,
    )
    .bind(email, input.modelVersion, input.from, input.to)
    .first<QualityRow>();
  if (!row) {
    throw new ApiError(
      500,
      "QUALITY_SNAPSHOT_FAILED",
      "Recommendation quality snapshot could not be saved.",
    );
  }
  return mapQuality(row);
}

function qualityComposite(snapshot: RecommendationQualitySnapshot) {
  return (
    snapshot.approvalRate * 0.25 +
    snapshot.promotionRate * 0.35 +
    snapshot.conversionRate * 0.4
  );
}

export async function activateScoringWeightVersion(id: string, email: string) {
  const db = await database();
  const candidate = await getWeightVersion(id);
  if (candidate.status !== "DRAFT") {
    throw new ApiError(
      409,
      "SCORING_VERSION_NOT_DRAFT",
      "Only a draft scoring version can be activated.",
    );
  }
  const candidateQualityRow = await db
    .prepare(
      `${QUALITY_SELECT}
       WHERE owner_email = ? AND model_version = ?
       ORDER BY calculated_at DESC LIMIT 1`,
    )
    .bind(email, candidate.version)
    .first<QualityRow>();
  if (!candidateQualityRow) {
    throw new ApiError(
      409,
      "QUALITY_SNAPSHOT_REQUIRED",
      "Calculate a matching recommendation-quality snapshot before activation.",
    );
  }
  const candidateQuality = mapQuality(candidateQualityRow);
  if (
    candidateQuality.recommendationCount < 20 ||
    candidateQuality.confidence < 0.3
  ) {
    throw new ApiError(
      409,
      "QUALITY_EVIDENCE_INSUFFICIENT",
      "Activation requires at least 20 recommendations and 30% evidence confidence.",
    );
  }
  const activeRow = await db
    .prepare(`${WEIGHT_SELECT} WHERE status = 'ACTIVE' LIMIT 1`)
    .first<WeightRow>();
  if (activeRow) {
    const baselineQualityRow = await db
      .prepare(
        `${QUALITY_SELECT}
         WHERE owner_email = ? AND model_version = ?
         ORDER BY calculated_at DESC LIMIT 1`,
      )
      .bind(email, activeRow.version)
      .first<QualityRow>();
    if (!baselineQualityRow) {
      throw new ApiError(
        409,
        "BASELINE_QUALITY_REQUIRED",
        "Calculate a quality snapshot for the active version before replacement.",
      );
    }
    const baseline = mapQuality(baselineQualityRow);
    if (qualityComposite(candidateQuality) < qualityComposite(baseline) * 0.9) {
      throw new ApiError(
        409,
        "SCORING_VERSION_DEGRADED",
        "Candidate quality is more than 10% below the active version.",
      );
    }
  }
  const now = new Date().toISOString();
  const statements = [
    ...(activeRow
      ? [
          db
            .prepare(
              `UPDATE scoring_weight_versions SET status = 'ROLLED_BACK',
                rolled_back_at = ? WHERE id = ? AND status = 'ACTIVE'`,
            )
            .bind(now, activeRow.id),
        ]
      : []),
    db
      .prepare(
        `UPDATE scoring_weight_versions SET status = 'ACTIVE',
          previous_version_id = ?, activated_at = ?, rolled_back_at = NULL
         WHERE id = ? AND status = 'DRAFT'`,
      )
      .bind(activeRow?.id ?? candidate.previousVersionId, now, id),
  ];
  await db.batch(statements);
  return getWeightVersion(id);
}

export async function rollbackScoringWeightVersion(id: string, email: string) {
  const db = await database();
  const active = await getWeightVersion(id);
  if (active.status !== "ACTIVE" || !active.previousVersionId) {
    throw new ApiError(
      409,
      "SCORING_VERSION_NOT_ROLLBACKABLE",
      "The active version has no previous version to restore.",
    );
  }
  const previous = await getWeightVersion(active.previousVersionId);
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE scoring_weight_versions SET status = 'ROLLED_BACK',
          rolled_back_at = ? WHERE id = ? AND status = 'ACTIVE'`,
      )
      .bind(now, active.id),
    db
      .prepare(
        `UPDATE scoring_weight_versions SET status = 'ACTIVE',
          activated_at = ?, rolled_back_at = NULL
         WHERE id = ? AND status = 'ROLLED_BACK'`,
      )
      .bind(now, previous.id),
  ]);
  return {
    rolledBack: await getWeightVersion(id),
    restored: await getWeightVersion(previous.id),
    performedBy: email,
  };
}

export async function getActiveScoringConfiguration(
  marketplace: string,
  category: string,
) {
  const row = await (
    await database()
  )
    .prepare(`${WEIGHT_SELECT} WHERE status = 'ACTIVE' LIMIT 1`)
    .first<WeightRow>();
  if (!row) return null;
  const version = mapWeightVersion(row);
  return {
    modelVersion: version.version,
    factorWeights: version.weights.factorWeights,
    marketplaceWeights:
      (version.weights.marketplaceMultipliers[marketplace] as Record<
        string,
        number
      >) ?? {},
    categoryWeights:
      (version.weights.categoryMultipliers[category] as Record<
        string,
        number
      >) ?? {},
  };
}
