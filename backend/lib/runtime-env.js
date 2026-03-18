const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  const envCandidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
  ];
  const seen = new Set();

  envCandidates.forEach((candidate) => {
    const envPath = path.resolve(candidate);

    if (seen.has(envPath) || !fs.existsSync(envPath)) {
      return;
    }

    seen.add(envPath);
    dotenv.config({ path: envPath, override: false, quiet: true });
  });
}

module.exports = { loadEnv };
