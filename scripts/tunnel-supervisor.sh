#!/usr/bin/env bash
# Держит туннель живым и «сводит» систему к его текущему адресу.
#
# ТУННЕЛЬ = tunnelmole. Почему не localtunnel: localtunnel показывает страницу-
# предупреждение и возвращает 400 на CORS-preflight (OPTIONS) — а браузер не
# может добавить к preflight заголовок обхода, поэтому КАЖДЫЙ запрос из Mini App
# падал на этапе preflight («нет соединения с сервером»). tunnelmole —
# прозрачный прокси: OPTIONS уходит в Fastify и возвращает корректный CORS 204.
#
# Минус tunnelmole — адрес меняется на реконнекте. Это и решает супервизор:
# принимает ЛЮБОЙ текущий адрес и при каждом изменении обновляет
#   • api-endpoint.json на Pages — его фронтенд читает при запуске;
#   • вебхук бота в Telegram.
# CORS завязан на origin фронтенда (github.io), а не на адрес туннеля, поэтому
# перезапускать API при смене URL не нужно.
#
# Работает в фоне весь сеанс. Останавливается через npm run down.
set -uo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
SUB="${TUNNEL_SUBDOMAIN:-lunacyapp67}"
TUN_LOG=/tmp/lunacy-tunnel.log
STATE=/tmp/lunacy-tunnel-url
PORT=5173
API="https://api.telegram.org/bot$BOT_TOKEN"

current_url() { grep -oE "https://[a-z0-9-]+\.(loca\.lt|trycloudflare\.com|tunnelmole\.net)" "$TUN_LOG" | tail -1; }
alive() { curl -sf -m 8 -o /dev/null -H "bypass-tunnel-reminder: 1" "$1/api/categories"; }

reconcile() {   # reconcile <url>
  local url="$1"
  [ "$(cat "$STATE" 2>/dev/null)" = "$url" ] && return 0
  alive "$url" || return 1

  # 1. записать в .env (для справки и для publish-endpoint)
  python3 - "$url" <<'PY'
import re, sys
url = sys.argv[1]; env = open('.env', encoding='utf-8').read()
env = re.sub(r'^API_PUBLIC_URL=.*$', f'API_PUBLIC_URL={url}', env, flags=re.M)
open('.env', 'w', encoding='utf-8').write(env)
PY
  # 2. вебхук
  curl -sS -X POST "$API/setWebhook" \
    -d "url=$url/api/telegram/webhook" \
    -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
    -d 'allowed_updates=["message","pre_checkout_query"]' >/dev/null
  # 3. api-endpoint.json на Pages
  bash scripts/publish-endpoint.sh >/dev/null 2>&1 || true

  echo "$url" > "$STATE"
  echo "[supervisor $(date +%H:%M:%S)] адрес API → $url" >> "$TUN_LOG"
  return 0
}

# основной цикл: держим туннель и сводим адрес
rm -f "$STATE"
while true; do
  pkill -f "tunnelmole" 2>/dev/null || true
  : > "$TUN_LOG"
  nohup npx -y tunnelmole "$PORT" >> "$TUN_LOG" 2>&1 &
  LT_PID=$!

  # ждём появления адреса и сводим систему
  for _ in $(seq 1 20); do
    sleep 2
    url=$(current_url)
    [ -n "$url" ] && reconcile "$url" && break
  done

  # пока localtunnel жив — периодически перепроверяем адрес (вдруг сменился)
  while kill -0 "$LT_PID" 2>/dev/null; do
    sleep 10
    url=$(current_url)
    [ -n "$url" ] && reconcile "$url" || true
  done

  echo "[supervisor $(date +%H:%M:%S)] туннель упал, перезапуск" >> "$TUN_LOG"
  sleep 3
done
