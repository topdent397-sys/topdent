-- Migration 010: rental request contact fields, sensible platform_admin default permissions, and product query performance indexes.

-- 1. Contact and location fields captured on each rental request
ALTER TABLE rental_requests ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(25);
ALTER TABLE rental_requests ADD COLUMN IF NOT EXISTS customer_whatsapp VARCHAR(25);
ALTER TABLE rental_requests ADD COLUMN IF NOT EXISTS customer_province VARCHAR(100);

-- Backfill existing rows from customer_snapshot if available
UPDATE rental_requests
SET customer_phone = COALESCE(customer_phone, customer_snapshot->>'phone'),
    customer_whatsapp = COALESCE(customer_whatsapp, customer_snapshot->>'whatsapp'),
    customer_province = COALESCE(customer_province, customer_snapshot->>'province')
WHERE customer_snapshot IS NOT NULL
  AND (customer_phone IS NULL OR customer_province IS NULL);

-- 2. Grant sensible default operational permissions to platform_admin so new admin accounts can use the dashboard immediately.
-- The platform owner can still grant or revoke permissions per role at any time.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.key = 'platform_admin' AND p.key IN (
  'dashboard.view', 'companies.view', 'users.view',
  'products.view', 'products.approve', 'products.reject', 'products.hide',
  'orders.view', 'orders.review', 'orders.change_status', 'orders.assign_driver',
  'drivers.view', 'drivers.assign',
  'finance.view', 'invoices.view', 'reports.view',
  'rentals.view', 'notifications.view', 'notifications.send',
  'audit.view', 'settings.view', 'catalog.view', 'offers.view'
)
ON CONFLICT DO NOTHING;

-- 3. Composite indexes to accelerate the public product listing (status/active/approved filters + sort)
CREATE INDEX IF NOT EXISTS idx_products_public_listing
ON products(status, is_active, is_approved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_public_price
ON products(status, is_active, is_approved, price_syp ASC);

CREATE INDEX IF NOT EXISTS idx_rental_requests_user_created
ON rental_requests(user_id, created_at DESC);
