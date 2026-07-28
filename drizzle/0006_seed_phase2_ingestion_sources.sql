INSERT OR IGNORE INTO `product_sources` (
  `id`, `marketplace`, `name`, `source_type`, `status`,
  `freshness_window_minutes`, `consecutive_failures`, `created_at`, `updated_at`
) VALUES
  ('source-amazon-manual', 'Amazon', 'Amazon operator import', 'MANUAL', 'READY', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-flipkart-manual', 'Flipkart', 'Flipkart operator import', 'MANUAL', 'READY', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-meesho-manual', 'Meesho', 'Meesho operator import', 'MANUAL', 'READY', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-myntra-manual', 'Myntra', 'Myntra operator import', 'MANUAL', 'READY', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('source-ajio-manual', 'AJIO', 'AJIO operator import', 'MANUAL', 'READY', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `ingestion_schedules` (
  `id`, `source_id`, `cadence_minutes`, `enabled`, `created_at`, `updated_at`
) VALUES
  ('schedule-amazon-manual', 'source-amazon-manual', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-flipkart-manual', 'source-flipkart-manual', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-meesho-manual', 'source-meesho-manual', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-myntra-manual', 'source-myntra-manual', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z'),
  ('schedule-ajio-manual', 'source-ajio-manual', 720, 0, '2026-07-29T00:00:00.000Z', '2026-07-29T00:00:00.000Z');
