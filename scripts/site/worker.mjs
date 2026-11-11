import fs from 'node:fs';
import path from 'node:path';
import {root,jobDir,readJob,updateJob,config,hash,atomic,runCLI,currentRelease,releaseLock,safeError,allJobs,sourceRevision} from './common.mjs';
import {buildRelease,checkRelease,walk} from './build.mjs';
const id=process.argv[2],dir=jobDir(id);
const cfg=config(true);
const set=(state,message,extra={})=>updateJob(id,{state,stage:state,message,...extra});
function parseJSON(text){const start=text.indexOf('{');if(start<0)throw Error('Vercel 未返回有效部署回执');return JSON.parse(text.slice(start));}
async function remoteInfo(url,staging){const data=parseJSON(await runCLI(['inspect',url,'--json'],staging));if(data.projectId&&data.projectId!==cfg.projectId)throw Error('远端部署项目归属校验失败');return data;}
async function response(url,expected){const r=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(30000)});if(r.status!==expected)throw Error(`线上路径核验失败：HTTP ${r.status}，预期 ${expected}`);return r;}
async function verify(base,manifest){
 const release=await (await response(base+'/release.json',200)).json();if(release.id!==manifest.id||release.contentRevision!==manifest.contentRevision||release.appRevision!==manifest.appRevision)throw Error('线上发布版本标识校验失败');
 for(const route of manifest.routes){const r=await response(base+route,200),text=await r.text();if(!text.includes(`name="zhiqing-release" content="${manifest.id}"`)||!text.includes(`rel="canonical" href="${cfg.origin+route}"`))throw Error('线上页面版本或 canonical 校验失败');}
 const mediaPaths=new Set(manifest.media.map(m=>m.path));
 const sample=manifest.files.filter(f=>mediaPaths.has(f.path)||/\.(js|css)$/.test(f.path));
 for(const ext of ['.woff2','.webp','.png']){const f=manifest.files.find(f=>f.path.endsWith(ext));if(f)sample.push(f);}
 for(const f of sample){const r=await response(base+'/'+f.path,200);if(hash(Buffer.from(await r.arrayBuffer()))!==f.sha256)throw Error('线上媒体或程序文件哈希校验失败');if(f.path.endsWith('.pdf')&&!r.headers.get('content-type')?.includes('application/pdf'))throw Error('公开 PDF 类型校验失败');}
 for(const p of ['/site-release-missing-'+id,'/admin','/api/cms/site-release','/test-states','/__intro-r4','/preview','/runtime/t3/secrets.json'])await response(base+p,404);
 for(const [old,target]of Object.entries(manifest.redirects)){const r=await response(base+old,308);if(new URL(r.headers.get('location'),base).pathname!==target)throw Error('旧址重定向核验失败');}
 if(manifest.routes.includes('/works')){const r=await response(base+'/works/?probe=1',308),location=new URL(r.headers.get('location'),base);if(location.pathname!=='/works'||location.search!=='?probe=1')throw Error('尾斜杠或查询参数跳转核验失败');}
 const robots=await (await response(base+'/robots.txt',200)).text();if(!robots.includes('Allow: /')||!robots.includes(cfg.origin+'/sitemap.xml'))throw Error('robots 核验失败');
 if(base===cfg.origin){const r=await response('https://www.zhiqing-shijimo.site/works?probe=1',308);const to=new URL(r.headers.get('location'),base);if(to.href!==cfg.origin+'/works?probe=1')throw Error('www 域名跳转核验失败');}
 atomic(path.join(dir,base===cfg.origin?'production-check.json':'candidate-check.json'),{at:new Date().toISOString(),base,release:release.id,passed:true,routes:manifest.routes.length,resources:sample.length});
}
async function deletionGuard(manifest){process.env.ZHIQING_ROOT=root;process.env.T3_ENABLED='1';const {canRollback}=await import('../../apps/web/src/server/site-release/export.ts');if(!await canRollback(manifest.objectIds))throw Error('此历史版本含已永久删除的内容，不允许回退');}
async function retain(){const current=readJob(id);const success=allJobs().filter(j=>j.state==='succeeded');for(const job of success.slice(10)){if(job.id===current.id)continue;const base=jobDir(job.id);for(const name of ['build','staging','media']){const target=path.resolve(base,name);if(path.dirname(target)!==base)throw Error('发布缓存清理路径无效');fs.rmSync(target,{recursive:true,force:true});}updateJob(job.id,{retired:true});}}
let manifest,staging,previous=currentRelease();
try{
 let job=readJob(id);
 updateJob(id,{workerPid:process.pid});
 if(job.kind==='rollback'){
  const source=readJob(job.rollbackId);if(source.state!=='succeeded'||source.retired)throw Error('历史发布不存在或已超过10份保留窗口');
  manifest=await checkRelease(source.id);await deletionGuard(manifest);
  staging=path.join(dir,'staging');fs.cpSync(path.join(jobDir(source.id),'staging'),staging,{recursive:true});
  atomic(path.join(dir,'manifest.json'),manifest);updateJob(id,{counts:source.counts,contentRevision:source.contentRevision,appRevision:source.appRevision,artifactHash:source.artifactHash,objectIds:source.objectIds,graphHash:source.graphHash});
 }else{
  manifest=fs.existsSync(path.join(dir,'manifest.json'))?await checkRelease(id):await buildRelease(id);
  staging=path.join(dir,'staging');
 }
 fs.mkdirSync(path.join(staging,'.vercel'),{recursive:true});atomic(path.join(staging,'.vercel/project.json'),{orgId:cfg.orgId,projectId:cfg.projectId,projectName:cfg.projectName});
 job=readJob(id);
 if(!job.remoteURL){
  if(job.uploadAttempted)throw Error('上次上传结果未确认，请先核对 Vercel 中带有此任务标识的部署，不能重复上传');
  set('uploading','上传仅包含公开文件的静态候选',{uploadAttempted:true,previousURL:previous?.remoteURL||null});
  const output=await runCLI(['deploy','--prebuilt','--prod','--skip-domain','--yes','--meta','siteRelease='+id],staging,line=>{const urls=line.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g);if(urls?.length)updateJob(id,{remoteURL:urls.at(-1)});});
  const urls=output.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g);if(urls?.length)updateJob(id,{remoteURL:urls.at(-1)});
 }
 job=readJob(id);if(!job.remoteURL)throw Error('Vercel 上传回执缺少部署地址，请先核对远端结果');
 const info=await remoteInfo(job.remoteURL,staging);updateJob(id,{remoteId:info.id});
 if((info.readyState||info.status)!=='READY')throw Error('Vercel 候选尚未就绪或部署失败');
 set('verifying','核验候选页面、媒体、真实404和版本');await verify(job.remoteURL,manifest);
 // Before promotion a source edit cannot silently mix a different program version.
 if(job.kind!=='rollback'&&sourceRevision()!==manifest.appRevision)throw Error('程序源码已变更，候选保留；请创建新的发布任务');
 if(!config().domainReady)throw Error('静态候选已通过；域名尚未完成配置，请先绑定 DNS 后恢复此任务');
 set('promoting','候选已通过，切换正式域名',{promoteAttempted:true});
 await runCLI(['promote',job.remoteURL,'--yes'],staging);updateJob(id,{promoted:true});
 let last;for(let attempt=0;attempt<5;attempt++){try{await verify(cfg.origin,manifest);last=null;break;}catch(e){last=e;await new Promise(r=>setTimeout(r,2000));}}if(last)throw last;
 const completed=set('succeeded','正式网站已更新，版本和资源核验通过',{reconciled:true});
 atomic(path.join(path.dirname(dir),'../current.json'),{id:manifest.id,jobId:id,remoteURL:job.remoteURL,remoteId:info.id,contentRevision:manifest.contentRevision,appRevision:manifest.appRevision,artifactHash:manifest.artifactHash,graphHash:completed.graphHash,at:new Date().toISOString()});
 await retain();
}catch(e){
 const job=readJob(id);let restored=false;
 if(job.promoteAttempted&&previous?.remoteURL){try{await runCLI(['promote',previous.remoteURL,'--yes'],staging);const prior=JSON.parse(fs.readFileSync(path.join(jobDir(previous.jobId),'manifest.json'),'utf8'));await verify(cfg.origin,prior);restored=true;}catch{}}
 const message=safeError(e)+(job.promoteAttempted?(restored?'；已恢复并核验上一线上版本。':'；正式域名可能已切换，请核对线上版本，未确认回退。'):'；尚未切换正式域名。');
 updateJob(id,{state:'failed',error:message,message,restored,reconciled:!job.promoteAttempted||restored});
 console.error(message);
}finally{releaseLock(id);process.exit(readJob(id).state==='succeeded'?0:1);}
