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

const flipkartUrl = marketplaceUrl(["flipkart.com", "fkrt.it"], "Flipkart");

export const flipkartProductSchema = z
  .object({
    fsn: z.string().trim().min(6).max(80),
    title: z.string().trim().min(3).max(500),
    brand: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(5000).nullable(),
    productUrl: flipkartUrl,
    affiliateUrl: flipkartUrl.nullable(),
    imageUrl: z.url().nullable(),
    category: z.string().trim().min(2).max(160),
    sellingPrice: positivePrice,
    maximumRetailPrice: positivePrice.nullable(),
    rating: optionalRating,
    reviewCount: z.number().int().nonnegative(),
    sellerName: z.string().trim().max(200).nullable(),
    sellerRating: optionalRating,
    inStock: z.boolean().nullable(),
    commissionRate: optionalRate,
    observedAt: timestamp,
  })
  .refine(
    (value) =>
      validatePricePair({
        price: value.sellingPrice,
        originalPrice: value.maximumRetailPrice,
      }),
    {
      message: "Flipkart MRP cannot be lower than selling price.",
      path: ["maximumRetailPrice"],
    },
  );

export type FlipkartProduct = z.infer<typeof flipkartProductSchema>;

export class FlipkartAdapter
  extends BaseMarketplaceAdapter<FlipkartProduct>
  implements MarketplaceAdapter<FlipkartProduct>
{
  readonly marketplace = "Flipkart" as const;

  constructor(client: MarketplaceFeedClient<FlipkartProduct>) {
    super(client, z.array(flipkartProductSchema).max(1000));
  }

  normalize(record: FlipkartProduct): NormalizedProduct {
    const product = flipkartProductSchema.parse(record);
    return {
      marketplace: this.marketplace,
      marketplaceProductId: product.fsn,
      name: product.title,
      brand: product.brand,
      description: product.description,
      productUrl: product.productUrl,
      affiliateUrl: product.affiliateUrl,
      imageUrl: product.imageUrl,
      category: product.category,
      sellerName: product.sellerName,
      currentPrice: product.sellingPrice,
      originalPrice: product.maximumRetailPrice,
      rating: product.rating,
      reviewCount: product.reviewCount,
      commissionRate: product.commissionRate,
      sellerRating: product.sellerRating,
      stockStatus: stockStatus(product.inStock),
      returnRisk: "UNKNOWN",
      sourceTimestamp: product.observedAt,
      availabilityStatus: availability(product.inStock),
      confidence: product.inStock == null ? 0.8 : 0.95,
      sourceAttributes: { fsn: product.fsn },
    };
  }
}
