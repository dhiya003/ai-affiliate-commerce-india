import type { ContentBundle } from "@/lib/content/schema";
import type {
  ComplianceEvaluation,
  ComplianceInput,
  ComplianceResult,
  ComplianceSeverity,
} from "./types.ts";

const severityRank: Record<ComplianceSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  HIGH: 2,
  BLOCKING: 3,
};

const colorWords = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "pink",
  "yellow",
  "purple",
  "brown",
  "grey",
  "gray",
  "orange",
  "beige",
  "navy",
  "maroon",
];

function contentText(content: ContentBundle): string {
  return [
    content.summary,
    content.whyPromote,
    ...content.targetAudiences,
    ...content.reelHooks,
    content.reelScript30,
    content.reelScript60,
    content.caption,
    ...content.hashtags,
    ...content.ctas,
    ...content.thumbnailTexts,
    ...content.pros,
    ...content.cautions,
    content.affiliateDisclosure,
  ].join("\n");
}

function result(
  ruleCode: string,
  passed: boolean,
  severity: ComplianceSeverity,
  message: string,
  fixSuggestion: string | null,
  evidence: Record<string, unknown> = {},
): ComplianceResult {
  return {
    ruleCode,
    status: passed ? "PASS" : severity === "WARNING" ? "WARNING" : "FAIL",
    severity,
    message,
    fixSuggestion: passed ? null : fixSuggestion,
    evidence,
  };
}

