import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prismaSchema = await readFile(
  new URL("../prisma/schema.prisma", import.meta.url),
  "utf8",
);
const postgresMigration = await readFile(
  new URL(
    "../prisma/migrations/20260729230000_phase3_campaign_tracking_foundation/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

const phase3Models = [
  "CreatorAccount",
  "Campaign",
  "ContentVariation",
  "CampaignPromotion",
  "TrackedLink",
  "ClickEvent",
  "ConversionEvent",
  "CommissionEvent",
] as const;

test("Phase 3 Prisma schema defines every campaign and attribution model", () => {
  for (const model of phase3Models) {
    assert.match(prismaSchema, new RegExp(`model ${model} \\{`));
    assert.match(postgresMigration, new RegExp(`CREATE TABLE "${model}"`));
  }
});

test("Phase 3 records retain ownership, lineage, and privacy-safe order identity", () => {
  for (const model of [
    "CreatorAccount",
    "Campaign",
    "ContentVariation",
    "CampaignPromotion",
    "TrackedLink",
    "ConversionEvent",
    "CommissionEvent",
  ]) {
    const modelBody = prismaSchema.match(
      new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`),
    )?.[1];
    assert.ok(modelBody, `${model} model is missing`);
    assert.match(modelBody, /ownerEmail\s+String/);
  }
  assert.match(prismaSchema, /externalOrderIdHash\s+String/);
  assert.doesNotMatch(prismaSchema, /externalOrderId\s+String/);
  assert.match(
    prismaSchema,
    /@@unique\(\[marketplace, externalOrderIdHash\]\)/,
  );
});

test("Phase 3 tracking schema supports deduplication and suspicious-click review", () => {
  assert.match(prismaSchema, /trackingId\s+String\s+@unique/);
  assert.match(prismaSchema, /shortPath\s+String\s+@unique/);
  assert.match(prismaSchema, /isBot\s+Boolean/);
  assert.match(prismaSchema, /isDuplicate\s+Boolean/);
  assert.match(prismaSchema, /suspiciousReason\s+String\?/);
  assert.match(postgresMigration, /ClickEvent_fingerprintHash_clickedAt_idx/);
});
