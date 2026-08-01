import { ApiError } from "@/lib/api/errors";
import type { BackgroundJobInput } from "./schema.ts";

interface QueueJobRow {
  id: string;
  queue_name: string;
  job_type: string;
  payload_json: string;
  status: string;
  attempt: number;
  max_attempts: number;
  next_attempt_at: string;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Queue storage is unavailable.",
    );
  }
  return env.DB;
}

export async function enqueueBackgroundJob(
  input: BackgroundJobInput,
  dbOverride?: D1Database,
) {
  const db = dbOverride ?? (await database());
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO background_queue_jobs (
        id, queue_name, job_type, payload_json, status, attempt, max_attempts,
        next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'QUEUED', 0, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.queueName,
      input.jobType,
      JSON.stringify(input.payload).slice(0, 20_000),
      input.maxAttempts,
      input.nextAttemptAt ?? now,
      now,
      now,
    )
    .run();
  return { id, status: "QUEUED", nextAttemptAt: input.nextAttemptAt ?? now };
}

async function executeQueueJob(db: D1Database, job: QueueJobRow) {
  if (job.job_type === "RATE_LIMIT_CLEANUP") {
    const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
    const metricsCutoff = new Date(
      Date.now() - 30 * 24 * 60 * 60_000,
    ).toISOString();
    const [buckets, metrics] = await db.batch([
      db
        .prepare(`DELETE FROM rate_limit_buckets WHERE expires_at < ?`)
        .bind(cutoff),
      db
        .prepare(`DELETE FROM operational_metrics WHERE recorded_at < ?`)
        .bind(metricsCutoff),
    ]);
    return {
      deletedBuckets: buckets.meta.changes ?? 0,
      deletedMetrics: metrics.meta.changes ?? 0,
    };
  }
  if (job.job_type === "EXPIRED_REPORT_CLEANUP") {
    const result = await db
      .prepare(
        `DELETE FROM generated_reports WHERE status = 'EXPIRED'
         AND expires_at < ?`,
      )
      .bind(new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString())
      .run();
    return { deleted: result.meta.changes ?? 0 };
  }
  if (job.job_type === "OPERATIONAL_METRIC_ROLLUP") {
    const now = new Date().toISOString();
    const metrics = await db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM products) AS products,
          (SELECT COUNT(*) FROM automation_jobs WHERE status = 'FAILING') AS failing_jobs,
          (SELECT COUNT(*) FROM product_sources WHERE consecutive_failures > 0) AS failing_sources`,
      )
      .first<{
        products: number;
        failing_jobs: number;
        failing_sources: number;
      }>();
    for (const [metricName, value] of Object.entries({
      "database.products": metrics?.products ?? 0,
      "automation.failing_jobs": metrics?.failing_jobs ?? 0,
      "marketplace.failing_sources": metrics?.failing_sources ?? 0,
    })) {
      await db
        .prepare(
          `INSERT INTO operational_metrics (
            id, metric_name, value, unit, dimensions_json, recorded_at
          ) VALUES (?, ?, ?, 'count', '{}', ?)`,
        )
        .bind(crypto.randomUUID(), metricName, value, now)
        .run();
    }
    return { recorded: 3 };
  }
  throw new Error("QUEUE_HANDLER_NOT_CONFIGURED");
}

export async function processDueBackgroundJobs(
  db: D1Database,
  now = new Date(),
) {
  const due = await db
    .prepare(
      `SELECT id, queue_name, job_type, payload_json, status, attempt,
        max_attempts, next_attempt_at
       FROM background_queue_jobs
       WHERE status IN ('QUEUED', 'RETRY') AND next_attempt_at <= ?
       ORDER BY next_attempt_at ASC LIMIT 25`,
    )
    .bind(now.toISOString())
    .all<QueueJobRow>();
  let succeeded = 0;
  let retrying = 0;
  let failed = 0;
  for (const job of due.results) {
    const lockedAt = new Date().toISOString();
    const lock = await db
      .prepare(
        `UPDATE background_queue_jobs SET status = 'RUNNING', locked_at = ?,
          attempt = attempt + 1, updated_at = ?
         WHERE id = ? AND status IN ('QUEUED', 'RETRY')`,
      )
      .bind(lockedAt, lockedAt, job.id)
      .run();
    if (!lock.meta.changes) continue;
    try {
      await executeQueueJob(db, job);
      const completedAt = new Date().toISOString();
      await db
        .prepare(
          `UPDATE background_queue_jobs SET status = 'SUCCEEDED',
            completed_at = ?, error_code = NULL, updated_at = ? WHERE id = ?`,
        )
        .bind(completedAt, completedAt, job.id)
        .run();
      succeeded += 1;
    } catch (error) {
      const nextAttempt = job.attempt + 1;
      const canRetry = nextAttempt < job.max_attempts;
      const retryAt = canRetry
        ? new Date(
            now.getTime() + 60_000 * 2 ** (nextAttempt - 1),
          ).toISOString()
        : job.next_attempt_at;
      await db
        .prepare(
          `UPDATE background_queue_jobs SET status = ?, next_attempt_at = ?,
            locked_at = NULL, error_code = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(
          canRetry ? "RETRY" : "FAILED",
          retryAt,
          error instanceof Error
            ? error.message.slice(0, 120)
            : "QUEUE_JOB_FAILED",
          new Date().toISOString(),
          job.id,
        )
        .run();
      if (canRetry) retrying += 1;
      else failed += 1;
    }
  }
  return { processed: due.results.length, succeeded, retrying, failed };
}

export async function seedMaintenanceQueue(db: D1Database, now = new Date()) {
  const hour = now.toISOString().slice(0, 13);
  const existing = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM background_queue_jobs
       WHERE queue_name = 'maintenance' AND created_at LIKE ?`,
    )
    .bind(`${hour}%`)
    .first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) return { enqueued: 0 };
  for (const jobType of [
    "RATE_LIMIT_CLEANUP",
    "EXPIRED_REPORT_CLEANUP",
    "OPERATIONAL_METRIC_ROLLUP",
  ] as const) {
    await enqueueBackgroundJob(
      {
        queueName: "maintenance",
        jobType,
        payload: {},
        maxAttempts: 3,
        nextAttemptAt: now.toISOString(),
      },
      db,
    );
  }
  return { enqueued: 3 };
}
