import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Spinner } from './components/ui';
import { SixSeven } from './components/SixSeven';
import { useSession } from './store/session';
import { syncSafeArea, tg } from './lib/telegram';
import { track } from './lib/analytics';
import Feed from './screens/Feed';

// Only the feed is in the initial bundle; the rest arrives on navigation.
const Catalog = lazy(() => import('./screens/Catalog'));
const ProductScreen = lazy(() => import('./screens/ProductScreen'));
const Cart = lazy(() => import('./screens/Cart'));
const Checkout = lazy(() => import('./screens/Checkout'));
const OrderScreen = lazy(() => import('./screens/OrderScreen'));
const Profile = lazy(() => import('./screens/Profile'));

function Fallback() {
  return (
    <div className="grid h-full place-items-center text-[var(--color-muted)]">
      <Spinner />
    </div>
  );
}

/** Заставка: качающиеся руки и брендовая надпись, держим 2.5с при запуске. */
function Boot() {
  return (
    <div className="boot-screen grid h-full place-items-center px-8">
      <div className="flex flex-col items-center">
        <div className="boot-hands">
          <SixSeven />
        </div>
        <div className="boot-title">
          <span className="boot-title-67">six seven</span>
          <span className="boot-title-x">×</span>
          <span className="boot-title-lun">lunacy</span>
        </div>
        <div className="boot-bar">
          <span />
        </div>
      </div>
      <style>{`
        .boot-screen { background: var(--color-bg); animation: boot-fade 0.4s ease; }
        .boot-hands { animation: boot-rise 0.7s var(--ease-out-expo) both; }
        .boot-title {
          margin-top: 26px;
          display: flex;
          align-items: baseline;
          gap: 10px;
          animation: boot-rise 0.7s var(--ease-out-expo) 0.15s both;
        }
        .boot-title-67 {
          font-size: 22px; font-weight: 700; letter-spacing: -0.03em; color: #f4f4f4;
        }
        .boot-title-x { font-size: 16px; color: var(--color-muted); }
        .boot-title-lun {
          font-size: 22px; font-weight: 700; letter-spacing: 0.02em; color: #f4f4f4;
          text-transform: lowercase;
        }
        .boot-bar {
          margin-top: 22px; width: 132px; height: 2px; border-radius: 2px;
          background: #242424; overflow: hidden;
        }
        .boot-bar span {
          display: block; height: 100%; width: 40%; border-radius: 2px;
          background: linear-gradient(90deg, transparent, #f4f4f4, transparent);
          animation: boot-sweep 1.15s ease-in-out infinite;
        }
        @keyframes boot-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes boot-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes boot-sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(330%); } }
      `}</style>
    </div>
  );
}

const SPLASH_MS = 2600;

export default function App() {
  const { status, login } = useSession();
  const { pathname } = useLocation();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const stop = syncSafeArea();
    login();
    track('app_open', { platform: tg?.platform ?? 'browser' });
    // держим руки на экране 2.5–3с, потом плавно показываем магазин
    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    // прячем pre-React заставку из index.html — дальше рисует React
    document.getElementById('boot')?.classList.add('hide');
    setTimeout(() => document.getElementById('boot')?.remove(), 400);
    return () => {
      stop();
      clearTimeout(t);
    };
  }, [login]);

  // Telegram's own back gesture already handles history; scroll reset is on us.
  useEffect(() => {
    document.querySelector('.scroll-y')?.scrollTo({ top: 0 });
  }, [pathname]);

  if (status !== 'ready' || !splashDone) {
    return <Boot />;
  }

  const showNav = !/^\/(checkout|order)\b/.test(pathname);

  return (
    <div className="h-full">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductScreen />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderScreen />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {showNav && <BottomNav />}
    </div>
  );
}
