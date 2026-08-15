import { useSyncExternalStore } from 'react';
import { productById } from '../lib/data';
import type { Cart, CartItem, Product } from '../lib/types';
import { haptic } from '../lib/telegram';
import { track } from '../lib/analytics';

/**
 * Корзина целиком на устройстве (localStorage), как в LIT. Никаких обращений к
 * серверу — витрина работает и без бэкенда. Храним только id и количество,
 * остальное берём из зашитого каталога.
 */
const KEY = 'lunacy_cart';

type Stored = Record<string, number>; // productId -> qty

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let snapshot: Cart = build(read());

function build(stored: Stored): Cart {
  const items: CartItem[] = [];
  for (const [productId, qty] of Object.entries(stored)) {
    const product = productById(productId);
    if (product && qty > 0) items.push({ id: productId, productId, qty, product });
  }
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  return { items, total, count };
}

function commit(stored: Stored) {
  localStorage.setItem(KEY, JSON.stringify(stored));
  snapshot = build(stored);
  listeners.forEach((l) => l());
}

export const cart = {
  add(product: Product, qty = 1) {
    const s = read();
    s[product.id] = (s[product.id] ?? 0) + qty;
    commit(s);
    haptic.success();
    track('add_to_cart', { productId: product.id });
  },
  setQty(productId: string, qty: number) {
    const s = read();
    if (qty <= 0) delete s[productId];
    else s[productId] = Math.min(qty, 99);
    commit(s);
    haptic.select();
  },
  clear() {
    commit({});
  },
  snapshot: () => snapshot,
};

/** React-хук: подписка на корзину без внешних библиотек стейта. */
export function useCart(): Cart {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}
