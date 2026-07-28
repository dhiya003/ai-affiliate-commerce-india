import { ApiError } from "@/lib/api/errors";
import type { MarketplaceName } from "@/lib/ingestion/types";
import {
  classifyDevice,
  isLikelyBot,
  safeTrafficSource,
} from "./click-quality";
import { destinationMatchesMarketplace, type PromotionInput } from "./schema";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Tracking storage is unavailable.",
    );
  }
  return env.DB;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function trackingIdentifiers() {
  const compact = crypto.randomUUID().replaceAll("-", "");
  return {
    trackingId: `trk_${compact}`,
    shortPath: compact.slice(0, 14),
  };
}

export async function createPromotionWithTrackedLink(
  campaignId: string,
  input: PromotionInput,
  email: string,
) {
  const db = await database();
  const campaign = await db
    .prepare(
      "SELECT id FROM campaigns WHERE id = ? AND owner_email = ? AND archived_at IS NULL",
    )
    .bind(campaignId, email)
    .first<{ id: string }>();
  if (!campaign) {
    throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  }

  const product = await db
    .prepare(
      `SELECT id, marketplace FROM products
       WHERE id = ? AND (owner_email IS NULL OR owner_email = ?)`,
    )
    .bind(input.productId, email)
    .first<{ id: string; marketplace: MarketplaceName }>();
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  if (
    !destinationMatchesMarketplace(product.marketplace, input.destinationUrl)
  ) {
    throw new ApiError(
      400,
      "AFFILIATE_DESTINATION_MISMATCH",
      "The tracked destination must use the product marketplace domain.",
    );
  }

  if (input.generatedContentId) {
    const content = await db
      .prepare(
        `SELECT id FROM generated_content
         WHERE id = ? AND product_id = ? AND created_by_email = ?`,
      )
      .bind(input.generatedContentId, input.productId, email)
      .first<{ id: string }>();
    if (!content) {
      throw new ApiError(
        404,
        "GENERATED_CONTENT_NOT_FOUND",
        "Generated content not found.",
      );
    }
  }
  if (input.contentVariationId) {
    const variation = await db
      .prepare(
        `SELECT id FROM content_variations
         WHERE id = ? AND product_id = ? AND owner_email = ?
           AND archived_at IS NULL`,
      )
      .bind(input.contentVariationId, input.productId, email)
      .first<{ id: string }>();
    if (!variation) {
      throw new ApiError(
        404,
        "CONTENT_VARIATION_NOT_FOUND",
        "Content variation not found.",
      );
    }
  }

  const promotionId = crypto.randomUUID();
  const trackedLinkId = crypto.randomUUID();
  const identifiers = trackingIdentifiers();
  const now = new Date().toISOString();
  const status = input.publishedAt
    ? "PUBLISHED"
    : input.scheduledAt
      ? "SCHEDULED"
      : "PLANNED";
  await db.batch([
    db
      .prepare(
        `INSERT INTO promotions (
          id, owner_email, campaign_id, product_id, generated_content_id,
          content_variation_id, status, scheduled_at, published_at,
          published_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        promotionId,
        email,
        campaignId,
        input.productId,
        input.generatedContentId ?? null,
        input.contentVariationId ?? null,
        status,
        input.scheduledAt ?? null,
        input.publishedAt ?? null,
        input.publishedUrl ?? null,
        now,
        now,
      ),
    db
      .prepare(
        `INSERT INTO tracked_links (
          id, owner_email, promotion_id, campaign_id, product_id,
          content_variation_id, marketplace, tracking_id, short_path,
          destination_url, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(
        trackedLinkId,
        email,
        promotionId,
        campaignId,
        input.productId,
        input.contentVariationId ?? null,
        product.marketplace,
        identifiers.trackingId,
        identifiers.shortPath,
        input.destinationUrl,
        now,
        now,
      ),
  ]);
  return {
    id: promotionId,
    campaignId,
    productId: input.productId,
    status,
    trackedLink: {
      id: trackedLinkId,
      trackingId: identifiers.trackingId,
      shortPath: identifiers.shortPath,
      marketplace: product.marketplace,
      destinationUrl: input.destinationUrl,
    },
  };
}

function requestRegion(request: Request): string | null {
  const region = request.headers.get("cf-ipcountry")?.trim().toUpperCase();
  return region && /^[A-Z]{2}$/.test(region) ? region : null;
}

export async function recordTrackedClick(shortPath: string, request: Request) {
  const db = await database();
  const link = await db
    .prepare(
      `SELECT id, tracking_id, destination_url FROM tracked_links
       WHERE short_path = ? AND is_active = 1`,
    )
    .bind(shortPath)
    .first<{
      id: string;
      tracking_id: string;
      destination_url: string;
    }>();
  if (!link) {
    throw new ApiError(
      404,
      "TRACKED_LINK_NOT_FOUND",
      "Tracked link not found.",
    );
  }

  const now = new Date();
  const clickedAt = now.toISOString();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? "";
  const connectingIp = request.headers.get("cf-connecting-ip") ?? "";
  const day = clickedAt.slice(0, 10);
  const fingerprintHash = await sha256(
    `${day}|${link.tracking_id}|${connectingIp}|${userAgent}`,
  );
  const duplicateSince = new Date(now.getTime() - 30 * 60_000).toISOString();
  const velocitySince = new Date(now.getTime() - 5 * 60_000).toISOString();
  const [duplicate, velocity] = await Promise.all([
    db
      .prepare(
        `SELECT id FROM click_events
         WHERE tracked_link_id = ? AND fingerprint_hash = ?
           AND clicked_at >= ? LIMIT 1`,
      )
      .bind(link.id, fingerprintHash, duplicateSince)
      .first<{ id: string }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM click_events
         WHERE fingerprint_hash = ? AND clicked_at >= ?`,
      )
      .bind(fingerprintHash, velocitySince)
      .first<{ count: number }>(),
  ]);
  const bot = isLikelyBot(userAgent);
  const highVelocity = (velocity?.count ?? 0) >= 10;
  const suspiciousReason = bot
    ? "LIKELY_BOT"
    : highVelocity
      ? "HIGH_VELOCITY"
      : duplicate
        ? "DUPLICATE_WINDOW"
        : null;
  await db
    .prepare(
      `INSERT INTO click_events (
        id, tracked_link_id, clicked_at, traffic_source, device_type, region,
        fingerprint_hash, is_bot, is_duplicate, suspicious_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      link.id,
      clickedAt,
      safeTrafficSource(request.headers.get("referer")),
      classifyDevice(userAgent),
      requestRegion(request),
      fingerprintHash,
      bot ? 1 : 0,
      duplicate ? 1 : 0,
      suspiciousReason,
      clickedAt,
    )
    .run();

  return {
    destinationUrl: link.destination_url,
    quality: {
      isBot: bot,
      isDuplicate: Boolean(duplicate),
      suspiciousReason,
    },
  };
}
