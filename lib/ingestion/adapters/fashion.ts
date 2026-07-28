import { z } from "zod";
import type { MarketplaceFeedClient, NormalizedProduct } from "../types.ts";
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

const fashionVariationSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  size: z.string().trim().min(1).max(80),
  colour: z.string().trim().min(1).max(80),
  available: z.boolean(),
  price: positivePrice.nullable().optional(),
});

function fashionSchema(
  marketplace: "Myntra" | "AJIO",
  domains: readonly string[],
) {
  const productUrl = marketplaceUrl(domains, marketplace);
  return z
    .object({
      styleId: z.string().trim().min(3).max(120),
      title: z.string().trim().min(3).max(500),
      brand: z.string().trim().max(160).nullable(),
      description: z.string().trim().max(5000).nullable(),
      productUrl,
      affiliateUrl: productUrl.nullable(),
      imageUrl: z.url().nullable(),
      category: z.string().trim().min(2).max(160),
      price: positivePrice,
      maximumRetailPrice: positivePrice.nullable(),
      discountPercent: z.number().finite().min(0).max(100).nullable(),
      rating: optionalRating,
      reviewCount: z.number().int().nonnegative(),
      available: z.boolean().nullable(),
      commissionRate: optionalRate,
      variations: z.array(fashionVariationSchema).min(1).max(500),
      observedAt: timestamp,
    })
    .refine(
      (value) =>
        validatePricePair({
          price: value.price,
          originalPrice: value.maximumRetailPrice,
        }),
      {
        message: `${marketplace} MRP cannot be lower than current price.`,
        path: ["maximumRetailPrice"],
      },
    )
    .refine(
      (value) => {
        if (value.maximumRetailPrice == null || value.discountPercent == null) {
          return true;
        }
        const calculated =
          ((value.maximumRetailPrice - value.price) /
            value.maximumRetailPrice) *
          100;
        return Math.abs(calculated - value.discountPercent) <= 1;
      },
      {
        message: `${marketplace} discount must match price and MRP.`,
        path: ["discountPercent"],
      },
    )
    .refine(
      (value) =>
        value.available == null ||
        value.available === value.variations.some((item) => item.available),
      {
        message: `${marketplace} availability must agree with variations.`,
        path: ["available"],
      },
    );
}

export const myntraProductSchema = fashionSchema("Myntra", ["myntra.com"]);
export const ajioProductSchema = fashionSchema("AJIO", ["ajio.com"]);
export type MyntraProduct = z.infer<typeof myntraProductSchema>;
export type AjioProduct = z.infer<typeof ajioProductSchema>;

abstract class FashionAdapter<
  T extends MyntraProduct | AjioProduct,
> extends BaseMarketplaceAdapter<T> {
  protected normalized(record: T): NormalizedProduct {
    return {
      marketplace: this.marketplace,
      marketplaceProductId: record.styleId,
      name: record.title,
      brand: record.brand,
      description: record.description,
      productUrl: record.productUrl,
      affiliateUrl: record.affiliateUrl,
      imageUrl: record.imageUrl,
      category: record.category,
      sellerName: null,
      currentPrice: record.price,
      originalPrice: record.maximumRetailPrice,
      rating: record.rating,
      reviewCount: record.reviewCount,
      commissionRate: record.commissionRate,
      sellerRating: null,
      stockStatus: stockStatus(record.available),
      returnRisk: "UNKNOWN",
      sourceTimestamp: record.observedAt,
      availabilityStatus: availability(record.available),
      confidence: record.available == null ? 0.78 : 0.94,
      sourceAttributes: {
        styleId: record.styleId,
        discountPercent: record.discountPercent,
        sizes: [...new Set(record.variations.map((item) => item.size))],
        colours: [...new Set(record.variations.map((item) => item.colour))],
        variations: record.variations,
      },
    };
  }
}

export class MyntraAdapter extends FashionAdapter<MyntraProduct> {
  readonly marketplace = "Myntra" as const;

  constructor(client: MarketplaceFeedClient<MyntraProduct>) {
    super(client, z.array(myntraProductSchema).max(1000));
  }

  normalize(record: MyntraProduct): NormalizedProduct {
    return this.normalized(myntraProductSchema.parse(record));
  }
}

export class AjioAdapter extends FashionAdapter<AjioProduct> {
  readonly marketplace = "AJIO" as const;

  constructor(client: MarketplaceFeedClient<AjioProduct>) {
    super(client, z.array(ajioProductSchema).max(1000));
  }

  normalize(record: AjioProduct): NormalizedProduct {
    return this.normalized(ajioProductSchema.parse(record));
  }
}
