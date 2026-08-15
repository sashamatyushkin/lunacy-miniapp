import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import type { JwtPayload } from '../lib/auth.js';

const EVENTS = [
  'app_open',
  'onboarding_start',
  'onboarding_complete',
  'screen_view',
  'button_click',
  'product_open',
  'add_to_cart',
  'cart_open',
  'checkout_start',
  'payment_open',
  'story_open',
  'referral_share',
] as const;

const schema = z.object({
  name: z.enum(EVENTS),
  props: z.record(z.unknown()).default({}),
});

export default async function analyticsRoutes(app: FastifyInstance) {
  // Anonymous events are allowed (app_open fires before auth resolves), but the
  // event name is whitelisted so the table cannot be used as free storage.
  app.post('/', async (req, reply) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'unknown event' });

    let userId: string | null = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        userId = (jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload).sub;
      } catch {
        userId = null;
      }
    }

    await prisma.analyticsEvent.create({
      data: { userId, name: parsed.data.name, props: parsed.data.props as object },
    });
    return reply.code(204).send();
  });
}
