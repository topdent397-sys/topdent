import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorText } from './api';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from './brand';

const C = {
  primary: '#2563eb',
  dark: '#1d4ed8',
  ink: '#172033',
  muted: '#64748b',
  bg: '#f1f5f9',
  card: '#fff',
  border: '#dbe4ea',
  danger: '#b91c1c',
  ok: '#15803d',
  soft: '#e0f2fe'
};

const money = (value, currency = 'SYP') =>
  `${Number(value || 0).toLocaleString('ar-SY')} ${currency === 'USD' ? '$' : 'ل.س'}`;

const imageOf = (p) => {
  const source = Array.isArray(p?.images) ? p.images.find((entry) => entry?.is_primary) || p.images[0] : p?.images;
  const resolve = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      try { return resolve(JSON.parse(trimmed)); } catch { return trimmed; }
    }
    if (Array.isArray(value)) return value.map(resolve).find(Boolean) || null;
    if (typeof value === 'object') return resolve(value.image_url || value.imageUrl || value.url || value.path || value.src);
    return null;
  };
  return resolve(source) || resolve(p?.image_url) || resolve(p?.imageUrl) || resolve(p?.image_urls) || resolve(p?.url) || resolve(p?.merchant?.logo_url);
};

const cleanPhone = (p) => (p || '').replace(/[^0-9+]/g, '');

function Btn({ title, onPress, secondary = false, disabled = false, danger = false, small = false, active = false }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[s.btn, secondary && s.secondary, active && s.chipActive, danger && s.danger, small && s.btnSmall, disabled && s.disabled]}
    >
      <Text style={[s.btnText, secondary && s.secondaryText, danger && s.dangerText, small && s.btnSmallText]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        keyboardType={keyboardType}
        style={[s.input, multiline && s.multiline]}
      />
    </View>
  );
}

