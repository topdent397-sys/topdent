'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiAlertTriangle, FiCheck, FiHeart, FiMinus, FiPhone, FiPlus, FiSend, FiShare2, FiShoppingCart, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { apiError, formatMoney } from '@/lib/format';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart, busyItemId } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ reason: '', details: '' });
  const [viewerProvince, setViewerProvince] = useState('');
  const [provinces, setProvinces] = useState([]);

  useEffect(() => {
    if (!id) return;
    setProduct(null);
    Promise.all([api.get(`/products/${id}`), api.get(`/products/${id}/related`)])
      .then(([item, suggestions]) => {
        setProduct(item);
        setRelated(suggestions.products || []);
        setSelected(0);
      })
      .catch((err) => setError(apiError(err, 'لم يتم العثور على المنتج')));
  }, [id]);

  useEffect(() => {
    api.get('/delivery-rates/provinces').then((r) => setProvinces(r.provinces || [])).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (user?.province && !viewerProvince) setViewerProvince(user.province);
  }, [user, viewerProvince]);

  const stockByProvince = product?.stock_by_province && typeof product.stock_by_province === 'object'
    ? product.stock_by_province
    : null;
  const hasProvinceStock = stockByProvince && Object.keys(stockByProvince).length > 0;
  const selectedProvinceStock = viewerProvince && hasProvinceStock ? stockByProvince[viewerProvince] : null;
  const maxAvailable = hasProvinceStock && viewerProvince
    ? Number(selectedProvinceStock ?? 0)
    : Number(product?.stock_quantity ?? 0);
  const soldOut = maxAvailable < 1;

  useEffect(() => {
    setQuantity(1);
  }, [viewerProvince]);

  const images = product?.images?.length ? product.images : [{ image_url: '/placeholder.svg' }];
  const image = images[selected]?.image_url;

  const sellerContact = product?.metadata?.seller_contact;
  const isPersonal = Boolean(product?.merchant?.is_personal_seller || sellerContact);
  const contactName = sellerContact?.name || product?.merchant?.company_name;
  const contactPhone = sellerContact?.phone || product?.merchant?.phone || (isPersonal ? product?.metadata?.sellerPhone : null);
  const contactWhatsapp = sellerContact?.whatsapp || product?.merchant?.whatsapp || (isPersonal ? product?.metadata?.sellerWhatsapp : null);

  const cleanPhone = (p) => (p || '').replace(/[^0-9+]/g, '');
  const canUseFavorites = true;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('تم نسخ رابط المنتج');
      }
    } catch {}
  };

  const sendReport = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error('سجّل الدخول أولاً لإرسال بلاغ عن المنتج');
      return;
    }
    try {
      await api.post(`/products/${product.id}/report`, { reason: report.reason.trim(), details: report.details?.trim() || null });
      toast.success('تم إرسال البلاغ للمراجعة');
      setReportOpen(false);
      setReport({ reason: '', details: '' });
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (error) {
    return (
      <div className="container-main py-20"><div className="empty-state mx-auto max-w-xl">
        <h1 className="text-2xl font-black">{error}</h1>
        <p className="mt-3 text-secondary-600">تحقق من الرابط أو عد إلى الكتالوج لاختيار منتج آخر.</p>
        <Link href="/products" className="btn-primary mt-6">العودة إلى المنتجات</Link>
      </div></div>
    );
  }
  if (!product) return <div className="min-h-screen bg-secondary-50 py-8"><div className="container-main"><div className="grid gap-8 rounded-3xl bg-white p-5 shadow-card md:grid-cols-2 md:p-8"><div className="skeleton h-[360px] sm:h-[480px]" /><div className="space-y-5"><div className="skeleton h-8 w-2/3" /><div className="skeleton h-5 w-1/3" /><div className="skeleton h-28 w-full" /><div className="skeleton h-14 w-full" /><div className="skeleton h-12 w-full" /></div></div></div></div>;

  return (
    <div className="min-h-screen bg-secondary-50 px-0 py-8 pb-24 md:pb-8">
      <div className="container-main">
        <div className="mb-5 text-sm text-secondary-600">
          <Link href="/products" className="hover:text-primary-700">المنتجات</Link>
          <span className="mx-2">/</span>{product.category}<span className="mx-2">/</span>{product.name}
        </div>

        <section className="grid gap-8 rounded-3xl bg-white p-5 shadow-card md:p-8 lg:grid-cols-2">
          <div>
            <div className="relative h-[360px] overflow-hidden rounded-2xl bg-secondary-100 sm:h-[480px]">
              <ProductImage src={image} alt={product.name} className="h-full w-full object-contain" />
              <span className="watermark watermark-large">TopDent</span>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto">
              {images.map((item, index) => (
                <button
                  key={item.id || item.image_url}
                  onClick={() => setSelected(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${selected === index ? 'border-primary-600' : 'border-transparent'}`}
                >
                  <ProductImage src={item.image_url} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${product.condition === 'new' ? 'bg-primary-50 text-primary-700' : 'bg-amber-100 text-amber-800'}`}>
                  {product.condition === 'new' ? 'منتج جديد' : 'منتج مستعمل'}
                </span>
                <h1 className="mt-3 text-3xl font-black leading-tight">{product.name}</h1>
                {product.name_en && (
                  <p className="mt-1 text-base font-medium text-secondary-500" dir="ltr">{product.name_en}</p>
                )}
                <p className="mt-2 text-sm text-secondary-500">
                  رمز المنتج: <b className="font-black text-secondary-800">{product.code || '—'}</b> · {product.merchant?.company_name}
                </p>
              </div>
              <button
                onClick={() => canUseFavorites && toggleFavorite(product.id)}
                className={`rounded-full p-3 transition ${isFavorite(product.id) ? 'bg-red-500 text-white' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}
                aria-label="المفضلة"
              >
                <FiHeart className={isFavorite(product.id) ? 'fill-current' : ''} />
              </button>
            </div>

            <div className="mt-7 rounded-2xl bg-primary-50 p-5">
              <p className="text-3xl font-black text-primary-800">{formatMoney(product.price, product.currency)}</p>
              {product.currency === 'USD' && (
                <p className="mt-2 text-sm text-primary-700">السعر المكافئ للترتيب: {formatMoney(product.price_syp, 'SYP')}</p>
              )}
              <p className="mt-2 text-sm text-secondary-600">السعر عند الطلب يُحفظ كما هو ولا يتغير بتبدل معامل الدولار.</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <p className="rounded-xl bg-secondary-50 p-3"><b>المخزون الإجمالي:</b> {product.stock_quantity} قطعة</p>
              <p className="rounded-xl bg-secondary-50 p-3"><b>التصنيف:</b> {product.category}</p>
              <div className="col-span-2 rounded-xl bg-secondary-50 p-3 space-y-1">
                <p className="font-bold text-secondary-900">خيارات التوصيل لهذا المنتج:</p>
                <p className={`flex items-center gap-1.5 text-xs ${product.delivery_inside_province !== false ? 'text-emerald-700' : 'text-red-700'}`}>
                  {product.delivery_inside_province !== false ? <FiCheck /> : <FiX />} التوصيل داخل نفس المحافظة: {product.delivery_inside_province !== false ? 'متاح' : 'غير متاح'}
                </p>
                <p className={`flex items-center gap-1.5 text-xs ${product.delivery_outside_province !== false ? 'text-emerald-700' : 'text-red-700'}`}>
                  {product.delivery_outside_province !== false ? <FiCheck /> : <FiX />} التوصيل خارج المحافظة: {product.delivery_outside_province !== false ? 'متاح' : 'غير متاح'}
                </p>
              </div>
            </div>

            {/* Province stock checker for multi-branch products */}
            <div className="mt-4 rounded-2xl border border-secondary-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-secondary-700">تحقق من توفر المنتج في محافظتك (فروع المركز التجاري):</p>
                <select
                  className="input-base text-xs py-1"
                  value={viewerProvince}
                  onChange={(e) => setViewerProvince(e.target.value)}
                >
                  <option value="">اختر محافظتك</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              {hasProvinceStock && viewerProvince && (
                <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${selectedProvinceStock > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  {selectedProvinceStock > 0
                    ? `المتوفر في فرع ${viewerProvince}: ${selectedProvinceStock} قطعة`
                    : `غير متوفر حالياً في فرع ${viewerProvince}`}
                </div>
              )}
              {hasProvinceStock && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-secondary-600 mb-1">مخزون جميع الفروع حسب المحافظة:</p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {Object.entries(stockByProvince).map(([pname, qty]) => (
                      <span key={pname} className={`rounded-full px-2.5 py-1 ${pname === viewerProvince ? 'bg-primary-600 text-white font-bold' : 'bg-secondary-100 text-secondary-700'}`}>
                        {pname}: {qty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center rounded-xl border border-secondary-200">
                <button disabled={quantity <= 1} onClick={() => setQuantity((v) => v - 1)} className="p-3 disabled:opacity-30">
                  <FiMinus />
                </button>
                <span className="min-w-10 text-center font-bold">{quantity}</span>
                <button disabled={quantity >= Math.max(1, maxAvailable)} onClick={() => setQuantity((v) => v + 1)} className="p-3 disabled:opacity-30">
                  <FiPlus />
                </button>
              </div>
              <button
                disabled={soldOut || busyItemId === product.id}
                onClick={() => addToCart(product.id, quantity)}
                className="btn-primary flex-1 disabled:bg-secondary-300"
              >
                <FiShoppingCart className="ml-2" />{soldOut ? 'نفد المخزون' : 'أضف للسلة'}
              </button>
              <button onClick={share} className="btn-secondary" aria-label="مشاركة"><FiShare2 /></button>
              <button onClick={() => setReportOpen(true)} className="btn-secondary text-amber-700" aria-label="إبلاغ"><FiAlertTriangle /></button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-xl font-black">الوصف والمواصفات</h2>
            <p className="mt-4 whitespace-pre-line leading-8 text-secondary-700">{product.description}</p>
            {product.specifications && (
              <>
                <h3 className="mt-7 font-black">المواصفات</h3>
                <p className="mt-3 whitespace-pre-line leading-8 text-secondary-700">{product.specifications}</p>
              </>
            )}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                ['الشركة المصنعة', product.manufacturer],
                ['بلد المنشأ', product.country_of_origin],
                ['الكفالة', product.warranty_details],
                ['الملحقات', product.accessories],
                ['الصيانة', product.maintenance_details],
                ['العيوب', product.defects],
                ['مدة الاستخدام', product.usage_duration_months !== null && product.usage_duration_months !== undefined ? `${product.usage_duration_months} شهر` : null]
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-secondary-50 p-4">
                    <p className="text-xs text-secondary-500">{label}</p>
                    <p className="mt-1 font-medium">{value}</p>
                  </div>
                ))}
            </div>
          </article>

          <aside className="rounded-2xl bg-white p-6 shadow-card space-y-4">
            <h2 className="font-black">بيانات البائع</h2>
            <p className="font-bold">{product.merchant?.company_name}</p>
            <p className="text-sm text-secondary-600">
              {product.merchant?.province} {product.merchant?.area ? `· ${product.merchant.area}` : ''}
            </p>

            {isPersonal && (contactPhone || contactWhatsapp) && (
              <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-4 text-sm text-primary-950 space-y-2">
                <p className="font-bold">تواصل مباشر مع البائع (حساب شخصي):</p>
                {contactName && contactName !== product.merchant?.company_name && (
                  <p className="text-xs text-secondary-700">الاسم: {contactName}</p>
                )}
                {contactPhone && (
                  <a href={`tel:${cleanPhone(contactPhone)}`} className="flex items-center gap-2 font-bold text-primary-700 hover:underline">
                    <FiPhone className="shrink-0" /> {contactPhone}
                  </a>
                )}
                {contactWhatsapp && (
                  <a href={`https://wa.me/${cleanPhone(contactWhatsapp).replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-emerald-700 hover:underline">
                    <FiSend className="shrink-0" /> واتساب: {contactWhatsapp}
                  </a>
                )}
                <p className="text-[11px] text-secondary-500 pt-1">
                  يمكنك الاستفسار عن المنتج أو المعاينة مباشرة من خلال هذه الأرقام، وتُحدَّث هذه البيانات من حساب البائع في أي وقت.
                </p>
              </div>
            )}

            <p className="rounded-xl bg-primary-50 p-4 text-sm leading-6 text-primary-900">
              التوصيل متاح وإلزامي دائماً. إذا لم توفر الشركة أو البائع التوصيل، تتولى TopDent العملية وفق التعرفة المعتمدة.
            </p>
          </aside>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 text-2xl font-black">منتجات مشابهة</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="container-main flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-xs text-secondary-500">الإجمالي</p><p className="font-black text-primary-700">{formatMoney(product.price * quantity, product.currency)}</p></div><button disabled={soldOut || busyItemId === product.id} onClick={() => addToCart(product.id, quantity)} className="btn-primary flex-1 disabled:bg-secondary-300"><FiShoppingCart className="ml-2" />{soldOut ? 'نفد المخزون' : 'أضف للسلة'}</button></div>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-secondary-950/45 p-4">
          <form onSubmit={sendReport} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black">إبلاغ عن المنتج</h2>
            <p className="mt-2 text-sm text-secondary-600">يراجع فريق الإدارة البلاغ دون نشر بياناتك.</p>
            <input
              required
              minLength="2"
              value={report.reason}
              onChange={(e) => setReport((c) => ({ ...c, reason: e.target.value }))}
              placeholder="سبب البلاغ"
              className="input-base mt-5"
            />
            <textarea
              value={report.details}
              onChange={(e) => setReport((c) => ({ ...c, details: e.target.value }))}
              placeholder="تفاصيل إضافية (اختياري)"
              className="input-base mt-3 min-h-28"
            />
            <div className="mt-5 flex gap-3">
              <button className="btn-primary">إرسال البلاغ</button>
              <button type="button" onClick={() => setReportOpen(false)} className="btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
