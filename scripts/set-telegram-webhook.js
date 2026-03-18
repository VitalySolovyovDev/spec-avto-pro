const { getTelegramWebhookSecret, getTelegramWebhookUrl } = require('../backend/lib/config');
const { loadEnv } = require('../backend/lib/runtime-env');
const { getTelegramWebhookInfo, setTelegramWebhook } = require('../backend/lib/telegram-api');

loadEnv();

async function main() {
  const webhookUrl = getTelegramWebhookUrl();
  const webhookSecret = getTelegramWebhookSecret();

  if (!webhookUrl) {
    throw new Error('Webhook URL missing. Set TG_WEBHOOK_URL or DEPLOY_SITE_URL.');
  }

  if (!webhookUrl.startsWith('https://')) {
    throw new Error('Telegram webhook URL must use HTTPS.');
  }

  if (!webhookSecret) {
    throw new Error('TG_WEBHOOK_SECRET is not configured.');
  }

  await setTelegramWebhook({ url: webhookUrl, secretToken: webhookSecret });

  console.log(`Telegram webhook configured: ${webhookUrl}`);

  try {
    const webhookInfo = await getTelegramWebhookInfo();
    console.log(`Telegram reports webhook URL: ${webhookInfo.url || '(empty)'}`);
    console.log(`Pending updates: ${webhookInfo.pending_update_count || 0}`);
  } catch (error) {
    console.warn('Webhook configured, but getWebhookInfo failed:', error.message || error);
  }
}

main().catch((error) => {
  console.error('Failed to configure Telegram webhook:', error.message || error);
  process.exitCode = 1;
});
