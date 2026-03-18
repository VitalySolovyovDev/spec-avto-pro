function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createHttpError(status, message, options = {}) {
  const error = new Error(message);

  error.status = status;
  error.exposeMessage = options.exposeMessage !== false;
  error.logMessage = options.logMessage;
  error.logDetails = options.logDetails;

  return error;
}

function installJsonErrorHandler(app) {
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const message = error?.exposeMessage === false
      ? 'Internal Server Error.'
      : error?.message || 'Internal Server Error.';

    if (status >= 500) {
      if (error?.logMessage) {
        if (error.logDetails) {
          console.error(error.logMessage, error.logDetails);
        } else {
          console.error(error.logMessage);
        }
      } else {
        console.error(error);
      }
    }

    res.status(status).json({ message });
  });
}

module.exports = {
  asyncHandler,
  createHttpError,
  installJsonErrorHandler,
};
