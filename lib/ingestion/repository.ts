import { ApiError } from "@/lib/api/errors";
import { calculateOpportunityScore } from "@/lib/scoring";
import { assessSourceHealth } from "./health.ts";
import {
  canonicalProductKey,
  isSourceRecordStale,
  matchStatusForConfidence,
  retryDelayMinutes,
} from "./normalizer.ts";
import type {
  IngestionSummary,
  MarketplaceName,
  NormalizedProduct,
  RunStatus,
  SourceHealth,
} from "./types.ts";

interface SourceRow {
  id: string;
  marketplace: MarketplaceName;
  name: string;
  source_type: "MANUAL" | "API" | "FEED";
  status: SourceHealth["status"];
  freshness_window_minutes: number;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  consecutive_failures: number;
  rate_limited_until: string | null;
}

interface RunRow {
  id: string;
  status: RunStatus;
  started_at: string;
  completed_at: string | null;
  attempted_count: number;
  imported_count: number;
  updated_count: number;
  matched_count: number;
  duplicate_count: number;
  failed_count: number;
  retry_count: number;
  next_retry_at: string | null;
}

interface Counters {
  attemptedCount: number;
  importedCount: number;
  updatedCount: number;
  matchedCount: number;
  duplicateCount: number;
  failedCount: number;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Ingestion storage is unavailable.",
    );
  }
  return env.DB;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function scoreProduct(id: string, product: NormalizedProduct) {
  return calculateOpportunityScore({
    productId: id,
    rating: product.rating,
    reviewCount: product.reviewCount,
    currentPrice: product.currentPrice,
    originalPrice: product.originalPrice,
    commissionRate: product.commissionRate,
    sellerRating: product.sellerRating,
    returnRisk: product.returnRisk,
  });
}

async function getSource(db: D1Database, sourceId: string): Promise<SourceRow> {
  const source = await db
    .prepare(
      `SELECT id, marketplace, name, source_type, status,
        freshness_window_minutes, last_attempt_at, last_success_at,
        last_error_at, consecutive_failures, rate_limited_until
       FROM product_sources WHERE id = ?`,
    )
    .bind(sourceId)
    .first<SourceRow>();

  if (!source) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "Product source not found.");
  }
  if (source.status === "DISABLED") {
    throw new ApiError(409, "SOURCE_DISABLED", "This source is disabled.");
  }
  if (
    source.rate_limited_until &&
    new Date(source.rate_limited_until).getTime() > Date.now()
  ) {
    throw new ApiError(
      429,
      "SOURCE_RATE_LIMITED",
      `Source is rate limited until ${source.rate_limited_until}.`,
    );
  }
  return source;
}

