CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`creator_account_id` text,
	`name` text NOT NULL,
	`objective` text NOT NULL,
	`channel` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`budget` real,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`notes` text,
	`template_name` text,
	`duplicated_from_id` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`creator_account_id`) REFERENCES `creator_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `campaigns_owner_status_time_idx` ON `campaigns` (`owner_email`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `campaigns_owner_channel_time_idx` ON `campaigns` (`owner_email`,`channel`,`starts_at`);--> statement-breakpoint
CREATE INDEX `campaigns_creator_account_idx` ON `campaigns` (`creator_account_id`);--> statement-breakpoint
CREATE INDEX `campaigns_name_idx` ON `campaigns` (`owner_email`,`name`);--> statement-breakpoint
CREATE TABLE `click_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tracked_link_id` text NOT NULL,
	`clicked_at` text NOT NULL,
	`traffic_source` text,
	`device_type` text DEFAULT 'UNKNOWN' NOT NULL,
	`region` text,
	`fingerprint_hash` text,
	`is_bot` integer DEFAULT false NOT NULL,
	`is_duplicate` integer DEFAULT false NOT NULL,
	`suspicious_reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tracked_link_id`) REFERENCES `tracked_links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `click_events_link_time_idx` ON `click_events` (`tracked_link_id`,`clicked_at`);--> statement-breakpoint
CREATE INDEX `click_events_quality_time_idx` ON `click_events` (`is_bot`,`is_duplicate`,`clicked_at`);--> statement-breakpoint
CREATE INDEX `click_events_fingerprint_time_idx` ON `click_events` (`fingerprint_hash`,`clicked_at`);--> statement-breakpoint
CREATE TABLE `commission_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`conversion_event_id` text NOT NULL,
	`marketplace` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text NOT NULL,
	`observed_at` text NOT NULL,
	`approved_at` text,
	`imported_at` text NOT NULL,
	FOREIGN KEY (`conversion_event_id`) REFERENCES `conversion_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commission_events_conversion_status_time_unique` ON `commission_events` (`conversion_event_id`,`status`,`observed_at`);--> statement-breakpoint
CREATE INDEX `commission_events_owner_status_time_idx` ON `commission_events` (`owner_email`,`status`,`observed_at`);--> statement-breakpoint
CREATE INDEX `commission_events_marketplace_time_idx` ON `commission_events` (`marketplace`,`observed_at`);--> statement-breakpoint
CREATE TABLE `content_variations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`product_id` text NOT NULL,
	`generated_content_id` text,
	`label` text NOT NULL,
	`hook` text,
	`caption` text,
	`cta` text,
	`hashtags_json` text DEFAULT '[]' NOT NULL,
	`audience_angle` text,
	`content_length` text,
	`tone` text,
	`platform` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`is_winner` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generated_content_id`) REFERENCES `generated_content`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_variations_owner_product_label_unique` ON `content_variations` (`owner_email`,`product_id`,`label`);--> statement-breakpoint
CREATE INDEX `content_variations_product_status_idx` ON `content_variations` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `content_variations_content_idx` ON `content_variations` (`generated_content_id`);--> statement-breakpoint
CREATE TABLE `conversion_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`tracked_link_id` text NOT NULL,
	`click_event_id` text,
	`marketplace` text NOT NULL,
	`external_order_id_hash` text NOT NULL,
	`order_status` text NOT NULL,
	`order_value` real,
	`currency` text DEFAULT 'INR' NOT NULL,
	`converted_at` text NOT NULL,
	`imported_at` text NOT NULL,
	FOREIGN KEY (`tracked_link_id`) REFERENCES `tracked_links`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`click_event_id`) REFERENCES `click_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversion_events_marketplace_order_unique` ON `conversion_events` (`marketplace`,`external_order_id_hash`);--> statement-breakpoint
CREATE INDEX `conversion_events_owner_time_idx` ON `conversion_events` (`owner_email`,`converted_at`);--> statement-breakpoint
CREATE INDEX `conversion_events_link_status_idx` ON `conversion_events` (`tracked_link_id`,`order_status`);--> statement-breakpoint
CREATE TABLE `creator_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`platform` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text,
	`external_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creator_accounts_owner_platform_handle_unique` ON `creator_accounts` (`owner_email`,`platform`,`handle`);--> statement-breakpoint
CREATE INDEX `creator_accounts_owner_active_idx` ON `creator_accounts` (`owner_email`,`is_active`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`campaign_id` text NOT NULL,
	`product_id` text NOT NULL,
	`generated_content_id` text,
	`content_variation_id` text,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`scheduled_at` text,
	`published_at` text,
	`published_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`generated_content_id`) REFERENCES `generated_content`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`content_variation_id`) REFERENCES `content_variations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `promotions_owner_status_time_idx` ON `promotions` (`owner_email`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `promotions_campaign_time_idx` ON `promotions` (`campaign_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `promotions_product_time_idx` ON `promotions` (`product_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `promotions_variation_idx` ON `promotions` (`content_variation_id`);--> statement-breakpoint
CREATE TABLE `tracked_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`promotion_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`product_id` text NOT NULL,
	`content_variation_id` text,
	`marketplace` text NOT NULL,
	`tracking_id` text NOT NULL,
	`short_path` text NOT NULL,
	`destination_url` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_variation_id`) REFERENCES `content_variations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracked_links_tracking_id_unique` ON `tracked_links` (`tracking_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tracked_links_short_path_unique` ON `tracked_links` (`short_path`);--> statement-breakpoint
CREATE INDEX `tracked_links_owner_active_idx` ON `tracked_links` (`owner_email`,`is_active`);--> statement-breakpoint
CREATE INDEX `tracked_links_campaign_idx` ON `tracked_links` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `tracked_links_product_idx` ON `tracked_links` (`product_id`);