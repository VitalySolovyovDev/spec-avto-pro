const { isTelegramWebhookAuthorized } = require('../services/telegram-webhook-service');

function requireTelegramWebhookAuth(req, res, next) {
  try {
    if (!isTelegramWebhookAuthorized(req.get('X-Telegram-Bot-Api-Secret-Token'))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
  } catch (error) {
    console.error('Telegram webhook secret verification failed:', error);
    res.status(503).json({ message: 'Telegram webhook is not configured.' });
    return;
  }

  next();
}

module.exports = { requireTelegramWebhookAuth };