function priceClaims(text: string): number[] {
  return [...text.matchAll(/(?:₹|rs\.?\s*)([\d,]+(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);
}

function discountClaims(text: string): number[] {
  return [...text.matchAll(/(\d{1,3})\s*%\s*(?:off|discount)/gi)].map((match) =>
    Number(match[1]),
  );
}

export function evaluateCompliance({
  product,
  content,
}: ComplianceInput): ComplianceEvaluation {
  const text = contentText(content);
  const normalized = text.toLowerCase();
  const normalizedName = product.name.toLowerCase();
  const prices = priceClaims(text);
  const expectedDiscount =
    product.originalPrice && product.originalPrice > product.currentPrice
      ? Math.round(
          ((product.originalPrice - product.currentPrice) /
            product.originalPrice) *
            100,
        )
      : 0;
  const discounts = discountClaims(text);
  const productColors = colorWords.filter((color) =>
    normalizedName.includes(color),
  );
  const restricted =
    /\b(alcohol|tobacco|cigarette|vape|weapon|gun|gambling|adult product)\b/i.test(
      `${product.category} ${product.name}`,
    );
  const prohibitedClaims = [
    ...normalized.matchAll(
      /\b(guaranteed results?|100% safe|risk[- ]free|instant cure|miracle cure|best in india)\b/gi,
    ),
  ].map((match) => match[0]);
  const unsupportedClaims = [
    ...normalized.matchAll(
      /\b(cures?|treats?|prevents?)\s+(?:diabetes|cancer|disease|illness|condition)\b/gi,
    ),
  ].map((match) => match[0]);
  const disclosurePresent =
    /\b(affiliate|ad|sponsored|commission)\b/i.test(
      content.affiliateDisclosure,
    ) && content.affiliateDisclosure.trim().length >= 10;
  const marketplaceSpecificDisclosure =
    product.marketplace === "Amazon"
      ? /amazon associate/i.test(content.affiliateDisclosure)
      : new RegExp(
          `(?:${product.marketplace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|affiliate|sponsored)`,
          "i",
        ).test(content.affiliateDisclosure);
  const productMatch =
    normalized.includes(normalizedName) ||
    normalized.includes(product.marketplaceProductId.toLowerCase());
  const marketplaceMentioned = normalized.includes(
    product.marketplace.toLowerCase(),
  );
  const incorrectPrices = prices.filter(
    (price) =>
      Math.abs(price - product.currentPrice) > 0.01 &&
      (product.originalPrice == null ||
        Math.abs(price - product.originalPrice) > 0.01),
  );
  const misleadingDiscounts = discounts.filter(
    (discount) => Math.abs(discount - expectedDiscount) > 1,
  );
  const comboClaimed = /\b(combo|bundle|pack of \d+)\b/i.test(text);

  const results: ComplianceResult[] = [
    result(
      "MARKETPLACE_TAG",
      marketplaceMentioned,
      "WARNING",
      marketplaceMentioned
        ? "Marketplace is identified correctly."
        : "The content does not name the product marketplace.",
      `Name ${product.marketplace} wherever the marketplace context is required.`,
      { expectedMarketplace: product.marketplace },
    ),
    result(
      "EXACT_PRODUCT_MATCH",
      productMatch,
      "BLOCKING",
      productMatch
        ? "Content identifies the exact product."
        : "Content cannot be tied to the exact product name or identifier.",
      "Add the exact product name or marketplace product ID before export.",
      {
        productName: product.name,
        marketplaceProductId: product.marketplaceProductId,
      },
    ),
    result(
      "PRODUCT_COLOUR",
      productColors.length === 0 ||
        productColors.every((color) => normalized.includes(color)),
      "HIGH",
      productColors.length
        ? "Colour references match the product title."
        : "No title-level colour requires verification.",
      "Use the exact colour stated in the product title.",
      { expectedColours: productColors },
    ),
    result(
      "CURRENT_PRICE",
      incorrectPrices.length === 0,
      "BLOCKING",
      incorrectPrices.length
        ? "One or more price claims do not match the current product price."
        : prices.length
          ? "All detected price claims match the current price."
          : "No explicit price claim requires verification.",
      `Use the current verified price of ₹${product.currentPrice}.`,
      { expectedPrice: product.currentPrice, detectedPrices: prices },
    ),
    result(
      "COMBO_PRICE",
      !comboClaimed || prices.length > 0,
      "HIGH",
      comboClaimed
        ? prices.length
          ? "Combo or bundle claim includes a verifiable price."
          : "A combo or bundle is claimed without a price."
        : "No combo-price claim requires verification.",
      "Add the exact combo price or remove the combo claim.",
      { comboClaimed, detectedPrices: prices },
    ),
    result(
      "AFFILIATE_DISCLOSURE",
      disclosurePresent,
      "BLOCKING",
      disclosurePresent
        ? "Affiliate relationship is disclosed."
        : "Required affiliate disclosure is missing or unclear.",
      "Add a clear disclosure such as “Affiliate link — I may earn a commission.”",
    ),
    result(
      "MARKETPLACE_SPECIFIC_DISCLOSURE",
      marketplaceSpecificDisclosure,
      "BLOCKING",
      marketplaceSpecificDisclosure
        ? `${product.marketplace} disclosure requirements are represented.`
        : `${product.marketplace}-specific disclosure language is missing.`,
      product.marketplace === "Amazon"
        ? "Add the applicable Amazon Associate disclosure before export."
        : `Name ${product.marketplace} or the affiliate relationship clearly in the disclosure.`,
      { marketplace: product.marketplace },
    ),
    result(
      "PROHIBITED_CLAIMS",
      prohibitedClaims.length === 0,
      "BLOCKING",
      prohibitedClaims.length
        ? "Content contains prohibited absolute or guaranteed claims."
        : "No prohibited absolute claim was detected.",
      "Remove guarantees, cure claims, and unverifiable superlatives.",
      { detectedClaims: prohibitedClaims },
    ),
    result(
      "MISLEADING_DISCOUNT",
      misleadingDiscounts.length === 0,
      "BLOCKING",
      misleadingDiscounts.length
        ? "A discount claim differs from the verified product prices."
        : "Detected discount claims match the verified discount.",
      `Use ${expectedDiscount}% off or omit the discount claim.`,
      { expectedDiscount, detectedDiscounts: discounts },
    ),
    result(
      "UNSUPPORTED_PRODUCT_CLAIMS",
      unsupportedClaims.length === 0,
      "BLOCKING",
      unsupportedClaims.length
        ? "Content includes unsupported health or treatment claims."
        : "No unsupported treatment claim was detected.",
      "Remove medical or treatment claims unless approved evidence and policy permit them.",
      { detectedClaims: unsupportedClaims },
    ),
    result(
      "CONTENT_ORIGINALITY",
      new Set(content.reelHooks.map((hook) => hook.toLowerCase())).size ===
        content.reelHooks.length,
      "HIGH",
      "Reel hooks were checked for internal duplication.",
      "Rewrite repeated hooks so every variant is materially distinct.",
    ),
    result(
      "RESTRICTED_CATEGORY",
      !restricted,
      "BLOCKING",
      restricted
        ? "The product appears to belong to a restricted category."
        : "No restricted-category keyword was detected.",
      "Stop export and complete a marketplace-specific restricted-category review.",
      { category: product.category },
    ),
  ];
  const failing = results.filter((item) => item.status === "FAIL");
  const warnings = results.filter((item) => item.status === "WARNING");
  const highestSeverity = results.reduce<ComplianceSeverity>(
    (highest, item) =>
      item.status !== "PASS" &&
      severityRank[item.severity] > severityRank[highest]
        ? item.severity
        : highest,
    "INFO",
  );
  return {
    status: failing.length ? "FAIL" : warnings.length ? "WARNING" : "PASS",
    highestSeverity,
    exportBlocked: failing.some((item) => item.severity === "BLOCKING"),
    results,
  };
}
