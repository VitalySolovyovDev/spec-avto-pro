# Деплой и хостинг

## Beget shared hosting: рабочая схема

Проект деплоится на виртуальный хостинг Beget по **SSH/SFTP**, а Node-приложение запускается через **Passenger**. Постоянное хранилище Telegram-подписчиков теперь живет в **MySQL/MariaDB**, а не в `TG_CHAT_ID`/`TG_CHAT_IDS`.

`npm run deploy`:

1. собирает frontend и backend;
2. подключается к серверу по SSH;
3. очищает `public_html` и старую папку `backend`;
4. загружает новую статику, backend bundle и runtime `.env` для backend;
5. загружает корневой `.htaccess` с Passenger-конфигурацией;
6. триггерит restart через `backend/tmp/restart.txt`;
7. проверяет `GET /` и `POST /api/contact`.

## Требования на сервере

- SSH-доступ к аккаунту
- сайт уже создан в Beget и привязан к домену
- в аккаунте уже установлен Node.js и доступен как `~/.local/bin/node`
- для каталога `~/.local` в панели Beget открыт общий доступ для сайта
- на сервере существует директория сайта `spec-avto.pro/public_html`
- в панели Beget создана база MySQL/MariaDB и пользователь с доступом к ней

## Локальная подготовка

```bash
npm run build
```

Собирает:

- `frontend/dist/` — статические HTML/CSS/JS/assets
- `backend/dist/server.js` — backend bundle
- `backend/dist/.htaccess` — готовый Passenger-конфиг для корня сайта, скопированный из `backend/passenger.htaccess`

В backend entrypoint для сборки остается `backend/server.js`, но сам сервер теперь собран модульно через `backend/app.js`, `backend/routes/`, `backend/services/`, `backend/middleware/` и `backend/lib/`.

Для полного цикла деплоя:

```bash
npm run deploy
```

Для регистрации webhook после выкладки:

```bash
npm run telegram:webhook
```

Обычно эту команду достаточно выполнить один раз после первого деплоя. Повторный запуск нужен, если изменились домен, путь webhook, `TG_WEBHOOK_SECRET` или токен бота.

## Переменные окружения

Deploy-скрипт использует:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PASSWORD`
- `SSH_SITE_DIR`
- `DEPLOY_SITE_URL`

Если в локальном `.env` есть runtime-переменные backend, при деплое они синхронизируются в `backend/.env`. Для runtime нужны:

- `TG_BOT_TOKEN` или текущий совместимый алиас `SAP_TG`
- `TG_API` — опционально, если нужен кастомный Telegram API base URL
- `TG_WEBHOOK_SECRET`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_CONNECTION_LIMIT` — опционально

Для разделения local/prod можно дополнительно задать:

- `MYSQL_REMOTE_CONNECTION_PASS` — локальный пароль для удаленного доступа к Beget MySQL, если он отличается от server-side пароля
- `MYSQL_LOCAL_HOST`, `MYSQL_LOCAL_PORT`, `MYSQL_LOCAL_DATABASE`, `MYSQL_LOCAL_USER`, `MYSQL_LOCAL_PASSWORD` — опциональные локальные override-значения
- `MYSQL_PROD_HOST`, `MYSQL_PROD_PORT`, `MYSQL_PROD_DATABASE`, `MYSQL_PROD_USER`, `MYSQL_PROD_PASSWORD` — опциональные production override-значения для `backend/.env`
- `MYSQL_PROD_CONNECTION_LIMIT` — опциональный лимит соединений для production runtime

Для команды `npm run telegram:webhook` можно дополнительно задать:

- `TG_WEBHOOK_URL` — опционально; если не задан, URL строится из `DEPLOY_SITE_URL` как `/api/telegram/webhook`

`TG_CHAT_ID` и `TG_CHAT_IDS` больше не используются.

## MySQL/MariaDB: схема хранения подписчиков

Backend автоматически создает таблицу `telegram_subscribers` при первом успешном подключении к базе. В ней используются поля:

- `chat_id`
- `username`
- `first_name`
- `last_name`
- `status` со значениями `active` или `stopped`
- `subscribed_at`
- `updated_at`

### Production на Beget

На shared hosting Beget штатная схема такая:

- `MYSQL_PROD_HOST=localhost`
- `MYSQL_PROD_PORT=3306`
- `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` берутся из панели Beget

При `npm run deploy` эти значения попадут в production runtime `.env` как обычные `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`.

Пример runtime-набора для production:

