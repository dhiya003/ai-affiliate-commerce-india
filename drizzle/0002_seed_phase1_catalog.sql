WITH RECURSIVE `sample_numbers`(`n`) AS (
	SELECT 7
	UNION ALL
	SELECT `n` + 1 FROM `sample_numbers` WHERE `n` < 50
)
INSERT INTO `products` (
	`id`, `owner_email`, `marketplace`, `marketplace_product_id`, `name`,
	`description`, `product_url`, `affiliate_url`, `image_url`, `category`,
	`seller_name`, `current_price`, `original_price`, `rating`, `review_count`,
	`commission_rate`, `seller_rating`, `stock_status`, `return_risk`, `status`,
	`notes`, `tags_json`, `opportunity_score`, `score_json`, `created_at`, `updated_at`
)
SELECT
	printf('phase1-sample-%03d', `n`),
	NULL,
	CASE (`n` - 1) % 5
		WHEN 0 THEN 'Amazon'
		WHEN 1 THEN 'Flipkart'
		WHEN 2 THEN 'Meesho'
		WHEN 3 THEN 'Myntra'
		ELSE 'AJIO'
	END,
	printf(
		'%s-SAMPLE-%03d',
		CASE (`n` - 1) % 5
			WHEN 0 THEN 'AMZ'
			WHEN 1 THEN 'FLP'
			WHEN 2 THEN 'MEE'
			WHEN 3 THEN 'MYN'
			ELSE 'AJI'
		END,
		`n`
	),
	CASE (`n` - 1) % 10
		WHEN 0 THEN 'Portable Bluetooth Speaker'
		WHEN 1 THEN 'Everyday Cotton T-Shirt'
		WHEN 2 THEN 'Stainless Steel Water Bottle'
		WHEN 3 THEN 'Vitamin C Face Wash'
		WHEN 4 THEN 'Non-Stick Mini Fry Pan'
		WHEN 5 THEN 'Classic Sling Bag'
		WHEN 6 THEN 'Yoga Mat with Carry Strap'
		WHEN 7 THEN 'Printed Cotton Bedsheet'
		WHEN 8 THEN 'Fast-Charging Power Bank'
		ELSE 'Women''s Walking Shoes'
	END || printf(' · Sample %02d', `n`),
	'Phase 1 demonstration opportunity with deterministic pricing, rating, and commission facts.',
	CASE (`n` - 1) % 5
		WHEN 0 THEN 'https://www.amazon.in/'
		WHEN 1 THEN 'https://www.flipkart.com/'
		WHEN 2 THEN 'https://www.meesho.com/'
		WHEN 3 THEN 'https://www.myntra.com/'
		ELSE 'https://www.ajio.com/'
	END,
	NULL,
	NULL,
	CASE (`n` - 1) % 10
		WHEN 0 THEN 'Electronics'
		WHEN 1 THEN 'Fashion'
		WHEN 2 THEN 'Home & Kitchen'
		WHEN 3 THEN 'Beauty'
		WHEN 4 THEN 'Home & Kitchen'
		WHEN 5 THEN 'Accessories'
		WHEN 6 THEN 'Fitness'
		WHEN 7 THEN 'Home & Kitchen'
		WHEN 8 THEN 'Electronics'
		ELSE 'Footwear'
	END,
	'Verified sample seller',
	249 + ((`n` * 53) % 1800),
	249 + ((`n` * 53) % 1800) + 300 + ((`n` * 41) % 1200),
	4.0 + ((`n` % 9) / 10.0),
	250 + (`n` * 173),
	5 + (`n` % 9),
	4.1 + ((`n` % 8) / 10.0),
	CASE WHEN `n` % 11 = 0 THEN 'LOW_STOCK' ELSE 'IN_STOCK' END,
	CASE WHEN `n` % 7 = 0 THEN 'MEDIUM' ELSE 'LOW' END,
	CASE WHEN `n` % 8 = 0 THEN 'REVIEWED' ELSE 'NEW' END,
	NULL,
	CASE (`n` - 1) % 10
		WHEN 0 THEN '["electronics","portable","sample"]'
		WHEN 1 THEN '["fashion","everyday","sample"]'
		WHEN 2 THEN '["home","utility","sample"]'
		WHEN 3 THEN '["beauty","skincare","sample"]'
		WHEN 4 THEN '["kitchen","utility","sample"]'
		WHEN 5 THEN '["accessories","fashion","sample"]'
		WHEN 6 THEN '["fitness","wellness","sample"]'
		WHEN 7 THEN '["home","decor","sample"]'
		WHEN 8 THEN '["electronics","charging","sample"]'
		ELSE '["footwear","fashion","sample"]'
	END,
	62 + ((`n` * 7) % 35),
	NULL,
	printf('2026-07-26T01:%02d:00.000Z', `n`),
	printf('2026-07-26T01:%02d:00.000Z', `n`)
FROM `sample_numbers`;
