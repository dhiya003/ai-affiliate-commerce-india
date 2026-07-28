import assert from "node:assert/strict";
import test from "node:test";
import { calculateOpportunityScoreV2 } from "../lib/scoring/v2.ts";
import { assessTrendSignals } from "../lib/trends/engine.ts";

const now = new Date("2026-07-29T12:00:00.000Z");

test("trend assessment calculates seven and 30 day windows", () => {
  const result = assessTrendSignals(
    [
      {
        type: "GOOGLE_TRENDS",
        source: "Google Trends",
        value: 82,
        normalizedScore: 82,
        confidence: 0.9,
        observedAt: "2026-07-28T12:00:00.000Z",
      },
      {
        type: "REVIEW_GROWTH",
        source: "Marketplace reviews",
        value: 0,
        normalizedScore: 0,
        confidence: 0.8,
        observedAt: "2026-07-12T12:00:00.000Z",
      },
    ],
    now,
  );
  assert.equal(result.sevenDay.signalCount, 1);
  assert.equal(result.thirtyDay.signalCount, 2);
  assert.ok(result.sevenDay.score > result.thirtyDay.score);
  assert.equal(result.direction, "SPIKING");
});

test("trend assessment ignores expired evidence", () => {
  const result = assessTrendSignals(
    [
      {
        type: "SOCIAL_MENTIONS",
        source: "Social listening",
        value: 100,
        normalizedScore: 100,
        confidence: 1,
        observedAt: "2026-07-28T12:00:00.000Z",
        expiresAt: "2026-07-29T11:00:00.000Z",
      },
    ],
    now,
  );
  assert.equal(result.sevenDay.signalCount, 0);
  assert.equal(result.sevenDay.score, 0);
});

const completeV2Input = {
  productId: "product-1",
  marketplace: "Amazon" as const,
  category: "Audio",
  currentPrice: 2000,
  commissionRate: 10,
  returnRisk: "LOW" as const,
  ratingScore: 90,
  reviewGrowthScore: 85,
  demandScore: 88,
  trendScore: 92,
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
};

test("scoring v2 emits explainable evidence and net commission", () => {
  const result = calculateOpportunityScoreV2(completeV2Input);
  assert.equal(result.version, "v2.0.0");
  assert.ok(result.opportunityScore > 70);
  assert.equal(result.grossCommissionEstimate, 200);
  assert.equal(result.netCommissionEstimate, 192);
  assert.equal(result.explanation.missingFactors.length, 0);
  assert.equal(result.explanation.strongestFactors.length, 3);
});

test("scoring v2 penalizes missing evidence and source uncertainty", () => {
  const complete = calculateOpportunityScoreV2(completeV2Input);
  const weak = calculateOpportunityScoreV2({
    ...completeV2Input,
    trendScore: null,
    demandScore: null,
    viralityScore: null,
    sourceConfidence: 0.4,
  });
  assert.ok(weak.opportunityScore < complete.opportunityScore);
  assert.equal(weak.penalties.missingDataPenalty, 6);
  assert.equal(weak.penalties.sourceConfidencePenalty, 12);
  assert.match(weak.explanation.cautions.join(" "), /Low source confidence/);
});

test("marketplace and category multipliers change factor contributions", () => {
  const result = calculateOpportunityScoreV2({
    ...completeV2Input,
    marketplaceWeights: { trendScore: 1.5 },
    categoryWeights: { trendScore: 1.25 },
  });
  assert.equal(result.weights.trendScore, 0.2063);
});
