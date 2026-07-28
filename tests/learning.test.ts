import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  feedbackInputSchema,
  learningRefreshSchema,
} from "../lib/learning/schema.ts";

test("recommendation feedback captures bounded outcome context", () => {
  const feedback = feedbackInputSchema.parse({
    productId: "product-1",
    action: "SUCCESSFUL",
    reason: "Converted with a problem-first hook.",
    audience: "College commuters",
    season: "Monsoon",
    festival: null,
    metadata: { source: "operator-review", confidence: 0.9 },
  });
  assert.equal(feedback.action, "SUCCESSFUL");
  assert.equal(feedback.audience, "College commuters");
  assert.equal(
    feedbackInputSchema.safeParse({
      ...feedback,
      action: "MAYBE",
    }).success,
    false,
  );
});

test("learning refresh defaults to a bounded 90 day evidence window", () => {
  const range = learningRefreshSchema.parse({
    to: "2026-07-29T00:00:00.000Z",
  });
  assert.equal(range.from, "2026-04-30T00:00:00.000Z");
  assert.equal(range.to, "2026-07-29T00:00:00.000Z");
});

test("learning profiles cover the locked conversion dimensions without multiplying events", async () => {
  const repository = await readFile(
    new URL("../lib/learning/repository.ts", import.meta.url),
    "utf8",
  );
  for (const dimension of [
    "MARKETPLACE",
    "CATEGORY",
    "PRICE_BAND",
    "COMMISSION_BAND",
    "CREATOR",
    "AUDIENCE",
    "HOOK",
    "CTA",
    "CAPTION_TONE",
  ]) {
    assert.match(repository, new RegExp(`${dimension}:`));
  }
  assert.match(repository, /dimension: "SEASON"/);
  assert.match(repository, /dimension: "FESTIVAL"/);
  assert.match(repository, /WITH click_agg AS/);
  assert.match(repository, /conversion_agg AS/);
  assert.match(repository, /commission_agg AS/);
  assert.match(
    repository,
    /ON CONFLICT\(owner_email, dimension, dimension_key\)/,
  );
});

test("learning refresh is administrator-only and feedback remains owner scoped", async () => {
  const learningRoute = await readFile(
    new URL("../app/api/learning/route.ts", import.meta.url),
    "utf8",
  );
  const feedbackRepository = await readFile(
    new URL("../lib/learning/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(learningRoute, /requireRole\(user, \["ADMIN"\]\)/);
  assert.match(feedbackRepository, /WHERE rf\.owner_email = \?/);
  assert.match(feedbackRepository, /owner_email, product_id/);
});
