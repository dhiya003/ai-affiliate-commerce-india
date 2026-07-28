import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("Sites migrations produce the complete Phase 1 sample catalogue", async () => {
  const migrationUrls = [
    new URL("../drizzle/0000_real_pandemic.sql", import.meta.url),
    new URL("../drizzle/0001_tiresome_kitty_pryde.sql", import.meta.url),
    new URL("../drizzle/0002_seed_phase1_catalog.sql", import.meta.url),
  ];
  const migrations = await Promise.all(
    migrationUrls.map((url) => readFile(url, "utf8")),
  );
  const database = new DatabaseSync(":memory:");

  try {
    database.exec("PRAGMA foreign_keys = ON;");
    for (const migration of migrations) database.exec(migration);

    const count = database
      .prepare("SELECT COUNT(*) AS count FROM products")
      .get() as { count: number };
    assert.equal(count.count, 50);

    const marketplaces = database
      .prepare(
        "SELECT marketplace, COUNT(*) AS count FROM products GROUP BY marketplace ORDER BY marketplace",
      )
      .all() as Array<{ marketplace: string; count: number }>;
    assert.deepEqual(
      marketplaces.map(({ marketplace }) => marketplace),
      ["AJIO", "Amazon", "Flipkart", "Meesho", "Myntra"],
    );
    assert.ok(
      marketplaces.every(
        ({ count: marketplaceCount }) => marketplaceCount >= 9,
      ),
    );

    const invalidRows = database
      .prepare(
        `SELECT COUNT(*) AS count
         FROM products
         WHERE current_price <= 0
            OR original_price < current_price
            OR rating < 0
            OR rating > 5
            OR opportunity_score IS NULL`,
      )
      .get() as { count: number };
    assert.equal(invalidRows.count, 0);
  } finally {
    database.close();
  }
});

test("Sites migrations produce seeded Phase 2 ingestion sources", async () => {
  const migrationUrls = [
    new URL("../drizzle/0000_real_pandemic.sql", import.meta.url),
    new URL("../drizzle/0001_tiresome_kitty_pryde.sql", import.meta.url),
    new URL("../drizzle/0002_seed_phase1_catalog.sql", import.meta.url),
    new URL("../drizzle/0003_freezing_titanium_man.sql", import.meta.url),
    new URL("../drizzle/0004_seed_phase2_policies.sql", import.meta.url),
    new URL("../drizzle/0005_abandoned_energizer.sql", import.meta.url),
    new URL(
      "../drizzle/0006_seed_phase2_ingestion_sources.sql",
      import.meta.url,
    ),
    new URL("../drizzle/0007_worried_doctor_spectrum.sql", import.meta.url),
  ];
  const migrations = await Promise.all(
    migrationUrls.map((url) => readFile(url, "utf8")),
  );
  const database = new DatabaseSync(":memory:");

  try {
    database.exec("PRAGMA foreign_keys = ON;");
    for (const migration of migrations) database.exec(migration);

    const sources = database
      .prepare(
        "SELECT marketplace, source_type, status FROM product_sources ORDER BY marketplace",
      )
      .all() as Array<{
      marketplace: string;
      source_type: string;
      status: string;
    }>;
    assert.equal(sources.length, 5);
    assert.ok(sources.every((source) => source.source_type === "MANUAL"));
    assert.ok(sources.every((source) => source.status === "READY"));

    const schedules = database
      .prepare(
        "SELECT COUNT(*) AS count, SUM(enabled) AS enabled FROM ingestion_schedules",
      )
      .get() as { count: number; enabled: number };
    assert.equal(schedules.count, 5);
    assert.equal(schedules.enabled, 0);

    const intelligenceTables = database
      .prepare(
        `SELECT COUNT(*) AS count FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'trend_signals',
             'source_trend_scores',
             'opportunity_score_evidence'
           )`,
      )
      .get() as { count: number };
    assert.equal(intelligenceTables.count, 3);
  } finally {
    database.close();
  }
});
