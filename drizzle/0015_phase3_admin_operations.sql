CREATE TABLE `application_users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`last_seen_at` text,
	`suspicious_login_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `application_users_status_role_idx` ON `application_users` (`status`,`role`);--> statement-breakpoint
CREATE INDEX `application_users_last_seen_idx` ON `application_users` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`outcome` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_actor_time_idx` ON `audit_events` (`actor_email`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_time_idx` ON `audit_events` (`entity_type`,`entity_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `background_queue_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_name` text NOT NULL,
	`job_type` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`locked_at` text,
	`completed_at` text,
	`error_code` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `background_queue_due_idx` ON `background_queue_jobs` (`queue_name`,`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `background_queue_type_time_idx` ON `background_queue_jobs` (`job_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `backup_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`scope` text NOT NULL,
	`storage_reference_hash` text,
	`initiated_by_email` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`restore_tested_at` text,
	`error_code` text
);
--> statement-breakpoint
CREATE INDEX `backup_runs_status_time_idx` ON `backup_runs` (`status`,`started_at`);--> statement-breakpoint
CREATE INDEX `backup_runs_restore_test_idx` ON `backup_runs` (`restore_tested_at`);--> statement-breakpoint
CREATE TABLE `data_retention_policies` (
	`key` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`retention_days` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `data_retention_enabled_idx` ON `data_retention_policies` (`enabled`);--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`rollout_percent` integer DEFAULT 0 NOT NULL,
	`updated_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feature_flags_enabled_idx` ON `feature_flags` (`enabled`);--> statement-breakpoint
CREATE TABLE `managed_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managed_templates_kind_name_version_unique` ON `managed_templates` (`kind`,`name`,`version`);--> statement-breakpoint
CREATE INDEX `managed_templates_kind_status_idx` ON `managed_templates` (`kind`,`status`);--> statement-breakpoint
CREATE TABLE `operational_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`metric_name` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`dimensions_json` text DEFAULT '{}' NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `operational_metrics_name_time_idx` ON `operational_metrics` (`metric_name`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_expiry_idx` ON `rate_limit_buckets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`severity` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_email` text,
	`fingerprint_hash` text,
	`region` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	`resolved_at` text,
	`resolved_by_email` text
);
--> statement-breakpoint
CREATE INDEX `security_events_severity_time_idx` ON `security_events` (`severity`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `security_events_type_time_idx` ON `security_events` (`event_type`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `usage_cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text,
	`provider` text NOT NULL,
	`service` text NOT NULL,
	`model` text,
	`marketplace` text,
	`units` integer DEFAULT 0 NOT NULL,
	`cost_inr` real DEFAULT 0 NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_cost_service_time_idx` ON `usage_cost_events` (`service`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `usage_cost_owner_time_idx` ON `usage_cost_events` (`owner_email`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `usage_cost_marketplace_time_idx` ON `usage_cost_events` (`marketplace`,`occurred_at`);
--> statement-breakpoint
INSERT INTO `feature_flags` (`key`, `description`, `enabled`, `rollout_percent`, `updated_by_email`, `created_at`, `updated_at`) VALUES
  ('ai-content-generation', 'Allow signed-in users to generate affiliate content.', 1, 100, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('partner-marketplace-ingestion', 'Allow credentialed marketplace partner adapters to run.', 0, 0, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('email-notifications', 'Allow outbound notification webhook handoff.', 0, 0, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('automated-scoring-activation', 'Permit automated scoring-weight activation.', 0, 0, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `data_retention_policies` (`key`, `description`, `retention_days`, `enabled`, `updated_by_email`, `created_at`, `updated_at`) VALUES
  ('click-fingerprints', 'Privacy-safe click fingerprint hashes.', 30, 1, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('raw-source-payloads', 'Immutable marketplace source evidence.', 365, 1, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('automation-logs', 'Scheduled automation processing logs.', 90, 1, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('security-events', 'Security and suspicious-request evidence.', 365, 1, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('generated-reports', 'Downloadable report content.', 30, 1, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO `managed_templates` (`id`, `kind`, `name`, `version`, `content`, `status`, `created_by_email`, `created_at`, `updated_at`) VALUES
  ('template-affiliate-reel-v1', 'AI_PROMPT', 'Affiliate reel', 1, 'Create factual affiliate content using only supplied product evidence. Include a clear affiliate disclosure and avoid unsupported claims.', 'ACTIVE', 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('template-compliance-disclosure-v1', 'CONTENT_TEMPLATE', 'Affiliate disclosure', 1, 'Affiliate disclosure: I may earn a commission when you purchase through this link.', 'ACTIVE', 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z');
