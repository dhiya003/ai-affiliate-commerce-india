import { ApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/products/repository";
import type { ContentVariationInput, ExperimentInput } from "./schema";
import { twoProportionConfidence } from "./statistics";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Experiment storage is unavailable.",
    );
  }
  return env.DB;
}

export async function createContentVariation(
  input: ContentVariationInput,
  email: string,
) {
  const db = await database();
  if (!(await getProduct(input.productId, email))) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  if (input.generatedContentId) {
    const content = await db
      .prepare(
        `SELECT id FROM generated_content
         WHERE id = ? AND product_id = ? AND created_by_email = ?`,
      )
      .bind(input.generatedContentId, input.productId, email)
      .first<{ id: string }>();
    if (!content) {
      throw new ApiError(
        404,
        "GENERATED_CONTENT_NOT_FOUND",
        "Generated content not found.",
      );
    }
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO content_variations (
          id, owner_email, product_id, generated_content_id, label, hook,
          caption, cta, hashtags_json, audience_angle, content_length, tone,
          platform, status, is_winner, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?, ?)`,
      )
      .bind(
        id,
        email,
        input.productId,
        input.generatedContentId ?? null,
        input.label,
        input.hook ?? null,
        input.caption ?? null,
        input.cta ?? null,
        JSON.stringify(input.hashtags),
        input.audienceAngle ?? null,
        input.contentLength ?? null,
        input.tone ?? null,
        input.platform,
        now,
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
        "DUPLICATE_VARIATION_LABEL",
        "This product already has a variation with that label.",
      );
    }
    throw error;
  }
  return {
    id,
    ...input,
    generatedContentId: input.generatedContentId ?? null,
    status: "ACTIVE",
    isWinner: false,
    createdAt: now,
  };
}

export async function listContentVariations(productId: string, email: string) {
  if (!(await getProduct(productId, email))) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT id, product_id, generated_content_id, label, hook, caption, cta,
        hashtags_json, audience_angle, content_length, tone, platform, status,
        is_winner, archived_at, created_at, updated_at
       FROM content_variations
       WHERE product_id = ? AND owner_email = ?
       ORDER BY created_at DESC`,
    )
    .bind(productId, email)
    .all<{
      id: string;
      product_id: string;
      generated_content_id: string | null;
      label: string;
      hook: string | null;
      caption: string | null;
      cta: string | null;
      hashtags_json: string;
      audience_angle: string | null;
      content_length: string | null;
      tone: string | null;
      platform: string;
      status: string;
      is_winner: number;
      archived_at: string | null;
      created_at: string;
      updated_at: string;
    }>();
  return rows.results.map((row) => ({
    id: row.id,
    productId: row.product_id,
    generatedContentId: row.generated_content_id,
    label: row.label,
    hook: row.hook,
    caption: row.caption,
    cta: row.cta,
    hashtags: JSON.parse(row.hashtags_json) as string[],
    audienceAngle: row.audience_angle,
    contentLength: row.content_length,
    tone: row.tone,
    platform: row.platform,
    status: row.status,
    isWinner: Boolean(row.is_winner),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createExperiment(input: ExperimentInput, email: string) {
  const db = await database();
  if (!(await getProduct(input.productId, email))) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  if (input.campaignId) {
    const campaign = await db
      .prepare(
        "SELECT id FROM campaigns WHERE id = ? AND owner_email = ? AND archived_at IS NULL",
      )
      .bind(input.campaignId, email)
      .first<{ id: string }>();
    if (!campaign) {
      throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
    }
  }
  const placeholders = input.variations.map(() => "?").join(", ");
  const variations = await db
    .prepare(
      `SELECT id FROM content_variations
       WHERE owner_email = ? AND product_id = ? AND archived_at IS NULL
         AND id IN (${placeholders})`,
    )
    .bind(
      email,
      input.productId,
      ...input.variations.map(({ variationId }) => variationId),
    )
    .all<{ id: string }>();
  if (variations.results.length !== input.variations.length) {
    throw new ApiError(
      404,
      "EXPERIMENT_VARIATION_NOT_FOUND",
      "Every experiment variation must belong to this product and user.",
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO content_experiments (
          id, owner_email, product_id, campaign_id, name, hypothesis,
          primary_metric, status, confidence_threshold, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`,
      )
      .bind(
        id,
        email,
        input.productId,
        input.campaignId ?? null,
        input.name,
        input.hypothesis,
        input.primaryMetric,
        input.confidenceThreshold,
        now,
        now,
      ),
    ...input.variations.map((variation) =>
      db
        .prepare(
          `INSERT INTO experiment_variations (
            experiment_id, variation_id, allocation_percent, created_at
          ) VALUES (?, ?, ?, ?)`,
        )
        .bind(id, variation.variationId, variation.allocationPercent, now),
    ),
  ]);
  return getExperiment(id, email);
}

export async function listExperiments(email: string) {
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT id FROM content_experiments
       WHERE owner_email = ? ORDER BY updated_at DESC LIMIT 100`,
    )
    .bind(email)
    .all<{ id: string }>();
  return Promise.all(rows.results.map(({ id }) => getExperiment(id, email)));
}

async function getExperiment(id: string, email: string) {
  const db = await database();
  const experiment = await db
    .prepare(
      `SELECT id, product_id, campaign_id, name, hypothesis, primary_metric,
        status, confidence_threshold, winner_variation_id, started_at,
        ended_at, created_at, updated_at
       FROM content_experiments WHERE id = ? AND owner_email = ?`,
    )
    .bind(id, email)
    .first<{
      id: string;
      product_id: string;
      campaign_id: string | null;
      name: string;
      hypothesis: string;
      primary_metric: string;
      status: string;
      confidence_threshold: number;
      winner_variation_id: string | null;
      started_at: string | null;
      ended_at: string | null;
      created_at: string;
      updated_at: string;
    }>();
  if (!experiment) {
    throw new ApiError(404, "EXPERIMENT_NOT_FOUND", "Experiment not found.");
  }
  const variations = await db
    .prepare(
      `SELECT ev.variation_id, ev.allocation_percent, cv.label, cv.platform,
        cv.status, cv.is_winner
       FROM experiment_variations ev
       JOIN content_variations cv ON cv.id = ev.variation_id
       WHERE ev.experiment_id = ? ORDER BY cv.label`,
    )
    .bind(id)
    .all<{
      variation_id: string;
      allocation_percent: number;
      label: string;
      platform: string;
      status: string;
      is_winner: number;
    }>();
  const latestResults = await db
    .prepare(
      `SELECT er.variation_id, er.sample_size, er.clicks, er.conversions,
        er.commission, er.conversion_rate, er.earnings_per_click,
        er.confidence, er.calculated_at
       FROM experiment_results er
       JOIN (
         SELECT variation_id, MAX(calculated_at) AS calculated_at
         FROM experiment_results WHERE experiment_id = ?
         GROUP BY variation_id
       ) latest ON latest.variation_id = er.variation_id
         AND latest.calculated_at = er.calculated_at
       WHERE er.experiment_id = ?`,
    )
    .bind(id, id)
    .all<{
      variation_id: string;
      sample_size: number;
      clicks: number;
      conversions: number;
      commission: number;
      conversion_rate: number;
      earnings_per_click: number;
      confidence: number;
      calculated_at: string;
    }>();
  const resultByVariation = new Map(
    latestResults.results.map((result) => [result.variation_id, result]),
  );
  return {
    id: experiment.id,
    productId: experiment.product_id,
    campaignId: experiment.campaign_id,
    name: experiment.name,
    hypothesis: experiment.hypothesis,
    primaryMetric: experiment.primary_metric,
    status: experiment.status,
    confidenceThreshold: experiment.confidence_threshold,
    winnerVariationId: experiment.winner_variation_id,
    startedAt: experiment.started_at,
    endedAt: experiment.ended_at,
    createdAt: experiment.created_at,
    updatedAt: experiment.updated_at,
    variations: variations.results.map((variation) => {
      const result = resultByVariation.get(variation.variation_id);
      return {
        id: variation.variation_id,
        label: variation.label,
        platform: variation.platform,
        status: variation.status,
        isWinner: Boolean(variation.is_winner),
        allocationPercent: variation.allocation_percent,
        result: result
          ? {
              sampleSize: result.sample_size,
              clicks: result.clicks,
              conversions: result.conversions,
              commission: result.commission,
              conversionRate: result.conversion_rate,
              earningsPerClick: result.earnings_per_click,
              confidence: result.confidence,
              calculatedAt: result.calculated_at,
              confidenceMethod: "two-proportion normal approximation",
            }
          : null,
      };
    }),
  };
}

export async function startExperiment(id: string, email: string) {
  const db = await database();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE content_experiments SET status = 'RUNNING', started_at = ?,
        ended_at = NULL, updated_at = ?
       WHERE id = ? AND owner_email = ? AND status = 'DRAFT'`,
    )
    .bind(now, now, id, email)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(
      409,
      "EXPERIMENT_NOT_STARTABLE",
      "Only a draft experiment can be started.",
    );
  }
  return getExperiment(id, email);
}

interface VariationMetrics {
  variationId: string;
  clicks: number;
  conversions: number;
  commission: number;
}

export async function calculateExperimentResults(id: string, email: string) {
  const db = await database();
  const experiment = await getExperiment(id, email);
  if (experiment.status !== "RUNNING" && experiment.status !== "COMPLETED") {
    throw new ApiError(
      409,
      "EXPERIMENT_NOT_RUNNING",
      "Start the experiment before calculating results.",
    );
  }
  const metrics = await Promise.all(
    experiment.variations.map(async (variation): Promise<VariationMetrics> => {
      const [clicks, conversions, commission] = await Promise.all([
        db
          .prepare(
            `SELECT COUNT(*) AS count FROM click_events ce
             JOIN tracked_links tl ON tl.id = ce.tracked_link_id
             WHERE tl.owner_email = ? AND tl.content_variation_id = ?
               AND ce.is_bot = 0 AND ce.is_duplicate = 0
               AND ce.clicked_at >= ?`,
          )
          .bind(email, variation.id, experiment.startedAt)
          .first<{ count: number }>(),
        db
          .prepare(
            `SELECT COUNT(*) AS count FROM conversion_events cv
             JOIN tracked_links tl ON tl.id = cv.tracked_link_id
             WHERE cv.owner_email = ? AND tl.content_variation_id = ?
               AND cv.order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
               AND cv.converted_at >= ?`,
          )
          .bind(email, variation.id, experiment.startedAt)
          .first<{ count: number }>(),
        db
          .prepare(
            `SELECT COALESCE(SUM(cm.amount), 0) AS amount
             FROM commission_events cm
             JOIN conversion_events cv ON cv.id = cm.conversion_event_id
             JOIN tracked_links tl ON tl.id = cv.tracked_link_id
             WHERE cm.owner_email = ? AND tl.content_variation_id = ?
               AND cm.status IN ('APPROVED', 'PAID')
               AND cm.observed_at >= ?`,
          )
          .bind(email, variation.id, experiment.startedAt)
          .first<{ amount: number }>(),
      ]);
      return {
        variationId: variation.id,
        clicks: clicks?.count ?? 0,
        conversions: conversions?.count ?? 0,
        commission: commission?.amount ?? 0,
      };
    }),
  );
  const benchmark = [...metrics].sort((left, right) => {
    const leftRate = left.clicks ? left.conversions / left.clicks : 0;
    const rightRate = right.clicks ? right.conversions / right.clicks : 0;
    return rightRate - leftRate;
  })[0]!;
  const calculatedAt = new Date().toISOString();
  await db.batch(
    metrics.map((metric) => {
      const conversionRate = metric.clicks
        ? (metric.conversions / metric.clicks) * 100
        : 0;
      const earningsPerClick = metric.clicks
        ? metric.commission / metric.clicks
        : 0;
      const confidence =
        metric.variationId === benchmark.variationId
          ? Math.max(
              ...metrics
                .filter((other) => other.variationId !== metric.variationId)
                .map((other) =>
                  twoProportionConfidence(
                    metric.conversions,
                    metric.clicks,
                    other.conversions,
                    other.clicks,
                  ),
                ),
              0,
            )
          : twoProportionConfidence(
              benchmark.conversions,
              benchmark.clicks,
              metric.conversions,
              metric.clicks,
            );
      return db
        .prepare(
          `INSERT INTO experiment_results (
            id, experiment_id, variation_id, sample_size, clicks, conversions,
            commission, conversion_rate, earnings_per_click, confidence,
            calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          metric.variationId,
          metric.clicks,
          metric.clicks,
          metric.conversions,
          metric.commission,
          conversionRate,
          earningsPerClick,
          confidence,
          calculatedAt,
        );
    }),
  );
  return getExperiment(id, email);
}

export async function selectExperimentWinner(
  id: string,
  variationId: string,
  email: string,
) {
  const db = await database();
  const experiment = await getExperiment(id, email);
  const winner = experiment.variations.find(
    (variation) => variation.id === variationId,
  );
  if (!winner?.result) {
    throw new ApiError(
      409,
      "EXPERIMENT_RESULT_REQUIRED",
      "Calculate experiment results before selecting a winner.",
    );
  }
  if (winner.result.confidence < experiment.confidenceThreshold) {
    throw new ApiError(
      409,
      "EXPERIMENT_CONFIDENCE_TOO_LOW",
      "The selected variation has not reached the experiment confidence threshold.",
    );
  }
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE content_experiments SET status = 'COMPLETED',
          winner_variation_id = ?, ended_at = ?, updated_at = ?
         WHERE id = ? AND owner_email = ?`,
      )
      .bind(variationId, now, now, id, email),
    db
      .prepare(
        `UPDATE content_variations SET status = 'WINNER', is_winner = 1,
          updated_at = ? WHERE id = ? AND owner_email = ?`,
      )
      .bind(now, variationId, email),
    db
      .prepare(
        `UPDATE content_variations SET status = 'LOSER', is_winner = 0,
          updated_at = ?
         WHERE owner_email = ? AND id IN (
           SELECT variation_id FROM experiment_variations
           WHERE experiment_id = ? AND variation_id != ?
         )`,
      )
      .bind(now, email, id, variationId),
  ]);
  return getExperiment(id, email);
}

export async function archiveExperiment(id: string, email: string) {
  const db = await database();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE content_experiments SET status = 'ARCHIVED', ended_at = ?,
        updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(now, now, id, email)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(404, "EXPERIMENT_NOT_FOUND", "Experiment not found.");
  }
  return getExperiment(id, email);
}
