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

export const savedProducts = sqliteTable(
  "saved_products",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("saved_products_user_product_unique").on(
      table.userEmail,
      table.productId,
    ),
    index("saved_products_user_time_idx").on(table.userEmail, table.createdAt),
  ],
);

export const creatorAccounts = sqliteTable(
  "creator_accounts",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    platform: text("platform").notNull(),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    externalId: text("external_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("creator_accounts_owner_platform_handle_unique").on(
      table.ownerEmail,
      table.platform,
      table.handle,
    ),
    index("creator_accounts_owner_active_idx").on(
      table.ownerEmail,
      table.isActive,
    ),
  ],
);

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    creatorAccountId: text("creator_account_id").references(
      () => creatorAccounts.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    channel: text("channel").notNull(),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    budget: real("budget"),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("DRAFT"),
    notes: text("notes"),
    templateName: text("template_name"),
    duplicatedFromId: text("duplicated_from_id"),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("campaigns_owner_status_time_idx").on(
      table.ownerEmail,
      table.status,
      table.updatedAt,
    ),
    index("campaigns_owner_channel_time_idx").on(
      table.ownerEmail,
      table.channel,
      table.startsAt,
    ),
    index("campaigns_creator_account_idx").on(table.creatorAccountId),
    index("campaigns_name_idx").on(table.ownerEmail, table.name),
  ],
);

export const contentVariations = sqliteTable(
  "content_variations",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    generatedContentId: text("generated_content_id").references(
      () => generatedContent.id,
      { onDelete: "set null" },
    ),
    label: text("label").notNull(),
    hook: text("hook"),
    caption: text("caption"),
    cta: text("cta"),
    hashtagsJson: text("hashtags_json").notNull().default("[]"),
    audienceAngle: text("audience_angle"),
    contentLength: text("content_length"),
    tone: text("tone"),
    platform: text("platform").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    isWinner: integer("is_winner", { mode: "boolean" })
      .notNull()
      .default(false),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("content_variations_owner_product_label_unique").on(
      table.ownerEmail,
      table.productId,
      table.label,
    ),
    index("content_variations_product_status_idx").on(
      table.productId,
      table.status,
    ),
    index("content_variations_content_idx").on(table.generatedContentId),
  ],
);

export const promotions = sqliteTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    generatedContentId: text("generated_content_id").references(
      () => generatedContent.id,
      { onDelete: "set null" },
    ),
    contentVariationId: text("content_variation_id").references(
      () => contentVariations.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull().default("PLANNED"),
    scheduledAt: text("scheduled_at"),
    publishedAt: text("published_at"),
    publishedUrl: text("published_url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("promotions_owner_status_time_idx").on(
      table.ownerEmail,
      table.status,
      table.updatedAt,
    ),
    index("promotions_campaign_time_idx").on(
      table.campaignId,
      table.publishedAt,
    ),
    index("promotions_product_time_idx").on(table.productId, table.publishedAt),
    index("promotions_variation_idx").on(table.contentVariationId),
  ],
);

export const trackedLinks = sqliteTable(
  "tracked_links",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    promotionId: text("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    contentVariationId: text("content_variation_id").references(
      () => contentVariations.id,
      { onDelete: "set null" },
    ),
    marketplace: text("marketplace").notNull(),
    trackingId: text("tracking_id").notNull(),
    shortPath: text("short_path").notNull(),
    destinationUrl: text("destination_url").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("tracked_links_tracking_id_unique").on(table.trackingId),
    uniqueIndex("tracked_links_short_path_unique").on(table.shortPath),
    index("tracked_links_owner_active_idx").on(
      table.ownerEmail,
      table.isActive,
    ),
    index("tracked_links_campaign_idx").on(table.campaignId),
    index("tracked_links_product_idx").on(table.productId),
  ],
);

export const clickEvents = sqliteTable(
  "click_events",
  {
    id: text("id").primaryKey(),
    trackedLinkId: text("tracked_link_id")
      .notNull()
      .references(() => trackedLinks.id, { onDelete: "cascade" }),
    clickedAt: text("clicked_at").notNull(),
    trafficSource: text("traffic_source"),
    deviceType: text("device_type").notNull().default("UNKNOWN"),
    region: text("region"),
    fingerprintHash: text("fingerprint_hash"),
    isBot: integer("is_bot", { mode: "boolean" }).notNull().default(false),
    isDuplicate: integer("is_duplicate", { mode: "boolean" })
      .notNull()
      .default(false),
    suspiciousReason: text("suspicious_reason"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("click_events_link_time_idx").on(
      table.trackedLinkId,
      table.clickedAt,
    ),
    index("click_events_quality_time_idx").on(
      table.isBot,
      table.isDuplicate,
      table.clickedAt,
    ),
    index("click_events_fingerprint_time_idx").on(
      table.fingerprintHash,
      table.clickedAt,
    ),
  ],
);

export const conversionEvents = sqliteTable(
  "conversion_events",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    trackedLinkId: text("tracked_link_id")
      .notNull()
      .references(() => trackedLinks.id, { onDelete: "restrict" }),
    clickEventId: text("click_event_id").references(() => clickEvents.id, {
      onDelete: "set null",
    }),
    marketplace: text("marketplace").notNull(),
    externalOrderIdHash: text("external_order_id_hash").notNull(),
    orderStatus: text("order_status").notNull(),
    orderValue: real("order_value"),
    currency: text("currency").notNull().default("INR"),
    convertedAt: text("converted_at").notNull(),
    importedAt: text("imported_at").notNull(),
  },
  (table) => [
    uniqueIndex("conversion_events_marketplace_order_unique").on(
      table.marketplace,
      table.externalOrderIdHash,
    ),
    index("conversion_events_owner_time_idx").on(
      table.ownerEmail,
      table.convertedAt,
    ),
    index("conversion_events_link_status_idx").on(
      table.trackedLinkId,
      table.orderStatus,
    ),
  ],
);

