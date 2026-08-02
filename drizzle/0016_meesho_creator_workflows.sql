CREATE TABLE `meesho_creator_workflows` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_email` text NOT NULL,
  `product_id` text,
  `source` text DEFAULT 'MEESHO_WISHLIST' NOT NULL,
  `status` text DEFAULT 'IMPORTED' NOT NULL,
  `product_url` text NOT NULL,
  `affiliate_url` text,
  `title` text NOT NULL,
  `image_url` text NOT NULL,
  `category` text NOT NULL,
  `price` real NOT NULL,
  `original_price` real,
  `supplier_name` text,
  `observed_at` text NOT NULL,
  `facts_verified_at` text,
  `generated_content_id` text,
  `caption` text,
  `hashtags_json` text DEFAULT '[]' NOT NULL,
  `creative_public_token` text,
  `creative_rendered_at` text,
  `approved_at` text,
  `instagram_creation_id` text,
  `instagram_media_id` text,
  `instagram_permalink` text,
  `published_at` text,
  `autodm_enrolled_at` text,
  `autodm_trigger_words_json` text DEFAULT '["LINK","PRICE","DETAILS","DM"]' NOT NULL,
  `publish_attempt_count` integer DEFAULT 0 NOT NULL,
  `next_retry_at` text,
  `last_error_code` text,
  `last_error_message` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE SET NULL,
  FOREIGN KEY (`generated_content_id`) REFERENCES `generated_content`(`id`) ON UPDATE no action ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meesho_workflows_owner_product_url_unique` ON `meesho_creator_workflows` (`owner_email`,`product_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `meesho_workflows_creative_token_unique` ON `meesho_creator_workflows` (`creative_public_token`);--> statement-breakpoint
CREATE INDEX `meesho_workflows_owner_status_time_idx` ON `meesho_creator_workflows` (`owner_email`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `meesho_workflows_retry_idx` ON `meesho_creator_workflows` (`status`,`next_retry_at`);
