import { ApiError } from "../api/errors";
import type {
  MeeshoCreatorWorkflow,
  MeeshoWorkflowImport,
  MeeshoWorkflowStatus,
} from "./workflow-schema.ts";
import { summarizeMeeshoWorkflowList } from "./workflow-schema.ts";

interface WorkflowRow {
  id: string;
  owner_email: string;
  product_id: string | null;
  source: "MEESHO_WISHLIST";
  status: MeeshoWorkflowStatus;
  product_url: string;
  affiliate_url: string | null;
  title: string;
  image_url: string;
  category: string;
  price: number;
  original_price: number | null;
  supplier_name: string | null;
  observed_at: string;
  facts_verified_at: string | null;
  generated_content_id: string | null;
  caption: string | null;
  hashtags_json: string;
  creative_public_token: string | null;
  creative_rendered_at: string | null;
  approved_at: string | null;
  instagram_creation_id: string | null;
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  published_at: string | null;
  autodm_enrolled_at: string | null;
  autodm_trigger_words_json: string;
  publish_attempt_count: number;
  next_retry_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

async function database(db?: D1Database) {
  if (db) return db;
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Workflow storage is unavailable.",
    );
  }
  return env.DB;
}

function jsonStrings(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function mapRow(row: WorkflowRow): MeeshoCreatorWorkflow {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    productId: row.product_id,
    source: row.source,
    status: row.status,
    productUrl: row.product_url,
    affiliateUrl: row.affiliate_url,
    title: row.title,
    imageUrl: row.image_url,
    category: row.category,
    price: row.price,
    originalPrice: row.original_price,
    supplierName: row.supplier_name,
    observedAt: row.observed_at,
    factsVerifiedAt: row.facts_verified_at,
    generatedContentId: row.generated_content_id,
    caption: row.caption,
    hashtags: jsonStrings(row.hashtags_json),
    creativePublicToken: row.creative_public_token,
    creativeRenderedAt: row.creative_rendered_at,
    approvedAt: row.approved_at,
    instagramCreationId: row.instagram_creation_id,
    instagramMediaId: row.instagram_media_id,
    instagramPermalink: row.instagram_permalink,
    publishedAt: row.published_at,
    autoDmEnrolledAt: row.autodm_enrolled_at,
    autoDmTriggerWords: jsonStrings(row.autodm_trigger_words_json),
    publishAttemptCount: row.publish_attempt_count,
    nextRetryAt: row.next_retry_at,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const columns = `id, owner_email, product_id, source, status, product_url,
  affiliate_url, title, image_url, category, price, original_price,
  supplier_name, observed_at, facts_verified_at, generated_content_id,
  caption, hashtags_json, creative_public_token, creative_rendered_at,
  approved_at, instagram_creation_id, instagram_media_id,
  instagram_permalink, published_at, autodm_enrolled_at,
  autodm_trigger_words_json, publish_attempt_count, next_retry_at,
  last_error_code, last_error_message, created_at, updated_at`;

export async function createMeeshoWorkflow(
  ownerEmail: string,
  input: MeeshoWorkflowImport,
  db?: D1Database,
) {
  const store = await database(db);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await store
    .prepare(
      `INSERT INTO meesho_creator_workflows (
        id, owner_email, product_id, product_url, title, image_url, category,
        price, original_price, supplier_name, observed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_email, product_url) DO UPDATE SET
        product_id = COALESCE(excluded.product_id, product_id),
        title = excluded.title, image_url = excluded.image_url,
        category = excluded.category, price = excluded.price,
        original_price = excluded.original_price,
        supplier_name = excluded.supplier_name,
        observed_at = excluded.observed_at, updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      ownerEmail,
      input.productId ?? null,
      input.productUrl,
      input.title,
      input.imageUrl,
      input.category,
      input.price,
      input.originalPrice,
      input.supplierName,
      input.observedAt,
      now,
      now,
    )
    .run();
  const created = await store
    .prepare(
      `SELECT ${columns} FROM meesho_creator_workflows WHERE owner_email = ? AND product_url = ?`,
    )
    .bind(ownerEmail, input.productUrl)
    .first<WorkflowRow>();
  if (!created)
    throw new ApiError(
      500,
      "WORKFLOW_CREATE_FAILED",
      "Workflow could not be created.",
    );
  return mapRow(created);
}

export async function listMeeshoWorkflows(ownerEmail: string, db?: D1Database) {
  const rows = await (
    await database(db)
  )
    .prepare(
      `SELECT ${columns} FROM meesho_creator_workflows WHERE owner_email = ? ORDER BY updated_at DESC LIMIT 100`,
    )
    .bind(ownerEmail)
    .all<WorkflowRow>();
  return rows.results.map(mapRow);
}

export async function getMeeshoWorkflow(
  id: string,
  ownerEmail: string,
  db?: D1Database,
) {
  const row = await (
    await database(db)
  )
    .prepare(
      `SELECT ${columns} FROM meesho_creator_workflows WHERE id = ? AND owner_email = ?`,
    )
    .bind(id, ownerEmail)
    .first<WorkflowRow>();
  return row ? mapRow(row) : null;
}

export async function getPublicMeeshoWorkflow(token: string, db?: D1Database) {
  const row = await (
    await database(db)
  )
    .prepare(
      `SELECT ${columns} FROM meesho_creator_workflows WHERE creative_public_token = ?`,
    )
    .bind(token)
    .first<WorkflowRow>();
  return row ? mapRow(row) : null;
}

async function requireWorkflow(
  id: string,
  ownerEmail: string,
  db?: D1Database,
) {
  const workflow = await getMeeshoWorkflow(id, ownerEmail, db);
  if (!workflow)
    throw new ApiError(404, "WORKFLOW_NOT_FOUND", "Meesho workflow not found.");
  return workflow;
}

function requireStatus(
  workflow: MeeshoCreatorWorkflow,
  allowed: MeeshoWorkflowStatus[],
) {
  if (!allowed.includes(workflow.status)) {
    throw new ApiError(
      409,
      "INVALID_WORKFLOW_STATE",
      `Action is not available while workflow is ${workflow.status}.`,
    );
  }
}

export async function recordMeeshoAffiliateLink(
  id: string,
  ownerEmail: string,
  affiliateUrl: string,
  db?: D1Database,
) {
  const workflow = await requireWorkflow(id, ownerEmail, db);
  requireStatus(workflow, ["IMPORTED", "LINK_READY"]);
  const now = new Date().toISOString();
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET affiliate_url = ?, facts_verified_at = ?, status = 'LINK_READY', last_error_code = NULL, last_error_message = NULL, updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(affiliateUrl, now, now, id, ownerEmail)
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export async function recordMeeshoCreative(
  id: string,
  ownerEmail: string,
  input: {
    caption: string;
    hashtags: string[];
    generatedContentId?: string | null;
  },
  db?: D1Database,
) {
  const workflow = await requireWorkflow(id, ownerEmail, db);
  requireStatus(workflow, ["LINK_READY", "CREATIVE_READY"]);
  if (
    /https?:\/\//i.test(input.caption) ||
    !/comment\s+link/i.test(input.caption) ||
    !/#ad\s*$/i.test(input.caption)
  ) {
    throw new ApiError(
      422,
      "INVALID_AUTODM_CAPTION",
      "Caption must omit URLs, ask viewers to comment LINK, and end with #ad before hashtags.",
    );
  }
  const token =
    workflow.creativePublicToken ?? crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET generated_content_id = ?, caption = ?, hashtags_json = ?, creative_public_token = ?, creative_rendered_at = ?, status = 'CREATIVE_READY', updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(
      input.generatedContentId ?? null,
      input.caption,
      JSON.stringify(input.hashtags),
      token,
      now,
      now,
      id,
      ownerEmail,
    )
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export async function approveMeeshoWorkflow(
  id: string,
  ownerEmail: string,
  db?: D1Database,
) {
  const workflow = await requireWorkflow(id, ownerEmail, db);
  requireStatus(workflow, ["CREATIVE_READY", "APPROVED"]);
  const now = new Date().toISOString();
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET status = 'APPROVED', approved_at = ?, updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(now, now, id, ownerEmail)
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export async function markMeeshoPublishing(
  id: string,
  ownerEmail: string,
  db?: D1Database,
) {
  const workflow = await requireWorkflow(id, ownerEmail, db);
  requireStatus(workflow, ["APPROVED", "RETRY_SCHEDULED", "FAILED"]);
  const now = new Date().toISOString();
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET status = 'PUBLISHING', publish_attempt_count = publish_attempt_count + 1, next_retry_at = NULL, updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(now, id, ownerEmail)
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export async function markMeeshoPublished(
  id: string,
  ownerEmail: string,
  result: { creationId: string; mediaId: string; permalink: string | null },
  db?: D1Database,
) {
  const now = new Date().toISOString();
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET status = 'PUBLISHED', instagram_creation_id = ?, instagram_media_id = ?, instagram_permalink = ?, published_at = ?, next_retry_at = NULL, last_error_code = NULL, last_error_message = NULL, updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(
      result.creationId,
      result.mediaId,
      result.permalink,
      now,
      now,
      id,
      ownerEmail,
    )
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export async function markMeeshoPublishFailed(
  id: string,
  ownerEmail: string,
  error: unknown,
  db?: D1Database,
) {
  const workflow = await requireWorkflow(id, ownerEmail, db);
  const terminal = workflow.publishAttemptCount >= 3;
  const delayMinutes = Math.min(
    60,
    2 ** Math.max(0, workflow.publishAttemptCount - 1) * 5,
  );
  const now = new Date();
  const code =
    error instanceof ApiError
      ? error.code
      : error instanceof Error &&
          "code" in error &&
          typeof error.code === "string"
        ? error.code
        : "PUBLISH_FAILED";
  const message =
    error instanceof Error
      ? error.message.slice(0, 500)
      : "Instagram publishing failed.";
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET status = ?, next_retry_at = ?, last_error_code = ?, last_error_message = ?, updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(
      terminal ? "FAILED" : "RETRY_SCHEDULED",
      terminal
        ? null
        : new Date(now.getTime() + delayMinutes * 60_000).toISOString(),
      code,
      message,
      now.toISOString(),
      id,
      ownerEmail,
    )
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export async function confirmMeeshoAutoDm(
  id: string,
  ownerEmail: string,
  triggerWords: string[],
  db?: D1Database,
) {
  const workflow = await requireWorkflow(id, ownerEmail, db);
  requireStatus(workflow, ["PUBLISHED", "AUTODM_ENROLLED"]);
  const now = new Date().toISOString();
  await (
    await database(db)
  )
    .prepare(
      `UPDATE meesho_creator_workflows SET status = 'AUTODM_ENROLLED', autodm_enrolled_at = ?, autodm_trigger_words_json = ?, updated_at = ? WHERE id = ? AND owner_email = ?`,
    )
    .bind(now, JSON.stringify(triggerWords), now, id, ownerEmail)
    .run();
  return requireWorkflow(id, ownerEmail, db);
}

export function summarizeMeeshoWorkflows(workflows: MeeshoCreatorWorkflow[]) {
  return summarizeMeeshoWorkflowList(workflows);
}
