CREATE TABLE `content_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`product_id` text NOT NULL,
	`campaign_id` text,
	`name` text NOT NULL,
	`hypothesis` text NOT NULL,
	`primary_metric` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`confidence_threshold` real DEFAULT 0.95 NOT NULL,
	`winner_variation_id` text,
	`started_at` text,
	`ended_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_variation_id`) REFERENCES `content_variations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_experiments_owner_status_time_idx` ON `content_experiments` (`owner_email`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `content_experiments_product_time_idx` ON `content_experiments` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_experiments_campaign_idx` ON `content_experiments` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `content_experiments_winner_idx` ON `content_experiments` (`winner_variation_id`);--> statement-breakpoint
CREATE TABLE `experiment_results` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`variation_id` text NOT NULL,
	`sample_size` integer NOT NULL,
	`clicks` integer NOT NULL,
	`conversions` integer NOT NULL,
	`commission` real NOT NULL,
	`conversion_rate` real NOT NULL,
	`earnings_per_click` real NOT NULL,
	`confidence` real NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `content_experiments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variation_id`) REFERENCES `content_variations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiment_results_experiment_variation_time_unique` ON `experiment_results` (`experiment_id`,`variation_id`,`calculated_at`);--> statement-breakpoint
CREATE INDEX `experiment_results_experiment_confidence_idx` ON `experiment_results` (`experiment_id`,`confidence`);--> statement-breakpoint
CREATE TABLE `experiment_variations` (
	`experiment_id` text NOT NULL,
	`variation_id` text NOT NULL,
	`allocation_percent` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `content_experiments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variation_id`) REFERENCES `content_variations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiment_variations_experiment_variation_unique` ON `experiment_variations` (`experiment_id`,`variation_id`);--> statement-breakpoint
CREATE INDEX `experiment_variations_variation_idx` ON `experiment_variations` (`variation_id`);--> statement-breakpoint
CREATE TABLE `learning_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`dimension` text NOT NULL,
	`dimension_key` text NOT NULL,
	`observation_count` integer NOT NULL,
	`promotion_count` integer NOT NULL,
	`conversion_count` integer NOT NULL,
	`conversion_rate` real NOT NULL,
	`average_commission` real NOT NULL,
	`earnings_per_click` real NOT NULL,
	`confidence` real NOT NULL,
	`evidence_from` text NOT NULL,
	`evidence_to` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_profiles_owner_dimension_key_unique` ON `learning_profiles` (`owner_email`,`dimension`,`dimension_key`);--> statement-breakpoint
CREATE INDEX `learning_profiles_owner_confidence_idx` ON `learning_profiles` (`owner_email`,`confidence`);--> statement-breakpoint
CREATE TABLE `recommendation_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`product_id` text NOT NULL,
	`score_evidence_id` text,
	`action` text NOT NULL,
	`reason` text,
	`audience` text,
	`season` text,
	`festival` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`score_evidence_id`) REFERENCES `opportunity_score_evidence`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `recommendation_feedback_owner_action_time_idx` ON `recommendation_feedback` (`owner_email`,`action`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `recommendation_feedback_product_time_idx` ON `recommendation_feedback` (`product_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `recommendation_feedback_score_idx` ON `recommendation_feedback` (`score_evidence_id`);--> statement-breakpoint
CREATE TABLE `recommendation_quality_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`model_version` text NOT NULL,
	`recommendation_count` integer NOT NULL,
	`approval_rate` real NOT NULL,
	`promotion_rate` real NOT NULL,
	`conversion_rate` real NOT NULL,
	`average_commission` real NOT NULL,
	`confidence` real NOT NULL,
	`window_from` text NOT NULL,
	`window_to` text NOT NULL,
	`calculated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recommendation_quality_owner_model_window_unique` ON `recommendation_quality_snapshots` (`owner_email`,`model_version`,`window_from`,`window_to`);--> statement-breakpoint
CREATE INDEX `recommendation_quality_owner_time_idx` ON `recommendation_quality_snapshots` (`owner_email`,`calculated_at`);--> statement-breakpoint
CREATE TABLE `scoring_weight_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`weights_json` text NOT NULL,
	`evidence_from` text NOT NULL,
	`evidence_to` text NOT NULL,
	`observation_count` integer NOT NULL,
	`reason` text NOT NULL,
	`previous_version_id` text,
	`created_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`activated_at` text,
	`rolled_back_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scoring_weight_versions_version_unique` ON `scoring_weight_versions` (`version`);--> statement-breakpoint
CREATE INDEX `scoring_weight_versions_status_time_idx` ON `scoring_weight_versions` (`status`,`created_at`);