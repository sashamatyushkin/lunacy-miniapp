#!/usr/bin/env bash
# Поднимает всё, что нужно для работы Mini App на этой машине:
# API :3001 → фронтенд :5173 → публичный HTTPS-туннель → привязка бота.
#
# Один туннель обслуживает и Mini App, и вебхук бота: Vite проксирует /api
# в Fastify, поэтому фронтенд и API живут на одном origin.
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
if ! pg_isready -h localhost -p 5432 -q; then
  echo "     PostgreSQL не отвечает на :5432 — запустите его (brew services start postgresql@16 или docker compose up -d db)"
  exit 1
fi
(cd apps/api && npx prisma migrate deploy >/dev/null)

echo "2/5  api :3001"
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "tsx src/index.ts" 2>/dev/null || true
(cd apps/api && nohup npx tsx src/index.ts > "$API_LOG" 2>&1 &)
for _ in $(seq 1 30); do sleep 0.5; curl -sf -o /dev/null http://localhost:3001/health && break; done
curl -sf -o /dev/null http://localhost:3001/health || { echo "     API не поднялся, лог: $API_LOG"; exit 1; }

echo "3/5  фронтенд :5173"
pkill -f "vite" 2>/dev/null || true
(nohup npm run dev:web > "$WEB_LOG" 2>&1 &)
for _ in $(seq 1 40); do sleep 0.5; curl -sf -o /dev/null http://localhost:5173/ && break; done
curl -sf -o /dev/null http://localhost:5173/ || { echo "     Vite не поднялся, лог: $WEB_LOG"; exit 1; }

echo "4/5  туннель"
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "localtunnel" 2>/dev/null || true
: > "$TUN_LOG"

# Сначала cloudflared. Он ходит к своим edge-IP по QUIC (UDP :7844), а при
# --protocol http2 — по TCP 443; и то и другое нередко режет VPN или провайдер.
# QUIC отключаем сразу, чтобы не ждать таймаутов впустую.
nohup cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://localhost:5173 >> "$TUN_LOG" 2>&1 &

URL=""
for _ in $(seq 1 12); do
  sleep 2
  CANDIDATE=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$TUN_LOG" | head -1 || true)
  [ -n "$CANDIDATE" ] && curl -sf -m 8 -o /dev/null "$CANDIDATE/" && { URL="$CANDIDATE"; break; }
done

if [ -z "$URL" ]; then
  echo "     cloudflared не пробился (см. $TUN_LOG) — переключаюсь на localtunnel"
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  SUB="${TUNNEL_SUBDOMAIN:-lunacyapp67}"
  # Сервер держит поддомен ещё несколько секунд после разрыва: если не выждать,
  # localtunnel молча выдаст случайный адрес вместо запрошенного.
  sleep 6
  nohup npx -y localtunnel --port 5173 --subdomain "$SUB" >> "$TUN_LOG" 2>&1 &
  for _ in $(seq 1 20); do
    sleep 2
    CANDIDATE=$(grep -oE "https://[a-z0-9-]+\.loca\.lt" "$TUN_LOG" | tail -1 || true)
    [ -n "$CANDIDATE" ] && curl -sf -m 8 -o /dev/null "$CANDIDATE/" && { URL="$CANDIDATE"; break; }
  done
fi

if [ -z "$URL" ]; then
  echo "     Ни один туннель не поднялся. Лог: $TUN_LOG"
  exit 1
fi
echo "     $URL"

# адрес нужен API — он подставляет его в кнопку web_app
python3 - "$URL" <<'PY'
import re, sys
url = sys.argv[1]
env = open('.env', encoding='utf-8').read()
for key in ('WEBAPP_URL', 'API_PUBLIC_URL'):
    env = re.sub(rf'^{key}=.*$', f'{key}={url}', env, flags=re.M)
env = re.sub(r'^CORS_ORIGIN=.*$', f'CORS_ORIGIN=http://localhost:5173,{url}', env, flags=re.M)
open('.env', 'w', encoding='utf-8').write(env)
PY

# перезапускаем API, чтобы он подхватил новый WEBAPP_URL
pkill -f "tsx src/index.ts" 2>/dev/null || true
(cd apps/api && nohup npx tsx src/index.ts > "$API_LOG" 2>&1 &)
for _ in $(seq 1 30); do sleep 0.5; curl -sf -o /dev/null http://localhost:3001/health && break; done

echo "5/5  бот"
API="https://api.telegram.org/bot$BOT_TOKEN"
curl -sS -X POST "$API/setWebhook" \
  -d "url=$URL/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d "drop_pending_updates=true" \
  -d 'allowed_updates=["message","pre_checkout_query"]' > /dev/null

curl -sS -X POST "$API/setChatMenuButton" -H 'Content-Type: application/json' \
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"магазин\",\"web_app\":{\"url\":\"$URL\"}}}" > /dev/null

curl -sS -X POST "$API/setMyCommands" -H 'Content-Type: application/json' \
  -d '{"commands":[{"command":"start","description":"открыть магазин"}]}' > /dev/null

BOT=$(curl -sS "$API/getMe" | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['username'])")

echo
echo "Готово. Открывайте @$BOT и жмите /start"
echo "  Mini App : $URL"
echo "  адрес меняется при перезапуске — вебхук и кнопку меню скрипт обновляет сам,"
echo "  но если Mini App заведён через BotFather /newapp, адрес там правьте руками"
echo "  логи     : $API_LOG | $WEB_LOG | $TUN_LOG"
