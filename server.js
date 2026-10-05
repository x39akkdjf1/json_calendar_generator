require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const port = process.env.PORT || 3000;
const root = __dirname;
const maxRequestSize = 50 * 1024 * 1024;
const referenceCounterFile = path.join(root, 'reference-counter.json');
const mimeTypes = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.ico':'image/x-icon' };
function sendJson(res, code, payload) { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(payload)); }
function safeRemoteName(value, fallback) { const cleaned=String(value||'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'').replace(/\s+/g,'-').replace(/[. ]+$/g,''); return cleaned||fallback; }
function remoteJoin(...parts) { return path.posix.join(...parts.map(part=>String(part||''))); }
function nextReference() { let counter=0; try { const saved=JSON.parse(fs.readFileSync(referenceCounterFile,'utf8')); counter=Number.isInteger(saved.next)&&saved.next>=0?saved.next:0; } catch(error) {} const reference=`WID${String(counter).padStart(3,'0')}`; fs.writeFileSync(referenceCounterFile,JSON.stringify({next:counter+1},null,2)); return reference; }
function readJsonBody(req) { return new Promise((resolve,reject)=>{ let body=''; let size=0; req.setEncoding('utf8'); req.on('data',chunk=>{ size+=Buffer.byteLength(chunk); if(size>maxRequestSize){ reject(new Error('Request body too large.')); req.destroy(); return; } body+=chunk; }); req.on('end',()=>{ if(!body){ resolve({}); return; } try { resolve(JSON.parse(body)); } catch(error) { reject(new Error('Invalid JSON body.')); } }); req.on('error',reject); }); }
function sftpConfig() { const {SFTP_HOST:host,SFTP_PORT:port,SFTP_USER:username,SFTP_PASSWORD:password,SFTP_PRIVATE_KEY:privateKeyPath,SFTP_PRIVATE_KEY_PASSPHRASE:passphrase}=process.env; if(!host||!username) throw new Error('SFTP_HOST and SFTP_USER must be configured.'); const config={host,port:Number(port)||22,username}; if(privateKeyPath){ config.privateKey=fs.readFileSync(privateKeyPath,'utf8'); if(passphrase) config.passphrase=passphrase; } else if(password){ config.password=password; } else { throw new Error('Configure SFTP_PASSWORD or SFTP_PRIVATE_KEY for authentication.'); } return config; }
function jsonRemotePath() { const base=process.env.SFTP_BASE_DIR||process.env.FTP_BASE_DIR; if(!base) throw new Error('SFTP_BASE_DIR must be configured.'); return {base,path:remoteJoin(base,'199.json')}; }
function ensureArrayAggregate(rawAggregate) {
  if (Array.isArray(rawAggregate)) return rawAggregate;
  if (rawAggregate && typeof rawAggregate === 'object') return Object.values(rawAggregate);
  return [];
}
async function withAggregate(callback) { const client=new SftpClient(); const {base,path:jsonPath}=jsonRemotePath(); try { await client.connect(sftpConfig()); await client.mkdir(base,true); let aggregate=[]; if(await client.exists(jsonPath)){ const existingRaw=(await client.get(jsonPath)).toString('utf8'); if(existingRaw.trim()){ try{ const parsed=JSON.parse(existingRaw); aggregate=ensureArrayAggregate(parsed); }catch(error){ throw new Error('Existing 199.json is invalid JSON.'); } } } const nextAggregate=await callback(aggregate); await client.put(Buffer.from(JSON.stringify(nextAggregate,null,2),'utf8'),jsonPath); return nextAggregate; } finally { await client.end().catch(()=>{}); } }
async function readRemoteEvents() { const client=new SftpClient(); const {path:jsonPath}=jsonRemotePath(); try { await client.connect(sftpConfig()); if(!(await client.exists(jsonPath))) return []; const raw=(await client.get(jsonPath)).toString('utf8').trim(); if(!raw) return []; const parsed=JSON.parse(raw); return ensureArrayAggregate(parsed); } finally { await client.end().catch(()=>{}); } }
async function deleteEvent(reference) { return withAggregate(aggregate=>{ const index=aggregate.findIndex(entry=>entry&&entry.reference===reference); if(index===-1) throw new Error('Event not found.'); aggregate.splice(index,1); return aggregate; }); }
async function uploadToSftp(payload) { const client=new SftpClient(); const {base,path:jsonPath}=jsonRemotePath(); try { await client.connect(sftpConfig()); await client.mkdir(base,true); let aggregate=[]; if(await client.exists(jsonPath)){ const existingRaw=(await client.get(jsonPath)).toString('utf8'); if(existingRaw.trim()){ try{ const parsed=JSON.parse(existingRaw); aggregate=ensureArrayAggregate(parsed); }catch(error){ throw new Error('Existing 199.json is invalid JSON.'); } } }
const event={...payload.event}; const files=Array.isArray(payload.files)?payload.files:[]; const imageUrls=[]; for(const file of files){ const name=safeRemoteName(file.name,'image'); const remotePath=remoteJoin(base,name); const buffer=Buffer.from(String(file.base64||''),'base64'); await client.put(buffer,remotePath); const baseUrl=(process.env.PUBLIC_IMAGE_BASE_URL||'').replace(/\/$/,''); imageUrls.push(baseUrl?`${baseUrl}/${encodeURIComponent(name)}`:name); }
if(imageUrls.length){ event.image=[...(Array.isArray(event.image)?event.image:[]),...imageUrls]; }
const existingIndex=aggregate.findIndex(entry=>entry&&entry.reference===event.reference);
if(existingIndex===-1){ aggregate.push(event); }
else{ aggregate[existingIndex]=event; }
await client.put(Buffer.from(JSON.stringify(aggregate,null,2),'utf8'),jsonPath); return event; } finally { await client.end().catch(()=>{}); } }
const server=http.createServer(async(req,res)=>{ const url=new URL(req.url,`http://${req.headers.host||'localhost'}`); if(req.method==='POST'&&url.pathname==='/api/reference'){ try{sendJson(res,200,{ok:true,reference:nextReference()});}catch(error){sendJson(res,500,{ok:false,error:error.message});} return; }
if(req.method==='GET'&&url.pathname==='/api/events'){ try{const events=await readRemoteEvents(); sendJson(res,200,{ok:true,events});}catch(error){sendJson(res,500,{ok:false,error:error.message});} return; }
if(req.method==='DELETE'&&url.pathname.startsWith('/api/events/')){ const reference=decodeURIComponent(url.pathname.replace('/api/events/','')); try{await deleteEvent(reference); sendJson(res,200,{ok:true});}catch(error){sendJson(res,500,{ok:false,error:error.message});} return; }
if(req.method==='POST'&&url.pathname==='/api/upload-sftp'){ try { const payload=await readJsonBody(req); if(!payload||typeof payload!=='object') throw new Error('Payload must be a JSON object.'); if(!payload.event||typeof payload.event!=='object') throw new Error('Payload.event is required.'); if(!payload.event.reference) throw new Error('Event reference is required.'); const event=await uploadToSftp(payload); sendJson(res,200,{ok:true,event}); } catch(error){ sendJson(res,500,{ok:false,error:error.message}); } return; }
const requestedPath=url.pathname==='/'?'index.html':url.pathname.slice(1); const filePath=path.join(root,requestedPath); if(!filePath.startsWith(root)){ res.writeHead(403); res.end('Forbidden'); return; }
fs.stat(filePath,(error,stats)=>{ if(error||!stats.isFile()){ res.writeHead(404); res.end('Not found'); return; } const ext=path.extname(filePath).toLowerCase(); res.writeHead(200,{'Content-Type':mimeTypes[ext]||'application/octet-stream'}); fs.createReadStream(filePath).pipe(res); }); });
server.listen(port,()=>console.log(`JSON Calendar Generator is running at http://localhost:${port}`));
