import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  applicationUserUpdateSchema,
  backupActionSchema,
  featureFlagUpdateSchema,
  managedTemplateInputSchema,
  retentionPolicyUpdateSchema,
} from "../lib/admin/schema.ts";

test("administrator mutation inputs are bounded and explicit", () => {
  assert.equal(
    featureFlagUpdateSchema.safeParse({
      enabled: true,
      rolloutPercent: 50,
    }).success,
    true,
  );
  assert.equal(
    featureFlagUpdateSchema.safeParse({
      enabled: true,
      rolloutPercent: 101,
    }).success,
    false,
  );
  assert.deepEqual(
    applicationUserUpdateSchema.parse({ role: "USER", status: "SUSPENDED" }),
    { role: "USER", status: "SUSPENDED" },
  );
  assert.equal(
    retentionPolicyUpdateSchema.safeParse({
      enabled: true,
      retentionDays: 0,
    }).success,
    false,
  );
  assert.equal(
    managedTemplateInputSchema.safeParse({
      kind: "AI_PROMPT",
      name: "Affiliate reel",
      content:
        "Use only supplied product facts and add an affiliate disclosure.",
      status: "ACTIVE",
    }).success,
    true,
  );
  assert.deepEqual(
    backupActionSchema.parse({ action: "request", scope: "DATABASE" }),
    { action: "request", scope: "DATABASE" },
  );
});

test("operations migration creates governance state and safe defaults", async () => {
  const journal = JSON.parse(
    await readFile(
      new URL("../drizzle/meta/_journal.json", import.meta.url),
      "utf8",
    ),
  ) as { entries: Array<{ tag: string }> };
  const migrations = await Promise.all(
    journal.entries.map(({ tag }) =>
      readFile(new URL(`../drizzle/${tag}.sql`, import.meta.url), "utf8"),
    ),
  );
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("PRAGMA foreign_keys = ON;");
    for (const migration of migrations) database.exec(migration);
    const tables = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (
          'application_users', 'feature_flags', 'managed_templates',
          'data_retention_policies', 'audit_events', 'security_events',
          'usage_cost_events', 'backup_runs', 'operational_metrics',
          'background_queue_jobs', 'rate_limit_buckets'
        ) ORDER BY name`,
      )
      .all() as Array<{ name: string }>;
    assert.equal(tables.length, 11);
    const flags = database
      .prepare(
        `SELECT key, enabled, rollout_percent FROM feature_flags ORDER BY key`,
      )
      .all() as Array<{
      key: string;
      enabled: number;
      rollout_percent: number;
    }>;
    assert.equal(flags.length, 4);
    const partnerFlag = flags.find(
      ({ key }) => key === "partner-marketplace-ingestion",
    );
    assert.equal(partnerFlag?.enabled, 0);
    assert.equal(partnerFlag?.rollout_percent, 0);
    const retention = database
      .prepare(
        "SELECT COUNT(*) AS count FROM data_retention_policies WHERE enabled = 1",
      )
      .get() as { count: number };
    assert.equal(retention.count, 5);
  } finally {
    database.close();
  }
});

test("all administration APIs require the shared administrator guard", async () => {
  const paths = [
    "../app/api/admin/overview/route.ts",
    "../app/api/admin/feature-flags/[key]/route.ts",
    "../app/api/admin/users/[email]/route.ts",
    "../app/api/admin/retention/[key]/route.ts",
    "../app/api/admin/templates/route.ts",
    "../app/api/admin/backups/route.ts",
    "../app/api/admin/security-events/[id]/route.ts",
  ];
  for (const path of paths) {
    const route = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(route, /requireAdminApiUser/);
    assert.match(route, /handleApiError/);
  }
  const auth = await readFile(
    new URL("../lib/admin/auth.ts", import.meta.url),
    "utf8",
  );
  assert.match(auth, /requireRole\(user, \["ADMIN"\]\)/);
  assert.match(auth, /ADMIN_REQUIRED/);
});

test("administrator changes are auditable and backup status is not fabricated", async () => {
  const repository = await readFile(
    new URL("../lib/admin/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /INSERT INTO audit_events/);
  assert.match(repository, /feature_flag\.update/);
  assert.match(repository, /user\.update/);
  assert.match(repository, /retention_policy\.update/);
  assert.match(repository, /template\.create/);
  assert.match(repository, /BACKUP_TRANSPORT_NOT_CONFIGURED/);
  assert.match(repository, /Only successful backups can be marked/);
  assert.match(repository, /SELF_SUSPENSION_BLOCKED/);
});

test("request guard uses same-origin mutation checks and privacy-safe throttling", async () => {
  const guard = await readFile(
    new URL("../lib/security/request-guard.ts", import.meta.url),
    "utf8",
  );
  assert.match(guard, /CROSS_SITE_REQUEST_BLOCKED/);
  assert.match(guard, /sec-fetch-site/);
  assert.match(guard, /sha256Hex/);
  assert.match(guard, /rate_limit_buckets/);
  assert.match(guard, /RATE_LIMIT_EXCEEDED/);
  assert.match(guard, /fingerprint_hash/);
  assert.doesNotMatch(guard, /\b(raw_ip|ip_address)\b/);
  const worker = await readFile(
    new URL("../worker/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(worker, /guardRequest\(request, env\.DB\)/);
});

test("legal, recovery, secret, dependency, and code scanning controls exist", async () => {
  const files = await Promise.all(
    [
      "../app/privacy/page.tsx",
      "../app/terms/page.tsx",
      "../docs/SECURITY.md",
      "../docs/INCIDENT_RESPONSE.md",
      "../docs/DISASTER_RECOVERY.md",
      "../docs/SECRET_ROTATION.md",
      "../docs/PRODUCTION_ROLLBACK.md",
      "../.github/dependabot.yml",
      "../.github/workflows/codeql.yml",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  assert.ok(files.every((content) => content.trim().length > 40));
  assert.match(files[0]!, /raw IP addresses\s+are not stored/i);
  assert.match(files[1]!, /human\s+approval remains required/i);
  assert.match(files[4]!, /never mark a backup or restore test successful/i);
  assert.match(files[8]!, /github\/codeql-action\/analyze@v3/);
});

test("AI token usage is measured without inventing provider pricing", async () => {
  const [provider, repository] = await Promise.all([
    readFile(new URL("../lib/content/provider.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/content/repository.ts", import.meta.url), "utf8"),
  ]);
  assert.match(provider, /input_tokens/);
  assert.match(provider, /output_tokens/);
  assert.match(repository, /INSERT INTO usage_cost_events/);
  assert.match(repository, /pricingStatus: "UNCONFIGURED"/);
  assert.match(
    repository,
    /cost_inr,[\s\S]*VALUES \(\?, \?, 'openai', 'AI', \?, \?, 0/,
  );
});
