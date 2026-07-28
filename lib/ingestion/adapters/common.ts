import { z } from "zod";
import type {
  AvailabilityStatus,
  MarketplaceFeedClient,
  NormalizedProduct,
} from "../types.ts";

export const httpsUrl = z
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Marketplace URLs must use HTTPS.",
  });

export function marketplaceUrl(
  hosts: readonly string[],
  label: string,
): z.ZodType<string> {
  return httpsUrl.refine(
    (value) => {
      const host = new URL(value).hostname.toLowerCase();
      return hosts.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`),
      );
    },
    { message: `${label} URL must use an approved marketplace domain.` },
  );
}

export const optionalRating = z.number().finite().min(0).max(5).nullable();
export const optionalRate = z.number().finite().min(0).max(100).nullable();
export const positivePrice = z.number().finite().positive().max(100_000_000);
export const timestamp = z.iso.datetime();

export function validatePricePair(value: {
  price: number;
  originalPrice: number | null;
}) {
  return value.originalPrice == null || value.originalPrice >= value.price;
}

export function availability(available: boolean | null): AvailabilityStatus {
  return available == null
    ? "UNKNOWN"
    : available
      ? "AVAILABLE"
      : "UNAVAILABLE";
}

export function stockStatus(
  available: boolean | null,
  lowStock = false,
): NormalizedProduct["stockStatus"] {
  if (available == null) return "UNKNOWN";
  if (!available) return "OUT_OF_STOCK";
  return lowStock ? "LOW_STOCK" : "IN_STOCK";
}

export abstract class BaseMarketplaceAdapter<T> {
  abstract readonly marketplace: NormalizedProduct["marketplace"];
  readonly sourceType = "API" as const;
  protected readonly client: MarketplaceFeedClient<T>;
  private readonly collectionSchema: z.ZodType<readonly T[]>;

  constructor(
    client: MarketplaceFeedClient<T>,
    collectionSchema: z.ZodType<readonly T[]>,
  ) {
    this.client = client;
    this.collectionSchema = collectionSchema;
  }

  async fetch(signal?: AbortSignal): Promise<readonly T[]> {
    return this.collectionSchema.parse(await this.client.fetchProducts(signal));
  }

  abstract normalize(record: T): NormalizedProduct;
}
