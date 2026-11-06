'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import { ProvinceSelect, UniversitySelect } from '@/components/CatalogSelects';
import { apiError } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';

const initial = {
  name: '',
  nameEn: '',
  code: '',
  category: '',
  subCategory: '',
  description: '',
  specifications: '',
  condition: 'new',
  price: '',
  currency: 'SYP',
  stockQuantity: '1',
  expirationDate: '',
  manufacturer: '',
  countryOfOrigin: '',
  warrantyDetails: '',
  warrantyMonths: '',
  accessories: '',
  maintenanceDetails: '',
  deliverySameProvince: true,
  shippingOtherProvince: true,
  deliveryInsideProvince: true,
  deliveryOutsideProvince: true,
  sellerProvince: '',
  sellerArea: '',
  sellerUniversity: '',
  usageDurationMonths: '',
  defects: '',
  sellerDeclaration: false,
  platformFeeAccepted: false,
  images: [],
  stockByProvince: {},
  sellerProvinces: [],
  deliveryCostByProvince: {},
  sellerName: '',
  sellerPhone: '',
  sellerWhatsapp: ''
};

export default function ProductForm({
  endpoint = '/products',
  condition = null,
  allowConditionChoice = false,
  isPersonalSeller = false,
  onSuccess
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...initial,
    ...(condition ? { condition } : {}),
    sellerName: user?.fullName || '',
    sellerPhone: user?.phone || '',
    sellerWhatsapp: user?.whatsapp || ''
  });
  const [categories, setCategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [useProvinceStock, setUseProvinceStock] = useState(false);
  const [provinceStock, setProvinceStock] = useState({});
  const [deliveryCosts, setDeliveryCosts] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/catalog/categories').then((r) => setCategories(r.categories || [])).catch(() => setCategories([]));
    api.get('/delivery-rates/provinces').then((r) => setProvinces(r.provinces || [])).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((c) => ({
      ...c,
      sellerName: c.sellerName || user.fullName || '',
      sellerPhone: c.sellerPhone || user.phone || '',
      sellerWhatsapp: c.sellerWhatsapp || user.whatsapp || '',
      sellerProvince: c.sellerProvince || user.province || ''
    }));
  }, [user]);

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));

  const onProvinceStockChange = (provinceName, value) => {
    const next = { ...provinceStock, [provinceName]: Math.max(0, Number(value) || 0) };
    if (Number(value) === 0) delete next[provinceName];
    setProvinceStock(next);
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    setForm((c) => ({
      ...c,
      stockQuantity: String(total),
      stockByProvince: next,
      sellerProvinces: Object.keys(next)
    }));
  };

  const selectedCategory = useMemo(
    () => categories.find((c) => c.name === form.category),
    [categories, form.category]
  );

  const onDeliveryCostChange = (provinceName, value) => {
    const next = { ...deliveryCosts };
    if (value === '') delete next[provinceName];
    else next[provinceName] = Math.max(0, Number(value) || 0);
    setDeliveryCosts(next);
    setForm((current) => ({ ...current, deliveryCostByProvince: next }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.images.length < 2) return toast.error('أضف صورتين على الأقل للمنتج');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn?.trim() || null,
        code: form.code?.trim() || undefined,
        category: form.category,
        subCategory: form.subCategory || null,
        description: form.description.trim(),
        specifications: form.specifications || null,
        condition: form.condition,
        price: Number(form.price),
        currency: form.currency,
        stockQuantity: Number(form.stockQuantity),
        expirationDate: form.expirationDate || null,
        manufacturer: form.manufacturer || null,
        countryOfOrigin: form.countryOfOrigin || null,
        warrantyDetails: form.warrantyDetails || null,
        warrantyMonths: form.warrantyMonths === '' ? null : Number(form.warrantyMonths),
        accessories: form.accessories || null,
        maintenanceDetails: form.maintenanceDetails || null,
        deliverySameProvince: form.deliveryInsideProvince,
        shippingOtherProvince: form.deliveryOutsideProvince,
        deliveryInsideProvince: form.deliveryInsideProvince,
        deliveryOutsideProvince: form.deliveryOutsideProvince,
        sellerProvince: form.sellerProvince || null,
        sellerArea: form.sellerArea || null,
        sellerUniversity: form.sellerUniversity || null,
        usageDurationMonths: form.condition === 'used' ? (form.usageDurationMonths === '' ? 0 : Number(form.usageDurationMonths)) : null,
        defects: form.condition === 'used' ? form.defects || null : null,
        sellerDeclaration: form.sellerDeclaration,
        platformFeeAccepted: form.platformFeeAccepted,
        images: form.images,
        stockByProvince: useProvinceStock ? provinceStock : form.stockByProvince,
        sellerProvinces: useProvinceStock ? Object.keys(provinceStock) : form.sellerProvinces,
        sellerName: form.sellerName || undefined,
        sellerPhone: form.sellerPhone || undefined,
        sellerWhatsapp: form.sellerWhatsapp || undefined,
        deliveryCostByProvince: deliveryCosts
      };
      const response = await api.post(endpoint, payload);
      toast.success(response.message || 'تم إرسال المنتج للمراجعة');
      setForm({ ...initial, ...(condition ? { condition } : {}) });
      setProvinceStock({});
      setDeliveryCosts({});
      setUseProvinceStock(false);
      onSuccess?.(response);
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ name, label, type = 'text', required = false, ...props }) => (
    <label className="block text-sm font-bold">
      {label}
      {required && <span className="text-red-600"> *</span>}
      <input
        required={required}
        name={name}
        type={type}
        value={form[name]}
        onChange={update}
        className="input-base mt-2"
        {...props}
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-7">
      <section>
        <h2 className="text-xl font-black">بيانات المنتج</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input required name="name" label="اسم المنتج (بالعربية)" minLength="2" placeholder="مثال: جهاز تصليب ضوئي لاسلكي" />
          <label className="block text-sm font-bold">
            اسم المنتج بالإنكليزية (اختياري)
            <input
              name="nameEn"
              type="text"
              dir="ltr"
              value={form.nameEn}
              onChange={update}
              className="input-base mt-2"
              placeholder="e.g. Cordless LED Curing Light"
            />
          </label>
          <Input name="code" label="SKU / رمز المنتج (اختياري)" />
          <label className="text-sm font-bold">
            الحالة
            <select
              name="condition"
              value={form.condition}
              onChange={update}
              disabled={Boolean(condition) && !allowConditionChoice && !isPersonalSeller}
              className="input-base mt-2"
            >
              <option value="new">جديد</option>
              <option value="used">مستعمل</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            التصنيف
            <select required name="category" value={form.category} onChange={update} className="input-base mt-2">
              <option value="">اختر التصنيف</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          {selectedCategory?.subCategories?.length > 0 && (
            <label className="text-sm font-bold">
              التصنيف الفرعي
              <select name="subCategory" value={form.subCategory} onChange={update} className="input-base mt-2">
                <option value="">اختر الفرعي</option>
                {selectedCategory.subCategories.map((sub) => (
                  <option key={sub.id} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </label>
          )}
          <Input required name="price" label="السعر الأصلي" type="number" min="0.01" step="0.01" />
          <label className="text-sm font-bold">
            العملة
            <select name="currency" value={form.currency} onChange={update} className="input-base mt-2">
              <option value="SYP">ليرة سورية</option>
              <option value="USD">دولار أمريكي</option>
            </select>
          </label>
          <Input
            required
            name="stockQuantity"
            label="الكمية الإجمالية (عدد القطع)"
            type="number"
            min="0"
            disabled={useProvinceStock}
          />
          <Input name="manufacturer" label="الشركة المصنعة (اختياري)" placeholder="مثال: KaVo, 3M, Woodpecker" />
          <Input name="countryOfOrigin" label="بلد المنشأ (اختياري)" placeholder="مثال: ألمانيا، الصين، أمريكا" />
          <Input
            name="expirationDate"
            label="مدة / تاريخ الصلاحية"
            type="date"
            required={form.condition === 'new'}
          />
        </div>
        <label className="mt-4 block text-sm font-bold">
          وصف المنتج <span className="text-red-600">*</span>
          <textarea
            required
            name="description"
            value={form.description}
            onChange={update}
            minLength="10"
            className="input-base mt-2 min-h-32"
          />
        </label>
        <label className="mt-4 block text-sm font-bold">
          المواصفات
          <textarea
            name="specifications"
            value={form.specifications}
            onChange={update}
            className="input-base mt-2 min-h-24"
          />
        </label>
      </section>

      <section className="border-t border-secondary-100 pt-7">
        <h2 className="text-xl font-black">المخزون حسب المحافظات والفروع</h2>
        <p className="mt-1 text-xs text-secondary-500">
          إذا كان لديك فروع أو مستودعات في أكثر من محافظة، حدّد الكمية المتاحة في كل محافظة ليظهر للمشتري مباشرة عند الشراء.
        </p>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={useProvinceStock}
            onChange={(e) => setUseProvinceStock(e.target.checked)}
            className="h-4 w-4"
          />
          تحديد كميات المخزون لكل محافظة على حدة
        </label>
        {useProvinceStock && (
          <div className="mt-4 rounded-2xl bg-secondary-50 p-4">
            <p className="text-xs text-secondary-600">
              أدخل الكمية المتوفرة في كل محافظة؛ تُحسب الكمية الإجمالية تلقائياً ويراها المشتري عند اختيار محافظته:
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {provinces.map((p) => (
                <label key={p.id} className="block text-xs font-bold text-secondary-800">
                  {p.name}
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={provinceStock[p.name] ?? ''}
                    onChange={(e) => onProvinceStockChange(p.name, e.target.value)}
                    className="input-base mt-1"
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs font-bold text-primary-800">
              المجموع الإجمالي: {Object.values(provinceStock).reduce((a, b) => a + b, 0)} قطعة
            </p>
          </div>
        )}
      </section>

      <section className="border-t border-secondary-100 pt-7">
        <h2 className="text-xl font-black">الصور والموقع وخيارات التوصيل</h2>
        <div className="mt-5">
          <ImageUploader
            value={form.images}
            onChange={(images) => setForm((current) => ({ ...current, images }))}
            min={2}
          />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ProvinceSelect
            label="محافظة البائع (المركز الرئيسي)"
            value={form.sellerProvince}
            onChange={(value) =>
              setForm((current) => ({ ...current, sellerProvince: value, sellerUniversity: '' }))
            }
          />
          <Input name="sellerArea" label="منطقة البائع" />
          <UniversitySelect
            label="الجامعة (إن وجدت)"
            value={form.sellerUniversity}
            province={form.sellerProvince}
            onChange={(value) => setForm((current) => ({ ...current, sellerUniversity: value }))}
          />
        </div>
        <div className="mt-5 rounded-2xl bg-primary-50 p-4">
          <p className="text-sm font-bold text-primary-950">التحكم في خيارات التوصيل لهذا المنتج:</p>
          <div className="mt-3 space-y-2 text-sm text-primary-950">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="deliveryInsideProvince"
                checked={form.deliveryInsideProvince}
                onChange={update}
                className="h-4 w-4"
              />
              التوصيل متاح داخل نفس المحافظة
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="deliveryOutsideProvince"
                checked={form.deliveryOutsideProvince}
                onChange={update}
                className="h-4 w-4"
              />
              التوصيل متاح إلى محافظات أخرى (خارج المحافظة)
            </label>
          </div>
          <p className="mt-3 text-xs text-primary-800">
            إذا لم توفر أنت التوصيل، تتولى TopDent التوصيل وفق التعرفة المعتمدة حسب محافظة الاستلام.
          </p>
          <div className="mt-5 rounded-xl border border-primary-100 bg-white p-4">
            <p className="text-sm font-bold text-secondary-900">تكلفة توصيل خاصة بهذا المنتج (اختياري)</p>
            <p className="mt-1 text-xs leading-6 text-secondary-600">اترك الحقول فارغة لاستخدام تعرفة الشركة أو TopDent. عند إدخال تكلفة لمحافظة، تُستخدم عند اختيار الزبون لها.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {provinces.map((province) => (
                <label key={province.id} className="text-xs font-bold">
                  {province.name}
                  <input type="number" min="0" step="1" value={deliveryCosts[province.name] ?? ''} onChange={(event) => onDeliveryCostChange(province.name, event.target.value)} className="input-base mt-1" placeholder="تعرفة افتراضية" />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isPersonalSeller && (
        <section className="rounded-2xl border border-secondary-200 bg-secondary-50 p-5">
          <h2 className="text-xl font-black text-secondary-900">بيانات التواصل مع البائع (تظهر للمشتري مباشرة)</h2>
          <p className="mt-1 text-xs text-secondary-600">
            تظهر هذه البيانات في صفحة المنتج ليتمكن المشتري من التواصل معك عبر الهاتف أو الواتساب، ويمكنك تعديلها في أي وقت:
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Input name="sellerName" label="اسم البائع" placeholder="اسمك الذي سيظهر للمشتري" />
            <Input name="sellerPhone" label="رقم الهاتف للتواصل" type="tel" placeholder="+963..." />
            <Input name="sellerWhatsapp" label="رقم الواتساب للتواصل" type="tel" placeholder="+963..." />
          </div>
        </section>
      )}

      <section className="border-t border-secondary-100 pt-7">
        <h2 className="text-xl font-black">الكفالة والمعلومات الإضافية</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input name="warrantyMonths" label="مدة الكفالة بالأشهر" type="number" min="0" />
          <Input name="warrantyDetails" label="تفاصيل الكفالة" />
          <Input name="accessories" label="الملحقات" />
          <Input name="maintenanceDetails" label="الصيانة" />
        </div>
      </section>

      {form.condition === 'used' && (
        <section className="rounded-2xl bg-amber-50 p-5">
          <h2 className="text-xl font-black text-amber-900">بيانات المنتج المستعمل</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input
              required
              name="usageDurationMonths"
              label="مدة الاستخدام بالأشهر"
              type="number"
              min="0"
            />
            <label className="text-sm font-bold sm:col-span-2">
              الأعطال والعيوب بالتفصيل <span className="text-red-600">*</span>
              <textarea
                required
                name="defects"
                value={form.defects}
                onChange={update}
                className="input-base mt-2 min-h-28"
                placeholder="اكتب لا يوجد إن لم توجد عيوب"
              />
            </label>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <label className="flex items-start gap-3">
              <input
                required
                name="sellerDeclaration"
                checked={form.sellerDeclaration}
                onChange={update}
                type="checkbox"
                className="mt-1"
              />
              أقر بأن الصور والوصف مطابقان لحالة المنتج.
            </label>
            <label className="flex items-start gap-3">
              <input
                required
                name="platformFeeAccepted"
                checked={form.platformFeeAccepted}
                onChange={update}
                type="checkbox"
                className="mt-1"
              />
              أوافق على رسوم وشروط المنصة الخاصة بالعرض.
            </label>
          </div>
        </section>
      )}

      <button disabled={loading} className="btn-primary w-full sm:w-auto">
        {loading ? 'جارٍ الإرسال...' : 'إرسال المنتج للمراجعة'}
      </button>
    </form>
  );
}
