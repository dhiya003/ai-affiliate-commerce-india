import { ApiError } from "@/lib/api/errors";
import {
  calculateRecommendationQualitySnapshot,
  listScoringWeightVersions,
} from "@/lib/optimization/repository";
import { refreshLearningProfiles } from "@/lib/learning/repository";
import { nextCronOccurrence } from "./cron.ts";
import type { AutomationJobUpdate } from "./schema";
import type { AutomationJob, AutomationRun } from "./types";

async function boundDatabase(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Automation storage is unavailable.",
    );
  }
  return env.DB;
}

interface JobRow {
  id: string;
  job_key: string;
  job_type: string;
  name: string;
  description: string;
  cron_expression: string;
  timezone: string;
  enabled: number;
  status: string;
  timeout_seconds: number;
  max_attempts: number;
  retry_base_seconds: number;
  depends_on_job_key: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  updated_at: string;
}

interface RunRow {
  id: string;
  job_id: string;
  parent_run_id: string | null;
  trigger_type: string;
  status: string;
  attempt: number;
  scheduled_for: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  timeout_at: string | null;
  initiated_by_email: string | null;
  processed_count: number;
  succeeded_count: number;
  failed_count: number;
  metrics_json: string;
  error_code: string | null;
  error_summary: string | null;
  next_retry_at: string | null;
}

const JOB_SELECT = `SELECT id, job_key, job_type, name, description,
  cron_expression, timezone, enabled, status, timeout_seconds, max_attempts,
  retry_base_seconds, depends_on_job_key, next_run_at, last_run_at,
  last_success_at, last_failure_at, consecutive_failures, updated_at
  FROM automation_jobs`;

const RUN_SELECT = `SELECT id, job_id, parent_run_id, trigger_type, status,
  attempt, scheduled_for, queued_at, started_at, completed_at, timeout_at,
  initiated_by_email, processed_count, succeeded_count, failed_count,
  metrics_json, error_code, error_summary, next_retry_at
  FROM automation_runs`;

function mapRun(row: RunRow): AutomationRun {
  return {
    id: row.id,
    jobId: row.job_id,
    parentRunId: row.parent_run_id,
    triggerType: row.trigger_type,
    status: row.status,
    attempt: row.attempt,
    scheduledFor: row.scheduled_for,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    timeoutAt: row.timeout_at,
    initiatedByEmail: row.initiated_by_email,
    processedCount: row.processed_count,
    succeededCount: row.succeeded_count,
    failedCount: row.failed_count,
    metrics: JSON.parse(row.metrics_json) as Record<string, unknown>,
    errorCode: row.error_code,
    errorSummary: row.error_summary,
    nextRetryAt: row.next_retry_at,
  };
}

async function mapJob(db: D1Database, row: JobRow): Promise<AutomationJob> {
  const latest = await db
    .prepare(`${RUN_SELECT} WHERE job_id = ? ORDER BY queued_at DESC LIMIT 1`)
    .bind(row.id)
    .first<RunRow>();
  return {
    id: row.id,
    jobKey: row.job_key,
    jobType: row.job_type,
    name: row.name,
    description: row.description,
    cronExpression: row.cron_expression,
    timezone: row.timezone,
    enabled: Boolean(row.enabled),
    status: row.status,
    timeoutSeconds: row.timeout_seconds,
    maxAttempts: row.max_attempts,
    retryBaseSeconds: row.retry_base_seconds,
    dependsOnJobKey: row.depends_on_job_key,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    consecutiveFailures: row.consecutive_failures,
    updatedAt: row.updated_at,
    latestRun: latest ? mapRun(latest) : null,
  };
}

export async function listAutomationJobs(dbOverride?: D1Database) {
  const db = dbOverride ?? (await boundDatabase());
  const rows = await db
    .prepare(`${JOB_SELECT} ORDER BY name ASC`)
    .all<JobRow>();
  return Promise.all(rows.results.map((row) => mapJob(db, row)));
}

async function getJob(db: D1Database, id: string) {
  const row = await db
    .prepare(`${JOB_SELECT} WHERE id = ?`)
    .bind(id)
    .first<JobRow>();
  if (!row) {
    throw new ApiError(
      404,
      "AUTOMATION_JOB_NOT_FOUND",
      "Automation job not found.",
    );
  }
  return row;
}

