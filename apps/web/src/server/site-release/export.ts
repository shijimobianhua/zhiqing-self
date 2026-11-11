import fs from 'node:fs/promises';
import path from 'node:path';
import {pool,transaction} from '../t3/db.ts';
import {mediaRoot,CmsError} from '../t3/config.ts';
import {publicGraph,lock} from '../t4/content.ts';
import {validatePublicGraph} from '@zhiqing/content';
import {hash,jobDir,updateJob,sourceRevision,config} from '../../../../../scripts/site/common.mjs';

// The same transaction client is passed to every graph/alias/media query.
// The content writer/cleanup lock also protects the fixed media files while copied.
export async function exportRelease(id:string){
 const dir=jobDir(id),cfg=config();
 updateJob(id,{state:'exporting',stage:'exporting',message:'固定公开内容和媒体版本'});
 const appRevision=sourceRevision();
 return transaction(async c=>{
  await lock(c);
  const graph=await approvedGraph(c);
  if(!graph.data.settings?.name)throw new CmsError(422,'缺少已公开的网站设置');
  const chosen:any=structuredClone({data:graph.data,works:graph.works,notes:graph.notes});
  delete chosen.data.candidate;
  // Hosting and editing details belong to the local owner interface.
  chosen.data.settings.backendNotice='';
  const media:any[]=[],map=new Map<string,string>();
  async function convert(v:any):Promise<any>{
   if(typeof v==='string'){
    const m=v.match(/^\/media\/([a-f0-9-]{36})\/(display|thumb|original)$/);
    if(!m){if(v.startsWith('/media/'))throw new CmsError(422,'公开媒体路径无效');return v;}
    const key=m[1]+'/'+m[2];if(map.has(key))return map.get(key);
    const row=(await c.query('SELECT mime,sha256 FROM zq_media WHERE id=$1',[m[1]])).rows[0];
    if(!row)throw new CmsError(422,'公开媒体不存在，发布已阻止');
    if((m[2]==='original')!==(row.mime==='application/pdf'))throw new CmsError(422,'不允许导出私有原图或无效 PDF 变体');
    const name=m[2]==='original'?'original':m[2]+'.webp';
    const bytes=await fs.readFile(path.join(mediaRoot,m[1],name)).catch(()=>{throw new CmsError(422,'公开媒体文件缺失，发布已阻止');});
    const sha256=hash(bytes);if(m[2]==='original'&&sha256!==row.sha256)throw new CmsError(422,'公开 PDF 校验失败');
    const rel=`assets/media/${sha256}.${m[2]==='original'?'pdf':'webp'}`;
    const target=path.join(dir,'media',rel);await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.writeFile(target,bytes,{mode:0o600});
    if(hash(await fs.readFile(path.join(mediaRoot,m[1],name)))!==sha256)throw new CmsError(422,'导出期间媒体已变更');
    media.push({path:rel,sha256,bytes:bytes.length,sourceId:m[1],variant:m[2]});map.set(key,'/'+rel);return '/'+rel;
   }
   if(Array.isArray(v)){const out=[];for(const item of v)out.push(await convert(item));return out;}
   if(v&&typeof v==='object'){const out:any={};for(const [k,i]of Object.entries(v))out[k]=await convert(i);return out;}
   return v;
  }
  const selected=await convert(chosen);validatePublicGraph(selected.data,selected.works,selected.notes);
  const redirects:Record<string,string>={};
  for(const row of (await c.query('SELECT collection,slug,object_id FROM zq_paths')).rows){const record=(row.collection==='works'?selected.works:row.collection==='product-in-context'?(selected.data.contextArticles??[]):selected.notes).find((r:any)=>r.id===row.object_id);if(record&&record.slug!==row.slug)redirects[`/${row.collection}/${row.slug}`]=`/${row.collection}/${record.slug}`;}
  const versions=graph.versions,contentRevision=hash({selected,versions,redirects,media});
  const body={...selected,redirects,snapshot:{id,origin:cfg.origin,contentRevision,appRevision,versions,media}};
  await fs.writeFile(path.join(dir,'snapshot.json'),JSON.stringify(body,null,2)+'\n',{flag:'wx',mode:0o600});
  updateJob(id,{counts:{works:selected.works.length,notes:selected.notes.length,media:media.length},contentRevision,appRevision,graphHash:hash(graph),configHash:hash(cfg),snapshotHash:hash(body),objectIds:Object.keys(versions)});
  return body;
 });
}

export async function approvedGraph(c:Pick<import('pg').PoolClient,'query'>=pool()){
 const approvals=new Map<string,string>((await c.query('SELECT content_id,publication_version FROM zq_site_release_approvals')).rows.map(r=>[r.content_id,String(r.publication_version)]));
 return publicGraph(c,approvals);
}
export async function pendingRevision(){return hash(await approvedGraph());}
export async function canRollback(objectIds:string[]){const ids=(await pool().query('SELECT id FROM zq_content WHERE id=ANY($1::uuid[])',[objectIds])).rows.map(r=>r.id);return objectIds.every(id=>ids.includes(id));}
