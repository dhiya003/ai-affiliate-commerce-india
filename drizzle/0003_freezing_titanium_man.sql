CREATE TABLE `affiliate_disclosures` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`effective_at` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text DEFAULT 'NEEDS_REVIEW' NOT NULL,
	`reviewed_at` text,
	`reviewed_by_email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`disclosure_text` text NOT NULL,
	`placement` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliate_disclosures_marketplace_title_unique` ON `affiliate_disclosures` (`marketplace`,`title`);--> statement-breakpoint
CREATE INDEX `affiliate_disclosures_status_effective_idx` ON `affiliate_disclosures` (`status`,`effective_at`);--> statement-breakpoint
CREATE TABLE `commission_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`effective_at` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text DEFAULT 'NEEDS_REVIEW' NOT NULL,
	`reviewed_at` text,
	`reviewed_by_email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`category` text NOT NULL,
	`rate_min` real,
	`rate_max` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commission_rules_marketplace_category_effective_unique` ON `commission_rules` (`marketplace`,`category`,`effective_at`);--> statement-breakpoint
CREATE INDEX `commission_rules_status_effective_idx` ON `commission_rules` (`status`,`effective_at`);--> statement-breakpoint
CREATE TABLE `content_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`effective_at` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text DEFAULT 'NEEDS_REVIEW' NOT NULL,
	`reviewed_at` text,
	`reviewed_by_email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`channel` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_policies_marketplace_title_unique` ON `content_policies` (`marketplace`,`title`);--> statement-breakpoint
CREATE INDEX `content_policies_status_effective_idx` ON `content_policies` (`status`,`effective_at`);--> statement-breakpoint
CREATE TABLE `marketplace_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`effective_at` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text DEFAULT 'NEEDS_REVIEW' NOT NULL,
	`reviewed_at` text,
	`reviewed_by_email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`rule_type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_rules_marketplace_title_unique` ON `marketplace_rules` (`marketplace`,`title`);--> statement-breakpoint
CREATE INDEX `marketplace_rules_status_effective_idx` ON `marketplace_rules` (`status`,`effective_at`);--> statement-breakpoint
CREATE TABLE `platform_update_history` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`policy_kind` text NOT NULL,
	`policy_id` text,
	`change_type` text NOT NULL,
	`previous_status` text,
	`next_status` text,
	`summary` text NOT NULL,
	`source_url` text NOT NULL,
	`detected_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by_email` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `platform_update_marketplace_detected_idx` ON `platform_update_history` (`marketplace`,`detected_at`);--> statement-breakpoint
CREATE INDEX `platform_update_policy_idx` ON `platform_update_history` (`policy_kind`,`policy_id`);--> statement-breakpoint
CREATE TABLE `prohibited_practices` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`effective_at` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text DEFAULT 'NEEDS_REVIEW' NOT NULL,
	`reviewed_at` text,
	`reviewed_by_email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`severity` text DEFAULT 'HIGH' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prohibited_practices_marketplace_title_unique` ON `prohibited_practices` (`marketplace`,`title`);--> statement-breakpoint
CREATE INDEX `prohibited_practices_status_effective_idx` ON `prohibited_practices` (`status`,`effective_at`);