async function ingestOne(
  db: D1Database,
  source: SourceRow,
  runId: string,
  product: NormalizedProduct,
  rawPayload: unknown,
  email: string,
): Promise<"imported" | "updated" | "duplicate"> {
  const receivedAt = new Date().toISOString();
  const payloadJson = stableJson(rawPayload);
  const payloadHash = await sha256(payloadJson);
  const duplicate = await db
    .prepare(
      "SELECT id FROM raw_source_data WHERE source_id = ? AND external_id = ? AND payload_hash = ?",
    )
    .bind(source.id, product.marketplaceProductId, payloadHash)
    .first<{ id: string }>();
  if (duplicate) return "duplicate";

  const canonicalKey = canonicalProductKey(product);
  const canonicalId = `canonical-${(await sha256(canonicalKey)).slice(0, 32)}`;
  const matchStatus = matchStatusForConfidence(product.confidence);
  const stale = isSourceRecordStale(
    product.sourceTimestamp,
    source.freshness_window_minutes,
  );
  const existing = await db
    .prepare(
      "SELECT id FROM products WHERE marketplace = ? AND marketplace_product_id = ?",
    )
    .bind(product.marketplace, product.marketplaceProductId)
    .first<{ id: string }>();
  const productId = existing?.id ?? crypto.randomUUID();
  const score = scoreProduct(productId, product);

  const statements = [
    db
      .prepare(
        `INSERT INTO canonical_product_groups (
          id, canonical_key, normalized_name, brand, category, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(canonical_key) DO UPDATE SET
          normalized_name = excluded.normalized_name,
          brand = excluded.brand,
          category = excluded.category,
          updated_at = excluded.updated_at`,
      )
      .bind(
        canonicalId,
        canonicalKey,
        product.name.toLowerCase(),
        product.brand,
        product.category,
        receivedAt,
        receivedAt,
      ),
  ];

  if (existing) {
    statements.push(
      db
        .prepare(
          `UPDATE products SET owner_email = ?, name = ?, description = ?,
            product_url = ?, affiliate_url = ?, image_url = ?, category = ?,
            seller_name = ?, current_price = ?, original_price = ?, rating = ?,
            review_count = ?, commission_rate = ?, seller_rating = ?,
            stock_status = ?, return_risk = ?, opportunity_score = ?,
            score_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          email,
          product.name,
          product.description,
          product.productUrl,
          product.affiliateUrl,
          product.imageUrl,
          product.category,
          product.sellerName,
          product.currentPrice,
          product.originalPrice,
          product.rating,
          product.reviewCount,
          product.commissionRate,
          product.sellerRating,
          product.stockStatus,
          product.returnRisk,
          score.opportunityScore,
          JSON.stringify(score),
          receivedAt,
          productId,
        ),
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO products (
            id, owner_email, marketplace, marketplace_product_id, name,
            description, product_url, affiliate_url, image_url, category,
            seller_name, current_price, original_price, rating, review_count,
            commission_rate, seller_rating, stock_status, return_risk, status,
            notes, tags_json, opportunity_score, score_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          productId,
          email,
          product.marketplace,
          product.marketplaceProductId,
          product.name,
          product.description,
          product.productUrl,
          product.affiliateUrl,
          product.imageUrl,
          product.category,
          product.sellerName,
          product.currentPrice,
          product.originalPrice,
          product.rating,
          product.reviewCount,
          product.commissionRate,
          product.sellerRating,
          product.stockStatus,
          product.returnRisk,
          "Imported by Phase 2 source ingestion.",
          JSON.stringify(["source-ingestion", source.id]),
          score.opportunityScore,
          JSON.stringify(score),
          receivedAt,
          receivedAt,
        ),
    );
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO product_source_matches (
          id, source_id, canonical_group_id, product_id, external_id,
          confidence, status, matched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id, external_id) DO UPDATE SET
          canonical_group_id = excluded.canonical_group_id,
          product_id = excluded.product_id,
          confidence = excluded.confidence,
          status = excluded.status,
          matched_at = excluded.matched_at`,
      )
      .bind(
        crypto.randomUUID(),
        source.id,
        canonicalId,
        productId,
        product.marketplaceProductId,
        product.confidence,
        matchStatus,
        receivedAt,
      ),
    db
      .prepare(
        `INSERT INTO raw_source_data (
          id, source_id, run_id, canonical_group_id, product_id, external_id,
          payload_json, payload_hash, normalized_product_json, source_timestamp,
          received_at, confidence, match_status, availability_status, is_stale
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        source.id,
        runId,
        canonicalId,
        productId,
        product.marketplaceProductId,
        payloadJson,
        payloadHash,
        JSON.stringify(product),
        product.sourceTimestamp,
        receivedAt,
        product.confidence,
        matchStatus,
        product.availabilityStatus,
        stale ? 1 : 0,
      ),
  );
  await db.batch(statements);
  return existing ? "updated" : "imported";
}

export async function executeIngestionRun(options: {
  sourceId: string;
  marketplace: MarketplaceName;
  products: readonly NormalizedProduct[];
  rawRecords: readonly unknown[];
  email: string;
  triggerType?: "MANUAL" | "SCHEDULED" | "RETRY";
  parentRunId?: string | null;
  retryCount?: number;
}): Promise<IngestionSummary> {
  const db = await database();
  const source = await getSource(db, options.sourceId);
  if (source.marketplace !== options.marketplace) {
    throw new ApiError(
      409,
      "SOURCE_MARKETPLACE_MISMATCH",
      "Source and payload marketplaces do not match.",
    );
  }
  if (source.source_type !== "MANUAL" && options.triggerType === "MANUAL") {
    throw new ApiError(
      409,
      "SOURCE_TYPE_MISMATCH",
      "Manual payloads require a manual source.",
    );
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const retryCount = options.retryCount ?? 0;
  const counters: Counters = {
    attemptedCount: options.products.length,
    importedCount: 0,
    updatedCount: 0,
    matchedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
  };
  await db.batch([
    db
      .prepare(
        `INSERT INTO ingestion_runs (
          id, source_id, parent_run_id, trigger_type, status,
          initiated_by_email, started_at, attempted_count, retry_count
        ) VALUES (?, ?, ?, ?, 'RUNNING', ?, ?, ?, ?)`,
      )
      .bind(
        runId,
        source.id,
        options.parentRunId ?? null,
        options.triggerType ?? "MANUAL",
        options.email,
        startedAt,
        counters.attemptedCount,
        retryCount,
      ),
    db
      .prepare(
        "UPDATE product_sources SET status = 'RUNNING', last_attempt_at = ?, updated_at = ? WHERE id = ?",
      )
      .bind(startedAt, startedAt, source.id),
  ]);

  for (const [index, product] of options.products.entries()) {
    try {
      const outcome = await ingestOne(
        db,
        source,
        runId,
        product,
        options.rawRecords[index],
        options.email,
      );
      if (outcome === "duplicate") counters.duplicateCount += 1;
      if (outcome === "imported") counters.importedCount += 1;
      if (outcome === "updated") counters.updatedCount += 1;
      if (outcome !== "duplicate") counters.matchedCount += 1;
    } catch (error) {
      counters.failedCount += 1;
      const failedAt = new Date().toISOString();
      const payloadJson = stableJson(options.rawRecords[index]);
      const payloadHash = await sha256(payloadJson);
      await db.batch([
        db
          .prepare(
            `INSERT OR IGNORE INTO raw_source_data (
              id, source_id, run_id, canonical_group_id, product_id, external_id,
              payload_json, payload_hash, normalized_product_json,
              source_timestamp, received_at, confidence, match_status,
              availability_status, is_stale
            ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, 'REVIEW', ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            source.id,
            runId,
            product.marketplaceProductId,
            payloadJson,
            payloadHash,
            JSON.stringify(product),
            product.sourceTimestamp,
            failedAt,
            product.confidence,
            product.availabilityStatus,
            isSourceRecordStale(
              product.sourceTimestamp,
              source.freshness_window_minutes,
            )
              ? 1
              : 0,
          ),
        db
          .prepare(
            `INSERT INTO ingestion_errors (
            id, run_id, source_id, external_id, code, message, retryable,
            attempt, occurred_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            runId,
            source.id,
            product.marketplaceProductId,
            "RECORD_PROCESSING_FAILED",
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "Unknown error",
            1,
            retryCount + 1,
            failedAt,
          ),
      ]);
    }
  }

  const completedAt = new Date().toISOString();
  const status: RunStatus =
    counters.failedCount === 0
      ? "SUCCEEDED"
      : counters.failedCount < counters.attemptedCount
        ? "PARTIAL"
        : retryCount < 3
          ? "RETRY_SCHEDULED"
          : "FAILED";
  const nextRetryAt =
    status === "RETRY_SCHEDULED"
      ? new Date(
          Date.now() + retryDelayMinutes(retryCount + 1) * 60_000,
        ).toISOString()
      : null;
  const sourceStatus = status === "SUCCEEDED" ? "READY" : "DEGRADED";

  await db.batch([
    db
      .prepare(
        `UPDATE ingestion_runs SET status = ?, completed_at = ?,
          imported_count = ?, updated_count = ?, matched_count = ?,
          duplicate_count = ?, failed_count = ?, next_retry_at = ?,
          error_summary = ? WHERE id = ?`,
      )
      .bind(
        status,
        completedAt,
        counters.importedCount,
        counters.updatedCount,
        counters.matchedCount,
        counters.duplicateCount,
        counters.failedCount,
        nextRetryAt,
        counters.failedCount
          ? `${counters.failedCount} record(s) failed processing.`
          : null,
        runId,
      ),
    db
      .prepare(
        `UPDATE product_sources SET status = ?, last_success_at = ?,
          last_error_at = ?, consecutive_failures = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        sourceStatus,
        status === "SUCCEEDED" ? completedAt : source.last_success_at,
        counters.failedCount ? completedAt : source.last_error_at,
        counters.failedCount ? source.consecutive_failures + 1 : 0,
        completedAt,
        source.id,
      ),
  ]);

  return {
    runId,
    status,
    ...counters,
    retryCount,
    nextRetryAt,
  };
}

export async function retryIngestionRun(
  parentRunId: string,
  email: string,
): Promise<IngestionSummary> {
  const db = await database();
  const parent = await db
    .prepare(
      `SELECT r.id, r.source_id, r.retry_count, s.marketplace
       FROM ingestion_runs r
       JOIN product_sources s ON s.id = r.source_id
       WHERE r.id = ? AND r.status IN ('FAILED', 'PARTIAL', 'RETRY_SCHEDULED')`,
    )
    .bind(parentRunId)
    .first<{
      id: string;
      source_id: string;
      retry_count: number;
      marketplace: MarketplaceName;
    }>();
  if (!parent) {
    throw new ApiError(
      409,
      "RUN_NOT_RETRYABLE",
      "The requested run is not eligible for recovery.",
    );
  }
  if (parent.retry_count >= 3) {
    throw new ApiError(
      409,
      "RETRY_LIMIT_REACHED",
      "The maximum of three recovery attempts has been reached.",
    );
  }
  const payloads = await db
    .prepare(
      `SELECT r.payload_json, r.normalized_product_json
       FROM raw_source_data r
       JOIN ingestion_errors e
         ON e.run_id = r.run_id AND e.external_id = r.external_id
       WHERE r.run_id = ? AND e.retryable = 1 AND e.resolved_at IS NULL
       ORDER BY r.received_at`,
    )
    .bind(parentRunId)
    .all<{ payload_json: string; normalized_product_json: string }>();
  if (!payloads.results.length) {
    throw new ApiError(
      409,
      "NO_RETRYABLE_RECORDS",
      "This run has no unresolved retryable records.",
    );
  }

  const result = await executeIngestionRun({
    sourceId: parent.source_id,
    marketplace: parent.marketplace,
    products: payloads.results.map(
      ({ normalized_product_json }) =>
        JSON.parse(normalized_product_json) as NormalizedProduct,
    ),
    rawRecords: payloads.results.map(({ payload_json }) =>
      JSON.parse(payload_json),
    ),
    email,
    triggerType: "RETRY",
    parentRunId,
    retryCount: parent.retry_count + 1,
  });
  if (result.status === "SUCCEEDED") {
    await db
      .prepare(
        "UPDATE ingestion_errors SET resolved_at = ? WHERE run_id = ? AND resolved_at IS NULL",
      )
      .bind(new Date().toISOString(), parentRunId)
      .run();
  }
  return result;
}

export async function listSourceHealth(): Promise<SourceHealth[]> {
  const db = await database();
  const sources = await db
    .prepare(
      `SELECT id, marketplace, name, source_type, status,
        freshness_window_minutes, last_attempt_at, last_success_at,
        last_error_at, consecutive_failures, rate_limited_until
       FROM product_sources ORDER BY marketplace, name`,
    )
    .all<SourceRow>();
  const now = new Date();

  return Promise.all(
    sources.results.map(async (source) => {
      const latest = await db
        .prepare(
          `SELECT id, status, started_at, completed_at, attempted_count,
            imported_count, updated_count, matched_count, duplicate_count,
            failed_count, retry_count, next_retry_at
           FROM ingestion_runs WHERE source_id = ?
           ORDER BY started_at DESC LIMIT 1`,
        )
        .bind(source.id)
        .first<RunRow>();
      const assessment = assessSourceHealth(
        {
          status: source.status,
          freshnessWindowMinutes: source.freshness_window_minutes,
          lastSuccessAt: source.last_success_at,
          consecutiveFailures: source.consecutive_failures,
          rateLimitedUntil: source.rate_limited_until,
        },
        now,
      );

      return {
        id: source.id,
        marketplace: source.marketplace,
        name: source.name,
        sourceType: source.source_type,
        status: source.status,
        freshnessWindowMinutes: source.freshness_window_minutes,
        lastAttemptAt: source.last_attempt_at,
        lastSuccessAt: source.last_success_at,
        lastErrorAt: source.last_error_at,
        consecutiveFailures: source.consecutive_failures,
        rateLimitedUntil: source.rate_limited_until,
        health: assessment.health,
        freshness: assessment.freshness,
        alerts: assessment.alerts,
        latestRun: latest
          ? {
              id: latest.id,
              status: latest.status,
              startedAt: latest.started_at,
              completedAt: latest.completed_at,
              importedCount: latest.imported_count,
              updatedCount: latest.updated_count,
              duplicateCount: latest.duplicate_count,
              failedCount: latest.failed_count,
            }
          : null,
      };
    }),
  );
}

export async function getIngestionStatistics() {
  const db = await database();
  const [runs, payloads, groups, failures] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) AS count FROM ingestion_runs")
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) AS count FROM raw_source_data")
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) AS count FROM canonical_product_groups")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM ingestion_errors WHERE resolved_at IS NULL",
      )
      .first<{ count: number }>(),
  ]);
  return {
    runs: runs?.count ?? 0,
    rawPayloads: payloads?.count ?? 0,
    canonicalGroups: groups?.count ?? 0,
    unresolvedErrors: failures?.count ?? 0,
  };
}
