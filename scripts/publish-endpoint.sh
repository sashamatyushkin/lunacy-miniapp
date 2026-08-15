#!/usr/bin/env bash
# Обновляет только адрес API в опубликованной статике (api-endpoint.json).
# Нужен, когда туннель переподнялся с новым адресом: пересобирать фронтенд
# ради одной строки не надо.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
: "${API_PUBLIC_URL:?API_PUBLIC_URL не задан}"

REPO="${PAGES_REPO:-lunacy-miniapp}"
OWNER=$(gh api user --jq .login)

WORK=$(mktemp -d)
git clone -q --depth 1 --branch gh-pages "https://github.com/$OWNER/$REPO.git" "$WORK" 2>/dev/null || {
  echo "Ветки gh-pages ещё нет — запустите npm run deploy"; rm -rf "$WORK"; exit 1;
}
printf '{"url":"%s"}\n' "$API_PUBLIC_URL" > "$WORK/api-endpoint.json"
git -C "$WORK" add api-endpoint.json
if git -C "$WORK" diff --cached --quiet; then
  echo "Адрес не изменился: $API_PUBLIC_URL"
else
  git -C "$WORK" -c user.email=noreply@github.com -c user.name=lunacy commit -q -m "api endpoint"
  git -C "$WORK" push -q origin gh-pages
  echo "Опубликован адрес API: $API_PUBLIC_URL"
fi
rm -rf "$WORK"
