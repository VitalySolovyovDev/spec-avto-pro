const { Router } = require('express');
const { asyncHandler, createHttpError } = require('../lib/http');
const {
  hasRequiredContactFields,
  readContactPayload,
  runDeployHealthcheck,
  sendContactLead,
} = require('../services/contact-service');

function createContactRouter() {
  const router = Router();

  router.post('/', asyncHandler(async (req, res) => {
    const contactPayload = readContactPayload(req.body);

    if (contactPayload.source === 'deploy-healthcheck') {
      try {
        res.json(await runDeployHealthcheck());
      } catch (error) {
        throw createHttpError(500, 'Deploy healthcheck failed.', {
          logMessage: 'Deploy healthcheck failed:',
          logDetails: error,
        });
      }

      return;
    }

    if (!hasRequiredContactFields(contactPayload)) {
      throw createHttpError(400, 'Укажите имя, телефон и тип мусора.');
    }

    try {
      res.json(await sendContactLead(contactPayload));
    } catch (error) {
      throw createHttpError(500, 'Не удалось отправить заявку. Попробуйте позже.', {
        logMessage: 'Failed to send Telegram notification:',
        logDetails: error,
      });
    }
  }));

  return router;
}

module.exports = { createContactRouter };
