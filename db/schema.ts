import {
  index,
  integer,
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

export const productSources = sqliteTable(
  "product_sources",
  {
    id: text("id").primaryKey(),
    marketplace: text("marketplace").notNull(),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull(),
    status: text("status").notNull().default("READY"),
    freshnessWindowMinutes: integer("freshness_window_minutes")
      .notNull()
      .default(1440),
    lastAttemptAt: text("last_attempt_at"),
    lastSuccessAt: text("last_success_at"),
    lastErrorAt: text("last_error_at"),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    rateLimitedUntil: text("rate_limited_until"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("product_sources_marketplace_name_unique").on(
      table.marketplace,
      table.name,
    ),
    index("product_sources_status_success_idx").on(
      table.status,
      table.lastSuccessAt,
    ),
  ],
);

export const ingestionRuns = sqliteTable(
  "ingestion_runs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => productSources.id, { onDelete: "cascade" }),
    parentRunId: text("parent_run_id"),
    triggerType: text("trigger_type").notNull(),
    status: text("status").notNull(),
    initiatedByEmail: text("initiated_by_email").notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    attemptedCount: integer("attempted_count").notNull().default(0),
    importedCount: integer("imported_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    matchedCount: integer("matched_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: text("next_retry_at"),
    errorSummary: text("error_summary"),
  },
  (table) => [
    index("ingestion_runs_source_started_idx").on(
      table.sourceId,
      table.startedAt,
    ),
    index("ingestion_runs_status_retry_idx").on(
      table.status,
      table.nextRetryAt,
    ),
  ],
);

export const canonicalProductGroups = sqliteTable(
  "canonical_product_groups",
  {
    id: text("id").primaryKey(),
    canonicalKey: text("canonical_key").notNull(),
    normalizedName: text("normalized_name").notNull(),
    brand: text("brand"),
    category: text("category").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("canonical_product_groups_key_unique").on(table.canonicalKey),
    index("canonical_product_groups_category_idx").on(table.category),
  ],
);

export const rawSourceData = sqliteTable(
  "raw_source_data",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => productSources.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "cascade" }),
    canonicalGroupId: text("canonical_group_id").references(
      () => canonicalProductGroups.id,
      { onDelete: "set null" },
    ),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id").notNull(),
    payloadJson: text("payload_json").notNull(),
    payloadHash: text("payload_hash").notNull(),
    normalizedProductJson: text("normalized_product_json"),
    sourceTimestamp: text("source_timestamp").notNull(),
    receivedAt: text("received_at").notNull(),
    confidence: real("confidence").notNull(),
    matchStatus: text("match_status").notNull(),
    availabilityStatus: text("availability_status").notNull(),
    isStale: integer("is_stale", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("raw_source_data_source_external_hash_unique").on(
      table.sourceId,
      table.externalId,
      table.payloadHash,
    ),
    index("raw_source_data_run_received_idx").on(table.runId, table.receivedAt),
    index("raw_source_data_product_source_time_idx").on(
      table.productId,
      table.sourceTimestamp,
    ),
    index("raw_source_data_stale_availability_idx").on(
      table.isStale,
      table.availabilityStatus,
    ),
  ],
);

export const productSourceMatches = sqliteTable(
  "product_source_matches",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => productSources.id, { onDelete: "cascade" }),
    canonicalGroupId: text("canonical_group_id")
      .notNull()
      .references(() => canonicalProductGroups.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id").notNull(),
    confidence: real("confidence").notNull(),
    status: text("status").notNull(),
    matchedAt: text("matched_at").notNull(),
  },
  (table) => [
    uniqueIndex("product_source_matches_source_external_unique").on(
      table.sourceId,
      table.externalId,
    ),
    index("product_source_matches_group_status_idx").on(
      table.canonicalGroupId,
      table.status,
    ),
  ],
);

export const ingestionErrors = sqliteTable(
  "ingestion_errors",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => productSources.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    code: text("code").notNull(),
    message: text("message").notNull(),
    retryable: integer("retryable", { mode: "boolean" })
      .notNull()
      .default(false),
    attempt: integer("attempt").notNull().default(1),
    occurredAt: text("occurred_at").notNull(),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    index("ingestion_errors_run_time_idx").on(table.runId, table.occurredAt),
    index("ingestion_errors_source_resolution_idx").on(
      table.sourceId,
      table.resolvedAt,
    ),
  ],
);

export const ingestionSchedules = sqliteTable(
  "ingestion_schedules",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => productSources.id, { onDelete: "cascade" }),
    cadenceMinutes: integer("cadence_minutes").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    nextRunAt: text("next_run_at"),
    lastRunAt: text("last_run_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ingestion_schedules_source_unique").on(table.sourceId),
    index("ingestion_schedules_enabled_next_idx").on(
      table.enabled,
      table.nextRunAt,
    ),
  ],
);

