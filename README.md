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

Скрипт поднимает API :3001 → фронтенд :5173 → публичный HTTPS-туннель → прописывает адрес в `.env` → привязывает вебхук бота и кнопку меню. В конце печатает адрес Mini App и имя бота.

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

Единственное, что нельзя сделать скриптом, — зарегистрировать Mini App как отдельное приложение: `@BotFather` → `/newapp` → выбрать бота → указать текущий `WEBAPP_URL` → short name (например `shop`, он же `VITE_APP_SHORTNAME`). Без этого магазин открывается кнопкой меню и по `/start`, но реферальные ссылки вида `t.me/<bot>/<shortname>?startapp=…` не работают.

### Туннель

Скрипт сначала пробует `cloudflared`, а если тот не пробивается — переключается на `localtunnel` с фиксированным поддоменом (`TUNNEL_SUBDOMAIN`, по умолчанию `lunacyapp67`), чтобы адрес не менялся между перезапусками.

Cloudflared ходит к своим edge-адресам по UDP :7844 (QUIC) или TCP 443 (`--protocol http2`); VPN и часть провайдеров режут и то и другое — в логе `/tmp/lunacy-tunnel.log` это видно как `failed to dial to edge` или `TLS handshake with edge error`. Именно поэтому в скрипте есть запасной путь.

### Deep links

`t.me/<bot>/<shortname>?startapp=ref_<code>` — реферальная ссылка. `start_param` разбирается при первой авторизации, приглашённый закрепляется за пригласившим. Ссылку пользователь берёт в профиле.

## Платежи

По умолчанию `PAYMENT_CURRENCY=XTR` — **Telegram Stars**, платёжный провайдер не нужен, работает сразу. `RUB_PER_STAR` задаёт курс пересчёта из рублей каталога.

Для рублёвой оплаты: получить provider token (ЮKassa через BotFather), выставить `PAYMENT_CURRENCY=RUB` и `PAYMENT_PROVIDER_TOKEN`. Суммы уйдут в копейках.

Порядок подтверждения:

1. `POST /api/orders/checkout` — сервер считает сумму по собственной корзине, создаёт заказ, просит у Telegram invoice link.
2. `pre_checkout_query` — сервер сверяет сумму со своей записью `Payment` и только тогда отвечает `ok`.
3. `successful_payment` — заказ переходит в `PAID`, сохраняется charge id.

Повторная доставка того же вебхука ничего не меняет: `Payment.payload` уникален, а переход в `PAID` выполняется один раз. Клиент не может пометить заказ оплаченным.

## Ассеты

Сторис уже подключены. Фото товаров пока нет — вместо них карточка рисует сгенерированный монохромный постер, ничего не ломается.

- **Товары:** `apps/web/public/products/<slug>.webp`, где slug — из `apps/api/prisma/seed.ts` (`moonlight.webp`, `another-one.webp`, `louder-black.webp`, …).
- **Сторис:** уже на месте — `apps/web/public/stories/story-1..3.webp` (JetCar, ночная заправка, Пхукет). Верхняя панель исходников обрезана; кнопка play вшита в пиксели исходных кадров и остаётся в центре кадра.

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
