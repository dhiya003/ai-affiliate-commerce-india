import type { Product } from "@/lib/products/types";
import type { ContentBundle } from "./schema";

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hashtag(value: string): string {
  return `#${value.replace(/[^A-Za-z0-9]/g, "")}`;
}

export function generateLocalContent(product: Product): ContentBundle {
  const price = inr(product.currentPrice);
  const rating =
    product.rating == null
      ? "Check current buyer feedback before purchasing"
      : `rated ${product.rating}/5 from ${product.reviewCount.toLocaleString("en-IN")} reviews`;
  const discount =
    product.originalPrice && product.originalPrice > product.currentPrice
      ? `${Math.round(
          ((product.originalPrice - product.currentPrice) /
            product.originalPrice) *
            100,
        )}% below the listed original price`
      : "priced for a value-focused comparison";
  const audience = product.category.toLowerCase();
  const safeName = product.name;

  return {
    summary: `${safeName} is a ${product.marketplace} ${product.category.toLowerCase()} pick at ${price}. It is ${rating} and ${discount}.`,
    whyPromote: `This product gives creators a concrete value story: a clear ${price} price point, recognisable ${product.marketplace} purchase path, and an opportunity score of ${Math.round(product.opportunityScore ?? 0)}/100. Lead with the use case and verified product facts; invite viewers to compare the live listing before buying.`,
    targetAudiences: [
      `India-based shoppers interested in ${audience}`,
      `Value-conscious buyers comparing options around ${price}`,
      `Short-form video viewers looking for practical product discoveries`,
    ],
    reelHooks: [
      `${safeName} at ${price} — useful find or easy skip?`,
      `Before you buy another ${product.category.toLowerCase()} product, see this.`,
      `I found this ${product.marketplace} pick and checked the numbers for you.`,
    ],
    reelScript30: `Here’s a quick ${product.marketplace} find: ${safeName}, currently listed at ${price}. It is ${rating}, and the biggest content angle is practical value rather than hype. If you’re shopping for ${product.category.toLowerCase()}, compare the features and latest price on the product page. I’ve added the link for easy reference. It may be an affiliate link, so I may earn a commission at no extra cost to you.`,
    reelScript60: `Stop scrolling if you’re comparing ${product.category.toLowerCase()} options. This is ${safeName} on ${product.marketplace}, currently listed at ${price}. The listing is ${rating}, and it is ${discount}. What makes it worth considering is the straightforward use case and accessible price point. Before buying, open the listing, confirm the current price, seller, delivery details and return policy, because marketplace information can change. If it fits your needs, use the link I’ve shared to take a closer look. It may be an affiliate link, which means I may earn a small commission at no extra cost to you.`,
    caption: `${safeName} is on my value-watch list at ${price}. If you’re comparing ${product.category.toLowerCase()} options, check the latest listing details, seller and return policy before deciding.\n\nThe shared link may be an affiliate link, so I may earn a commission at no extra cost to you.`,
    hashtags: Array.from(
      new Set([
        hashtag(product.marketplace),
        hashtag(product.category),
        "#IndiaDeals",
        "#ProductFinds",
        "#SmartShopping",
        "#ValueFinds",
        "#AffiliateIndia",
        "#ShoppingIndia",
        ...product.tags.slice(0, 4).map(hashtag),
      ]),
    ).slice(0, 12),
    ctas: [
      "Check the latest price and details through the link.",
      "Save this for your next product comparison.",
      "Share this with someone who is shopping in this category.",
    ],
    thumbnailTexts: [
      `${price} VALUE FIND?`,
      `${product.marketplace.toUpperCase()} PICK`,
      "BUY OR SKIP?",
    ],
    storyFrames: [
      `${safeName} on ${product.marketplace}`,
      `Currently listed at ${price}. Check live price and availability.`,
      `Review seller and return details before buying. Affiliate link may earn me a commission.`,
    ],
    creativeImagePrompt: `Create a clean vertical 9:16 affiliate story background for ${safeName}, a ${product.category.toLowerCase()} product listed on ${product.marketplace}. Use a premium neutral layout with space for a supplied official product image, the verified price ${price}, and a small affiliate disclosure. Do not invent product features, logos, discounts, ratings, or packaging.`,
    landingPageHeadline: `${safeName}: verified details before you decide`,
    landingPageBody: `${safeName} is currently listed on ${product.marketplace} at ${price}. Review the current product page, seller, delivery information and return policy before purchasing. The product link may be an affiliate link, so I may earn a commission at no extra cost to you.`,
    landingPageBullets: [
      `Current recorded price: ${price}`,
      `Marketplace: ${product.marketplace}`,
      "Confirm live availability, seller and return terms on the product page",
    ],
    pros: [
      `Accessible ${price} price point`,
      `${product.marketplace} listing is easy for viewers to verify`,
      product.rating == null
        ? "Clear use-case-led content angle"
        : `${product.rating}/5 listed rating provides social proof`,
    ],
    cautions: [
      "Confirm the latest price, stock and seller details before publishing.",
      product.returnRisk === "HIGH"
        ? "Return risk is marked high; review sizing, specifications and the return policy carefully."
        : "Encourage viewers to check the marketplace return policy before buying.",
    ],
    affiliateDisclosure:
      "This post may contain an affiliate link. I may earn a commission at no extra cost to you.",
  };
}
