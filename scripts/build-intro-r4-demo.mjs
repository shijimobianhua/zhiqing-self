// Compile the local-only reviewer; the normal website never imports this entry.
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const outdir = path.join(root, 'runtime/intro-r4');
fs.mkdirSync(outdir, {recursive: true});
await build({absWorkingDir: root, entryPoints: ['scripts/intro-r4-demo.tsx'], bundle: true, outdir,
  entryNames: 'lab', jsx: 'automatic', format: 'esm', target: 'es2022',
  external: ['/fonts/*', '/assets/*'], define: {'process.env.NODE_ENV': '"production"'}});
const labCSS = `
/* Explicit manual review override. This CSS is never part of the website. */
html[data-intro-lab="r4"] .intro-gate[open]{display:block!important}
.r4-review-panel{position:fixed;bottom:16px;right:16px;z-index:100;box-sizing:border-box;width:min(580px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;padding:16px;background:#fffdf9;border:2px solid #998773;font:14px/1.65 Noto,system-ui,sans-serif;box-shadow:4px 4px 0 #e0d5c4}
.r4-review-panel p{margin:8px 0}.r4-review-actions{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.r4-review-actions button{font-size:14px}.r4-review-actions button:disabled{opacity:.45;cursor:default}.r4-review-results summary{cursor:pointer;padding:8px 0}.r4-review-results pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.5;max-height:260px;overflow:auto}.r4-review-table{overflow:auto}.r4-review-table table{border-collapse:collapse;font-size:12px;white-space:nowrap;width:100%}.r4-review-table th,.r4-review-table td{padding:5px 7px;text-align:left;border-bottom:1px solid #d8d0c3}.r4-review-hint{border-left:3px solid #c8a46b;padding-left:10px}.r4-review-small{font-size:12px;color:#74675d}.r4-review-small a{text-decoration:underline}
`;
fs.writeFileSync(path.join(outdir, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>之青 R4 本机审片台</title><link rel="stylesheet" href="/__intro-r4/lab.css"><style>${labCSS}</style></head><body><div id="root"></div><script type="module" src="/__intro-r4/lab.js"></script></body></html>`);
console.log('Local R4 lab compiled; excluded from Sites build/staging.');
