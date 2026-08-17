import { NavLink, useLocation } from 'react-router-dom';
import { haptic } from '../lib/telegram';
import { useCart } from '../store/cart';

const items = [
  { to: '/', label: 'лента', icon: 'M3 12h18M3 6h18M3 18h18' },
  { to: '/catalog', label: 'каталог', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { to: '/cart', label: 'корзина', icon: 'M4 5h2l2.2 10.2A2 2 0 0 0 10.2 17h7.4a2 2 0 0 0 2-1.6L21 8H7' },
  { to: '/profile', label: 'профиль', icon: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const cart = useCart();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-line)] bg-[var(--color-nav)]/95 backdrop-blur-md"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="flex h-[62px] items-stretch">
        {items.map((it) => {
          const active = it.to === '/' ? pathname === '/' : pathname.startsWith(it.to);
          return (
            <NavLink
              key={it.to}
              to={it.to}
              onClick={() => haptic.select()}
              className="relative flex flex-1 flex-col items-center justify-center gap-1"
            >
              <span className="relative" {...(it.to === '/cart' ? { 'data-cart-icon': '' } : {})}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" stroke={active ? 'var(--color-ink)' : 'var(--color-muted)'}>
                  <path d={it.icon} />
                </svg>
                {it.to === '/cart' && cart.count > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[9px] font-bold text-[var(--color-bg)]">
                    {cart.count}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] lowercase"
                style={{ color: active ? 'var(--color-ink)' : 'var(--color-muted)' }}
              >
                {it.label}
              </span>
              {active && <span className="absolute inset-x-5 top-0 h-[2px] bg-[var(--color-ink)]" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
