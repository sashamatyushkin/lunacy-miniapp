import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { env } from '../lib/env.js';
import { tg } from '../lib/telegram.js';

const checkoutSchema = z.object({
  contactName: z.string().min(2).max(80),
  phone: z.string().min(6).max(24),
  address: z.string().min(5).max(300),
  comment: z.string().max(500).optional(),
});

type InvoiceTarget = { id: string; number: number; items: { title: string; qty: number }[]; total: number };

/**
 * Builds a Telegram invoice for an order and records the pending payment.
 * Shared by checkout and by "pay again" so the payload can never drift.
 */
async function issueInvoice(order: InvoiceTarget) {
  const isStars = env.PAYMENT_CURRENCY === 'XTR';
  const amount = isStars ? Math.max(1, Math.round(order.total / env.RUB_PER_STAR)) : order.total * 100;
  const payload = `order_${order.id}_${crypto.randomBytes(6).toString('hex')}`;

  const invoiceUrl = await tg.createInvoiceLink({
    title: `заказ lunacy №${order.number}`,
    description: order.items.map((i) => `${i.title} ×${i.qty}`).join(', ').slice(0, 250),
    payload,
    currency: env.PAYMENT_CURRENCY,
    prices: [{ label: `заказ №${order.number}`, amount }],
    ...(isStars ? {} : { provider_token: env.PAYMENT_PROVIDER_TOKEN ?? '' }),
  });

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { payload, currency: env.PAYMENT_CURRENCY, amount, invoiceUrl, status: 'PENDING' },
    create: { orderId: order.id, payload, currency: env.PAYMENT_CURRENCY, amount, invoiceUrl },
  });

  return invoiceUrl;
}

export default async function orderRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (req) => {
    return prisma.order.findMany({
      where: { userId: req.userId!, NOT: { status: 'DRAFT' } },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: { select: { status: true, currency: true, amount: true } } },
    });
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findFirst({
      where: { id, userId: req.userId! },
      include: { items: true, payment: true },
    });
    if (!order) return reply.code(404).send({ error: 'order not found' });
    return order;
  });

  /**
   * Creates the order from the server-side cart (never from a client-supplied total),
   * then asks Telegram for an invoice link. The order only becomes PAID from the
   * bot webhook — see routes/telegram.ts.
   */
  app.post('/checkout', async (req, reply) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'проверьте поля формы', issues: parsed.error.flatten().fieldErrors });
    }

    const cart = await prisma.cartItem.findMany({
      where: { userId: req.userId! },
      include: { product: true },
    });
    if (cart.length === 0) return reply.code(409).send({ error: 'корзина пуста' });

    const unavailable = cart.filter((i) => !i.product.inStock);
    if (unavailable.length > 0) {
      return reply.code(409).send({ error: `нет в наличии: ${unavailable.map((i) => i.product.title).join(', ')}` });
    }

    const total = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.userId!,
          status: 'AWAITING_PAYMENT',
          total,
          contactName: parsed.data.contactName,
          phone: parsed.data.phone,
          address: parsed.data.address,
          comment: parsed.data.comment ?? null,
          items: {
            create: cart.map((i) => ({
              productId: i.productId,
              title: i.product.title,
              price: i.product.price,
              qty: i.qty,
            })),
          },
        },
        include: { items: true },
      });
      await tx.cartItem.deleteMany({ where: { userId: req.userId! } });
      return created;
    });

    await prisma.analyticsEvent.create({
      data: { userId: req.userId!, name: 'checkout_start', props: { orderId: order.id, total } },
    });

    try {
      const invoiceUrl = await issueInvoice(order);
      return { order, invoiceUrl };
    } catch (e) {
      req.log.error({ err: e }, 'createInvoiceLink failed');
      // The order survives — the client sends the user to /order/:id to retry.
      return reply.code(502).send({
        error: 'не удалось создать счёт на оплату — заказ сохранён, оплатите его из профиля',
        detail: env.NODE_ENV === 'development' && e instanceof Error ? e.message : undefined,
        orderId: order.id,
      });
    }
  });

  /** Re-issues an invoice for an order that was created but never paid. */
  app.post('/:id/pay', async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findFirst({
      where: { id, userId: req.userId! },
      include: { items: true },
    });
    if (!order) return reply.code(404).send({ error: 'заказ не найден' });
    if (order.status !== 'AWAITING_PAYMENT') return reply.code(409).send({ error: 'заказ уже не ждёт оплаты' });

    try {
      const invoiceUrl = await issueInvoice(order);
      return { order, invoiceUrl };
    } catch (e) {
      req.log.error({ err: e }, 'invoice retry failed');
      return reply.code(502).send({ error: 'платёжная система недоступна, попробуйте позже' });
    }
  });
}