export const commissionEvents = sqliteTable(
  "commission_events",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    conversionEventId: text("conversion_event_id")
      .notNull()
      .references(() => conversionEvents.id, { onDelete: "cascade" }),
    marketplace: text("marketplace").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull(),
    observedAt: text("observed_at").notNull(),
    approvedAt: text("approved_at"),
    importedAt: text("imported_at").notNull(),
  },
  (table) => [
    uniqueIndex("commission_events_conversion_status_time_unique").on(
      table.conversionEventId,
      table.status,
      table.observedAt,
    ),
    index("commission_events_owner_status_time_idx").on(
      table.ownerEmail,
      table.status,
      table.observedAt,
    ),
    index("commission_events_marketplace_time_idx").on(
      table.marketplace,
      table.observedAt,
    ),
  ],
);

export const contentExperiments = sqliteTable(
  "content_experiments",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    hypothesis: text("hypothesis").notNull(),
    primaryMetric: text("primary_metric").notNull(),
    status: text("status").notNull().default("DRAFT"),
    confidenceThreshold: real("confidence_threshold").notNull().default(0.95),
    winnerVariationId: text("winner_variation_id").references(
      () => contentVariations.id,
      { onDelete: "set null" },
    ),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("content_experiments_owner_status_time_idx").on(
      table.ownerEmail,
      table.status,
      table.updatedAt,
    ),
    index("content_experiments_product_time_idx").on(
      table.productId,
      table.createdAt,
    ),
    index("content_experiments_campaign_idx").on(table.campaignId),
    index("content_experiments_winner_idx").on(table.winnerVariationId),
  ],
);

export const experimentVariations = sqliteTable(
  "experiment_variations",
  {
    experimentId: text("experiment_id")
      .notNull()
      .references(() => contentExperiments.id, { onDelete: "cascade" }),
    variationId: text("variation_id")
      .notNull()
      .references(() => contentVariations.id, { onDelete: "cascade" }),
    allocationPercent: real("allocation_percent").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("experiment_variations_experiment_variation_unique").on(
      table.experimentId,
      table.variationId,
    ),
    index("experiment_variations_variation_idx").on(table.variationId),
  ],
);

export const experimentResults = sqliteTable(
  "experiment_results",
  {
    id: text("id").primaryKey(),
    experimentId: text("experiment_id")
      .notNull()
      .references(() => contentExperiments.id, { onDelete: "cascade" }),
    variationId: text("variation_id")
      .notNull()
      .references(() => contentVariations.id, { onDelete: "cascade" }),
    sampleSize: integer("sample_size").notNull(),
    clicks: integer("clicks").notNull(),
    conversions: integer("conversions").notNull(),
    commission: real("commission").notNull(),
    conversionRate: real("conversion_rate").notNull(),
    earningsPerClick: real("earnings_per_click").notNull(),
    confidence: real("confidence").notNull(),
    calculatedAt: text("calculated_at").notNull(),
  },
  (table) => [
    uniqueIndex("experiment_results_experiment_variation_time_unique").on(
      table.experimentId,
      table.variationId,
      table.calculatedAt,
    ),
    index("experiment_results_experiment_confidence_idx").on(
      table.experimentId,
      table.confidence,
    ),
  ],
);

export const recommendationFeedback = sqliteTable(
  "recommendation_feedback",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    scoreEvidenceId: text("score_evidence_id").references(
      () => opportunityScoreEvidence.id,
      { onDelete: "set null" },
    ),
    action: text("action").notNull(),
    reason: text("reason"),
    audience: text("audience"),
    season: text("season"),
    festival: text("festival"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    recordedAt: text("recorded_at").notNull(),
  },
  (table) => [
    index("recommendation_feedback_owner_action_time_idx").on(
      table.ownerEmail,
      table.action,
      table.recordedAt,
    ),
    index("recommendation_feedback_product_time_idx").on(
      table.productId,
      table.recordedAt,
    ),
    index("recommendation_feedback_score_idx").on(table.scoreEvidenceId),
  ],
);

