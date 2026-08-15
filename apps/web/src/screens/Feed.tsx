import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories, getProducts, getStories } from '../lib/data';
import { Screen } from '../components/Screen';
import { Keyboard3D } from '../components/Keyboard3D';
import { SixSeven } from '../components/SixSeven';
import { StoriesRow } from '../components/Stories';
import { ProductCard } from '../components/ProductCard';
import { ErrorState, ProductGridSkeleton, Section, Skeleton } from '../components/ui';
import { track } from '../lib/analytics';
import { useSession } from '../store/session';

const StoryViewer = lazy(() => import('../components/StoryViewer'));

export default function Feed() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const user = useSession((s) => s.user);

  useEffect(() => {
    track('screen_view', { screen: 'feed' });
  }, []);

  const stories = useQuery({ queryKey: ['stories'], queryFn: getStories });
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const popular = useQuery({
    queryKey: ['products', 'popular'],
    queryFn: () => getProducts({ popular: true, take: 6 }),
  });

  return (
    <>
      <Screen ref={scrollRef}>
        {/* hero */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-muted)]">lunacy</div>
            <h1 className="mt-1 text-[27px] leading-[1.05]">
              игровые девайсы
              <br />
              для тех, кто в игре
            </h1>
          </div>
          <div className="shrink-0 opacity-90">
            <SixSeven compact />
          </div>
        </div>

        <p className="mt-2 max-w-[280px] text-[13px] text-[var(--color-muted)]">
          {user ? `${user.firstName}, ` : ''}скролль вниз — клавиатура соберётся сама.
        </p>

        <Keyboard3D scrollRef={scrollRef} />

        {/* stories */}
        <Section title="лента">
          {stories.isLoading ? (
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[68px] w-[68px] rounded-full" />
              ))}
            </div>
          ) : stories.data?.length ? (
            <StoriesRow stories={stories.data} onOpen={setStoryIndex} />
          ) : null}
        </Section>

        {/* 67 block */}
        <section className="card mt-8 overflow-hidden">
          <div className="flex flex-col items-center gap-4 px-5 py-7 text-center">
            <SixSeven />
            <div>
              <div className="text-[19px] font-semibold lowercase tracking-tight">шесть… семь</div>
              <p className="mx-auto mt-1.5 max-w-[250px] text-[13px] text-[var(--color-muted)]">
                мышка или клавиатура? 6 или 7? выбирай не глядя — обе в наличии.
              </p>
            </div>
            <Link to="/catalog" className="text-[13px] lowercase underline underline-offset-4">
              открыть каталог
            </Link>
          </div>
        </section>

        {/* popular */}
        <Section
          title="популярные товары"
          action={
            <Link to="/catalog" className="text-[12px] lowercase text-[var(--color-muted)]">
              все →
            </Link>
          }
        >
          {popular.isLoading ? (
            <ProductGridSkeleton />
          ) : popular.isError ? (
            <ErrorState message="не удалось загрузить товары" onRetry={() => popular.refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {popular.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </Section>

        {/* categories */}
        <Section title="категории">
          <div className="grid grid-cols-2 gap-2.5">
            {categories.isLoading
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px]" />)
              : categories.data?.map((c) => (
                  <Link
                    key={c.id}
                    to={`/catalog?category=${c.slug}`}
                    className="card flex h-[74px] flex-col justify-center px-4 transition active:scale-[0.98]"
                  >
                    <span className="text-[15px] lowercase">{c.title}</span>
                    <span className="text-[11px] text-[var(--color-muted)]">{c.count} шт.</span>
                  </Link>
                ))}
          </div>
        </Section>

        <Section title="о нас">
          <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
            lunacy — российский бренд игровой периферии. клавиатуры, мышки, наушники, коврики и рукава,
            собранные под то, как играют на самом деле. официально представлены в ozon, м.видео и dns.
          </p>
        </Section>
      </Screen>

      {storyIndex !== null && stories.data && (
        <Suspense fallback={null}>
          <StoryViewer
            stories={stories.data}
            index={storyIndex}
            onIndex={setStoryIndex}
            onClose={() => setStoryIndex(null)}
          />
        </Suspense>
      )}
    </>
  );
}
