import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCompliance } from "../lib/compliance/engine.ts";
import { generateLocalContent } from "../lib/content/local-generator.ts";
import {
  buildMeeshoCreatorHandoff,
  meeshoWishlistCandidateSchema,
} from "../lib/meesho/creator-workflow.ts";
import type { Product } from "../lib/products/types.ts";

const product: Product = {
  id: "meesho-aqua",
  ownerEmail: "owner@example.com",
  marketplace: "Meesho",
  marketplaceProductId: "21ryil",
  name: "Sky Blue Colour Printed Dress",
  description: "Verified listing description",
  productUrl: "https://www.meesho.com/sky-blue-colour-printed-dress/p/21ryil",
  affiliateUrl: "https://www.meesho.com/sky-blue-colour-printed-dress/p/21ryil",
  imageUrl:
    "https://images.meesho.com/images/products/123916413/qki3h_512.avif",
  category: "Ethnic wear",
  sellerName: "Verified supplier",
  currentPrice: 504,
  originalPrice: null,
  rating: null,
  reviewCount: 0,
  commissionRate: null,
  sellerRating: null,
  stockStatus: "IN_STOCK",
  returnRisk: "UNKNOWN",
  status: "APPROVED",
  notes: null,
  tags: ["wishlist"],
  opportunityScore: 80,
  score: null,
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

test("Meesho wishlist handoff uses official Creator Club destinations", () => {
  const candidate = meeshoWishlistCandidateSchema.parse({
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl,
    title: product.name,
    imageUrl: product.imageUrl,
    category: product.category,
    price: product.currentPrice,
    originalPrice: null,
    supplierName: product.sellerName,
    observedAt: "2026-08-02T00:00:00.000Z",
  });
  const handoff = buildMeeshoCreatorHandoff(candidate);
  assert.equal(handoff.source, "MEESHO_WISHLIST");
  assert.equal(handoff.captionRules.includeProductUrl, false);
  assert.equal(handoff.captionRules.disclosurePlacement, "BEFORE_HASHTAGS");
  assert.match(handoff.affiliateLinkCreationUrl, /affiliate\.meesho\.com/);
  assert.match(handoff.autoDmEnrollmentUrl, /auto-dm-post-linking/);
  assert.deepEqual(handoff.visualTemplate, {
    aspectRatio: "9:16",
    productImagePercent: 60,
    contentPercent: 40,
    useVerifiedImageOnly: true,
  });
});

test("Meesho content uses AutoDM and never exposes a URL in the caption", () => {
  const content = generateLocalContent(product);
  assert.equal(content.linkDelivery, "AUTODM");
  assert.equal(content.autoDm?.enabled, true);
  assert.match(content.caption, /Comment LINK/);
  assert.match(content.caption, /#ad$/);
  assert.doesNotMatch(content.caption, /https?:\/\//);
  const compliance = evaluateCompliance({ product, content });
  assert.equal(
    compliance.results.find((item) => item.ruleCode === "MEESHO_AUTODM_CAPTION")
      ?.status,
    "PASS",
  );
});
