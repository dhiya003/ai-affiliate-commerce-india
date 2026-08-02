ALTER TABLE `meesho_creator_workflows` ADD COLUMN `autodm_delivered_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `meesho_creator_workflows` ADD COLUMN `autodm_open_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `meesho_creator_workflows` ADD COLUMN `autodm_click_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `meesho_creator_workflows` ADD COLUMN `autodm_conversion_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `meesho_creator_workflows` ADD COLUMN `autodm_revenue` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `meesho_creator_workflows` ADD COLUMN `autodm_commission` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `meesho_creator_workflows` ADD COLUMN `last_autodm_report_at` text;
--> statement-breakpoint
CREATE TABLE `meesho_autodm_report_imports` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_email` text NOT NULL,
  `workflow_id` text,
  `report_date` text NOT NULL,
  `delivered_count` integer DEFAULT 0 NOT NULL,
  `open_count` integer DEFAULT 0 NOT NULL,
  `click_count` integer DEFAULT 0 NOT NULL,
  `conversion_count` integer DEFAULT 0 NOT NULL,
  `revenue` real DEFAULT 0 NOT NULL,
  `commission` real DEFAULT 0 NOT NULL,
  `source_row_json` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`workflow_id`) REFERENCES `meesho_creator_workflows`(`id`) ON UPDATE no action ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `meesho_autodm_reports_owner_date_idx` ON `meesho_autodm_report_imports` (`owner_email`,`report_date`);
--> statement-breakpoint
CREATE INDEX `meesho_autodm_reports_workflow_idx` ON `meesho_autodm_report_imports` (`workflow_id`);
