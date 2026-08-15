#!/usr/bin/env bash
# Поднимает всё, что нужно для работы Mini App с этого Mac:
#   API :3001 → фронтенд :5173 → публичный HTTPS-туннель → привязка бота.
#
# Сам Mini App живёт на GitHub Pages (стабильный HTTPS без страниц-заглушек,
# адрес в BotFather вводится один раз). Туннель нужен только для API и вебхука;
# его адрес фронтенд читает на старте из api-endpoint.json, поэтому смена
# туннеля не требует пересборки — достаточно обновить один файл.
#
# Запуск: npm run up      Остановка: npm run down
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
: "${BOT_TOKEN:?BOT_TOKEN не задан в .env}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET не задан в .env}"

API_LOG=/tmp/lunacy-api.log
WEB_LOG=/tmp/lunacy-web.log
TUN_LOG=/tmp/lunacy-tunnel.log

echo "1/5  база"
pg_isready -h localhost -p 5432 -q || {
  echo "     PostgreSQL не отвечает на :5432 — brew services start postgresql@16"
  exit 1
}
(cd apps/api && npx prisma migrate deploy >/dev/null)

start_api() {
  pkill -f "tsx src/index.ts" 2>/dev/null || true
  (cd apps/api && nohup npx tsx src/index.ts > "$API_LOG" 2>&1 &)
  for _ in $(seq 1 30); do sleep 0.5; curl -sf -o /dev/null http://localhost:3001/health && return 0; done
  echo "     API не поднялся, лог: $API_LOG"; exit 1
}

echo "2/5  api :3001"
start_api

echo "3/5  фронтенд :5173"
pkill -f "node.*vite" 2>/dev/null || true
(nohup npm run dev:web > "$WEB_LOG" 2>&1 &)
for _ in $(seq 1 40); do sleep 0.5; curl -sf -o /dev/null http://localhost:5173/ && break; done
curl -sf -o /dev/null http://localhost:5173/ || { echo "     Vite не поднялся, лог: $WEB_LOG"; exit 1; }

echo "4/5  туннель"
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f tunnelmole 2>/dev/null || true
pkill -f localtunnel 2>/dev/null || true
URL=$(bash scripts/tunnel.sh "$TUN_LOG") || {
  echo "     Ни один туннель не поднялся. Лог: $TUN_LOG"
  exit 1
}
echo "     $URL"

python3 - "$URL" <<'PY'
import re, sys
url = sys.argv[1]
env = open('.env', encoding='utf-8').read()
env = re.sub(r'^API_PUBLIC_URL=.*$', f'API_PUBLIC_URL={url}', env, flags=re.M)
pages = re.search(r'^PAGES_URL=(.*)$', env, re.M)
origins = ['http://localhost:5173', url]
if pages and pages.group(1).strip():
    origins.append(re.sub(r'(https?://[^/]+).*', r'\1', pages.group(1).strip()))
env = re.sub(r'^CORS_ORIGIN=.*$', 'CORS_ORIGIN=' + ','.join(origins), env, flags=re.M)
open('.env', 'w', encoding='utf-8').write(env)
PY

set -a; source .env; set +a
start_api   # перечитать CORS_ORIGIN и WEBAPP_URL

echo "5/5  бот"
API="https://api.telegram.org/bot$BOT_TOKEN"
# вебхук — на туннель, кнопки — на статику Pages
curl -sS -X POST "$API/setWebhook" \
  -d "url=$API_PUBLIC_URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d "drop_pending_updates=true" \
  -d 'allowed_updates=["message","pre_checkout_query"]' > /dev/null

APP_URL="${PAGES_URL:-$API_PUBLIC_URL}"
curl -sS -X POST "$API/setChatMenuButton" -H 'Content-Type: application/json' \
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"магазин\",\"web_app\":{\"url\":\"$APP_URL\"}}}" > /dev/null
curl -sS -X POST "$API/setMyCommands" -H 'Content-Type: application/json' \
  -d '{"commands":[{"command":"start","description":"открыть магазин"}]}' > /dev/null

# сообщить опубликованному фронтенду новый адрес API
if [ -n "${PAGES_URL:-}" ]; then
  bash scripts/publish-endpoint.sh || echo "     не удалось обновить api-endpoint.json — запустите npm run deploy"
fi

BOT=$(curl -sS "$API/getMe" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['username'])")

echo
echo "Готово. Открывайте @$BOT и жмите /start"
echo "  Mini App : $APP_URL"
echo "  API      : $API_PUBLIC_URL"
echo "  логи     : $API_LOG | $WEB_LOG | $TUN_LOG"
