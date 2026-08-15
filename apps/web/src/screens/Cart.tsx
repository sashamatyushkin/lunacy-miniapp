import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { money } from '../lib/types';
import { Screen, ScreenHeader } from '../components/Screen';
import { ProductImage } from '../components/ProductCard';
import { Button, EmptyState } from '../components/ui';
import { cart, useCart } from '../store/cart';
import { useMainButton } from '../lib/tgHooks';
import { isTelegram } from '../lib/telegram';
import { track } from '../lib/analytics';

export default function Cart() {
  const navigate = useNavigate();
  const data = useCart();
  const empty = data.items.length === 0;

  useEffect(() => {
    track('cart_open');
  }, []);

  useMainButton({
    text: `оформить · ${money(data.total)}`,
    visible: !empty,
    onClick: () => navigate('/checkout'),
  });

  if (empty) {
    return (
      <Screen>
        <ScreenHeader title="корзина" />
        <EmptyState
          title="пока пусто"
          hint="6 или 7 девайсов — решать вам"
          action={
            <Link to="/catalog">
              <Button variant="ghost">в каталог</Button>
            </Link>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="корзина"
        right={
          <button className="text-[12px] lowercase text-[var(--color-muted)]" onClick={() => cart.clear()}>
            очистить
          </button>
        }
      />

      <div className="flex flex-col gap-2.5">
        {data.items.map((item) => (
          <div key={item.id} className="card flex gap-3 p-2.5">
            <Link
              to={`/product/${item.product.slug}`}
              className="h-[68px] w-[68px] shrink-0 overflow-hidden bg-[var(--color-surface)]"
            >
              <ProductImage product={item.product} className="h-full w-full" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="truncate text-[14px]">{item.product.title}</div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold">{money(item.product.price * item.qty)}</span>
                <div className="flex items-center gap-2">
                  <QtyButton label="−" onClick={() => cart.setQty(item.productId, item.qty - 1)} />
                  <span className="w-5 text-center text-[13px]">{item.qty}</span>
                  <QtyButton label="+" disabled={item.qty >= 99} onClick={() => cart.setQty(item.productId, item.qty + 1)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 flex items-center justify-between px-3.5 py-3">
        <span className="text-[13px] lowercase text-[var(--color-muted)]">итого</span>
        <span className="text-[18px] font-semibold">{money(data.total)}</span>
      </div>

      {!isTelegram && (
        <div className="mt-4">
          <Button onClick={() => navigate('/checkout')}>оформить · {money(data.total)}</Button>
        </div>
      )}
    </Screen>
  );
}

function QtyButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-[3px] border border-[var(--color-line)] bg-[var(--color-surface)] text-[15px] leading-none disabled:opacity-40"
    >
      {label}
    </button>
  );
}
