require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');

const port = process.env.PORT || 3000;
const root = __dirname;
const maxRequestSize = 50 * 1024 * 1024;
const referenceCounterFile = path.join(root, 'reference-counter.json');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon' };

function sendJson(res, statusCode, payload) { res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload)); }
function safeRemoteName(value, fallback) { const cleaned = String(value || '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/\s+/g, '-').replace(/[. ]+$/g, ''); return cleaned || fallback; }
function remoteJoin(...parts) { return path.posix.join(...parts.map(part => String(part || ''))); }
function nextReference() { let counter = 0; try { const saved = JSON.parse(fs.readFileSync(referenceCounterFile, 'utf8')); counter = Number.isInteger(saved.next) && saved.next >= 0 ? saved.next : 0; } catch (error) { if (error.code !== 'ENOENT') throw error; } const reference = `WID${String(counter).padStart(3, '0')}`; const temporaryFile = `${referenceCounterFile}.${process.pid}.tmp`; fs.writeFileSync(temporaryFile, JSON.stringify({ next: counter + 1 }, null, 2) + '\n', 'utf8'); fs.renameSync(temporaryFile, referenceCounterFile); return reference; }
function readJsonBody(req) { return new Promise((resolve, reject) => { let body = ''; let size = 0; req.setEncoding('utf8'); req.on('data', chunk => { size += Buffer.byteLength(chunk); if (size > maxRequestSize) { reject(new Error('Upload is larger than the 50 MB server limit.')); req.destroy(); return; } body += chunk; }); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('The upload request was not valid JSON.')); } }); req.on('error', reject); }); }
function sftpConfig() {
  const { SFTP_HOST: host, SFTP_PORT: port, SFTP_USER: username, SFTP_PASSWORD: password, SFTP_PRIVATE_KEY: privateKeyPath, SFTP_PRIVATE_KEY_PASSPHRASE: passphrase } = process.env;
  if (!host || !username || (!password && !privateKeyPath)) throw new Error('SFTP_HOST, SFTP_USER, and SFTP_PASSWORD or SFTP_PRIVATE_KEY must be configured in the server environment or .env file.');
  const config = { host, port: Number(port || 22), username };
  if (privateKeyPath) {
    config.privateKey = fs.readFileSync(path.resolve(root, privateKeyPath));
    if (passphrase) config.passphrase = passphrase;
  } else {
    config.password = password;
  }
  return config;
}
async function uploadToSftp(payload) { const client = new SftpClient(); const baseDirectory = process.env.SFTP_BASE_DIR || process.env.FTP_BASE_DIR; if (!baseDirectory) throw new Error('SFTP_BASE_DIR must be configured in the server environment or .env file.'); const jsonFileName = safeRemoteName(payload.jsonFileName, '199.json'); const jsonPath = remoteJoin(baseDirectory, jsonFileName); try { await client.connect(sftpConfig()); await client.mkdir(baseDirectory, true); let aggregate = {}; if (await client.exists(jsonPath)) { const existing = await client.get(jsonPath); try { aggregate = JSON.parse(existing.toString('utf8')); } catch { throw new Error(`${jsonFileName} exists but does not contain valid JSON.`); } } if (!aggregate || Array.isArray(aggregate) || typeof aggregate !== 'object') throw new Error(`${jsonFileName} must contain a JSON object.`); const event = { ...payload.event, image: (payload.files || []).map(file => `${process.env.PUBLIC_IMAGE_BASE_URL || 'https://www.gasthofzumwidder.ch/kalender'}/${encodeURIComponent(safeRemoteName(file.name, 'image'))}`) }; aggregate[event.reference] = event; await client.put(Buffer.from(JSON.stringify(aggregate, null, 2) + '\n', 'utf8'), jsonPath); for (const file of payload.files || []) await client.put(Buffer.from(file.base64, 'base64'), remoteJoin(baseDirectory, safeRemoteName(file.name, 'image'))); return { jsonPath, eventReference: event.reference }; } finally { await client.end().catch(() => {}); } }

const server = http.createServer(async (req, res) => { if (req.method === 'POST' && req.url === '/api/reference') { try { sendJson(res, 200, { ok: true, reference: nextReference() }); } catch (error) { sendJson(res, 500, { ok: false, error: `Could not persist the reference counter: ${error.message}` }); } return; } if (req.method === 'POST' && req.url === '/api/upload') { try { const payload = await readJsonBody(req); const result = await uploadToSftp(payload); sendJson(res, 200, { ok: true, ...result }); } catch (error) { sendJson(res, 400, { ok: false, error: error.message }); } return; } const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0]; const safePath = path.normalize(requestPath).replace(/^\.?[\\/]+/, ''); const filePath = path.join(root, safePath); fs.readFile(filePath, (error, content) => { if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); return; } res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' }); res.end(content); }); });
server.listen(port, () => console.log(`JSON Calendar Generator is running at http://localhost:${port}`));
