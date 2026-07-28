CREATE TABLE `automation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_key` text NOT NULL,
	`job_type` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`cron_expression` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'PAUSED' NOT NULL,
	`timeout_seconds` integer DEFAULT 300 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`retry_base_seconds` integer DEFAULT 60 NOT NULL,
	`depends_on_job_key` text,
	`next_run_at` text,
	`last_run_at` text,
	`last_success_at` text,
	`last_failure_at` text,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_jobs_key_unique` ON `automation_jobs` (`job_key`);--> statement-breakpoint
CREATE INDEX `automation_jobs_due_idx` ON `automation_jobs` (`enabled`,`status`,`next_run_at`);--> statement-breakpoint
CREATE INDEX `automation_jobs_health_idx` ON `automation_jobs` (`status`,`consecutive_failures`);--> statement-breakpoint
CREATE TABLE `automation_run_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`level` text NOT NULL,
	`event` text NOT NULL,
	`message` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `automation_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `automation_run_logs_run_time_idx` ON `automation_run_logs` (`run_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `automation_run_logs_level_time_idx` ON `automation_run_logs` (`level`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`parent_run_id` text,
	`trigger_type` text NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`scheduled_for` text,
	`queued_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`timeout_at` text,
	`initiated_by_email` text,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`succeeded_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`error_code` text,
	`error_summary` text,
	`next_retry_at` text,
	FOREIGN KEY (`job_id`) REFERENCES `automation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `automation_runs_job_time_idx` ON `automation_runs` (`job_id`,`queued_at`);--> statement-breakpoint
CREATE INDEX `automation_runs_status_retry_idx` ON `automation_runs` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX `automation_runs_parent_idx` ON `automation_runs` (`parent_run_id`);--> statement-breakpoint
INSERT INTO `automation_jobs` (
  `id`, `job_key`, `job_type`, `name`, `description`, `cron_expression`,
  `timezone`, `enabled`, `status`, `timeout_seconds`, `max_attempts`,
  `retry_base_seconds`, `depends_on_job_key`, `created_by_email`, `created_at`,
  `updated_at`
) VALUES
  ('automation-product-ingestion', 'daily-product-ingestion', 'PRODUCT_INGESTION', 'Daily product ingestion', 'Ingest enabled marketplace sources.', '0 1 * * *', 'Asia/Kolkata', 0, 'PAUSED', 900, 3, 120, NULL, 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-price-refresh', 'daily-price-refresh', 'PRICE_REFRESH', 'Daily price refresh', 'Refresh price evidence after product ingestion.', '30 1 * * *', 'Asia/Kolkata', 0, 'PAUSED', 600, 3, 120, 'daily-product-ingestion', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-availability-refresh', 'daily-availability-refresh', 'AVAILABILITY_REFRESH', 'Daily availability refresh', 'Refresh stock and variation availability.', '0 2 * * *', 'Asia/Kolkata', 0, 'PAUSED', 600, 3, 120, 'daily-product-ingestion', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-trend-refresh', 'daily-trend-refresh', 'TREND_REFRESH', 'Daily trend refresh', 'Rebuild fresh trend evidence.', '30 2 * * *', 'Asia/Kolkata', 0, 'PAUSED', 900, 3, 180, 'daily-product-ingestion', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-score-recalculation', 'daily-score-recalculation', 'SCORE_RECALCULATION', 'Daily score recalculation', 'Recalculate opportunity scores from current evidence.', '0 3 * * *', 'Asia/Kolkata', 0, 'PAUSED', 900, 3, 180, 'daily-trend-refresh', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-top-ten', 'daily-top-10-generation', 'TOP_10_GENERATION', 'Daily top 10 generation', 'Snapshot the ten highest verified opportunities.', '30 3 * * *', 'Asia/Kolkata', 0, 'PAUSED', 300, 3, 60, 'daily-score-recalculation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-content-generation', 'daily-content-generation', 'CONTENT_GENERATION', 'Daily content generation', 'Generate content for approved top opportunities.', '0 4 * * *', 'Asia/Kolkata', 0, 'PAUSED', 1200, 2, 300, 'daily-top-10-generation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-compliance-check', 'daily-compliance-check', 'COMPLIANCE_CHECK', 'Daily compliance checking', 'Recheck generated promotional content before use.', '30 4 * * *', 'Asia/Kolkata', 0, 'PAUSED', 900, 3, 180, 'daily-content-generation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-score-retraining', 'weekly-score-retraining', 'SCORE_RETRAINING', 'Weekly score retraining', 'Prepare governed weight evidence without automatic activation.', '0 5 * * 1', 'Asia/Kolkata', 0, 'PAUSED', 1200, 2, 300, 'daily-score-recalculation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z');
