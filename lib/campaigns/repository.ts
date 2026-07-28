import { ApiError } from "@/lib/api/errors";
import type { CampaignInput, CampaignQuery } from "./schema";
import type { CampaignStatus, CampaignSummary } from "./types";

interface CampaignRow {
  id: string;
  name: string;
  objective: string;
  channel: string;
  starts_at: string | null;
  ends_at: string | null;
  budget: number | null;
  currency: string;
  status: CampaignStatus;
  notes: string | null;
  template_name: string | null;
  duplicated_from_id: string | null;
  archived_at: string | null;
  promotion_count: number;
  published_count: number;
  created_at: string;
  updated_at: string;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Campaign storage is unavailable.",
    );
  }
  return env.DB;
}

function mapCampaign(row: CampaignRow): CampaignSummary {
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    channel: row.channel,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    budget: row.budget,
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    templateName: row.template_name,
    duplicatedFromId: row.duplicated_from_id,
    archivedAt: row.archived_at,
    promotionCount: row.promotion_count,
    publishedCount: row.published_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const campaignSelect = `SELECT c.id, c.name, c.objective, c.channel,
  c.starts_at, c.ends_at, c.budget, c.currency, c.status, c.notes,
  c.template_name, c.duplicated_from_id, c.archived_at, c.created_at,
  c.updated_at, COUNT(p.id) AS promotion_count,
  COALESCE(SUM(CASE WHEN p.status = 'PUBLISHED' THEN 1 ELSE 0 END), 0)
    AS published_count
 FROM campaigns c
 LEFT JOIN promotions p ON p.campaign_id = c.id`;

export async function listCampaigns(
  email: string,
  query: CampaignQuery,
): Promise<CampaignSummary[]> {
  const clauses = ["c.owner_email = ?"];
  const values: Array<string | number> = [email];
  if (!query.includeArchived) clauses.push("c.archived_at IS NULL");
  if (query.status) {
    clauses.push("c.status = ?");
    values.push(query.status);
  }
  if (query.channel) {
    clauses.push("c.channel = ?");
    values.push(query.channel);
  }
  if (query.q) {
    clauses.push(
      "(LOWER(c.name) LIKE ? OR LOWER(c.objective) LIKE ? OR LOWER(COALESCE(c.notes, '')) LIKE ?)",
    );
    const term = `%${query.q.toLowerCase()}%`;
    values.push(term, term, term);
  }

  const rows = await (
    await database()
  )
    .prepare(
      `${campaignSelect}
       WHERE ${clauses.join(" AND ")}
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 100`,
    )
    .bind(...values)
    .all<CampaignRow>();
  return rows.results.map(mapCampaign);
}

async function getCampaignRow(
  db: D1Database,
  id: string,
  email: string,
): Promise<CampaignRow | null> {
  return db
    .prepare(
      `${campaignSelect}
       WHERE c.id = ? AND c.owner_email = ?
       GROUP BY c.id`,
    )
    .bind(id, email)
    .first<CampaignRow>();
}

export async function createCampaign(
  input: CampaignInput,
  email: string,
): Promise<CampaignSummary> {
  const db = await database();
  if (input.creatorAccountId) {
    const creator = await db
      .prepare(
        "SELECT id FROM creator_accounts WHERE id = ? AND owner_email = ? AND is_active = 1",
      )
      .bind(input.creatorAccountId, email)
      .first<{ id: string }>();
    if (!creator) {
      throw new ApiError(
        404,
        "CREATOR_ACCOUNT_NOT_FOUND",
        "Creator account not found.",
      );
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO campaigns (
        id, owner_email, creator_account_id, name, objective, channel,
        starts_at, ends_at, budget, currency, status, notes, template_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`,
    )
    .bind(
      id,
      email,
      input.creatorAccountId ?? null,
      input.name,
      input.objective,
      input.channel,
      input.startsAt ?? null,
      input.endsAt ?? null,
      input.budget,
      input.currency,
      input.notes ?? null,
      input.templateName ?? null,
      now,
      now,
    )
    .run();
  const campaign = await getCampaignRow(db, id, email);
  if (!campaign) {
    throw new ApiError(
      500,
      "CAMPAIGN_CREATE_FAILED",
      "Campaign was not saved.",
    );
  }
  return mapCampaign(campaign);
}

export async function duplicateCampaign(
  id: string,
  email: string,
): Promise<CampaignSummary> {
  const db = await database();
  const source = await db
    .prepare(
      `SELECT id, creator_account_id, name, objective, channel, starts_at,
        ends_at, budget, currency, notes, template_name
       FROM campaigns WHERE id = ? AND owner_email = ?`,
    )
    .bind(id, email)
    .first<{
      id: string;
      creator_account_id: string | null;
      name: string;
      objective: string;
      channel: string;
      starts_at: string | null;
      ends_at: string | null;
      budget: number | null;
      currency: string;
      notes: string | null;
      template_name: string | null;
    }>();
  if (!source) {
    throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  }

  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const promotions = await db
    .prepare(
      `SELECT product_id, generated_content_id, content_variation_id,
        scheduled_at FROM promotions
       WHERE campaign_id = ? AND owner_email = ? AND status != 'ARCHIVED'`,
    )
    .bind(id, email)
    .all<{
      product_id: string;
      generated_content_id: string | null;
      content_variation_id: string | null;
      scheduled_at: string | null;
    }>();
  const statements = [
    db
      .prepare(
        `INSERT INTO campaigns (
          id, owner_email, creator_account_id, name, objective, channel,
          starts_at, ends_at, budget, currency, status, notes, template_name,
          duplicated_from_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId,
        email,
        source.creator_account_id,
        `${source.name} (copy)`,
        source.objective,
        source.channel,
        source.starts_at,
        source.ends_at,
        source.budget,
        source.currency,
        source.notes,
        source.template_name,
        source.id,
        now,
        now,
      ),
    ...promotions.results.map((promotion) =>
      db
        .prepare(
          `INSERT INTO promotions (
            id, owner_email, campaign_id, product_id, generated_content_id,
            content_variation_id, status, scheduled_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'PLANNED', ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          email,
          newId,
          promotion.product_id,
          promotion.generated_content_id,
          promotion.content_variation_id,
          promotion.scheduled_at,
          now,
          now,
        ),
    ),
  ];
  await db.batch(statements);
  const campaign = await getCampaignRow(db, newId, email);
  if (!campaign) {
    throw new ApiError(
      500,
      "CAMPAIGN_DUPLICATE_FAILED",
      "Campaign was not duplicated.",
    );
  }
  return mapCampaign(campaign);
}

export async function archiveCampaign(
  id: string,
  email: string,
): Promise<CampaignSummary> {
  const db = await database();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE campaigns SET status = 'ARCHIVED', archived_at = ?,
        updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(now, now, id, email)
    .run();
  if (!result.meta.changes) {
    throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  }
  const campaign = await getCampaignRow(db, id, email);
  if (!campaign) {
    throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  }
  return mapCampaign(campaign);
}
