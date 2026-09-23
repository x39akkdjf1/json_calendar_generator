const http = require('http');
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

const port = process.env.PORT || 3000;
const root = __dirname;
const maxRequestSize = 50 * 1024 * 1024;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function safeRemoteName(value, fallback) {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[. ]+$/g, '');
  return cleaned || fallback;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maxRequestSize) {
        reject(new Error('Upload is larger than the 50 MB server limit.'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('The upload request was not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

async function uploadToFtp(payload) {
  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const password = process.env.FTP_PASSWORD;
  if (!host || !user || !password) {
    throw new Error('FTP_HOST, FTP_USER, and FTP_PASSWORD must be configured on the Node.js server.');
  }

  const client = new ftp.Client();
  client.ftp.verbose = process.env.FTP_VERBOSE === 'true';
  try {
    await client.access({
      host,
      port: Number(process.env.FTP_PORT || 21),
      user,
      password,
      secure: process.env.FTP_SECURE === 'true',
      secureOptions: process.env.FTP_SECURE === 'true' ? { rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    });

    const baseDirectory = process.env.FTP_BASE_DIR || '/';
    const directoryName = safeRemoteName(payload.directoryName, 'calendar_export');
    const remoteDirectory = path.posix.join(baseDirectory, directoryName);
    await client.ensureDir(remoteDirectory);
    await client.uploadFrom(Buffer.from(JSON.stringify(payload.event, null, 2), 'utf8'), 'event.json');

    for (const file of payload.files || []) {
      const fileName = safeRemoteName(file.name, 'image');
      await client.uploadFrom(Buffer.from(file.base64, 'base64'), fileName);
    }

    return remoteDirectory;
  } finally {
    client.close();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/upload') {
    try {
      const payload = await readJsonBody(req);
      const remoteDirectory = await uploadToFtp(payload);
      sendJson(res, 200, { ok: true, remoteDirectory });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safePath = path.normalize(requestPath).replace(/^\.+[\\/]+/, '');
  const filePath = path.join(root, safePath);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(port, () => console.log(`JSON Calendar Generator is running at http://localhost:${port}`));
