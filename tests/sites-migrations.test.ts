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
    new URL("../drizzle/0008_lying_the_fury.sql", import.meta.url),
    new URL("../drizzle/0009_giant_sebastian_shaw.sql", import.meta.url),
    new URL(
      "../drizzle/0010_seed_phase2_partner_adapters.sql",
      import.meta.url,
    ),
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
    assert.equal(sources.length, 10);
    assert.equal(
      sources.filter((source) => source.source_type === "MANUAL").length,
      5,
    );
    assert.equal(
      sources.filter(
        (source) =>
          source.source_type === "API" && source.status === "DISABLED",
      ).length,
      5,
    );

    const schedules = database
      .prepare(
        "SELECT COUNT(*) AS count, SUM(enabled) AS enabled FROM ingestion_schedules",
      )
      .get() as { count: number; enabled: number };
    assert.equal(schedules.count, 10);
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

    const complianceTables = database
      .prepare(
        `SELECT COUNT(*) AS count FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'compliance_checks',
             'compliance_check_results',
             'compliance_overrides'
           )`,
      )
      .get() as { count: number };
    assert.equal(complianceTables.count, 3);

    const savedProductTable = database
      .prepare(
        `SELECT COUNT(*) AS count FROM sqlite_master
         WHERE type = 'table' AND name = 'saved_products'`,
      )
      .get() as { count: number };
    assert.equal(savedProductTable.count, 1);
  } finally {
    database.close();
  }
});

test("Sites migrations create the Phase 3 campaign and attribution foundation", async () => {
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
    new URL("../drizzle/0008_lying_the_fury.sql", import.meta.url),
    new URL("../drizzle/0009_giant_sebastian_shaw.sql", import.meta.url),
    new URL(
      "../drizzle/0010_seed_phase2_partner_adapters.sql",
      import.meta.url,
    ),
    new URL(
      "../drizzle/0011_phase3_campaign_tracking_foundation.sql",
      import.meta.url,
    ),
  ];
  const migrations = await Promise.all(
    migrationUrls.map((url) => readFile(url, "utf8")),
  );
  const database = new DatabaseSync(":memory:");

  try {
    database.exec("PRAGMA foreign_keys = ON;");
    for (const migration of migrations) database.exec(migration);

    const tables = database
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'creator_accounts',
             'campaigns',
             'content_variations',
             'promotions',
             'tracked_links',
             'click_events',
             'conversion_events',
             'commission_events'
           )
         ORDER BY name`,
      )
      .all() as Array<{ name: string }>;
    assert.deepEqual(
      tables.map(({ name }) => name),
      [
        "campaigns",
        "click_events",
        "commission_events",
        "content_variations",
        "conversion_events",
        "creator_accounts",
        "promotions",
        "tracked_links",
      ],
    );

    const indexes = database
      .prepare(
        `SELECT COUNT(*) AS count FROM sqlite_master
         WHERE type = 'index'
           AND tbl_name IN (
             'creator_accounts',
             'campaigns',
             'content_variations',
             'promotions',
             'tracked_links',
             'click_events',
             'conversion_events',
             'commission_events'
           )`,
      )
      .get() as { count: number };
    assert.ok(indexes.count >= 27);

    const trackedLinkForeignKeys = database
      .prepare("PRAGMA foreign_key_list('tracked_links')")
      .all();
    const promotionForeignKeys = database
      .prepare("PRAGMA foreign_key_list('promotions')")
      .all();
    assert.equal(trackedLinkForeignKeys.length, 4);
    assert.equal(promotionForeignKeys.length, 4);
  } finally {
    database.close();
  }
});
