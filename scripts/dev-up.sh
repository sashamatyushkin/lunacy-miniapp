#!/usr/bin/env bash
# Поднимает всё для работы Mini App с этого Mac:
#   API :3001 → фронтенд :5173 → СТАБИЛЬНЫЙ HTTPS-туннель → привязка бота.
#
# Mini App живёт на GitHub Pages (стабильный адрес, без заглушек — в BotFather
# вводится один раз). Туннель нужен только для API и вебхука.
#
# Ключ к стабильности: localtunnel с ФИКСИРОВАННЫМ поддоменом (lunacyapp67).
# Адрес не меняется между перезапусками и переподключениями, поэтому вебхук и
# api-endpoint.json ставятся один раз и остаются валидными. Заглушка localtunnel
# не мешает: страницу видит только браузер при переходе НА loca.lt, а сюда
# ходят только fetch-запросы (с заголовком bypass-tunnel-reminder) и Telegram.
#
# Запуск: npm run up      Остановка: npm run down
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
: "${BOT_TOKEN:?BOT_TOKEN не задан в .env}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET не задан в .env}"

SUB="${TUNNEL_SUBDOMAIN:-lunacyapp67}"
URL="https://$SUB.loca.lt"
API_LOG=/tmp/lunacy-api.log
WEB_LOG=/tmp/lunacy-web.log
TUN_LOG=/tmp/lunacy-tunnel.log

echo "1/5  база"
pg_isready -h localhost -p 5432 -q || { echo "     PostgreSQL не отвечает на :5432 — brew services start postgresql@16"; exit 1; }
(cd apps/api && npx prisma migrate deploy >/dev/null)

start_api() {
  pkill -f "tsx src/index.ts" 2>/dev/null || true
  (cd apps/api && nohup npx tsx src/index.ts > "$API_LOG" 2>&1 &)
  for _ in $(seq 1 30); do sleep 0.5; curl -sf -o /dev/null http://localhost:3001/health && return 0; done
  echo "     API не поднялся, лог: $API_LOG"; exit 1
}

echo "2/5  api :3001"
# адрес API известен заранее (фиксированный поддомен) — прописываем ДО старта,
# чтобы CORS сразу знал разрешённый origin
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
start_api

echo "3/5  фронтенд :5173"
pkill -f "node.*vite" 2>/dev/null || true
(nohup npm run dev:web > "$WEB_LOG" 2>&1 &)
for _ in $(seq 1 40); do sleep 0.5; curl -sf -o /dev/null http://localhost:5173/ && break; done
curl -sf -o /dev/null http://localhost:5173/ || { echo "     Vite не поднялся, лог: $WEB_LOG"; exit 1; }

echo "4/5  туннель (стабильный $URL)"
pkill -f "tunnel-keepalive" 2>/dev/null || true
pkill -f "localtunnel" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "tunnelmole" 2>/dev/null || true
: > "$TUN_LOG"
(nohup bash scripts/tunnel-keepalive.sh "$TUN_LOG" > /dev/null 2>&1 &)

ok=""
for _ in $(seq 1 30); do
  sleep 2
  curl -sf -m 8 -o /dev/null -H "bypass-tunnel-reminder: 1" "$URL/api/categories" && { ok=1; break; }
done
if [ -z "$ok" ]; then
  echo "     Фиксированный поддомен не поднялся (возможно занят). Пробую любой доступный туннель…"
  pkill -f "tunnel-keepalive" 2>/dev/null || true
  URL=$(bash scripts/tunnel.sh "$TUN_LOG") || { echo "     Туннель не поднялся. Лог: $TUN_LOG"; exit 1; }
  python3 - "$URL" <<'PY'
import re, sys
url = sys.argv[1]; env = open('.env', encoding='utf-8').read()
env = re.sub(r'^API_PUBLIC_URL=.*$', f'API_PUBLIC_URL={url}', env, flags=re.M)
env = re.sub(r'^CORS_ORIGIN=.*$', f'CORS_ORIGIN=http://localhost:5173,{url},https://sashamatyushkin.github.io', env, flags=re.M)
open('.env', 'w', encoding='utf-8').write(env)
PY
  set -a; source .env; set +a
  start_api
fi
echo "     $URL"

echo "5/5  бот"
API="https://api.telegram.org/bot$BOT_TOKEN"
curl -sS -X POST "$API/setWebhook" \
  -d "url=$URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d "drop_pending_updates=true" \
  -d 'allowed_updates=["message","pre_checkout_query"]' > /dev/null

APP_URL="${PAGES_URL:-$URL}"
curl -sS -X POST "$API/setChatMenuButton" -H 'Content-Type: application/json' \
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"магазин\",\"web_app\":{\"url\":\"$APP_URL\"}}}" > /dev/null
curl -sS -X POST "$API/setMyCommands" -H 'Content-Type: application/json' \
  -d '{"commands":[{"command":"start","description":"открыть магазин"}]}' > /dev/null

# сообщить опубликованному фронтенду актуальный адрес API
if [ -n "${PAGES_URL:-}" ]; then
  bash scripts/publish-endpoint.sh >/dev/null 2>&1 || echo "     не удалось обновить api-endpoint.json — запустите npm run deploy"
fi

BOT=$(curl -sS "$API/getMe" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['username'])")

echo
echo "Готово. Открывайте @$BOT и жмите /start"
echo "  Mini App : $APP_URL"
echo "  API      : $URL"
echo "  логи     : $API_LOG | $WEB_LOG | $TUN_LOG"