export const learningProfiles = sqliteTable(
  "learning_profiles",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    dimension: text("dimension").notNull(),
    dimensionKey: text("dimension_key").notNull(),
    observationCount: integer("observation_count").notNull(),
    promotionCount: integer("promotion_count").notNull(),
    conversionCount: integer("conversion_count").notNull(),
    conversionRate: real("conversion_rate").notNull(),
    averageCommission: real("average_commission").notNull(),
    earningsPerClick: real("earnings_per_click").notNull(),
    confidence: real("confidence").notNull(),
    evidenceFrom: text("evidence_from").notNull(),
    evidenceTo: text("evidence_to").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("learning_profiles_owner_dimension_key_unique").on(
      table.ownerEmail,
      table.dimension,
      table.dimensionKey,
    ),
    index("learning_profiles_owner_confidence_idx").on(
      table.ownerEmail,
      table.confidence,
    ),
  ],
);

export const scoringWeightVersions = sqliteTable(
  "scoring_weight_versions",
  {
    id: text("id").primaryKey(),
    version: text("version").notNull(),
    status: text("status").notNull().default("DRAFT"),
    weightsJson: text("weights_json").notNull(),
    evidenceFrom: text("evidence_from").notNull(),
    evidenceTo: text("evidence_to").notNull(),
    observationCount: integer("observation_count").notNull(),
    reason: text("reason").notNull(),
    previousVersionId: text("previous_version_id"),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: text("created_at").notNull(),
    activatedAt: text("activated_at"),
    rolledBackAt: text("rolled_back_at"),
  },
  (table) => [
    uniqueIndex("scoring_weight_versions_version_unique").on(table.version),
    index("scoring_weight_versions_status_time_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const recommendationQualitySnapshots = sqliteTable(
  "recommendation_quality_snapshots",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    modelVersion: text("model_version").notNull(),
    recommendationCount: integer("recommendation_count").notNull(),
    approvalRate: real("approval_rate").notNull(),
    promotionRate: real("promotion_rate").notNull(),
    conversionRate: real("conversion_rate").notNull(),
    averageCommission: real("average_commission").notNull(),
    confidence: real("confidence").notNull(),
    windowFrom: text("window_from").notNull(),
    windowTo: text("window_to").notNull(),
    calculatedAt: text("calculated_at").notNull(),
  },
  (table) => [
    uniqueIndex("recommendation_quality_owner_model_window_unique").on(
      table.ownerEmail,
      table.modelVersion,
      table.windowFrom,
      table.windowTo,
    ),
    index("recommendation_quality_owner_time_idx").on(
      table.ownerEmail,
      table.calculatedAt,
    ),
  ],
);

export const automationJobs = sqliteTable(
  "automation_jobs",
  {
    id: text("id").primaryKey(),
    jobKey: text("job_key").notNull(),
    jobType: text("job_type").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    cronExpression: text("cron_expression").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("PAUSED"),
    timeoutSeconds: integer("timeout_seconds").notNull().default(300),
    maxAttempts: integer("max_attempts").notNull().default(3),
    retryBaseSeconds: integer("retry_base_seconds").notNull().default(60),
    dependsOnJobKey: text("depends_on_job_key"),
    nextRunAt: text("next_run_at"),
    lastRunAt: text("last_run_at"),
    lastSuccessAt: text("last_success_at"),
    lastFailureAt: text("last_failure_at"),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("automation_jobs_key_unique").on(table.jobKey),
    index("automation_jobs_due_idx").on(
      table.enabled,
      table.status,
      table.nextRunAt,
    ),
    index("automation_jobs_health_idx").on(
      table.status,
      table.consecutiveFailures,
    ),
  ],
);

export const automationRuns = sqliteTable(
  "automation_runs",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => automationJobs.id, { onDelete: "cascade" }),
    parentRunId: text("parent_run_id"),
    triggerType: text("trigger_type").notNull(),
    status: text("status").notNull().default("QUEUED"),
    attempt: integer("attempt").notNull().default(1),
    scheduledFor: text("scheduled_for"),
    queuedAt: text("queued_at").notNull(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    timeoutAt: text("timeout_at"),
    initiatedByEmail: text("initiated_by_email"),
    processedCount: integer("processed_count").notNull().default(0),
    succeededCount: integer("succeeded_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    metricsJson: text("metrics_json").notNull().default("{}"),
    errorCode: text("error_code"),
    errorSummary: text("error_summary"),
    nextRetryAt: text("next_retry_at"),
  },
  (table) => [
    index("automation_runs_job_time_idx").on(table.jobId, table.queuedAt),
    index("automation_runs_status_retry_idx").on(
      table.status,
      table.nextRetryAt,
    ),
    index("automation_runs_parent_idx").on(table.parentRunId),
  ],
);

export const automationRunLogs = sqliteTable(
  "automation_run_logs",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => automationRuns.id, { onDelete: "cascade" }),
    level: text("level").notNull(),
    event: text("event").notNull(),
    message: text("message").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("automation_run_logs_run_time_idx").on(table.runId, table.occurredAt),
    index("automation_run_logs_level_time_idx").on(
      table.level,
      table.occurredAt,
    ),
  ],
);

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;
export type GeneratedContentRecord = typeof generatedContent.$inferSelect;
