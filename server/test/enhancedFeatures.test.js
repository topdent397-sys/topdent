import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-secret-used-only-by-automated-tests-12345';
process.env.CORS_ORIGINS = 'https://shop.example.com';

const {
  registerSchema,
  createProductSchema,
  updateProductSchema,
  bannerSchema,
  updateBannerSchema,
  updateOfferSchema,
  userProfileSchema,
  platformProductUpdateSchema
} = await import('../src/validation/schemas.js');

test('registerSchema: governorate is optional, phone is still mandatory', () => {
  const withoutProvince = registerSchema.safeParse({
    email: 'user@example.com',
    password: 'Password123!',
    passwordConfirmation: 'Password123!',
    fullName: 'أحمد السوري',
    phone: '+963911111111',
    acceptTerms: true,
    acceptPrivacy: true
  });
  assert.equal(withoutProvince.success, true);
  assert.equal(withoutProvince.data.province, undefined);

  const withoutPhone = registerSchema.safeParse({
    email: 'user@example.com',
    password: 'Password123!',
    passwordConfirmation: 'Password123!',
    fullName: 'أحمد السوري',
    acceptTerms: true,
    acceptPrivacy: true
  });
  assert.equal(withoutPhone.success, false);
});

test('createProductSchema accepts english name, multi-province inventory and delivery flags', () => {
  const payload = createProductSchema.parse({
    name: 'جهاز تصليب ضوئي',
    nameEn: 'LED Curing Light',
    category: 'معدات',
    description: 'جهاز تصليب ضوئي احترافي للعيادات',
    price: 1500000,
    stockQuantity: 10,
    images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
    deliveryInsideProvince: true,
    deliveryOutsideProvince: false,
    stockByProvince: { 'دمشق': 7, 'حلب': 3 },
    sellerProvinces: ['دمشق', 'حلب']
  });
  assert.equal(payload.nameEn, 'LED Curing Light');
  assert.equal(payload.deliveryInsideProvince, true);
  assert.equal(payload.deliveryOutsideProvince, false);
  assert.deepEqual(payload.stockByProvince, { 'دمشق': 7, 'حلب': 3 });
  assert.deepEqual(payload.sellerProvinces, ['دمشق', 'حلب']);
});

test('used products enforce declaration and platform fee acceptance; new products do not', () => {
  const base = {
    name: 'كرسي أسنان',
    category: 'معدات',
    description: 'كرسي أسنان بحالة ممتازة',
    price: 25000000,
    stockQuantity: 1,
    images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg']
  };
  const usedWithoutDecl = createProductSchema.safeParse({
    ...base,
    condition: 'used',
    usageDurationMonths: 24,
    defects: 'لا يوجد'
  });
  assert.equal(usedWithoutDecl.success, false);

  const newProduct = createProductSchema.safeParse(base);
  assert.equal(newProduct.success, true);
  assert.equal(newProduct.data.condition, 'new');
});

test('bannerSchema links to offers or products and partial updates are allowed', () => {
  const offerId = '11111111-1111-4111-8111-111111111111';
  const banner = bannerSchema.parse({
    title: 'عرض الصيف',
    imageUrl: 'https://cdn.example.com/banner.jpg',
    offerId
  });
  assert.equal(banner.offerId, offerId);
  assert.equal(banner.isActive, true);

  const partial = updateBannerSchema.parse({ isActive: false });
  assert.equal(partial.isActive, false);

  const offerUpdate = updateOfferSchema.parse({ title: 'تعديل العنوان' });
  assert.equal(offerUpdate.title, 'تعديل العنوان');
});

test('userProfileSchema treats province as optional', () => {
  const res = userProfileSchema.safeParse({
    fullName: 'د. لينا خالد',
    phone: '+963911111111',
    area: 'المرجة'
  });
  assert.equal(res.success, true);
});

test('platformProductUpdateSchema accepts the new fields', () => {
  const res = platformProductUpdateSchema.parse({
    nameEn: 'Handpiece',
    manufacturer: 'KaVo',
    countryOfOrigin: 'ألمانيا',
    deliveryInsideProvince: true,
    deliveryOutsideProvince: true,
    stockByProvince: { 'دمشق': 2 }
  });
  assert.equal(res.nameEn, 'Handpiece');
  assert.equal(res.countryOfOrigin, 'ألمانيا');
});
