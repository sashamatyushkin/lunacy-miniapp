import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/** BigInt is not JSON-serialisable by default; tgId would blow up every response. */
(BigInt.prototype as unknown as { toJSON(): string }).toJSON = function () {
  return this.toString();
};
