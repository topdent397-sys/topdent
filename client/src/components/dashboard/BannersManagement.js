'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { apiError, formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';

const bannerEmpty = { title: '', imageUrl: '', linkUrl: '', offerId: '', productId: '', orderIndex: 0, isActive: true };
const offerEmpty = { title: '', description: '', imageUrl: '', merchantId: '', startsAt: '', endsAt: '', orderIndex: 0, isActive: true };

export default function BannersManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('banners');
  const [banners, setBanners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bannerForm, setBannerForm] = useState(bannerEmpty);
  const [editingBanner, setEditingBanner] = useState(null);
  const [offerForm, setOfferForm] = useState(offerEmpty);
  const [editingOffer, setEditingOffer] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, o] = await Promise.all([
        api.get('/platform/banners').catch(() => ({ banners: [] })),
        api.get('/platform/offers?limit=50').catch(() => ({ offers: [] }))
      ]);
      setBanners(b.banners || []);
      setOffers(o.offers || []);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadImage = async (event, onDone) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('files', file);
    setUploading(true);
    try {
      const res = await api.post('/upload/images', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.files?.[0]?.url;
      if (url) { onDone(url); toast.success('تم رفع الصورة'); }
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    if (!bannerForm.imageUrl) return toast.error('رابط الصورة مطلوب');
    setBusy(true);
    try {
      const payload = {
        title: bannerForm.title || null,
        imageUrl: bannerForm.imageUrl,
        linkUrl: bannerForm.linkUrl || null,
        offerId: bannerForm.offerId || null,
        productId: bannerForm.productId || null,
        orderIndex: Number(bannerForm.orderIndex) || 0,
        isActive: bannerForm.isActive
      };
      if (editingBanner) {
        await api.patch(`/platform/banners/${editingBanner.id}`, payload);
        toast.success('تم تحديث البنر');
      } else {
        await api.post('/platform/banners', payload);
        toast.success('تمت إضافة البنر');
      }
      setBannerForm(bannerEmpty);
      setEditingBanner(null);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const editBanner = (b) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title || '',
      imageUrl: b.image_url || '',
      linkUrl: b.link_url || '',
      offerId: b.offer_id || '',
      productId: b.product_id || '',
      orderIndex: b.order_index ?? 0,
      isActive: b.is_active ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBanner = async (b) => {
    try {
      await api.patch(`/platform/banners/${b.id}`, { isActive: !b.is_active });
      await load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البنر؟')) return;
    try {
      await api.delete(`/platform/banners/${id}`);
      toast.success('تم حذف البنر');
      await load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const saveOffer = async (event) => {
    event.preventDefault();
    if (!offerForm.title.trim()) return toast.error('عنوان العرض مطلوب');
    if (!offerForm.imageUrl) return toast.error('رابط الصورة مطلوب');
    setBusy(true);
    try {
      const payload = {
        title: offerForm.title.trim(),
        description: offerForm.description || null,
        imageUrl: offerForm.imageUrl,
        merchantId: offerForm.merchantId || (user?.companyIds?.length === 1 ? user.companyIds[0] : null),
        startsAt: offerForm.startsAt ? new Date(offerForm.startsAt).toISOString() : null,
        endsAt: offerForm.endsAt ? new Date(offerForm.endsAt).toISOString() : null,
        orderIndex: Number(offerForm.orderIndex) || 0,
        isActive: offerForm.isActive
      };
      if (editingOffer) {
        await api.patch(`/platform/offers/${editingOffer.id}`, payload);
        toast.success('تم تحديث العرض');
      } else {
        await api.post('/platform/offers', payload);
        toast.success('تمت إضافة العرض');
      }
      setOfferForm(offerEmpty);
      setEditingOffer(null);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const editOffer = (o) => {
    setEditingOffer(o);
    setOfferForm({
      title: o.title || '',
      description: o.description || '',
      imageUrl: o.image_url || '',
      merchantId: o.merchant_id || '',
      startsAt: o.starts_at ? o.starts_at.slice(0, 10) : '',
      endsAt: o.ends_at ? o.ends_at.slice(0, 10) : '',
      orderIndex: o.order_index ?? 0,
      isActive: o.is_active ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleOffer = async (o) => {
    try {
      await api.patch(`/platform/offers/${o.id}`, { isActive: !o.is_active });
      await load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    try {
      await api.delete(`/platform/offers/${id}`);
      toast.success('تم حذف العرض');
      await load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (loading) return <div className="rounded-2xl bg-white p-10 text-center text-secondary-600 shadow-card">جارٍ تحميل بيانات العروض والبنرات…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إدارة العروض والبنرات الإعلانية</h2>
        <p className="mt-2 text-sm leading-7 text-secondary-600">
          تحكّم بالشريط الإعلاني (البنرات) وعروض المنتجات. البنرات قابلة للضغط وتنقل المستخدم تلقائياً إلى صفحة العرض أو المنتج أو رابط خارجي. يمكن للأدمن والمدير الإضافة والتعديل والحذف وتفعيل/تعطيل أي عرض.
        </p>
      </div>

      <div className="flex gap-2 border-b border-secondary-200 pb-2">
        <button onClick={() => setTab('banners')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'banners' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-700'}`}>
          الشريط الإعلاني / البنرات ({banners.length})
        </button>
        <button onClick={() => setTab('offers')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'offers' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-700'}`}>
          عروض المنتجات والخصومات ({offers.length})
        </button>
      </div>

      {tab === 'banners' && (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="font-black">{editingBanner ? 'تعديل البنر الإعلاني' : 'إضافة بنر إعلاني جديد'}</h3>
            <p className="mt-1 text-xs text-secondary-500">يظهر البنر في الشريط الإعلاني بالصفحة الرئيسية وينقل المستخدم عند الضغط إليه.</p>
            <form onSubmit={saveBanner} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">عنوان البنر (اختياري)
                  <input className="input-base mt-2" value={bannerForm.title} onChange={(e) => setBannerForm((c) => ({ ...c, title: e.target.value }))} placeholder="مثال: عروض الصيف على أجهزة التصليب" />
                </label>
                <label className="block text-sm font-bold">الترتيب
                  <input className="input-base mt-2" type="number" min="0" value={bannerForm.orderIndex} onChange={(e) => setBannerForm((c) => ({ ...c, orderIndex: e.target.value }))} />
                </label>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold">رابط الصورة <span className="text-red-600">*</span>
                    <input className="input-base mt-2" value={bannerForm.imageUrl} onChange={(e) => setBannerForm((c) => ({ ...c, imageUrl: e.target.value }))} placeholder="https://..." />
                  </label>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-primary-700 hover:underline">
                    <span>{uploading ? 'جارٍ الرفع…' : 'أو ارفع صورة من جهازك'}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e, (url) => setBannerForm((c) => ({ ...c, imageUrl: url })))} className="hidden" />
                  </label>
                </div>
                <label className="block text-sm font-bold">ربط بعرض من المنصة (يُنقل المستخدم إلى صفحة العرض)
                  <select className="input-base mt-2" value={bannerForm.offerId} onChange={(e) => setBannerForm((c) => ({ ...c, offerId: e.target.value }))}>
                    <option value="">— لا يوجد ربط بعرض —</option>
                    {offers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold">أو رابط خارجي / مخصص
                  <input className="input-base mt-2" value={bannerForm.linkUrl} onChange={(e) => setBannerForm((c) => ({ ...c, linkUrl: e.target.value }))} placeholder="/offers أو https://..." />
                </label>
              </div>
              {bannerForm.imageUrl && (
                <div className="relative aspect-[21/9] max-w-md overflow-hidden rounded-xl border border-secondary-200">
                  <img src={bannerForm.imageUrl} alt="معاينة" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={bannerForm.isActive} onChange={(e) => setBannerForm((c) => ({ ...c, isActive: e.target.checked }))} />
                  تفعيل البنر فوراً
                </label>
                <div className="flex gap-2">
                  {editingBanner && (
                    <button type="button" onClick={() => { setBannerForm(bannerEmpty); setEditingBanner(null); }} className="btn-secondary">إلغاء</button>
                  )}
                  <button disabled={busy} className="btn-primary">{editingBanner ? 'حفظ التعديلات' : 'إضافة البنر'}</button>
                </div>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="font-black">البنرات الحالية</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {banners.map((b) => (
                <div key={b.id} className="overflow-hidden rounded-xl border border-secondary-100">
                  <div className="relative aspect-[21/9] bg-secondary-100">
                    <img src={b.image_url} alt={b.title || 'بنر'} className="h-full w-full object-cover" />
                    <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${b.is_active ? 'bg-emerald-500 text-white' : 'bg-secondary-500 text-white'}`}>
                      {b.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-black">{b.title || '— بدون عنوان —'}</p>
                    <p className="mt-1 text-xs text-secondary-500">
                      الترتيب: {b.order_index} · {b.offer?.title ? `مرتبط بالعرض: ${b.offer.title}` : (b.link_url || '—')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <button onClick={() => editBanner(b)} className="btn-secondary text-xs">تعديل</button>
                      <button onClick={() => toggleBanner(b)} className="btn-secondary text-xs">{b.is_active ? 'تعطيل' : 'تفعيل'}</button>
                      <button onClick={() => deleteBanner(b.id)} className="btn-secondary text-xs text-red-600">حذف</button>
                    </div>
                  </div>
                </div>
              ))}
              {!banners.length && <p className="text-sm text-secondary-500">لا توجد بنرات بعد. أضف بنراً جديداً ليظهر في الشريط الإعلاني.</p>}
            </div>
          </section>
        </>
      )}

      {tab === 'offers' && (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="font-black">{editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}</h3>
            <p className="mt-1 text-xs text-secondary-500">العروض تظهر في صفحة العروض والخصومات ويمكن ربط أي بنر إعلاني بها.</p>
            <form onSubmit={saveOffer} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">عنوان العرض <span className="text-red-600">*</span>
                  <input required className="input-base mt-2" value={offerForm.title} onChange={(e) => setOfferForm((c) => ({ ...c, title: e.target.value }))} placeholder="مثال: خصم 25% على جميع التوربينات" />
                </label>
                <label className="block text-sm font-bold">الترتيب
                  <input className="input-base mt-2" type="number" min="0" value={offerForm.orderIndex} onChange={(e) => setOfferForm((c) => ({ ...c, orderIndex: e.target.value }))} />
                </label>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold">رابط الصورة <span className="text-red-600">*</span>
                    <input className="input-base mt-2" value={offerForm.imageUrl} onChange={(e) => setOfferForm((c) => ({ ...c, imageUrl: e.target.value }))} placeholder="https://..." />
                  </label>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-primary-700 hover:underline">
                    <span>{uploading ? 'جارٍ الرفع…' : 'أو ارفع صورة من جهازك'}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e, (url) => setOfferForm((c) => ({ ...c, imageUrl: url })))} className="hidden" />
                  </label>
                </div>
                <label className="block text-sm font-bold">تاريخ البداية (اختياري)
                  <input className="input-base mt-2" type="date" value={offerForm.startsAt} onChange={(e) => setOfferForm((c) => ({ ...c, startsAt: e.target.value }))} />
                </label>
                <label className="block text-sm font-bold">تاريخ النهاية (اختياري)
                  <input className="input-base mt-2" type="date" value={offerForm.endsAt} onChange={(e) => setOfferForm((c) => ({ ...c, endsAt: e.target.value }))} />
                </label>
                <label className="block text-sm font-bold sm:col-span-2">تفاصيل العرض
                  <textarea className="input-base mt-2 min-h-24" value={offerForm.description} onChange={(e) => setOfferForm((c) => ({ ...c, description: e.target.value }))} placeholder="شرح تفاصيل العرض والخصومات والمنتجات المشمولة..." />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={offerForm.isActive} onChange={(e) => setOfferForm((c) => ({ ...c, isActive: e.target.checked }))} />
                  تفعيل العرض فوراً
                </label>
                <div className="flex gap-2">
                  {editingOffer && (
                    <button type="button" onClick={() => { setOfferForm(offerEmpty); setEditingOffer(null); }} className="btn-secondary">إلغاء</button>
                  )}
                  <button disabled={busy} className="btn-primary">{editingOffer ? 'حفظ التعديلات' : 'إضافة العرض'}</button>
                </div>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h3 className="font-black">العروض الحالية</h3>
            <div className="mt-4 space-y-3">
              {offers.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-secondary-100 p-4">
                  <div className="flex items-center gap-3">
                    <img src={o.image_url} alt={o.title} className="h-14 w-20 rounded-lg object-cover" />
                    <div>
                      <p className="font-black">{o.title}</p>
                      <p className="text-xs text-secondary-500">
                        {o.starts_at && `من ${formatDate(o.starts_at)}`} {o.ends_at && `إلى ${formatDate(o.ends_at)}`} · ترتيب {o.order_index} · {o.is_active ? 'نشط' : 'معطل'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => editOffer(o)} className="btn-secondary text-xs">تعديل</button>
                    <button onClick={() => toggleOffer(o)} className="btn-secondary text-xs">{o.is_active ? 'تعطيل' : 'تفعيل'}</button>
                    <button onClick={() => deleteOffer(o.id)} className="btn-secondary text-xs text-red-600">حذف</button>
                  </div>
                </div>
              ))}
              {!offers.length && <p className="text-sm text-secondary-500">لا توجد عروض بعد. أضف عرضاً جديداً ليظهر في صفحة العروض.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
