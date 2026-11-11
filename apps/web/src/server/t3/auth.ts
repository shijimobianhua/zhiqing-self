import {getPayload,createLocalReq,logoutOperation,type Payload} from 'payload';
import {secrets,CmsError,isEnabled} from './config.ts';
import {audit,pool} from './db.ts';
const state=globalThis as typeof globalThis & {zqPayload?:Promise<Payload>};
export async function cms(){if(!isEnabled())throw new CmsError(503,'本机后台尚未启用');return state.zqPayload??=import('../../../payload.config.ts').then(m=>getPayload({config:m.default})).catch(error=>{delete state.zqPayload;throw error;});}
export function checkRequest(request:Request,write=false){
  if(!isEnabled())throw new CmsError(404,'没有找到页面');
  const cfg=secrets();const origin=new URL(cfg.origin);
  // The App Router may normalize Request.url to its internal server hostname.
  // Validate the actual HTTP Host and, independently, every write's Origin.
  if(request.headers.get('host')!==origin.host)throw new CmsError(403,'请求来源不受支持');
  if(write&&(request.headers.get('origin')!==origin.origin||request.headers.get('x-zhiqing-csrf')!=='1'))throw new CmsError(403,'请求来源验证失败，请从本机后台操作');
}
export async function owner(headers:Headers,optional=false){const payload=await cms();const {user}=await payload.auth({headers});if(!user){if(optional)return null;throw new CmsError(401,'会话已过期，请重新登录；输入仍保留');}if(String(user.id)!==String(secrets().ownerId)){if(optional)return null;throw new CmsError(403,'仅站主可操作');}const sid=user._sid;if(typeof sid!=='string'||!(await pool().query('SELECT 1 FROM auth.users_sessions WHERE id=$1 AND _parent_id=$2 AND expires_at>now()',[sid,user.id])).rowCount){if(optional)return null;throw new CmsError(401,'会话已过期，请重新登录；输入仍保留');}return user;}
export async function login(email:string,password:string){
  const payload=await cms();
  try{const result=await payload.login({collection:'users',data:{email,password},overrideAccess:false});if(!result.user||String(result.user.id)!==String(secrets().ownerId))throw new CmsError(403,'仅站主可操作');if(!result.token)throw Error('Missing token');await audit('login',null,'success',result.user.id);return result.token;}
  catch(e){if(e instanceof CmsError)throw e;throw new CmsError(401,'邮箱或密码不正确，或尝试次数过多；请稍后重试');}
}
export async function logout(headers:Headers){const user=await owner(headers);if(!user)throw new CmsError(401,"请登录");const payload=await cms();const req=await createLocalReq({user,req:{headers}},payload);await logoutOperation({collection:payload.collections.users,req});await audit('logout',null,'success',user!.id);}
