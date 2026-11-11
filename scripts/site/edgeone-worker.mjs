import fs from 'node:fs';
import path from 'node:path';
import {config,readJob,updateJob,jobDir,privateRoot,atomic,currentRelease,releaseLock,safeError,sourceRevision} from './common.mjs';
import {buildRelease,checkRelease} from './build.mjs';
import {makers,projectCheck,edgeoneArtifact,verifySite} from './edgeone.mjs';
const id=process.argv[2],dir=jobDir(id);let api,manifest,previous=currentRelease();
const stage=(state,message,extra={})=>updateJob(id,{state,stage:state,message,...extra});
async function deploy(directory,env,key){let job=readJob(id),remoteId=job[key];if(!remoteId){if(job[key+'Attempted'])throw Error('上次远端上传结果未确认，请核对后再恢复任务');updateJob(id,{[key+'Attempted']:true});const d=await api.deployments.deploy({projectId:config(true).projectId,artifact:{directory},env,wait:false});remoteId=d.deploymentId;updateJob(id,{[key]:remoteId});}const done=await api.deployments.wait({projectId:config(true).projectId,deploymentId:remoteId,timeout:600,pollInterval:5});if(done.status!=='Success'||!done.previewUrl)throw Error('腾讯远端部署失败或缺少验证链接');return done;}
try{
 updateJob(id,{workerPid:process.pid});api=await makers();await projectCheck(api);let job=readJob(id),sourceId=id;
 if(job.kind==='rollback'){sourceId=job.rollbackId;const source=readJob(sourceId);if(source.state!=='succeeded'||source.retired)throw Error('历史发布已超过保留窗口');const {canRollback}=await import('../../apps/web/src/server/site-release/export.ts');if(!await canRollback(source.objectIds))throw Error('旧版本含已永久删除内容，不能回退');}
 manifest=fs.existsSync(path.join(jobDir(sourceId),'manifest.json'))?await checkRelease(sourceId):await buildRelease(sourceId);
 if(sourceId!==id){atomic(path.join(dir,'manifest.json'),manifest);updateJob(id,{counts:readJob(sourceId).counts,objectIds:manifest.objectIds,graphHash:readJob(sourceId).graphHash,artifactHash:manifest.artifactHash,appRevision:manifest.appRevision,contentRevision:manifest.contentRevision});}
 const production=path.join(jobDir(sourceId),'edgeone-production'),preview=path.join(jobDir(sourceId),'edgeone-preview');
 if(!fs.existsSync(production))edgeoneArtifact(sourceId,manifest,false);if(!fs.existsSync(preview))edgeoneArtifact(sourceId,manifest,true);
 const list=await api.deployments.list({projectId:config(true).projectId,env:'Production',pageSize:1});const first=!list.items.length;
 // A fresh project requires its first Production deployment before Preview exists.
 // This is allowed only before the custom domain has been activated.
 if(first&&config().domainReady)throw Error('项目尚无生产基线，请先核对域名归属');
 stage('uploading','上传已审核的静态候选');const candidate=await deploy(first?production:preview,first?'Production':'Preview','candidateId');
 updateJob(id,{remoteId:candidate.deploymentId,remoteURL:new URL(candidate.previewUrl).origin});
 stage('verifying','核验候选页面、媒体与真实404');atomic(path.join(dir,'candidate-check.json'),await verifySite(candidate.previewUrl,manifest));
 if(!config().domainReady){stage('failed','候选已部署并核验；独立域名和 HTTPS 尚待绑定',{reconciled:true});}
 else{
  if(job.kind!=='rollback'&&sourceRevision()!==manifest.appRevision)throw Error('源码已变更，请创建新任务');
  stage('promoting','将同一组静态文件发布到正式网站',{promoteAttempted:true});const online=first?candidate:await deploy(production,'Production','productionId');updateJob(id,{promoted:true,remoteId:online.deploymentId});
  // EdgeOne may report deployment Success before every custom-domain edge is refreshed.
  // Keep the known production receipt and verify propagation before reporting failure.
  const deadline=Date.now()+180000;let productionCheck;
  for(;;){try{productionCheck=await verifySite(config().origin,manifest);break;}catch(e){if(Date.now()>=deadline)throw e;updateJob(id,{message:'生产部署已完成，正在等待域名边缘节点同步并核验版本'});await new Promise(r=>setTimeout(r,5000));}}
  atomic(path.join(dir,'production-check.json'),productionCheck);
  const j=stage('succeeded','正式网站已更新并通过版本核验',{reconciled:true});atomic(path.join(privateRoot,'current.json'),{id:manifest.id,jobId:id,remoteId:online.deploymentId,remoteURL:config().origin,graphHash:j.graphHash,appRevision:manifest.appRevision,contentRevision:manifest.contentRevision,artifactHash:manifest.artifactHash,at:new Date().toISOString()});
 }
}catch(e){let message=safeError(e),restored=false;const job=readJob(id);if(job.promoteAttempted&&previous){try{const old=JSON.parse(fs.readFileSync(path.join(jobDir(previous.jobId),'manifest.json'),'utf8'));const source=path.join(jobDir(old.id),'edgeone-production');const d=await api.deployments.deploy({projectId:config(true).projectId,artifact:{directory:source},env:'Production',wait:true,timeout:600});if(d.status!=='Success')throw Error('restore');await verifySite(config().origin,old);restored=true;}catch{}}message+=job.promoteAttempted?(restored?'；上一版本已恢复并核验。':'；正式网站状态需核对，不能确认回退。'):'；正式域名未执行切换。';updateJob(id,{state:'failed',message,error:message,reconciled:restored||(!job.promoteAttempted&&(!job.candidateIdAttempted||!!job.candidateId)),restored});console.error(message);
}finally{releaseLock(id);process.exit(readJob(id).state==='succeeded'?0:1);}
