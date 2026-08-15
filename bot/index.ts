/**
 * Бот Lunacy на long-polling — как в LIT. Работает БЕЗ вебхука и туннеля:
 * достаточно исходящего интернета. Его задача — по /start (и по кнопке меню)
 * открывать Mini App, который живёт на GitHub Pages и работает самостоятельно.
 *
 * Запуск: npm run bot
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// читаем .env из корня без лишних зависимостей
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.PAGES_URL || process.env.WEBAPP_URL;
if (!TOKEN) throw new Error('BOT_TOKEN не задан в .env');
if (!APP_URL) throw new Error('PAGES_URL (или WEBAPP_URL) не задан в .env');

const API = `https://api.telegram.org/bot${TOKEN}`;

async function call<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result as T;
}

const shopKeyboard = {
  inline_keyboard: [[{ text: '🌙 открыть магазин', web_app: { url: APP_URL } }]],
};

const WELCOME =
  'lunacy — игровые девайсы.\n' +
  'клавиатуры, мышки, наушники, коврики и рукава.\n\n' +
  'открывай магазин прямо здесь 👇';

async function setup() {
  // long-polling несовместим с активным вебхуком — снимаем его
  await call('deleteWebhook', { drop_pending_updates: false }).catch(() => {});
  await call('setChatMenuButton', {
    menu_button: { type: 'web_app', text: 'магазин', web_app: { url: APP_URL } },
  }).catch(() => {});
  await call('setMyCommands', { commands: [{ command: 'start', description: 'открыть магазин' }] }).catch(() => {});
}

type Update = { update_id: number; message?: { chat: { id: number }; text?: string } };

async function poll() {
  let offset = 0;
  console.log('bot: long-polling запущен, магазин →', APP_URL);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const updates = await call<Update[]>('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const text = u.message?.text ?? '';
        if (u.message && (text.startsWith('/start') || text === '/shop')) {
          await call('sendMessage', {
            chat_id: u.message.chat.id,
            text: WELCOME,
            reply_markup: shopKeyboard,
          }).catch((e) => console.error('sendMessage:', e.message));
        }
      }
    } catch (e) {
      console.error('getUpdates:', (e as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

await setup();
await poll();
