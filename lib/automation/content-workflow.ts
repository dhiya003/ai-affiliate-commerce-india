import { evaluateCompliance } from "@/lib/compliance/engine";
import { generateContent } from "@/lib/content/provider";
import { saveGeneratedContent } from "@/lib/content/repository";
import { contentBundleSchema } from "@/lib/content/schema";
import type { Product } from "@/lib/products/types";

interface ProductRow {
  id: string;
  owner_email: string;
  marketplace: Product["marketplace"];
  marketplace_product_id: string;
  name: string;
  description: string | null;
  product_url: string;
  affiliate_url: string;
  image_url: string | null;
  category: string;
  seller_name: string | null;
  current_price: number;
  original_price: number | null;
  rating: number | null;
  review_count: number;
  commission_rate: number | null;
  seller_rating: number | null;
  stock_status: Product["stockStatus"];
  return_risk: Product["returnRisk"];
  status: Product["status"];
  notes: string | null;
  tags_json: string;
  opportunity_score: number | null;
  created_at: string;
  updated_at: string;
}

interface PendingComplianceRow extends ProductRow {
  generated_content_id: string;
  content_json: string;
}

export interface AffiliatePreparationResult {
  processed: number;
  succeeded: number;
  failed: number;
  productIds: string[];
  failures: Array<{ productId: string; reason: string }>;
}

function safeTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    marketplace: row.marketplace,
    marketplaceProductId: row.marketplace_product_id,
    name: row.name,
    description: row.description,
    productUrl: row.product_url,
    affiliateUrl: row.affiliate_url,
    imageUrl: row.image_url,
    category: row.category,
    sellerName: row.seller_name,
    currentPrice: row.current_price,
    originalPrice: row.original_price,
    rating: row.rating,
    reviewCount: row.review_count,
    commissionRate: row.commission_rate,
    sellerRating: row.seller_rating,
    stockStatus: row.stock_status,
    returnRisk: row.return_risk,
    status: row.status,
    notes: row.notes,
    tags: safeTags(row.tags_json),
    opportunityScore: row.opportunity_score,
    score: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 240) : "Unknown error";
}

/**
 * Generates drafts only for explicitly approved, owned products with an HTTPS
 * affiliate destination. It never creates a promotion or publishes content.
 */
export async function prepareApprovedAffiliateContent(
  db: D1Database,
  limit = 10,
): Promise<AffiliatePreparationResult> {
  const rows = await db
    .prepare(
      `SELECT id, owner_email, marketplace, marketplace_product_id, name,
        description, product_url, affiliate_url, image_url, category,
        seller_name, current_price, original_price, rating, review_count,
        commission_rate, seller_rating, stock_status, return_risk, status,
        notes, tags_json, opportunity_score, created_at, updated_at
       FROM products p
       WHERE owner_email IS NOT NULL
         AND status = 'APPROVED'
         AND stock_status != 'OUT_OF_STOCK'
         AND affiliate_url LIKE 'https://%'
         AND NOT EXISTS (
           SELECT 1 FROM generated_content gc
           WHERE gc.product_id = p.id
             AND gc.created_by_email = p.owner_email
             AND gc.created_at >= p.updated_at
         )
       ORDER BY CASE WHEN marketplace = 'Meesho' THEN 0 ELSE 1 END,
         opportunity_score DESC, updated_at DESC
       LIMIT ?`,
    )
    .bind(Math.max(1, Math.min(limit, 50)))
    .all<ProductRow>();

  const result: AffiliatePreparationResult = {
    processed: rows.results.length,
    succeeded: 0,
    failed: 0,
    productIds: [],
    failures: [],
  };
  for (const row of rows.results) {
    try {
      const product = mapProduct(row);
      const generation = await generateContent(product);
      await saveGeneratedContent(product.id, row.owner_email, generation, db);
      result.succeeded += 1;
      result.productIds.push(product.id);
    } catch (error) {
      result.failed += 1;
      result.failures.push({
        productId: row.id,
        reason: failureReason(error),
      });
    }
  }
  return result;
}

/** Runs compliance on each newest unchecked draft. Passing content remains a
 * draft for human review. No promotion, tracked link, or publishing action is
 * created by this workflow. */
export async function checkPendingAffiliateContent(
  db: D1Database,
  limit = 25,
): Promise<AffiliatePreparationResult> {
  const rows = await db
    .prepare(
      `SELECT p.id, p.owner_email, p.marketplace, p.marketplace_product_id,
        p.name, p.description, p.product_url, p.affiliate_url, p.image_url,
        p.category, p.seller_name, p.current_price, p.original_price, p.rating,
        p.review_count, p.commission_rate, p.seller_rating, p.stock_status,
        p.return_risk, p.status, p.notes, p.tags_json, p.opportunity_score,
        p.created_at, p.updated_at, gc.id AS generated_content_id,
        gc.content_json
       FROM generated_content gc
       JOIN products p ON p.id = gc.product_id
       WHERE p.owner_email IS NOT NULL
         AND gc.created_by_email = p.owner_email
         AND p.status = 'APPROVED'
         AND NOT EXISTS (
           SELECT 1 FROM compliance_checks cc
           WHERE cc.generated_content_id = gc.id
         )
         AND gc.created_at = (
           SELECT MAX(newest.created_at) FROM generated_content newest
           WHERE newest.product_id = p.id
             AND newest.created_by_email = p.owner_email
         )
       ORDER BY CASE WHEN p.marketplace = 'Meesho' THEN 0 ELSE 1 END,
         gc.created_at ASC
       LIMIT ?`,
    )
    .bind(Math.max(1, Math.min(limit, 100)))
    .all<PendingComplianceRow>();

  const result: AffiliatePreparationResult = {
    processed: rows.results.length,
    succeeded: 0,
    failed: 0,
    productIds: [],
    failures: [],
  };
  for (const row of rows.results) {
    try {
      const product = mapProduct(row);
      const content = contentBundleSchema.parse(JSON.parse(row.content_json));
      const evaluation = evaluateCompliance({ product, content });
      const id = crypto.randomUUID();
      const checkedAt = new Date().toISOString();
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(row.content_json),
      );
      const contentHash = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
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
            product.id,
            row.generated_content_id,
            product.marketplace,
            evaluation.status,
            evaluation.highestSeverity,
            contentHash,
            row.owner_email,
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
      result.succeeded += 1;
      result.productIds.push(product.id);
    } catch (error) {
      result.failed += 1;
      result.failures.push({
        productId: row.id,
        reason: failureReason(error),
      });
    }
  }
  return result;
}
