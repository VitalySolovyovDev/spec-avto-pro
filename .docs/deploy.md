# Деплой и хостинг

## Beget shared hosting: рабочая схема

Проект сейчас деплоится на виртуальный хостинг Beget по **SSH/SFTP**, а Node-приложение запускается через **Passenger**.

`npm run deploy`:

1. собирает frontend и backend;
2. подключается к серверу по SSH;
3. очищает `public_html` и старую папку `backend`;
4. загружает новую статику и backend bundle;
5. загружает корневой `.htaccess` с Passenger-конфигурацией;
6. триггерит restart через `backend/tmp/restart.txt`;
7. проверяет `GET /` и `POST /api/contact`.

## Требования на сервере

- SSH-доступ к аккаунту
- сайт уже создан в Beget и привязан к домену
- в аккаунте уже установлен Node.js и доступен как `~/.local/bin/node`
- для каталога `~/.local` в панели Beget открыт общий доступ для сайта
- на сервере существует директория сайта `spec-avto.pro/public_html`

## Локальная подготовка

```bash
npm run build
```

Собирает:

- `frontend/dist/` — статические HTML/CSS/JS/assets
- `backend/dist/server.js` — backend bundle
- `backend/dist/.htaccess` — готовый Passenger-конфиг для корня сайта, скопированный из `backend/passenger.htaccess`

Для полного цикла деплоя:

```bash
npm run deploy
```

## Переменные окружения

Deploy-скрипт использует:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PASSWORD`
- `SSH_SITE_DIR`
- `DEPLOY_SITE_URL`

## Структура на хостинге

После успешного деплоя на текущем Beget layout такой:

```text
/home/v/vitlsat4/spec-avto.pro/
├── .htaccess
├── backend/
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

Успешный деплой должен давать:

- `GET /` → `200`
- `POST /api/contact` → `200` и тело `It works`

Также при повторном деплое старые файлы в `backend/` и `public_html/` удаляются перед новой выгрузкой.

## Вариант без Node.js

Если нужен только статический хостинг, можно вручную загрузить содержимое `frontend/dist` без backend.

В этом режиме форма работать не будет, потому что `/api/contact` отсутствует.
