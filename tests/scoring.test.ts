import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOpportunityScore,
  calculateOpportunityScores,
  SCORE_VERSION,
  type ProductScoringInput,
} from "../lib/scoring/index.ts";

const strongProduct: ProductScoringInput = {
  productId: "strong-product",
  rating: 4.7,
  reviewCount: 8_500,
  currentPrice: 699,
  originalPrice: 1_499,
  commissionRate: 12,
  sellerRating: 4.8,
  returnRisk: "LOW",
  competitionScore: 82,
  trendScore: 88,
  demandScore: 84,
};

test("calculates a normalized, versioned opportunity score", () => {
  const result = calculateOpportunityScore(strongProduct);

  assert.equal(result.version, SCORE_VERSION);
  assert.ok(result.opportunityScore >= 80);
  assert.ok(result.opportunityScore <= 100);
  assert.equal(result.commissionEstimate, 83.88);
  assert.equal(result.breakdown.returnRiskPenalty, 2);
  assert.equal(result.explanation.placeholders.length, 0);
});

test("uses conservative defaults and explains missing data", () => {
  const result = calculateOpportunityScore({
    ...strongProduct,
    productId: "missing-data",
    rating: null,
    sellerRating: null,
    commissionRate: null,
    competitionScore: null,
    trendScore: null,
    demandScore: null,
  });

  assert.equal(result.breakdown.ratingScore, 40);
  assert.equal(result.breakdown.sellerQualityScore, 45);
  assert.equal(result.breakdown.trendScore, 50);
  assert.equal(result.commissionEstimate, 0);
  assert.deepEqual(result.explanation.placeholders, [
    "competition",
    "trend",
    "demand",
  ]);
  assert.match(result.explanation.cautions[0] ?? "", /Missing data/);
});

test("applies a larger penalty to high-return-risk products", () => {
  const lowRisk = calculateOpportunityScore(strongProduct);
  const highRisk = calculateOpportunityScore({
    ...strongProduct,
    productId: "high-risk",
    returnRisk: "HIGH",
  });

  assert.equal(lowRisk.opportunityScore - highRisk.opportunityScore, 13);
  assert.match(highRisk.explanation.cautions.join(" "), /High return risk/);
});

test("rejects invalid product data without aborting a bulk calculation", () => {
  const results = calculateOpportunityScores([
    strongProduct,
    {
      ...strongProduct,
      productId: "invalid-price",
      currentPrice: 1_500,
      originalPrice: 1_000,
    },
  ]);

  assert.equal(results[0]?.success, true);
  assert.equal(results[1]?.success, false);
  if (!results[1]?.success) {
    assert.match(results[1].error, /Original price/);
  }
});
