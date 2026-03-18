const { getTelegramApiBase } = require('./config');

async function callTelegram(methodName, { httpMethod = 'POST', payload } = {}) {
  const telegramApiBase = getTelegramApiBase();

  if (!telegramApiBase) {
    throw new Error('Telegram API is not configured. Set TG_BOT_TOKEN or SAP_TG.');
  }

  const endpoint = new URL(methodName, telegramApiBase);
  const requestOptions = { method: httpMethod };

  if (payload !== undefined) {
    requestOptions.headers = { 'Content-Type': 'application/json' };
    requestOptions.body = JSON.stringify(payload);
  }

  const response = await fetch(endpoint, requestOptions);
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `Telegram API request failed with status ${response.status}.`);
  }

  return result.result;
}

async function sendTelegramMessage(chatId, text) {
  return callTelegram('sendMessage', {
    payload: {
      chat_id: chatId,
      text,
    },
  });
}

async function setTelegramWebhook({ url, secretToken }) {
  return callTelegram('setWebhook', {
    payload: {
      url,
      secret_token: secretToken,
    },
  });
}

async function getTelegramWebhookInfo() {
  return callTelegram('getWebhookInfo', { httpMethod: 'GET' });
}

module.exports = {
  getTelegramWebhookInfo,
  sendTelegramMessage,
  setTelegramWebhook,
};
