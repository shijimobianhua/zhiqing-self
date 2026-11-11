// Non-destructive production regression. Does not edit any content or media.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(new URL('../apps/web/package.json',import.meta.url)),{Pool}=require('pg');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'runtime/t3/secrets.json'))),db=new Pool({connectionString:cfg.databaseURL});
const dir=path.join(root,'docs/verification-t5');fs.mkdirSync(dir,{recursive:true});const mode=process.argv[2]||'final',checks=[];
try{
 const rows=(await db.query('SELECT id,kind,draft,version,published,publication_version,lifecycle FROM zq_content ORDER BY id')).rows;
 const contentHash=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 const media=(await db.query('SELECT id,mime FROM zq_media ORDER BY id')).rows,files=[];
 for(const m of media)for(const name of m.mime==='application/pdf'?['original']:['original','display.webp','thumb.webp']){const b=fs.readFileSync(path.join(root,'runtime/t3/media',m.id,name));files.push({path:m.id+'/'+name,sha256:createHash('sha256').update(b).digest('hex')});}
 if(mode==='before'){fs.writeFileSync(path.join(dir,'data-before.json'),JSON.stringify({contentHash,counts:rows.reduce((a,r)=>(a[r.kind]=(a[r.kind]||0)+1,a),{}),files},null,2));console.log('Captured main business rows and '+files.length+' media hashes.');}
 else{
 const before=JSON.parse(fs.readFileSync(path.join(dir,'data-before.json')));assert.equal(contentHash,before.contentHash,'Main business rows changed');assert.deepEqual(files,before.files);checks.push('program rebuild preserves all business rows and private media bytes');
 const health=await fetch(cfg.origin+'/api/cms/health').then(r=>r.json());assert.equal(health.stage,'T5-R1');assert.equal(health.faultInjection,false);
 const headers={Origin:cfg.origin,'X-Zhiqing-CSRF':'1','Content-Type':'application/json'};
 const login=await fetch(cfg.origin+'/api/cms/login',{method:'POST',headers,body:JSON.stringify({email:cfg.ownerEmail,password:cfg.ownerPassword})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert(/HttpOnly/i.test(login.headers.get('set-cookie')));assert(/SameSite=Strict/i.test(login.headers.get('set-cookie')));
 for(const route of ['entries','media','maintenance']){const a=await fetch(cfg.origin+'/api/cms/'+route);assert.equal(a.status,401);assert.match(a.headers.get('cache-control'),/no-store/);const b=await fetch(cfg.origin+'/api/cms/'+route,{headers:{Cookie:cookie,Origin:cfg.origin}});assert.equal(b.status,200,route);}checks.push('owner reads with trusted Origin and anonymous private API denials/no-store');
 for(const route of ['/api/users','/api/works','/api/graphql','/preview/content/'+rows[0].id]){const r=await fetch(cfg.origin+route,{redirect:'manual'});assert.equal(r.status,404);}checks.push('native Payload APIs and anonymous saved preview closed');
 const preview=await fetch(cfg.origin+'/preview/content/'+rows.find(r=>r.kind==='work').id,{headers:{Cookie:cookie,Origin:cfg.origin}});assert.equal(preview.status,200);const previewText=await preview.text();assert(previewText.includes('当前为已保存草稿，公开版本未改变。'));assert(!previewText.includes('预览 · T4 本机'));checks.push('owner saved preview uses accurate draft notice and current stage');
 const published=rows.filter(r=>r.published&&r.lifecycle==='active'&&['work','note'].includes(r.kind));
 for(const r of published){const collection=r.kind==='work'?'works':'notes',slug=r.published.view.slug,url='/'+collection+'/'+slug;
 const response=await fetch(cfg.origin+url);assert.equal(response.status,200);const text=await response.text();assert(text.includes(r.published.view.title.replaceAll('&','&amp;')));assert.match(text,/<meta name="robots" content="noindex, nofollow"/);assert.match(text,/rel="canonical"/);assert.match(text,/property="og:title"/);assert.match(text,/name="twitter:title"/);const api=await fetch(cfg.origin+'/api/public'+url);assert.equal(api.status,200);assert(!(await api.text()).includes('preserved'));}
 checks.push('all published work/note SSR body, metadata, noindex and public DTO');
 const gone=await fetch(cfg.origin+'/t5-unknown-path');assert.equal(gone.status,404);const siteMap=await fetch(cfg.origin+'/sitemap.xml');assert.equal(siteMap.status,200);const xml=await siteMap.text();assert(!/admin|preview|test-states/.test(xml));checks.push('true 404 and public-only sitemap');
 const aliases=(await db.query("SELECT p.collection,p.slug,c.published FROM zq_paths p JOIN zq_content c ON c.id=p.object_id WHERE c.published IS NOT NULL AND c.lifecycle='active'")).rows.filter(r=>r.slug!==r.published.view.slug);
 for(const a of aliases){const r=await fetch(cfg.origin+'/'+a.collection+'/'+a.slug,{redirect:'manual'});assert.equal(r.status,308);assert(r.headers.get('location').endsWith('/'+a.published.view.slug));}checks.push('retained old paths remain true one-hop 308');
 await fetch(cfg.origin+'/api/cms/logout',{method:'POST',headers:{...headers,Cookie:cookie},body:'{}'});assert.equal((await fetch(cfg.origin+'/api/cms/session',{headers:{Cookie:cookie}})).status,401);checks.push('logout revokes real session');
 const migrations=(await db.query('SELECT version,checksum FROM zq_migrations ORDER BY version')).rows;
 fs.writeFileSync(path.join(dir,'local-regression.json'),JSON.stringify({candidate:'T5-R1',health,contentHash,counts:before.counts,mediaFiles:files.length,migrations,checks,scope:'Current non-destructive regression; T3/T4 fault, nonowner, mutation and restore evidence remains historical and separately attributed.'},null,2));console.log('PASS '+checks.length+' production regression groups; main content/media unchanged.');
 }
}finally{await db.end();}
