# Деплой и хостинг

## Вариант A: только статика (FTP)

`npm run deploy` = `npm run build` + FTP-загрузка содержимого `frontend/dist` на хостинг.

Форма в этом случае работать не будет — нет backend для `/api/contact`.

---

## Вариант B: Node.js-хостинг (статика + API)

Backend собирается в один JS-бандл (esbuild). На хостинг загружаете только готовые файлы — **никакого node_modules и npm install**.

### Требования на сервере

- Node.js (без npm)
- Возможность запускать процесс: `node backend/dist/server.js` (через PM2, systemd, панель хостинга и т.п.)

### Подготовка локально

```bash
npm run build
```

Собирает:
- `frontend/dist/` — статика (HTML, JS, CSS, assets)
- `backend/dist/server.js` — один файл ~900KB с express и всем backend-кодом

### Структура папок и файлов на хостинге

```
/app/                      ← корень проекта (рабочая директория при запуске)
├── backend/
│   └── dist/
│       └── server.js      ← один бандл, зависимости уже внутри
│
├── frontend/
│   └── dist/              ← статика
│       ├── index.html
│       ├── privacy.html
│       ├── js/
│       │   ├── main.[hash].js
│       │   └── privacy.[hash].js
│       ├── css/
│       │   └── main.[hash].css
│       ├── assets/
│       │   ├── images/
│       │   └── fonts/
│       └── [шрифты .woff2]
│
└── package.json           ← опционально, для npm run start
```

**Важно:** Запуск выполняется **из корня** (`/app/`), чтобы backend корректно находил `frontend/dist` по относительному пути.

### Что загружать

Загружайте только:

1. `backend/dist/server.js`
2. Содержимое `frontend/dist/` (все файлы и папки внутри)

Корневой `package.json` — опционально, если хотите использовать `npm run start`.

### Запуск

```bash
node backend/dist/server.js
```

Или из корня, если загружен `package.json`:

```bash
npm run start
```

### Переменные окружения

| Переменная | Описание |
|------------|----------|
| `PORT` | Порт сервера (по умолчанию 3000) |
| `NODE_ENV` | Обычно `production`; хостинг часто выставляет сам |
