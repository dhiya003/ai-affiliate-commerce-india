import { ApiError } from "@/lib/api/errors";
import { calculateOpportunityScore } from "@/lib/scoring";
import type {
  ProductInput,
  ProductListQuery,
  ProductUpdate,
} from "./schema.ts";
import { productInputSchema } from "./schema.ts";
import type {
  Product,
  ProductListResult,
  ProductStatus,
  ProductStatusEvent,
} from "./types.ts";

type BindValue = string | number | null;

interface ProductRow {
  id: string;
  owner_email: string | null;
  marketplace: Product["marketplace"];
  marketplace_product_id: string;
  name: string;
  description: string | null;
  product_url: string;
  affiliate_url: string | null;
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
  status: ProductStatus;
  notes: string | null;
  tags_json: string;
  opportunity_score: number | null;
  score_json: string | null;
  created_at: string;
  updated_at: string;
}

interface StatusRow {
  id: string;
  product_id: string;
  changed_by_email: string;
  from_status: ProductStatus | null;
  to_status: ProductStatus;
  note: string | null;
  changed_at: string;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB)
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Product storage is unavailable.",
    );
  return env.DB;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function productScore(row: ProductRow): Product["score"] {
  const parsed = parseJson<Partial<NonNullable<Product["score"]>> | null>(
    row.score_json,
    null,
  );

  if (
    parsed &&
    parsed.breakdown &&
    typeof parsed.opportunityScore === "number" &&
    parsed.explanation &&
    Array.isArray(parsed.explanation.strongestFactors) &&
    Array.isArray(parsed.explanation.cautions)
  ) {
    return parsed as NonNullable<Product["score"]>;
  }

  if (row.opportunity_score == null && !row.score_json) return null;

  return calculateOpportunityScore({
    productId: row.id,
    rating: row.rating,
    reviewCount: row.review_count,
    currentPrice: row.current_price,
    originalPrice: row.original_price,
    commissionRate: row.commission_rate,
    sellerRating: row.seller_rating,
    returnRisk: row.return_risk,
  });
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
    tags: parseJson<string[]>(row.tags_json, []),
    opportunityScore: row.opportunity_score,
    score: productScore(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function scoreProduct(id: string, input: ProductInput) {
  return calculateOpportunityScore({
    productId: id,
    rating: input.rating ?? null,
    reviewCount: input.reviewCount,
    currentPrice: input.currentPrice,
    originalPrice: input.originalPrice ?? null,
    commissionRate: input.commissionRate ?? null,
    sellerRating: input.sellerRating ?? null,
    returnRisk: input.returnRisk,
  });
}

const PRODUCT_SELECT = `
  SELECT id, owner_email, marketplace, marketplace_product_id, name,
    description, product_url, affiliate_url, image_url, category, seller_name,
    current_price, original_price, rating, review_count, commission_rate,
    seller_rating, stock_status, return_risk, status, notes, tags_json,
    opportunity_score, score_json, created_at, updated_at
  FROM products
`;

export async function listProducts(
  email: string,
  query: ProductListQuery,
): Promise<ProductListResult> {
  const clauses = ["(owner_email IS NULL OR owner_email = ?)"];
  const values: BindValue[] = [email];

  if (query.q) {
    clauses.push(
      "(name LIKE ? OR category LIKE ? OR marketplace_product_id LIKE ?)",
    );
    const search = `%${query.q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    values.push(search, search, search);
  }
  if (query.marketplace) {
    clauses.push("marketplace = ?");
    values.push(query.marketplace);
  }
  if (query.category) {
    clauses.push("category = ?");
    values.push(query.category);
  }
  if (query.status) {
    clauses.push("status = ?");
    values.push(query.status);
  }
  if (query.minRating != null) {
    clauses.push("rating >= ?");
    values.push(query.minRating);
  }
  if (query.minPrice != null) {
    clauses.push("current_price >= ?");
    values.push(query.minPrice);
  }
  if (query.maxPrice != null) {
    clauses.push("current_price <= ?");
    values.push(query.maxPrice);
  }

  const orderBy = {
    score: "opportunity_score DESC, updated_at DESC",
    newest: "created_at DESC",
    "price-asc": "current_price ASC",
    "price-desc": "current_price DESC",
    rating: "rating DESC, review_count DESC",
  }[query.sort];
  const where = clauses.join(" AND ");
  const offset = (query.page - 1) * query.pageSize;
  const db = await database();
  const [rowsResult, countRow] = await Promise.all([
    db
      .prepare(
        `${PRODUCT_SELECT} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      )
      .bind(...values, query.pageSize, offset)
      .all<ProductRow>(),
    db
      .prepare(`SELECT COUNT(*) AS total FROM products WHERE ${where}`)
      .bind(...values)
      .first<{ total: number }>(),
  ]);
  const total = countRow?.total ?? 0;

  return {
    products: rowsResult.results.map(mapProduct),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function listProductCategories(email: string): Promise<string[]> {
  const result = await (
    await database()
  )
    .prepare(
      `SELECT DISTINCT category
       FROM products
       WHERE owner_email IS NULL OR owner_email = ?
       ORDER BY category ASC`,
    )
    .bind(email)
    .all<{ category: string }>();

  return result.results.map(({ category }) => category.trim()).filter(Boolean);
}

export async function getProduct(
  id: string,
  email: string,
): Promise<Product | null> {
  const row = await (
    await database()
  )
    .prepare(
      `${PRODUCT_SELECT} WHERE id = ? AND (owner_email IS NULL OR owner_email = ?)`,
    )
    .bind(id, email)
    .first<ProductRow>();
  return row ? mapProduct(row) : null;
}

export async function getProductStatusHistory(
  productId: string,
): Promise<ProductStatusEvent[]> {
  const result = await (
    await database()
  )
    .prepare(
      `SELECT id, product_id, changed_by_email, from_status, to_status, note, changed_at
       FROM product_status_history WHERE product_id = ? ORDER BY changed_at DESC`,
    )
    .bind(productId)
    .all<StatusRow>();

  return result.results.map((row) => ({
    id: row.id,
    productId: row.product_id,
    changedByEmail: row.changed_by_email,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    changedAt: row.changed_at,
  }));
}

export async function createProduct(
  input: ProductInput,
  email: string,
): Promise<Product> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const score = scoreProduct(id, input);

  try {
    await (
      await database()
    )
      .prepare(
        `INSERT INTO products (
          id, owner_email, marketplace, marketplace_product_id, name, description,
          product_url, affiliate_url, image_url, category, seller_name, current_price,
          original_price, rating, review_count, commission_rate, seller_rating,
          stock_status, return_risk, status, notes, tags_json, opportunity_score,
          score_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        email,
        input.marketplace,
        input.marketplaceProductId,
        input.name,
        input.description ?? null,
        input.productUrl,
        input.affiliateUrl ?? null,
        input.imageUrl ?? null,
        input.category,
        input.sellerName ?? null,
        input.currentPrice,
        input.originalPrice ?? null,
        input.rating ?? null,
        input.reviewCount,
        input.commissionRate ?? null,
        input.sellerRating ?? null,
        input.stockStatus,
        input.returnRisk,
        input.status,
        input.notes ?? null,
        JSON.stringify(input.tags),
        score.opportunityScore,
        JSON.stringify(score),
        now,
        now,
      )
      .run();
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed/i.test(error.message)
    ) {
      throw new ApiError(
        409,
        "DUPLICATE_PRODUCT",
        "This marketplace product ID has already been imported.",
      );
    }
    throw error;
  }

  const created = await getProduct(id, email);
  if (!created)
    throw new ApiError(
      500,
      "CREATE_FAILED",
      "The product could not be created.",
    );
  return created;
}

export async function updateProduct(
  id: string,
  input: ProductUpdate,
  email: string,
): Promise<Product> {
  const existing = await getProduct(id, email);
  if (!existing)
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  if (existing.ownerEmail !== email) {
    throw new ApiError(
      403,
      "SAMPLE_READ_ONLY",
      "Seed products cannot be edited directly.",
    );
  }

  const merged = productInputSchema.parse({
    marketplace: input.marketplace ?? existing.marketplace,
    marketplaceProductId:
      input.marketplaceProductId ?? existing.marketplaceProductId,
    name: input.name ?? existing.name,
    description:
      input.description === undefined
        ? existing.description
        : input.description,
    productUrl: input.productUrl ?? existing.productUrl,
    affiliateUrl:
      input.affiliateUrl === undefined
        ? existing.affiliateUrl
        : input.affiliateUrl,
    imageUrl: input.imageUrl === undefined ? existing.imageUrl : input.imageUrl,
    category: input.category ?? existing.category,
    sellerName:
      input.sellerName === undefined ? existing.sellerName : input.sellerName,
    currentPrice: input.currentPrice ?? existing.currentPrice,
    originalPrice:
      input.originalPrice === undefined
        ? existing.originalPrice
        : input.originalPrice,
    rating: input.rating === undefined ? existing.rating : input.rating,
    reviewCount: input.reviewCount ?? existing.reviewCount,
    commissionRate:
      input.commissionRate === undefined
        ? existing.commissionRate
        : input.commissionRate,
    sellerRating:
      input.sellerRating === undefined
        ? existing.sellerRating
        : input.sellerRating,
    stockStatus: input.stockStatus ?? existing.stockStatus,
    returnRisk: input.returnRisk ?? existing.returnRisk,
    status: input.status ?? existing.status,
    notes: input.notes === undefined ? existing.notes : input.notes,
    tags: input.tags ?? existing.tags,
  } satisfies ProductInput);
  const score = scoreProduct(id, merged);
  const now = new Date().toISOString();

  await (
    await database()
  )
    .prepare(
      `UPDATE products SET marketplace = ?, marketplace_product_id = ?, name = ?,
       description = ?, product_url = ?, affiliate_url = ?, image_url = ?, category = ?,
       seller_name = ?, current_price = ?, original_price = ?, rating = ?, review_count = ?,
       commission_rate = ?, seller_rating = ?, stock_status = ?, return_risk = ?, status = ?,
       notes = ?, tags_json = ?, opportunity_score = ?, score_json = ?, updated_at = ?
       WHERE id = ? AND owner_email = ?`,
    )
    .bind(
      merged.marketplace,
      merged.marketplaceProductId,
      merged.name,
      merged.description ?? null,
      merged.productUrl,
      merged.affiliateUrl ?? null,
      merged.imageUrl ?? null,
      merged.category,
      merged.sellerName ?? null,
      merged.currentPrice,
      merged.originalPrice ?? null,
      merged.rating ?? null,
      merged.reviewCount,
      merged.commissionRate ?? null,
      merged.sellerRating ?? null,
      merged.stockStatus,
      merged.returnRisk,
      merged.status,
      merged.notes ?? null,
      JSON.stringify(merged.tags),
      score.opportunityScore,
      JSON.stringify(score),
      now,
      id,
      email,
    )
    .run();

  const updated = await getProduct(id, email);
  if (!updated)
    throw new ApiError(
      500,
      "UPDATE_FAILED",
      "The product could not be updated.",
    );
  return updated;
}

export async function deleteProduct(id: string, email: string): Promise<void> {
  const result = await (
    await database()
  )
    .prepare("DELETE FROM products WHERE id = ? AND owner_email = ?")
    .bind(id, email)
    .run();

  if (!result.meta.changes) {
    throw new ApiError(
      404,
      "PRODUCT_NOT_FOUND",
      "Only products you added can be deleted.",
    );
  }
}

export async function changeProductStatus(
  id: string,
  status: ProductStatus,
  note: string | null,
  email: string,
): Promise<Product> {
  const existing = await getProduct(id, email);
  if (!existing)
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const now = new Date().toISOString();
  const db = await database();

  await db.batch([
    db
      .prepare(
        "UPDATE products SET owner_email = ?, status = ?, updated_at = ? WHERE id = ? AND (owner_email IS NULL OR owner_email = ?)",
      )
      .bind(email, status, now, id, email),
    db
      .prepare(
        "INSERT INTO product_status_history (id, product_id, changed_by_email, from_status, to_status, note, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), id, email, existing.status, status, note, now),
  ]);

  const updated = await getProduct(id, email);
  if (!updated)
    throw new ApiError(500, "STATUS_FAILED", "Status could not be updated.");
  return updated;
}

export async function recalculateProductScore(
  id: string,
  email: string,
): Promise<Product> {
  const existing = await getProduct(id, email);
  if (!existing)
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const score = calculateOpportunityScore({
    productId: existing.id,
    rating: existing.rating,
    reviewCount: existing.reviewCount,
    currentPrice: existing.currentPrice,
    originalPrice: existing.originalPrice,
    commissionRate: existing.commissionRate,
    sellerRating: existing.sellerRating,
    returnRisk: existing.returnRisk,
  });

  await (
    await database()
  )
    .prepare(
      "UPDATE products SET opportunity_score = ?, score_json = ?, updated_at = ? WHERE id = ? AND (owner_email IS NULL OR owner_email = ?)",
    )
    .bind(
      score.opportunityScore,
      JSON.stringify(score),
      new Date().toISOString(),
      id,
      email,
    )
    .run();

  const updated = await getProduct(id, email);
  if (!updated)
    throw new ApiError(500, "SCORE_FAILED", "Score could not be saved.");
  return updated;
}
