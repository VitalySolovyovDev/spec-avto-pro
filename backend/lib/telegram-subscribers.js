const { getPool } = require('./mysql');
const { normalizeOptionalText } = require('./text');

const SUBSCRIBER_STATUS_ACTIVE = 'active';
const SUBSCRIBER_STATUS_STOPPED = 'stopped';

function normalizeChatId(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (/^-?\d+$/.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

function normalizeSubscriber(subscriber) {
  const chatId = normalizeChatId(subscriber?.chatId);

  if (!chatId) {
    throw new Error('Telegram chat id is invalid.');
  }

  return {
    chatId,
    username: normalizeOptionalText(subscriber?.username),
    firstName: normalizeOptionalText(subscriber?.firstName),
    lastName: normalizeOptionalText(subscriber?.lastName),
  };
}

async function setSubscriberStatus(subscriber, status) {
  const normalizedSubscriber = normalizeSubscriber(subscriber);
  const pool = await getPool();

  await pool.execute(
    `
      INSERT INTO telegram_subscribers (
        chat_id,
        username,
        first_name,
        last_name,
        status,
        subscribed_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        status = VALUES(status),
        subscribed_at = IF(VALUES(status) = 'active', CURRENT_TIMESTAMP, subscribed_at),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      normalizedSubscriber.chatId,
      normalizedSubscriber.username,
      normalizedSubscriber.firstName,
      normalizedSubscriber.lastName,
      status,
    ]
  );

  return { ...normalizedSubscriber, status };
}

async function activateSubscriber(subscriber) {
  return setSubscriberStatus(subscriber, SUBSCRIBER_STATUS_ACTIVE);
}

async function stopSubscriber(subscriber) {
  return setSubscriberStatus(subscriber, SUBSCRIBER_STATUS_STOPPED);
}

async function listActiveSubscribers() {
  const pool = await getPool();
  const [rows] = await pool.execute(
    `
      SELECT
        chat_id AS chatId,
        username,
        first_name AS firstName,
        last_name AS lastName
      FROM telegram_subscribers
      WHERE status = ?
      ORDER BY subscribed_at ASC
    `,
    [SUBSCRIBER_STATUS_ACTIVE]
  );

  return rows.map(row => ({
    chatId: String(row.chatId),
    username: row.username || null,
    firstName: row.firstName || null,
    lastName: row.lastName || null,
  }));
}

module.exports = {
  SUBSCRIBER_STATUS_ACTIVE,
  SUBSCRIBER_STATUS_STOPPED,
  activateSubscriber,
  listActiveSubscribers,
  stopSubscriber,
};
