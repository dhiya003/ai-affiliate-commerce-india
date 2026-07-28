import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  defaultScoringWeights,
  qualitySnapshotSchema,
  scoringWeightActionSchema,
  scoringWeightDraftSchema,
} from "../lib/optimization/schema.ts";
import { calculateOpportunityScoreV2 } from "../lib/scoring/v2.ts";

test("scoring-weight drafts require semantic versions and normalized weights", () => {
  const valid = {
    version: "v2.1.0",
    weights: defaultScoringWeights,
    evidenceFrom: "2026-05-01T00:00:00.000Z",
    evidenceTo: "2026-07-29T23:59:59.000Z",
    observationCount: 100,
    reason:
      "Increase evidence-backed category conversion sensitivity after review.",
  };
  assert.equal(scoringWeightDraftSchema.safeParse(valid).success, true);
  assert.equal(
    scoringWeightDraftSchema.safeParse({
      ...valid,
      version: "latest",
    }).success,
    false,
  );
  assert.equal(
    scoringWeightDraftSchema.safeParse({
      ...valid,
      weights: {
        ...defaultScoringWeights,
        factorWeights: {
          ...defaultScoringWeights.factorWeights,
          trendScore: 0.2,
        },
      },
    }).success,
    false,
  );
});

test("marketplace and category multipliers are bounded", () => {
  const result = scoringWeightDraftSchema.safeParse({
    version: "v2.1.0",
    weights: {
      ...defaultScoringWeights,
      marketplaceMultipliers: {
        Amazon: { trendScore: 1.25 },
      },
      categoryMultipliers: {
        Electronics: { commissionScore: 0.75 },
      },
    },
    evidenceFrom: "2026-05-01T00:00:00.000Z",
    evidenceTo: "2026-07-29T23:59:59.000Z",
    observationCount: 100,
    reason: "Bounded marketplace and category evidence adjustment proposal.",
  });
  assert.equal(result.success, true);
});

test("active scoring configuration changes scores and records model version", () => {
  const result = calculateOpportunityScoreV2({
    productId: "product-1",
    marketplace: "Amazon",
    category: "Audio",
    currentPrice: 2000,
    commissionRate: 10,
    returnRisk: "LOW",
    ratingScore: 90,
    reviewGrowthScore: 85,
    demandScore: 88,
    trendScore: 20,
    sellerReliabilityScore: 85,
    saturationScore: 65,
    viralityScore: 80,
    priceBandScore: 75,
    categoryConversionScore: 72,
    festivalRelevanceScore: 60,
    targetAudienceSizeScore: 82,
    visualAppealScore: 78,
    urgencyScore: 70,
    stockStabilityScore: 90,
    sourceConfidence: 0.95,
    modelVersion: "v2.1.0",
    factorWeights: {
      ...defaultScoringWeights.factorWeights,
      ratingScore: 0.01,
      trendScore: 0.17,
    },
  });
  assert.equal(result.version, "v2.1.0");
  assert.equal(result.weights.trendScore, 0.17);
});

test("quality windows and lifecycle actions are explicitly validated", () => {
  assert.equal(
    qualitySnapshotSchema.safeParse({
      modelVersion: "v2.1.0",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-07-29T00:00:00.000Z",
    }).success,
    true,
  );
  assert.deepEqual(scoringWeightActionSchema.parse({ action: "rollback" }), {
    action: "rollback",
  });
});

test("activation requires quality evidence, comparison, and rollback lineage", async () => {
  const repository = await readFile(
    new URL("../lib/optimization/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /QUALITY_SNAPSHOT_REQUIRED/);
  assert.match(repository, /QUALITY_EVIDENCE_INSUFFICIENT/);
  assert.match(repository, /SCORING_VERSION_DEGRADED/);
  assert.match(repository, /qualityComposite\(candidateQuality\)/);
  assert.match(repository, /previous_version_id/);
  assert.match(repository, /SCORING_VERSION_NOT_ROLLBACKABLE/);
  assert.match(repository, /status = 'ACTIVE'/);
  assert.match(repository, /breakdown_json/);
  assert.match(repository, /rawScore - penalty/);
});

test("optimization APIs are administrator-only", async () => {
  const routes = await Promise.all([
    readFile(
      new URL("../app/api/optimization/weights/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/optimization/weights/[id]/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/optimization/quality/route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  for (const route of routes) {
    assert.match(route, /requireRole\(user, \["ADMIN"\]\)/);
    assert.match(route, /ADMIN_REQUIRED/);
  }
});
