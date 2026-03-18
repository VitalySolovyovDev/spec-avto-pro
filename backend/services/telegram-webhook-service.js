const crypto = require('crypto');
const { getTelegramWebhookSecret } = require('../lib/config');
const { sendTelegramMessage } = require('../lib/telegram-api');
const { activateSubscriber, stopSubscriber } = require('../lib/telegram-subscribers');
const { normalizeText } = require('../lib/text');

function compareSecrets(expectedSecret, receivedSecret) {
  if (!expectedSecret || !receivedSecret) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSecret);
  const receivedBuffer = Buffer.from(receivedSecret);

  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isTelegramWebhookAuthorized(secretHeader) {
  const expectedSecret = getTelegramWebhookSecret();

  if (!expectedSecret) {
    throw new Error('TG_WEBHOOK_SECRET is not configured.');
  }

  return compareSecrets(expectedSecret, normalizeText(secretHeader));
}

function extractTelegramCommand(text) {
  const [commandToken] = normalizeText(text).split(/\s+/, 1);
  const normalizedCommand = commandToken ? commandToken.toLowerCase().split('@')[0] : '';

  if (normalizedCommand === '/start') {
    return 'start';
  }

  if (normalizedCommand === '/stop' || normalizedCommand === '/unsubscribe') {
    return 'stop';
  }

  return null;
}

function buildTelegramSubscriber(message) {
  const chat = message?.chat || {};
  const from = message?.from || {};

  return {
    chatId: chat.id,
    username: chat.username || from.username || null,
    firstName: chat.first_name || from.first_name || null,
    lastName: chat.last_name || from.last_name || null,
  };
}

function buildTelegramReply(command) {
  if (command === 'start') {
    return 'Вы подписаны на новые заявки с сайта СПЕЦАВТОПРО. Для отписки отправьте /stop.';
  }

  return 'Вы отписаны от новых заявок. Чтобы подписаться снова, отправьте /start.';
}

async function handleTelegramUpdate(update) {
  const message = update?.message;
  const command = extractTelegramCommand(message?.text);

  if (!message || !command) {
    return { handled: false };
  }

  const subscriber = buildTelegramSubscriber(message);

  if (command === 'start') {
    await activateSubscriber(subscriber);
  } else {
    await stopSubscriber(subscriber);
  }

  await sendTelegramMessage(subscriber.chatId, buildTelegramReply(command));

  return {
    handled: true,
    command,
    chatId: subscriber.chatId,
  };
}

module.exports = {
  handleTelegramUpdate,
  isTelegramWebhookAuthorized,
};
