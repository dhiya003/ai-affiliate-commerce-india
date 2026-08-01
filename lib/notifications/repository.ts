import { ApiError } from "@/lib/api/errors";
import {
  deliverNotificationEmail,
  type EmailDeliveryResult,
} from "./delivery.ts";
import {
  NOTIFICATION_TYPES,
  type NotificationPreferenceInput,
  type NotificationType,
} from "./schema.ts";
import type { Notification, NotificationPreference } from "./types.ts";

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Notification storage is unavailable.",
    );
  }
  return env.DB;
}

const defaultPreference: NotificationPreference = {
  inAppEnabled: true,
  emailEnabled: false,
  digestFrequency: "DAILY",
  enabledTypes: [...NOTIFICATION_TYPES],
  quietHoursStart: null,
  quietHoursEnd: null,
  updatedAt: null,
};

export async function getNotificationPreference(
  email: string,
): Promise<NotificationPreference> {
  const row = await (
    await database()
  )
    .prepare(
      `SELECT in_app_enabled, email_enabled, digest_frequency,
        enabled_types_json, quiet_hours_start, quiet_hours_end, updated_at
       FROM notification_preferences WHERE owner_email = ?`,
    )
    .bind(email)
    .first<{
      in_app_enabled: number;
      email_enabled: number;
      digest_frequency: NotificationPreference["digestFrequency"];
      enabled_types_json: string;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
      updated_at: string;
    }>();
  if (!row) return defaultPreference;
  return {
    inAppEnabled: Boolean(row.in_app_enabled),
    emailEnabled: Boolean(row.email_enabled),
    digestFrequency: row.digest_frequency,
    enabledTypes: JSON.parse(row.enabled_types_json) as NotificationType[],
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    updatedAt: row.updated_at,
  };
}

