import type { ManualIngestionInput, SourceRecord } from "./schema.ts";
import type {
  MarketplaceName,
  NormalizedProduct,
  ProductSourceAdapter,
} from "./types.ts";

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalProductKey(product: {
  name: string;
  brand: string | null;
  category: string;
}): string {
  return [
    normalizeText(product.brand ?? "unbranded"),
    normalizeText(product.name),
    normalizeText(product.category),
  ].join(":");
}

export function isSourceRecordStale(
  sourceTimestamp: string,
  freshnessWindowMinutes: number,
  now = new Date(),
): boolean {
  const age = now.getTime() - new Date(sourceTimestamp).getTime();
  return age > freshnessWindowMinutes * 60_000;
}

export function matchStatusForConfidence(
  confidence: number,
): "EXACT" | "PROBABLE" | "REVIEW" {
  if (confidence >= 0.95) return "EXACT";
  if (confidence >= 0.75) return "PROBABLE";
  return "REVIEW";
}

export function retryDelayMinutes(attempt: number): number {
  return Math.min(360, 5 * 2 ** Math.max(0, attempt - 1));
}

export class ManualSourceAdapter implements ProductSourceAdapter<SourceRecord> {
  readonly sourceType = "MANUAL" as const;
  readonly marketplace: MarketplaceName;

  constructor(marketplace: MarketplaceName) {
    this.marketplace = marketplace;
  }

  normalize(record: SourceRecord): NormalizedProduct {
    return {
      marketplace: this.marketplace,
      marketplaceProductId: record.marketplaceProductId.trim(),
      name: record.name.trim(),
      brand: record.brand?.trim() || null,
      description: record.description?.trim() || null,
      productUrl: record.productUrl,
      affiliateUrl: record.affiliateUrl ?? null,
      imageUrl: record.imageUrl ?? null,
      category: record.category.trim(),
      sellerName: record.sellerName?.trim() || null,
      currentPrice: record.currentPrice,
      originalPrice: record.originalPrice ?? null,
      rating: record.rating ?? null,
      reviewCount: record.reviewCount,
      commissionRate: record.commissionRate ?? null,
      sellerRating: record.sellerRating ?? null,
      stockStatus: record.stockStatus,
      returnRisk: record.returnRisk,
      sourceTimestamp: record.sourceTimestamp,
      availabilityStatus: record.availabilityStatus,
      confidence: record.confidence,
      sourceAttributes: {},
    };
  }
}

export function adapterForManualInput(
  input: ManualIngestionInput,
): ManualSourceAdapter {
  return new ManualSourceAdapter(input.marketplace);
}
