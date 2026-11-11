import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {contract,works,notes,siteData,redirects} from './load-public-snapshot.mjs';
const dist = path.resolve(import.meta.dirname, '../apps/preview/dist');
contract.validatePublicGraph(siteData,works,notes);
const routes = ['works', ...works.map(w=>`works/${w.slug}`), 'notes', ...notes.map(n=>`notes/${n.slug}`), 'about','test-states'];
const template=readFileSync(path.join(dist,'index.html'),'utf8');
// The existing esbuild dependency bundles the shared views for build-time rendering only.
// No Node runtime or CMS is shipped to Sites. Client handlers hydrate the same fixture tree.
const require=createRequire(new URL('../apps/preview/package.json',import.meta.url));
const {build}=require('esbuild');
const serverBundle=path.resolve(import.meta.dirname,'../.sites-runtime/t2-render.mjs');
await build({entryPoints:[path.resolve(import.meta.dirname,'render-static.tsx')],outfile:serverBundle,bundle:true,format:'esm',platform:'node',jsx:'automatic',packages:'bundle',external:['react','react-dom/server','react/jsx-runtime']});
const {render}=await import(pathToFileURL(serverBundle));
const origin=JSON.parse(readFileSync(new URL('../.openai/test-site.json',import.meta.url),'utf8')).origin;
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function html(route,canonical=true) {
  const head=contract.contentHead(route,siteData,works,notes);
  return template.replace('<div id="root"></div>',()=>`<div id="root" data-route="${route}">${render(route)}</div>`).replace(/<title>.*?<\/title>/s,()=>`<title>${escape(head.title)}</title>`).replace(/<meta name="description"[^>]*>/,()=>`<meta name="description" content="${escape(head.description)}" />`)
    .replace('</head>',`${canonical?`<link rel="canonical" href="${origin}${route==='/'?'/':route+'/'}" />`:''}${canonical?`<meta property="og:url" content="${origin}${route==='/'?'/':route+'/'}" />`:''}<meta property="og:title" content="${escape(head.title)}" /><meta property="og:description" content="${escape(head.description)}" /><meta property="og:type" content="website" /><meta property="og:site_name" content="${escape(siteData.settings.name)}" /><meta property="og:image" content="${origin}${head.image}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escape(head.title)}" /><meta name="twitter:description" content="${escape(head.description)}" /><meta name="twitter:image" content="${origin}${head.image}" /></head>`);
}
// Physical clean-path entries avoid depending on an unverified SPA rewrite.
for (const route of routes) {
  mkdirSync(path.join(dist, route), { recursive: true });
  writeFileSync(path.join(dist, route, 'index.html'),html('/'+route));
}
// Static host aliases use an explicit client redirect, not a fabricated HTTP 308 claim.
for(const [old,target] of Object.entries(redirects)){
 if(!/^\/(works|notes)\/[a-z0-9-]+$/.test(old)||!/^\/(works|notes)\/[a-z0-9-]+$/.test(target))throw Error('Invalid alias path');
 const dir=path.join(dist,old.slice(1));mkdirSync(dir,{recursive:true});
 writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>地址已更新</title><link rel="canonical" href="${origin}${target}/"><script>location.replace(${JSON.stringify(target+'/')})</script></head><body><p>地址已更新。<a href="${target}/">前往当前公开内容</a></p></body></html>`);
}
writeFileSync(path.join(dist,'index.html'),html('/'));
writeFileSync(path.join(dist,'404.html'),html('/missing',false));
writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nDisallow: /\n');
// Sites' packager accepts a fixed output-directory set. Keep the app output,
// and mirror that tested build into the supported repository-root dist.
const rootDist = path.resolve(import.meta.dirname, '../dist');
if (path.dirname(rootDist) !== path.resolve(import.meta.dirname, '..') || path.basename(rootDist) !== 'dist') throw new Error('Unexpected build output path');
rmSync(rootDist, { recursive: true, force: true });
cpSync(dist, rootDist, { recursive: true });
console.log(`Prepared ${routes.length} clean-path entries and 404.html; actual HTTP semantics require hosted verification.`);
