CREATE TABLE `generated_content` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`created_by_email` text NOT NULL,
	`content_json` text NOT NULL,
	`prompt_version` text NOT NULL,
	`provider` text NOT NULL,
	`provider_model` text NOT NULL,
	`request_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generated_content_product_creator_time_idx` ON `generated_content` (`product_id`,`created_by_email`,`created_at`);