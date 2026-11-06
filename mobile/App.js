import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, I18nManager, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NavigationContainer, useFocusEffect, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import api, { errorText } from './src/api';
import { colors, shadow } from './src/theme';
import { DashboardScreen, DentalCardScreen, Favorites, ForgotPassword, MerchantRegister, MoreMenu, NotificationsScreen, OfferDetail, Offers, ProfileScreen, RentalsScreen } from './src/expandedScreens';
import { InvoiceDetail, OperationsScreen } from './src/operationsScreens';
import { CommerceCart, CommerceCheckout, CommerceProduct, CommerceProducts } from './src/commerceScreens';
import { AdminFormsScreen } from './src/adminScreens';
import { AdvancedAdminScreen } from './src/advancedAdminScreens';
import { AssignDriverScreen, OrderDetailScreen, ProductEditScreen, RoleAssignmentScreen } from './src/coreAdminScreens';
import { AuthScreen, MerchantRegisterScreen } from './src/authScreens';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const money = (value) => `${Number(value || 0).toLocaleString('ar-SY')} ل.س`;
const imageOf = (item) => {
  const source = Array.isArray(item?.images) ? item.images.find((entry) => entry?.is_primary) || item.images[0] : item?.images;
  if (typeof source === 'string') return source;
  return source?.image_url || source?.imageUrl || source?.url || item?.image_url || item?.imageUrl || item?.url || null;
};

function Button({ title, onPress, secondary = false, danger = false, disabled = false }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text></Pressable>; }
function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default', multiline = false }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.textarea]} /></View>; }
function Card({ children, onPress }) { return <Pressable onPress={onPress} style={styles.card}>{children}</Pressable>; }
function Empty({ text }) { return <View style={styles.empty}><Text style={styles.muted}>{text}</Text></View>; }
function Header({ title, subtitle }) { return <View style={styles.header}><Text style={styles.brand}>TopDent</Text><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>; }

function ProductCard({ product, onPress }) { return <Card onPress={onPress}><View style={styles.productRow}>{imageOf(product) ? <Image source={{ uri: imageOf(product) }} style={styles.productImage} /> : <View style={styles.productPlaceholder}><Text style={styles.placeholderText}>TD</Text></View>}<View style={styles.productInfo}><Text style={styles.productName} numberOfLines={2}>{product.name}</Text><Text style={styles.muted} numberOfLines={1}>{product.company_name || product.merchant?.company_name || 'منتج أسنان'}</Text><Text style={styles.price}>{money(product.price)}</Text><Text style={styles.stock}>{product.stock_quantity > 0 ? `متوفر • ${product.stock_quantity}` : 'غير متوفر'}</Text></View></View></Card>; }

