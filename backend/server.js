const { createApp } = require('./app');
const { ensureMysqlReady } = require('./lib/mysql');
const { loadEnv } = require('./lib/runtime-env');
const { getServerConfig } = require('./lib/server-config');

loadEnv();

function warmupSubscriberStore() {
  ensureMysqlReady()
    .then(() => {
      console.log('Telegram subscriber store ready.');
    })
    .catch((error) => {
      console.error('Telegram subscriber store unavailable:', error);
    });
}

const { host, port } = getServerConfig();
const app = createApp();

warmupSubscriberStore();

app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});
