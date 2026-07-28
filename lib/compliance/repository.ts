import { ApiError } from "@/lib/api/errors";
import { getLatestContent } from "@/lib/content/repository";
import { getProduct } from "@/lib/products/repository";
import { evaluateCompliance } from "./engine.ts";
import type {
  ComplianceResult,
  ComplianceSeverity,
  ComplianceStatus,
  StoredComplianceCheck,
} from "./types.ts";

interface CheckRow {
  id: string;
  product_id: string;
  generated_content_id: string | null;
  marketplace: string;
  status: ComplianceStatus;
  highest_severity: ComplianceSeverity;
  checked_by_email: string;
  checked_at: string;
  overridden_at: string | null;
  overridden_by_email: string | null;
  override_reason: string | null;
}

interface ResultRow {
  rule_code: string;
  status: Exclude<ComplianceStatus, "OVERRIDDEN">;
  severity: ComplianceSeverity;
  message: string;
  fix_suggestion: string | null;
  evidence_json: string;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Compliance storage is unavailable.",
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

async function mapCheck(
  db: D1Database,
  row: CheckRow,
): Promise<StoredComplianceCheck> {
  const results = await db
    .prepare(
      `SELECT rule_code, status, severity, message, fix_suggestion, evidence_json
       FROM compliance_check_results WHERE check_id = ? ORDER BY rule_code`,
    )
    .bind(row.id)
    .all<ResultRow>();
  const mappedResults: ComplianceResult[] = results.results.map((item) => ({
    ruleCode: item.rule_code,
    status: item.status,
    severity: item.severity,
    message: item.message,
    fixSuggestion: item.fix_suggestion,
    evidence: JSON.parse(item.evidence_json) as Record<string, unknown>,
  }));
  return {
    id: row.id,
    productId: row.product_id,
    generatedContentId: row.generated_content_id,
    marketplace: row.marketplace,
    status: row.status,
    highestSeverity: row.highest_severity,
    checkedByEmail: row.checked_by_email,
    checkedAt: row.checked_at,
    overriddenAt: row.overridden_at,
    overriddenByEmail: row.overridden_by_email,
    overrideReason: row.override_reason,
    exportBlocked:
      row.status !== "OVERRIDDEN" &&
      mappedResults.some(
        (item) => item.status === "FAIL" && item.severity === "BLOCKING",
      ),
    results: mappedResults,
  };
}

export async function getLatestComplianceCheck(
  productId: string,
  email: string,
): Promise<StoredComplianceCheck | null> {
  const product = await getProduct(productId, email);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  const db = await database();
  const row = await db
    .prepare(
      `SELECT id, product_id, generated_content_id, marketplace, status,
        highest_severity, checked_by_email, checked_at, overridden_at,
        overridden_by_email, override_reason
       FROM compliance_checks WHERE product_id = ?
       ORDER BY checked_at DESC LIMIT 1`,
    )
    .bind(productId)
    .first<CheckRow>();
  return row ? mapCheck(db, row) : null;
}

export async function runComplianceCheck(
  productId: string,
  email: string,
): Promise<StoredComplianceCheck> {
  const [product, content] = await Promise.all([
    getProduct(productId, email),
    getLatestContent(productId, email),
  ]);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  if (!content) {
    throw new ApiError(
      409,
      "CONTENT_REQUIRED",
      "Generate a content bundle before running compliance checks.",
    );
  }
  const evaluation = evaluateCompliance({
    product,
    content: content.content,
  });
  const db = await database();
  const id = crypto.randomUUID();
  const checkedAt = new Date().toISOString();
  const contentHash = await sha256(JSON.stringify(content.content));
  await db.batch([
    db
      .prepare(
        `INSERT INTO compliance_checks (
          id, product_id, generated_content_id, marketplace, status,
          highest_severity, content_hash, checked_by_email, checked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        productId,
        content.id,
        product.marketplace,
        evaluation.status,
        evaluation.highestSeverity,
        contentHash,
        email,
        checkedAt,
      ),
    ...evaluation.results.map((item) =>
      db
        .prepare(
          `INSERT INTO compliance_check_results (
            id, check_id, rule_code, status, severity, message,
            fix_suggestion, evidence_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          item.ruleCode,
          item.status,
          item.severity,
          item.message,
          item.fixSuggestion,
          JSON.stringify(item.evidence),
          checkedAt,
        ),
    ),
  ]);
  const row = await db
    .prepare(
      `SELECT id, product_id, generated_content_id, marketplace, status,
        highest_severity, checked_by_email, checked_at, overridden_at,
        overridden_by_email, override_reason
       FROM compliance_checks WHERE id = ?`,
    )
    .bind(id)
    .first<CheckRow>();
  if (!row) {
    throw new ApiError(
      500,
      "COMPLIANCE_SAVE_FAILED",
      "Compliance results could not be saved.",
    );
  }
  return mapCheck(db, row);
}

export async function overrideComplianceCheck(
  checkId: string,
  reason: string,
  email: string,
): Promise<StoredComplianceCheck> {
  const db = await database();
  const existing = await db
    .prepare(
      `SELECT id, product_id, generated_content_id, marketplace, status,
        highest_severity, checked_by_email, checked_at, overridden_at,
        overridden_by_email, override_reason
       FROM compliance_checks WHERE id = ?`,
    )
    .bind(checkId)
    .first<CheckRow>();
  if (!existing) {
    throw new ApiError(
      404,
      "COMPLIANCE_CHECK_NOT_FOUND",
      "Compliance check not found.",
    );
  }
  if (existing.status === "PASS" || existing.status === "OVERRIDDEN") {
    throw new ApiError(
      409,
      "OVERRIDE_NOT_ALLOWED",
      "Only an active warning or failed check can be overridden.",
    );
  }
  const overriddenAt = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE compliance_checks SET status = 'OVERRIDDEN',
          overridden_at = ?, overridden_by_email = ?, override_reason = ?
         WHERE id = ? AND status IN ('WARNING', 'FAIL')`,
      )
      .bind(overriddenAt, email, reason, checkId),
    db
      .prepare(
        `INSERT INTO compliance_overrides (
          id, check_id, from_status, to_status, reason,
          overridden_by_email, created_at
        ) VALUES (?, ?, ?, 'OVERRIDDEN', ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        checkId,
        existing.status,
        reason,
        email,
        overriddenAt,
      ),
  ]);
  const updated = await db
    .prepare(
      `SELECT id, product_id, generated_content_id, marketplace, status,
        highest_severity, checked_by_email, checked_at, overridden_at,
        overridden_by_email, override_reason
       FROM compliance_checks WHERE id = ?`,
    )
    .bind(checkId)
    .first<CheckRow>();
  if (!updated) {
    throw new ApiError(
      500,
      "OVERRIDE_FAILED",
      "Compliance override could not be saved.",
    );
  }
  return mapCheck(db, updated);
}
