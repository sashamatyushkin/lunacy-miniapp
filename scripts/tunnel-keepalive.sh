#!/usr/bin/env bash
# Держит localtunnel на фиксированном поддомене живым весь сеанс.
# localtunnel сам переподключается при коротких обрывах, но при фатальной
# ошибке процесс завершается — тогда мы поднимаем его снова с тем же поддоменом,
# поэтому публичный адрес не меняется и вебхук/endpoint остаются валидными.
set -uo pipefail
cd "$(dirname "$0")/.."

SUB="${TUNNEL_SUBDOMAIN:-lunacyapp67}"
LOG="${1:-/tmp/lunacy-tunnel.log}"
PORT=5173

while true; do
  echo "[keepalive $(date +%H:%M:%S)] запускаю localtunnel --subdomain $SUB" >> "$LOG"
  npx -y localtunnel --port "$PORT" --subdomain "$SUB" >> "$LOG" 2>&1 || true
  echo "[keepalive $(date +%H:%M:%S)] localtunnel завершился, перезапуск через 3с" >> "$LOG"
  sleep 3
done