export async function updateNotificationPreference(
  email: string,
  input: NotificationPreferenceInput,
) {
  const db = await database();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO notification_preferences (
        id, owner_email, in_app_enabled, email_enabled, digest_frequency,
        enabled_types_json, quiet_hours_start, quiet_hours_end, created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_email) DO UPDATE SET
        in_app_enabled = excluded.in_app_enabled,
        email_enabled = excluded.email_enabled,
        digest_frequency = excluded.digest_frequency,
        enabled_types_json = excluded.enabled_types_json,
        quiet_hours_start = excluded.quiet_hours_start,
        quiet_hours_end = excluded.quiet_hours_end,
        updated_at = excluded.updated_at`,
    )
    .bind(
      crypto.randomUUID(),
      email,
      input.inAppEnabled ? 1 : 0,
      input.emailEnabled ? 1 : 0,
      input.digestFrequency,
      JSON.stringify(input.enabledTypes),
      input.quietHoursStart,
      input.quietHoursEnd,
      now,
      now,
    )
    .run();
  return getNotificationPreference(email);
}

interface CreateNotificationInput {
  type: NotificationType;
  severity: Notification["severity"];
  title: string;
  body: string;
  dedupeKey: string;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  expiresAt?: string | null;
}

function inQuietHours(
  start: string | null,
  end: string | null,
  now = new Date(),
) {
  if (!start || !end) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const time = `${parts.find(({ type }) => type === "hour")?.value}:${
    parts.find(({ type }) => type === "minute")?.value
  }`;
  return start <= end
    ? time >= start && time < end
    : time >= start || time < end;
}

async function attemptEmailDelivery(
  notificationId: string,
  email: string,
  payload: Omit<CreateNotificationInput, "dedupeKey">,
  preference: NotificationPreference,
) {
  const db = await database();
  const now = new Date();
  if (inQuietHours(preference.quietHoursStart, preference.quietHoursEnd, now)) {
    await db
      .prepare(
        `UPDATE notification_deliveries SET next_attempt_at = ?, updated_at = ?
         WHERE notification_id = ? AND channel = 'EMAIL'`,
      )
      .bind(
        new Date(now.getTime() + 60 * 60_000).toISOString(),
        now.toISOString(),
        notificationId,
      )
      .run();
    return;
  }
  const { env } = await import("cloudflare:workers");
  const result = await deliverNotificationEmail(
    {
      endpoint: env.NOTIFICATION_EMAIL_WEBHOOK_URL?.trim(),
      token: env.NOTIFICATION_EMAIL_TOKEN?.trim(),
    },
    {
      recipientEmail: email,
      notificationId,
      type: payload.type,
      severity: payload.severity,
      title: payload.title,
      body: payload.body,
      actionUrl: payload.actionUrl ?? null,
    },
  );
  await recordEmailResult(db, notificationId, result);
}

async function recordEmailResult(
  db: D1Database,
  notificationId: string,
  result: EmailDeliveryResult,
) {
  const now = new Date().toISOString();
  const current = await db
    .prepare(
      `SELECT attempt_count FROM notification_deliveries
       WHERE notification_id = ? AND channel = 'EMAIL'`,
    )
    .bind(notificationId)
    .first<{ attempt_count: number }>();
  const nextAttempt = (current?.attempt_count ?? 0) + 1;
  const externalMessageIdHash =
    result.status === "delivered" && result.externalMessageId
      ? await sha256Hex(result.externalMessageId)
      : null;
  const status =
    result.status === "delivered"
      ? "SENT"
      : result.status === "disabled" ||
          result.status === "invalid_configuration"
        ? "SKIPPED"
        : nextAttempt < 3
          ? "PENDING"
          : "FAILED";
  const errorCode =
    result.status === "failed"
      ? result.responseStatus
        ? `HTTP_${result.responseStatus}`
        : "DELIVERY_FAILED"
      : result.status === "invalid_configuration"
        ? "INVALID_CONFIGURATION"
        : result.status === "disabled"
          ? "PROVIDER_DISABLED"
          : null;
  await db
    .prepare(
      `UPDATE notification_deliveries SET status = ?, provider = 'webhook',
        external_message_id_hash = ?, attempt_count = attempt_count + 1,
        next_attempt_at = ?, delivered_at = ?, error_code = ?, updated_at = ?
       WHERE notification_id = ? AND channel = 'EMAIL'`,
    )
    .bind(
      status,
      externalMessageIdHash,
      status === "PENDING"
        ? new Date(Date.now() + 60_000 * 2 ** (nextAttempt - 1)).toISOString()
        : null,
      status === "SENT" ? now : null,
      errorCode,
      now,
      notificationId,
    )
    .run();
}

export async function retryDueNotificationDeliveries() {
  const db = await database();
  const rows = await db
    .prepare(
      `SELECT d.notification_id, n.owner_email, n.type, n.severity, n.title,
        n.body, n.action_url, n.entity_type, n.entity_id, n.metadata_json,
        n.expires_at
       FROM notification_deliveries d
       JOIN notifications n ON n.id = d.notification_id
       WHERE d.channel = 'EMAIL' AND d.status = 'PENDING'
         AND d.attempt_count < 3
         AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= ?)
         AND (n.expires_at IS NULL OR n.expires_at > ?)
       ORDER BY COALESCE(d.next_attempt_at, d.created_at) ASC LIMIT 50`,
    )
    .bind(new Date().toISOString(), new Date().toISOString())
    .all<{
      notification_id: string;
      owner_email: string;
      type: NotificationType;
      severity: Notification["severity"];
      title: string;
      body: string;
      action_url: string | null;
      entity_type: string | null;
      entity_id: string | null;
      metadata_json: string;
      expires_at: string | null;
    }>();
  for (const row of rows.results) {
    const preference = await getNotificationPreference(row.owner_email);
    if (!preference.emailEnabled) {
      await db
        .prepare(
          `UPDATE notification_deliveries SET status = 'SKIPPED',
            next_attempt_at = NULL, error_code = 'EMAIL_DISABLED', updated_at = ?
           WHERE notification_id = ? AND channel = 'EMAIL'`,
        )
        .bind(new Date().toISOString(), row.notification_id)
        .run();
      continue;
    }
    await attemptEmailDelivery(
      row.notification_id,
      row.owner_email,
      {
        type: row.type,
        severity: row.severity,
        title: row.title,
        body: row.body,
        actionUrl: row.action_url,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: JSON.parse(row.metadata_json) as Record<
          string,
          string | number | boolean | null
        >,
        expiresAt: row.expires_at,
      },
      preference,
    );
  }
  return { processed: rows.results.length };
}

export async function createNotification(
  email: string,
  input: CreateNotificationInput,
) {
  const preference = await getNotificationPreference(email);
  if (!preference.enabledTypes.includes(input.type)) return null;
  const db = await database();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inserted = await db
    .prepare(
      `INSERT INTO notifications (
        id, owner_email, type, severity, title, body, action_url, entity_type,
        entity_id, dedupe_key, metadata_json, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_email, dedupe_key) DO NOTHING`,
    )
    .bind(
      id,
      email,
      input.type,
      input.severity,
      input.title.slice(0, 180),
      input.body.slice(0, 2000),
      input.actionUrl ?? null,
      input.entityType ?? null,
      input.entityId ?? null,
      input.dedupeKey.slice(0, 240),
      JSON.stringify(input.metadata ?? {}).slice(0, 10_000),
      now,
      input.expiresAt ?? null,
    )
    .run();
  if (!inserted.meta.changes) return null;
  const notification = await db
    .prepare(
      `SELECT id FROM notifications WHERE owner_email = ? AND dedupe_key = ?`,
    )
    .bind(email, input.dedupeKey.slice(0, 240))
    .first<{ id: string }>();
  if (!notification) return null;
  if (preference.inAppEnabled) {
    await db
      .prepare(
        `INSERT INTO notification_deliveries (
          id, notification_id, channel, status, provider, attempt_count,
          delivered_at, created_at, updated_at
        ) VALUES (?, ?, 'IN_APP', 'SENT', 'internal', 1, ?, ?, ?)
        ON CONFLICT(notification_id, channel) DO NOTHING`,
      )
      .bind(crypto.randomUUID(), notification.id, now, now, now)
      .run();
  }
  if (preference.emailEnabled) {
    const result = await db
      .prepare(
        `INSERT INTO notification_deliveries (
          id, notification_id, channel, status, attempt_count, created_at,
          updated_at
        ) VALUES (?, ?, 'EMAIL', 'PENDING', 0, ?, ?)
        ON CONFLICT(notification_id, channel) DO NOTHING`,
      )
      .bind(crypto.randomUUID(), notification.id, now, now)
      .run();
    if (result.meta.changes) {
      await attemptEmailDelivery(notification.id, email, input, preference);
    }
  }
  return notification.id;
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  severity: Notification["severity"];
  title: string;
  body: string;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata_json: string;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
  in_app_status: string | null;
  email_status: string | null;
}

export async function listNotifications(
  email: string,
  options: { unreadOnly?: boolean } = {},
) {
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT n.id, n.type, n.severity, n.title, n.body, n.action_url,
        n.entity_type, n.entity_id, n.metadata_json, n.read_at, n.created_at,
        n.expires_at,
        (SELECT status FROM notification_deliveries
         WHERE notification_id = n.id AND channel = 'IN_APP')
          AS in_app_status,
        (SELECT status FROM notification_deliveries
         WHERE notification_id = n.id AND channel = 'EMAIL')
          AS email_status
       FROM notifications n
       WHERE n.owner_email = ?
         AND (? = 0 OR n.read_at IS NULL)
         AND (n.expires_at IS NULL OR n.expires_at > ?)
       ORDER BY n.created_at DESC LIMIT 200`,
    )
    .bind(email, options.unreadOnly ? 1 : 0, new Date().toISOString())
    .all<NotificationRow>();
  return rows.results.map((row): Notification => ({
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    readAt: row.read_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    delivery: {
      inApp: row.in_app_status,
      email: row.email_status,
    },
  }));
}

