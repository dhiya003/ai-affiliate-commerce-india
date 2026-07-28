import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalProductKey,
  isSourceRecordStale,
  ManualSourceAdapter,
  matchStatusForConfidence,
  retryDelayMinutes,
} from "../lib/ingestion/normalizer.ts";
import {
  manualIngestionSchema,
  sourceRecordSchema,
} from "../lib/ingestion/schema.ts";
import { assessSourceHealth } from "../lib/ingestion/health.ts";

const record = {
  marketplaceProductId: "AMZ-001",
  name: "Noise Cancelling Headphones",
  brand: "Acme",
  productUrl: "https://example.com/products/amz-001",
  category: "Audio",
  currentPrice: 2499,
  reviewCount: 420,
  stockStatus: "IN_STOCK" as const,
  returnRisk: "LOW" as const,
  sourceTimestamp: "2026-07-29T00:00:00.000Z",
  availabilityStatus: "AVAILABLE" as const,
  confidence: 0.96,
};

test("manual input contract accepts a bounded marketplace batch", () => {
  const parsed = manualIngestionSchema.parse({
    sourceId: "source-amazon-manual",
    marketplace: "Amazon",
    records: [record],
  });
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.marketplace, "Amazon");
});

test("source record contract rejects malformed URLs and confidence", () => {
  assert.equal(
    sourceRecordSchema.safeParse({
      ...record,
      productUrl: "not-a-url",
      confidence: 2,
    }).success,
    false,
  );
});

test("manual adapter emits the normalized product contract", () => {
  const adapter = new ManualSourceAdapter("Amazon");
  const normalized = adapter.normalize(sourceRecordSchema.parse(record));
  assert.equal(normalized.marketplace, "Amazon");
  assert.equal(normalized.brand, "Acme");
  assert.equal(normalized.originalPrice, null);
  assert.equal(normalized.rating, null);
});

test("canonical keys are stable across case and punctuation", () => {
  const left = canonicalProductKey({
    brand: "ACME",
    name: "Noise-Cancelling Headphones!",
    category: "Audio",
  });
  const right = canonicalProductKey({
    brand: "acme",
    name: "noise cancelling headphones",
    category: "audio",
  });
  assert.equal(left, right);
});

test("confidence thresholds produce exact, probable, and review matches", () => {
  assert.equal(matchStatusForConfidence(0.95), "EXACT");
  assert.equal(matchStatusForConfidence(0.8), "PROBABLE");
  assert.equal(matchStatusForConfidence(0.5), "REVIEW");
});

test("freshness uses each source window", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  assert.equal(
    isSourceRecordStale("2026-07-29T11:00:00.000Z", 120, now),
    false,
  );
  assert.equal(isSourceRecordStale("2026-07-29T09:00:00.000Z", 120, now), true);
});

test("retry backoff is exponential and capped at six hours", () => {
  assert.deepEqual([1, 2, 3, 4].map(retryDelayMinutes), [5, 10, 20, 40]);
  assert.equal(retryDelayMinutes(20), 360);
});

test("source freshness distinguishes fresh, aging, stale, and never synced", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  const base = {
    status: "READY" as const,
    freshnessWindowMinutes: 120,
    consecutiveFailures: 0,
    rateLimitedUntil: null,
  };

  assert.equal(
    assessSourceHealth(
      { ...base, lastSuccessAt: "2026-07-29T11:00:00.000Z" },
      now,
    ).freshness.status,
    "FRESH",
  );
  assert.equal(
    assessSourceHealth(
      { ...base, lastSuccessAt: "2026-07-29T10:20:00.000Z" },
      now,
    ).freshness.status,
    "AGING",
  );
  assert.equal(
    assessSourceHealth(
      { ...base, lastSuccessAt: "2026-07-29T09:00:00.000Z" },
      now,
    ).freshness.status,
    "STALE",
  );
  assert.equal(
    assessSourceHealth({ ...base, lastSuccessAt: null }, now).freshness.status,
    "NEVER_SYNCED",
  );
});

test("source health alerts escalate failures and ignore disabled adapters", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  const critical = assessSourceHealth(
    {
      status: "DEGRADED",
      freshnessWindowMinutes: 60,
      lastSuccessAt: "2026-07-29T08:00:00.000Z",
      consecutiveFailures: 3,
      rateLimitedUntil: "2026-07-29T13:00:00.000Z",
    },
    now,
  );
  assert.equal(critical.health, "DEGRADED");
  assert.deepEqual(
    critical.alerts.map(({ code, severity }) => [code, severity]),
    [
      ["SOURCE_STALE", "CRITICAL"],
      ["SOURCE_FAILURES", "CRITICAL"],
      ["SOURCE_RATE_LIMITED", "WARNING"],
    ],
  );

  const disabled = assessSourceHealth(
    {
      status: "DISABLED",
      freshnessWindowMinutes: 60,
      lastSuccessAt: null,
      consecutiveFailures: 0,
      rateLimitedUntil: null,
    },
    now,
  );
  assert.equal(disabled.health, "DISABLED");
  assert.deepEqual(disabled.alerts, []);
});
