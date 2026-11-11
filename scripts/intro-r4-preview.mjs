// Loopback-only, read-only local reviewer. No CMS proxy or private-directory root.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'apps/preview/public');
const dist = path.join(root, 'dist');
const lab = path.join(root, 'runtime/intro-r4');
const port = 5188;
const labFiles = new Set(['index.html', 'lab.js', 'lab.css']);
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.pdf': 'application/pdf'};
const server = http.createServer((req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {res.writeHead(405, {Allow: 'GET, HEAD'}); res.end(); return;}
    let pathname;
    try {pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1:' + port).pathname);}
    catch {res.writeHead(400); res.end('Invalid path'); return;}
    if (pathname === '/__intro-r4') {res.writeHead(302, {Location: '/__intro-r4/', 'Cache-Control': 'no-store'}); res.end(); return;}
    let base = dist, rel = pathname.replace(/^\/+/, '');
    if (pathname.startsWith('/__intro-r4/')) {
      base = lab; rel = pathname.slice('/__intro-r4/'.length) || 'index.html';
      if (!labFiles.has(rel)) {res.writeHead(404); res.end('Not found'); return;}
    } else if (pathname.startsWith('/fonts/')) base = publicDir;
    else if (pathname.startsWith('/assets/')) {
      // Canonical illustrations/fonts live in public; hashed application
      // bundles live in dist/assets. Never shadow those bundles with public/.
      const publicAsset = path.resolve(publicDir, rel);
      if (publicAsset.startsWith(publicDir + path.sep) && fs.existsSync(publicAsset) && fs.statSync(publicAsset).isFile()) base = publicDir;
    }
    let file = path.resolve(base, rel);
    if (file !== base && !file.startsWith(base + path.sep)) {res.writeHead(403); res.end(); return;}
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404); res.end('Not found'); return;}
    // Also reject a reparse point/symlink that resolves outside its selected root.
    const actualBase = fs.realpathSync(base), actualFile = fs.realpathSync(file);
    if (!actualFile.startsWith(actualBase + path.sep)) {res.writeHead(403); res.end(); return;}
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Intro-Lab': 'local-r4-only'});
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
  } catch {if (!res.headersSent) res.writeHead(500); res.end('Local preview failed');}
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? '5188端口已被占用。若已有R4审片台，请直接访问 http://127.0.0.1:5188/__intro-r4/ 。没有停止任何已有服务。'
    : 'R4 preview failed: ' + error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log('R4 local review http://127.0.0.1:' + port + '/__intro-r4/\nNormal visit test http://127.0.0.1:' + port + '/\nCtrl+C stops this R4 reviewer only. R2 at5186 is untouched.'));
