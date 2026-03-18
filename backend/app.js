const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { installJsonErrorHandler } = require('./lib/http');
const { getServerConfig, resolveStaticDir } = require('./lib/server-config');
const { createApiRouter } = require('./routes/api');

function createApp() {
  const app = express();
  const { frontendPort, isProduction } = getServerConfig();

  app.use(express.json());
  app.use('/api', createApiRouter());

  if (isProduction) {
    const distPath = resolveStaticDir();

    if (!distPath) {
      throw new Error('Static directory not found for production server.');
    }

    app.use(express.static(distPath));
    app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    app.use(createProxyMiddleware({
      target: `http://localhost:${frontendPort}`,
      changeOrigin: true,
      ws: true,
    }));
  }

  installJsonErrorHandler(app);

  return app;
}

module.exports = { createApp };
