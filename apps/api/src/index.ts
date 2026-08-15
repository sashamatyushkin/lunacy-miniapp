import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env, corsOrigins } from './lib/env.js';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import telegramRoutes from './routes/telegram.js';
import analyticsRoutes from './routes/analytics.js';

const app = Fastify({
  logger: env.NODE_ENV === 'development' ? { transport: undefined, level: 'info' } : { level: 'warn' },
  trustProxy: true,
});

await app.register(cors, {
  origin: (origin, cb) => {
    // Telegram in-app webviews may omit Origin entirely.
    if (!origin || corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error('origin not allowed'), false);
  },
  credentials: true,
});

await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  // The bot webhook is authenticated by secret token and must never be throttled.
  allowList: (req) => req.url.startsWith('/api/telegram/webhook'),
});

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, ts: Date.now() };
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(catalogRoutes, { prefix: '/api' });
await app.register(cartRoutes, { prefix: '/api/cart' });
await app.register(orderRoutes, { prefix: '/api/orders' });
await app.register(telegramRoutes, { prefix: '/api/telegram' });
await app.register(analyticsRoutes, { prefix: '/api/events' });

app.setErrorHandler((err, _req, reply) => {
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  if (status >= 500) app.log.error({ err }, 'unhandled error');
  const message = err instanceof Error ? err.message : 'ошибка';
  reply.code(status).send({ error: status >= 500 ? 'внутренняя ошибка сервера' : message });
});

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: '0.0.0.0' });
console.log(`api ready on http://localhost:${env.PORT}`);