```dotenv
TG_BOT_TOKEN=123456:telegram-bot-token
TG_WEBHOOK_SECRET=replace-with-long-random-secret
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=specavto
MYSQL_USER=specavto_user
MYSQL_PASSWORD=replace-with-db-password
```

### Локальная разработка

Для локальной разработки используется та же Beget-база:

- в панели Beget открыть доступ к MySQL с вашего внешнего IP;
- взять внешний MySQL host из панели Beget и поставить его в `MYSQL_HOST` или `MYSQL_LOCAL_HOST`;
- использовать те же `MYSQL_DATABASE` и `MYSQL_USER`;
- если для внешних подключений Beget выдает отдельный пароль, положить его в `MYSQL_REMOTE_CONNECTION_PASS` или `MYSQL_LOCAL_PASSWORD`;
- `MYSQL_PORT` обычно остается `3306`, если панель не показывает другое значение.

Так локальная разработка работает на той же схеме и на тех же данных, что и production.

Пример локального `.env`:

```dotenv
TG_BOT_TOKEN=123456:telegram-bot-token
TG_WEBHOOK_SECRET=replace-with-long-random-secret
MYSQL_HOST=mysql123.beget.com
MYSQL_PORT=3306
MYSQL_DATABASE=specavto
MYSQL_USER=specavto_user
MYSQL_PASSWORD=server-side-password
MYSQL_REMOTE_CONNECTION_PASS=remote-access-password
MYSQL_PROD_HOST=localhost
DEPLOY_SITE_URL=https://spec-avto.pro
```

## Telegram webhook

Backend принимает `POST /api/telegram/webhook` и проверяет заголовок `X-Telegram-Bot-Api-Secret-Token`.

Поведение команд:

- `/start` — переводит чат в статус `active`
- `/stop` и `/unsubscribe` — переводят чат в статус `stopped`
- `POST /api/contact` отправляет новую заявку всем подписчикам со статусом `active`

### Первая настройка

1. Создать MySQL/MariaDB базу в панели Beget и записать ее host/user/password.
2. Заполнить локальный `.env` runtime-переменными для Telegram и MySQL.
3. Выполнить `npm run deploy`.
4. Выполнить `npm run telegram:webhook`.
5. Отправить боту `/start` из каждого менеджерского чата, который должен получать лиды.

Для отписки конкретного чата использовать `/stop` или `/unsubscribe`.

## Структура на хостинге

После успешного деплоя layout такой:

```text
/home/v/vitlsat4/spec-avto.pro/
├── .htaccess
├── backend/
│   ├── .env
│   ├── dist/
│   │   └── server.js
│   └── tmp/
│       └── restart.txt
└── public_html/
    ├── index.html
    ├── privacy.html
    ├── js/
    ├── css/
    └── assets/
```

### Что важно в этой схеме

- `public_html/` — только публичная статика
- `backend/` — app root для Passenger
- `spec-avto.pro/.htaccess` — Passenger-конфиг сайта
- `backend/.env` — runtime-конфиг backend; при каждом деплое пересоздается из локального `.env`
- `backend/tmp/restart.txt` — restart trigger для Passenger

`public_html/.well-known` при очистке сохраняется.

## Passenger-конфиг

`.htaccess` загружается в корень сайта из `backend/dist/.htaccess` и содержит:

- `PassengerNodejs /.../.local/bin/node`
- `PassengerAppRoot /.../backend`
- `PassengerStartupFile dist/server.js`
- `SetEnv NODE_ENV production`
- `SetEnv APP_PUBLIC_DIR /.../public_html`

Если меняется путь к Node.js, доменная директория или app root на хостинге, править нужно `backend/passenger.htaccess` перед сборкой и деплоем.

## Проверка после деплоя

Технический healthcheck деплоя должен давать:

- `GET /` → `200`
- `POST /api/contact` с `{"source":"deploy-healthcheck"}` → `200` и тело `It works`

Этот `POST /api/contact` probe дополнительно проверяет, что backend видит обязательный Telegram runtime-конфиг и может подключиться к MySQL/MariaDB.

Операционная проверка после настройки runtime:

- `npm run telegram:webhook` завершается без ошибки
- бот отвечает подтверждением на `/start`
- после `/start` заявка из формы приходит во все активные менеджерские чаты

При повторном деплое старые файлы в `backend/` и `public_html/` удаляются перед новой выгрузкой, после чего `backend/.env` загружается заново.

## Вариант без Node.js

Если нужен только статический хостинг, можно вручную загрузить содержимое `frontend/dist` без backend.

В этом режиме форма и Telegram webhook работать не будут, потому что `/api/contact` и `/api/telegram/webhook` отсутствуют.
