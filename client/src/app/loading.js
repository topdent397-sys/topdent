'use client';

export default function Loading() {
  return (
    <div className="min-h-[55vh] bg-secondary-50 py-12" role="status" aria-label="جارٍ التحميل">
      <div className="container-main">
        <div className="skeleton mb-8 h-10 w-56" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="surface overflow-hidden p-0">
              <div className="skeleton h-56 rounded-none" />
              <div className="space-y-3 p-5"><div className="skeleton h-5 w-4/5" /><div className="skeleton h-4 w-2/5" /><div className="skeleton h-10 w-full" /></div>
            </div>
          ))}
        </div>
        <span className="sr-only">جارٍ تحميل محتوى الصفحة</span>
      </div>
    </div>
  );
}