function Home({ navigation }) {
  const [featured, setFeatured] = useState([]);
  const [banners, setBanners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    setRefreshing(true);
    try {
      const [r, b, o] = await Promise.all([
        api.get('/products?limit=8&status=approved'),
        api.get('/catalog/banners').catch(() => ({ banners: [] })),
        api.get('/catalog/offers?limit=8').catch(() => ({ offers: [] }))
      ]);
      setFeatured(r.products || []);
      setBanners(b.banners || []);
      setOffers(o.offers || []);
    } catch {} finally {
      setRefreshing(false);
    }
  };
  useFocusEffect(React.useCallback(() => { load(); }, []));
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBannerIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);
  const active = banners[bannerIndex];
  const openBanner = (bn) => {
    if (!bn) return;
    if (bn.offer_id) return navigation.navigate('OfferDetail', { id: bn.offer_id });
    if (bn.product_id) return navigation.navigate('Product', { id: bn.product_id });
    const u = bn.link_url || '';
    if (u.startsWith('http')) return Linking.openURL(u);
    const mOffer = u.match(/^\/offers\/([^/?#]+)/);
    if (mOffer) return navigation.navigate('OfferDetail', { id: mOffer[1] });
    const mProd = u.match(/^\/products\/([^/?#]+)/);
    if (mProd) return navigation.navigate('Product', { id: mProd[1] });
    return navigation.navigate('Offers');
  };
  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Header title="منصة طب الأسنان" subtitle="سوق موثوق للشراء والبيع والاستئجار" />
      {offers.length > 0 ? (
        <View style={styles.ticker}>
          <Text style={styles.tickerBadge}>العروض النشطة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerScroll}>
            {offers.map((o) => (
              <Pressable key={o.id} onPress={() => navigation.navigate('OfferDetail', { id: o.id })} style={styles.tickerItem}>
                <Text style={styles.tickerText}>{o.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {active ? (
        <Pressable onPress={() => openBanner(active)} style={styles.banner}>
          <Image source={{ uri: active.image_url }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>{active.title || 'عرض خاص'}</Text>
            <Text style={styles.bannerSub}>اضغط للانتقال إلى العرض ‹</Text>
          </View>
        </Pressable>
      ) : null}
      {banners.length > 1 ? (
        <View style={styles.bannerDots}>
          {banners.map((b, i) => (
            <Pressable key={b.id || i} onPress={() => setBannerIndex(i)} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
          ))}
        </View>
      ) : null}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>كل ما تحتاجه عيادتك</Text>
        <Text style={styles.heroTitle}>منتجات أصلية وخدمات موثوقة</Text>
        <Text style={styles.heroText}>تصفح المنتجات من شركات وأطباء موثوقين، واعرض منتجاتك للبيع بكل سهولة.</Text>
        <Button title="تصفح المنتجات" onPress={() => navigation.navigate('Products')} />
      </View>
      <View style={styles.quickGrid}>
        <Card onPress={() => navigation.navigate('Sell')}><Text style={styles.quickIcon}>＋</Text><Text style={styles.quickTitle}>اعرض منتجك للبيع</Text><Text style={styles.muted}>جديد أو مستعمل</Text></Card>
        <Card onPress={() => navigation.navigate('Offers')}><Text style={styles.quickIcon}>★</Text><Text style={styles.quickTitle}>العروض والخصومات</Text><Text style={styles.muted}>شاهد كل العروض</Text></Card>
      </View>
      <View style={styles.quickGrid}>
        <Card onPress={() => navigation.navigate('Rentals')}><Text style={styles.quickIcon}>↔</Text><Text style={styles.quickTitle}>الاستئجار</Text><Text style={styles.muted}>معدات وطلبات إيجار</Text></Card>
        <Card onPress={() => navigation.navigate('DentalCard')}><Text style={styles.quickIcon}>✍</Text><Text style={styles.quickTitle}>تصميم كرت طبيب</Text><Text style={styles.muted}>اطلب تصميمك</Text></Card>
      </View>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>منتجات مميزة</Text>
        <Pressable onPress={() => navigation.navigate('Products')}><Text style={styles.link}>عرض الكل</Text></Pressable>
      </View>
      {featured.length ? featured.map((p) => <ProductCard key={p.id} product={p} onPress={() => navigation.navigate('Product', { id: p.id })} />) : <Empty text="لا توجد منتجات حالياً" />}
    </ScrollView>
  );
}

function Products({ navigation }) { const [products, setProducts] = useState([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(false); const load = async () => { setLoading(true); try { const q = search ? `&search=${encodeURIComponent(search)}` : ''; const r = await api.get(`/products?limit=50${q}`); setProducts(r.products || []); } catch { setProducts([]); } finally { setLoading(false); } }; useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [search]); return <View style={styles.screen}><Header title="المنتجات" subtitle="ابحث وقارن واشترِ بثقة" /><View style={styles.search}><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن منتج أو شركة" placeholderTextColor={colors.muted} style={styles.searchInput} /><Text style={styles.searchIcon}>⌕</Text></View>{loading ? <Empty text="جارٍ تحميل المنتجات…" /> : products.length ? <FlatList data={products} keyExtractor={(item) => item.id} renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item.id })} />} contentContainerStyle={styles.list} /> : <Empty text="لم يتم العثور على منتجات" />}</View>; }

function Product({ route, navigation }) { const [product, setProduct] = useState(null); const [qty, setQty] = useState(1); const [busy, setBusy] = useState(false); useEffect(() => { api.get(`/products/${route.params.id}`).then(setProduct).catch(() => Alert.alert('خطأ', 'تعذر تحميل المنتج')); }, [route.params.id]); const add = async () => { setBusy(true); try { await api.post('/cart/items', { productId: product.id, quantity: qty }); Alert.alert('تمت الإضافة', 'تمت إضافة المنتج إلى السلة'); } catch (e) { Alert.alert('تعذر الإضافة', errorText(e)); } finally { setBusy(false); } }; if (!product) return <Empty text="جارٍ تحميل المنتج…" />; return <ScrollView style={styles.screen}><Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹ العودة</Text></Pressable>{imageOf(product) ? <Image source={{ uri: imageOf(product) }} style={styles.detailImage} /> : <View style={styles.detailPlaceholder}><Text style={styles.placeholderText}>TopDent</Text></View>}<Text style={styles.detailTitle}>{product.name}</Text><Text style={styles.muted}>{product.company_name || 'منتج موثوق'}</Text><Text style={styles.detailPrice}>{money(product.price)}</Text><Text style={styles.description}>{product.description || 'منتج متخصص لاحتياجات طب الأسنان.'}</Text><View style={styles.quantity}><Text style={styles.label}>الكمية</Text><View style={styles.quantityRow}><Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={styles.qty}><Text>−</Text></Pressable><Text style={styles.qtyValue}>{qty}</Text><Pressable onPress={() => setQty(qty + 1)} style={styles.qty}><Text>＋</Text></Pressable></View></View><Button title={busy ? 'جارٍ الإضافة…' : 'أضف إلى السلة'} onPress={add} disabled={busy || !product.stock_quantity} /><Button title="الشراء الآن" secondary onPress={() => { add(); navigation.navigate('Cart'); }} /></ScrollView>; }

function Auth({ onLogin }) { const [mode, setMode] = useState('login'); const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' }); const [busy, setBusy] = useState(false); const submit = async () => { setBusy(true); try { const r = mode === 'login' ? await api.post('/auth/login', { email: form.email, password: form.password }) : await api.post('/auth/register', form); await AsyncStorage.multiSet([['token', r.token], ['user', JSON.stringify(r.user)]]); onLogin(r.user); } catch (e) { Alert.alert('تعذر المتابعة', errorText(e)); } finally { setBusy(false); } }; return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Header title={mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'} subtitle="حساب واحد لكل مشترياتك وطلباتك" />{mode === 'register' && <Field label="الاسم الكامل" value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} /> }<Field label="البريد الإلكتروني" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" /><Field label="كلمة المرور" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />{mode === 'register' && <Field label="رقم الهاتف" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" /> }<Button title={busy ? 'جارٍ المعالجة…' : mode === 'login' ? 'دخول آمن' : 'إنشاء الحساب'} onPress={submit} disabled={busy} /><Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.switch}><Text style={styles.link}>{mode === 'login' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب؟ سجّل الدخول'}</Text></Pressable></KeyboardAvoidingView>; }

function Cart({ navigation }) { const [cart, setCart] = useState({ items: [] }); const [loading, setLoading] = useState(true); const load = async () => { try { setCart(await api.get('/cart')); } catch {} finally { setLoading(false); } }; useFocusEffect(React.useCallback(() => { load(); }, [])); const remove = async (id) => { await api.delete(`/cart/items/${id}`); load(); }; if (loading) return <Empty text="جارٍ تحميل السلة…" />; return <ScrollView style={styles.screen}><Header title="سلة المشتريات" subtitle={`${cart.items?.length || 0} منتجات`} />{cart.items?.length ? cart.items.map((item) => <Card key={item.id}><View style={styles.cartRow}><View style={{ flex: 1 }}><Text style={styles.productName}>{item.product?.name || item.name}</Text><Text style={styles.price}>{money(item.product?.price || item.price)}</Text><Text style={styles.muted}>الكمية: {item.quantity}</Text></View><Button title="حذف" danger secondary onPress={() => remove(item.id)} /></View></Card>) : <Empty text="السلة فارغة" />}{cart.items?.length ? <><Text style={styles.total}>الإجمالي: {money(cart.total)}</Text><Button title="متابعة إلى الدفع" onPress={() => navigation.navigate('Checkout')} /></> : null}</ScrollView>; }

function Checkout({ navigation }) { const [form, setForm] = useState({ customerName: '', customerPhone: '', province: '', area: '', address: '', deliverySpeed: 'normal', paymentProvider: 'cash' }); const [busy, setBusy] = useState(false); const submit = async () => { setBusy(true); try { const cart = await api.get('/cart'); await api.post('/orders', { ...form, items: cart.items.map((i) => ({ productId: i.product?.id || i.product_id, quantity: i.quantity })), paymentProvider: form.paymentProvider }); Alert.alert('تم الطلب', 'تم إنشاء طلبك بنجاح', [{ text: 'عرض الطلبات', onPress: () => navigation.navigate('Account') }]); } catch (e) { Alert.alert('تعذر إنشاء الطلب', errorText(e)); } finally { setBusy(false); } }; return <ScrollView style={styles.screen}><Header title="إتمام الطلب" subtitle="بيانات التوصيل والدفع" /><Field label="الاسم" value={form.customerName} onChangeText={(v) => setForm({ ...form, customerName: v })} /><Field label="الهاتف" value={form.customerPhone} onChangeText={(v) => setForm({ ...form, customerPhone: v })} keyboardType="phone-pad" /><Field label="المحافظة" value={form.province} onChangeText={(v) => setForm({ ...form, province: v })} /><Field label="المنطقة" value={form.area} onChangeText={(v) => setForm({ ...form, area: v })} /><Field label="العنوان بالتفصيل" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} multiline /><Text style={styles.label}>سرعة التوصيل</Text><View style={styles.chips}>{['normal', 'urgent', 'very_urgent'].map((v) => <Pressable key={v} onPress={() => setForm({ ...form, deliverySpeed: v })} style={[styles.chip, form.deliverySpeed === v && styles.chipActive]}><Text>{v === 'normal' ? 'عادي' : v === 'urgent' ? 'مستعجل' : 'مستعجل جداً'}</Text></Pressable>)}</View><Button title={busy ? 'جارٍ إنشاء الطلب…' : 'تأكيد الطلب'} onPress={submit} disabled={busy} /></ScrollView>; }

function Sell({ navigation }) {
  const [form, setForm] = useState({ name: '', nameEn: '', category: '', price: '', stockQuantity: '1', description: '', condition: 'new', deliveryInsideProvince: true, deliveryOutsideProvince: true, sellerProvince: '', deliveryCostByProvince: {}, sellerName: '', sellerPhone: '', sellerWhatsapp: '', usageDurationMonths: '', defects: '', sellerDeclaration: false, platformFeeAccepted: false, images: [] });
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [isCustomer, setIsCustomer] = useState(true);
  const [useProvinceStock, setUseProvinceStock] = useState(false);
  const [provinceStock, setProvinceStock] = useState({});
  useEffect(() => {
    api.get('/catalog/categories').then((r) => setCategories(r.categories || [])).catch(() => {});
    api.get('/delivery-rates/provinces').then((r) => setProvinces(r.provinces || [])).catch(() => {});
    api.get('/users/me').then((u) => {
      setIsCustomer(!u.role || u.role === 'customer' || Boolean(u.is_personal_seller));
      setForm((f) => ({ ...f, sellerName: u.full_name || '', sellerPhone: u.phone || '', sellerWhatsapp: u.whatsapp || '' }));
    }).catch(() => {});
  }, []);
  const onProvinceStockChange = (pname, val) => {
    const next = { ...provinceStock, [pname]: Math.max(0, Number(val) || 0) };
    if (Number(val) === 0) delete next[pname];
    setProvinceStock(next);
    setForm((f) => ({ ...f, stockQuantity: String(Object.values(next).reduce((a, b) => a + b, 0)) }));
  };
  const onDeliveryCostChange = (pname, val) => {
    const next = { ...form.deliveryCostByProvince };
    if (val === '') delete next[pname]; else next[pname] = Math.max(0, Number(val) || 0);
    setForm((current) => ({ ...current, deliveryCostByProvince: next }));
  };
  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('الصلاحية مطلوبة', 'اسمح للتطبيق بالوصول إلى الصور');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
    if (!r.canceled) setForm({ ...form, images: [...form.images, ...r.assets.map((a) => a.uri)] });
  };
  const submit = async () => {
    if (!form.name.trim()) return Alert.alert('بيانات ناقصة', 'اسم المنتج مطلوب');
    if (!form.price || Number(form.price) <= 0) return Alert.alert('بيانات ناقصة', 'السعر مطلوب');
    if (form.description.trim().length < 10) return Alert.alert('بيانات ناقصة', 'الوصف لا يقل عن 10 محارف');
    if (form.images.length < 2) return Alert.alert('بيانات ناقصة', 'أضف صورتين على الأقل');
    if (form.condition === 'used' && !form.sellerDeclaration) return Alert.alert('بيانات ناقصة', 'يجب إقرار صحة وصف المنتج');
    if (form.condition === 'used' && !form.platformFeeAccepted) return Alert.alert('بيانات ناقصة', 'يجب الموافقة على شروط ورسوم المنصة');
    setBusy(true);
    try {
      const uploaded = [];
      for (const uri of form.images) {
        const body = new FormData();
        body.append('files', { uri, name: `topdent-${Date.now()}.jpg`, type: 'image/jpeg' });
        const result = await api.post('/upload/images', body, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploaded.push(...(result.files || []).map((item) => item.url));
      }
      const endpoint = isCustomer ? '/users/listings' : '/products';
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn?.trim() || null,
        category: form.category || categories[0]?.name || 'عام',
        price: Number(form.price),
        currency: 'SYP',
        stockQuantity: Number(form.stockQuantity),
        description: form.description.trim(),
        condition: form.condition,
        deliverySameProvince: form.deliveryInsideProvince,
        shippingOtherProvince: form.deliveryOutsideProvince,
        deliveryInsideProvince: form.deliveryInsideProvince,
        deliveryOutsideProvince: form.deliveryOutsideProvince,
        sellerProvince: form.sellerProvince || undefined,
        deliveryCostByProvince: form.deliveryCostByProvince,
        usageDurationMonths: form.condition === 'used' ? (form.usageDurationMonths === '' ? 0 : Number(form.usageDurationMonths)) : null,
        defects: form.condition === 'used' ? form.defects || null : null,
        sellerDeclaration: form.sellerDeclaration,
        platformFeeAccepted: form.platformFeeAccepted,
        images: uploaded,
        stockByProvince: useProvinceStock ? provinceStock : undefined,
        sellerProvinces: useProvinceStock ? Object.keys(provinceStock) : undefined,
        sellerName: form.sellerName || undefined,
        sellerPhone: form.sellerPhone || undefined,
        sellerWhatsapp: form.sellerWhatsapp || undefined
      };
      const res = await api.post(endpoint, payload);
      Alert.alert('تم الإرسال', res.message || 'تم إرسال المنتج للمراجعة');
      navigation.goBack();
    } catch (e) {
      Alert.alert('تعذر الإرسال', errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView style={styles.screen}>
      <Header title="اعرض منتجك للبيع" subtitle={isCustomer ? 'بيع شخصي · منتجات جديدة أو مستعملة' : 'أضف منتج شركتك ليصل إلى المشترين'} />
      <View style={styles.field}><Text style={styles.label}>اسم المنتج (بالعربية)</Text><TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="مثال: جهاز تصليب ضوئي" placeholderTextColor={colors.muted} style={styles.input} /></View>
      <View style={styles.field}><Text style={styles.label}>اسم المنتج بالإنكليزية (اختياري)</Text><TextInput value={form.nameEn} onChangeText={(v) => setForm({ ...form, nameEn: v })} placeholder="e.g. Cordless LED Curing Light" placeholderTextColor={colors.muted} style={styles.input} /></View>
      <Text style={styles.label}>الحالة</Text>
      <View style={styles.chips}>
        {[['new', 'جديد'], ['used', 'مستعمل']].map(([v, t]) => (
          <Pressable key={v} onPress={() => setForm({ ...form, condition: v })} style={[styles.chip, form.condition === v && styles.chipActive]}><Text style={styles.chipText}>{t}</Text></Pressable>
        ))}
      </View>
      <Text style={styles.label}>التصنيف</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((c) => (
          <Pressable key={c.id} onPress={() => setForm({ ...form, category: c.name })} style={[styles.chip, form.category === c.name && styles.chipActive]}><Text style={styles.chipText}>{c.name}</Text></Pressable>
        ))}
      </ScrollView>
      <Field label="السعر (ل.س)" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="numeric" placeholder="مثال: 450000" />
      <Field label="الكمية الإجمالية" value={form.stockQuantity} onChangeText={(v) => setForm({ ...form, stockQuantity: v })} keyboardType="numeric" />
      <Field label="الوصف والتفاصيل" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline placeholder="اكتب وصفاً لا يقل عن 10 محارف" />

      <Text style={styles.label}>خيارات التوصيل</Text>
      <Pressable onPress={() => setForm({ ...form, deliveryInsideProvince: !form.deliveryInsideProvince })} style={styles.check}>
        <Text style={styles.checkText}>{form.deliveryInsideProvince ? '☑' : '☐'} التوصيل متاح داخل نفس المحافظة</Text>
      </Pressable>
      <Pressable onPress={() => setForm({ ...form, deliveryOutsideProvince: !form.deliveryOutsideProvince })} style={styles.check}>
        <Text style={styles.checkText}>{form.deliveryOutsideProvince ? '☑' : '☐'} التوصيل متاح خارج المحافظة</Text>
      </Pressable>
      <Field label="محافظة البائع" value={form.sellerProvince} onChangeText={(v) => setForm({ ...form, sellerProvince: v })} placeholder="اكتب المحافظة الرئيسية" />
      <Text style={styles.label}>تكلفة التوصيل حسب المحافظة (اختياري)</Text>
      <Text style={styles.muted}>اترك الحقول فارغة لاستخدام تعرفة الشركة أو TopDent.</Text>
      <View style={styles.fieldGrid}>
        {provinces.map((p) => <View key={`delivery-${p.id}`} style={styles.miniField}><Text style={styles.miniLabel}>{p.name}</Text><TextInput keyboardType="numeric" placeholder="افتراضي" placeholderTextColor={colors.muted} value={form.deliveryCostByProvince[p.name] !== undefined ? String(form.deliveryCostByProvince[p.name]) : ''} onChangeText={(v) => onDeliveryCostChange(p.name, v)} style={styles.miniInput} /></View>)}
      </View>

      <Text style={styles.label}>المخزون حسب المحافظات (في حال وجود فروع)</Text>
      <Pressable onPress={() => setUseProvinceStock(!useProvinceStock)} style={styles.check}>
        <Text style={styles.checkText}>{useProvinceStock ? '☑' : '☐'} تحديد الكمية لكل محافظة على حدة</Text>
      </Pressable>
      {useProvinceStock ? (
        <View style={styles.fieldGrid}>
          {provinces.map((p) => (
            <View key={p.id} style={styles.miniField}>
              <Text style={styles.miniLabel}>{p.name}</Text>
              <TextInput keyboardType="numeric" placeholder="0" placeholderTextColor={colors.muted} value={provinceStock[p.name] !== undefined ? String(provinceStock[p.name]) : ''} onChangeText={(v) => onProvinceStockChange(p.name, v)} style={styles.miniInput} />
            </View>
          ))}
        </View>
      ) : null}

      {isCustomer ? (
        <View style={styles.sellerPanel}>
          <Text style={styles.sellerPanelTitle}>بيانات التواصل معك (تظهر للمشتري مباشرة للتواصل عبر الهاتف أو الواتساب، ويمكن تعديلها في أي وقت)</Text>
          <Field label="اسم البائع" value={form.sellerName} onChangeText={(v) => setForm({ ...form, sellerName: v })} placeholder="اسمك الظاهر للمشتري" />
          <Field label="رقم الهاتف" value={form.sellerPhone} onChangeText={(v) => setForm({ ...form, sellerPhone: v })} keyboardType="phone-pad" placeholder="09xxxxxxxx" />
          <Field label="رقم واتساب" value={form.sellerWhatsapp} onChangeText={(v) => setForm({ ...form, sellerWhatsapp: v })} keyboardType="phone-pad" placeholder="09xxxxxxxx" />
        </View>
      ) : null}

      {form.condition === 'used' ? (
        <View style={styles.sellerPanel}>
          <Text style={styles.sellerPanelTitle}>بيانات المنتج المستعمل</Text>
          <Field label="مدة الاستخدام بالأشهر" value={form.usageDurationMonths} onChangeText={(v) => setForm({ ...form, usageDurationMonths: v })} keyboardType="numeric" placeholder="مثال: 6" />
          <Field label="الأعطال والعيوب بالتفصيل" value={form.defects} onChangeText={(v) => setForm({ ...form, defects: v })} multiline placeholder="اكتب لا يوجد إن لم تكن هناك عيوب" />
          <Pressable onPress={() => setForm({ ...form, sellerDeclaration: !form.sellerDeclaration })} style={styles.check}>
            <Text style={styles.checkText}>{form.sellerDeclaration ? '☑' : '☐'} أقر بأن الصور والوصف مطابقان لحالة المنتج.</Text>
          </Pressable>
          <Pressable onPress={() => setForm({ ...form, platformFeeAccepted: !form.platformFeeAccepted })} style={styles.check}>
            <Text style={styles.checkText}>{form.platformFeeAccepted ? '☑' : '☐'} أوافق على شروط ورسوم المنصة الخاصة بالعرض.</Text>
          </Pressable>
        </View>
      ) : null}

      <Button title={`اختيار الصور (${form.images.length}) — مطلوب صورتان على الأقل`} secondary onPress={pick} />
      <Button title={busy ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'} onPress={submit} disabled={busy} />
    </ScrollView>
  );
}

function Rentals() { return <ScrollView style={styles.screen}><Header title="الاستئجار" subtitle="معدات وأدوات متاحة للإيجار" /><Empty text="طلبات الإيجار متاحة من خلال حسابك. سيتم تحميل العروض من الخادم عند نشرها." /></ScrollView>; }
function Notifications() { const [items, setItems] = useState([]); useFocusEffect(React.useCallback(() => { api.get('/users/notifications?limit=100').then((r) => setItems(r.notifications || [])).catch(() => {}); }, [])); return <ScrollView style={styles.screen}><Header title="الإشعارات" />{items.length ? items.map((n) => <Card key={n.id}><Text style={styles.productName}>{n.title}</Text><Text style={styles.description}>{n.message}</Text></Card>) : <Empty text="لا توجد إشعارات" />}</ScrollView>; }

function Dashboard({ user }) { const [data, setData] = useState(null); const [loading, setLoading] = useState(true); useFocusEffect(React.useCallback(() => { const url = user?.role === 'customer' ? '/orders/customer/my-orders' : '/platform/dashboard'; api.get(url).then(setData).catch(() => {}).finally(() => setLoading(false)); }, [user?.role])); return <ScrollView style={styles.screen}><Header title="لوحة التحكم" subtitle={user?.fullName || user?.email} />{loading ? <Empty text="جارٍ تحميل بيانات لوحتك…" /> : <><View style={styles.stats}><Card><Text style={styles.statValue}>{data?.orders?.length || data?.stats?.orders || 0}</Text><Text style={styles.muted}>الطلبات</Text></Card><Card><Text style={styles.statValue}>{data?.products?.length || data?.stats?.products || 0}</Text><Text style={styles.muted}>المنتجات</Text></Card></View><Text style={styles.sectionTitle}>صلاحياتك ودورك</Text><Card><Text style={styles.productName}>{user?.role || 'customer'}</Text><Text style={styles.muted}>{(user?.roles || []).join(' • ') || 'حساب عميل'}</Text><Text style={styles.description}>تُطبّق صلاحيات API نفسها الموجودة في الموقع، وتظهر لك العمليات المسموحة حسب دورك ونطاقك.</Text></Card></>}</ScrollView>; }

function Account({ user, logout, navigation }) { return <ScrollView style={styles.screen}><Header title="حسابي" subtitle={user ? user.fullName || user.email : 'سجّل الدخول للاستفادة من كامل الميزات'} />{user ? <><Card><Text style={styles.productName}>{user.fullName || user.email}</Text><Text style={styles.muted}>{user.email}</Text><Text style={styles.muted}>{user.role || 'customer'}</Text></Card><Button title="لوحة التحكم" onPress={() => navigation.navigate('Dashboard')} /><Button title="الإشعارات" secondary onPress={() => navigation.navigate('Notifications')} /><Button title="تسجيل الخروج" danger secondary onPress={logout} /></> : <Button title="تسجيل الدخول أو إنشاء حساب" onPress={() => navigation.navigate('Auth')} />}</ScrollView>; }

function MainTabs({ user, logout }) { const tabIcon = (glyph) => ({ focused, color }) => <Text style={{ color: focused ? colors.primary : color, fontSize: 20, fontWeight: '800' }}>{glyph}</Text>; return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarLabelStyle: { fontFamily: Platform.select({ android: 'sans-serif', ios: 'System' }), fontSize: 12 }, tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 } }}><Tabs.Screen name="Home" component={Home} options={{ title: 'الرئيسية', tabBarIcon: tabIcon('⌂') }} /><Tabs.Screen name="Products" component={CommerceProducts} options={{ title: 'المنتجات', tabBarIcon: tabIcon('▦') }} /><Tabs.Screen name="Cart" component={CommerceCart} options={{ title: 'السلة', tabBarIcon: tabIcon('🛒') }} /><Tabs.Screen name="More" options={{ title: 'المزيد', tabBarIcon: tabIcon('☰') }}>{(props) => <MoreMenu {...props} user={user} />}</Tabs.Screen><Tabs.Screen name="Account" options={{ title: 'حسابي', tabBarIcon: tabIcon('♙') }}>{(props) => <Account {...props} user={user} logout={logout} />}</Tabs.Screen></Tabs.Navigator>; }

function App() { const [user, setUser] = useState(null); const [ready, setReady] = useState(false); useEffect(() => { AsyncStorage.getItem('user').then((raw) => raw && setUser(JSON.parse(raw))).finally(() => setReady(true)); }, []); const logout = async () => { await AsyncStorage.multiRemove(['token', 'user']); setUser(null); }; if (!ready) return <View style={styles.loading}><Text style={styles.brand}>TopDent</Text><Text style={styles.muted}>جارٍ التحضير…</Text></View>; return <NavigationContainer><StatusBar style="light" backgroundColor={colors.primaryDark} /><Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Main">{() => <MainTabs user={user} logout={logout} />}</Stack.Screen><Stack.Screen name="Auth">{({ navigation }) => <AuthScreen navigation={navigation} onLogin={(u) => { setUser(u); navigation.goBack(); }} />}</Stack.Screen><Stack.Screen name="Product" component={CommerceProduct} /><Stack.Screen name="Checkout" component={CommerceCheckout} /><Stack.Screen name="Sell" component={Sell} /><Stack.Screen name="Rentals" component={RentalsScreen} /><Stack.Screen name="Notifications" component={NotificationsScreen} /><Stack.Screen name="Dashboard">{({ navigation }) => <DashboardScreen user={user} navigation={navigation} />}</Stack.Screen><Stack.Screen name="Operations">{({ navigation, route }) => <OperationsScreen user={user} navigation={navigation} route={route} />}</Stack.Screen><Stack.Screen name="AdminForms" component={AdminFormsScreen} /><Stack.Screen name="AdvancedAdmin" component={AdvancedAdminScreen} /><Stack.Screen name="OrderDetail" component={OrderDetailScreen} /><Stack.Screen name="AssignDriver" component={AssignDriverScreen} /><Stack.Screen name="ProductEdit" component={ProductEditScreen} /><Stack.Screen name="RoleAssignment" component={RoleAssignmentScreen} /><Stack.Screen name="InvoiceDetail" component={InvoiceDetail} /><Stack.Screen name="Favorites" component={Favorites} /><Stack.Screen name="Offers" component={Offers} /><Stack.Screen name="OfferDetail" component={OfferDetail} /><Stack.Screen name="DentalCard" component={DentalCardScreen} /><Stack.Screen name="Profile">{({ navigation }) => <ProfileScreen onLogout={logout} navigation={navigation} />}</Stack.Screen><Stack.Screen name="ForgotPassword" component={ForgotPassword} /><Stack.Screen name="MerchantRegister" component={MerchantRegisterScreen} /></Stack.Navigator></NavigationContainer>; }

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, brand: { color: colors.primary, fontSize: 30, fontWeight: '900', marginBottom: 5 }, header: { paddingTop: 22, paddingBottom: 18 }, title: { color: colors.ink, fontSize: 26, fontWeight: '900', textAlign: 'right' }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 5, textAlign: 'right' }, hero: { backgroundColor: colors.primary, borderRadius: 24, padding: 22, marginBottom: 22, ...shadow }, heroKicker: { color: '#dbeafe', fontWeight: '700', textAlign: 'right' }, heroTitle: { color: '#fff', fontSize: 25, fontWeight: '900', marginVertical: 8, textAlign: 'right' }, heroText: { color: '#dbeafe', lineHeight: 23, textAlign: 'right', marginBottom: 16 }, button: { backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', marginTop: 12 }, buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary }, buttonDanger: { borderColor: '#fecaca' }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' }, buttonSecondaryText: { color: colors.primary }, disabled: { opacity: 0.5 }, sectionHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginVertical: 14, textAlign: 'right' }, link: { color: colors.primary, fontWeight: '800' }, card: { backgroundColor: colors.card, borderRadius: 17, padding: 14, marginBottom: 12, ...shadow }, productRow: { flexDirection: 'row-reverse', alignItems: 'center' }, productImage: { width: 90, height: 90, borderRadius: 13, backgroundColor: colors.bg }, productPlaceholder: { width: 90, height: 90, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' }, placeholderText: { color: colors.primary, fontSize: 22, fontWeight: '900' }, productInfo: { flex: 1, marginRight: 13 }, productName: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'right' }, muted: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 4 }, price: { color: colors.primaryDark, fontSize: 16, fontWeight: '900', textAlign: 'right', marginTop: 7 }, stock: { color: colors.success, fontSize: 12, textAlign: 'right', marginTop: 4 }, quickGrid: { flexDirection: 'row-reverse', marginVertical: 6 }, quickIcon: { color: colors.primary, fontSize: 28, textAlign: 'right' }, quickTitle: { color: colors.ink, fontWeight: '900', textAlign: 'right', marginTop: 6 }, search: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, marginBottom: 12 }, searchInput: { flex: 1, color: colors.ink, textAlign: 'right', paddingVertical: 13 }, searchIcon: { color: colors.primary, fontSize: 26, marginLeft: 9 }, list: { paddingBottom: 20 }, empty: { alignItems: 'center', justifyContent: 'center', padding: 35 }, field: { marginBottom: 13 }, label: { color: colors.ink, fontWeight: '800', textAlign: 'right', marginBottom: 6 }, input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, textAlign: 'right', fontSize: 15 }, textarea: { minHeight: 100, textAlignVertical: 'top' }, switch: { alignItems: 'center', padding: 18 }, back: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 12 }, detailImage: { width: '100%', height: 270, borderRadius: 20, backgroundColor: '#fff', resizeMode: 'contain' }, detailPlaceholder: { width: '100%', height: 220, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }, detailTitle: { color: colors.ink, fontSize: 26, fontWeight: '900', textAlign: 'right', marginTop: 18 }, detailPrice: { color: colors.primaryDark, fontSize: 22, fontWeight: '900', textAlign: 'right', marginVertical: 13 }, description: { color: '#475569', lineHeight: 25, textAlign: 'right', marginTop: 10 }, quantity: { marginTop: 18, alignItems: 'flex-end' }, quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 }, qty: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, qtyValue: { paddingHorizontal: 18, fontWeight: '900', color: colors.ink }, cartRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, total: { color: colors.primaryDark, fontSize: 20, fontWeight: '900', textAlign: 'right', marginVertical: 12 }, chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginVertical: 8 }, chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }, chipActive: { borderColor: colors.primary, backgroundColor: '#dbeafe' }, stats: { flexDirection: 'row-reverse', gap: 12 }, statValue: { color: colors.primary, fontSize: 28, fontWeight: '900', textAlign: 'right' },
  ticker: { backgroundColor: '#fef3c7', borderRadius: 14, padding: 10, marginBottom: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  tickerBadge: { backgroundColor: colors.primary, color: '#fff', fontSize: 11, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  tickerScroll: { flexDirection: 'row-reverse', gap: 14, alignItems: 'center' },
  tickerItem: { paddingHorizontal: 6 },
  tickerText: { color: '#78350f', fontWeight: '900', fontSize: 12 },
  banner: { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 6, backgroundColor: colors.primary },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: 'rgba(15,23,42,0.65)' },
  bannerTitle: { color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'right' },
  bannerSub: { color: '#dbeafe', fontSize: 12, textAlign: 'right', marginTop: 3 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 },
  bannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  bannerDotActive: { width: 22, backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.ink, fontWeight: '700' },
  check: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginVertical: 6, borderWidth: 1, borderColor: colors.border },
  checkText: { textAlign: 'right', color: colors.ink, fontWeight: '700', lineHeight: 22 },
  fieldGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  miniField: { width: '31%', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 6, alignItems: 'center' },
  miniLabel: { fontSize: 11, fontWeight: '800', color: colors.muted },
  miniInput: { width: '100%', textAlign: 'center', fontWeight: '900', color: colors.ink, fontSize: 15, paddingVertical: 2 },
  sellerPanel: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  sellerPanelTitle: { color: colors.primary, fontWeight: '900', textAlign: 'right', fontSize: 13, lineHeight: 20, marginBottom: 4 }
});

export default App;
