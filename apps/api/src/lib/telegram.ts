import crypto from 'node:crypto';
import { env } from './env.js';

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type InitData = {
  user: TelegramUser;
  start_param?: string;
  auth_date: number;
  query_id?: string;
};

/**
 * Validates Telegram WebApp initData exactly as described in
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Returns the parsed payload, or throws.
 */
export function verifyInitData(initData: string): InitData {
  if (!initData) throw new Error('empty initData');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('initData has no hash');
  params.delete('hash');
  params.delete('signature'); // third-party signature, not part of the HMAC payload

  const checkString = [...params.entries()]
    .map(([k, v]) => [k, v] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(env.BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('initData signature mismatch');

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate) throw new Error('initData has no auth_date');
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > env.INITDATA_TTL) throw new Error('initData expired');

  const rawUser = params.get('user');
  if (!rawUser) throw new Error('initData has no user');
  const user = JSON.parse(rawUser) as TelegramUser;
  if (typeof user.id !== 'number') throw new Error('initData user is malformed');

  return {
    user,
    auth_date: authDate,
    start_param: params.get('start_param') ?? undefined,
    query_id: params.get('query_id') ?? undefined,
  };
}

const API = () => `https://api.telegram.org/bot${env.BOT_TOKEN}`;

async function call<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`telegram ${method} failed: ${json.description ?? 'unknown error'}`);
  return json.result as T;
}

export const tg = {
  call,
  sendMessage: (chatId: number | string, text: string, extra: Record<string, unknown> = {}) =>
    call<unknown>('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  answerPreCheckoutQuery: (id: string, ok: boolean, errorMessage?: string) =>
    call<boolean>('answerPreCheckoutQuery', { pre_checkout_query_id: id, ok, error_message: errorMessage }),
  createInvoiceLink: (payload: {
    title: string;
    description: string;
    payload: string;
    currency: string;
    prices: { label: string; amount: number }[];
    provider_token?: string;
  }) => call<string>('createInvoiceLink', { provider_token: '', ...payload }),
  setWebhook: (url: string, secret: string) =>
    call<boolean>('setWebhook', {
      url,
      secret_token: secret,
      allowed_updates: ['message', 'pre_checkout_query', 'callback_query'],
    }),
};
