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

const meeshoUrl = marketplaceUrl(["meesho.com"], "Meesho");

const meeshoVariationSchema = z.object({
  variationId: z.string().trim().min(1).max(120),
  size: z.string().trim().max(80).nullable(),
  colour: z.string().trim().max(80).nullable(),
  available: z.boolean(),
});

export const meeshoProductSchema = z
  .object({
    productId: z.string().trim().min(3).max(120),
    title: z.string().trim().min(3).max(500),
    brand: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(5000).nullable(),
    productUrl: meeshoUrl,
    affiliateUrl: meeshoUrl.nullable(),
    imageUrl: z.url().nullable(),
    category: z.string().trim().min(2).max(160),
    price: positivePrice,
    originalPrice: positivePrice.nullable(),
    rating: optionalRating,
    reviewCount: z.number().int().nonnegative(),
    supplierName: z.string().trim().max(200).nullable(),
    supplierRating: optionalRating,
    available: z.boolean().nullable(),
    deliveryDays: z.number().int().positive().max(90).nullable(),
    returnWindowDays: z.number().int().nonnegative().max(90).nullable(),
    commissionRate: optionalRate,
    comboQuantity: z.number().int().positive().max(100).default(1),
    variations: z.array(meeshoVariationSchema).max(200).default([]),
    observedAt: timestamp,
  })
  .refine(validatePricePair, {
    message: "Meesho original price cannot be lower than current price.",
    path: ["originalPrice"],
  })
  .refine(
    (value) =>
      value.variations.length === 0 ||
      value.available == null ||
      value.available === value.variations.some((item) => item.available),
    {
      message:
        "Meesho product availability must agree with its variation availability.",
      path: ["available"],
    },
  );

export type MeeshoProduct = z.infer<typeof meeshoProductSchema>;

function returnRisk(
  returnWindowDays: number | null,
): NormalizedProduct["returnRisk"] {
  if (returnWindowDays == null) return "UNKNOWN";
  if (returnWindowDays <= 3) return "HIGH";
  if (returnWindowDays <= 7) return "MEDIUM";
  return "LOW";
}

export class MeeshoAdapter
  extends BaseMarketplaceAdapter<MeeshoProduct>
  implements MarketplaceAdapter<MeeshoProduct>
{
  readonly marketplace = "Meesho" as const;

  constructor(client: MarketplaceFeedClient<MeeshoProduct>) {
    super(client, z.array(meeshoProductSchema).max(1000));
  }

  normalize(record: MeeshoProduct): NormalizedProduct {
    const product = meeshoProductSchema.parse(record);
    return {
      marketplace: this.marketplace,
      marketplaceProductId: product.productId,
      name: product.title,
      brand: product.brand,
      description: product.description,
      productUrl: product.productUrl,
      affiliateUrl: product.affiliateUrl,
      imageUrl: product.imageUrl,
      category: product.category,
      sellerName: product.supplierName,
      currentPrice: product.price,
      originalPrice: product.originalPrice,
      rating: product.rating,
      reviewCount: product.reviewCount,
      commissionRate: product.commissionRate,
      sellerRating: product.supplierRating,
      stockStatus: stockStatus(product.available),
      returnRisk: returnRisk(product.returnWindowDays),
      sourceTimestamp: product.observedAt,
      availabilityStatus: availability(product.available),
      confidence: product.available == null ? 0.78 : 0.94,
      sourceAttributes: {
        supplierName: product.supplierName,
        deliveryDays: product.deliveryDays,
        returnWindowDays: product.returnWindowDays,
        comboQuantity: product.comboQuantity,
        unitPrice: product.price / product.comboQuantity,
        variations: product.variations,
      },
    };
  }
}
