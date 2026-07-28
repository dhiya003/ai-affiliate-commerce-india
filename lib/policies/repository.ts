import { ApiError } from "@/lib/api/errors";
import type { PolicyListQuery } from "./schema";
import type {
  PlatformUpdate,
  PolicyKind,
  PolicyKnowledgeBase,
  PolicyRecord,
  PolicyStatus,
} from "./types";

interface PolicyRow {
  id: string;
  kind: PolicyKind;
  marketplace: string;
  title: string;
  summary: string;
  effective_at: string;
  source_url: string;
  status: PolicyStatus;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  rule_type: string | null;
  category: string | null;
  rate_min: number | null;
  rate_max: number | null;
  channel: string | null;
  disclosure_text: string | null;
  placement: string | null;
  severity: string | null;
}

interface UpdateRow {
  id: string;
  marketplace: string;
  policy_kind: PolicyKind;
  policy_id: string | null;
  change_type: string;
  previous_status: PolicyStatus | null;
  next_status: PolicyStatus | null;
  summary: string;
  source_url: string;
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
}

const POLICY_TABLES: Record<PolicyKind, string> = {
  MARKETPLACE_RULE: "marketplace_rules",
  COMMISSION_RULE: "commission_rules",
  CONTENT_POLICY: "content_policies",
  AFFILIATE_DISCLOSURE: "affiliate_disclosures",
  PROHIBITED_PRACTICE: "prohibited_practices",
};

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Policy storage is unavailable.",
    );
  }
  return env.DB;
}

function mapPolicy(row: PolicyRow): PolicyRecord {
  return {
    id: row.id,
    kind: row.kind,
    marketplace: row.marketplace,
    title: row.title,
    summary: row.summary,
    effectiveAt: row.effective_at,
    sourceUrl: row.source_url,
    status: row.status,
    reviewedAt: row.reviewed_at,
    reviewedByEmail: row.reviewed_by_email,
    ruleType: row.rule_type,
    category: row.category,
    rateMin: row.rate_min,
    rateMax: row.rate_max,
    channel: row.channel,
    disclosureText: row.disclosure_text,
    placement: row.placement,
    severity: row.severity,
  };
}

function mapUpdate(row: UpdateRow): PlatformUpdate {
  return {
    id: row.id,
    marketplace: row.marketplace,
    policyKind: row.policy_kind,
    policyId: row.policy_id,
    changeType: row.change_type,
    previousStatus: row.previous_status,
    nextStatus: row.next_status,
    summary: row.summary,
    sourceUrl: row.source_url,
    detectedAt: row.detected_at,
    reviewedAt: row.reviewed_at,
    reviewedByEmail: row.reviewed_by_email,
  };
}

const POLICY_UNION = `
  SELECT id, 'MARKETPLACE_RULE' AS kind, marketplace, title, summary,
    effective_at, source_url, status, reviewed_at, reviewed_by_email,
    rule_type, NULL AS category, NULL AS rate_min, NULL AS rate_max,
    NULL AS channel, NULL AS disclosure_text, NULL AS placement, NULL AS severity
  FROM marketplace_rules
  UNION ALL
  SELECT id, 'COMMISSION_RULE' AS kind, marketplace, title, summary,
    effective_at, source_url, status, reviewed_at, reviewed_by_email,
    NULL AS rule_type, category, rate_min, rate_max, NULL AS channel,
    NULL AS disclosure_text, NULL AS placement, NULL AS severity
  FROM commission_rules
  UNION ALL
  SELECT id, 'CONTENT_POLICY' AS kind, marketplace, title, summary,
    effective_at, source_url, status, reviewed_at, reviewed_by_email,
    NULL AS rule_type, NULL AS category, NULL AS rate_min, NULL AS rate_max,
    channel, NULL AS disclosure_text, NULL AS placement, NULL AS severity
  FROM content_policies
  UNION ALL
  SELECT id, 'AFFILIATE_DISCLOSURE' AS kind, marketplace, title, summary,
    effective_at, source_url, status, reviewed_at, reviewed_by_email,
    NULL AS rule_type, NULL AS category, NULL AS rate_min, NULL AS rate_max,
    NULL AS channel, disclosure_text, placement, NULL AS severity
  FROM affiliate_disclosures
  UNION ALL
  SELECT id, 'PROHIBITED_PRACTICE' AS kind, marketplace, title, summary,
    effective_at, source_url, status, reviewed_at, reviewed_by_email,
    NULL AS rule_type, NULL AS category, NULL AS rate_min, NULL AS rate_max,
    NULL AS channel, NULL AS disclosure_text, NULL AS placement, severity
  FROM prohibited_practices
`;

