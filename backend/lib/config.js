function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();

  if (!normalized) {
    return '';
  }

  const lowered = normalized.toLowerCase();

  if (lowered === 'undefined' || lowered === 'null') {
    return '';
  }

  return normalized;
}

function firstNonEmptyEnv(...values) {
  for (const value of values) {
    const normalized = normalizeEnvValue(value);

    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function isProductionRuntime() {
  return normalizeEnvValue(process.env.NODE_ENV) === 'production';
}

function getTelegramBotToken() {
  return firstNonEmptyEnv(process.env.TG_BOT_TOKEN, process.env.SAP_TG) || null;
}

function getTelegramApiBase() {
  const explicitApiBase = firstNonEmptyEnv(process.env.TG_API);

  if (explicitApiBase) {
    return ensureTrailingSlash(explicitApiBase);
  }

  const botToken = getTelegramBotToken();

  return botToken ? `https://api.telegram.org/bot${botToken}/` : null;
}

function getTelegramWebhookSecret() {
  return firstNonEmptyEnv(process.env.TG_WEBHOOK_SECRET) || null;
}

function getTelegramWebhookUrl() {
  const explicitWebhookUrl = firstNonEmptyEnv(process.env.TG_WEBHOOK_URL);

  if (explicitWebhookUrl) {
    return explicitWebhookUrl;
  }

  const siteUrl = firstNonEmptyEnv(process.env.DEPLOY_SITE_URL, process.env.SITE_URL);

  if (!siteUrl) {
    return null;
  }

  return new URL('/api/telegram/webhook', ensureTrailingSlash(siteUrl)).toString();
}

function getMysqlEnvValue(name, defaultValue = '') {
  const runtimeKey = isProductionRuntime() ? `MYSQL_PROD_${name}` : `MYSQL_LOCAL_${name}`;
  const sharedKey = `MYSQL_${name}`;
  const fallbackValues = [process.env[runtimeKey]];

  if (!isProductionRuntime() && name === 'PASSWORD') {
    fallbackValues.push(process.env.MYSQL_REMOTE_CONNECTION_PASS);
  }

  fallbackValues.push(process.env[sharedKey]);

  if (defaultValue !== '') {
    fallbackValues.push(defaultValue);
  }

  return firstNonEmptyEnv(...fallbackValues);
}

function getMysqlConfig() {
  const host = getMysqlEnvValue('HOST', isProductionRuntime() ? 'localhost' : '');
  const user = getMysqlEnvValue('USER');
  const database = getMysqlEnvValue('DATABASE');
  const password = getMysqlEnvValue('PASSWORD');

  if (!host || !user || !database) {
    throw new Error('MySQL is not configured. Set MYSQL_HOST, MYSQL_USER and MYSQL_DATABASE.');
  }

  const port = Number(getMysqlEnvValue('PORT', '3306'));
  const connectionLimit = Number(getMysqlEnvValue('CONNECTION_LIMIT', '10'));

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('MYSQL_PORT must be a positive integer.');
  }

  if (!Number.isInteger(connectionLimit) || connectionLimit <= 0) {
    throw new Error('MYSQL_CONNECTION_LIMIT must be a positive integer.');
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
  };
}

module.exports = {
  firstNonEmptyEnv,
  getMysqlConfig,
  getTelegramApiBase,
  getTelegramBotToken,
  getTelegramWebhookSecret,
  getTelegramWebhookUrl,
  isProductionRuntime,
  normalizeEnvValue,
};
