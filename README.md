# СПЕЦ-АВТО.ПРО

Проект сайта компании СПЕЦ-АВТО.ПРО: frontend на `Rspack` и backend на `Node.js + Express`.

## Стек

- `Rspack`
- `Node.js`
- `Express`
- `MySQL/MariaDB`
- `Telegram Bot API`
- Vanilla JavaScript
- Глобальные CSS-стили
- Локальные изображения, шрифты и SVG-иконки

## Основные команды

```bash
npm install
```

```bash
npm run dev
```

Запускает:

- backend на `http://localhost:3000`
- frontend dev server на `http://localhost:3001`

Основной адрес в разработке: `http://localhost:3000`.

Собирает:

- `frontend/dist`
- `backend/dist/server.js`

```bash
npm run build
```

Запускает production bundle backend локально.

```bash
npm run start
```

Запускает сборку и выкладывает проект на Beget по SSH/SFTP.

```bash
npm run deploy
```

Регистрирует production webhook `POST /api/telegram/webhook` в Telegram Bot API.

```bash
npm run telegram:webhook
```

## Структура проекта

- `frontend/src/` — исходники страниц, стилей и клиентского JS
- `frontend/dist/` — production-сборка фронтенда
- `frontend/rspack.config.js` — конфиг фронтенд-сборки
- `backend/server.js` — bootstrap backend и точка входа для сборки
- `backend/app.js` — сборка Express-приложения
- `backend/routes/` — HTTP-маршруты API
- `backend/services/` — бизнес-логика заявок и Telegram webhook
- `backend/middleware/` — middleware для webhook-авторизации
- `backend/lib/` — env/config, Telegram API и MySQL-слой подписчиков
- `backend/passenger.htaccess` — исходник Passenger-конфига для Beget
- `backend/dist/server.js` — production bundle backend
- `scripts/deploy.js` — деплой на Beget shared hosting
- `scripts/set-telegram-webhook.js` — установка Telegram webhook
- `.docs/architecture.md` — архитектура проекта
- `.docs/deploy.md` — деплой и layout на хостинге

## Что делает backend

- обрабатывает `POST /api/contact`
- обрабатывает `POST /api/telegram/webhook`
- хранит Telegram-подписчиков в MySQL/MariaDB и рассылает заявки активным чатам
- собирается из отдельных `routes/`, `services/`, `middleware/` и `lib/`, а не из одного большого файла
- в dev проксирует не-API запросы на Rspack dev server
- в production может раздавать статику, если запущен как обычный Node-сервер

## Важные замечания

- Все медиа, шрифты и иконки хранятся локально внутри `frontend/src/assets`.
- Страница `privacy.html` пока оформлена как рабочая заглушка и требует замены на утвержденный юридический текст перед публикацией.
- Карта на главной странице оставлена как placeholder под будущую интеграцию.

## Деплой

Рабочая схема прод-деплоя описана в `.docs/deploy.md`.

Коротко:

- статика загружается в `public_html`
- backend bundle загружается в `backend/dist/server.js`
- Passenger запускает backend через корневой `.htaccess`
- `PassengerNodejs` указывает прямо на `~/.local/bin/node`
- deploy-скрипт сам чистит старую выкладку, делает restart и healthcheck

