import { useState } from 'react';
import { Link } from 'react-router-dom';
import { money, type Product } from '../lib/types';
import { haptic } from '../lib/telegram';

/**
 * Photo-less products still have to look intentional, so a missing file falls
 * back to a generated monochrome poster instead of a broken image icon.
 * Drop real shots into apps/web/public/products/<slug>.webp and they take over.
 */
export function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = product.images[0];

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center ${className}`}
        style={{ background: 'radial-gradient(120% 100% at 50% 0%, #2b2b2b, #141414 75%)' }}
      >
        <span className="px-3 text-center text-[11px] lowercase tracking-[0.18em] text-[var(--color-muted)]">
          {product.category.title}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={product.title}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.slug}`}
      onClick={() => haptic.tap()}
      className="card group relative flex flex-col overflow-hidden transition active:scale-[0.98]"
    >
      {product.isLimited && (
        <span className="absolute left-2 top-2 z-10 rounded-[2px] bg-[var(--color-ink)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-bg)]">
          limited
        </span>
      )}
      <div className="aspect-square w-full overflow-hidden bg-[var(--color-surface)]">
        <ProductImage product={product} className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="line-clamp-2 text-[13px] leading-tight text-[var(--color-ink)]">{product.title}</div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold">{money(product.price)}</span>
          <span className="text-[10px] lowercase text-[var(--color-muted)]">{product.category.title}</span>
        </div>
      </div>
    </Link>
  );
}
