import { z } from "zod";
import type {
  MarketplaceAdapter,
  MarketplaceFeedClient,
  NormalizedProduct,
} from "../types.ts";
import {
  availability,
  BaseMarketplaceAdapter,
  marketplaceUrl,
  optionalRate,
  optionalRating,
  positivePrice,
  stockStatus,
  timestamp,
  validatePricePair,
} from "./common.ts";

const amazonUrl = marketplaceUrl(["amazon.in", "amzn.to"], "Amazon");

export const amazonProductSchema = z
  .object({
    asin: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{10}$/),
    title: z.string().trim().min(3).max(500),
    brand: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(5000).nullable(),
    detailPageUrl: amazonUrl,
    affiliateUrl: amazonUrl.nullable(),
    imageUrl: z.url().nullable(),
    category: z.string().trim().min(2).max(160),
    price: positivePrice,
    originalPrice: positivePrice.nullable(),
    rating: optionalRating,
    reviewCount: z.number().int().nonnegative(),
    sellerName: z.string().trim().max(200).nullable(),
    sellerRating: optionalRating,
    available: z.boolean().nullable(),
    lowStock: z.boolean().default(false),
    commissionRate: optionalRate,
    observedAt: timestamp,
  })
  .refine(validatePricePair, {
    message: "Amazon original price cannot be lower than current price.",
    path: ["originalPrice"],
  });

export type AmazonProduct = z.infer<typeof amazonProductSchema>;

export class AmazonAdapter
  extends BaseMarketplaceAdapter<AmazonProduct>
  implements MarketplaceAdapter<AmazonProduct>
{
  readonly marketplace = "Amazon" as const;

  constructor(client: MarketplaceFeedClient<AmazonProduct>) {
    super(client, z.array(amazonProductSchema).max(1000));
  }

  normalize(record: AmazonProduct): NormalizedProduct {
    const product = amazonProductSchema.parse(record);
    return {
      marketplace: this.marketplace,
      marketplaceProductId: product.asin,
      name: product.title,
      brand: product.brand,
      description: product.description,
      productUrl: product.detailPageUrl,
      affiliateUrl: product.affiliateUrl,
      imageUrl: product.imageUrl,
      category: product.category,
      sellerName: product.sellerName,
      currentPrice: product.price,
      originalPrice: product.originalPrice,
      rating: product.rating,
      reviewCount: product.reviewCount,
      commissionRate: product.commissionRate,
      sellerRating: product.sellerRating,
      stockStatus: stockStatus(product.available, product.lowStock),
      returnRisk: "UNKNOWN",
      sourceTimestamp: product.observedAt,
      availabilityStatus: availability(product.available),
      confidence: product.available == null ? 0.8 : 0.95,
      sourceAttributes: { asin: product.asin },
    };
  }
}
