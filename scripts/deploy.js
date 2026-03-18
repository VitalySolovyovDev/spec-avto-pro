const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { Client } = require('ssh2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const projectRoot = path.resolve(__dirname, '..');
const localBackendBundle = path.join(projectRoot, 'backend', 'dist', 'server.js');
const localHtaccess = path.join(projectRoot, 'backend', 'dist', '.htaccess');
const localFrontendDist = path.join(projectRoot, 'frontend', 'dist');
const remoteSiteDir = (process.env.SSH_SITE_DIR || 'spec-avto.pro').replace(/\/+$/, '');
const deploySiteUrl = (process.env.DEPLOY_SITE_URL || `https://${remoteSiteDir}`).replace(/\/+$/, '');

const sshConfig = {
  host: process.env.SSH_HOST,
  port: Number(process.env.SSH_PORT || 22),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

if (!sshConfig.host || !sshConfig.username || !sshConfig.password) {
  throw new Error('SSH credentials missing. Check SSH_HOST, SSH_USER and SSH_PASSWORD in .env.');
}

const call = (target, method, ...args) =>
  new Promise((resolve, reject) =>
    target[method](...args, (error, result) => (error ? reject(error) : resolve(result)))
  );

function quote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function getDeployEnvValue(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

async function createRuntimeEnvFile() {
  const envEntries = [
    ['TG_BOT_TOKEN', process.env.TG_BOT_TOKEN],
    ['SAP_TG', process.env.SAP_TG],
    ['TG_API', process.env.TG_API],
    ['TG_WEBHOOK_SECRET', process.env.TG_WEBHOOK_SECRET],
    ['MYSQL_HOST', getDeployEnvValue(process.env.MYSQL_PROD_HOST, 'localhost')],
    ['MYSQL_PORT', getDeployEnvValue(process.env.MYSQL_PROD_PORT, process.env.MYSQL_PORT, '3306')],
    ['MYSQL_DATABASE', getDeployEnvValue(process.env.MYSQL_PROD_DATABASE, process.env.MYSQL_DATABASE)],
    ['MYSQL_USER', getDeployEnvValue(process.env.MYSQL_PROD_USER, process.env.MYSQL_USER)],
    ['MYSQL_PASSWORD', getDeployEnvValue(process.env.MYSQL_PROD_PASSWORD, process.env.MYSQL_PASSWORD)],
    [
      'MYSQL_CONNECTION_LIMIT',
      getDeployEnvValue(process.env.MYSQL_PROD_CONNECTION_LIMIT, process.env.MYSQL_CONNECTION_LIMIT),
    ],
  ].filter(([, value]) => value !== '');

  if (!envEntries.length) {
    return null;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specteh-pro-runtime-'));
  const envPath = path.join(tempDir, '.env');
  const envContent = `${envEntries.map(([key, value]) => `${key}=${value}`).join('\n')}\n`;

  await fs.writeFile(envPath, envContent, 'utf8');

  return {
    localPath: envPath,
    cleanup: () => fs.rm(tempDir, { recursive: true, force: true }),
  };
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db' || entry.name.startsWith('._')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectUploads(siteRoot) {
  await fs.access(localBackendBundle).catch(() => {
    throw new Error(`Missing ${localBackendBundle}. Run "npm run build" first.`);
  });
  await fs.access(localHtaccess).catch(() => {
    throw new Error(`Missing ${localHtaccess}. Run "npm run build" first.`);
  });
  await fs.access(localFrontendDist).catch(() => {
    throw new Error(`Missing ${localFrontendDist}. Run "npm run build" first.`);
  });

  const frontendFiles = await walk(localFrontendDist);

  return [
    {
      localPath: localBackendBundle,
      remotePath: path.posix.join(siteRoot, 'backend', 'dist', 'server.js'),
    },
    {
      localPath: localHtaccess,
      remotePath: path.posix.join(siteRoot, '.htaccess'),
    },
    ...frontendFiles.map(filePath => ({
      localPath: filePath,
      remotePath: path.posix.join(
        siteRoot,
        'public_html',
        path.relative(localFrontendDist, filePath).split(path.sep).join('/')
      ),
    })),
  ];
}

async function connectSSH() {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.once('ready', () => resolve(client));
    client.once('error', reject);
    client.connect(sshConfig);
  });
}

async function execRemote(client, command) {
  return new Promise((resolve, reject) => {
    client.exec(`bash -lc ${JSON.stringify(command)}`, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let stdout = '';
      let stderr = '';

      stream.on('close', code => {
        if ((code || 0) === 0) {
          resolve(stdout.trim());
          return;
        }

        reject(new Error(`Remote command failed: ${(stderr || stdout).trim()}`));
      });
      stream.on('data', data => {
        stdout += data.toString();
      });
      stream.stderr.on('data', data => {
        stderr += data.toString();
      });
    });
  });
}

async function ensureRemoteDir(sftp, remoteDir) {
  const parts = remoteDir.split('/').filter(Boolean);
  let current = remoteDir.startsWith('/') ? '/' : '';

  for (const part of parts) {
    current = current === '/' ? `/${part}` : current ? `${current}/${part}` : part;

    try {
      const stats = await call(sftp, 'stat', current);
      if (!stats.isDirectory()) {
        throw new Error(`Remote path exists but is not a directory: ${current}`);
      }
    } catch (error) {
      if (error.code !== 2) {
        throw error;
      }

      await call(sftp, 'mkdir', current).catch(mkdirError => {
        if (mkdirError.code !== 4) {
          throw mkdirError;
        }
      });
    }
  }
}

async function uploadFiles(sftp, files) {
  for (const file of files) {
    await ensureRemoteDir(sftp, path.posix.dirname(file.remotePath));
    await call(sftp, 'fastPut', file.localPath, file.remotePath);
    console.log(`uploaded ${file.remotePath}`);
  }
}

async function cleanupRemote(client, siteRoot) {
  await execRemote(
    client,
    [
      `cd ${quote(siteRoot)}`,
      'rm -rf backend frontend',
      'rm -f .htaccess package.json',
      'mkdir -p backend/dist backend/tmp public_html',
      "find public_html -mindepth 1 -maxdepth 1 ! -name '.well-known' -exec rm -rf -- {} +",
    ].join(' && ')
  );
}

async function waitForHealthcheck() {
  const rootUrl = new URL('/', `${deploySiteUrl}/`).toString();
  const apiUrl = new URL('/api/contact', `${deploySiteUrl}/`).toString();
  const deadline = Date.now() + 90_000;
  let lastError = new Error('Healthcheck timed out.');

  while (Date.now() < deadline) {
    try {
      const rootResponse = await fetch(rootUrl);
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'deploy-healthcheck' }),
      });
      const apiText = await apiResponse.text();

      if (rootResponse.ok && apiResponse.ok && apiText.includes('It works')) {
        return { rootStatus: rootResponse.status, apiStatus: apiResponse.status };
      }

      lastError = new Error(
        `Unexpected response: root=${rootResponse.status}, api=${apiResponse.status}, apiBody=${apiText.trim()}`
      );
    } catch (error) {
      lastError = error;
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw lastError;
}