export async function listPolicyKnowledgeBase(
  query: PolicyListQuery = {},
): Promise<PolicyKnowledgeBase> {
  const db = await database();
  const [policyResult, updateResult] = await Promise.all([
    db.prepare(POLICY_UNION).all<PolicyRow>(),
    db
      .prepare(
        `SELECT id, marketplace, policy_kind, policy_id, change_type,
          previous_status, next_status, summary, source_url, detected_at,
          reviewed_at, reviewed_by_email
         FROM platform_update_history
         ORDER BY detected_at DESC`,
      )
      .all<UpdateRow>(),
  ]);

  const allPolicies = policyResult.results.map(mapPolicy);
  const policies = allPolicies
    .filter(
      (policy) =>
        (!query.marketplace ||
          policy.marketplace.toLowerCase() ===
            query.marketplace.toLowerCase()) &&
        (!query.kind || policy.kind === query.kind) &&
        (!query.status || policy.status === query.status),
    )
    .sort(
      (left, right) =>
        right.effectiveAt.localeCompare(left.effectiveAt) ||
        left.marketplace.localeCompare(right.marketplace),
    );

  return {
    policies,
    updates: updateResult.results.map(mapUpdate),
    summary: {
      total: allPolicies.length,
      active: allPolicies.filter((policy) => policy.status === "ACTIVE").length,
      needsReview: allPolicies.filter(
        (policy) => policy.status === "NEEDS_REVIEW",
      ).length,
      blockingPractices: allPolicies.filter(
        (policy) =>
          policy.kind === "PROHIBITED_PRACTICE" &&
          policy.severity === "BLOCKING" &&
          policy.status === "ACTIVE",
      ).length,
    },
  };
}

export async function updatePolicyStatus(
  kind: PolicyKind,
  id: string,
  status: PolicyStatus,
  reviewerEmail: string,
): Promise<PolicyRecord> {
  const db = await database();
  const table = POLICY_TABLES[kind];
  const existing = await db
    .prepare(
      `SELECT id, marketplace, title, status, source_url FROM ${table} WHERE id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      marketplace: string;
      title: string;
      status: PolicyStatus;
      source_url: string;
    }>();

  if (!existing) {
    throw new ApiError(404, "POLICY_NOT_FOUND", "Policy record not found.");
  }

  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE ${table}
         SET status = ?, reviewed_at = ?, reviewed_by_email = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(status, now, reviewerEmail, now, id),
    db
      .prepare(
        `INSERT INTO platform_update_history (
          id, marketplace, policy_kind, policy_id, change_type,
          previous_status, next_status, summary, source_url, detected_at,
          reviewed_at, reviewed_by_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        existing.marketplace,
        kind,
        id,
        "STATUS_REVIEWED",
        existing.status,
        status,
        `${existing.title} was reviewed and marked ${status}.`,
        existing.source_url,
        now,
        now,
        reviewerEmail,
        now,
      ),
  ]);

  const result = await listPolicyKnowledgeBase({ kind });
  const updated = result.policies.find((policy) => policy.id === id);
  if (!updated) {
    throw new ApiError(
      500,
      "POLICY_UPDATE_FAILED",
      "Policy status could not be confirmed.",
    );
  }
  return updated;
}
