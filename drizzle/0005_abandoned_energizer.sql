CREATE TABLE `canonical_product_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_key` text NOT NULL,
	`normalized_name` text NOT NULL,
	`brand` text,
	`category` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `canonical_product_groups_key_unique` ON `canonical_product_groups` (`canonical_key`);--> statement-breakpoint
CREATE INDEX `canonical_product_groups_category_idx` ON `canonical_product_groups` (`category`);--> statement-breakpoint
CREATE TABLE `ingestion_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text,
	`code` text NOT NULL,
	`message` text NOT NULL,
	`retryable` integer DEFAULT false NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`occurred_at` text NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `ingestion_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `product_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ingestion_errors_run_time_idx` ON `ingestion_errors` (`run_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ingestion_errors_source_resolution_idx` ON `ingestion_errors` (`source_id`,`resolved_at`);--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`parent_run_id` text,
	`trigger_type` text NOT NULL,
	`status` text NOT NULL,
	`initiated_by_email` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`attempted_count` integer DEFAULT 0 NOT NULL,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`matched_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` text,
	`error_summary` text,
	FOREIGN KEY (`source_id`) REFERENCES `product_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ingestion_runs_source_started_idx` ON `ingestion_runs` (`source_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `ingestion_runs_status_retry_idx` ON `ingestion_runs` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE TABLE `ingestion_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`cadence_minutes` integer NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`next_run_at` text,
	`last_run_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `product_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingestion_schedules_source_unique` ON `ingestion_schedules` (`source_id`);--> statement-breakpoint
CREATE INDEX `ingestion_schedules_enabled_next_idx` ON `ingestion_schedules` (`enabled`,`next_run_at`);--> statement-breakpoint
CREATE TABLE `product_source_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`canonical_group_id` text NOT NULL,
	`product_id` text,
	`external_id` text NOT NULL,
	`confidence` real NOT NULL,
	`status` text NOT NULL,
	`matched_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `product_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonical_group_id`) REFERENCES `canonical_product_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_source_matches_source_external_unique` ON `product_source_matches` (`source_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `product_source_matches_group_status_idx` ON `product_source_matches` (`canonical_group_id`,`status`);--> statement-breakpoint
CREATE TABLE `product_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`marketplace` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`freshness_window_minutes` integer DEFAULT 1440 NOT NULL,
	`last_attempt_at` text,
	`last_success_at` text,
	`last_error_at` text,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`rate_limited_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_sources_marketplace_name_unique` ON `product_sources` (`marketplace`,`name`);--> statement-breakpoint
CREATE INDEX `product_sources_status_success_idx` ON `product_sources` (`status`,`last_success_at`);--> statement-breakpoint
CREATE TABLE `raw_source_data` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`run_id` text NOT NULL,
	`canonical_group_id` text,
	`product_id` text,
	`external_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`normalized_product_json` text,
	`source_timestamp` text NOT NULL,
	`received_at` text NOT NULL,
	`confidence` real NOT NULL,
	`match_status` text NOT NULL,
	`availability_status` text NOT NULL,
	`is_stale` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `product_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `ingestion_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonical_group_id`) REFERENCES `canonical_product_groups`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_source_data_source_external_hash_unique` ON `raw_source_data` (`source_id`,`external_id`,`payload_hash`);--> statement-breakpoint
CREATE INDEX `raw_source_data_run_received_idx` ON `raw_source_data` (`run_id`,`received_at`);--> statement-breakpoint
CREATE INDEX `raw_source_data_product_source_time_idx` ON `raw_source_data` (`product_id`,`source_timestamp`);--> statement-breakpoint
CREATE INDEX `raw_source_data_stale_availability_idx` ON `raw_source_data` (`is_stale`,`availability_status`);