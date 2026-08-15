import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import { money, type Product } from '../lib/types';
import { Screen } from '../components/Screen';
import { ProductCard, ProductImage } from '../components/ProductCard';
import { Button, ErrorState, Section, Skeleton } from '../components/ui';
import { useBackButton, useMainButton } from '../lib/tgHooks';
import { isTelegram } from '../lib/telegram';
import { useCartMutations } from '../store/cart';
import { track } from '../lib/analytics';

export default function ProductScreen() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { add } = useCartMutations();

  useBackButton(() => navigate(-1));

  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: () => get<{ product: Product; related: Product[] }>(`/api/products/${slug}`),
  });

  const product = query.data?.product;

  useEffect(() => {
    if (product) track('product_open', { slug: product.slug, price: product.price });
  }, [product]);

  const addToCart = () => {
    if (!product) return;
    add.mutate({ productId: product.id, qty: 1 }, { onSuccess: () => navigate('/cart') });
  };

  useMainButton({
    text: product ? `в корзину · ${money(product.price)}` : 'загрузка',
    visible: Boolean(product?.inStock),
    active: !add.isPending,
    progress: add.isPending,
    onClick: addToCart,
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
      <div className="card mb-4 aspect-square w-full overflow-hidden">
        <ProductImage product={product} className="h-full w-full" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] normal-case">{product.title}</h1>
          {product.subtitle && <div className="mt-1 text-[12px] text-[var(--color-muted)]">{product.subtitle}</div>}
        </div>
        <div className="text-right">
          <div className="text-[20px] font-semibold">{money(product.price)}</div>
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

      {/* Outside Telegram there is no MainButton, so the CTA lives in the page. */}
      {!isTelegram && product.inStock && (
        <div className="mt-6">
          <Button loading={add.isPending} onClick={addToCart}>
            в корзину · {money(product.price)}
          </Button>
        </div>
      )}

      {query.data!.related.length > 0 && (
        <Section title="смотрите также">
          <div className="grid grid-cols-2 gap-2.5">
            {query.data!.related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}
