#!/usr/bin/env bash
# Собирает Mini App и публикует его на GitHub Pages.
#
# Зачем Pages, а не туннель: бесплатные туннели (localtunnel, pinggy) показывают
# браузеру страницу-предупреждение, и Telegram открывает именно её. Pages отдаёт
# статику по стабильному HTTPS без всяких заглушек. API остаётся на туннеле —
# к нему фронтенд ходит запросами с заголовком bypass-tunnel-reminder.
#
# Запуск: npm run deploy    (адрес API берётся из .env → API_PUBLIC_URL)
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="${PAGES_REPO:-lunacy-miniapp}"
OWNER=$(gh api user --jq .login)
BASE="/$REPO/"
PAGES_URL="https://$OWNER.github.io/$REPO/"

echo "1/4  сборка статики (VITE_STATIC=1, base=$BASE)"
# Как в LIT: полностью статическая витрина. Каталог зашит в JSON, корзина и
# заказы — в localStorage, авторизация клиентская из Telegram. Никакого бэкенда,
# туннеля, CORS и вебхуков — Pages отдаёт статику всегда, даже когда Mac выключен.
# NODE_ENV=production обязателен (в .env он development, иначе Vite соберёт dev-бандл).
rm -rf apps/web/dist apps/web/tsconfig.tsbuildinfo node_modules/.vite
NODE_ENV=production VITE_STATIC=1 VITE_BASE="$BASE" VITE_API_URL="" \
  npx --workspace=apps/web vite build --mode production

# Pages не умеет SPA-фолбэк — 404 отдаём тем же index.html
cp apps/web/dist/index.html apps/web/dist/404.html
touch apps/web/dist/.nojekyll

echo "2/4  репозиторий"
if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$OWNER/$REPO" --public --description "Lunacy — Telegram Mini App" >/dev/null
  echo "     создан $OWNER/$REPO"
fi

[ -d .git ] || { git init -q; git branch -M main; }
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
git remote set-url origin "https://github.com/$OWNER/$REPO.git"
git symbolic-ref -q HEAD refs/heads/main >/dev/null || git branch -M main

echo "3/4  исходники → main"
git add -A
git commit -q -m "lunacy mini app" 2>/dev/null || true
git push -q -u origin main --force

echo "4/4  сборка → gh-pages"
# отдельная ветка только со статикой
WORK=$(mktemp -d)
cp -R apps/web/dist/. "$WORK/"
git -C "$WORK" init -q
git -C "$WORK" branch -M gh-pages
git -C "$WORK" add -A
git -C "$WORK" -c user.email=noreply@github.com -c user.name=lunacy commit -q -m "build"
git -C "$WORK" push -q --force "https://github.com/$OWNER/$REPO.git" gh-pages
rm -rf "$WORK"

gh api -X POST "repos/$OWNER/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || \
gh api -X PUT "repos/$OWNER/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true

echo
echo "Готово: $PAGES_URL"
echo "(первая публикация поднимается 1–2 минуты)"
