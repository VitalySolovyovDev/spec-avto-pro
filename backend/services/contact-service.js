const { getTelegramApiBase, getTelegramWebhookSecret } = require('../lib/config');
const { ensureMysqlReady } = require('../lib/mysql');
const { sendTelegramMessage } = require('../lib/telegram-api');
const { listActiveSubscribers } = require('../lib/telegram-subscribers');
const { normalizeText } = require('../lib/text');

function readContactPayload(payload) {
  return {
    source: normalizeText(payload?.source),
    name: normalizeText(payload?.name),
    phone: normalizeText(payload?.phone),
    wasteType: normalizeText(payload?.wasteType),
  };
}

function hasRequiredContactFields(payload) {
  return Boolean(payload.name && payload.phone && payload.wasteType);
}

function assertTelegramRuntimeConfig() {
  if (!getTelegramApiBase()) {
    throw new Error('Telegram API is not configured.');
  }

  if (!getTelegramWebhookSecret()) {
    throw new Error('TG_WEBHOOK_SECRET is not configured.');
  }
}

function buildLeadMessage({ name, phone, wasteType }) {
  return [
    'Новая заявка с сайта СПЕЦАВТОПРО',
    '',
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Тип мусора: ${wasteType}`,
  ].join('\n');
}

async function broadcastLeadMessage(text) {
  const subscribers = await listActiveSubscribers();

  if (!subscribers.length) {
    throw new Error('No active Telegram subscribers configured.');
  }

  const deliveryResults = await Promise.allSettled(
    subscribers.map(subscriber => sendTelegramMessage(subscriber.chatId, text))
  );
  const failures = deliveryResults.flatMap((result, index) => {
    if (result.status !== 'rejected') {
      return [];
    }

    return [{
      chatId: subscribers[index].chatId,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    }];
  });
  const deliveredCount = subscribers.length - failures.length;

  if (!deliveredCount) {
    throw new Error(failures[0]?.message || 'Telegram delivery failed.');
  }

  if (failures.length) {
    console.error('Telegram lead broadcast partially failed:', failures);
  }

  return {
    deliveredCount,
    failedCount: failures.length,
    totalCount: subscribers.length,
  };
}

async function runDeployHealthcheck() {
  assertTelegramRuntimeConfig();
  await ensureMysqlReady();

  return { message: 'It works' };
}

async function sendContactLead(payload) {
  const contactPayload = readContactPayload(payload);

  await broadcastLeadMessage(buildLeadMessage(contactPayload));

  return { message: 'Заявка отправлена. Спасибо!' };
}

module.exports = {
  hasRequiredContactFields,
  readContactPayload,
  runDeployHealthcheck,
  sendContactLead,
};
