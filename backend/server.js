const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// Default to production when NODE_ENV is unset (typical on Node.js hosts)
const isProd = process.env.NODE_ENV !== 'development';
const frontendPort = process.env.FRONTEND_PORT || 3001;

app.use(express.json());

// API
app.post('/api/contact', (req, res) => {
  res.send('It works');
});

if (isProd) {
  // Resolve from cwd (project root) so it works with bundled server in backend/dist/
  const distPath = path.join(process.cwd(), 'frontend', 'dist');
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

app.listen(PORT);
