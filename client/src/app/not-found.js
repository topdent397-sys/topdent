import Link from 'next/link';
import { FiArrowLeft, FiHome, FiSearch } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-secondary-50 px-4 py-16">
      <div className="max-w-xl text-center">
        <p className="text-8xl font-black tracking-tighter text-primary-100">404</p>
        <h1 className="mt-3 text-3xl font-black text-secondary-900">الصفحة غير موجودة</h1>
        <p className="mt-4 leading-7 text-secondary-600">قد يكون الرابط قديمًا أو تم نقل الصفحة. اختر أحد المسارات للمتابعة.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary"><FiHome className="ml-2" />الصفحة الرئيسية</Link>
          <Link href="/products" className="btn-secondary"><FiSearch className="ml-2" />تصفح المنتجات</Link>
          <Link href="/offers" className="btn-outline"><FiArrowLeft className="ml-2" />العروض</Link>
        </div>
      </div>
    </div>
  );
}
