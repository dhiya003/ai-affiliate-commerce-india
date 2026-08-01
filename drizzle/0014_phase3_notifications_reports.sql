CREATE TABLE `generated_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`period_from` text NOT NULL,
	`period_to` text NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`format` text DEFAULT 'CSV' NOT NULL,
	`content_json` text NOT NULL,
	`row_count` integer NOT NULL,
	`generated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generated_reports_owner_type_period_unique` ON `generated_reports` (`owner_email`,`type`,`period_from`,`period_to`);--> statement-breakpoint
CREATE INDEX `generated_reports_owner_time_idx` ON `generated_reports` (`owner_email`,`generated_at`);--> statement-breakpoint
CREATE INDEX `generated_reports_expiry_idx` ON `generated_reports` (`expires_at`);--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`notification_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`provider` text,
	`external_message_id_hash` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text,
	`delivered_at` text,
	`error_code` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_deliveries_notification_channel_unique` ON `notification_deliveries` (`notification_id`,`channel`);--> statement-breakpoint
CREATE INDEX `notification_deliveries_status_retry_idx` ON `notification_deliveries` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`in_app_enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT false NOT NULL,
	`digest_frequency` text DEFAULT 'DAILY' NOT NULL,
	`enabled_types_json` text DEFAULT '[]' NOT NULL,
	`quiet_hours_start` text,
	`quiet_hours_end` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preferences_owner_unique` ON `notification_preferences` (`owner_email`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`action_url` text,
	`entity_type` text,
	`entity_id` text,
	`dedupe_key` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	`expires_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_owner_dedupe_unique` ON `notifications` (`owner_email`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notifications_owner_read_time_idx` ON `notifications` (`owner_email`,`read_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_owner_type_time_idx` ON `notifications` (`owner_email`,`type`,`created_at`);
--> statement-breakpoint
INSERT INTO `automation_jobs` (
  `id`, `job_key`, `job_type`, `name`, `description`, `cron_expression`,
  `timezone`, `enabled`, `status`, `timeout_seconds`, `max_attempts`,
  `retry_base_seconds`, `depends_on_job_key`, `created_by_email`, `created_at`,
  `updated_at`
) VALUES
  ('automation-notification-scan', 'daily-notification-scan', 'NOTIFICATION_SCAN', 'Daily notification scan', 'Evaluate product, policy, compliance, campaign, and operational alerts.', '0 6 * * *', 'Asia/Kolkata', 0, 'PAUSED', 600, 3, 120, 'daily-compliance-check', 'system@affinity.local', '2026-07-30T05:00:00.000Z', '2026-07-30T05:00:00.000Z'),
  ('automation-notification-retry', 'notification-delivery-retry', 'NOTIFICATION_DELIVERY_RETRY', 'Notification delivery retry', 'Retry due email notification handoffs with bounded exponential backoff.', '* * * * *', 'Asia/Kolkata', 0, 'PAUSED', 300, 3, 60, NULL, 'system@affinity.local', '2026-07-30T05:00:00.000Z', '2026-07-30T05:00:00.000Z'),
  ('automation-summary-reports', 'daily-summary-report-generation', 'SUMMARY_REPORT_GENERATION', 'Scheduled summary reports', 'Generate daily, weekly, or monthly reports from each owner preference.', '30 6 * * *', 'Asia/Kolkata', 0, 'PAUSED', 900, 3, 120, 'daily-notification-scan', 'system@affinity.local', '2026-07-30T05:00:00.000Z', '2026-07-30T05:00:00.000Z');
