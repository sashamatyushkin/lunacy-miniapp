import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verifyInitData } from '../lib/telegram.js';
import { requireAuth, signToken } from '../lib/auth.js';

const bodySchema = z.object({ initData: z.string().min(1) });

function makeRefCode() {
  return crypto.randomBytes(4).toString('hex');
}

export default async function authRoutes(app: FastifyInstance) {
  /**
   * The only entry point. The client sends raw initData; the server verifies the
   * HMAC and issues its own JWT. Nothing the client claims about the user is trusted.
   */
  app.post('/telegram', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'initData is required' });

    let data;
    try {
      data = verifyInitData(parsed.data.initData);
    } catch (e) {
      req.log.warn({ err: e }, 'initData rejected');
      return reply.code(401).send({ error: 'invalid initData' });
    }

    const tgId = BigInt(data.user.id);
    const base = {
      username: data.user.username ?? null,
      firstName: data.user.first_name,
      lastName: data.user.last_name ?? null,
      photoUrl: data.user.photo_url ?? null,
      languageCode: data.user.language_code ?? null,
      isPremium: data.user.is_premium ?? false,
    };

    let user = await prisma.user.findUnique({ where: { tgId } });

    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: base });
    } else {
      // start_param carries `ref_<code>` from a deep link: t.me/bot/app?startapp=ref_abcd1234
      let referredById: string | null = null;
      const ref = data.start_param?.startsWith('ref_') ? data.start_param.slice(4) : null;
      if (ref) {
        const inviter = await prisma.user.findUnique({ where: { refCode: ref } });
        if (inviter && inviter.tgId !== tgId) referredById = inviter.id;
      }
      user = await prisma.user.create({
        data: { tgId, refCode: makeRefCode(), referredById, ...base },
      });
      await prisma.analyticsEvent.create({
        data: { userId: user.id, name: 'user_registered', props: { referred: Boolean(referredById) } },
      });
    }

    const token = signToken({ sub: user.id, tgId: user.tgId.toString() });
    return { token, user, startParam: data.start_param ?? null };
  });

  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { _count: { select: { referrals: true, orders: true } } },
    });
    if (!user) return reply.code(401).send({ error: 'unauthorized' });
    return user;
  });

  app.post('/onboarded', { preHandler: requireAuth }, async (req) => {
    return prisma.user.update({ where: { id: req.userId! }, data: { onboardedAt: new Date() } });
  });
}
