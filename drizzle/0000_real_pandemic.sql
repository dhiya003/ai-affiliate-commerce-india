CREATE TABLE `product_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`changed_by_email` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`note` text,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_status_history_product_time_idx` ON `product_status_history` (`product_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text,
	`marketplace` text NOT NULL,
	`marketplace_product_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`product_url` text NOT NULL,
	`affiliate_url` text,
	`image_url` text,
	`category` text NOT NULL,
	`seller_name` text,
	`current_price` real NOT NULL,
	`original_price` real,
	`rating` real,
	`review_count` real DEFAULT 0 NOT NULL,
	`commission_rate` real,
	`seller_rating` real,
	`stock_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`return_risk` text DEFAULT 'UNKNOWN' NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`notes` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`opportunity_score` real,
	`score_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_marketplace_external_id_unique` ON `products` (`marketplace`,`marketplace_product_id`);--> statement-breakpoint
CREATE INDEX `products_owner_updated_idx` ON `products` (`owner_email`,`updated_at`);--> statement-breakpoint
CREATE INDEX `products_marketplace_score_idx` ON `products` (`marketplace`,`opportunity_score`);--> statement-breakpoint
CREATE INDEX `products_status_score_idx` ON `products` (`status`,`opportunity_score`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);
--> statement-breakpoint
INSERT INTO `products` (
	`id`, `owner_email`, `marketplace`, `marketplace_product_id`, `name`,
	`description`, `product_url`, `affiliate_url`, `image_url`, `category`,
	`seller_name`, `current_price`, `original_price`, `rating`, `review_count`,
	`commission_rate`, `seller_rating`, `stock_status`, `return_risk`, `status`,
	`notes`, `tags_json`, `opportunity_score`, `score_json`, `created_at`, `updated_at`
) VALUES
	(
		'amazon-earbuds', NULL, 'Amazon', 'AMZ-EARBUDS-001', 'Noise Air Buds Pro SE',
		'Low-ticket audio product with strong customer proof and broad creator appeal.',
		'https://www.amazon.in/', NULL, NULL, 'Electronics', 'Verified electronics seller',
		1299, 2999, 4.6, 12430, 8, 4.8, 'IN_STOCK', 'LOW', 'NEW', NULL,
		'["audio","under-1500","creator-pick"]', 83.45,
		'{"version":"v1.0.0","strongestFactors":["ratingScore","reviewVolumeScore","trendScore"],"cautions":[]}',
		'2026-07-26T00:00:00.000Z', '2026-07-26T00:00:00.000Z'
	),
	(
		'myntra-kurta', NULL, 'Myntra', 'MYN-KURTA-001', 'Anouk Floral Cotton Kurta',
		'Seasonal fashion pick with a high visible discount and strong audience fit.',
		'https://www.myntra.com/', NULL, NULL, 'Fashion', 'Anouk',
		799, 1999, 4.5, 8421, 11, 4.7, 'IN_STOCK', 'MEDIUM', 'APPROVED', NULL,
		'["fashion","kurta","seasonal"]', 82.31,
		'{"version":"v1.0.0","strongestFactors":["discountScore","commissionScore","ratingScore"],"cautions":["Medium return risk."]}',
		'2026-07-26T00:01:00.000Z', '2026-07-26T00:01:00.000Z'
	),
	(
		'meesho-chopper', NULL, 'Meesho', 'MEE-CHOPPER-001', 'SwiftCut Handy Chopper',
		'Highly visual kitchen utility with an accessible price and strong review volume.',
		'https://www.meesho.com/', NULL, NULL, 'Home & Kitchen', 'SwiftCut Store',
		299, 699, 4.4, 18950, 9, 4.5, 'IN_STOCK', 'LOW', 'REVIEWED', NULL,
		'["kitchen","under-500","high-demand"]', 88.12,
		'{"version":"v1.0.0","strongestFactors":["reviewVolumeScore","priceAttractivenessScore","trendScore"],"cautions":[]}',
		'2026-07-26T00:02:00.000Z', '2026-07-26T00:02:00.000Z'
	),
	(
		'flipkart-serum', NULL, 'Flipkart', 'FLP-SERUM-001', 'Minimalist Vitamin C Serum',
		'Beauty product with strong ratings, repeat-use potential and clear content angles.',
		'https://www.flipkart.com/', NULL, NULL, 'Beauty', 'Minimalist',
		549, 799, 4.7, 6312, 10, 4.9, 'IN_STOCK', 'LOW', 'NEW', NULL,
		'["beauty","skincare","repeat-use"]', 81.86,
		'{"version":"v1.0.0","strongestFactors":["ratingScore","sellerQualityScore","commissionScore"],"cautions":[]}',
		'2026-07-26T00:03:00.000Z', '2026-07-26T00:03:00.000Z'
	),
	(
		'ajio-handbag', NULL, 'AJIO', 'AJI-BAG-001', 'DNMX Structured Handbag',
		'Fashion accessory with a strong discount, higher commission and visual appeal.',
		'https://www.ajio.com/', NULL, NULL, 'Accessories', 'DNMX',
		899, 2499, 4.3, 2789, 13, 4.6, 'LOW_STOCK', 'MEDIUM', 'NEW', NULL,
		'["fashion","accessories","high-commission"]', 80.44,
		'{"version":"v1.0.0","strongestFactors":["commissionScore","discountScore","competitionScore"],"cautions":["Medium return risk."]}',
		'2026-07-26T00:04:00.000Z', '2026-07-26T00:04:00.000Z'
	),
	(
		'amazon-bands', NULL, 'Amazon', 'AMZ-BANDS-001', 'Boldfit Resistance Band Kit',
		'Demonstrable fitness kit with evergreen use cases and healthy review proof.',
		'https://www.amazon.in/', NULL, NULL, 'Fitness', 'Boldfit',
		499, 999, 4.6, 9874, 7, 4.8, 'IN_STOCK', 'LOW', 'PROMOTED', NULL,
		'["fitness","under-500","evergreen"]', 79.72,
		'{"version":"v1.0.0","strongestFactors":["ratingScore","reviewVolumeScore","priceAttractivenessScore"],"cautions":[]}',
		'2026-07-26T00:05:00.000Z', '2026-07-26T00:05:00.000Z'
	);
