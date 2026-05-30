-- Panini Lab v2 — add country + player_name to collection_items
-- Idempotent: safe to run multiple times.

BEGIN;

ALTER TABLE panini_lab.collection_items
  ADD COLUMN IF NOT EXISTS country      text,
  ADD COLUMN IF NOT EXISTS player_name  text;

CREATE INDEX IF NOT EXISTS idx_panini_collection_country
  ON panini_lab.collection_items (tenant_slug, country);

COMMIT;
