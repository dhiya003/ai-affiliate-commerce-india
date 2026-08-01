import { ApiError } from "@/lib/api/errors";
import type {
  ApplicationUserUpdate,
  FeatureFlagUpdate,
  ManagedTemplateInput,
  RetentionPolicyUpdate,
} from "./schema.ts";
import type { AdminOverview } from "./types.ts";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Administration storage is unavailable.",
    );
  }
  return env.DB;
}

function boundedMetadata(metadata: Record<string, unknown>) {
  return JSON.stringify(metadata).slice(0, 10_000);
}

export async function recordAuditEvent(
  actorEmail: string,
  action: string,
  entityType: string,
  entityId: string | null,
  outcome: "SUCCEEDED" | "BLOCKED" | "FAILED",
  metadata: Record<string, unknown> = {},
) {
  await (
    await database()
  )
    .prepare(
      `INSERT INTO audit_events (
        id, actor_email, action, entity_type, entity_id, outcome,
        metadata_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      actorEmail,
      action.slice(0, 120),
      entityType.slice(0, 80),
      entityId?.slice(0, 240) ?? null,
      outcome,
      boundedMetadata(metadata),
      new Date().toISOString(),
    )
    .run();
}

export async function registerApplicationUser(
  email: string,
  displayName: string | null,
  role: "ADMIN" | "USER",
) {
  const now = new Date().toISOString();
  await (
    await database()
  )
    .prepare(
      `INSERT INTO application_users (
        email, display_name, role, status, last_seen_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        display_name = excluded.display_name,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at`,
    )
    .bind(email, displayName, role, now, now, now)
    .run();
}

export async function ensureApplicationUserAccess(
  email: string,
  displayName: string | null,
  role: "ADMIN" | "USER",
) {
  const db = await database();
  const existing = await db
    .prepare(`SELECT status FROM application_users WHERE email = ?`)
    .bind(email)
    .first<{ status: string }>();
  if (existing?.status === "SUSPENDED") {
    throw new ApiError(
      403,
      "ACCOUNT_SUSPENDED",
      "This application account is suspended.",
    );
  }
  await registerApplicationUser(email, displayName, role);
}

export async function getAdminOverview(currentUser: {
  email: string;
  displayName: string;
  role: "ADMIN" | "USER";
}): Promise<AdminOverview> {
  await registerApplicationUser(
    currentUser.email,
    currentUser.displayName,
    currentUser.role,
  );
  const db = await database();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const [
    counts,
    costs,
    marketplaceCosts,
    users,
    flags,
    retention,
    templates,
    security,
    audit,
    backups,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM application_users) AS users,
          (SELECT COUNT(*) FROM product_sources WHERE status = 'ACTIVE') AS active_sources,
          (SELECT COUNT(*) FROM product_sources WHERE consecutive_failures > 0) AS failing_sources,
          (SELECT COUNT(*) FROM automation_jobs) AS automation_jobs,
          (SELECT COUNT(*) FROM automation_jobs WHERE status = 'FAILING') AS failing_jobs,
          (SELECT COUNT(*) FROM background_queue_jobs WHERE status IN ('QUEUED', 'RETRY')) AS queued_jobs,
          (SELECT COUNT(*) FROM security_events WHERE resolved_at IS NULL) AS security_events`,
      )
      .first<{
        users: number;
        active_sources: number;
        failing_sources: number;
        automation_jobs: number;
        failing_jobs: number;
        queued_jobs: number;
        security_events: number;
      }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(units), 0) AS units,
          COALESCE(SUM(cost_inr), 0) AS cost_inr
         FROM usage_cost_events WHERE service = 'AI' AND occurred_at >= ?`,
      )
      .bind(since)
      .first<{ units: number; cost_inr: number }>(),
    db
      .prepare(
        `SELECT COALESCE(marketplace, 'Unassigned') AS marketplace,
          ROUND(SUM(cost_inr), 2) AS cost_inr
         FROM usage_cost_events WHERE marketplace IS NOT NULL AND occurred_at >= ?
         GROUP BY marketplace ORDER BY cost_inr DESC LIMIT 20`,
      )
      .bind(since)
      .all<{ marketplace: string; cost_inr: number }>(),
    db
      .prepare(
        `SELECT email, display_name, role, status, last_seen_at
         FROM application_users ORDER BY last_seen_at DESC LIMIT 200`,
      )
      .all<{
        email: string;
        display_name: string | null;
        role: string;
        status: string;
        last_seen_at: string | null;
      }>(),
    db
      .prepare(
        `SELECT key, description, enabled, rollout_percent, updated_at
         FROM feature_flags ORDER BY key`,
      )
      .all<{
        key: string;
        description: string;
        enabled: number;
        rollout_percent: number;
        updated_at: string;
      }>(),
    db
      .prepare(
        `SELECT key, description, retention_days, enabled, updated_at
         FROM data_retention_policies ORDER BY key`,
      )
      .all<{
        key: string;
        description: string;
        retention_days: number;
        enabled: number;
        updated_at: string;
      }>(),
    db
      .prepare(
        `SELECT id, kind, name, version, status, updated_at
         FROM managed_templates ORDER BY kind, name, version DESC LIMIT 200`,
      )
      .all<{
        id: string;
        kind: string;
        name: string;
        version: number;
        status: string;
        updated_at: string;
      }>(),
    db
      .prepare(
        `SELECT id, severity, event_type, actor_email, region, occurred_at,
          resolved_at FROM security_events
         ORDER BY occurred_at DESC LIMIT 100`,
      )
      .all<{
        id: string;
        severity: string;
        event_type: string;
        actor_email: string | null;
        region: string | null;
        occurred_at: string;
        resolved_at: string | null;
      }>(),
    db
      .prepare(
        `SELECT id, actor_email, action, entity_type, entity_id, outcome,
          occurred_at FROM audit_events ORDER BY occurred_at DESC LIMIT 100`,
      )
      .all<{
        id: string;
        actor_email: string;
        action: string;
        entity_type: string;
        entity_id: string | null;
        outcome: string;
        occurred_at: string;
      }>(),
    db
      .prepare(
        `SELECT id, status, scope, started_at, completed_at,
          restore_tested_at, error_code
         FROM backup_runs ORDER BY started_at DESC LIMIT 50`,
      )
      .all<{
        id: string;
        status: string;
        scope: string;
        started_at: string;
        completed_at: string | null;
        restore_tested_at: string | null;
        error_code: string | null;
      }>(),
  ]);
  return {
    counts: {
      users: counts?.users ?? 0,
      activeSources: counts?.active_sources ?? 0,
      failingSources: counts?.failing_sources ?? 0,
      automationJobs: counts?.automation_jobs ?? 0,
      failingJobs: counts?.failing_jobs ?? 0,
      queuedJobs: counts?.queued_jobs ?? 0,
      unresolvedSecurityEvents: counts?.security_events ?? 0,
    },
    aiUsage: { units: costs?.units ?? 0, costInr: costs?.cost_inr ?? 0 },
    marketplaceCosts: marketplaceCosts.results.map((row) => ({
      marketplace: row.marketplace,
      costInr: row.cost_inr,
    })),
    users: users.results.map((row) => ({
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      status: row.status,
      lastSeenAt: row.last_seen_at,
    })),
    featureFlags: flags.results.map((row) => ({
      key: row.key,
      description: row.description,
      enabled: Boolean(row.enabled),
      rolloutPercent: row.rollout_percent,
      updatedAt: row.updated_at,
    })),
    retentionPolicies: retention.results.map((row) => ({
      key: row.key,
      description: row.description,
      retentionDays: row.retention_days,
      enabled: Boolean(row.enabled),
      updatedAt: row.updated_at,
    })),
    templates: templates.results.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      version: row.version,
      status: row.status,
      updatedAt: row.updated_at,
    })),
    securityEvents: security.results.map((row) => ({
      id: row.id,
      severity: row.severity,
      eventType: row.event_type,
      actorEmail: row.actor_email,
      region: row.region,
      occurredAt: row.occurred_at,
      resolvedAt: row.resolved_at,
    })),
    auditEvents: audit.results.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      outcome: row.outcome,
      occurredAt: row.occurred_at,
    })),
    backups: backups.results.map((row) => ({
      id: row.id,
      status: row.status,
      scope: row.scope,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      restoreTestedAt: row.restore_tested_at,
      errorCode: row.error_code,
    })),
  };
}

export async function updateFeatureFlag(
  key: string,
  input: FeatureFlagUpdate,
  actorEmail: string,
) {
  const now = new Date().toISOString();
  const result = await (
    await database()
  )
    .prepare(
      `UPDATE feature_flags SET enabled = ?, rollout_percent = ?,
        updated_by_email = ?, updated_at = ? WHERE key = ?`,
    )
    .bind(input.enabled ? 1 : 0, input.rolloutPercent, actorEmail, now, key)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(
      404,
      "FEATURE_FLAG_NOT_FOUND",
      "Feature flag not found.",
    );
  }
  await recordAuditEvent(
    actorEmail,
    "feature_flag.update",
    "feature_flag",
    key,
    "SUCCEEDED",
    input,
  );
  return { key, ...input, updatedAt: now };
}

export async function updateApplicationUser(
  email: string,
  input: ApplicationUserUpdate,
  actorEmail: string,
) {
  if (
    email.toLowerCase() === actorEmail.toLowerCase() &&
    input.status !== "ACTIVE"
  ) {
    throw new ApiError(
      409,
      "SELF_SUSPENSION_BLOCKED",
      "Administrators cannot suspend their own account.",
    );
  }
  const now = new Date().toISOString();
  const result = await (
    await database()
  )
    .prepare(
      `UPDATE application_users SET role = ?, status = ?, updated_at = ?
       WHERE email = ?`,
    )
    .bind(input.role, input.status, now, email)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(404, "USER_NOT_FOUND", "Application user not found.");
  }
  await recordAuditEvent(
    actorEmail,
    "user.update",
    "application_user",
    email,
    "SUCCEEDED",
    input,
  );
  return { email, ...input, updatedAt: now };
}

export async function updateRetentionPolicy(
  key: string,
  input: RetentionPolicyUpdate,
  actorEmail: string,
) {
  const now = new Date().toISOString();
  const result = await (
    await database()
  )
    .prepare(
      `UPDATE data_retention_policies SET retention_days = ?, enabled = ?,
        updated_by_email = ?, updated_at = ? WHERE key = ?`,
    )
    .bind(input.retentionDays, input.enabled ? 1 : 0, actorEmail, now, key)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(
      404,
      "RETENTION_POLICY_NOT_FOUND",
      "Retention policy not found.",
    );
  }
  await recordAuditEvent(
    actorEmail,
    "retention_policy.update",
    "data_retention_policy",
    key,
    "SUCCEEDED",
    input,
  );
  return { key, ...input, updatedAt: now };
}

export async function createManagedTemplate(
  input: ManagedTemplateInput,
  actorEmail: string,
) {
  const db = await database();
  const latest = await db
    .prepare(
      `SELECT MAX(version) AS version FROM managed_templates
       WHERE kind = ? AND name = ?`,
    )
    .bind(input.kind, input.name)
    .first<{ version: number | null }>();
  const version = (latest?.version ?? 0) + 1;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO managed_templates (
        id, kind, name, version, content, status, created_by_email,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.kind,
      input.name,
      version,
      input.content,
      input.status,
      actorEmail,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    actorEmail,
    "template.create",
    "managed_template",
    id,
    "SUCCEEDED",
    { kind: input.kind, name: input.name, version, status: input.status },
  );
  return { id, ...input, version, createdAt: now, updatedAt: now };
}

export async function requestBackup(actorEmail: string) {
  const db = await database();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO backup_runs (
        id, status, scope, initiated_by_email, started_at, completed_at,
        error_code
      ) VALUES (?, 'BLOCKED', 'DATABASE', ?, ?, ?, 'BACKUP_TRANSPORT_NOT_CONFIGURED')`,
    )
    .bind(id, actorEmail, now, now)
    .run();
  await recordAuditEvent(
    actorEmail,
    "backup.request",
    "backup_run",
    id,
    "BLOCKED",
    { reason: "BACKUP_TRANSPORT_NOT_CONFIGURED" },
  );
  return {
    id,
    status: "BLOCKED",
    scope: "DATABASE",
    startedAt: now,
    completedAt: now,
    errorCode: "BACKUP_TRANSPORT_NOT_CONFIGURED",
  };
}

