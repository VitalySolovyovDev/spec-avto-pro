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
│   └── server.js
├── frontend/
│   ├── package.json
│   ├── rspack.config.js
│   ├── src/
│   └── dist/            # результат production-сборки
├── package.json         # корневой: dev, build, start
├── scripts/
│   ├── deploy.js        # FTP-загрузка из frontend/dist
│   └── tg.js
└── .docs/
```

### Корень

- `package.json` — скрипты: `dev` (frontend + backend), `build` (frontend + backend), `start` (prod backend), `deploy`.
- `scripts/deploy.js` — деплой статики из `frontend/dist` на FTP.

### Backend

- `backend/server.js` — исходник Express-сервера.
- `backend/dist/server.js` — прод-бандл (esbuild), один файл с зависимостями.
- Обрабатывает `POST /api/contact`.
- **Dev:** проксирует не-API-запросы на Rspack (порт 3001).
- **Prod:** раздаёт статику из `frontend/dist`.

### Frontend

- `frontend/rspack.config.js` — конфигурация сборки.
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

- `npm run build` — собирает фронтенд в `frontend/dist` и backend в `backend/dist/server.js`.
- `npm run start` — запускает бандл backend; раздаёт статику и обрабатывает API.

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
- API — backend как gateway; дальнейшая интеграция (Telegram и т.п.) — в `scripts/tg.js` и хендлерах.

## Деплой

См. **[deploy.md](deploy.md)** — подготовка, структура на хостинге, варианты (FTP / Node.js).
