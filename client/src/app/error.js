'use client';

import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function GlobalError({ reset }) {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-secondary-50 px-4 py-16">
      <div className="surface max-w-lg p-8 text-center sm:p-12">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-3xl text-red-600"><FiAlertTriangle /></div>
        <h1 className="mt-6 text-2xl font-black">حدث خطأ غير متوقع</h1>
        <p className="mt-3 leading-7 text-secondary-600">لم نتمكن من تحميل هذه الصفحة. جرّب إعادة المحاولة، وإذا استمرت المشكلة تواصل مع الدعم.</p>
        <button type="button" onClick={() => reset()} className="btn-primary mt-7"><FiRefreshCw className="ml-2" />إعادة المحاولة</button>
      </div>
    </div>
  );
}
