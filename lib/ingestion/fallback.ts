import type { MarketplaceName } from "./types.ts";

export interface MarketplaceSourceRoute {
  marketplace: MarketplaceName;
  mode: "PARTNER" | "MANUAL_FALLBACK" | "UNAVAILABLE";
  sourceId: string | null;
  reason: string;
}

export async function resolveMarketplaceSourceRoutes(db: D1Database) {
  const sources = await db
    .prepare(
      `SELECT id, marketplace, source_type, status, consecutive_failures,
        rate_limited_until FROM product_sources
       ORDER BY marketplace, CASE source_type WHEN 'API' THEN 0 WHEN 'FEED' THEN 1 ELSE 2 END`,
    )
    .all<{
      id: string;
      marketplace: MarketplaceName;
      source_type: "API" | "FEED" | "MANUAL";
      status: string;
      consecutive_failures: number;
      rate_limited_until: string | null;
    }>();
  const marketplaces: MarketplaceName[] = [
    "Amazon",
    "Flipkart",
    "Meesho",
    "Myntra",
    "AJIO",
  ];
  return marketplaces.map((marketplace): MarketplaceSourceRoute => {
    const candidates = sources.results.filter(
      (source) => source.marketplace === marketplace,
    );
    const partner = candidates.find(
      (source) =>
        source.source_type !== "MANUAL" &&
        source.status !== "DISABLED" &&
        source.consecutive_failures < 3 &&
        (!source.rate_limited_until ||
          new Date(source.rate_limited_until).getTime() <= Date.now()),
    );
    if (partner) {
      return {
        marketplace,
        mode: "PARTNER",
        sourceId: partner.id,
        reason: "Healthy partner source selected.",
      };
    }
    const manual = candidates.find(
      (source) =>
        source.source_type === "MANUAL" && source.status !== "DISABLED",
    );
    if (manual) {
      return {
        marketplace,
        mode: "MANUAL_FALLBACK",
        sourceId: manual.id,
        reason:
          "Partner source is unavailable; verified manual ingestion remains available.",
      };
    }
    return {
      marketplace,
      mode: "UNAVAILABLE",
      sourceId: null,
      reason: "No healthy partner or manual source is available.",
    };
  });
}
