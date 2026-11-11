import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {root,hash,config,atomic,jobDir} from './common.mjs';
import {assertPublicCopy} from './public-copy.mjs';
export async function makers(){
 const file=path.join(os.homedir(),'.edgeone',hash('eo_token'));
 const auth=JSON.parse(fs.readFileSync(file,'utf8'));
 if(auth.key!=='eo_token'||!auth.value?.Token)throw Error('腾讯登录已失效，请先重新登录');
 const require=createRequire(path.join(root,'runtime/site-publisher/edgeone-tools/package.json'));
 const {Makers}=await import(pathToFileURL(require.resolve('@edgeone/makers-sdk')));
 return new Makers({token:auth.value.Token,region:'china',timeout:30,retries:2});
}
export async function projectCheck(api){const cfg=config(true),p=await api.projects.get({projectId:cfg.projectId});if(p.name!==cfg.projectName||p.area!=='overseas')throw Error('腾讯项目名称或境外区域校验失败');return p;}
export function edgeoneArtifact(id,manifest,preview=false){
 const source=path.join(jobDir(id),'staging/.vercel/output/static'),out=path.join(jobDir(id),preview?'edgeone-preview':'edgeone-production');
 if(fs.existsSync(out))throw Error('发布封装已存在，不覆盖旧任务');fs.mkdirSync(out,{recursive:true});
 for(const f of manifest.files){const input=path.join(source,f.path),target=path.join(out,f.path);if(hash(fs.readFileSync(input))!==f.sha256)throw Error('静态文件哈希校验失败');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(input,target);}
 const redirects=[{source:'$wwwhost',destination:'$host',statusCode:301},...manifest.routes.filter(p=>p!=='/').map(p=>({source:p+'/',destination:p,statusCode:301})),...Object.entries(manifest.redirects).map(([source,destination])=>({source,destination,statusCode:301}))];
 const rewrites=manifest.routes.filter(p=>p!=='/').map(p=>({source:p,destination:p+'/index.html'}));
 if(redirects.length>100||rewrites.length>100)throw Error('路由超过当前平台封装限制');
 const headers=[{source:'/*',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'},{key:'X-Content-Type-Options',value:'nosniff'},...(preview?[{key:'X-Robots-Tag',value:'noindex, nofollow'}]:[])]},{source:'/assets/*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},{source:'/*.pdf',headers:[{key:'Content-Disposition',value:'attachment'}]}];
 atomic(path.join(out,'edgeone.json'),{redirects,rewrites,headers});
 return out;
}
export async function verifySite(base,manifest){
 const origin=new URL(base);let cookies='';const request=async(p,status)=>{let url=new URL(p,origin);if(!cookies)url.search=origin.search;for(let attempt=0;attempt<3;attempt++){const r=await fetch(url,{redirect:'manual',cache:'no-store',headers:cookies?{Cookie:cookies}:{},signal:AbortSignal.timeout(30000)});const setCookie=r.headers.getSetCookie();if(r.status===302&&setCookie.length&&r.headers.get('location')){const next=new URL(r.headers.get('location'),url);if(next.origin!==origin.origin||next.pathname!==url.pathname)throw Error('预览鉴权跳转目标未核准');cookies=setCookie.map(c=>c.split(';')[0]).join('; ');await r.arrayBuffer();url=next;continue;}if(r.status!==status)throw Error(`线上路径核验失败：HTTP ${r.status}，预期 ${status}`);return r;}throw Error('预览鉴权重定向核验失败');};
 const marker=await (await request('/release.json',200)).json();if(marker.id!==manifest.id||marker.contentRevision!==manifest.contentRevision)throw Error('线上版本标识校验失败');
 for(const p of manifest.routes){const html=await(await request(p,200)).text();if(!html.includes(`name="zhiqing-release" content="${manifest.id}"`)||!html.includes(`rel="canonical" href="${config().origin+p}"`))throw Error('线上页面或 canonical 校验失败');assertPublicCopy(html);}
 const media=new Set(manifest.media.map(m=>m.path));for(const f of manifest.files.filter(f=>media.has(f.path)||/\.(js|css)$/.test(f.path))){const r=await request('/'+f.path,200);if(hash(Buffer.from(await r.arrayBuffer()))!==f.sha256)throw Error('线上资源哈希校验失败');}
 for(const p of ['/admin','/api/cms/site-release','/preview','/test-states','/__intro-r4','/missing-'+manifest.id])await request(p,404);
 return {at:new Date().toISOString(),id:manifest.id,routes:manifest.routes.length,passed:true};
}
