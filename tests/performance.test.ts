import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  attributionImportSchema,
  performanceQuerySchema,
} from "../lib/performance/schema.ts";

const attribution = {
  trackingId: `trk_${"a".repeat(32)}`,
  externalOrderId: "ORDER-PRIVATE-123",
  orderStatus: "CONFIRMED" as const,
  orderValue: 2499,
  currency: "INR",
  convertedAt: "2026-07-29T12:00:00.000Z",
  commission: {
    amount: 124.95,
    currency: "INR",
    status: "APPROVED" as const,
    observedAt: "2026-07-29T13:00:00.000Z",
    approvedAt: "2026-07-29T14:00:00.000Z",
  },
};

test("attribution imports are bounded and validate conversion and commission states", () => {
  const parsed = attributionImportSchema.parse({ records: [attribution] });
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0]?.commission?.status, "APPROVED");
  assert.equal(
    attributionImportSchema.safeParse({
      records: [{ ...attribution, orderStatus: "UNKNOWN" }],
    }).success,
    false,
  );
  assert.equal(
    attributionImportSchema.safeParse({
      records: Array.from({ length: 251 }, () => attribution),
    }).success,
    false,
  );
});

test("performance ranges default to 30 days and reject reversed windows", () => {
  const range = performanceQuerySchema.parse({
    to: "2026-07-29T00:00:00.000Z",
  });
  assert.equal(range.to, "2026-07-29T00:00:00.000Z");
  assert.equal(range.from, "2026-06-29T00:00:00.000Z");
  assert.equal(
    performanceQuerySchema.safeParse({
      from: "2026-07-30T00:00:00.000Z",
      to: "2026-07-29T00:00:00.000Z",
    }).success,
    false,
  );
});

test("conversion import hashes order identity and remains owner scoped", async () => {
  const repository = await readFile(
    new URL("../lib/performance/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    repository,
    /externalOrderIdHash = await sha256\([\s\S]*record\.externalOrderId/,
  );
  assert.match(repository, /tracking_id = \? AND owner_email = \?/);
  assert.match(repository, /id = \? AND owner_email = \?/);
  assert.doesNotMatch(repository, /external_order_id[^_]/);
});

test("performance aggregation pre-aggregates each event stream before joining", async () => {
  const repository = await readFile(
    new URL("../lib/performance/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /WITH click_agg AS/);
  assert.match(repository, /conversion_agg AS/);
  assert.match(repository, /commission_agg AS/);
  assert.match(repository, /ce\.is_bot = 0 AND ce\.is_duplicate = 0/);
  assert.match(
    repository,
    /clickThroughRateReason:[\s\S]*Impression data is not available/,
  );
});

test("attribution import is administrator-only and performance reads require identity", async () => {
  const importRoute = await readFile(
    new URL("../app/api/performance/import/route.ts", import.meta.url),
    "utf8",
  );
  const dashboardRoute = await readFile(
    new URL("../app/api/performance/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(importRoute, /requireRole\(user, \["ADMIN"\]\)/);
  assert.match(importRoute, /attributionImportSchema/);
  assert.match(dashboardRoute, /requireApiUser\(\)/);
  assert.match(dashboardRoute, /performanceQuerySchema/);
});