export const trendSignals = sqliteTable(
  "trend_signals",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourceId: text("source_id").references(() => productSources.id, {
      onDelete: "set null",
    }),
    signalType: text("signal_type").notNull(),
    value: real("value").notNull(),
    normalizedScore: real("normalized_score").notNull(),
    confidence: real("confidence").notNull(),
    observedAt: text("observed_at").notNull(),
    expiresAt: text("expires_at"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("trend_signals_product_observed_idx").on(
      table.productId,
      table.observedAt,
    ),
    index("trend_signals_type_observed_idx").on(
      table.signalType,
      table.observedAt,
    ),
    index("trend_signals_source_observed_idx").on(
      table.sourceId,
      table.observedAt,
    ),
  ],
);

export const sourceTrendScores = sqliteTable(
  "source_trend_scores",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    windowDays: integer("window_days").notNull(),
    score: real("score").notNull(),
    confidence: real("confidence").notNull(),
    signalCount: integer("signal_count").notNull(),
    direction: text("direction").notNull(),
    calculatedAt: text("calculated_at").notNull(),
    provenanceJson: text("provenance_json").notNull().default("{}"),
  },
  (table) => [
    uniqueIndex("source_trend_scores_product_source_window_time_unique").on(
      table.productId,
      table.sourceName,
      table.windowDays,
      table.calculatedAt,
    ),
    index("source_trend_scores_score_time_idx").on(
      table.score,
      table.calculatedAt,
    ),
  ],
);

export const opportunityScoreEvidence = sqliteTable(
  "opportunity_score_evidence",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    marketplace: text("marketplace").notNull(),
    category: text("category").notNull(),
    opportunityScore: real("opportunity_score").notNull(),
    inputJson: text("input_json").notNull(),
    weightsJson: text("weights_json").notNull(),
    breakdownJson: text("breakdown_json").notNull(),
    penaltiesJson: text("penalties_json").notNull(),
    explanationJson: text("explanation_json").notNull(),
    calculatedAt: text("calculated_at").notNull(),
  },
  (table) => [
    index("opportunity_score_evidence_product_time_idx").on(
      table.productId,
      table.calculatedAt,
    ),
    index("opportunity_score_evidence_version_score_idx").on(
      table.version,
      table.opportunityScore,
    ),
  ],
);

export const complianceChecks = sqliteTable(
  "compliance_checks",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    generatedContentId: text("generated_content_id").references(
      () => generatedContent.id,
      { onDelete: "set null" },
    ),
    marketplace: text("marketplace").notNull(),
    status: text("status").notNull(),
    highestSeverity: text("highest_severity").notNull(),
    contentHash: text("content_hash").notNull(),
    checkedByEmail: text("checked_by_email").notNull(),
    checkedAt: text("checked_at").notNull(),
    overriddenAt: text("overridden_at"),
    overriddenByEmail: text("overridden_by_email"),
    overrideReason: text("override_reason"),
  },
  (table) => [
    index("compliance_checks_product_time_idx").on(
      table.productId,
      table.checkedAt,
    ),
    index("compliance_checks_status_severity_idx").on(
      table.status,
      table.highestSeverity,
    ),
    index("compliance_checks_content_idx").on(table.generatedContentId),
  ],
);

export const complianceCheckResults = sqliteTable(
  "compliance_check_results",
  {
    id: text("id").primaryKey(),
    checkId: text("check_id")
      .notNull()
      .references(() => complianceChecks.id, { onDelete: "cascade" }),
    ruleCode: text("rule_code").notNull(),
    status: text("status").notNull(),
    severity: text("severity").notNull(),
    message: text("message").notNull(),
    fixSuggestion: text("fix_suggestion"),
    evidenceJson: text("evidence_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("compliance_results_check_rule_unique").on(
      table.checkId,
      table.ruleCode,
    ),
    index("compliance_results_status_severity_idx").on(
      table.status,
      table.severity,
    ),
  ],
);

export const complianceOverrides = sqliteTable(
  "compliance_overrides",
  {
    id: text("id").primaryKey(),
    checkId: text("check_id")
      .notNull()
      .references(() => complianceChecks.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    reason: text("reason").notNull(),
    overriddenByEmail: text("overridden_by_email").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("compliance_overrides_check_time_idx").on(
      table.checkId,
      table.createdAt,
    ),
    index("compliance_overrides_actor_time_idx").on(
      table.overriddenByEmail,
      table.createdAt,
    ),
  ],
);

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;
export type GeneratedContentRecord = typeof generatedContent.$inferSelect;
