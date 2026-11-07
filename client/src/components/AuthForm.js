'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/format';
import { ProvinceSelect, UniversitySelect } from '@/components/CatalogSelects';
import { FiAward, FiBriefcase, FiEye, FiEyeOff, FiHome, FiLock, FiMail, FiMapPin, FiMessageCircle, FiPhone, FiUser } from 'react-icons/fi';

const initialAccount = {
  fullName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  phone: '',
  whatsapp: '',
  province: '',
  area: '',
  address: '',
  universityClinic: '',
  acceptTerms: false,
  acceptPrivacy: false
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizePhone(value) {
  return value.replace(/\D/g, '').slice(0, 25);
}

export default function AuthForm({ mode = 'login', role = 'customer' }) {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const isRegister = mode === 'register';
  const isMerchant = isRegister && role === 'merchant';
  const [account, setAccount] = useState(initialAccount);
  const [company, setCompany] = useState({ companyName: '', companyDescription: '', logoUrl: '', contactEmail: '', websiteUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const updateAccount = (event) => {
    const { name, type, value, checked } = event.target;
    let next = type === 'checkbox' ? checked : value;
    if (name === 'phone' || name === 'whatsapp') next = sanitizePhone(next);
    if (name === 'email') next = next.trim().toLowerCase();
    setAccount((current) => ({ ...current, [name]: next }));
  };
  const updateCompany = (event) => setCompany((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!EMAIL_RE.test(account.email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (isRegister && account.password !== account.passwordConfirmation) {
      setError('تأكيد كلمة المرور غير مطابق.');
      return;
    }
    if (isRegister && account.fullName.trim().split(/\s+/).length < 2) {
      setError('اكتب الاسم الكامل بشكل صحيح (اسمان على الأقل).');
      return;
    }
    setLoading(true);
    try {
      const cleanedAccount = {
        ...account,
        province: account.province?.trim() || null,
        area: account.area?.trim() || null,
        address: account.address?.trim() || null,
        universityClinic: account.universityClinic?.trim() || null
      };
      const response = isRegister
        ? await api.post(
            isMerchant ? '/auth/register-merchant' : '/auth/register',
            isMerchant
              ? {
                  account: cleanedAccount,
                  ...company,
                  logoUrl: company.logoUrl || null,
                  contactEmail: company.contactEmail || null,
                  websiteUrl: company.websiteUrl || null,
                  companyDescription: company.companyDescription || null
                }
              : cleanedAccount
          )
        : await api.post('/auth/login', { email: account.email, password: account.password });
      toast.success(response.message || 'تم تسجيل الدخول بنجاح');
      if (response.token) {
        login(response.user, response.token);
        router.push(search.get('next') || (isMerchant ? '/dashboard' : '/'));
      } else {
        router.push('/auth/login');
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const icons = {
    fullName: FiUser,
    email: FiMail,
    phone: FiPhone,
    whatsapp: FiMessageCircle,
    area: FiMapPin,
    address: FiHome,
    companyName: FiBriefcase
  };

  const field = (name, label, props = {}) => {
    const Icon = icons[name] || null;
    return (
      <label className="block text-sm font-medium text-secondary-800">
        <span className="mb-1.5 flex items-center gap-1.5">
          {Icon && <Icon className="text-primary-600" />}
          {label}
          {props.required !== false && <span className="text-red-600"> *</span>}
        </span>
        <input name={name} value={account[name] || ''} onChange={updateAccount} className="input-base" {...props} />
      </label>
    );
  };

  const passwordField = (name, label, visible, setVisible) => (
    <label className="block text-sm font-medium text-secondary-800">
      <span className="mb-1.5 flex items-center gap-1.5">
        <FiLock className="text-primary-600" />
        {label}
        <span className="text-red-600"> *</span>
      </span>
      <span className="relative block">
        <input
          name={name}
          value={account[name]}
          onChange={updateAccount}
          className="input-base pl-11"
          type={visible ? 'text' : 'password'}
          minLength={isRegister ? 8 : 1}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded p-1 text-secondary-500 hover:bg-secondary-100"
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          {visible ? <FiEyeOff /> : <FiEye />}
        </button>
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-secondary-50 px-4 py-12">
      <div className={`mx-auto rounded-2xl bg-white p-6 shadow-card sm:p-9 ${isRegister ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="mb-8 text-center">
          <p className="text-sm font-bold text-primary-700">TopDent</p>
          <h1 className="mt-2 text-3xl font-black">{isMerchant ? 'تسجيل شركة أو متجر' : isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h1>
          <p className="mt-2 text-secondary-600">{isMerchant ? 'سيُرسل طلبك إلى الإدارة للمراجعة قبل تفعيل الشركة.' : 'أهلاً بك في منصة أدوات طب الأسنان.'}</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          {isRegister ? (
            <>
              <section>
                <h2 className="mb-4 font-bold text-secondary-900">بيانات الحساب</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('fullName', 'الاسم الكامل', { minLength: 6, required: true })}
                  {field('email', 'البريد الإلكتروني', { type: 'email', required: true, inputMode: 'email', autoComplete: 'email' })}
                  {field('phone', 'رقم الهاتف', { type: 'tel', inputMode: 'tel', pattern: '[0-9]*', required: true })}
                  {field('whatsapp', 'رقم واتساب', { type: 'tel', inputMode: 'tel', pattern: '[0-9]*', required: false })}
                  <ProvinceSelect
                    label="المحافظة (اختياري)"
                    value={account.province}
                    onChange={(value) => setAccount((current) => ({ ...current, province: value, universityClinic: '' }))}
                  />
                  {field('area', 'المنطقة / مكان السكن (اختياري)', { required: false })}
                  <UniversitySelect
                    label="الجامعة أو العيادة"
                    value={account.universityClinic}
                    province={account.province}
                    onChange={(value) => setAccount((current) => ({ ...current, universityClinic: value }))}
                  />
                  {field('address', 'العنوان التفصيلي', { required: false })}
                  {passwordField('password', 'كلمة المرور', showPassword, setShowPassword)}
                  {passwordField('passwordConfirmation', 'تأكيد كلمة المرور', showPasswordConfirmation, setShowPasswordConfirmation)}
                </div>
                <p className="mt-3 text-xs text-secondary-500">يجب أن تتكون كلمة المرور من 8 محارف على الأقل، وأن يتطابق التأكيد معها.</p>
              </section>
              {isMerchant && (
                <section className="border-t border-secondary-100 pt-5">
                  <h2 className="mb-4 font-bold text-secondary-900">بيانات الشركة</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      <span className="mb-1.5 flex items-center gap-1.5"><FiBriefcase className="text-primary-600" />اسم الشركة <span className="text-red-600">*</span></span>
                      <input required minLength="2" name="companyName" value={company.companyName} onChange={updateCompany} className="input-base" />
                    </label>
                    <label className="block text-sm font-medium">
                      <span className="mb-1.5 flex items-center gap-1.5"><FiMail className="text-primary-600" />بريد التواصل</span>
                      <input type="email" name="contactEmail" value={company.contactEmail} onChange={updateCompany} className="input-base" />
                    </label>
                    <label className="block text-sm font-medium">
                      <span className="mb-1.5 block">رابط الشعار في التخزين</span>
                      <input type="url" name="logoUrl" value={company.logoUrl} onChange={updateCompany} className="input-base" />
                    </label>
                    <label className="block text-sm font-medium">
                      <span className="mb-1.5 block">الموقع الإلكتروني</span>
                      <input type="url" name="websiteUrl" value={company.websiteUrl} onChange={updateCompany} className="input-base" />
                    </label>
                  </div>
                  <label className="mt-4 block text-sm font-medium">
                    <span className="mb-1.5 block">وصف الشركة</span>
                    <textarea name="companyDescription" value={company.companyDescription} onChange={updateCompany} className="input-base min-h-28" />
                  </label>
                </section>
              )}
              <div className="space-y-3 rounded-xl bg-secondary-50 p-4 text-sm">
                <label className="flex items-start gap-3">
                  <input required name="acceptTerms" checked={account.acceptTerms} onChange={updateAccount} type="checkbox" className="mt-1" />
                  <span>أوافق على <Link href="/terms" className="font-bold text-primary-700">الشروط والأحكام</Link>.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input required name="acceptPrivacy" checked={account.acceptPrivacy} onChange={updateAccount} type="checkbox" className="mt-1" />
                  <span>أوافق على <Link href="/policy" className="font-bold text-primary-700">سياسة الخصوصية</Link>.</span>
                </label>
              </div>
            </>
          ) : (
            <>
              {field('email', 'البريد الإلكتروني', { type: 'email', required: true, inputMode: 'email', autoComplete: 'email' })}
              {passwordField('password', 'كلمة المرور', showPassword, setShowPassword)}
              <div className="text-left">
                <Link href="/auth/forgot-password" className="text-sm font-medium text-primary-700 hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
            </>
          )}
          <button disabled={loading} className="btn-primary w-full disabled:cursor-wait disabled:opacity-60">
            {loading ? 'جارٍ الحفظ...' : isMerchant ? 'إرسال طلب الشركة' : isRegister ? 'إنشاء الحساب' : 'دخول آمن'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-secondary-600">
          {isRegister ? 'لديك حساب؟ ' : 'ليس لديك حساب؟ '}
          <Link className="font-bold text-primary-700 hover:underline" href={isRegister ? '/auth/login' : '/auth/register'}>
            {isRegister ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </Link>
          {!isRegister && (
            <>
              <span className="mx-2">·</span>
              <Link className="font-bold text-primary-700 hover:underline" href="/merchant/register">
                تسجيل شركة
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
