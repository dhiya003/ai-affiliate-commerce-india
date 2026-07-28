import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  contentVariationInputSchema,
  experimentActionSchema,
  experimentInputSchema,
} from "../lib/experiments/schema.ts";
import { twoProportionConfidence } from "../lib/experiments/statistics.ts";

const variationIds = ["variation-a", "variation-b"];

test("content variations require testable creative content", () => {
  assert.equal(
    contentVariationInputSchema.safeParse({
      productId: "product-1",
      label: "Hook A",
      platform: "Instagram Reels",
      hook: "Stop scrolling—this solves the daily commute problem.",
      hashtags: ["#affiliate"],
    }).success,
    true,
  );
  assert.equal(
    contentVariationInputSchema.safeParse({
      productId: "product-1",
      label: "Empty",
      platform: "Instagram Reels",
    }).success,
    false,
  );
});

test("experiments require unique variations and exactly 100 percent allocation", () => {
  const base = {
    productId: "product-1",
    name: "Hook comparison",
    hypothesis:
      "A problem-first hook will convert better than a discount-first hook.",
    primaryMetric: "CONVERSION_RATE" as const,
    confidenceThreshold: 0.95,
  };
  assert.equal(
    experimentInputSchema.safeParse({
      ...base,
      variations: variationIds.map((variationId) => ({
        variationId,
        allocationPercent: 50,
      })),
    }).success,
    true,
  );
  assert.equal(
    experimentInputSchema.safeParse({
      ...base,
      variations: [
        { variationId: "variation-a", allocationPercent: 70 },
        { variationId: "variation-b", allocationPercent: 20 },
      ],
    }).success,
    false,
  );
  assert.equal(
    experimentInputSchema.safeParse({
      ...base,
      variations: [
        { variationId: "variation-a", allocationPercent: 50 },
        { variationId: "variation-a", allocationPercent: 50 },
      ],
    }).success,
    false,
  );
});

test("experiment confidence grows with stronger conversion separation", () => {
  const smallDifference = twoProportionConfidence(12, 100, 10, 100);
  const largeDifference = twoProportionConfidence(30, 100, 10, 100);
  assert.ok(smallDifference >= 0 && smallDifference < 0.5);
  assert.ok(largeDifference > 0.95);
  assert.equal(twoProportionConfidence(0, 0, 0, 0), 0);
});

test("winner selection is explicit and confidence gated", async () => {
  assert.deepEqual(
    experimentActionSchema.parse({
      action: "select-winner",
      variationId: "variation-a",
    }),
    { action: "select-winner", variationId: "variation-a" },
  );
  const repository = await readFile(
    new URL("../lib/experiments/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    repository,
    /winner\.result\.confidence < experiment\.confidenceThreshold/,
  );
  assert.match(repository, /EXPERIMENT_CONFIDENCE_TOO_LOW/);
  assert.match(repository, /owner_email = \?/);
  assert.match(repository, /two-proportion normal approximation/);
});
