CREATE TABLE `saved_products` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`user_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_products_user_product_unique` ON `saved_products` (`user_email`,`product_id`);--> statement-breakpoint
CREATE INDEX `saved_products_user_time_idx` ON `saved_products` (`user_email`,`created_at`);