-- Migration 008: multi-province inventory, english product names, banner offer links, delivery flags.
-- Fully idempotent and safe to re-run.

ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_by_province JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_provinces JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_inside_province BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_outside_province BOOLEAN NOT NULL DEFAULT true;

UPDATE products SET delivery_inside_province = delivery_same_province WHERE delivery_inside_province IS NULL;
UPDATE products SET delivery_outside_province = shipping_other_province WHERE delivery_outside_province IS NULL;

ALTER TABLE banners ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_name_en ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_banners_offer_id ON banners(offer_id);
CREATE INDEX IF NOT EXISTS idx_banners_product_id ON banners(product_id);

INSERT INTO permissions(key, name_ar, description, module) VALUES
  ('banners.view', 'عرض البنرات', 'عرض بنرات الشريط الإعلاني.', 'banners'),
  ('banners.manage', 'إدارة البنرات', 'إضافة وتعديل وحذف بنرات الشريط الإعلاني.', 'banners')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.key = 'company_manager' AND p.key IN ('offers.view','offers.create','banners.view','banners.manage','catalog.view')
ON CONFLICT DO NOTHING;
