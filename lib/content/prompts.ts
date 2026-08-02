import type { Product } from "@/lib/products/types";

export const CONTENT_PROMPT_VERSION = "affiliate-bundle-v1.2.0";

export const CONTENT_SYSTEM_INSTRUCTIONS = `
You are an affiliate content strategist for Indian social-commerce creators.
Create persuasive but factual content using only the supplied product facts.
Never invent specifications, guarantees, availability, prices, commissions, or
performance claims. Treat missing facts as unknown. Write in clear Indian
English, keep rupee context natural, avoid manipulative urgency, and include a
plain affiliate disclosure. Return only the requested structured JSON.
`.trim();

export function buildContentPrompt(product: Product): string {
  const facts = {
    name: product.name,
    marketplace: product.marketplace,
    category: product.category,
    description: product.description,
    currentPriceInr: product.currentPrice,
    originalPriceInr: product.originalPrice,
    rating: product.rating,
    reviewCount: product.reviewCount,
    commissionRatePercent: product.commissionRate,
    seller: product.sellerName,
    sellerRating: product.sellerRating,
    stockStatus: product.stockStatus,
    returnRisk: product.returnRisk,
    tags: product.tags,
    opportunityScore: product.opportunityScore,
  };

  return [
    "Create one complete affiliate-ready content bundle for this product.",
    "The 30-second script should be about 65–85 words; the 60-second script about 125–165 words.",
    "Use exactly three distinct reel hooks. Hashtags must start with # and contain no spaces.",
    "Create 3–5 concise Instagram Story frames, a factual image-generation prompt that does not add unsupported product details, and mini landing-page copy with a headline, body and 3–6 bullets.",
    "Cautions must be useful purchasing considerations, not invented defects.",
    product.marketplace === "Meesho"
      ? "For Instagram, do not put any product or affiliate URL in the caption. Use Meesho AutoDM delivery, include the CTA ‘Comment LINK and I’ll send the product details to your DM.’, and place #ad at the end of the caption immediately before the separate hashtag list."
      : "Use the approved affiliate destination only in channels that support links and keep the disclosure clear.",
    "The visual prompt must preserve a reusable 9:16 template with 60% dedicated to the verified product image and 40% to factual copy. Never replace or invent the product image.",
    `Product facts:\n${JSON.stringify(facts, null, 2)}`,
  ].join("\n\n");
}