async function main() {
  const client = await connectSSH();
  let sftp;
  let runtimeEnvFile;

  try {
    const siteRoot = await execRemote(client, `realpath ${quote(remoteSiteDir)}`);
    const uploads = await collectUploads(siteRoot);
    runtimeEnvFile = await createRuntimeEnvFile();

    if (runtimeEnvFile) {
      uploads.push({
        localPath: runtimeEnvFile.localPath,
        remotePath: path.posix.join(siteRoot, 'backend', '.env'),
      });
    }

    console.log(`Remote site root: ${siteRoot}`);
    console.log(`Uploading ${uploads.length} files`);

    await cleanupRemote(client, siteRoot);

    sftp = await call(client, 'sftp');
    await uploadFiles(sftp, uploads);

    await execRemote(
      client,
      [
        `chmod o+rx ${quote(path.posix.join(siteRoot, 'backend'))} ${quote(path.posix.join(siteRoot, 'backend', 'dist'))} ${quote(path.posix.join(siteRoot, 'backend', 'tmp'))}`,
        `chmod o+r ${quote(path.posix.join(siteRoot, 'backend', 'dist', 'server.js'))} ${quote(path.posix.join(siteRoot, '.htaccess'))}`,
        `date +%s > ${quote(path.posix.join(siteRoot, 'backend', 'tmp', 'restart.txt'))}`,
      ].join(' && ')
    );
    console.log('Passenger restart triggered');

    const healthcheck = await waitForHealthcheck();
    console.log(`Healthcheck ok: root=${healthcheck.rootStatus}, api=${healthcheck.apiStatus}`);
    console.log('Деплой завершен');
  } catch (error) {
    console.error('Ошибка при деплое:', error);
    process.exitCode = 1;
  } finally {
    if (runtimeEnvFile) {
      await runtimeEnvFile.cleanup();
    }
    if (sftp) {
      sftp.end();
    }
    client.end();
  }
}

module.exports = { collectUploads, execRemote, walk };

if (require.main === module) {
  main();
}
