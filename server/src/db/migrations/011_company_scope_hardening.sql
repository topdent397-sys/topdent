-- Migration 011: company accounts are operationally scoped and cannot manage banners or user data.
-- Idempotent: safe to apply repeatedly.
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE key IN ('company_manager', 'company_admin'))
  AND permission_id IN (
    SELECT id FROM permissions
    WHERE key IN ('banners.manage', 'users.view', 'users.create', 'users.update', 'users.disable', 'users.assign_role', 'companies.manage_team')
  );
