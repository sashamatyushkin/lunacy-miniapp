import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

// apps/api/.env wins, the monorepo root .env fills in the rest.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, '../../.env') });
config({ path: path.resolve(here, '../../../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required — get it from @BotFather'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_TTL: z.string().default('7d'),
  WEBAPP_URL: z.string().url().optional(),
  API_PUBLIC_URL: z.string().url().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('change-me'),
  INITDATA_TTL: z.coerce.number().default(86400),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PAYMENT_CURRENCY: z.string().default('XTR'),
  PAYMENT_PROVIDER_TOKEN: z.string().optional(),
  RUB_PER_STAR: z.coerce.number().default(2),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('invalid environment:\n' + parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
