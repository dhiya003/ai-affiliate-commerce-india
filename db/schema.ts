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

const policyColumns = {
  id: text("id").primaryKey(),
  marketplace: text("marketplace").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  effectiveAt: text("effective_at").notNull(),
  sourceUrl: text("source_url").notNull(),
  status: text("status").notNull().default("NEEDS_REVIEW"),
  reviewedAt: text("reviewed_at"),
  reviewedByEmail: text("reviewed_by_email"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const marketplaceRules = sqliteTable(
  "marketplace_rules",
  {
    ...policyColumns,
    ruleType: text("rule_type").notNull(),
  },
  (table) => [
    uniqueIndex("marketplace_rules_marketplace_title_unique").on(
      table.marketplace,
      table.title,
    ),
    index("marketplace_rules_status_effective_idx").on(
      table.status,
      table.effectiveAt,
    ),
  ],
);

export const commissionRules = sqliteTable(
  "commission_rules",
  {
    ...policyColumns,
    category: text("category").notNull(),
    rateMin: real("rate_min"),
    rateMax: real("rate_max"),
  },
  (table) => [
    uniqueIndex("commission_rules_marketplace_category_effective_unique").on(
      table.marketplace,
      table.category,
      table.effectiveAt,
    ),
    index("commission_rules_status_effective_idx").on(
      table.status,
      table.effectiveAt,
    ),
  ],
);

export const contentPolicies = sqliteTable(
  "content_policies",
  {
    ...policyColumns,
    channel: text("channel").notNull(),
  },
  (table) => [
    uniqueIndex("content_policies_marketplace_title_unique").on(
      table.marketplace,
      table.title,
    ),
    index("content_policies_status_effective_idx").on(
      table.status,
      table.effectiveAt,
    ),
  ],
);

export const affiliateDisclosures = sqliteTable(
  "affiliate_disclosures",
  {
    ...policyColumns,
    disclosureText: text("disclosure_text").notNull(),
    placement: text("placement").notNull(),
  },
  (table) => [
    uniqueIndex("affiliate_disclosures_marketplace_title_unique").on(
      table.marketplace,
      table.title,
    ),
    index("affiliate_disclosures_status_effective_idx").on(
      table.status,
      table.effectiveAt,
    ),
  ],
);

export const prohibitedPractices = sqliteTable(
  "prohibited_practices",
  {
    ...policyColumns,
    severity: text("severity").notNull().default("HIGH"),
  },
  (table) => [
    uniqueIndex("prohibited_practices_marketplace_title_unique").on(
      table.marketplace,
      table.title,
    ),
    index("prohibited_practices_status_effective_idx").on(
      table.status,
      table.effectiveAt,
    ),
  ],
);

export const platformUpdateHistory = sqliteTable(
  "platform_update_history",
  {
    id: text("id").primaryKey(),
    marketplace: text("marketplace").notNull(),
    policyKind: text("policy_kind").notNull(),
    policyId: text("policy_id"),
    changeType: text("change_type").notNull(),
    previousStatus: text("previous_status"),
    nextStatus: text("next_status"),
    summary: text("summary").notNull(),
    sourceUrl: text("source_url").notNull(),
    detectedAt: text("detected_at").notNull(),
    reviewedAt: text("reviewed_at"),
    reviewedByEmail: text("reviewed_by_email"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("platform_update_marketplace_detected_idx").on(
      table.marketplace,
      table.detectedAt,
    ),
    index("platform_update_policy_idx").on(table.policyKind, table.policyId),
  ],
);

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;
export type GeneratedContentRecord = typeof generatedContent.$inferSelect;
