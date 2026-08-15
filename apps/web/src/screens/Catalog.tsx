import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import type { Category, Product } from '../lib/types';
import { Screen, ScreenHeader } from '../components/Screen';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, ProductGridSkeleton } from '../components/ui';
import { haptic } from '../lib/telegram';
import { track } from '../lib/analytics';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    track('screen_view', { screen: 'catalog' });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => get<Category[]>('/api/categories') });

  const products = useQuery({
    queryKey: ['products', category, debounced],
    queryFn: () => {
      const sp = new URLSearchParams({ take: '60' });
      if (category) sp.set('category', category);
      if (debounced) sp.set('q', debounced);
      return get<{ items: Product[]; total: number }>(`/api/products?${sp}`);
    },
  });

  const pick = (slug: string) => {
    haptic.select();
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setParams(next, { replace: true });
  };

  return (
    <Screen>
      <ScreenHeader
        title="каталог"
        right={
          <span className="text-[12px] text-[var(--color-muted)]">
            {products.data ? `(${products.data.total})` : ''}
          </span>
        }
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="поиск по названию"
        className="mb-3 h-11 w-full rounded-[3px] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 text-[14px] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-soft)]"
      />

      <div className="scroll-y no-bar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className="chip" data-active={!category} onClick={() => pick('')}>
          все
        </button>
        {categories.data?.map((c) => (
          <button key={c.id} className="chip" data-active={category === c.slug} onClick={() => pick(c.slug)}>
            {c.title}
          </button>
        ))}
      </div>

      {products.isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : products.isError ? (
        <ErrorState message={(products.error as Error).message} onRetry={() => products.refetch()} />
      ) : products.data!.items.length === 0 ? (
        <EmptyState title="ничего не нашлось" hint="попробуйте другую категорию или запрос" />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {products.data!.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </Screen>
  );
}
