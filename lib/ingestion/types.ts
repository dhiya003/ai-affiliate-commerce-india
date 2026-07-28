export const MARKETPLACES = [
  "Amazon",
  "Flipkart",
  "Meesho",
  "Myntra",
  "AJIO",
] as const;

export type MarketplaceName = (typeof MARKETPLACES)[number];
export type SourceStatus =
  "READY" | "RUNNING" | "DEGRADED" | "RATE_LIMITED" | "DISABLED";
export type RunStatus =
  "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED" | "RETRY_SCHEDULED";
export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
export type MatchStatus = "EXACT" | "PROBABLE" | "REVIEW";
export type SourceFreshnessStatus =
  "NEVER_SYNCED" | "FRESH" | "AGING" | "STALE";

export interface SourceAlert {
  code:
    | "SOURCE_NEVER_SYNCED"
    | "SOURCE_STALE"
    | "SOURCE_FAILURES"
    | "SOURCE_RATE_LIMITED";
  severity: "WARNING" | "CRITICAL";
  message: string;
}

export interface NormalizedProduct {
  marketplace: MarketplaceName;
  marketplaceProductId: string;
  name: string;
  brand: string | null;
  description: string | null;
  productUrl: string;
  affiliateUrl: string | null;
  imageUrl: string | null;
  category: string;
  sellerName: string | null;
  currentPrice: number;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number;
  commissionRate: number | null;
  sellerRating: number | null;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  returnRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  sourceTimestamp: string;
  availabilityStatus: AvailabilityStatus;
  confidence: number;
  sourceAttributes: Record<string, unknown>;
}

export interface MarketplaceFeedClient<T> {
  fetchProducts(signal?: AbortSignal): Promise<readonly T[]>;
}

export interface ProductSourceAdapter<T = unknown> {
  readonly marketplace: MarketplaceName;
  readonly sourceType: "MANUAL" | "API" | "FEED";
  normalize(record: T): NormalizedProduct;
}

export interface MarketplaceAdapter<
  T = unknown,
> extends ProductSourceAdapter<T> {
  fetch(signal?: AbortSignal): Promise<readonly T[]>;
}

export interface IngestionSummary {
  runId: string;
  status: RunStatus;
  attemptedCount: number;
  importedCount: number;
  updatedCount: number;
  matchedCount: number;
  duplicateCount: number;
  failedCount: number;
  retryCount: number;
  nextRetryAt: string | null;
}

export interface SourceHealth {
  id: string;
  marketplace: MarketplaceName;
  name: string;
  sourceType: "MANUAL" | "API" | "FEED";
  status: SourceStatus;
  freshnessWindowMinutes: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
  rateLimitedUntil: string | null;
  health: "HEALTHY" | "STALE" | "DEGRADED" | "DISABLED";
  freshness: {
    status: SourceFreshnessStatus;
    ageMinutes: number | null;
    remainingMinutes: number | null;
    staleAt: string | null;
  };
  alerts: SourceAlert[];
  latestRun: {
    id: string;
    status: RunStatus;
    startedAt: string;
    completedAt: string | null;
    importedCount: number;
    updatedCount: number;
    duplicateCount: number;
    failedCount: number;
  } | null;
}
