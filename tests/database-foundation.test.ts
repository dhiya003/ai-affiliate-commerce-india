import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  categories,
  marketplaces,
  productTemplates,
} from "../prisma/seed-data.ts";

test("seed data covers all five locked marketplaces", () => {
  assert.deepEqual(marketplaces.map(({ slug }) => slug).sort(), [
    "ajio",
    "amazon",
    "flipkart",
    "meesho",
    "myntra",
  ]);
});

test("seed creates at least 50 marketplace products", () => {
  const seededProductCount = marketplaces.length * productTemplates.length;
  assert.ok(
    seededProductCount >= 50,
    `Expected at least 50 products, found ${seededProductCount}`,
  );
  assert.ok(categories.length >= 5);
});

test("initial migration creates every Phase 1 core table", async () => {
  const migration = await readFile(
    new URL(
      "../prisma/migrations/20260726110000_initial/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  const tables = [
    "User",
    "Marketplace",
    "Seller",
    "ProductCategory",
    "Product",
    "ProductPriceHistory",
    "ProductScore",
    "GeneratedContent",
    "PromotionStatus",
    "ProductTag",
    "ProductTagAssignment",
    "AffiliateLink",
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }

  assert.match(migration, /CREATE UNIQUE INDEX/);
  assert.match(migration, /ADD CONSTRAINT .* FOREIGN KEY/);
});
