import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from './env.js';
import { prisma } from './prisma.js';

export type JwtPayload = { sub: string; tgId: string };

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_TTL as jwt.SignOptions['expiresIn'] });
}

/** Route preHandler: rejects anything without a valid bearer token. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload;
    req.userId = decoded.sub;
  } catch {
    return reply.code(401).send({ error: 'invalid token' });
  }
}

/** Same, but also loads the user — use where the handler needs the record. */
export async function currentUser(req: FastifyRequest) {
  if (!req.userId) throw new Error('currentUser called without requireAuth');
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw Object.assign(new Error('user not found'), { statusCode: 401 });
  return user;
}
