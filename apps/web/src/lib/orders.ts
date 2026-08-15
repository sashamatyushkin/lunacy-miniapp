/**
 * Заказы. В статической сборке (Pages) складываются в localStorage устройства,
 * как в LIT: оплата на витрине не проводится, заказ фиксируется и передаётся
 * менеджеру через бота. В серверном режиме тот же интерфейс уходит в /api.
 */
import type { Cart, Order } from './types';
import { IS_STATIC } from './data';
import { post, get } from './api';

const KEY = 'lunacy_orders';

export type CheckoutForm = { contactName: string; phone: string; address: string; comment?: string };

function readLocal(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Order[];
  } catch {
    return [];
  }
}

function createLocal(form: CheckoutForm, cart: Cart): Order {
  const orders = readLocal();
  const number = (orders[0]?.number ?? 1000) + 1;
  const order: Order = {
    id: `local-${number}`,
    number,
    status: 'AWAITING_PAYMENT',
    total: cart.total,
    contactName: form.contactName,
    phone: form.phone,
    address: form.address,
    comment: form.comment ?? null,
    createdAt: new Date().toISOString(),
    items: cart.items.map((i) => ({ id: i.productId, title: i.product.title, price: i.product.price, qty: i.qty })),
    payment: null,
  };
  localStorage.setItem(KEY, JSON.stringify([order, ...orders].slice(0, 20)));
  return order;
}

export async function createOrder(form: CheckoutForm, cart: Cart): Promise<Order> {
  if (IS_STATIC) {
    await new Promise((r) => setTimeout(r, 300));
    return createLocal(form, cart);
  }
  const { order } = await post<{ order: Order }>('/api/orders/checkout', form);
  return order;
}

export async function listOrders(): Promise<Order[]> {
  if (IS_STATIC) return readLocal();
  return get<Order[]>('/api/orders');
}

export async function getOrder(id: string): Promise<Order> {
  if (IS_STATIC) {
    const order = readLocal().find((o) => o.id === id);
    if (!order) throw new Error('заказ не найден');
    return order;
  }
  return get<Order>(`/api/orders/${id}`);
}
