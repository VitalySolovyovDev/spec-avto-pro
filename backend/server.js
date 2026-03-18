const fs = require('fs');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const HOST = process.env.BIND_HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;
// Default to production when NODE_ENV is unset (typical on Node.js hosts)
const isProd = process.env.NODE_ENV !== 'development';
const frontendPort = process.env.FRONTEND_PORT || 3001;

app.use(express.json());

function resolveStaticDir() {
  const candidates = [
    process.env.APP_PUBLIC_DIR,
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, '../../frontend/dist'),
    path.join(process.cwd(), 'frontend', 'dist'),
    path.join(process.cwd(), 'public_html'),
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate));
}

// API
app.post('/api/contact', (req, res) => {
  res.send('It works');
});

if (isProd) {
  const distPath = resolveStaticDir();

  if (!distPath) {
    throw new Error('Static directory not found for production server.');
  }

  app.use(express.static(distPath));
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  // Dev: proxy to Rspack dev server
  app.use(
    createProxyMiddleware({
      target: `http://localhost:${frontendPort}`,
      changeOrigin: true,
      ws: true, // WebSocket for HMR
    })
  );
}

app.listen(PORT, HOST);
