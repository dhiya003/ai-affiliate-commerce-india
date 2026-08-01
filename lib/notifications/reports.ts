import { ApiError } from "@/lib/api/errors";
import type { ReportGenerationInput } from "./schema.ts";
import type { GeneratedReport } from "./types.ts";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Report storage is unavailable.",
    );
  }
  return env.DB;
}

interface ReportContent {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  summary: Record<string, string | number | null>;
}

async function buildReportContent(
  db: D1Database,
  input: ReportGenerationInput,
  email: string,
): Promise<ReportContent> {
  if (input.type === "DAILY_OPPORTUNITY") {
    const rows = await db
      .prepare(
        `SELECT name AS product, marketplace, category,
          ROUND(opportunity_score, 2) AS opportunity_score,
          ROUND(current_price, 2) AS price,
          ROUND(COALESCE(commission_rate, 0), 2) AS commission_rate,
          return_risk
         FROM products
         WHERE (owner_email IS NULL OR owner_email = ?)
           AND opportunity_score IS NOT NULL
         ORDER BY opportunity_score DESC, updated_at DESC LIMIT 50`,
      )
      .bind(email)
      .all<Record<string, string | number | null>>();
    return {
      columns: [
        "product",
        "marketplace",
        "category",
        "opportunity_score",
        "price",
        "commission_rate",
        "return_risk",
      ],
      rows: rows.results,
      summary: {
        rankedProducts: rows.results.length,
        topScore:
          (rows.results[0]?.opportunity_score as number | undefined) ?? null,
      },
    };
  }
  if (input.type === "WEEKLY_PERFORMANCE") {
    const rows = await db
      .prepare(
        `WITH click_agg AS (
           SELECT tl.campaign_id, COUNT(*) AS clicks
           FROM click_events ce
           JOIN tracked_links tl ON tl.id = ce.tracked_link_id
           WHERE tl.owner_email = ? AND ce.clicked_at BETWEEN ? AND ?
             AND ce.is_bot = 0 AND ce.is_duplicate = 0
           GROUP BY tl.campaign_id
         ), conversion_agg AS (
           SELECT tl.campaign_id, COUNT(*) AS conversions
           FROM conversion_events cv
           JOIN tracked_links tl ON tl.id = cv.tracked_link_id
           WHERE cv.owner_email = ? AND cv.converted_at BETWEEN ? AND ?
             AND cv.order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')
           GROUP BY tl.campaign_id
         ), commission_agg AS (
           SELECT tl.campaign_id, SUM(cm.amount) AS commission
           FROM commission_events cm
           JOIN conversion_events cv ON cv.id = cm.conversion_event_id
           JOIN tracked_links tl ON tl.id = cv.tracked_link_id
           WHERE cm.owner_email = ? AND cm.observed_at BETWEEN ? AND ?
             AND cm.status IN ('APPROVED', 'PAID')
           GROUP BY tl.campaign_id
         )
         SELECT c.name AS campaign, c.channel,
           COALESCE(ca.clicks, 0) AS clicks,
           COALESCE(va.conversions, 0) AS conversions,
           ROUND(COALESCE(ma.commission, 0), 2) AS commission,
           ROUND(CASE WHEN COALESCE(ca.clicks, 0) = 0 THEN 0
             ELSE COALESCE(va.conversions, 0) * 100.0 / ca.clicks END, 2)
             AS conversion_rate
         FROM campaigns c
         LEFT JOIN click_agg ca ON ca.campaign_id = c.id
         LEFT JOIN conversion_agg va ON va.campaign_id = c.id
         LEFT JOIN commission_agg ma ON ma.campaign_id = c.id
         WHERE c.owner_email = ?
         ORDER BY commission DESC, conversions DESC LIMIT 500`,
      )
      .bind(
        email,
        input.from,
        input.to,
        email,
        input.from,
        input.to,
        email,
        input.from,
        input.to,
        email,
      )
      .all<Record<string, string | number | null>>();
    return {
      columns: [
        "campaign",
        "channel",
        "clicks",
        "conversions",
        "commission",
        "conversion_rate",
      ],
      rows: rows.results,
      summary: {
        campaigns: rows.results.length,
        clicks: rows.results.reduce(
          (total, row) => total + Number(row.clicks ?? 0),
          0,
        ),
        conversions: rows.results.reduce(
          (total, row) => total + Number(row.conversions ?? 0),
          0,
        ),
        commission: rows.results.reduce(
          (total, row) => total + Number(row.commission ?? 0),
          0,
        ),
      },
    };
  }
  const rows = await db
    .prepare(
      `SELECT substr(cm.observed_at, 1, 10) AS day, cm.marketplace,
        ROUND(SUM(cm.amount), 2) AS commission,
        COUNT(DISTINCT cm.conversion_event_id) AS conversions
       FROM commission_events cm
       WHERE cm.owner_email = ? AND cm.observed_at BETWEEN ? AND ?
         AND cm.status IN ('APPROVED', 'PAID')
       GROUP BY substr(cm.observed_at, 1, 10), cm.marketplace
       ORDER BY day ASC, cm.marketplace ASC LIMIT 2000`,
    )
    .bind(email, input.from, input.to)
    .all<Record<string, string | number | null>>();
  return {
    columns: ["day", "marketplace", "commission", "conversions"],
    rows: rows.results,
    summary: {
      commission: rows.results.reduce(
        (total, row) => total + Number(row.commission ?? 0),
        0,
      ),
      conversions: rows.results.reduce(
        (total, row) => total + Number(row.conversions ?? 0),
        0,
      ),
    },
  };
}

