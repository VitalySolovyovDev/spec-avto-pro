const { Router } = require('express');
const { asyncHandler, createHttpError } = require('../lib/http');
const { requireTelegramWebhookAuth } = require('../middleware/telegram-webhook-auth');
const { handleTelegramUpdate } = require('../services/telegram-webhook-service');

function createTelegramWebhookRouter() {
  const router = Router();

  router.post('/webhook', requireTelegramWebhookAuth, asyncHandler(async (req, res) => {
    try {
      await handleTelegramUpdate(req.body);
      res.json({ ok: true });
    } catch (error) {
      throw createHttpError(500, 'Telegram webhook failed.', {
        logMessage: 'Failed to handle Telegram webhook:',
        logDetails: error,
      });
    }
  }));

  return router;
}

module.exports = { createTelegramWebhookRouter };
