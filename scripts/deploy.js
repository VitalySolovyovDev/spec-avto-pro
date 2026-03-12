// scripts/deploy.js
// Cross-platform deployment via `curl` executable.  
// Most modern OSes (macOS, Linux, Windows 10+) ship with curl by default.
// Each file is uploaded in a separate curl process which avoids server
// quirks that break persistent data connections.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const host = process.env.FTP_HOST || 'vitlsat4.beget.tech';
const user = process.env.FTP_USER || 'vitlsat4_1';
const password = process.env.FTP_PASS || 'izZ*8ePsQArv';
const localDir = path.join(__dirname, '../dist');

// build base url with credentials (escaping special chars)
function buildUrl(relPath) {
  const creds = encodeURIComponent(user) + ':' + encodeURIComponent(password);
  // make sure path segments are percent-encoded (spaces, unicode etc)
  const encodedPath = relPath
    .split('/')
    .map(s => encodeURIComponent(s))
    .join('/');
  // curl automatically creates directories with --ftp-create-dirs
  return `ftp://${creds}@${host}/${encodedPath}`;
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  let results = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await walk(full);
      results = results.concat(sub);
    } else if (e.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function uploadFile(localPath) {
  return new Promise((resolve, reject) => {
    const rel = path.relative(localDir, localPath).replace(/\\/g, '/');
    const url = buildUrl(rel);
    const curl = spawn('curl', ['-T', localPath, '--ftp-create-dirs', url]);
    curl.stdout.on('data', data => process.stdout.write(data));
    curl.stderr.on('data', data => process.stderr.write(data));
    curl.on('close', code => {
      if (code === 0) {
        console.log(`uploaded ${rel}`);
        resolve();
      } else {
        reject(new Error(`curl exited with ${code}`));
      }
    });
    curl.on('error', err => reject(err));
  });
}

// run a curl command and return an object containing exit code, stdout
// and stderr.  callers may request `allowFail` to never throw (code is
// returned). this makes it easier to handle cases like `NLST` where the
// server could reset the connection after sending data (exit code 56).
function runCurl(args, {allowFail = false} = {}) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', args);
    let out = '';
    let err = '';
    curl.stdout.on('data', data => (out += data));
    curl.stderr.on('data', data => (err += data));
    curl.on('close', code => {
      const result = {code, out, err};
      if (code === 0 || allowFail) {
        resolve(result);
      } else {
        const message = `curl ${args.join(' ')} exited with ${code}: ${err}`;
        const errObj = new Error(message);
        errObj.result = result;
        reject(errObj);
      }
    });
    curl.on('error', e => reject(e));
  });
}

// list entries in a remote directory (does not recurse)
async function listRemote(relPath = '') {
  // ensure trailing slash for directories
  let url = buildUrl(relPath);
  if (relPath && !url.endsWith('/')) url += '/';
  const {code, out} = await runCurl(['-s', '--list-only', url], {allowFail: true});
  // some servers reset the data connection after sending the listing (exit
  // code 56).  in that case we still got the text we need earlier, so treat
  // 0 and 56 as acceptable.
  if (code !== 0 && code !== 56) {
    throw new Error(`LIST failed with code ${code}`);
  }
  return out.split(/\r?\n/).filter(Boolean);
}

async function deleteFile(relPath) {
  // ignore "no such file" errors (550) by allowing failures
  await runCurl(['-s', '-Q', `DELE ${relPath}`, buildUrl('')], {allowFail: true});
}

async function deleteDir(relPath) {
  // directory might already be gone; allow failure
  await runCurl(['-s', '-Q', `RMD ${relPath}`, buildUrl('')], {allowFail: true});
}
// recursively remove everything under a given remote path
async function deleteRecursively(relPath) {
  try {
    // try removing as file first
    await deleteFile(relPath);
    console.log(`deleted file ${relPath}`);
    return;
  } catch {
    // not a file / failed - assume directory
  }
  const entries = await listRemote(relPath);
  for (const e of entries) {
    const child = relPath ? `${relPath}/${e}` : e;
    await deleteRecursively(child);
  }
  await deleteDir(relPath);
  console.log(`deleted dir ${relPath}`);
}

// clear the entire remote host root directory before uploading
async function clearRemote() {
  const entries = await listRemote('');
  for (const e of entries) {
    await deleteRecursively(e);
  }
  console.log('Удаленная дириктория очищена');
}

async function main() {
  try {
    // remove previous deployment first
    await clearRemote();

    const files = await walk(localDir);
    for (const f of files) {
      await uploadFile(f);
    }
    console.log('🎉 Деплой завершён');
  } catch (err) {
    console.error('Ошибка при деплое:', err);
    process.exit(1);
  }
}

// export helpers so that they can be imported for testing/debugging
module.exports = { runCurl, listRemote, clearRemote, deleteRecursively };

main();
