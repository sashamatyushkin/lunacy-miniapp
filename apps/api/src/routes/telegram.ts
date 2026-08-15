import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { tg } from '../lib/telegram.js';

type Update = {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name: string };
    text?: string;
    successful_payment?: {
      currency: string;
      total_amount: number;
      invoice_payload: string;
      telegram_payment_charge_id: string;
      provider_payment_charge_id?: string;
    };
  };
  pre_checkout_query?: { id: string; invoice_payload: string; total_amount: number; currency: string };
};

const openAppKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [[{ text: 'открыть lunacy', web_app: { url: env.WEBAPP_URL ?? '' } }]],
  },
});

export default async function telegramRoutes(app: FastifyInstance) {
  /**
   * Bot webhook. Telegram authenticates itself with the secret token header —
   * anything else is dropped before it touches the database.
   */
  app.post('/webhook', async (req, reply) => {
    if (req.headers['x-telegram-bot-api-secret-token'] !== env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const update = req.body as Update;

    // 1. Final server-side check before the user is charged.
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const payment = await prisma.payment.findUnique({ where: { payload: q.invoice_payload } });
      const valid = payment && payment.status === 'PENDING' && payment.amount === q.total_amount;
      await tg.answerPreCheckoutQuery(q.id, Boolean(valid), valid ? undefined : 'счёт устарел, оформите заказ заново');
      return { ok: true };
    }

    // 2. The only place an order becomes PAID.
    const sp = update.message?.successful_payment;
    if (sp) {
      const payment = await prisma.payment.findUnique({ where: { payload: sp.invoice_payload }, include: { order: true } });
      if (payment && payment.status !== 'PAID') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              telegramChargeId: sp.telegram_payment_charge_id,
              providerPaymentChargeId: sp.provider_payment_charge_id ?? null,
            },
          }),
          prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } }),
          prisma.analyticsEvent.create({
            data: {
              userId: payment.order.userId,
              name: 'payment_success',
              props: { orderId: payment.orderId, amount: sp.total_amount, currency: sp.currency },
            },
          }),
        ]);
        // The money is already recorded. A failed confirmation message must not
        // turn into a 500, or Telegram would retry this update forever.
        try {
          await tg.sendMessage(
            update.message!.chat.id,
            `оплата получена. заказ №${payment.order.number} принят — напишем, когда передадим в доставку.`,
            openAppKeyboard(),
          );
        } catch (e) {
          req.log.error({ err: e }, 'payment confirmation message failed');
        }
      }
      return { ok: true };
    }

    // 3. /start [deep-link payload]
    const text = update.message?.text;
    if (text?.startsWith('/start')) {
      try {
        await tg.sendMessage(
          update.message!.chat.id,
          'lunacy — игровые девайсы.\nклавиатуры, мышки, наушники, коврики и рукава.\n\nоткрывай магазин прямо здесь.',
          openAppKeyboard(),
        );
      } catch (e) {
        req.log.error({ err: e }, '/start reply failed');
      }
      return { ok: true };
    }

    return { ok: true };
  });

  /** One-off helper: POST with the webhook secret to register the webhook with Telegram. */
  app.post('/set-webhook', async (req, reply) => {
    if (req.headers['x-admin-secret'] !== env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    if (!env.API_PUBLIC_URL) return reply.code(400).send({ error: 'API_PUBLIC_URL is not set' });
    const url = `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/telegram/webhook`;
    await tg.setWebhook(url, env.TELEGRAM_WEBHOOK_SECRET);
    return { ok: true, url };
  });
}
