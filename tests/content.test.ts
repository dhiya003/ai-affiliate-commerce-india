import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { generateLocalContent } from "../lib/content/local-generator.ts";
import { extractOutputText } from "../lib/content/response.ts";
import { contentBundleSchema } from "../lib/content/schema.ts";
import type { Product } from "../lib/products/types.ts";

const product: Product = {
  id: "amazon-earbuds",
  ownerEmail: null,
  marketplace: "Amazon",
  marketplaceProductId: "AMZ-EARBUDS-001",
  name: "SonicPods Wireless Earbuds",
  description: "Compact wireless earbuds with a charging case.",
  productUrl: "https://www.amazon.in/example",
  affiliateUrl: null,
  imageUrl: null,
  category: "Electronics",
  sellerName: "Sonic Retail",
  currentPrice: 999,
  originalPrice: 1_999,
  rating: 4.3,
  reviewCount: 8_420,
  commissionRate: 5,
  sellerRating: 4.5,
  stockStatus: "IN_STOCK",
  returnRisk: "LOW",
  status: "NEW",
  notes: null,
  tags: ["audio", "under-1000"],
  opportunityScore: 82,
  score: null,
  createdAt: "2026-07-26T00:00:00.000Z",
  updatedAt: "2026-07-26T00:00:00.000Z",
};

test("built-in generator creates a complete affiliate-ready bundle", () => {
  const bundle = contentBundleSchema.parse(generateLocalContent(product));

  assert.equal(bundle.reelHooks.length, 3);
  assert.match(bundle.reelScript30, /affiliate link/i);
  assert.match(bundle.reelScript60, /₹999/);
  assert.ok(bundle.hashtags.length >= 6);
  assert.ok((bundle.storyFrames?.length ?? 0) >= 3);
  assert.match(bundle.creativeImagePrompt ?? "", /Do not invent/i);
  assert.match(bundle.landingPageBody ?? "", /affiliate link/i);
  assert.match(bundle.affiliateDisclosure, /commission/i);
});

test("provider extracts structured output from Responses API payloads", () => {
  assert.equal(
    extractOutputText({
      output: [
        {
          content: [
            { type: "refusal", text: "ignored" },
            { type: "output_text", text: '{"summary":"ready"}' },
          ],
        },
      ],
    }),
    '{"summary":"ready"}',
  );
  assert.equal(extractOutputText({ output: [] }), null);
});

test("second Sites migration adds durable generated-content storage", async () => {
  const sql = await readFile(
    new URL("../drizzle/0001_tiresome_kitty_pryde.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /CREATE TABLE `generated_content`/);
  assert.match(sql, /FOREIGN KEY \(`product_id`\).*ON DELETE cascade/);
  assert.match(sql, /generated_content_product_creator_time_idx/);
});
