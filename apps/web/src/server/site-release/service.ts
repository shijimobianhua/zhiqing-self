import fs from 'node:fs';
import path from 'node:path';
import {assertActor} from '../t3/works.ts';
import {CmsError} from '../t3/config.ts';
import type {Actor} from '../t3/model.ts';
import {publicGraph,hash} from '../t4/content.ts';
import {exportRelease,canRollback,approvedGraph} from './export.ts';
import {config,claim,activeJob,allJobs,publicJob,currentRelease,readJob,jobDir,updateJob,releaseLock,startWorker,safeError,terminal,uuid} from '../../../../../scripts/site/common.mjs';

export async function siteStatus(actor:Actor){assertActor(actor);if(process.env.T4_ISOLATED_ID)throw new CmsError(422,'隔离恢复环境不操作公网发布');const current=currentRelease(),graph=await approvedGraph();return {origin:config().origin,configured:!!config().projectId,domainReady:!!config().domainReady,current,hasChanges:!current||current.graphHash!==hash(graph),counts:{works:graph.works.length,notes:graph.notes.length},active:publicJob(activeJob()),history:allJobs().slice(0,30).map(publicJob),application:'L1 static/local'};}
export async function getSiteJob(id:string,actor:Actor){assertActor(actor);if(!uuid.test(id))throw new CmsError(404,'没有找到发布任务');return publicJob(readJob(id));}
export async function createSiteJob(key:string,actor:Actor,rollbackId:string|null=null){
 assertActor(actor);if(process.env.T4_ISOLATED_ID)throw new CmsError(422,'隔离环境不允许发布公网');config(true);
 let source:any=null;
 if(rollbackId){if(!uuid.test(rollbackId))throw new CmsError(400,'历史发布编号无效');source=readJob(rollbackId);if(source.state!=='succeeded'||source.retired)throw new CmsError(422,'历史发布不可回退');if(!await canRollback(source.objectIds))throw new CmsError(422,'历史版本包含已永久删除内容，不能回退');}
 let result;try{result=claim(key,rollbackId?'rollback':'publish',rollbackId);}catch(e){throw new CmsError(409,safeError(e));}
 if(!result.created)return publicJob(result.job);
 const id=result.job.id;
 try{if(!source)await exportRelease(id);startWorker(id);return publicJob(readJob(id));}catch(e){updateJob(id,{state:'failed',message:safeError(e),error:safeError(e)});releaseLock(id);throw new CmsError(422,safeError(e));}
}
