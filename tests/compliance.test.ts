import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCompliance } from "../lib/compliance/engine.ts";
import type { ContentBundle } from "../lib/content/schema.ts";
import type { Product } from "../lib/products/types.ts";

const product: Product = {
  id: "product-1",
  ownerEmail: "operator@example.com",
  marketplace: "Amazon",
  marketplaceProductId: "AMZ-BLUE-001",
  name: "Acme Blue Travel Bottle",
  description: "A reusable travel bottle.",
  productUrl: "https://example.com/product",
  affiliateUrl: "https://example.com/affiliate",
  imageUrl: null,
  category: "Kitchen",
  sellerName: "Acme Retail",
  currentPrice: 800,
  originalPrice: 1000,
  rating: 4.4,
  reviewCount: 200,
  commissionRate: 5,
  sellerRating: 4.5,
  stockStatus: "IN_STOCK",
  returnRisk: "LOW",
  status: "NEW",
  notes: null,
  tags: [],
  opportunityScore: null,
  score: null,
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

const content: ContentBundle = {
  summary:
    "The Acme Blue Travel Bottle is available on Amazon for everyday hydration.",
  whyPromote:
    "Its reusable design and portable size make it useful for commuters and travellers.",
  targetAudiences: ["Daily commuters", "Frequent travellers"],
  reelHooks: [
    "A bottle designed for busy travel days",
    "A reusable pick for your daily commute",
    "See this blue travel bottle up close",
  ],
  reelScript30:
    "Meet the Acme Blue Travel Bottle on Amazon. It is a practical reusable option for travel and daily commutes.",
  reelScript60:
    "The Acme Blue Travel Bottle on Amazon offers a portable reusable design. Review the product details and current availability before buying.",
  caption:
    "The Acme Blue Travel Bottle is currently ₹800 on Amazon, which is 20% off the listed ₹1,000 price. Check the current listing before purchase.",
  hashtags: [
    "#TravelBottle",
    "#Reusable",
    "#AmazonIndia",
    "#DailyCarry",
    "#Hydration",
    "#Affiliate",
  ],
  ctas: [
    "Check current availability",
    "Review the product details",
    "See the latest Amazon listing",
  ],
  thumbnailTexts: [
    "Travel bottle close-up",
    "Reusable daily carry",
    "Blue bottle details",
  ],
  pros: ["Portable reusable design", "Suitable for daily travel"],
  cautions: ["Verify price and availability before purchase"],
  affiliateDisclosure:
    "As an Amazon Associate I earn from qualifying purchases. Affiliate link.",
};

test("compliance passes exact, disclosed, price-accurate content", () => {
  const evaluation = evaluateCompliance({ product, content });
  assert.equal(evaluation.status, "PASS");
  assert.equal(evaluation.exportBlocked, false);
  assert.ok(evaluation.results.every((item) => item.status === "PASS"));
});

test("compliance blocks missing disclosure and misleading price claims", () => {
  const evaluation = evaluateCompliance({
    product,
    content: {
      ...content,
      caption:
        "The Acme Blue Travel Bottle is ₹500 on Amazon and offers 70% off today.",
      affiliateDisclosure: "Learn more about this product today.",
    },
  });
  assert.equal(evaluation.status, "FAIL");
  assert.equal(evaluation.highestSeverity, "BLOCKING");
  assert.equal(evaluation.exportBlocked, true);
  const failedCodes = evaluation.results
    .filter((item) => item.status === "FAIL")
    .map((item) => item.ruleCode);
  assert.ok(failedCodes.includes("CURRENT_PRICE"));
  assert.ok(failedCodes.includes("MISLEADING_DISCOUNT"));
  assert.ok(failedCodes.includes("AFFILIATE_DISCLOSURE"));
});

test("compliance blocks prohibited and unsupported medical claims", () => {
  const evaluation = evaluateCompliance({
    product,
    content: {
      ...content,
      whyPromote:
        "This miracle cure guarantees results and cures diabetes instantly.",
    },
  });
  assert.equal(evaluation.exportBlocked, true);
  assert.equal(
    evaluation.results.find((item) => item.ruleCode === "PROHIBITED_CLAIMS")
      ?.status,
    "FAIL",
  );
  assert.equal(
    evaluation.results.find(
      (item) => item.ruleCode === "UNSUPPORTED_PRODUCT_CLAIMS",
    )?.status,
    "FAIL",
  );
});

test("compliance verifies product colour and exact-product identity", () => {
  const evaluation = evaluateCompliance({
    product: {
      ...product,
      name: "Unique Purple Widget XYZ",
      marketplaceProductId: "UNIQUE-XYZ-999",
    },
    content: {
      ...content,
      summary: "A portable bottle listing for everyday hydration and commutes.",
      reelScript30:
        "This useful product is made for travel days and daily commutes.",
      reelScript60:
        "Review the current listing, product details, and availability before buying.",
      caption:
        "A practical travel pick on Amazon for ₹800, currently 20% off ₹1,000.",
    },
  });
  assert.equal(
    evaluation.results.find((item) => item.ruleCode === "EXACT_PRODUCT_MATCH")
      ?.status,
    "FAIL",
  );
  assert.equal(
    evaluation.results.find((item) => item.ruleCode === "PRODUCT_COLOUR")
      ?.status,
    "FAIL",
  );
});
