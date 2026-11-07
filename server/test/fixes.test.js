import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-secret-used-only-by-automated-tests-12345';
process.env.CORS_ORIGINS = 'https://shop.example.com';
process.env.HEALTHCHECK_SKIP_DB = 'true';

const [{ productQuerySchema, reportProductSchema, rentalRequestSchema, addCartItemSchema }, { hasCompatibleLegacyRole }] = await Promise.all([
  import('../src/validation/schemas.js'),
  import('../src/services/permissionService.js')
]);

test('productQuerySchema accepts all sortBy aliases including price_asc and price_desc', () => {
  for (const sortBy of ['newest', 'oldest', 'cheapest', 'expensive', 'price_asc', 'price_desc']) {
    const res = productQuerySchema.safeParse({ sortBy });
    assert.equal(res.success, true);
    assert.equal(res.data.sortBy, sortBy);
  }
  assert.equal(productQuerySchema.safeParse({ sortBy: 'invalid' }).success, false);
});

test('reportProductSchema accepts 2-character reasons and optional/empty details', () => {
  assert.equal(reportProductSchema.safeParse({ reason: 'غش' }).success, true);
  assert.equal(reportProductSchema.safeParse({ reason: 'منتج غير أصلي', details: '' }).success, true);
  assert.equal(reportProductSchema.safeParse({ reason: 'منتج غير أصلي', details: null }).success, true);
  assert.equal(reportProductSchema.safeParse({ reason: 'م' }).success, false);
});

test('rentalRequestSchema accepts startsOn/endsOn or startDate/endDate with phone and province', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const future2 = new Date(Date.now() + 86400000 * 3).toISOString();
  const base = { rentalId: '11111111-1111-1111-1111-111111111111', phone: '+963911111111', province: 'دمشق' };
  assert.equal(rentalRequestSchema.safeParse({ ...base, startsOn: future, endsOn: future2 }).success, true);
  assert.equal(rentalRequestSchema.safeParse({ ...base, startDate: future, endDate: future2 }).success, true);
  assert.equal(rentalRequestSchema.safeParse({ ...base, startsOn: future2, endsOn: future }).success, false);
  assert.equal(rentalRequestSchema.safeParse({ ...base, startsOn: future, endsOn: future2, province: '' }).success, false);
  assert.equal(rentalRequestSchema.safeParse({ ...base, startsOn: future, endsOn: future2, whatsapp: '0999000000' }).success, true);
});

test('hasCompatibleLegacyRole recognizes RBAC roles and grants platform owner full legacy access', () => {
  assert.equal(hasCompatibleLegacyRole({ role: 'admin', roles: ['platform_owner'], isPlatformOwner: true }, ['customer']), true);
  assert.equal(hasCompatibleLegacyRole({ role: 'customer', roles: ['customer'] }, ['customer']), true);
  assert.equal(hasCompatibleLegacyRole({ role: 'admin', roles: ['customer', 'platform_admin'] }, ['customer']), true);
  assert.equal(hasCompatibleLegacyRole({ role: 'customer', roles: ['platform_admin'] }, ['admin']), true);
  assert.equal(hasCompatibleLegacyRole({ role: 'customer', roles: ['company_manager'] }, ['manager']), true);
  assert.equal(hasCompatibleLegacyRole({ role: 'customer', roles: ['company_admin'] }, ['merchant']), true);
  assert.equal(hasCompatibleLegacyRole({ role: 'merchant', roles: ['company_manager'] }, ['customer']), false);
  assert.equal(hasCompatibleLegacyRole({ role: 'merchant', roles: ['company_manager'] }, ['merchant', 'company_manager']), true);
  assert.equal(hasCompatibleLegacyRole(null, ['customer']), false);
});

test('addCartItemSchema validates productId uuid and quantity', () => {
  assert.equal(addCartItemSchema.safeParse({ productId: '11111111-1111-1111-1111-111111111111', quantity: 2 }).success, true);
  assert.equal(addCartItemSchema.safeParse({ productId: '11111111-1111-1111-1111-111111111111' }).success, true);
  assert.equal(addCartItemSchema.safeParse({ productId: 'bad', quantity: 0 }).success, false);
});
