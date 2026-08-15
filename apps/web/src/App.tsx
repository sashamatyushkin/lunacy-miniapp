import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Button, ErrorState, Spinner } from './components/ui';
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

function Boot({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="grid h-full place-items-center px-8">
      {error ? (
        <div className="w-full max-w-[300px]">
          <ErrorState message={error} />
          <Button variant="ghost" onClick={onRetry}>
            попробовать снова
          </Button>
        </div>
      ) : (
        <SixSeven />
      )}
    </div>
  );
}

export default function App() {
  const { status, error, login } = useSession();
  const { pathname } = useLocation();

  useEffect(() => {
    const stop = syncSafeArea();
    login();
    track('app_open', { platform: tg?.platform ?? 'browser' });
    // Hide the pre-React splash once the shell is mounted.
    document.getElementById('boot')?.classList.add('hide');
    setTimeout(() => document.getElementById('boot')?.remove(), 400);
    return stop;
  }, [login]);

  // Telegram's own back gesture already handles history; scroll reset is on us.
  useEffect(() => {
    document.querySelector('.scroll-y')?.scrollTo({ top: 0 });
  }, [pathname]);

  if (status !== 'ready') {
    return <Boot error={status === 'error' ? error : null} onRetry={login} />;
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
