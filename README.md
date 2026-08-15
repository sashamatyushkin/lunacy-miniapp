# Lunacy — Telegram Mini App

Магазин игровой периферии Lunacy внутри Telegram. Визуальный язык перенесён с [lunacy.ru](https://www.lunacy.ru): тёмная монохромная палитра, Inter, `border-radius: 3px`, заголовки строчными.

Что в нём есть сверх обычного каталога:

- **Клавиатура, которая собирается на скролле.** 62 клавиши разлетаются в 3D и складываются в 60%-раскладку по мере прокрутки ленты. Блок прилипает к верху экрана, чтобы сборка заканчивалась в поле зрения. Клавиши `6` и `7` подсвечены белым.
- **Жест 67.** Две ладони качаются в противофазе, цифры загораются по очереди — тот самый «шесть… семь». Используется в шапке, в отдельном блоке ленты, в пустых состояниях и на экране оплаченного заказа.
- **Сторис.** Кольцевая лента с полноэкранным просмотрщиком: прогресс-бары, автопереход, тапы влево/вправо, свайп вниз для закрытия, Ken Burns на фото.
- **Полноэкранный запуск.** `expand()` + `requestFullscreen()` вызываются в `<head>` до загрузки бандла, поэтому верхняя шторка Telegram не успевает отрисоваться. Фон закрашен ещё до монтирования React — белой вспышки нет.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7, TanStack Query 5, Zustand 5, Motion |
| Backend | Node 22, Fastify 5, TypeScript, Zod, JWT |
| БД | PostgreSQL 16, Prisma 6 |
| Инфраструктура | Docker Compose, nginx |

Начальная загрузка — ~90 КБ gzip; экраны и просмотрщик сторис приходят отдельными чанками.

## Структура

```
Lunacy/
├── apps/
│   ├── api/
│   │   ├── prisma/           схема, миграции, сид реальным каталогом
│   │   └── src/
│   │       ├── lib/          env, prisma, telegram (HMAC + Bot API), auth
│   │       └── routes/       auth, catalog, cart, orders, telegram, analytics
│   └── web/
│       ├── public/
│       │   ├── products/     фото товаров (положить сюда)
│       │   └── stories/      story-1..3.webp
│       └── src/
│           ├── components/   Keyboard3D, SixSeven, Stories, ProductCard, ui, BottomNav
│           ├── screens/      Feed, Catalog, ProductScreen, Cart, Checkout, OrderScreen, Profile
│           ├── lib/          api, telegram, tgHooks, analytics, types
│           └── store/        session, cart
├── docker-compose.yml
├── PLAN.md                   логика магазина и пошаговый план
└── .env.example
```

## Запуск локально

### 1. Зависимости и переменные

```bash
npm install
```

```bash
cp .env.example .env && cp apps/web/.env.example apps/web/.env
```

Заполнить в `.env` как минимум:

```
BOT_TOKEN=            # @BotFather
JWT_SECRET=           # openssl rand -hex 32
WEBAPP_URL=           # https-адрес Mini App
API_PUBLIC_URL=       # https-адрес API
```

### 2. База

С Docker:

```bash
docker compose up -d db
```

Без Docker (локальный PostgreSQL):

```bash
psql -d postgres -c "CREATE ROLE lunacy LOGIN PASSWORD 'lunacy' CREATEDB;" -c "CREATE DATABASE lunacy OWNER lunacy;"
```

Миграции и каталог:

```bash
npm run db:migrate && npm run db:seed
```

### 3. Всё сразу — одной командой

```bash
npm run up
```

Скрипт поднимает API :3001 → фронтенд :5173 → публичный HTTPS-туннель → прописывает адрес в `.env` → обновляет `api-endpoint.json` на Pages → привязывает вебхук бота и кнопку меню. В конце печатает адрес Mini App и имя бота.

Остановить:

```bash
npm run down
```

`down` ещё и снимает вебхук, чтобы Telegram не долбился в мёртвый туннель.

Только локально, без туннеля и бота:

```bash
npm run dev
```

API — `http://localhost:3001`, фронтенд — `http://localhost:5173`. Vite проксирует `/api` в Fastify, поэтому Mini App и API живут на одном origin и одного туннеля хватает на оба.

Вне Telegram приложение намеренно показывает экран «откройте через бота»: `initData` нет, а серверная авторизация не принимает ничего, кроме подписанных данных.

## Telegram

### Бот и Mini App

`npm run up` делает всё сам: туннель, `setWebhook`, `setChatMenuButton`, `setMyCommands`. Вручную нужен только `BOT_TOKEN` из `@BotFather` в `.env`.

Единственное, что нельзя сделать скриптом, — зарегистрировать Mini App как отдельное приложение: `@BotFather` → `/newapp` → выбрать бота → указать адрес Pages → short name (например `shop`, он же `VITE_APP_SHORTNAME`). Без этого магазин открывается кнопкой меню и по `/start`, но реферальные ссылки вида `t.me/<bot>/<shortname>?startapp=…` не работают.

## Как это развёрнуто (как в LIT)

Витрина **полностью статическая** и живёт на GitHub Pages — по образцу проекта LIT. Это ключевое решение: у бесплатных туннелей есть страницы-заглушки, которые ломают CORS-preflight внутри Telegram, поэтому магазин НЕ зависит от туннеля к бэкенду.

- **Каталог зашит в сборку** (`apps/web/src/data/catalog.json`, генерится из сида БД). Категории, товары, цены, характеристики — всё внутри бандла.
- **Корзина и заказы — в localStorage устройства.** Никакого сервера для просмотра и оформления.
- **Авторизация клиентская:** имя и аватар берутся из `Telegram.WebApp.initDataUnsafe`. «Нет соединения» не показывается никогда — сервер не нужен.
- **Бот — long-polling** (`bot/index.ts`), без вебхука и туннеля. Ему нужен только исходящий интернет. По `/start` и кнопке «магазин» открывает Mini App на Pages.

Итог: **приложение работает, даже когда Mac выключен** — Pages отдаёт статику всегда. Mac нужен только чтобы бот отвечал на `/start`; но кнопка «магазин» в меню открывает витрину и без бота.

Серверная часть (Fastify + Prisma + PostgreSQL с реальной авторизацией, заказами и оплатой Telegram) осталась в `apps/api` — включается флагом `VITE_STATIC=0` для «взрослой» версии, когда понадобятся серверные заказы и платежи.

## Запуск

**Витрина уже опубликована** и обновляется одной командой:

```bash
npm run deploy
```

Собирает статику (`VITE_STATIC=1`) и публикует в ветку `gh-pages`. Адрес: https://sashamatyushkin.github.io/lunacy-miniapp/

**Бот** (long-polling, чтобы отвечал на `/start`):

```bash
npm run bot
```

Держите процесс запущенным, пока нужен ответ на `/start`. Кнопка «магазин» в меню бота работает всегда, даже без запущенного бота.

## Обновить каталог

Каталог — статический JSON. Отредактируйте сид `apps/api/prisma/seed.ts`, пересоберите данные и задеплойте:

```bash
npm run db:seed
```

(экспорт в `apps/web/src/data/catalog.json` — командой из README раздела «данные»), затем `npm run deploy`.

## API

```
POST /api/auth/telegram      обмен initData на JWT
GET  /api/auth/me
GET  /api/categories
GET  /api/products           ?category= &q= &popular= &take= &skip=
GET  /api/products/:slug     товар + похожие
GET  /api/stories
GET|POST|PATCH|DELETE /api/cart
GET  /api/orders             история
POST /api/orders/checkout    заказ + invoice link
POST /api/orders/:id/pay     повторный счёт
POST /api/telegram/webhook   только с секретным заголовком Telegram
POST /api/events             аналитика, имена событий по белому списку
```

Все мутирующие маршруты требуют `Authorization: Bearer <jwt>`. Rate limit — 120 запросов в минуту на IP, вебхук бота исключён.

## Безопасность

- `initData` проверяется HMAC-SHA256 по официальному алгоритму, с TTL и `timingSafeEqual`; данные пользователя с фронтенда не принимаются никогда.
- Вебхук бота аутентифицируется секретным заголовком Telegram.
- Суммы заказов считаются на сервере по серверной корзине.
- Все входные данные валидируются Zod, ошибки 5xx не раскрывают внутренности наружу.
- Секретов во фронтенд-бандле нет: `VITE_*` содержат только публичный адрес API и имя бота.

## Деплой

```bash
docker compose up -d --build
```

Поднимет PostgreSQL, API (миграции применяются на старте) и nginx со статикой. В продакшне поставить API и фронтенд за один домен или прописать домен фронтенда в `CORS_ORIGIN`.

Пошаговый план и оставшиеся задачи — в [PLAN.md](PLAN.md).
