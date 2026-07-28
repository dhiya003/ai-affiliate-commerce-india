import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyDevice,
  isLikelyBot,
  safeTrafficSource,
} from "../lib/tracking/click-quality.ts";
import {
  destinationMatchesMarketplace,
  promotionInputSchema,
} from "../lib/tracking/schema.ts";

test("promotion contract requires a valid marketplace destination and publication URL", () => {
  const promotion = promotionInputSchema.parse({
    productId: "product-1",
    scheduledAt: "2026-08-01T12:00:00.000Z",
    destinationUrl: "https://www.amazon.in/dp/B0ABC12345?tag=creator-21",
  });
  assert.equal(promotion.productId, "product-1");
  assert.equal(
    promotionInputSchema.safeParse({
      ...promotion,
      publishedAt: "2026-08-01T12:00:00.000Z",
      publishedUrl: null,
    }).success,
    false,
  );
  assert.equal(
    promotionInputSchema.safeParse({
      ...promotion,
      destinationUrl: "http://www.amazon.in/insecure",
    }).success,
    false,
  );
});

test("tracked destinations require the exact marketplace domain", () => {
  assert.equal(
    destinationMatchesMarketplace(
      "Amazon",
      "https://www.amazon.in/dp/B0ABC12345",
    ),
    true,
  );
  assert.equal(
    destinationMatchesMarketplace(
      "Flipkart",
      "https://www.flipkart.com/item/p/itm123",
    ),
    true,
  );
  assert.equal(
    destinationMatchesMarketplace(
      "Meesho",
      "https://meesho.example.com/lookalike",
    ),
    false,
  );
  assert.equal(
    destinationMatchesMarketplace(
      "Myntra",
      "https://www.ajio.com/wrong-platform",
    ),
    false,
  );
  assert.equal(
    destinationMatchesMarketplace(
      "AJIO",
      "https://user:password@www.ajio.com/credential-url",
    ),
    false,
  );
});

test("click quality detects devices, bots, and bounded traffic sources", () => {
  assert.equal(
    classifyDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile",
    ),
    "MOBILE",
  );
  assert.equal(
    classifyDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"),
    "DESKTOP",
  );
  assert.equal(isLikelyBot("Googlebot/2.1"), true);
  assert.equal(isLikelyBot("Mozilla/5.0 (Macintosh)"), false);
  assert.equal(
    safeTrafficSource("https://www.instagram.com/reel/example?private=value"),
    "www.instagram.com",
  );
  assert.equal(safeTrafficSource("not-a-url"), null);
});

test("tracked redirect stores only a daily hash and sends privacy-safe headers", async () => {
  const repository = await readFile(
    new URL("../lib/tracking/repository.ts", import.meta.url),
    "utf8",
  );
  const route = await readFile(
    new URL("../app/r/[shortPath]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /fingerprintHash = await sha256/);
  assert.doesNotMatch(
    repository,
    /INSERT INTO click_events[\s\S]*cf-connecting-ip/,
  );
  assert.match(repository, /owner_email = \?/);
  assert.match(route, /"cache-control": "no-store"/);
  assert.match(route, /"referrer-policy": "no-referrer"/);
  assert.match(route, /status: 302/);
});
