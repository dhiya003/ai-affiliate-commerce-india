INSERT OR IGNORE INTO `product_sources` (
  `id`, `marketplace`, `name`, `source_type`, `status`,
  `freshness_window_minutes`, `consecutive_failures`, `created_at`, `updated_at`
) VALUES
  ('source-amazon-partner', 'Amazon', 'Amazon partner adapter', 'API', 'DISABLED', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-flipkart-partner', 'Flipkart', 'Flipkart partner adapter', 'API', 'DISABLED', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-meesho-partner', 'Meesho', 'Meesho partner adapter', 'API', 'DISABLED', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-myntra-partner', 'Myntra', 'Myntra partner adapter', 'API', 'DISABLED', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-ajio-partner', 'AJIO', 'AJIO partner adapter', 'API', 'DISABLED', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `ingestion_schedules` (
  `id`, `source_id`, `cadence_minutes`, `enabled`, `created_at`, `updated_at`
) VALUES
  ('schedule-amazon-partner', 'source-amazon-partner', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-flipkart-partner', 'source-flipkart-partner', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-meesho-partner', 'source-meesho-partner', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-myntra-partner', 'source-myntra-partner', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-ajio-partner', 'source-ajio-partner', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z');
