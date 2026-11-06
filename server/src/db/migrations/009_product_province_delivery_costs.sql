-- Migration 009: optional product-level delivery costs by customer province.
-- Empty JSON keeps the existing merchant/platform delivery-rate behavior.
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_cost_by_province JSONB NOT NULL DEFAULT '{}'::jsonb;
