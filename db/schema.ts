import {
  index,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email"),
    marketplace: text("marketplace").notNull(),
    marketplaceProductId: text("marketplace_product_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    productUrl: text("product_url").notNull(),
    affiliateUrl: text("affiliate_url"),
    imageUrl: text("image_url"),
    category: text("category").notNull(),
    sellerName: text("seller_name"),
    currentPrice: real("current_price").notNull(),
    originalPrice: real("original_price"),
    rating: real("rating"),
    reviewCount: real("review_count").notNull().default(0),
    commissionRate: real("commission_rate"),
    sellerRating: real("seller_rating"),
    stockStatus: text("stock_status").notNull().default("UNKNOWN"),
    returnRisk: text("return_risk").notNull().default("UNKNOWN"),
    status: text("status").notNull().default("NEW"),
    notes: text("notes"),
    tagsJson: text("tags_json").notNull().default("[]"),
    opportunityScore: real("opportunity_score"),
    scoreJson: text("score_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("products_marketplace_external_id_unique").on(
      table.marketplace,
      table.marketplaceProductId,
    ),
    index("products_owner_updated_idx").on(table.ownerEmail, table.updatedAt),
    index("products_marketplace_score_idx").on(
      table.marketplace,
      table.opportunityScore,
    ),
    index("products_status_score_idx").on(table.status, table.opportunityScore),
    index("products_category_idx").on(table.category),
  ],
);

export const productStatusHistory = sqliteTable(
  "product_status_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    changedByEmail: text("changed_by_email").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    changedAt: text("changed_at").notNull(),
  },
  (table) => [
    index("product_status_history_product_time_idx").on(
      table.productId,
      table.changedAt,
    ),
  ],
);

export const generatedContent = sqliteTable(
  "generated_content",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdByEmail: text("created_by_email").notNull(),
    contentJson: text("content_json").notNull(),
    promptVersion: text("prompt_version").notNull(),
    provider: text("provider").notNull(),
    providerModel: text("provider_model").notNull(),
    requestId: text("request_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("generated_content_product_creator_time_idx").on(
      table.productId,
      table.createdByEmail,
      table.createdAt,
    ),
  ],
);

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;
export type GeneratedContentRecord = typeof generatedContent.$inferSelect;