const titleByType = {
  DAILY_OPPORTUNITY: "Daily opportunity summary",
  WEEKLY_PERFORMANCE: "Weekly performance summary",
  MONTHLY_EARNINGS: "Monthly earnings summary",
} as const;

export async function generateReport(
  input: ReportGenerationInput,
  email: string,
) {
  const db = await database();
  const content = await buildReportContent(db, input, email);
  const id = crypto.randomUUID();
  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  await db
    .prepare(
      `INSERT INTO generated_reports (
        id, owner_email, type, title, period_from, period_to, status, format,
        content_json, row_count, generated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?, ?, ?)
      ON CONFLICT(owner_email, type, period_from, period_to) DO UPDATE SET
        title = excluded.title, status = 'READY', format = excluded.format,
        content_json = excluded.content_json, row_count = excluded.row_count,
        generated_at = excluded.generated_at, expires_at = excluded.expires_at`,
    )
    .bind(
      id,
      email,
      input.type,
      titleByType[input.type],
      input.from,
      input.to,
      input.format,
      JSON.stringify(content),
      content.rows.length,
      generatedAt,
      expiresAt,
    )
    .run();
  return getReportByPeriod(email, input.type, input.from, input.to);
}

interface ReportRow {
  id: string;
  type: GeneratedReport["type"];
  title: string;
  period_from: string;
  period_to: string;
  status: GeneratedReport["status"];
  format: GeneratedReport["format"];
  content_json: string;
  row_count: number;
  generated_at: string;
  expires_at: string;
}

function mapReport(row: ReportRow): GeneratedReport {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    status: row.status,
    format: row.format,
    rowCount: row.row_count,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
  };
}

async function getReportByPeriod(
  email: string,
  type: string,
  from: string,
  to: string,
) {
  const row = await (
    await database()
  )
    .prepare(
      `SELECT id, type, title, period_from, period_to, status, format,
        content_json, row_count, generated_at, expires_at
       FROM generated_reports
       WHERE owner_email = ? AND type = ? AND period_from = ? AND period_to = ?`,
    )
    .bind(email, type, from, to)
    .first<ReportRow>();
  if (!row) {
    throw new ApiError(
      500,
      "REPORT_GENERATION_FAILED",
      "Report could not be generated.",
    );
  }
  return mapReport(row);
}

export async function listReports(email: string) {
  const db = await database();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE generated_reports SET status = 'EXPIRED'
       WHERE owner_email = ? AND status = 'READY' AND expires_at <= ?`,
    )
    .bind(email, now)
    .run();
  const rows = await db
    .prepare(
      `SELECT id, type, title, period_from, period_to, status, format,
        content_json, row_count, generated_at, expires_at
       FROM generated_reports WHERE owner_email = ?
       ORDER BY generated_at DESC LIMIT 100`,
    )
    .bind(email)
    .all<ReportRow>();
  return rows.results.map(mapReport);
}

function safeCsvCell(value: string | number | null) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function downloadReport(id: string, email: string) {
  const row = await (
    await database()
  )
    .prepare(
      `SELECT id, type, title, period_from, period_to, status, format,
        content_json, row_count, generated_at, expires_at
       FROM generated_reports WHERE id = ? AND owner_email = ?`,
    )
    .bind(id, email)
    .first<ReportRow>();
  if (!row) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found.");
  }
  if (row.status !== "READY" || row.expires_at <= new Date().toISOString()) {
    throw new ApiError(410, "REPORT_EXPIRED", "Report has expired.");
  }
  const content = JSON.parse(row.content_json) as ReportContent;
  const filename = `${row.type.toLowerCase()}-${row.period_from.slice(0, 10)}-${row.period_to.slice(0, 10)}`;
  if (row.format === "JSON") {
    return {
      body: JSON.stringify(content, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `${filename}.json`,
    };
  }
  const csv = [
    content.columns.map(safeCsvCell).join(","),
    ...content.rows.map((record) =>
      content.columns
        .map((column) => safeCsvCell(record[column] ?? null))
        .join(","),
    ),
  ].join("\r\n");
  return {
    body: csv,
    contentType: "text/csv; charset=utf-8",
    filename: `${filename}.csv`,
  };
}
