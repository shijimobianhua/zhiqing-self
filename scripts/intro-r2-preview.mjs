// Loopback-only static host. No CMS proxy, no database, no remote publication.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const publicDir=path.join(root,'apps/preview/public'),dist=path.join(root,'dist'),lab=path.join(root,'runtime/intro-r2');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const port=5186;
http.createServer((req,res)=>{
 try {
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:'+port).pathname);
  let base=dist,rel=pathname.replace(/^\/+/, '');
  if(pathname.startsWith('/__intro-r2/')){base=lab;rel=pathname.slice('/__intro-r2/'.length)||'index.html';if(!['index.html','lab.js','lab.css'].includes(rel)){res.writeHead(404);res.end();return;}}
  else if(pathname.startsWith('/assets/')||pathname.startsWith('/fonts/'))base=publicDir;
  let file=path.resolve(base,rel);
  if(!file.startsWith(base+path.sep)&&file!==base){res.writeHead(403);res.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Intro-Lab':'local-r2-only'});
  res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));
 }catch{res.writeHead(500);res.end('Local preview failed');}
}).listen(port,'127.0.0.1',()=>console.log('R2 local review http://127.0.0.1:5186/__intro-r2/\nNormal visit test http://127.0.0.1:5186/\nCtrl+C stops this local preview.'));
