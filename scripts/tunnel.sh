#!/usr/bin/env bash
# Поднимает публичный HTTPS-туннель на localhost:5173 и печатает его адрес.
#
# Провайдеры перебираются по очереди — на разных сетях живы разные:
#   cloudflared  — лучший, но его edge-адреса часто режет DPI/VPN
#                  (в логе: "TLS handshake with edge error");
#   tunnelmole   — работает без аккаунта и не показывает страницу-заглушку;
#   localtunnel  — последний резерв: капризен и показывает браузеру
#                  предупреждение, которое обходится заголовком
#                  bypass-tunnel-reminder (фронтенд его шлёт).
set -uo pipefail
cd "$(dirname "$0")/.."

LOG="${1:-/tmp/lunacy-tunnel.log}"
PORT=5173
: > "$LOG"

alive() { curl -sf -m 8 -o /dev/null "$1/api/categories"; }

try() {              # try <regex> <seconds> <command...>
  local re="$1" waits="$2"; shift 2
  nohup "$@" >> "$LOG" 2>&1 &
  for _ in $(seq 1 "$waits"); do
    sleep 2
    local u
    u=$(grep -oE "$re" "$LOG" | head -1)
    if [ -n "$u" ] && alive "$u"; then echo "$u"; return 0; fi
  done
  return 1
}

if URL=$(try "https://[a-z0-9-]+\.trycloudflare\.com" 10 \
             cloudflared tunnel --protocol http2 --edge-ip-version 4 --url "http://localhost:$PORT"); then
  echo "$URL"; exit 0
fi
pkill -f "cloudflared tunnel" 2>/dev/null

if URL=$(try "https://[a-z0-9-]+\.tunnelmole\.net" 20 npx -y tunnelmole "$PORT"); then
  echo "$URL"; exit 0
fi
pkill -f tunnelmole 2>/dev/null

sleep 5   # сервер localtunnel ещё несколько секунд держит прошлый поддомен
if URL=$(try "https://[a-z0-9-]+\.loca\.lt" 15 \
             npx -y localtunnel --port "$PORT" --subdomain "${TUNNEL_SUBDOMAIN:-lunacyapp67}"); then
  echo "$URL"; exit 0
fi

exit 1