function ProductCard({ product, onPress }) {
  const multiBranch = product.seller_provinces?.length > 1 || Object.keys(product.stock_by_province || {}).length > 1;
  return (
    <Pressable onPress={onPress} style={s.card}>
      <View style={s.row}>
        {imageOf(product) ? (
          <Image source={{ uri: imageOf(product) }} style={s.thumb} />
        ) : (
          <View style={s.thumbPlaceholder}><BrandMark size={50} light /></View>
        )}
        <View style={s.flex}>
          <Text style={s.cardTitle}>{product.name}</Text>
          {product.name_en ? <Text style={s.nameEn}>{product.name_en}</Text> : null}
          <Text style={s.muted}>{product.category || product.merchant?.company_name || 'منتج أسنان'}</Text>
          <Text style={s.price}>{money(product.price, product.currency)}</Text>
          <Text style={s.muted}>
            {product.stock_quantity > 0 ? `المخزون الإجمالي: ${product.stock_quantity}` : 'نفد المخزون'}
          </Text>
          {multiBranch ? <Text style={s.multiBadge}>فروع في عدة محافظات</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function CommerceProducts({ navigation }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ search: '', category: '', condition: '', currency: '', sortBy: 'newest', page: 1 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(Object.entries(form).filter(([, v]) => v));
      const r = await api.get(`/products?${q.toString()}`);
      setProducts(r.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    api.get('/catalog/categories').then((r) => setCategories(r.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.logoRow}><BrandMark size={34} light /><Text style={s.logoText}>TopDent</Text></View>
        <Text style={s.title}>المنتجات</Text>
        <Text style={s.subtitle}>ابحث وقارن واشترِ بثقة</Text>
        <Field label="البحث" value={form.search} onChangeText={(v) => setForm({ ...form, search: v, page: 1 })} placeholder="اسم المنتج أو الشركة" />
        <Text style={s.label}>التصنيف</Text>
        <ScrollView horizontal contentContainerStyle={s.chips}>
          {[['', 'الكل'], ...categories.map((c) => [c.name, c.name])].map(([v, t]) => (
            <Pressable key={v} onPress={() => setForm({ ...form, category: v, page: 1 })} style={[s.chip, form.category === v && s.chipActive]}>
              <Text>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={s.label}>الحالة</Text>
        <View style={s.chips}>
          {[['', 'جديد ومستعمل'], ['new', 'جديد'], ['used', 'مستعمل']].map(([v, t]) => (
            <Pressable key={v} onPress={() => setForm({ ...form, condition: v, page: 1 })} style={[s.chip, form.condition === v && s.chipActive]}>
              <Text>{t}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.sortRow}>
          <Btn title="الأحدث" secondary active={form.sortBy === 'newest'} onPress={() => setForm({ ...form, sortBy: 'newest', page: 1 })} />
          <Btn title="الأرخص" secondary active={form.sortBy === 'price_asc'} onPress={() => setForm({ ...form, sortBy: 'price_asc', page: 1 })} />
          <Btn title="الأغلى" secondary active={form.sortBy === 'price_desc'} onPress={() => setForm({ ...form, sortBy: 'price_desc', page: 1 })} />
        </View>
        {loading ? (
          <Text style={s.muted}>جارٍ تحميل الكتالوج...</Text>
        ) : products.length ? (
          products.map((p) => (
            <ProductCard key={p.id} product={p} onPress={() => navigation.navigate('Product', { id: p.id })} />
          ))
        ) : (
          <Text style={s.empty}>لا توجد منتجات مطابقة.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export function CommerceProduct({ route, navigation }) {
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [viewerProvince, setViewerProvince] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/products/${route.params.id}`),
      api.get(`/products/${route.params.id}/related`),
      api.get('/delivery-rates/provinces').catch(() => ({ provinces: [] }))
    ]).then(([p, r, prov]) => {
      setProduct(p);
      setRelated(r.products || []);
      setProvinces(prov.provinces || []);
      api.get('/favorites').then((result) => setFavorite((result.favorites || []).some((item) => item.product?.id === p.id))).catch(() => setFavorite(false));
    }).catch(() => {});
  }, [route.params.id]);

  const stockByProvince = product?.stock_by_province && typeof product.stock_by_province === 'object'
    ? product.stock_by_province
    : null;
  const hasProvinceStock = stockByProvince && Object.keys(stockByProvince).length > 0;
  const selectedProvinceStock = viewerProvince && hasProvinceStock ? stockByProvince[viewerProvince] : null;
  const maxAvailable = hasProvinceStock && viewerProvince ? Number(selectedProvinceStock || 0) : Number(product?.stock_quantity || 0);

  const add = async () => {
    setBusy(true);
    try {
      await api.post('/cart/items', { productId: product.id, quantity: qty });
      Alert.alert('تمت الإضافة', 'أضيف المنتج إلى السلة');
    } catch (e) {
      Alert.alert('تعذر الإضافة', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (favorite) await api.delete(`/favorites/${product.id}`);
      else await api.post(`/favorites/${product.id}`);
      setFavorite(!favorite);
    } catch (e) {
      Alert.alert('تحتاج لتسجيل الدخول', errorText(e));
    }
  };

  const sendReport = async () => {
    if (report.trim().length < 2) return Alert.alert('سبب مطلوب', 'اكتب سبباً واضحاً للبلاغ.');
    try {
      await api.post(`/products/${product.id}/report`, { reason: report.trim() });
      setReport('');
      Alert.alert('تم البلاغ', 'تم إرسال البلاغ لفريق المراجعة');
    } catch (e) {
      Alert.alert('تعذر الإرسال', errorText(e));
    }
  };

  if (!product) return <View style={s.screen}><Text style={s.muted}>جارٍ تحميل المنتج...</Text></View>;

  const sellerContact = product.metadata?.seller_contact;
  const isPersonal = Boolean(product.merchant?.is_personal_seller || sellerContact);
  const contactName = sellerContact?.name || product.merchant?.company_name;
  const contactPhone = sellerContact?.phone || product.merchant?.phone || (isPersonal ? product.metadata?.sellerPhone : null);
  const contactWhatsapp = sellerContact?.whatsapp || product.merchant?.whatsapp || (isPersonal ? product.metadata?.sellerWhatsapp : null);

  const callSeller = () => contactPhone && Linking.openURL(`tel:${cleanPhone(contactPhone)}`);
  const chatSeller = () => contactWhatsapp && Linking.openURL(`https://wa.me/${cleanPhone(contactWhatsapp).replace('+', '')}`);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Pressable onPress={() => navigation.goBack()}><Text style={s.link}>‹ العودة إلى المنتجات</Text></Pressable>
      {imageOf(product) ? (
        <Image source={{ uri: imageOf(product) }} style={s.heroImage} />
      ) : (
        <View style={s.heroPlaceholder}><BrandMark size={82} light /></View>
      )}
      <View style={s.chips}>
        <View style={[s.chip, s.chipStatic]}>
          <Text style={s.badgeText}>{product.condition === 'new' ? 'منتج جديد' : 'منتج مستعمل'}</Text>
        </View>
      </View>
      <Text style={s.title}>{product.name}</Text>
      {product.name_en ? <Text style={s.nameEnLarge}>{product.name_en}</Text> : null}
      <Text style={s.muted}>{product.merchant?.company_name || 'منتج موثوق'}</Text>
      <Text style={s.bigPrice}>{money(product.price, product.currency)}</Text>
      <Text style={s.body}>{product.description || 'لا يوجد وصف إضافي.'}</Text>

      <View style={s.info}>
        <Text>التصنيف: {product.category || '—'}</Text>
        <Text>المخزون الإجمالي: {product.stock_quantity || 0} قطعة</Text>
        <Text>رمز المنتج: {product.code || '—'}</Text>
        <Text style={product.delivery_inside_province !== false ? s.ok : s.danger}>
          التوصيل داخل نفس المحافظة: {product.delivery_inside_province !== false ? 'متاح ✓' : 'غير متاح ✗'}
        </Text>
        <Text style={product.delivery_outside_province !== false ? s.ok : s.danger}>
          التوصيل خارج المحافظة: {product.delivery_outside_province !== false ? 'متاح ✓' : 'غير متاح ✗'}
        </Text>
      </View>

      <View style={s.info}>
        <Text style={s.label}>تحقق من توفر المنتج في محافظتك (فروع المركز):</Text>
        <ScrollView horizontal contentContainerStyle={s.chips}>
          {[['', 'كل الفروع'], ...provinces.map((p) => [p.name, p.name])].map(([v, t]) => (
            <Pressable key={v} onPress={() => setViewerProvince(v)} style={[s.chip, viewerProvince === v && s.chipActive]}>
              <Text>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {hasProvinceStock && viewerProvince ? (
          <Text style={[s.bold, selectedProvinceStock > 0 ? s.ok : s.danger]}>
            {selectedProvinceStock > 0
              ? `المتوفر في فرع ${viewerProvince}: ${selectedProvinceStock} قطعة`
              : `غير متوفر حالياً في فرع ${viewerProvince}`}
          </Text>
        ) : null}
        {hasProvinceStock ? (
          <View style={s.branchBox}>
            <Text style={s.muted}>مخزون الفروع:</Text>
            <View style={s.branchList}>
              {Object.entries(stockByProvince).map(([pname, qty]) => (
                <Text key={pname} style={s.branchChip}>{pname}: {qty}</Text>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {isPersonal && (contactPhone || contactWhatsapp) ? (
        <View style={s.sellerBox}>
          <Text style={s.sellerTitle}>بيانات التواصل مع البائع (حساب شخصي)</Text>
          {contactName ? <Text style={s.sellerName}>الاسم: {contactName}</Text> : null}
          <View style={s.sellerBtns}>
            {contactPhone ? <Btn small title={`اتصال: ${contactPhone}`} onPress={callSeller} /> : null}
            {contactWhatsapp ? <Btn small title={`واتساب: ${contactWhatsapp}`} secondary onPress={chatSeller} /> : null}
          </View>
          <Text style={s.sellerHint}>يمكنك التواصل مباشرة للاستفسار أو المعاينة، وتُحدَّث هذه البيانات من حساب البائع في أي وقت.</Text>
        </View>
      ) : null}

      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'إزالة من المفضلة' : 'أضف للمفضلة'} onPress={toggleFavorite} style={s.favoriteButton}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? '#dc2626' : C.primary} />
        </Pressable>
        <Btn title="−" secondary onPress={() => setQty(Math.max(1, qty - 1))} />
        <Text style={s.qty}>{qty}</Text>
        <Btn title="＋" secondary disabled={qty >= maxAvailable} onPress={() => setQty((current) => Math.min(maxAvailable, current + 1))} />
      </View>
      <Btn title={busy ? 'جارٍ الإضافة...' : 'أضف إلى السلة'} onPress={add} disabled={busy || maxAvailable < 1} />

      <Text style={s.section}>إبلاغ عن المنتج</Text>
      <Field label="سبب البلاغ" value={report} onChangeText={setReport} multiline placeholder="اكتب سبب البلاغ" />
      <Btn title="إرسال البلاغ" danger secondary onPress={sendReport} disabled={!report.trim()} />

      <Text style={s.section}>منتجات مشابهة</Text>
      {related.map((p) => (
        <ProductCard key={p.id} product={p} onPress={() => navigation.push('Product', { id: p.id })} />
      ))}
    </ScrollView>
  );
}

export function CommerceCart({ navigation }) {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/cart').then(setCart).catch(() => {}).finally(() => setLoading(false));
  };

  useFocusEffect(React.useCallback(() => { load(); }, []));

  const update = async (id, quantity) => {
    try {
      await api.patch(`/cart/${id}`, { quantity });
      load();
    } catch (e) {
      Alert.alert('تعذر التحديث', errorText(e));
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/cart/${id}`);
      load();
    } catch (e) {
      Alert.alert('تعذر الحذف', errorText(e));
    }
  };

  const items = cart.items || [];
  const total = items.reduce((sum, i) => sum + Number(i.unit_price || i.product?.price || 0) * i.quantity, 0);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.logoRow}><BrandMark size={34} light /><Text style={s.logoText}>TopDent</Text></View>
        <Text style={s.title}>سلة الشراء</Text>
        {loading ? (
          <Text style={s.muted}>جارٍ تحميل السلة...</Text>
        ) : items.length ? (
          <>
            {items.map((i) => (
              <View key={i.id} style={s.card}>
                <View style={s.row}>
                  {imageOf(i.product) ? (
                    <Image source={{ uri: imageOf(i.product) }} style={s.thumb} />
                  ) : (
                    <View style={s.thumbPlaceholder}><BrandMark size={50} light /></View>
                  )}
                  <View style={s.flex}>
                    <Text style={s.cardTitle}>{i.product?.name}</Text>
                    <Text style={s.price}>{money(i.unit_price || i.product?.price, i.currency || i.product?.currency)}</Text>
                    <View style={s.row}>
                      <Btn title="−" secondary onPress={() => i.quantity <= 1 ? remove(i.id) : update(i.id, i.quantity - 1)} />
                      <Text style={s.qty}>{i.quantity}</Text>
                      <Btn title="＋" secondary onPress={() => update(i.id, i.quantity + 1)} />
                    </View>
                    <Pressable onPress={() => remove(i.id)}><Text style={[s.muted, s.danger]}>حذف</Text></Pressable>
                  </View>
                </View>
              </View>
            ))}
            <View style={s.summary}>
              <Text style={s.bigPrice}>المجموع: {money(total)}</Text>
              <Btn title="متابعة إلى إتمام الطلب" onPress={() => navigation.navigate('Checkout')} />
            </View>
          </>
        ) : (
          <Text style={s.empty}>السلة فارغة.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export function CommerceCheckout({ navigation }) {
  const [provinces, setProvinces] = useState([]);
  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerWhatsapp: '',
    province: '',
    area: '',
    address: '',
    universityClinic: '',
    deliverySpeed: 'normal',
    deliveryTimeSlot: '',
    paymentMethod: 'cash_on_delivery',
    paymentProvider: '',
    paymentReference: '',
    paymentReceiptUrl: '',
    discountCode: '',
    notes: '',
    acceptsReturnPolicy: false
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/delivery-rates/provinces').then((r) => setProvinces(r.provinces || [])).catch(() => {});
    api.get('/cart').then((r) => setItems(r.items || []));
    api.get('/users/me').then((u) =>
      setForm((f) => ({
        ...f,
        customerName: u.full_name || '',
        customerPhone: u.phone || '',
        customerWhatsapp: u.whatsapp || '',
        province: u.province || '',
        area: u.area || '',
        address: u.address || '',
        universityClinic: u.university_clinic || ''
      }))
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (!items.length || !form.province) return setQuote(null);
    const t = setTimeout(
      () =>
        api
          .post('/orders/quote', {
            items: items.map((i) => ({ productId: i.product?.id || i.product_id, quantity: i.quantity })),
            deliverySpeed: form.deliverySpeed,
            province: form.province,
            discountCode: form.discountCode || undefined
          })
          .then(setQuote)
          .catch(() => setQuote(null)),
      400
    );
    return () => clearTimeout(t);
  }, [items, form.province, form.deliverySpeed, form.discountCode]);

  const submit = async () => {
    if (form.customerName.trim().length < 6) return Alert.alert('بيانات ناقصة', 'أدخل الاسم الكامل (6 محارف على الأقل).');
    if (!form.customerPhone.trim()) return Alert.alert('بيانات ناقصة', 'رقم الهاتف مطلوب للتوصيل.');
    if (!form.province) return Alert.alert('بيانات ناقصة', 'اختر المحافظة للتوصيل.');
    if (form.area.trim().length < 2) return Alert.alert('بيانات ناقصة', 'أدخل المنطقة أو الحي.');
    if (form.address.trim().length < 5) return Alert.alert('بيانات ناقصة', 'أدخل عنواناً تفصيلياً مناسباً للتوصيل.');
    if (form.deliverySpeed === 'very_urgent' && !form.deliveryTimeSlot.trim()) return Alert.alert('بيانات ناقصة', 'حدد وقت التوصيل الفوري أو اختر سرعة أخرى.');
    if (form.paymentMethod === 'external_transfer' && (!form.paymentProvider.trim() || !form.paymentReference.trim())) return Alert.alert('بيانات ناقصة', 'أدخل مزود التحويل ورقم العملية.');
    if (!form.acceptsReturnPolicy) return Alert.alert('الموافقة مطلوبة', 'وافق على سياسة الضمان والإرجاع قبل تأكيد الطلب.');
    if (!quote) return Alert.alert('جارٍ تجهيز الفاتورة', 'انتظر لحظات حتى يتم حساب التوصيل والإجمالي ثم أعد المحاولة.');
    setBusy(true);
    try {
      const r = await api.post('/orders', {
        ...form,
        items: items.map((i) => ({ productId: i.product?.id || i.product_id, quantity: i.quantity })),
        discountCode: form.discountCode || undefined
      });
      Alert.alert('تم إنشاء الطلب', r.message || 'تم إنشاء طلبك بنجاح', [
        { text: 'عرض الطلبات', onPress: () => navigation.navigate('Dashboard') }
      ]);
    } catch (e) {
      Alert.alert('تعذر إنشاء الطلب', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={s.logoRow}><BrandMark size={34} light /><Text style={s.logoText}>TopDent</Text></View>
      <Text style={s.title}>إتمام الطلب</Text>
      <Text style={s.section}>بيانات الاستلام</Text>
      <Field label="الاسم الثلاثي" value={form.customerName} onChangeText={(v) => setForm({ ...form, customerName: v })} />
      <Field label="رقم الهاتف" value={form.customerPhone} onChangeText={(v) => setForm({ ...form, customerPhone: v })} keyboardType="phone-pad" />
      <Field label="رقم واتساب (اختياري)" value={form.customerWhatsapp} onChangeText={(v) => setForm({ ...form, customerWhatsapp: v })} keyboardType="phone-pad" />
      <Text style={s.label}>المحافظة</Text>
      <ScrollView horizontal contentContainerStyle={s.chips}>
        {provinces.map((p) => (
          <Pressable key={p.id} onPress={() => setForm({ ...form, province: p.name })} style={[s.chip, form.province === p.name && s.chipActive]}>
            <Text>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Field label="المنطقة" value={form.area} onChangeText={(v) => setForm({ ...form, area: v })} />
      <Field label="العنوان التفصيلي" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline />
      <Field label="الجامعة أو العيادة (اختياري)" value={form.universityClinic} onChangeText={(v) => setForm({ ...form, universityClinic: v })} />
      <Text style={s.section}>التوصيل والدفع</Text>
      <View style={s.chips}>
        {[['normal', 'عادي'], ['urgent', 'سريع'], ['very_urgent', 'فوري']].map(([v, t]) => (
          <Pressable key={v} onPress={() => setForm({ ...form, deliverySpeed: v })} style={[s.chip, form.deliverySpeed === v && s.chipActive]}>
            <Text>{t}</Text>
          </Pressable>
        ))}
      </View>
      {form.deliverySpeed === 'very_urgent' ? <Field label="وقت التوصيل الفوري" value={form.deliveryTimeSlot} onChangeText={(v) => setForm({ ...form, deliveryTimeSlot: v })} placeholder="مثال: اليوم 4:00 مساءً" /> : null}
      <View style={s.chips}>
        {[['cash_on_delivery', 'الدفع عند التسليم'], ['external_transfer', 'تحويل خارجي']].map(([v, t]) => (
          <Pressable key={v} onPress={() => setForm({ ...form, paymentMethod: v })} style={[s.chip, form.paymentMethod === v && s.chipActive]}>
            <Text>{t}</Text>
          </Pressable>
        ))}
      </View>
      {form.paymentMethod === 'external_transfer' && (
        <>
          <Field label="مزود التحويل" value={form.paymentProvider} onChangeText={(v) => setForm({ ...form, paymentProvider: v })} />
          <Field label="رقم العملية" value={form.paymentReference} onChangeText={(v) => setForm({ ...form, paymentReference: v })} />
        </>
      )}
      <Field label="رمز الخصم (اختياري)" value={form.discountCode} onChangeText={(v) => setForm({ ...form, discountCode: v })} />
      <Field label="ملاحظات (اختياري)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
      <Pressable onPress={() => setForm({ ...form, acceptsReturnPolicy: !form.acceptsReturnPolicy })} style={s.check}>
        <Text>{form.acceptsReturnPolicy ? '☑' : '☐'} أوافق على سياسة الضمان والإرجاع وحفظ بيانات الطلب</Text>
      </Pressable>

      <Text style={s.section}>مراجعة عناصر الطلب ومخزون الفرع</Text>
      {items.map((i) => {
        const prod = i.product;
        const provStock = form.province && prod?.stock_by_province && typeof prod.stock_by_province === 'object'
          ? prod.stock_by_province[form.province]
          : null;
        return (
          <View key={i.id} style={s.card}>
            <Text style={s.cardTitle}>{prod?.name}</Text>
            <Text style={s.muted}>{i.quantity} × {money(i.unit_price || prod?.price, i.currency || prod?.currency)}</Text>
            {provStock !== null && provStock !== undefined ? (
              <Text style={[s.provStock, provStock >= i.quantity ? s.ok : s.danger]}>
                المتوفر في فرع {form.province}: {provStock} قطعة
              </Text>
            ) : null}
          </View>
        );
      })}

      {quote && (
        <View style={s.summary}>
          <Text>المجموع الفرعي: {money(quote.subtotal)}</Text>
          <Text>الخصم: - {money(quote.discountAmount)}</Text>
          <Text>التوصيل: {money(quote.deliveryCost)}</Text>
          <Text style={s.bigPrice}>الإجمالي: {money(quote.total)}</Text>
        </View>
      )}
      {!quote && form.province ? <Text style={s.muted}>جارٍ حساب الفاتورة والتوصيل… يمكنك الضغط على الزر بعد ظهور الإجمالي.</Text> : null}
      <Btn title={busy ? 'جارٍ تأكيد الطلب...' : 'تأكيد الطلب'} onPress={submit} disabled={busy} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, paddingBottom: 45 },
  logoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  logoText: { color: C.primary, fontSize: 18, fontWeight: '900', textAlign: 'right', marginBottom: 8 },
  title: { color: C.ink, fontSize: 28, fontWeight: '900', textAlign: 'right' },
  nameEn: { color: C.muted, fontSize: 13, textAlign: 'right', writingDirection: 'ltr' },
  nameEnLarge: { color: C.muted, fontSize: 15, textAlign: 'right', writingDirection: 'ltr', marginTop: -4, marginBottom: 4 },
  subtitle: { color: C.muted, textAlign: 'right', marginBottom: 16 },
  section: { color: C.ink, fontSize: 20, fontWeight: '900', textAlign: 'right', marginTop: 18, marginBottom: 10 },
  field: { marginBottom: 12 },
  label: { color: C.ink, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: C.ink, textAlign: 'right' },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  card: { backgroundColor: C.card, borderRadius: 17, padding: 15, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  thumb: { width: 80, height: 80, borderRadius: 12 },
  thumbPlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  logo: { color: C.primary, fontSize: 22, fontWeight: '900' },
  cardTitle: { color: C.ink, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  muted: { color: C.muted, fontSize: 13, textAlign: 'right', marginTop: 5 },
  bold: { fontWeight: '900', textAlign: 'right', marginTop: 8 },
  price: { color: C.dark, fontSize: 16, fontWeight: '900', textAlign: 'right', marginTop: 7 },
  bigPrice: { color: C.dark, fontSize: 22, fontWeight: '900', textAlign: 'right', marginVertical: 12 },
  body: { color: '#475569', lineHeight: 25, textAlign: 'right', marginTop: 12 },
  link: { color: C.primary, fontWeight: '900', textAlign: 'right', marginVertical: 12 },
  heroImage: { width: '100%', height: 260, borderRadius: 18, backgroundColor: '#fff', resizeMode: 'contain', marginVertical: 14 },
  heroPlaceholder: { height: 220, borderRadius: 18, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  info: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, marginTop: 14 },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  favoriteButton: { minWidth: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10, alignItems: 'center' },
  btnSmall: { paddingHorizontal: 10, paddingVertical: 8 },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.primary },
  danger: { color: C.danger, borderColor: '#fecaca', borderWidth: 1 },
  ok: { color: C.ok },
  btnText: { color: '#fff', fontWeight: '900' },
  btnSmallText: { fontSize: 12 },
  secondaryText: { color: C.primary },
  dangerText: { color: C.danger },
  disabled: { opacity: 0.5 },
  qty: { color: C.ink, fontSize: 18, fontWeight: '900', paddingHorizontal: 10 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 20 },
  chipStatic: { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' },
  chipActive: { backgroundColor: '#dbeafe', borderColor: C.primary },
  sortRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  empty: { textAlign: 'center', color: C.muted, paddingVertical: 35 },
  check: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginVertical: 12 },
  summary: { backgroundColor: '#fff', borderRadius: 14, padding: 15, gap: 10 },
  badgeText: { color: C.primary, fontSize: 12, fontWeight: '900' },
  multiBadge: { color: C.primary, fontSize: 11, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  branchBox: { marginTop: 8 },
  branchList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  branchChip: { fontSize: 12, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, color: C.ink },
  sellerBox: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, gap: 8, marginTop: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  sellerTitle: { color: C.primary, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  sellerName: { color: C.ink, fontSize: 13, textAlign: 'right' },
  sellerBtns: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  sellerHint: { color: C.muted, fontSize: 11, textAlign: 'right', lineHeight: 18 },
  provStock: { fontSize: 12, fontWeight: '900', textAlign: 'right', marginTop: 6 }
});
