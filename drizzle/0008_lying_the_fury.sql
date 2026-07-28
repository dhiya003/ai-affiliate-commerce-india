CREATE TABLE `compliance_check_results` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`rule_code` text NOT NULL,
	`status` text NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`fix_suggestion` text,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `compliance_checks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `compliance_results_check_rule_unique` ON `compliance_check_results` (`check_id`,`rule_code`);--> statement-breakpoint
CREATE INDEX `compliance_results_status_severity_idx` ON `compliance_check_results` (`status`,`severity`);--> statement-breakpoint
CREATE TABLE `compliance_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`generated_content_id` text,
	`marketplace` text NOT NULL,
	`status` text NOT NULL,
	`highest_severity` text NOT NULL,
	`content_hash` text NOT NULL,
	`checked_by_email` text NOT NULL,
	`checked_at` text NOT NULL,
	`overridden_at` text,
	`overridden_by_email` text,
	`override_reason` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generated_content_id`) REFERENCES `generated_content`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `compliance_checks_product_time_idx` ON `compliance_checks` (`product_id`,`checked_at`);--> statement-breakpoint
CREATE INDEX `compliance_checks_status_severity_idx` ON `compliance_checks` (`status`,`highest_severity`);--> statement-breakpoint
CREATE INDEX `compliance_checks_content_idx` ON `compliance_checks` (`generated_content_id`);--> statement-breakpoint
CREATE TABLE `compliance_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`reason` text NOT NULL,
	`overridden_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `compliance_checks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `compliance_overrides_check_time_idx` ON `compliance_overrides` (`check_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `compliance_overrides_actor_time_idx` ON `compliance_overrides` (`overridden_by_email`,`created_at`);