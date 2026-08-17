import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../lib/data';
import { money, type Product } from '../lib/types';
import { Screen } from '../components/Screen';
import { ProductImage } from '../components/ProductCard';
import { Button, ErrorState, Section, Skeleton } from '../components/ui';
import { useBackButton, useMainButton } from '../lib/tgHooks';
import { isTelegram } from '../lib/telegram';
import { cart } from '../store/cart';
import { flyToCart } from '../lib/flyToCart';
import { track } from '../lib/analytics';

export default function ProductScreen() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  // Показываем «добавлено» на кнопке, НЕ уходя с карточки — клиент добирает сетап.
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useBackButton(() => navigate(-1));

  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProduct(slug),
  });

  const product = query.data?.product;

  useEffect(() => {
    if (product) track('product_open', { slug: product.slug, price: product.price });
  }, [product]);

  useEffect(() => () => { if (addedTimer.current) clearTimeout(addedTimer.current); }, []);

  const addToCart = (p?: Product, fromEl?: HTMLElement | null) => {
    const target = p ?? product;
    if (!target) return;
    flyToCart(fromEl ?? heroRef.current?.querySelector('img') ?? heroRef.current);
    cart.add(target, 1);
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1400);
  };

  useMainButton({
    text: product ? (added ? '✓ добавлено · ещё?' : `в корзину · ${money(product.price)}`) : 'загрузка',
    visible: Boolean(product?.inStock),
    active: true,
    onClick: () => addToCart(),
  });

  if (query.isLoading) {
    return (
      <Screen>
        <Skeleton className="mb-4 h-[320px] w-full" />
        <Skeleton className="mb-2 h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </Screen>
    );
  }

  if (query.isError || !product) {
    return (
      <Screen>
        <ErrorState message="товар не найден" onRetry={() => navigate('/catalog')} />
      </Screen>
    );
  }

  const specs = Object.entries(product.specs ?? {});

  return (
    <Screen>
      <div
        ref={heroRef}
        className="card relative mb-4 aspect-square w-full overflow-hidden"
        style={{ ['--glow' as string]: product.accent ?? '#9b9b9b' }}
      >
        {/* мягкое свечение акцентного цвета — товар «оживает» */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 42%, var(--glow) 0%, transparent 62%)', opacity: 0.28 }}
        />
        <ProductImage product={product} className="relative h-full w-full" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] normal-case">{product.title}</h1>
          {product.subtitle && <div className="mt-1 text-[12px] text-[var(--color-muted)]">{product.subtitle}</div>}
        </div>
        <div className="text-right">
          <div className="tnum text-[22px] font-bold">{money(product.price)}</div>
          {product.oldPrice && (
            <div className="text-[12px] text-[var(--color-muted)] line-through">{money(product.oldPrice)}</div>
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <span className="chip">{product.category.title}</span>
        <span className="chip" data-active={product.inStock}>
          {product.inStock ? 'в наличии' : 'нет в наличии'}
        </span>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-soft)]">{product.description}</p>

      {specs.length > 0 && (
        <Section title="характеристики">
          <div className="card divide-y divide-[var(--color-line)]">
            {specs.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3.5 py-2.5 text-[13px]">
                <span className="lowercase text-[var(--color-muted)]">{k}</span>
                <span className="text-[var(--color-ink)]">{String(v)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Вне Telegram нет MainButton — CTA живёт на странице и остаётся тут же. */}
      {!isTelegram && product.inStock && (
        <div className="mt-6">
          <Button onClick={() => addToCart()}>
            {added ? '✓ добавлено · ещё?' : `в корзину · ${money(product.price)}`}
          </Button>
        </div>
      )}

      {query.data!.related.length > 0 && (
        <Section title="собери сетап">
          <p className="-mt-1 mb-3 text-[12px] text-[var(--color-muted)]">
            по одному из каждой категории — добери набор в один тап
          </p>
          <div className="flex flex-col gap-2.5">
            {query.data!.related.map((p) => (
              <SetupRow key={p.id} product={p} onAdd={(el) => addToCart(p, el)} />
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}

function SetupRow({ product, onAdd }: { product: Product; onAdd: (el: HTMLElement | null) => void }) {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const imgRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="card flex items-center gap-3 p-2.5">
      <button
        ref={imgRef}
        onClick={() => navigate(`/product/${product.slug}`)}
        className="h-[56px] w-[56px] shrink-0 overflow-hidden bg-[var(--color-surface)]"
      >
        <ProductImage product={product} className="h-full w-full" />
      </button>
      <button onClick={() => navigate(`/product/${product.slug}`)} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-[14px]">{product.title}</span>
        <span className="text-[11px] lowercase text-[var(--color-muted)]">{product.category.title}</span>
      </button>
      <div className="text-right">
        <div className="mb-1 text-[13px] font-semibold">{money(product.price)}</div>
        <button
          onClick={() => {
            onAdd(imgRef.current?.querySelector('img') ?? imgRef.current);
            setDone(true);
            setTimeout(() => setDone(false), 1200);
          }}
          className="rounded-[3px] border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-1 text-[12px] font-medium text-[var(--color-bg)] transition active:scale-95"
        >
          {done ? '✓' : '+ в корзину'}
        </button>
      </div>
    </div>
  );
}
