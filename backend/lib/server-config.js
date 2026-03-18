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

function getServerConfig() {
  return {
    host: process.env.BIND_HOST || '127.0.0.1',
    port: parsePositiveInteger(process.env.PORT, 3000, 'PORT'),
    frontendPort: parsePositiveInteger(process.env.FRONTEND_PORT, 3001, 'FRONTEND_PORT'),
    isProduction: process.env.NODE_ENV !== 'development',
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
