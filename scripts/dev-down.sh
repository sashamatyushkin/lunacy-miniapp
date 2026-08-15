#!/usr/bin/env bash
# Останавливает всё, что поднял dev-up.sh, и снимает вебхук,
# чтобы Telegram не долбился в мёртвый туннель.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env 2>/dev/null; set +a

[ -n "${BOT_TOKEN:-}" ] && curl -sS -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook" > /dev/null

pkill -f "cloudflared tunnel" 2>/dev/null
pkill -f tunnelmole 2>/dev/null
pkill -f localtunnel 2>/dev/null
pkill -f "tsx src/index.ts" 2>/dev/null
pkill -f "node.*vite" 2>/dev/null

echo "Остановлено."