export async function recordRestoreTest(
  backupRunId: string,
  actorEmail: string,
) {
  const db = await database();
  const backup = await db
    .prepare(`SELECT status FROM backup_runs WHERE id = ?`)
    .bind(backupRunId)
    .first<{ status: string }>();
  if (!backup)
    throw new ApiError(404, "BACKUP_NOT_FOUND", "Backup run not found.");
  if (backup.status !== "SUCCEEDED") {
    throw new ApiError(
      409,
      "BACKUP_NOT_RESTORABLE",
      "Only successful backups can be marked as restore-tested.",
    );
  }
  const testedAt = new Date().toISOString();
  await db
    .prepare(`UPDATE backup_runs SET restore_tested_at = ? WHERE id = ?`)
    .bind(testedAt, backupRunId)
    .run();
  await recordAuditEvent(
    actorEmail,
    "backup.restore_test",
    "backup_run",
    backupRunId,
    "SUCCEEDED",
  );
  return { id: backupRunId, restoreTestedAt: testedAt };
}

export async function resolveSecurityEvent(id: string, actorEmail: string) {
  const resolvedAt = new Date().toISOString();
  const result = await (
    await database()
  )
    .prepare(
      `UPDATE security_events SET resolved_at = ?, resolved_by_email = ?
       WHERE id = ? AND resolved_at IS NULL`,
    )
    .bind(resolvedAt, actorEmail, id)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(
      404,
      "SECURITY_EVENT_NOT_FOUND",
      "Open security event not found.",
    );
  }
  await recordAuditEvent(
    actorEmail,
    "security_event.resolve",
    "security_event",
    id,
    "SUCCEEDED",
  );
  return { id, resolvedAt };
}
