import { Home, Grid2X2, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../context/useApp';

const items = [
  { id: 'home' as const, label: 'الرئيسية', icon: Home },
  { id: 'products' as const, label: 'الأقسام', icon: Grid2X2 },
  { id: 'cart' as const, label: 'السلة', icon: ShoppingCart },
  { id: 'account' as const, label: 'حسابي', icon: User },
];

export default function BottomNav() {
  const { currentPage, navigate, setIsCartOpen, cartCount } = useApp();

  return (
    <nav
      className="fixed bottom-0 right-0 left-0 z-40 bg-white/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-10px_30px_-24px_rgba(26,22,20,0.45)] sm:hidden pb-[var(--app-safe-bottom)]"
      aria-label="التنقل السفلي"
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id !== 'cart' && currentPage === item.id;
          const isCart = item.id === 'cart';

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isCart) {
                  setIsCartOpen(true);
                } else {
                  navigate(item.id);
                }
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[68px] flex flex-col items-center justify-center gap-1 py-2 relative transition-colors
                ${isActive ? 'text-brand' : 'text-muted hover:text-ink-soft'}
              `}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 right-1/2 translate-x-1/2 w-8 h-0.5 bg-brand rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
