/**
 * Слой данных. Как в LIT: в статической сборке (GitHub Pages) магазин работает
 * БЕЗ бэкенда — каталог зашит в JSON, корзина и заказы живут в localStorage.
 * В серверном режиме (`npm run dev` с API) те же функции ходят в /api.
 *
 * Именно это делает витрину независимой от туннеля: Pages отдаёт статику всегда,
 * даже когда Mac выключен, и никаких CORS/preflight/вебхуков для просмотра нет.
 */
import catalogRaw from '../data/catalog.json';
import storiesRaw from '../data/stories.json';
import type { Category, Product, Story } from './types';
import { get } from './api';

export const IS_STATIC = (import.meta.env.VITE_STATIC as string | undefined) === '1';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// В подпапке Pages ассеты лежат под BASE_URL — префикс к путям картинок и сторис.
const withBase = (path: string) => (path.startsWith('/') ? `${BASE}${path}` : path);

const PRODUCTS: Product[] = (catalogRaw.products as unknown as Product[]).map((p) => ({
  ...p,
  images: p.images.map(withBase),
  specs: (p.specs ?? {}) as Record<string, string>,
}));

const CATEGORIES: Category[] = catalogRaw.categories.map((c) => ({
  ...c,
  count: PRODUCTS.filter((p) => p.category.slug === c.slug).length,
}));

const STORIES: Story[] = (storiesRaw as Story[]).map((s) => ({ ...s, mediaUrl: withBase(s.mediaUrl) }));

export async function getCategories(): Promise<Category[]> {
  if (IS_STATIC) return CATEGORIES;
  return get<Category[]>('/api/categories');
}

/** Витринный товар категории — для миниатюры в плитке категорий. */
export function representativeImage(categorySlug: string): string | undefined {
  const p =
    PRODUCTS.find((x) => x.category.slug === categorySlug && x.isPopular) ??
    PRODUCTS.find((x) => x.category.slug === categorySlug);
  return p?.images[0];
}

export async function getStories(): Promise<Story[]> {
  if (IS_STATIC) return STORIES;
  return get<Story[]>('/api/stories');
}

export type ProductQuery = { category?: string; q?: string; popular?: boolean; take?: number };

export async function getProducts(params: ProductQuery = {}): Promise<{ items: Product[]; total: number }> {
  if (IS_STATIC) {
    let items = PRODUCTS;
    if (params.category) items = items.filter((p) => p.category.slug === params.category);
    if (params.popular) items = items.filter((p) => p.isPopular);
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter((p) => p.title.toLowerCase().includes(q));
    }
    const total = items.length;
    if (params.take) items = items.slice(0, params.take);
    return { items, total };
  }
  const sp = new URLSearchParams();
  if (params.category) sp.set('category', params.category);
  if (params.q) sp.set('q', params.q);
  if (params.popular) sp.set('popular', '1');
  sp.set('take', String(params.take ?? 60));
  return get<{ items: Product[]; total: number }>(`/api/products?${sp}`);
}

/**
 * «Собери сетап»: по одному товару из каждой категории (клавиатура, мышка,
 * наушники, коврик, рукав), кроме той, что уже открыта. Так клиент добирает
 * полный набор в корзину, не выходя с карточки.
 */
function buildSetup(current: Product): Product[] {
  const out: Product[] = [];
  for (const cat of CATEGORIES) {
    if (cat.slug === current.category.slug) continue;
    const pick =
      PRODUCTS.find((p) => p.category.slug === cat.slug && p.isPopular) ??
      PRODUCTS.find((p) => p.category.slug === cat.slug);
    if (pick) out.push(pick);
  }
  return out;
}

export async function getProduct(slug: string): Promise<{ product: Product; related: Product[] }> {
  if (IS_STATIC) {
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (!product) throw new Error('товар не найден');
    return { product, related: buildSetup(product) };
  }
  const res = await get<{ product: Product; related: Product[] }>(`/api/products/${slug}`);
  return res;
}

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