export async function updateAutomationJob(
  id: string,
  input: AutomationJobUpdate,
) {
  const db = await boundDatabase();
  const existing = await getJob(db, id);
  const cronExpression = input.cronExpression ?? existing.cron_expression;
  const enabled = input.enabled ?? Boolean(existing.enabled);
  const nextRunAt = enabled
    ? nextCronOccurrence(cronExpression).toISOString()
    : null;
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE automation_jobs SET enabled = ?, status = ?,
        cron_expression = ?, timeout_seconds = ?, max_attempts = ?,
        retry_base_seconds = ?, next_run_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      enabled ? 1 : 0,
      enabled ? "HEALTHY" : "PAUSED",
      cronExpression,
      input.timeoutSeconds ?? existing.timeout_seconds,
      input.maxAttempts ?? existing.max_attempts,
      input.retryBaseSeconds ?? existing.retry_base_seconds,
      nextRunAt,
      now,
      id,
    )
    .run();
  return mapJob(db, await getJob(db, id));
}

async function addLog(
  db: D1Database,
  runId: string,
  level: "INFO" | "WARN" | "ERROR",
  event: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  await db
    .prepare(
      `INSERT INTO automation_run_logs (
        id, run_id, level, event, message, metadata_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      runId,
      level,
      event,
      message.slice(0, 500),
      JSON.stringify(metadata).slice(0, 5000),
      new Date().toISOString(),
    )
    .run();
}

interface HandlerResult {
  status: "SUCCEEDED" | "SKIPPED";
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  metrics: Record<string, unknown>;
  message: string;
}

async function executeJobHandler(
  db: D1Database,
  job: JobRow,
): Promise<HandlerResult> {
  if (job.job_type === "TOP_10_GENERATION") {
    const rows = await db
      .prepare(
        `SELECT id, name, marketplace, opportunity_score
         FROM products WHERE opportunity_score IS NOT NULL
         ORDER BY opportunity_score DESC, updated_at DESC LIMIT 10`,
      )
      .all<{
        id: string;
        name: string;
        marketplace: string;
        opportunity_score: number;
      }>();
    return {
      status: "SUCCEEDED",
      processedCount: rows.results.length,
      succeededCount: rows.results.length,
      failedCount: 0,
      metrics: {
        productIds: rows.results.map(({ id }) => id),
        topScore: rows.results[0]?.opportunity_score ?? null,
      },
      message: `Captured ${rows.results.length} ranked opportunities.`,
    };
  }
  if (job.job_type === "SCORE_RETRAINING") {
    const owners = await db
      .prepare(
        `SELECT DISTINCT owner_email FROM recommendation_feedback
         WHERE owner_email IS NOT NULL ORDER BY owner_email LIMIT 100`,
      )
      .all<{ owner_email: string }>();
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60_000);
    const versions = await listScoringWeightVersions();
    const active = versions.find(({ status }) => status === "ACTIVE");
    let refreshedProfiles = 0;
    let snapshots = 0;
    for (const owner of owners.results) {
      const profiles = await refreshLearningProfiles(owner.owner_email, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      refreshedProfiles += profiles.length;
      if (active) {
        await calculateRecommendationQualitySnapshot(
          {
            modelVersion: active.version,
            from: from.toISOString(),
            to: to.toISOString(),
          },
          owner.owner_email,
        );
        snapshots += 1;
      }
    }
    return {
      status: "SUCCEEDED",
      processedCount: owners.results.length,
      succeededCount: owners.results.length,
      failedCount: 0,
      metrics: { owners: owners.results.length, refreshedProfiles, snapshots },
      message:
        "Refreshed learning and quality evidence; no scoring version was activated.",
    };
  }
  return {
    status: "SKIPPED",
    processedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    metrics: { reason: "HANDLER_NOT_CONFIGURED" },
    message:
      "The control-plane schedule is ready, but this job remains gated by its external integration.",
  };
}

async function dependencySatisfied(db: D1Database, job: JobRow) {
  if (!job.depends_on_job_key) return true;
  const dependency = await db
    .prepare(
      `SELECT last_success_at, last_failure_at FROM automation_jobs
       WHERE job_key = ?`,
    )
    .bind(job.depends_on_job_key)
    .first<{
      last_success_at: string | null;
      last_failure_at: string | null;
    }>();
  if (!dependency?.last_success_at) return false;
  return (
    !dependency.last_failure_at ||
    dependency.last_success_at >= dependency.last_failure_at
  );
}

export async function runAutomationJob(
  id: string,
  triggerType: "SCHEDULED" | "MANUAL" | "RETRY",
  initiatedByEmail: string | null,
  options: {
    db?: D1Database;
    parentRunId?: string | null;
    attempt?: number;
    scheduledFor?: string | null;
  } = {},
) {
  const db = options.db ?? (await boundDatabase());
  const job = await getJob(db, id);
  const runId = crypto.randomUUID();
  const queuedAt = new Date().toISOString();
  const attempt = options.attempt ?? 1;
  await db
    .prepare(
      `INSERT INTO automation_runs (
        id, job_id, parent_run_id, trigger_type, status, attempt,
        scheduled_for, queued_at, initiated_by_email, metrics_json
      ) VALUES (?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?, '{}')`,
    )
    .bind(
      runId,
      id,
      options.parentRunId ?? null,
      triggerType,
      attempt,
      options.scheduledFor ?? null,
      queuedAt,
      initiatedByEmail,
    )
    .run();
  if (!(await dependencySatisfied(db, job))) {
    const completedAt = new Date().toISOString();
    await db
      .prepare(
        `UPDATE automation_runs SET status = 'BLOCKED', completed_at = ?,
          error_code = 'DEPENDENCY_NOT_HEALTHY',
          error_summary = 'Required upstream job has no healthy success.'
         WHERE id = ?`,
      )
      .bind(completedAt, runId)
      .run();
    await addLog(
      db,
      runId,
      "WARN",
      "automation.dependency.blocked",
      "Run blocked because its upstream dependency is not healthy.",
      { dependency: job.depends_on_job_key },
    );
    const blocked = await db
      .prepare(`${RUN_SELECT} WHERE id = ?`)
      .bind(runId)
      .first<RunRow>();
    return mapRun(blocked!);
  }
  const startedAt = new Date();
  const timeoutAt = new Date(startedAt.getTime() + job.timeout_seconds * 1000);
  await db.batch([
    db
      .prepare(
        `UPDATE automation_runs SET status = 'RUNNING', started_at = ?,
          timeout_at = ? WHERE id = ?`,
      )
      .bind(startedAt.toISOString(), timeoutAt.toISOString(), runId),
    db
      .prepare(
        `UPDATE automation_jobs SET status = 'RUNNING', last_run_at = ?,
          updated_at = ? WHERE id = ?`,
      )
      .bind(startedAt.toISOString(), startedAt.toISOString(), id),
  ]);
  await addLog(
    db,
    runId,
    "INFO",
    "automation.run.started",
    "Automation run started.",
    { jobKey: job.job_key, attempt, triggerType },
  );
  try {
    const result = await Promise.race([
      executeJobHandler(db, job),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("AUTOMATION_JOB_TIMEOUT")),
          job.timeout_seconds * 1000,
        );
      }),
    ]);
    const completedAt = new Date().toISOString();
    const nextRunAt = job.enabled
      ? nextCronOccurrence(
          job.cron_expression,
          new Date(completedAt),
        ).toISOString()
      : null;
    await db.batch([
      db
        .prepare(
          `UPDATE automation_runs SET status = ?, completed_at = ?,
            processed_count = ?, succeeded_count = ?, failed_count = ?,
            metrics_json = ? WHERE id = ?`,
        )
        .bind(
          result.status,
          completedAt,
          result.processedCount,
          result.succeededCount,
          result.failedCount,
          JSON.stringify(result.metrics),
          runId,
        ),
      db
        .prepare(
          `UPDATE automation_jobs SET status = ?, last_success_at = ?,
            consecutive_failures = 0, next_run_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          result.status === "SUCCEEDED"
            ? job.enabled
              ? "HEALTHY"
              : "PAUSED"
            : "DEGRADED",
          result.status === "SUCCEEDED" ? completedAt : job.last_success_at,
          nextRunAt,
          completedAt,
          id,
        ),
    ]);
    await addLog(
      db,
      runId,
      result.status === "SUCCEEDED" ? "INFO" : "WARN",
      `automation.run.${result.status.toLowerCase()}`,
      result.message,
      result.metrics,
    );
  } catch (error) {
    const completedAt = new Date().toISOString();
    const timedOut =
      error instanceof Error && error.message === "AUTOMATION_JOB_TIMEOUT";
    const canRetry = attempt < job.max_attempts;
    const retryDelay =
      job.retry_base_seconds * 2 ** Math.max(0, attempt - 1) * 1000;
    const nextRetryAt = canRetry
      ? new Date(Date.now() + retryDelay).toISOString()
      : null;
    const errorSummary = timedOut
      ? "Job exceeded its configured timeout."
      : error instanceof Error
        ? error.message.slice(0, 500)
        : "Automation handler failed.";
    await db.batch([
      db
        .prepare(
          `UPDATE automation_runs SET status = ?, completed_at = ?,
            failed_count = 1, error_code = ?, error_summary = ?,
            next_retry_at = ? WHERE id = ?`,
        )
        .bind(
          timedOut ? "TIMED_OUT" : "FAILED",
          completedAt,
          timedOut ? "JOB_TIMEOUT" : "JOB_FAILED",
          errorSummary,
          nextRetryAt,
          runId,
        ),
      db
        .prepare(
          `UPDATE automation_jobs SET status = ?,
            consecutive_failures = consecutive_failures + 1,
            last_failure_at = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(canRetry ? "DEGRADED" : "FAILING", completedAt, completedAt, id),
    ]);
    await addLog(
      db,
      runId,
      "ERROR",
      timedOut ? "automation.run.timed_out" : "automation.run.failed",
      errorSummary,
      { attempt, nextRetryAt },
    );
  }
  const row = await db
    .prepare(`${RUN_SELECT} WHERE id = ?`)
    .bind(runId)
    .first<RunRow>();
  return mapRun(row!);
}

export async function runDueAutomationJobs(
  db: D1Database,
  scheduledTime = new Date(),
) {
  const now = scheduledTime.toISOString();
  const retries = await db
    .prepare(
      `${RUN_SELECT}
       WHERE status IN ('FAILED', 'TIMED_OUT') AND next_retry_at <= ?
       ORDER BY next_retry_at ASC LIMIT 10`,
    )
    .bind(now)
    .all<RunRow>();
  const retryResults = [];
  for (const run of retries.results) {
    await db
      .prepare("UPDATE automation_runs SET next_retry_at = NULL WHERE id = ?")
      .bind(run.id)
      .run();
    retryResults.push(
      await runAutomationJob(run.job_id, "RETRY", null, {
        db,
        parentRunId: run.id,
        attempt: run.attempt + 1,
        scheduledFor: run.next_retry_at,
      }),
    );
  }
  const due = await db
    .prepare(
      `${JOB_SELECT}
       WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
         AND status != 'RUNNING'
       ORDER BY next_run_at ASC LIMIT 10`,
    )
    .bind(now)
    .all<JobRow>();
  const scheduledResults = [];
  for (const job of due.results) {
    scheduledResults.push(
      await runAutomationJob(job.id, "SCHEDULED", null, {
        db,
        scheduledFor: job.next_run_at,
      }),
    );
  }
  return { retries: retryResults, scheduled: scheduledResults };
}

export async function listAutomationRunLogs(runId: string) {
  const rows = await (
    await boundDatabase()
  )
    .prepare(
      `SELECT id, level, event, message, metadata_json, occurred_at
       FROM automation_run_logs WHERE run_id = ?
       ORDER BY occurred_at ASC LIMIT 500`,
    )
    .bind(runId)
    .all<{
      id: string;
      level: string;
      event: string;
      message: string;
      metadata_json: string;
      occurred_at: string;
    }>();
  return rows.results.map((row) => ({
    id: row.id,
    level: row.level,
    event: row.event,
    message: row.message,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    occurredAt: row.occurred_at,
  }));
}
