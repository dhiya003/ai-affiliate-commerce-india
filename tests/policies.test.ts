import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function policyDatabase() {
  const files = [
    "drizzle/0000_real_pandemic.sql",
    "drizzle/0001_tiresome_kitty_pryde.sql",
    "drizzle/0002_seed_phase1_catalog.sql",
    "drizzle/0003_freezing_titanium_man.sql",
    "drizzle/0004_seed_phase2_policies.sql",
  ];
  const migrations = await Promise.all(
    files.map((file) => readFile(new URL(file, root), "utf8")),
  );
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  for (const migration of migrations) database.exec(migration);
  return database;
}

test("Phase 2 migrations create every marketplace policy model", async () => {
  const database = await policyDatabase();
  try {
    const tables = database
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN (
           'marketplace_rules', 'commission_rules', 'content_policies',
           'affiliate_disclosures', 'prohibited_practices',
           'platform_update_history'
         )
         ORDER BY name`,
      )
      .all() as Array<{ name: string }>;

    assert.deepEqual(
      tables.map(({ name }) => name),
      [
        "affiliate_disclosures",
        "commission_rules",
        "content_policies",
        "marketplace_rules",
        "platform_update_history",
        "prohibited_practices",
      ],
    );
  } finally {
    database.close();
  }
});

test("PostgreSQL migration mirrors every policy model and relationship", async () => {
  const migration = await readFile(
    new URL(
      "prisma/migrations/20260729090000_phase2_policy_knowledge_base/migration.sql",
      root,
    ),
    "utf8",
  );

  for (const table of [
    "MarketplaceRule",
    "CommissionRule",
    "ContentPolicy",
    "AffiliateDisclosure",
    "ProhibitedPractice",
    "PlatformUpdateHistory",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE "${table}" ADD CONSTRAINT .* FOREIGN KEY \\("marketplaceId"\\)`,
      ),
    );
  }
  assert.match(migration, /CREATE TYPE "PolicyStatus"/);
  assert.match(migration, /CREATE TYPE "PolicySeverity"/);
});

test("policy seed covers all marketplaces with dated primary sources", async () => {
  const database = await policyDatabase();
  try {
    const marketplaces = database
      .prepare(
        "SELECT DISTINCT marketplace FROM marketplace_rules ORDER BY marketplace",
      )
      .all() as Array<{ marketplace: string }>;
    assert.deepEqual(
      marketplaces.map(({ marketplace }) => marketplace),
      ["AJIO", "Amazon", "Flipkart", "Meesho", "Myntra"],
    );

    const counts = database
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM marketplace_rules) AS marketplace_rules,
          (SELECT COUNT(*) FROM commission_rules) AS commission_rules,
          (SELECT COUNT(*) FROM content_policies) AS content_policies,
          (SELECT COUNT(*) FROM affiliate_disclosures) AS disclosures,
          (SELECT COUNT(*) FROM prohibited_practices) AS prohibited,
          (SELECT COUNT(*) FROM platform_update_history) AS updates`,
      )
      .get() as Record<string, number>;
    assert.deepEqual(
      { ...counts },
      {
        marketplace_rules: 5,
        commission_rules: 4,
        content_policies: 3,
        disclosures: 2,
        prohibited: 3,
        updates: 2,
      },
    );

    const invalid = database
      .prepare(
        `SELECT COUNT(*) AS count FROM (
          SELECT effective_at, source_url, status FROM marketplace_rules
          UNION ALL SELECT effective_at, source_url, status FROM commission_rules
          UNION ALL SELECT effective_at, source_url, status FROM content_policies
          UNION ALL SELECT effective_at, source_url, status FROM affiliate_disclosures
          UNION ALL SELECT effective_at, source_url, status FROM prohibited_practices
        )
        WHERE effective_at IS NULL
          OR source_url NOT LIKE 'https://%'
          OR status NOT IN ('DRAFT', 'ACTIVE', 'NEEDS_REVIEW', 'RETIRED')`,
      )
      .get() as { count: number };
    assert.equal(invalid.count, 0);
  } finally {
    database.close();
  }
});

test("policy review endpoint is administrator-only and audit-backed", async () => {
  const [route, repository, page] = await Promise.all([
    readFile(
      new URL("app/api/policies/[kind]/[id]/status/route.ts", root),
      "utf8",
    ),
    readFile(new URL("lib/policies/repository.ts", root), "utf8"),
    readFile(
      new URL("app/policies/PolicyKnowledgeBaseClient.tsx", root),
      "utf8",
    ),
  ]);

  assert.match(route, /requireRole\(user, \["ADMIN"\]\)/);
  assert.match(route, /ADMIN_REQUIRED/);
  assert.match(repository, /INSERT INTO platform_update_history/);
  assert.match(repository, /reviewed_by_email/);
  assert.match(page, /Official source/);
  assert.match(page, /Needs review/);
  assert.match(page, /Platform update history/);
});