export async function setNotificationReadState(
  id: string,
  email: string,
  read: boolean,
) {
  const result = await (
    await database()
  )
    .prepare(
      `UPDATE notifications SET read_at = ?
       WHERE id = ? AND owner_email = ?`,
    )
    .bind(read ? new Date().toISOString() : null, id, email)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification not found.",
    );
  }
  return { id, read };
}

export async function markAllNotificationsRead(email: string) {
  const result = await (
    await database()
  )
    .prepare(
      `UPDATE notifications SET read_at = ?
       WHERE owner_email = ? AND read_at IS NULL`,
    )
    .bind(new Date().toISOString(), email)
    .run();
  return { updated: result.meta.changes ?? 0 };
}

type AlertCandidate = CreateNotificationInput;

export async function generateNotificationAlerts(email: string) {
  const db = await database();
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const day = new Date().toISOString().slice(0, 10);
  const candidates: AlertCandidate[] = [];
  const topProducts = await db
    .prepare(
      `SELECT id, name, marketplace, opportunity_score
       FROM products WHERE (owner_email IS NULL OR owner_email = ?)
         AND opportunity_score IS NOT NULL
       ORDER BY opportunity_score DESC, updated_at DESC LIMIT 10`,
    )
    .bind(email)
    .all<{
      id: string;
      name: string;
      marketplace: string;
      opportunity_score: number;
    }>();
  if (topProducts.results[0]) {
    const top = topProducts.results[0];
    candidates.push({
      type: "DAILY_OPPORTUNITY_SUMMARY",
      severity: "INFO",
      title: "Today’s affiliate opportunities are ready",
      body: `${topProducts.results.length} products are ranked. ${top.name} leads at ${Math.round(top.opportunity_score)}/100 on ${top.marketplace}.`,
      actionUrl: "/dashboard",
      dedupeKey: `DAILY_OPPORTUNITY_SUMMARY:${day}`,
      metadata: { topProductId: top.id, topScore: top.opportunity_score },
    });
  }
  for (const row of topProducts.results.filter(
    ({ opportunity_score }) => opportunity_score >= 85,
  )) {
    candidates.push({
      type: "HIGH_OPPORTUNITY_PRODUCT",
      severity: row.opportunity_score >= 92 ? "SUCCESS" : "INFO",
      title: "High-opportunity product",
      body: `${row.name} is currently scored ${Math.round(row.opportunity_score)}/100 on ${row.marketplace}.`,
      actionUrl: `/products/${row.id}`,
      entityType: "product",
      entityId: row.id,
      dedupeKey: `HIGH_OPPORTUNITY_PRODUCT:${row.id}:${day}`,
      metadata: { opportunityScore: row.opportunity_score },
    });
  }
  const trends = await db
    .prepare(
      `SELECT p.id, p.name, ts.signal_type, ts.normalized_score
       FROM trend_signals ts JOIN products p ON p.id = ts.product_id
       WHERE (p.owner_email IS NULL OR p.owner_email = ?)
         AND ts.observed_at >= ? AND ts.normalized_score >= 70
         AND ts.signal_type IN (
           'GOOGLE_TRENDS', 'SOCIAL_MENTIONS', 'MARKETPLACE_BESTSELLER',
           'NEW_PRODUCT_VELOCITY', 'PRICE_DROP', 'AVAILABILITY'
         )
       ORDER BY ts.normalized_score DESC LIMIT 100`,
    )
    .bind(email, since)
    .all<{
      id: string;
      name: string;
      signal_type: string;
      normalized_score: number;
    }>();
  for (const row of trends.results) {
    const type: NotificationType =
      row.signal_type === "PRICE_DROP"
        ? "PRICE_DROP"
        : row.signal_type === "AVAILABILITY"
          ? "STOCK_RETURN"
          : "NEW_TRENDING_PRODUCT";
    candidates.push({
      type,
      severity: row.normalized_score >= 90 ? "WARNING" : "INFO",
      title:
        type === "PRICE_DROP"
          ? "Price-drop opportunity"
          : type === "STOCK_RETURN"
            ? "Product availability returned"
            : "New trending product",
      body: `${row.name} has a ${row.signal_type.toLowerCase().replaceAll("_", " ")} signal of ${Math.round(row.normalized_score)}/100.`,
      actionUrl: `/products/${row.id}`,
      entityType: "product",
      entityId: row.id,
      dedupeKey: `${type}:${row.id}:${day}`,
      metadata: { signalScore: row.normalized_score },
    });
  }
  const risky = await db
    .prepare(
      `SELECT id, name FROM products
       WHERE (owner_email IS NULL OR owner_email = ?)
         AND return_risk = 'HIGH' AND status IN ('APPROVED', 'PROMOTED')
       ORDER BY updated_at DESC LIMIT 50`,
    )
    .bind(email)
    .all<{ id: string; name: string }>();
  for (const row of risky.results) {
    candidates.push({
      type: "HIGH_RETURN_RISK",
      severity: "WARNING",
      title: "High return-risk promotion",
      body: `${row.name} is approved or promoted despite a high return-risk classification.`,
      actionUrl: `/products/${row.id}`,
      entityType: "product",
      entityId: row.id,
      dedupeKey: `HIGH_RETURN_RISK:${row.id}:${day}`,
    });
  }
  const policyChanges = await db
    .prepare(
      `SELECT id, marketplace, summary FROM platform_update_history
       WHERE detected_at >= ? ORDER BY detected_at DESC LIMIT 50`,
    )
    .bind(since)
    .all<{ id: string; marketplace: string; summary: string }>();
  for (const row of policyChanges.results) {
    candidates.push({
      type: "AFFILIATE_RULE_CHANGE",
      severity: "WARNING",
      title: `${row.marketplace} affiliate rule changed`,
      body: row.summary,
      actionUrl: "/policies",
      entityType: "platform_update",
      entityId: row.id,
      dedupeKey: `AFFILIATE_RULE_CHANGE:${row.id}`,
    });
  }
  const lowConversion = await db
    .prepare(
      `WITH click_totals AS (
         SELECT tl.campaign_id, COUNT(*) AS clicks
         FROM click_events ce JOIN tracked_links tl ON tl.id = ce.tracked_link_id
         WHERE tl.owner_email = ? AND ce.clicked_at >= ?
           AND ce.is_bot = 0 AND ce.is_duplicate = 0
         GROUP BY tl.campaign_id
       ), conversion_totals AS (
         SELECT tl.campaign_id, COUNT(*) AS conversions
         FROM conversion_events cv
         JOIN tracked_links tl ON tl.id = cv.tracked_link_id
         WHERE cv.owner_email = ? AND cv.converted_at >= ?
           AND cv.order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
         GROUP BY tl.campaign_id
       )
       SELECT c.id, c.name, ct.clicks, COALESCE(vt.conversions, 0) AS conversions
       FROM click_totals ct JOIN campaigns c ON c.id = ct.campaign_id
       LEFT JOIN conversion_totals vt ON vt.campaign_id = c.id
       WHERE ct.clicks >= 20
         AND (COALESCE(vt.conversions, 0) * 100.0 / ct.clicks) < 1
       LIMIT 50`,
    )
    .bind(email, since, email, since)
    .all<{
      id: string;
      name: string;
      clicks: number;
      conversions: number;
    }>();
  for (const row of lowConversion.results) {
    candidates.push({
      type: "LOW_CONVERSION",
      severity: "WARNING",
      title: "Low campaign conversion",
      body: `${row.name} recorded ${row.conversions} conversions from ${row.clicks} verified clicks in the last 24 hours.`,
      actionUrl: "/performance",
      entityType: "campaign",
      entityId: row.id,
      dedupeKey: `LOW_CONVERSION:${row.id}:${day}`,
    });
  }
  const strongCampaigns = await db
    .prepare(
      `WITH click_totals AS (
         SELECT tl.campaign_id, COUNT(*) AS clicks
         FROM click_events ce JOIN tracked_links tl ON tl.id = ce.tracked_link_id
         WHERE tl.owner_email = ? AND ce.clicked_at >= ?
           AND ce.is_bot = 0 AND ce.is_duplicate = 0
         GROUP BY tl.campaign_id
       ), conversion_totals AS (
         SELECT tl.campaign_id, COUNT(*) AS conversions
         FROM conversion_events cv
         JOIN tracked_links tl ON tl.id = cv.tracked_link_id
         WHERE cv.owner_email = ? AND cv.converted_at >= ?
           AND cv.order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
         GROUP BY tl.campaign_id
       )
       SELECT c.id, c.name, ct.clicks, COALESCE(vt.conversions, 0) AS conversions
       FROM click_totals ct JOIN campaigns c ON c.id = ct.campaign_id
       LEFT JOIN conversion_totals vt ON vt.campaign_id = c.id
       WHERE ct.clicks >= 20
         AND (COALESCE(vt.conversions, 0) * 100.0 / ct.clicks) >= 3
       LIMIT 50`,
    )
    .bind(email, since, email, since)
    .all<{
      id: string;
      name: string;
      clicks: number;
      conversions: number;
    }>();
  for (const row of strongCampaigns.results) {
    candidates.push({
      type: "CAMPAIGN_PERFORMANCE",
      severity: "SUCCESS",
      title: "Campaign is converting well",
      body: `${row.name} recorded ${row.conversions} conversions from ${row.clicks} verified clicks in the last 24 hours.`,
      actionUrl: "/performance",
      entityType: "campaign",
      entityId: row.id,
      dedupeKey: `CAMPAIGN_PERFORMANCE:${row.id}:${day}`,
    });
  }
  const failedImports = await db
    .prepare(
      `SELECT ir.id, ps.marketplace, COALESCE(ir.error_summary, 'Import failed.') AS error_summary
       FROM ingestion_runs ir JOIN product_sources ps ON ps.id = ir.source_id
       WHERE ir.status = 'FAILED' AND ir.started_at >= ?
       ORDER BY ir.started_at DESC LIMIT 50`,
    )
    .bind(since)
    .all<{ id: string; marketplace: string; error_summary: string }>();
  for (const row of failedImports.results) {
    candidates.push({
      type: "FAILED_IMPORT",
      severity: "CRITICAL",
      title: `${row.marketplace} import failed`,
      body: row.error_summary,
      actionUrl: "/sources",
      entityType: "ingestion_run",
      entityId: row.id,
      dedupeKey: `FAILED_IMPORT:${row.id}`,
    });
  }
  const staleSources = await db
    .prepare(
      `SELECT id, marketplace, name, last_success_at
       FROM product_sources
       WHERE status = 'ACTIVE'
         AND (last_success_at IS NULL OR last_success_at < ?)
       ORDER BY marketplace, name LIMIT 50`,
    )
    .bind(new Date(Date.now() - 24 * 60 * 60_000).toISOString())
    .all<{
      id: string;
      marketplace: string;
      name: string;
      last_success_at: string | null;
    }>();
  for (const row of staleSources.results) {
    candidates.push({
      type: "STALE_PRICE",
      severity: "WARNING",
      title: `${row.marketplace} price evidence is stale`,
      body: `${row.name} has not completed a successful refresh in the last 24 hours.`,
      actionUrl: "/sources",
      entityType: "product_source",
      entityId: row.id,
      dedupeKey: `STALE_PRICE:${row.id}:${day}`,
      metadata: { lastSuccessAt: row.last_success_at },
    });
  }
  const brokenLinks = await db
    .prepare(
      `SELECT id, name FROM products
       WHERE (owner_email IS NULL OR owner_email = ?)
         AND affiliate_url IS NOT NULL
         AND (affiliate_url NOT LIKE 'https://%' OR length(affiliate_url) > 2048)
       ORDER BY updated_at DESC LIMIT 50`,
    )
    .bind(email)
    .all<{ id: string; name: string }>();
  for (const row of brokenLinks.results) {
    candidates.push({
      type: "BROKEN_AFFILIATE_LINK",
      severity: "CRITICAL",
      title: "Affiliate link needs repair",
      body: `${row.name} has an invalid or unsafe affiliate destination.`,
      actionUrl: `/products/${row.id}`,
      entityType: "product",
      entityId: row.id,
      dedupeKey: `BROKEN_AFFILIATE_LINK:${row.id}:${day}`,
    });
  }
  const complianceFailures = await db
    .prepare(
      `SELECT cc.id, p.id AS product_id, p.name
       FROM compliance_checks cc JOIN products p ON p.id = cc.product_id
       WHERE cc.owner_email = ? AND cc.status = 'BLOCKED'
         AND cc.checked_at >= ? LIMIT 50`,
    )
    .bind(email, since)
    .all<{ id: string; product_id: string; name: string }>();
  for (const row of complianceFailures.results) {
    candidates.push({
      type: "COMPLIANCE_FAILURE",
      severity: "CRITICAL",
      title: "Content blocked by compliance",
      body: `${row.name} has a blocking compliance result that requires review.`,
      actionUrl: `/products/${row.product_id}`,
      entityType: "compliance_check",
      entityId: row.id,
      dedupeKey: `COMPLIANCE_FAILURE:${row.id}`,
    });
  }
  const performance = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM click_events ce
          JOIN tracked_links tl ON tl.id = ce.tracked_link_id
          WHERE tl.owner_email = ? AND ce.clicked_at >= ?
            AND ce.is_bot = 0 AND ce.is_duplicate = 0) AS clicks,
         (SELECT COUNT(*) FROM conversion_events cv
          WHERE cv.owner_email = ? AND cv.converted_at >= ?
            AND cv.order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')) AS conversions,
         (SELECT ROUND(COALESCE(SUM(amount), 0), 2) FROM commission_events cm
          WHERE cm.owner_email = ? AND cm.observed_at >= ?
            AND cm.status IN ('APPROVED', 'PAID')) AS commission`,
    )
    .bind(email, since, email, since, email, since)
    .first<{ clicks: number; conversions: number; commission: number }>();
  if (performance) {
    const week = new Date().toISOString().slice(0, 8);
    const month = new Date().toISOString().slice(0, 7);
    candidates.push({
      type: "WEEKLY_PERFORMANCE_SUMMARY",
      severity: "INFO",
      title: "Weekly performance snapshot",
      body: `${performance.clicks} verified clicks, ${performance.conversions} accepted conversions, and ₹${performance.commission.toFixed(2)} approved commission in the latest 24-hour evidence window.`,
      actionUrl: "/performance",
      dedupeKey: `WEEKLY_PERFORMANCE_SUMMARY:${week}`,
    });
    candidates.push({
      type: "MONTHLY_EARNINGS_SUMMARY",
      severity: performance.commission > 0 ? "SUCCESS" : "INFO",
      title: "Monthly earnings snapshot",
      body: `Approved commission in the latest evidence window is ₹${performance.commission.toFixed(2)}. Generate a month-to-date report for the full breakdown.`,
      actionUrl: "/notifications",
      dedupeKey: `MONTHLY_EARNINGS_SUMMARY:${month}`,
    });
  }
  let created = 0;
  for (const candidate of candidates) {
    if (await createNotification(email, candidate)) created += 1;
  }
  return { evaluated: candidates.length, created };
}
