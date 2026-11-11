import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,config,configFile,atomic,claim,jobDir,readJob,updateJob,releaseLock,allJobs,publicJob,currentRelease,startWorker,runCLI,safeError,activeJob} from './common.mjs';
import {buildRelease,checkRelease} from './build.mjs';
process.env.ZHIQING_ROOT=root;process.env.T3_ENABLED='1';
const command=process.argv[2]||'status',argument=process.argv[3];
const latest=()=>argument||allJobs().find(j=>fs.existsSync(path.join(jobDir(j.id),'snapshot.json')))?.id;
try{
 switch(command){
  case 'status':console.log(JSON.stringify({config:config(),current:currentRelease(),active:publicJob(activeJob()),history:allJobs().slice(0,10).map(publicJob)},null,2));break;
  case 'export':case 'prepare':{
   const {exportRelease}=await import('../../apps/web/src/server/site-release/export.ts');
   const {job,created}=claim(crypto.randomUUID());if(!created)throw Error('已有运行任务，请等待完成');
   try{await exportRelease(job.id);if(command==='prepare')await buildRelease(job.id);updateJob(job.id,{state:'failed',stage:'prepared',message:'本机公开产物已准备，尚未上传'});console.log(JSON.stringify({id:job.id,prepared:true}));}catch(e){updateJob(job.id,{state:'failed',error:safeError(e),message:safeError(e)});throw e;}finally{releaseLock(job.id);}break;
  }
  case 'build':{const id=latest();if(!id)throw Error('请先运行 site:export');await buildRelease(id);console.log(JSON.stringify({id,built:true}));break;}
  case 'check':{const id=latest();if(!id)throw Error('缺少静态候选');const manifest=await checkRelease(id);console.log(JSON.stringify({id,files:manifest.files.length,bytes:manifest.bytes,artifactHash:manifest.artifactHash}));break;}
  case 'publish':case 'rollback':{
   const {secrets}=await import('../../apps/web/src/server/t3/config.ts');const {createSiteJob}=await import('../../apps/web/src/server/site-release/service.ts');
   console.log(JSON.stringify(await createSiteJob(crypto.randomUUID(),{id:secrets().ownerId},command==='rollback'?argument:null)));break;
  }
  case 'resume':{
   const old=readJob(argument);if(!['failed','interrupted'].includes(old.state))throw Error('此任务不能恢复');
   if(!old.remoteURL&&old.uploadAttempted)throw Error('上次上传结果未知，请先运行 reconcile 核对远端');
   const {job,created}=claim(crypto.randomUUID(),'resume',null);if(!created)throw Error('已有运行任务');releaseLock(job.id);fs.rmSync(path.join(jobDir(job.id),'job.json'));fs.rmdirSync(jobDir(job.id));
   fs.writeFileSync(path.join(root,'runtime/site-publisher/active.json'),JSON.stringify({id:old.id,createdAt:new Date().toISOString()}),{flag:'wx'});
   updateJob(old.id,{state:'queued',stage:old.stage,message:'正在恢复已固定的发布任务',error:null});startWorker(old.id);console.log(JSON.stringify({id:old.id,resumed:true}));break;
  }
  case 'reconcile':{const j=readJob(argument);const {makers,verifySite}=await import('./edgeone.mjs');const api=await makers();if(!j.candidateId)throw Error('缺少可核对的远端编号，请先在腾讯控制台核对上传记录，不能盲目重试');const d=await api.deployments.wait({projectId:config(true).projectId,deploymentId:j.candidateId,timeout:60});if(d.status!=='Success')throw Error('远端候选未成功');const manifest=JSON.parse(fs.readFileSync(path.join(jobDir(j.id),'manifest.json'),'utf8'));await verifySite(d.previewUrl,manifest);updateJob(j.id,{reconciled:true,remoteId:d.deploymentId,remoteURL:new URL(d.previewUrl).origin});console.log(JSON.stringify(publicJob(readJob(j.id))));break;}  case 'configure':{await import('./configure-edgeone.mjs');break;}
  default:throw Error('命令无效');
 }
}catch(e){console.error(safeError(e));process.exitCode=1;}finally{try{const {pool}=await import('../../apps/web/src/server/t3/db.ts');await pool().end();}catch{}}
