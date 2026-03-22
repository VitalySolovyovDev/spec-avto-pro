# Архитектура проекта

## Назначение

Проект — многостраничный сайт с backend-шлюзом: статический фронтенд на `Rspack` и Node.js + Express для API.
Страницы:

- `index.html` — основной лендинг.
- `privacy.html` — страница политики конфиденциальности.

## Структура

```
/
├── backend/              # Node.js + Express
│   ├── app.js            # сборка Express-приложения
│   ├── lib/              # env/config, HTTP-утилиты, MySQL и Telegram API
│   ├── middleware/       # middleware для webhook-авторизации
│   ├── package.json
│   ├── passenger.htaccess
│   ├── routes/           # HTTP-маршруты API
│   ├── services/         # бизнес-логика заявок и Telegram webhook
│   └── server.js
├── frontend/
│   ├── package.json
│   ├── rspack.config.js
│   ├── src/
│   └── dist/            # результат production-сборки
├── package.json         # корневой: dev, build, start, deploy
├── scripts/
│   ├── deploy.js        # SSH/SFTP-деплой на Beget + healthcheck
│   ├── check-engines.js # проверка минимальных Node/npm версий
│   └── set-telegram-webhook.js
└── .docs/
```

### Корень

- `package.json` — скрипты: `dev`, `build`, `start`, `deploy:upload`, `deploy`, `telegram:webhook`, `check-engines`.
- `scripts/deploy.js` — выкладывает собранный frontend и backend на Beget по SSH/SFTP, перезапускает Passenger и делает healthcheck.
- `scripts/check-engines.js` — помогает актуализировать `engines.node` и `engines.npm` по зависимостям.
- `scripts/set-telegram-webhook.js` — регистрирует production webhook в Telegram Bot API.

### Backend

- `backend/server.js` — bootstrap-файл: загружает env, прогревает MySQL pool и запускает HTTP-сервер.
- `backend/app.js` — собирает Express app, подключает API, frontend static/proxy и error handler.
- `backend/lib/runtime-env.js` — загрузка `.env` из backend/root окружения.
- `backend/lib/config.js` — нормализация runtime-конфига Telegram и MySQL.
- `backend/lib/server-config.js` — host/port/frontend port и поиск production static директории.
- `backend/lib/http.js` — `asyncHandler` и единый JSON error handler.
- `backend/lib/text.js` — базовые нормализаторы строковых полей.
- `backend/lib/mysql.js` — пул MySQL/MariaDB и auto-create таблицы `telegram_subscribers`.
- `backend/lib/telegram-subscribers.js` — CRUD-операции для подписчиков со статусами `active`/`stopped`.
- `backend/lib/telegram-api.js` — отправка сообщений и настройка webhook через Telegram Bot API.
- `backend/middleware/telegram-webhook-auth.js` — проверяет `X-Telegram-Bot-Api-Secret-Token`.
- `backend/routes/contact.js` — `POST /api/contact`.
- `backend/routes/telegram-webhook.js` — `POST /api/telegram/webhook`.
- `backend/routes/api.js` — агрегатор API-роутов.
- `backend/services/contact-service.js` — healthcheck, сборка lead-сообщения и рассылка активным подписчикам.
- `backend/services/telegram-webhook-service.js` — обработка `/start`, `/stop`, `/unsubscribe`.
- `backend/passenger.htaccess` — исходник Passenger-конфига; при сборке копируется в `backend/dist/.htaccess`.
- `backend/dist/server.js` — прод-бандл (esbuild), один файл с зависимостями.
- Обрабатывает `POST /api/contact` и `POST /api/telegram/webhook`.
- **Dev:** проксирует не-API-запросы на Rspack (порт 3001).
- **Prod:** любой режим, кроме `development`, считает production и раздаёт статику из первой найденной директории: `APP_PUBLIC_DIR`, `frontend/dist` или `public_html`.

### Frontend

- `frontend/rspack.config.js` — конфигурация сборки: две HTML-страницы, копирование `assets/`, dev-proxy `/api` на backend.
- `frontend/src/` — исходники сайта.
- `frontend/dist/` — результат сборки (используется backend в prod и deploy).

### Исходники сайта (`frontend/src/`)

- `src/index.html` — шаблон главной страницы с hero, секциями услуг, процесса работы, секцией стоимости, legal-panel, отзывами, FAQ и формой заявки.
- `src/privacy.html` — шаблон страницы политики.
- `src/index.js` — entrypoint главной страницы.
- `src/privacy.js` — entrypoint страницы политики.
- `src/scripts/main.js` — интерактивность лендинга.
- `src/styles.css` — агрегатор CSS для главной страницы.
- `src/privacy.css` — агрегатор CSS для страницы политики.
- `src/styles/variables.css` — дизайн-токены и подключение шрифтов.
- `src/styles/base.css` — reset, базовые HTML-правила, контейнеры и общие утилиты.
- `src/styles/components.css` — переиспользуемые блоки интерфейса, включая карточки и CTA-блок секции стоимости.
- `src/styles/sections.css` — layout и стили конкретных секций лендинга, включая сетку и responsive-правила секции стоимости.
- `src/styles/privacy-page.css` — стили страницы политики.
- `src/assets/` — изображения и шрифты.

## Режимы работы

### Разработка (`npm run dev`)

- Запускаются: frontend (Rspack dev server на 3001) и backend (на 3000).
- Вход: `http://localhost:3000` — backend проксирует HTML/JS/CSS/HMR на Rspack.
- Если открыть `http://localhost:3001` напрямую — Rspack проксирует `/api/*` на backend.
- `predev` освобождает порты 3000 и 3001.

### Продакшен (`npm run build` + `npm run start`)

- `npm run build` — собирает фронтенд в `frontend/dist`, backend в `backend/dist/server.js` и копирует `backend/passenger.htaccess` в `backend/dist/.htaccess`.
- `npm run start` — запускает бандл backend локально; на хостинге тот же `backend/dist/server.js` стартует через Passenger.

## Поток сборки фронтенда

1. Rspack берёт `src/index.js` и `src/privacy.js` как точки входа.
2. `HtmlRspackPlugin` использует `src/index.html` и `src/privacy.html` как HTML-шаблоны.
3. CSS подключается через JS-entrypoint соответствующей страницы.
4. `CopyRspackPlugin` копирует `src/assets/` в `dist/assets/`.
5. В production-режиме CSS извлекается в отдельные файлы, `dist/` очищается перед сборкой.

## Поведение страниц

### Главная страница

В `frontend/src/scripts/main.js`:

- раскрытие/скрытие мобильного меню;
- аккордеон блока FAQ;
- форма отправляется через `POST /api/contact` (JSON); `mailto:` не используется.

### Политика конфиденциальности

Страница статическая, без отдельной клиентской логики.

## Технические решения

- Иконки — inline SVG sprite в шаблоне главной страницы.
- Медиа и шрифты загружаются только из локальных файлов.
- Верстка на глобальном CSS без фреймворков.
- Backend собран модульно: bootstrap, маршруты, middleware и сервисы разделены, поэтому `server.js` больше не содержит бизнес-логику.
- API — backend как gateway; заявки из `/api/contact` рассылаются всем активным Telegram-подписчикам, а сами подписчики управляются через webhook-команды `/start`, `/stop` и `/unsubscribe`.

## Деплой

См. **[deploy.md](deploy.md)** — текущая схема выкладки на Beget через SSH/SFTP и Passenger.
