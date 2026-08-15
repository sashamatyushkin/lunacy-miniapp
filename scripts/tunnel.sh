#!/usr/bin/env bash
# Поднимает публичный HTTPS-туннель на localhost:5173 и печатает его адрес.
#
# Приоритет — СТАБИЛЬНОСТЬ адреса, а не красота, потому что на адрес завязаны
# вебхук бота и api-endpoint.json: если URL меняется при каждом переподключении
# (как у tunnelmole), всё рассыпается.
#
#   localtunnel  — ПЕРВЫЙ: с --subdomain держит ОДИН и тот же адрес между
#                  перезапусками и переподключениями. Показывает браузеру
#                  страницу-предупреждение, но это не мешает: сам Mini App
#                  лежит на GitHub Pages, а к API ходят с заголовком
#                  bypass-tunnel-reminder (его шлёт фронтенд) и Telegram
#                  (не-браузерный UA заглушку не получает).
#   cloudflared  — второй, если вдруг сеть его пропускает (обычно нет: DPS
#                  режет edge, в логе "TLS handshake with edge error").
#   tunnelmole   — последний резерв: адрес НЕ стабилен (меняется на реконнекте),
#                  поэтому только на крайний случай.
set -uo pipefail
cd "$(dirname "$0")/.."

LOG="${1:-/tmp/lunacy-tunnel.log}"
PORT=5173
SUB="${TUNNEL_SUBDOMAIN:-lunacyapp67}"
: > "$LOG"

alive() { curl -sf -m 8 -o /dev/null -H "bypass-tunnel-reminder: 1" "$1/api/categories"; }

try() {              # try <regex> <seconds> <command...>
  local re="$1" waits="$2"; shift 2
  nohup "$@" >> "$LOG" 2>&1 &
  for _ in $(seq 1 "$waits"); do
    sleep 2
    local u
    u=$(grep -oE "$re" "$LOG" | tail -1)
    if [ -n "$u" ] && alive "$u"; then echo "$u"; return 0; fi
  done
  return 1
}

# 1. localtunnel с фиксированным поддоменом — стабильный адрес
if URL=$(try "https://[a-z0-9-]+\.loca\.lt" 18 \
             npx -y localtunnel --port "$PORT" --subdomain "$SUB"); then
  echo "$URL"; exit 0
fi
pkill -f localtunnel 2>/dev/null

# 2. cloudflared (если сеть пропускает)
if URL=$(try "https://[a-z0-9-]+\.trycloudflare\.com" 8 \
             cloudflared tunnel --protocol http2 --edge-ip-version 4 --url "http://localhost:$PORT"); then
  echo "$URL"; exit 0
fi
pkill -f "cloudflared tunnel" 2>/dev/null

# 3. tunnelmole — крайний случай (адрес не стабилен)
if URL=$(try "https://[a-z0-9-]+\.tunnelmole\.net" 20 npx -y tunnelmole "$PORT"); then
  echo "$URL"; exit 0
fi

exit 1
