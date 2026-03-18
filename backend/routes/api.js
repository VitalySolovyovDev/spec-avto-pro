const { Router } = require('express');
const { createContactRouter } = require('./contact');
const { createTelegramWebhookRouter } = require('./telegram-webhook');

function createApiRouter() {
  const router = Router();

  router.use('/contact', createContactRouter());
  router.use('/telegram', createTelegramWebhookRouter());

  return router;
}

module.exports = { createApiRouter };
