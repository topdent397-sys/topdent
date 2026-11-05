'use client';
import RequireAuth from '@/components/RequireAuth';
import ProductForm from '@/components/ProductForm';

export default function SellPage() {
  return (
    <RequireAuth role="customer">
      <div className="min-h-screen bg-secondary-50 py-8">
        <div className="container-main">
          <div className="max-w-3xl rounded-2xl bg-white p-6 shadow-card sm:p-8">
            <p className="text-sm font-bold text-primary-700">البيع الشخصي · حسابك الشخصي</p>
            <h1 className="mt-2 text-3xl font-black">اعرض منتجك للبيع (جديد أو مستعمل)</h1>
            <p className="mt-3 leading-7 text-secondary-600">
              يمكنك كحساب شخصي عرض أدواتك الجديدة أو المستعملة. تراجع الإدارة كل منتج قبل نشره، وتظهر بيانات التواصل معك تلقائياً ليتواصل معك المشتري مباشرة عبر الهاتف أو الواتساب، كما يمكنك تعديلها في أي وقت.
            </p>
            <div className="mt-8">
              <ProductForm endpoint="/users/listings" isPersonalSeller allowConditionChoice />
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
