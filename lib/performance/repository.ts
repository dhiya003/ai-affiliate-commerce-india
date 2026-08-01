import { ApiError } from "@/lib/api/errors";
import { reconcileAttributionRecords } from "./reconciliation.ts";
import type { AttributionImport } from "./schema";
import type { PerformanceDashboard } from "./types";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Performance storage is unavailable.",
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

export async function importAttributionEvents(
  input: AttributionImport,
  email: string,
) {
  const db = await database();
  let conversionsImported = 0;
  let commissionsImported = 0;
  const importedAt = new Date().toISOString();
  const reconciliation = reconcileAttributionRecords(input.records);
  const importedConversions = new Set<string>();

  for (const record of reconciliation.records) {
    const link = await db
      .prepare(
        `SELECT id, marketplace FROM tracked_links
         WHERE tracking_id = ? AND owner_email = ?`,
      )
      .bind(record.trackingId, email)
      .first<{ id: string; marketplace: string }>();
    if (!link) {
      throw new ApiError(
        404,
        "TRACKED_LINK_NOT_FOUND",
        "A conversion references an unknown tracked link.",
      );
    }

    const externalOrderIdHash = await sha256(
      `${email}|${link.marketplace}|${record.externalOrderId}`,
    );
    importedConversions.add(`${link.marketplace}:${externalOrderIdHash}`);
    const existing = await db
      .prepare(
        `SELECT id FROM conversion_events
         WHERE marketplace = ? AND external_order_id_hash = ?
           AND owner_email = ?`,
      )
      .bind(link.marketplace, externalOrderIdHash, email)
      .first<{ id: string }>();
    const conversionId = existing?.id ?? crypto.randomUUID();
    const conversionStatement = existing
      ? db
          .prepare(
            `UPDATE conversion_events SET tracked_link_id = ?,
              order_status = ?, order_value = ?, currency = ?,
              converted_at = ?, imported_at = ?
             WHERE id = ? AND owner_email = ?`,
          )
          .bind(
            link.id,
            record.orderStatus,
            record.orderValue,
            record.currency,
            record.convertedAt,
            importedAt,
            conversionId,
            email,
          )
      : db
          .prepare(
            `INSERT INTO conversion_events (
              id, owner_email, tracked_link_id, click_event_id, marketplace,
              external_order_id_hash, order_status, order_value, currency,
              converted_at, imported_at
            ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            conversionId,
            email,
            link.id,
            link.marketplace,
            externalOrderIdHash,
            record.orderStatus,
            record.orderValue,
            record.currency,
            record.convertedAt,
            importedAt,
          );
    const statements = [conversionStatement];
    if (record.commission) {
      statements.push(
        db
          .prepare(
            `INSERT INTO commission_events (
              id, owner_email, conversion_event_id, marketplace, amount,
              currency, status, observed_at, approved_at, imported_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(conversion_event_id, status, observed_at) DO UPDATE SET
              amount = excluded.amount,
              currency = excluded.currency,
              approved_at = excluded.approved_at,
              imported_at = excluded.imported_at`,
          )
          .bind(
            crypto.randomUUID(),
            email,
            conversionId,
            link.marketplace,
            record.commission.amount,
            record.commission.currency,
            record.commission.status,
            record.commission.observedAt,
            record.commission.approvedAt ?? null,
            importedAt,
          ),
      );
      commissionsImported += 1;
    }
    await db.batch(statements);
    conversionsImported = importedConversions.size;
  }

  return {
    conversionsImported,
    commissionsImported,
    duplicatesRemoved: reconciliation.duplicatesRemoved,
    reconciledOrders: reconciliation.reconciledOrders,
    importedAt,
  };
}

interface CountRow {
  count: number;
}

interface AmountRow {
  amount: number | null;
}

interface BreakdownRow {
  key: string;
  label: string;
  clicks: number;
  conversions: number;
  commission: number;
}

export async function getPerformanceDashboard(
  email: string,
  range: { from: string; to: string },
): Promise<PerformanceDashboard> {
  const db = await database();
  const [
    clicks,
    conversions,
    commission,
    marketplace,
    campaign,
    product,
    daily,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM click_events ce
         JOIN tracked_links tl ON tl.id = ce.tracked_link_id
         WHERE tl.owner_email = ? AND ce.clicked_at BETWEEN ? AND ?
           AND ce.is_bot = 0 AND ce.is_duplicate = 0`,
      )
      .bind(email, range.from, range.to)
      .first<CountRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM conversion_events
         WHERE owner_email = ? AND converted_at BETWEEN ? AND ?
           AND order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')`,
      )
      .bind(email, range.from, range.to)
      .first<CountRow>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS amount FROM commission_events
         WHERE owner_email = ? AND observed_at BETWEEN ? AND ?
           AND status IN ('APPROVED', 'PAID')`,
      )
      .bind(email, range.from, range.to)
      .first<AmountRow>(),
    performanceBreakdown(db, email, range, "marketplace"),
    performanceBreakdown(db, email, range, "campaign"),
    performanceBreakdown(db, email, range, "product"),
    dailyPerformance(db, email, range),
  ]);

  const totalClicks = clicks?.count ?? 0;
  const totalConversions = conversions?.count ?? 0;
  const totalCommission = commission?.amount ?? 0;
  return {
    range,
    summary: {
      totalClicks,
      totalConversions,
      totalCommission,
      conversionRate:
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      earningsPerClick: totalClicks > 0 ? totalCommission / totalClicks : 0,
      clickThroughRate: null,
      clickThroughRateReason:
        "Impression data is not available from connected creator platforms.",
    },
    byMarketplace: marketplace,
    byCampaign: campaign,
    byProduct: product,
    daily,
  };
}

async function performanceBreakdown(
  db: D1Database,
  email: string,
  range: { from: string; to: string },
  dimension: "marketplace" | "campaign" | "product",
): Promise<BreakdownRow[]> {
  const dimensions = {
    marketplace: { key: "tl.marketplace", label: "tl.marketplace" },
    campaign: {
      key: "tl.campaign_id",
      label: "COALESCE(c.name, tl.campaign_id)",
    },
    product: {
      key: "tl.product_id",
      label: "COALESCE(p.name, tl.product_id)",
    },
  } as const;
  const group = dimensions[dimension];
  const rows = await db
    .prepare(
      `WITH click_agg AS (
         SELECT tracked_link_id, COUNT(*) AS clicks
         FROM click_events
         WHERE clicked_at BETWEEN ? AND ?
           AND is_bot = 0 AND is_duplicate = 0
         GROUP BY tracked_link_id
       ), conversion_agg AS (
         SELECT tracked_link_id, COUNT(*) AS conversions
         FROM conversion_events
         WHERE converted_at BETWEEN ? AND ?
           AND order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
         GROUP BY tracked_link_id
       ), commission_agg AS (
         SELECT cv.tracked_link_id, SUM(cm.amount) AS commission
         FROM commission_events cm
         JOIN conversion_events cv ON cv.id = cm.conversion_event_id
         WHERE cm.observed_at BETWEEN ? AND ?
           AND cm.status IN ('APPROVED', 'PAID')
         GROUP BY cv.tracked_link_id
       )
       SELECT ${group.key} AS key, ${group.label} AS label,
        COALESCE(SUM(ca.clicks), 0) AS clicks,
        COALESCE(SUM(va.conversions), 0) AS conversions,
       COALESCE(SUM(ma.commission), 0) AS commission
       FROM tracked_links tl
       LEFT JOIN campaigns c ON c.id = tl.campaign_id
       LEFT JOIN products p ON p.id = tl.product_id
       LEFT JOIN click_agg ca ON ca.tracked_link_id = tl.id
       LEFT JOIN conversion_agg va ON va.tracked_link_id = tl.id
       LEFT JOIN commission_agg ma ON ma.tracked_link_id = tl.id
       WHERE tl.owner_email = ?
       GROUP BY ${group.key}, ${group.label}
       ORDER BY commission DESC, conversions DESC, clicks DESC
       LIMIT 100`,
    )
    .bind(
      range.from,
      range.to,
      range.from,
      range.to,
      range.from,
      range.to,
      email,
    )
    .all<BreakdownRow>();
  return rows.results;
}

async function dailyPerformance(
  db: D1Database,
  email: string,
  range: { from: string; to: string },
): Promise<BreakdownRow[]> {
  const rows = await db
    .prepare(
      `SELECT key, key AS label, SUM(clicks) AS clicks,
        SUM(conversions) AS conversions, SUM(commission) AS commission
       FROM (
         SELECT substr(ce.clicked_at, 1, 10) AS key, COUNT(*) AS clicks,
           0 AS conversions, 0 AS commission
         FROM click_events ce
         JOIN tracked_links tl ON tl.id = ce.tracked_link_id
         WHERE tl.owner_email = ? AND ce.clicked_at BETWEEN ? AND ?
           AND ce.is_bot = 0 AND ce.is_duplicate = 0
         GROUP BY key
         UNION ALL
         SELECT substr(cv.converted_at, 1, 10) AS key, 0 AS clicks,
           COUNT(*) AS conversions, 0 AS commission
         FROM conversion_events cv
         WHERE cv.owner_email = ? AND cv.converted_at BETWEEN ? AND ?
           AND cv.order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
         GROUP BY key
         UNION ALL
         SELECT substr(cm.observed_at, 1, 10) AS key, 0 AS clicks,
           0 AS conversions, SUM(cm.amount) AS commission
         FROM commission_events cm
         WHERE cm.owner_email = ? AND cm.observed_at BETWEEN ? AND ?
           AND cm.status IN ('APPROVED', 'PAID')
         GROUP BY key
       )
       GROUP BY key ORDER BY key`,
    )
    .bind(
      email,
      range.from,
      range.to,
      email,
      range.from,
      range.to,
      email,
      range.from,
      range.to,
    )
    .all<BreakdownRow>();
  return rows.results;
}
