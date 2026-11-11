import {NextResponse} from 'next/server';
import {checkRequest,owner,login,logout,cms} from '../../../../server/t3/auth';
import {CmsError,cookiePrefix} from '../../../../server/t3/config';
import {listMaintenance,exportContent,backup,importContent,restoreLatest,downloadContent} from '../../../../server/t4/maintenance';
import {listWorks,getWork,createWork,saveWork,publishWork,verifyPublication} from '../../../../server/t3/works';
import {listMedia,uploadMedia,mediaReferences,updateMedia,deleteMedia,cleanupMedia} from '../../../../server/t4/media';
import {listEntries,getEntry,createEntry,saveEntry,publishEntry,verifyOperation,lifecycle,listHistory,restoreHistory,copyEntry,feature,objectReferences,permanentlyDelete} from '../../../../server/t4/content';
import {recover} from '../../../../server/t3/recovery';
import {pool} from '../../../../server/t3/db';
import {siteStatus,getSiteJob,createSiteJob} from '../../../../server/site-release/service';
export const runtime='nodejs';export const dynamic='force-dynamic';
const options={headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}};
async function bytes(request:Request,limit:number){if(Number(request.headers.get('content-length')||0)>limit)throw new CmsError(413,'请求内容过大');const reader=request.body?.getReader();if(!reader)return Buffer.alloc(0);const chunks:Uint8Array[]=[];let size=0;for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>limit){await reader.cancel();throw new CmsError(413,'请求内容过大');}chunks.push(chunk.value);}return Buffer.concat(chunks);}
async function jsonBody(request:Request){try{const value=JSON.parse((await bytes(request,600000)).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid');return value;}catch(e){if(e instanceof CmsError)throw e;throw new CmsError(400,'请求格式不正确');}}
async function handler(request:Request,{params}:{params:Promise<{path:string[]}>}){
 try{checkRequest(request,request.method!=='GET');const parts=(await params).path;const route=parts.join('/');
  if(request.method==='GET'&&route==='health'){await pool().query('SELECT 1 FROM zq_content LIMIT 1');await cms();return NextResponse.json({application:'zhiqing-self-local',stage:'T5-R1',isolatedId:process.env.T4_ISOLATED_ID||null,database:'ready',mode:process.env.NODE_ENV,faultInjection:process.env.T3_TEST_FAULTS==='1'},options);}
  if(request.method==='POST'&&route==='login'){const b=await jsonBody(request);if(typeof b.email!=='string'||typeof b.password!=='string'||b.email.length>320||b.password.length>200)throw new CmsError(400,'请输入邮箱和密码');const token=await login(b.email,b.password);const response=NextResponse.json({ok:true},options);response.cookies.set(cookiePrefix+'-token',token,{httpOnly:true,sameSite:'strict',secure:false,path:'/',maxAge:3600});return response;}
  if(request.method==='POST'&&route==='recover'){const b=await jsonBody(request);return NextResponse.json(await recover(b.token,b.password),options);}
  const user=await owner(request.headers);if(!user)throw new CmsError(401,'请登录');
  if(route==='site-release'&&request.method==='GET')return NextResponse.json(await siteStatus(user),options);
  if(route==='site-release'&&request.method==='POST'){const b=await jsonBody(request);return NextResponse.json(await createSiteJob(b.idempotencyKey,user),options);}
  if(parts[0]==='site-release'&&parts[1]==='jobs'&&parts.length===3&&request.method==='GET')return NextResponse.json(await getSiteJob(parts[2],user),options);
  if(route==='site-release/rollback'&&request.method==='POST'){const b=await jsonBody(request);return NextResponse.json(await createSiteJob(b.idempotencyKey,user,b.releaseId),options);}
  if(route==='maintenance'&&request.method==='GET')return NextResponse.json(await listMaintenance(user),options);
  if(parts[0]==='maintenance'&&parts.length===3&&parts[2]==='download'&&request.method==='GET'){const content=await downloadContent(parts[1],user);return new Response(new Uint8Array(content),{headers:{...options.headers,'Content-Type':'application/gzip','Content-Disposition':'attachment; filename="zhiqing-'+parts[1]+'.zqcontent.gz"'}});}
  if(parts[0]==='maintenance'&&parts.length===2&&request.method==='POST'){let result;switch(parts[1]){case 'export':result=await exportContent(user);break;case 'backup':result=await backup(user);break;case 'restore-latest':result=await restoreLatest(user);break;case 'import':{const form=await new Response(new Uint8Array(await bytes(request,130*1024*1024)),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();const file=form.get('file');if(!(file instanceof File)||file.size>128*1024*1024)throw new CmsError(413,'内容包最大128MB');result=await importContent(Buffer.from(await file.arrayBuffer()),user);break;}default:throw new CmsError(404,'没有找到维护操作');}return NextResponse.json(result,options);}
  if(request.method==='GET'&&route==='session')return NextResponse.json({id:user.id,email:user.email},options);
  if(request.method==='POST'&&route==='logout'){await logout(request.headers);const r=NextResponse.json({ok:true},options);r.cookies.set(cookiePrefix+'-token','',{httpOnly:true,sameSite:'strict',path:'/',maxAge:0});return r;}
  if(parts[0]==='entries'){
   if(parts.length===1&&request.method==='GET')return NextResponse.json(await listEntries(user),options);
   if(parts.length===1&&request.method==='POST'){const b=await jsonBody(request);return NextResponse.json(await createEntry(b.kind,user),options);}
   const id=parts[1];
   if(parts.length===2&&request.method==='GET')return NextResponse.json(await getEntry(id,user),options);
   if(parts.length===2&&request.method==='PUT'){const b=await jsonBody(request);return NextResponse.json(await saveEntry(id,b.baseVersion,b.draft,user),options);}
   if(parts.length===3&&request.method==='GET'&&parts[2]==='history')return NextResponse.json(await listHistory(id,user),options);
   if(parts.length===3&&request.method==='GET'&&parts[2]==='references')return NextResponse.json(await objectReferences(id,user),options);
   if(parts.length===3&&request.method==='POST'){const b=await jsonBody(request);let result;
    switch(parts[2]){case 'publish':result=await publishEntry(id,b.baseVersion,b.idempotencyKey,user,request.headers.get('x-zhiqing-test-fault')==='refresh');break;case 'copy':result=await copyEntry(id,user);break;case 'restore-history':result=await restoreHistory(id,b.revisionId,b.baseVersion,user);break;case 'feature':result=await feature(id,b.homeVersion,b.enabled,user);break;case 'delete':result=await permanentlyDelete(id,b.baseVersion,b.confirmation,user);break;case 'withdraw':case 'archive':case 'trash':case 'restore':result=await lifecycle(id,b.baseVersion,parts[2],b.idempotencyKey,user);break;default:throw new CmsError(404,'没有找到接口');}return NextResponse.json(result,options);
   }
  }
  if(parts[0]==='operations'&&parts.length===3&&parts[2]==='verify'&&request.method==='POST'){await verifyOperation(parts[1],user);return NextResponse.json({ok:true},options);}
  if(parts[0]==='media'&&parts.length===3&&parts[2]==='references'&&request.method==='GET')return NextResponse.json(await mediaReferences(parts[1],user),options);
  if(parts[0]==='media'&&parts.length===2&&request.method==='PUT'){const b=await jsonBody(request);return NextResponse.json(await updateMedia(parts[1],b.baseVersion,b,user),options);}
  if(parts[0]==='media'&&parts.length===3&&parts[2]==='delete'&&request.method==='POST'){const b=await jsonBody(request);return NextResponse.json(await deleteMedia(parts[1],b.confirmation,user),options);}
  if(route==='media/cleanup'&&request.method==='POST')return NextResponse.json(await cleanupMedia(user),options);
  // Old T3 mutation endpoints cannot silently discard new T4 fields or lifecycle state.
  if(parts[0]==='works'&&request.method!=='GET')throw new CmsError(409,'T4 已启用，请使用当前全站编辑器；旧作品写入接口已停用以防字段丢失');
  if(request.method==='GET'&&route==='works')return NextResponse.json(await listWorks(user),options);
  if(request.method==='POST'&&route==='works')return NextResponse.json(await createWork(user),options);
  if(request.method==='GET'&&parts[0]==='works'&&parts.length===2)return NextResponse.json(await getWork(parts[1],user),options);
  if(request.method==='PUT'&&parts[0]==='works'&&parts.length===2){if(Number(request.headers.get('content-length')||0)>600000)throw new CmsError(413,'草稿过大');const b=await jsonBody(request);return NextResponse.json(await saveWork(parts[1],b.baseVersion,b.draft,user),options);}
  if(request.method==='POST'&&parts[0]==='works'&&parts[2]==='publish'&&parts.length===3){const b=await jsonBody(request);return NextResponse.json(await publishWork(parts[1],b.baseVersion,b.idempotencyKey,user,request.headers.get('x-zhiqing-test-fault')==='refresh'),options);}
  if(request.method==='POST'&&parts[0]==='publications'&&parts[2]==='verify'&&parts.length===3){await verifyPublication(parts[1],user);return NextResponse.json({ok:true},options);}
  if(request.method==='GET'&&route==='media')return NextResponse.json(await listMedia(user),options);
  if(request.method==='POST'&&route==='media'){if(Number(request.headers.get('content-length')||0)>21*1024*1024)throw new CmsError(413,'上传不得超过20MB');const form=await new Response(new Uint8Array(await bytes(request,21*1024*1024)),{headers:{"Content-Type":request.headers.get("content-type")||""}}).formData();const file=form.get('file');if(!(file instanceof File))throw new CmsError(400,'请选择图片');return NextResponse.json(await uploadMedia(file,String(form.get('alt')||''),String(form.get('uploadKey')||''),user),options);}
  throw new CmsError(404,'没有找到接口');
 }catch(e){if(e instanceof CmsError)return NextResponse.json({message:e.message,details:e.details},{status:e.status,...options});return NextResponse.json({message:'操作失败，输入仍保留；请重试或检查本机服务'},{status:500,...options});}
}
export {handler as GET,handler as POST,handler as PUT};
