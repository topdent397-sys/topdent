'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiHeart, FiShoppingBag, FiShoppingCart, FiUser } from 'react-icons/fi';
import { useCart } from '@/context/CartContext';

const items = [
  ['الرئيسية', '/', FiHome],
  ['المنتجات', '/products', FiShoppingBag],
  ['المفضلة', '/favorites', FiHeart],
  ['السلة', '/cart', FiShoppingCart],
  ['حسابي', '/profile', FiUser]
];

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-secondary-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur lg:hidden" aria-label="التنقل الرئيسي للهاتف">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 py-2">
        {items.map(([label, href, Icon]) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <Link key={href} href={href} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition ${active ? 'bg-primary-50 text-primary-700' : 'text-secondary-500 hover:bg-secondary-50'}`} aria-current={active ? 'page' : undefined}>
            <Icon className="text-lg" />
            <span>{label}</span>
            {href === '/cart' && itemCount > 0 && <span className="absolute right-1/2 top-0 grid h-4 min-w-4 translate-x-5 place-items-center rounded-full bg-primary-600 px-1 text-[9px] text-white">{itemCount > 9 ? '9+' : itemCount}</span>}
          </Link>;
        })}
      </div>
    </nav>
  );
}
