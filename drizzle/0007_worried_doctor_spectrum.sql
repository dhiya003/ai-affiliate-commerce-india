CREATE TABLE `opportunity_score_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`version` text NOT NULL,
	`marketplace` text NOT NULL,
	`category` text NOT NULL,
	`opportunity_score` real NOT NULL,
	`input_json` text NOT NULL,
	`weights_json` text NOT NULL,
	`breakdown_json` text NOT NULL,
	`penalties_json` text NOT NULL,
	`explanation_json` text NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opportunity_score_evidence_product_time_idx` ON `opportunity_score_evidence` (`product_id`,`calculated_at`);--> statement-breakpoint
CREATE INDEX `opportunity_score_evidence_version_score_idx` ON `opportunity_score_evidence` (`version`,`opportunity_score`);--> statement-breakpoint
CREATE TABLE `source_trend_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`source_name` text NOT NULL,
	`window_days` integer NOT NULL,
	`score` real NOT NULL,
	`confidence` real NOT NULL,
	`signal_count` integer NOT NULL,
	`direction` text NOT NULL,
	`calculated_at` text NOT NULL,
	`provenance_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_trend_scores_product_source_window_time_unique` ON `source_trend_scores` (`product_id`,`source_name`,`window_days`,`calculated_at`);--> statement-breakpoint
CREATE INDEX `source_trend_scores_score_time_idx` ON `source_trend_scores` (`score`,`calculated_at`);--> statement-breakpoint
CREATE TABLE `trend_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`source_id` text,
	`signal_type` text NOT NULL,
	`value` real NOT NULL,
	`normalized_score` real NOT NULL,
	`confidence` real NOT NULL,
	`observed_at` text NOT NULL,
	`expires_at` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `product_sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `trend_signals_product_observed_idx` ON `trend_signals` (`product_id`,`observed_at`);--> statement-breakpoint
CREATE INDEX `trend_signals_type_observed_idx` ON `trend_signals` (`signal_type`,`observed_at`);--> statement-breakpoint
CREATE INDEX `trend_signals_source_observed_idx` ON `trend_signals` (`source_id`,`observed_at`);