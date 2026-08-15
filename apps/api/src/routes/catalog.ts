import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const listQuery = z.object({
  category: z.string().optional(),
  q: z.string().max(64).optional(),
  popular: z.enum(['0', '1']).optional(),
  take: z.coerce.number().min(1).max(60).default(30),
  skip: z.coerce.number().min(0).default(0),
});

export default async function catalogRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    const cats = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return cats.map((c) => ({ id: c.id, slug: c.slug, title: c.title, count: c._count.products }));
  });

  app.get('/products', async (req, reply) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad query' });
    const { category, q, popular, take, skip } = parsed.data;

    const where = {
      ...(category ? { category: { slug: category } } : {}),
      ...(popular === '1' ? { isPopular: true } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }],
        take,
        skip,
        include: { category: { select: { slug: true, title: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, take, skip };
  });

  app.get('/products/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: { select: { slug: true, title: true } } },
    });
    if (!product) return reply.code(404).send({ error: 'product not found' });

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, NOT: { id: product.id } },
      take: 6,
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { slug: true, title: true } } },
    });

    return { product, related };
  });

  app.get('/stories', async () => {
    return prisma.story.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
  });
}
