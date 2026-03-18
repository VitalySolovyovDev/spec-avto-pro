# Архитектура проекта

## Назначение

Проект — многостраничный сайт с backend-шлюзом: статический фронтенд на `Rspack` и Node.js + Express для API.
Страницы:

- `index.html` — основной лендинг.
- `privacy.html` — страница политики конфиденциальности.

## Структура

```
/
├── backend/              # Node.js + Express (единая точка входа)
│   ├── package.json
│   ├── passenger.htaccess
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
│   └── tg.js
└── .docs/
```

### Корень

- `package.json` — скрипты: `dev`, `build`, `start`, `deploy:upload`, `deploy`, `check-engines`.
- `scripts/deploy.js` — выкладывает собранный frontend и backend на Beget по SSH/SFTP, перезапускает Passenger и делает healthcheck.
- `scripts/check-engines.js` — помогает актуализировать `engines.node` и `engines.npm` по зависимостям.

### Backend

- `backend/server.js` — исходник Express-сервера.
- `backend/passenger.htaccess` — исходник Passenger-конфига; при сборке копируется в `backend/dist/.htaccess`.
- `backend/dist/server.js` — прод-бандл (esbuild), один файл с зависимостями.
- Обрабатывает `POST /api/contact`.
- **Dev:** проксирует не-API-запросы на Rspack (порт 3001).
- **Prod:** любой режим, кроме `development`, считает production и раздаёт статику из первой найденной директории: `APP_PUBLIC_DIR`, `frontend/dist` или `public_html`.

### Frontend

- `frontend/rspack.config.js` — конфигурация сборки: две HTML-страницы, копирование `assets/`, dev-proxy `/api` на backend.
- `frontend/src/` — исходники сайта.
- `frontend/dist/` — результат сборки (используется backend в prod и deploy).

### Исходники сайта (`frontend/src/`)

- `src/index.html` — шаблон главной страницы.
- `src/privacy.html` — шаблон страницы политики.
- `src/index.js` — entrypoint главной страницы.
- `src/privacy.js` — entrypoint страницы политики.
- `src/scripts/main.js` — интерактивность лендинга.
- `src/styles.css` — агрегатор CSS для главной страницы.
- `src/privacy.css` — агрегатор CSS для страницы политики.
- `src/styles/variables.css` — дизайн-токены и подключение шрифтов.
- `src/styles/base.css` — reset, базовые HTML-правила, контейнеры и общие утилиты.
- `src/styles/components.css` — переиспользуемые блоки интерфейса.
- `src/styles/sections.css` — layout и стили конкретных секций лендинга.
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
- API — backend как gateway; реальная обработка заявок для `/api/contact` пока не реализована, а `scripts/tg.js` сейчас содержит только список Telegram recipient ID.

## Деплой

См. **[deploy.md](deploy.md)** — текущая схема выкладки на Beget через SSH/SFTP и Passenger.
