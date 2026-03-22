const fs = require('fs');
const path = require('path');

function parsePositiveInteger(value, fallback, envName) {
  const normalizedValue = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsedValue;
}

function resolveNodeEnv() {
  const nodeEnv = typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV.trim() : '';

  if (nodeEnv) {
    return nodeEnv;
  }

  // `npm run dev --prefix backend` starts nodemon without NODE_ENV, but the
  // backend still needs to proxy the frontend dev server instead of serving
  // the production bundle.
  return process.env.npm_lifecycle_event === 'dev' ? 'development' : 'production';
}

function getServerConfig() {
  const nodeEnv = resolveNodeEnv();

  return {
    host: process.env.BIND_HOST || '127.0.0.1',
    port: parsePositiveInteger(process.env.PORT, 3000, 'PORT'),
    frontendPort: parsePositiveInteger(process.env.FRONTEND_PORT, 3001, 'FRONTEND_PORT'),
    isProduction: nodeEnv !== 'development',
  };
}

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

module.exports = {
  getServerConfig,
  resolveStaticDir,
};
