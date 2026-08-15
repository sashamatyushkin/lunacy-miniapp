import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';

const addSchema = z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99).default(1) });
const setSchema = z.object({ qty: z.number().int().min(0).max(99) });

async function readCart(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: { category: { select: { slug: true, title: true } } } } },
  });
  const total = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  return { items, total, count };
}

export default async function cartRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (req) => readCart(req.userId!));

  app.post('/', async (req, reply) => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad body' });
    const { productId, qty } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return reply.code(404).send({ error: 'product not found' });
    if (!product.inStock) return reply.code(409).send({ error: 'товара нет в наличии' });

    await prisma.cartItem.upsert({
      where: { userId_productId: { userId: req.userId!, productId } },
      update: { qty: { increment: qty } },
      create: { userId: req.userId!, productId, qty },
    });
    return readCart(req.userId!);
  });

  app.patch('/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };
    const parsed = setSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad body' });

    if (parsed.data.qty === 0) {
      await prisma.cartItem.deleteMany({ where: { userId: req.userId!, productId } });
    } else {
      await prisma.cartItem.updateMany({
        where: { userId: req.userId!, productId },
        data: { qty: parsed.data.qty },
      });
    }
    return readCart(req.userId!);
  });

  app.delete('/', async (req) => {
    await prisma.cartItem.deleteMany({ where: { userId: req.userId! } });
    return readCart(req.userId!);
  });
}
