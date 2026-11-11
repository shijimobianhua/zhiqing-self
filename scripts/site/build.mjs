import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {root,hash,jobDir,readJob,updateJob,sourceRevision,config,atomic} from './common.mjs';
import {assertPublicCopy} from './public-copy.mjs';
const req=createRequire(path.join(root,'apps/preview/package.json'));
const {build:bundle}=req('esbuild');
export function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const regex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export async function buildRelease(id){
 const dir=jobDir(id),job=readJob(id),cfg=config();
 const snapshot=JSON.parse(fs.readFileSync(path.join(dir,'snapshot.json'),'utf8'));
 if(hash(snapshot)!==job.snapshotHash||snapshot.snapshot.origin!==cfg.origin)throw Error('公开快照或域名配置校验失败');
 if(sourceRevision()!==job.appRevision)throw Error('程序源码已变更，请创建新的发布任务');
 updateJob(id,{state:'building',stage:'building',message:'使用固定公开快照构建静态页面'});
 const buildDir=path.join(dir,'build'),staging=path.join(dir,'staging'),staticDir=path.join(staging,'.vercel/output/static');
 for(const d of [buildDir,staticDir])fs.mkdirSync(d,{recursive:true});
 const adapter=path.join(dir,'public-adapter.ts'),ui=path.join(dir,'public-ui.ts');
 const url=p=>p.replaceAll('\\','/');
 fs.writeFileSync(adapter,`import selected from './snapshot.json';export const works=selected.works,notes=selected.notes,siteData=selected.data,publicSnapshot=selected.snapshot,redirects=selected.redirects;`);
 fs.writeFileSync(ui,`export {SiteLayout} from ${JSON.stringify(url(path.join(root,'packages/ui/src/Site.tsx')))};export {RouteView} from ${JSON.stringify(url(path.join(root,'packages/ui/src/RouteViewPublic.tsx')))};export {FrontendBoundary} from ${JSON.stringify(url(path.join(root,'packages/ui/src/Content.tsx')))};`);
 // Both browser and prerender import exactly these two selected entry modules.
 const {build:viteBuild}=await import(pathToFileURL(req.resolve('vite')));
 await viteBuild({root:path.join(root,'apps/preview'),configFile:path.join(root,'apps/preview/vite.config.ts'),publicDir:false,resolve:{alias:{'@zhiqing/adapters':adapter,'@zhiqing/ui':ui}},define:{__PUBLIC_RELEASE__:'true'},build:{outDir:buildDir,emptyOutDir:true,sourcemap:false,reportCompressedSize:false}});
 const renderEntry=path.join(dir,'render.tsx');
 fs.writeFileSync(renderEntry,`import {renderToString} from 'react-dom/server';import {SiteLayout,RouteView} from './public-ui';import {siteData,works,notes} from './public-adapter';export function render(pathname){return renderToString(<SiteLayout pathname={pathname} data={siteData} works={works} notes={notes} hasNotes={notes.length>0} presentation="public"><RouteView pathname={pathname} data={siteData} works={works} notes={notes}/></SiteLayout>);}`);
 const metafile=await bundle({entryPoints:[renderEntry],outfile:path.join(dir,'render.mjs'),bundle:true,format:'esm',platform:'node',jsx:'automatic',packages:'bundle',external:['react','react-dom/server','react/jsx-runtime'],metafile:true});
 if(Object.keys(metafile.metafile.inputs).some(p=>/adapters\/src\/(fixtures|site|sites-data|snapshot)\.|TestStates/.test(p.replaceAll('\\','/'))))throw Error('正式构建依赖图混入未选择的试用数据');
 const {render}=await import(pathToFileURL(path.join(dir,'render.mjs')));
 const {contentHead,validatePublicGraph}=await import(pathToFileURL(path.join(root,'packages/content/src/index.ts')));
 validatePublicGraph(snapshot.data,snapshot.works,snapshot.notes);
 const routes=['/','/works',...(snapshot.data.settings.notesEnabled===false?[]:['/notes']),'/about','/product-in-context',...(snapshot.data.contextArticles??[]).map(n=>'/product-in-context/'+n.slug),...snapshot.works.map(w=>'/works/'+w.slug),...snapshot.notes.map(n=>'/notes/'+n.slug)];
 if(new Set(routes).size!==routes.length||routes.some(r=>r!=='/'&&!/^\/(works|notes|about|product-in-context)(\/[a-z0-9-]+)?$/.test(r)))throw Error('正式公开路由无效或重复');
 const template=fs.readFileSync(path.join(buildDir,'index.html'),'utf8').replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="index,follow" />');
 function html(route,valid=true){const h=contentHead(route,snapshot.data,snapshot.works,snapshot.notes,true);const canonical=cfg.origin+route;return template.replace('<div id="root"></div>',()=>`<div id="root" data-route="${esc(route)}">${render(route)}</div>`).replace(/<title>.*?<\/title>/s,()=>`<title>${esc(h.title)}</title>`).replace(/<meta name="description"[^>]*>/,()=>`<meta name="description" content="${esc(h.description)}" />`).replace('</head>',()=>`${valid?`<link rel="canonical" href="${esc(canonical)}" /><meta property="og:url" content="${esc(canonical)}" />`:''}<meta property="og:title" content="${esc(h.title)}" /><meta property="og:description" content="${esc(h.description)}" /><meta property="og:image" content="${esc(new URL(h.image,cfg.origin).href)}" /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><meta name="zhiqing-release" content="${id}" /></head>`);}
 fs.cpSync(buildDir,staticDir,{recursive:true});
 for(const route of routes){const file=path.join(staticDir,route==='/'?'index.html':route.slice(1)+'/index.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html(route));}
 fs.writeFileSync(path.join(staticDir,'404.html'),html('/missing',false).replace('content="index,follow"','content="noindex,nofollow"'));
 const originalPublic=path.join(root,'apps/preview/public');
 // Only project-owned role/R4 art and locally licensed font files, never old CMS snapshots.
 for(const category of ['assets','fonts'])for(const source of walk(path.join(originalPublic,category))){const rel=path.relative(originalPublic,source).replaceAll('\\','/');if(rel.startsWith('assets/')&&!rel.startsWith('assets/role-202611/'))continue;if(rel.startsWith('assets/')&&(!/\.(png|webp)$/.test(rel)||path.basename(rel).startsWith('cms-')||/intro-r[123]|intro-window|intro-salute/.test(rel)))continue;const dest=path.join(staticDir,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}
 if(fs.existsSync(path.join(dir,'media')))fs.cpSync(path.join(dir,'media'),staticDir,{recursive:true});
 // Content-address every binary resource, then CSS, then JS. Rewrite HTML and all
 // embedded URLs together so SSR/hydration and lazy R4 images use identical bytes.
 const replacements=new Map();
 const resourceFiles=walk(staticDir).filter(f=>!/[.](html|js|css)$/.test(f));
 for(const f of resourceFiles){const rel=path.relative(staticDir,f).replaceAll('\\','/');if(rel.startsWith('assets/media/'))continue;const ext=path.extname(f),name=`assets/files/${hash(fs.readFileSync(f))}${ext}`;fs.mkdirSync(path.dirname(path.join(staticDir,name)),{recursive:true});fs.copyFileSync(f,path.join(staticDir,name));replacements.set('/'+rel,'/'+name);fs.unlinkSync(f);}
 function rewrite(text){for(const [from,to]of [...replacements].sort((a,b)=>b[0].length-a[0].length))text=text.replaceAll(from,to);return text;}
 for(const ext of ['.css','.js'])for(const f of walk(staticDir).filter(f=>f.endsWith(ext))){const text=rewrite(fs.readFileSync(f,'utf8'));const old='/'+path.relative(staticDir,f).replaceAll('\\','/'),next='/assets/'+hash(text)+ext;fs.writeFileSync(path.join(staticDir,next),text);fs.unlinkSync(f);replacements.set(old,next);}
 for(const f of walk(staticDir).filter(f=>f.endsWith('.html')))fs.writeFileSync(f,rewrite(fs.readFileSync(f,'utf8')));
 fs.writeFileSync(path.join(staticDir,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${cfg.origin}/sitemap.xml\n`);
 fs.writeFileSync(path.join(staticDir,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(r=>`<url><loc>${esc(cfg.origin+r)}</loc></url>`).join('')}</urlset>`);
 atomic(path.join(staticDir,'release.json'),{id,contentRevision:job.contentRevision,appRevision:job.appRevision});
 fs.writeFileSync(path.join(staticDir,'THIRD_PARTY_NOTICES.txt'),'本次没有引入 NotionNext 代码或媒体。本站字体按随附许可使用。\n'+walk(path.join(originalPublic,'fonts')).filter(f=>/license|ofl|notice/i.test(f)).map(f=>path.basename(f)+'\n'+fs.readFileSync(f,'utf8')).join('\n\n'));
 const routing=[
  {src:'^/(.*)$',has:[{type:'host',value:'www.zhiqing-shijimo.site'}],status:308,headers:{Location:cfg.origin+'/$1'}},
  {src:'^/(.*)$',missing:[{type:'host',value:'zhiqing-shijimo.site'}],headers:{'X-Robots-Tag':'noindex, nofollow'},continue:true},
  {src:'^/(.*)$',headers:{'Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'},continue:true},
  {src:'^/assets/(.*)$',headers:{'Cache-Control':'public, max-age=31536000, immutable'},continue:true},
  {src:'^/(.*)\.pdf$',headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment'},continue:true},
  {src:'^/(.+)/$',status:308,headers:{Location:'/$1'}},
  ...Object.entries(snapshot.redirects).map(([old,target])=>{if(!routes.includes(target)||!/^\/(works|notes|product-in-context)\/[a-z0-9-]+$/.test(old))throw Error('旧址目标未公开');return {src:'^'+regex(old)+'$',status:308,headers:{Location:target}};}),
  ...routes.map(route=>({src:'^'+regex(route)+'$',dest:route==='/'?'/index.html':route+'/index.html'})),
  {handle:'filesystem'},
  {src:'.*',dest:'/404.html',status:404}
 ];
 atomic(path.join(staging,'.vercel/output/config.json'),{version:3,routes:routing});
 if(routing.length>2048)throw Error('公开路由超过已核对的平台限制');
 const files=walk(staticDir).map(f=>({path:path.relative(staticDir,f).replaceAll('\\','/'),sha256:hash(fs.readFileSync(f)),bytes:fs.statSync(f).size})).sort((a,b)=>a.path.localeCompare(b.path));
 const manifest={id,origin:cfg.origin,appRevision:job.appRevision,contentRevision:job.contentRevision,configHash:job.configHash,routes,redirects:snapshot.redirects,files,media:snapshot.snapshot.media.map(m=>({...m,path:(replacements.get('/'+m.path)||'/'+m.path).slice(1)})),objectIds:job.objectIds,artifactHash:hash({files,routing}),bytes:files.reduce((n,f)=>n+f.bytes,0)};
 atomic(path.join(dir,'manifest.json'),manifest);atomic(path.join(dir,'build-inputs.json'),{inputs:Object.keys(metafile.metafile.inputs)});
 updateJob(id,{artifactHash:manifest.artifactHash});
 await checkRelease(id);
 return manifest;
}
export async function checkRelease(id){
 const dir=jobDir(id),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')),cfg=config();
 const output=path.join(dir,'staging/.vercel/output'),staticDir=path.join(output,'static');
 if(fs.existsSync(path.join(output,'functions')))throw Error('静态产物不允许包含云端函数');
 const found=walk(staticDir).map(f=>path.relative(staticDir,f).replaceAll('\\','/')).sort();
 if(found.join('\n')!==manifest.files.map(f=>f.path).sort().join('\n'))throw Error('静态文件白名单校验失败');
 for(const f of manifest.files){const bytes=fs.readFileSync(path.join(staticDir,f.path));if(hash(bytes)!==f.sha256||bytes.length!==f.bytes)throw Error('发布产物文件校验失败');if(/(^|\/)(admin|api|preview|test-states|__intro|runtime|node_modules)(\/|$)|\.map$|\.zip$|\.sql$|secrets|\.env/i.test(f.path))throw Error('私有路径混入静态产物');if(/\.(js|html|json|css|xml|txt)$/.test(f.path)&&/postgres(?:ql)?:\/\/|ownerPassword|payloadSecret|token_hash|https?:\/\/(?:127\.0\.0\.1|localhost)|zhiqing-personal-test\./i.test(bytes.toString()))throw Error('静态产物出现私有数据或旧站依赖');}
 if(manifest.bytes>cfg.uploadLimitBytes||manifest.files.some(f=>f.bytes>100*1024*1024)||manifest.files.length>15000)throw Error('静态产物超过已核对的免费套餐上传限制');
 for(const f of manifest.files.filter(f=>f.path.endsWith('.html')))assertPublicCopy(fs.readFileSync(path.join(staticDir,f.path),'utf8'));
 for(const route of manifest.routes){const h=fs.readFileSync(path.join(staticDir,route==='/'?'index.html':route.slice(1)+'/index.html'),'utf8');if(!h.includes(`name="zhiqing-release" content="${id}"`)||!h.includes(`rel="canonical" href="${cfg.origin+route}"`))throw Error('页面版本或正式 canonical 校验失败');}
 atomic(path.join(dir,'local-check.json'),{at:new Date().toISOString(),files:manifest.files.length,bytes:manifest.bytes,artifactHash:manifest.artifactHash,passed:true});
 return manifest;
}
