import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, AppError, audit, notify, merchantForUser } from '../lib/http.js';
import { assertCanAccessCompany } from '../services/permissionService.js';
import { createRentalSchema, idParamsSchema, rentalRequestSchema, rentalStatusSchema } from '../validation/schemas.js';

const router = express.Router();

function rentalPrice(rental, startsOn, endsOn) {
  const days = Math.floor((new Date(endsOn).getTime() - new Date(startsOn).getTime()) / 86400000) + 1;
  const weeklyBlocks = rental.weekly_price ? Math.floor(days / 7) : 0;
  const remainingDays = days - weeklyBlocks * 7;
  const total = weeklyBlocks * Number(rental.weekly_price || 0) + remainingDays * Number(rental.daily_price || 0);
  if (!total) throw new AppError(400, 'لا يمكن حساب سعر الإيجار للمدة المختارة', 'RENTAL_PRICE_UNAVAILABLE');
  return { days, total };
}

router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('rentals').select('*, product:products(id, name, code, description, condition, price, currency, images:product_images(image_url, is_primary), merchant:merchants(company_name, province))').eq('is_active', true).eq('product.is_active', true).eq('product.is_approved', true).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ rentals: data || [] });
}));

router.get('/my-requests', verifyToken, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('rental_requests').select('*, rental:rentals(*, product:products(name, code, images:product_images(image_url, is_primary)))').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ requests: data || [] });
}));

router.post('/requests', verifyToken, validate({ body: rentalRequestSchema }), asyncHandler(async (req, res) => {
  const { data: rental, error } = await supabaseAdmin.from('rentals').select('*').eq('id', req.body.rentalId).eq('is_active', true).maybeSingle();
  if (error) throw error;
  if (!rental) throw new AppError(404, 'الأداة غير متاحة للإيجار', 'RENTAL_NOT_FOUND');
  const price = rentalPrice(rental, req.body.startsOn, req.body.endsOn);
  const { data: user, error: userError } = await supabaseAdmin.from('users').select('full_name, phone, whatsapp, province, area, address').eq('id', req.user.id).single();
  if (userError) throw userError;
  const { data: request, error: requestError } = await supabaseAdmin.from('rental_requests').insert({
    rental_id: rental.id, user_id: req.user.id, starts_on: req.body.startsOn.toISOString().slice(0, 10), ends_on: req.body.endsOn.toISOString().slice(0, 10),
    calculated_price: price.total, deposit_snapshot: rental.deposit_amount, status: 'new',
    customer_phone: req.body.phone, customer_whatsapp: req.body.whatsapp || null, customer_province: req.body.province,
    customer_snapshot: { ...user, phone: req.body.phone, whatsapp: req.body.whatsapp || null, province: req.body.province, notes: req.body.notes || null }
  }).select().single();
  if (requestError) throw requestError;
  await audit(req.user.id, 'rental_requested', 'rental_request', request.id, { days: price.days });
  res.status(201).json({ message: 'تم إرسال طلب الإيجار للمراجعة', request, days: price.days });
}));

router.post('/', verifyToken, requireRole(['merchant', 'admin']), validate({ body: createRentalSchema }), asyncHandler(async (req, res) => {
  const { data: product, error } = await supabaseAdmin.from('products').select('id, merchant_id').eq('id', req.body.productId).maybeSingle();
  if (error) throw error;
  if (!product) throw new AppError(404, 'المنتج غير موجود', 'PRODUCT_NOT_FOUND');
  if (!req.user.hasGlobalScope) {
    let allowedCompanyIds = req.user.companyIds || [];
    if (!allowedCompanyIds.length && req.user.role === 'merchant') {
      const merchant = await merchantForUser(req.user.id);
      allowedCompanyIds = merchant?.id ? [merchant.id] : [];
    }
    if (!allowedCompanyIds.includes(product.merchant_id)) throw new AppError(403, 'لا يمكنك إضافة إيجار إلا لمنتجات شركتك', 'PRODUCT_OWNERSHIP_REQUIRED');
  }
  const { data, error: insertError } = await supabaseAdmin.from('rentals').insert({ product_id: req.body.productId, daily_price: req.body.dailyPrice, weekly_price: req.body.weeklyPrice, deposit_amount: req.body.depositAmount, return_terms: req.body.returnTerms, late_fee_per_day: req.body.lateFeePerDay, is_active: req.body.isActive }).select().single();
  if (insertError) throw insertError;
  await audit(req.user.id, 'rental_configured', 'rental', data.id);
  res.status(201).json({ rental: data });
}));

router.get('/admin/requests', verifyToken, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  let rentalIds = null;
  if (!req.user.hasGlobalScope) {
    const companyIds = req.user.companyIds || [];
    if (!companyIds.length) return res.json({ requests: [] });
    const { data: products, error: productError } = await supabaseAdmin.from('products').select('id').in('merchant_id', companyIds);
    if (productError) throw productError;
    if (!products?.length) return res.json({ requests: [] });
    const { data: rentals, error: rentalError } = await supabaseAdmin.from('rentals').select('id').in('product_id', products.map((product) => product.id));
    if (rentalError) throw rentalError;
    rentalIds = (rentals || []).map((rental) => rental.id);
    if (!rentalIds.length) return res.json({ requests: [] });
  }
  let query = supabaseAdmin.from('rental_requests').select('*, user:users(full_name, phone, whatsapp, province, area, address), rental:rentals(*, product:products(name, code, merchant:merchants(company_name)))').order('created_at', { ascending: false });
  if (rentalIds) query = query.in('rental_id', rentalIds);
  const { data, error } = await query;
  if (error) throw error;
  res.json({ requests: data || [] });
}));

router.patch('/admin/requests/:id', verifyToken, requireRole(['admin', 'manager']), validate({ params: idParamsSchema, body: rentalStatusSchema }), asyncHandler(async (req, res) => {
  const { data: request, error } = await supabaseAdmin.from('rental_requests').select('id, user_id, rental_id').eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!request) throw new AppError(404, 'طلب الإيجار غير موجود', 'RENTAL_REQUEST_NOT_FOUND');
  if (!req.user.hasGlobalScope) {
    const { data: rental, error: rentalError } = await supabaseAdmin.from('rentals').select('product:products!inner(merchant_id)').eq('id', request.rental_id).maybeSingle();
    if (rentalError) throw rentalError;
    assertCanAccessCompany(req.user, rental?.product?.merchant_id);
  }
  const { error: updateError } = await supabaseAdmin.from('rental_requests').update({ status: req.body.status, manager_note: req.body.managerNote || null, return_condition: req.body.returnCondition || null, updated_at: new Date().toISOString() }).eq('id', request.id);
  if (updateError) throw updateError;
  await notify(request.user_id, 'rental_status', 'تحديث طلب الإيجار', req.body.managerNote || `تم تحديث حالة طلب الإيجار إلى ${req.body.status}`);
  await audit(req.user.id, 'rental_request_updated', 'rental_request', request.id, { status: req.body.status });
  res.json({ message: 'تم تحديث طلب الإيجار' });
}));

export default router;
