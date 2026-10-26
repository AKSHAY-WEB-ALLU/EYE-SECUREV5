const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = __dirname, PUBLIC = path.join(ROOT, 'public'), DATA = path.join(ROOT, 'data', 'quotations.json');
const PORT = Number(process.env.PORT || 4173);
const CUSTOMER_DATA = path.join(ROOT, 'data', 'customers.json');
const PRODUCT_DATA = path.join(ROOT, 'data', 'products.json');
if (!fs.existsSync(path.dirname(DATA))) fs.mkdirSync(path.dirname(DATA), {recursive:true});
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, '[]');
for (const f of [CUSTOMER_DATA, PRODUCT_DATA]) if (!fs.existsSync(f)) fs.writeFileSync(f, '[]');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
function readAll(){ try { return JSON.parse(fs.readFileSync(DATA,'utf8')); } catch { return []; } }
function readFileData(file){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return []; } }
function writeFileData(file,data){ fs.writeFileSync(file,JSON.stringify(data,null,2)); }
function send(res, status, data){ res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
function body(req){ return new Promise((resolve,reject)=>{let s=''; req.on('data',c=>{s+=c; if(s.length>2e6){reject(new Error('Request too large')); req.destroy();}}); req.on('end',()=>{try{resolve(JSON.parse(s||'{}'));}catch(e){reject(e);}}); req.on('error',reject);}); }
const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    const libraryMatch=url.pathname.match(/^\/api\/(customers|products)(?:\/([^/]+))?$/);
    if(libraryMatch){const kind=libraryMatch[1],file=kind==='customers'?CUSTOMER_DATA:PRODUCT_DATA;let data=readFileData(file);if(req.method==='GET')return send(res,200,data);if(req.method==='POST'){try{const input=await body(req);const key=kind==='customers'?'name':'name';const existing=data.findIndex(x=>x.id===input.id||(String(x[key]||'').toLowerCase()===String(input[key]||'').toLowerCase()&&input[key]));const entry={...input,id:input.id||data[existing]?.id||crypto.randomUUID(),updatedAt:new Date().toISOString()};if(existing>=0)data[existing]={...data[existing],...entry};else data.push(entry);writeFileData(file,data);return send(res,200,entry);}catch{return send(res,400,{error:'Could not save library item'});}}if(req.method==='DELETE'&&libraryMatch[2]){data=data.filter(x=>x.id!==decodeURIComponent(libraryMatch[2]));writeFileData(file,data);return send(res,200,{ok:true});}return send(res,405,{error:'Method not allowed'});}
    if (req.method==='GET' && url.pathname==='/api/quotations') return send(res,200,readAll().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')));
    if (req.method==='GET' && url.pathname.startsWith('/api/quotations/')) { const id=decodeURIComponent(url.pathname.split('/').pop()); const q=readAll().find(x=>x.id===id); return q?send(res,200,q):send(res,404,{error:'Quotation not found'}); }
    if (req.method==='POST' && url.pathname==='/api/quotations') {
      try { const input=await body(req); const all=readAll(); const now=new Date().toISOString(); const id=input.id || crypto.randomUUID(); const item={...input,id,createdAt:all.find(x=>x.id===id)?.createdAt||now,updatedAt:now}; const idx=all.findIndex(x=>x.id===id); if(idx>=0) all[idx]=item; else all.push(item); fs.writeFileSync(DATA,JSON.stringify(all,null,2)); return send(res,200,item); } catch(e){ return send(res,400,{error:'Could not save quotation'}); }
    }
    if (req.method==='DELETE' && url.pathname.startsWith('/api/quotations/')) { const id=decodeURIComponent(url.pathname.split('/').pop()); const all=readAll().filter(x=>x.id!==id); fs.writeFileSync(DATA,JSON.stringify(all,null,2)); return send(res,200,{ok:true}); }
    return send(res,404,{error:'API route not found'});
  }
  let pathname=decodeURIComponent(url.pathname); if(pathname==='/') pathname='/index.html';
  const file=path.resolve(PUBLIC,'.'+pathname); if(!file.startsWith(PUBLIC+path.sep) && file!==path.join(PUBLIC,'index.html')) {res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(err,content)=>{ if(err){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found');} res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content); });
});
server.listen(PORT,'0.0.0.0',()=>{
  console.log(`EYE SECURE Quotation Builder running on port ${PORT}`);
  console.log(`On this PC: http://localhost:${PORT}`);
  const interfaces=os.networkInterfaces();
  for (const entries of Object.values(interfaces)) for (const item of (entries||[])) {
    if (item.family==='IPv4' && !item.internal) console.log(`On another device on the same Wi-Fi: http://${item.address}:${PORT}`);
  }
  console.log('Keep this window open. Only share access with trusted devices on your private Wi-Fi.');
});
