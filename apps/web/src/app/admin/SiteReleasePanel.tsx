'use client';
import {useEffect,useRef,useState} from 'react';
type RequestAPI=(route:string,method?:string,body?:unknown)=>Promise<any>;
const stages:Record<string,string>={queued:'排队',exporting:'准备公开内容',building:'生成网页',checking:'检查网页',uploading:'上传候选站',verifying:'核验候选站',promoting:'更新正式网站',succeeded:'上线成功',failed:'发布失败',interrupted:'任务中断'};
export function SiteReleasePanel({request,blocked}:{request:RequestAPI;blocked:boolean}){
 const [status,setStatus]=useState<any>(null),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const key=useRef<string|null>(null),mounted=useRef(true);
 async function refresh(){try{const data=await request('site-release');if(mounted.current){setStatus(data);setError('');}}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'读取发布状态失败');}}
 useEffect(()=>{mounted.current=true;void refresh();const timer=setInterval(()=>void refresh(),4000);return()=>{mounted.current=false;clearInterval(timer);};},[]);
 async function publish(releaseId?:string){if(sending||blocked)return;if(releaseId&&!window.confirm('将网站回退到这次发布的内容和界面。本机草稿与数据库保持当前版本。确认回退？'))return;setSending(true);key.current??=crypto.randomUUID();try{const r=await request(releaseId?'site-release/rollback':'site-release','POST',{idempotencyKey:key.current,...(releaseId?{releaseId}:{})});key.current=null;setError('');await refresh();}catch(e){setError(e instanceof Error?e.message:'发布请求未确认，可用相同请求标识重试');}finally{setSending(false);}}
 const active=status?.active,current=status?.current;
 return <section className="cms-editor" aria-label="网站发布"><h2>网站发布</h2><p><a href={status?.origin||'https://zhiqing-shijimo.site'} target="_blank" rel="noopener noreferrer">zhiqing-shijimo.site ↗</a> · 本机编辑，整站发布</p>
 {current?<p>最近上线：{new Date(current.at).toLocaleString('zh-CN')} · 版本 {current.id?.slice(0,8)}</p>:<p>尚未确认首次上线。</p>}
 {status&&<p>待上线公开内容：{status.counts.works} 个作品、{status.counts.notes} 篇记录。{status.hasChanges?'公开候选有尚未上线的变化。':'与最近成功发布的内容一致。'}</p>}
 <p>保存草稿后，先将该条内容“设为待上线公开版本”，再点击此处更新网站。未设为公开的草稿不会上传。撤回、归档、回收站变化也需要整站发布才会同步线上。</p>
 {!status?.configured&&<p className="cms-warning">首次需双击工程目录“配置网站发布.cmd”，完成本人 腾讯 EdgeOne 登录和项目绑定。</p>}
 {status?.configured&&!status.domainReady&&<p className="cms-warning">账号项目已绑定，独立域名仍待核验；当前任务只会准备并验证候选。</p>}
 <button type="button" className="button" disabled={blocked||sending||!!active||!status?.configured} onClick={()=>void publish()}>{sending?'正在提交…':active?'发布任务进行中…':'发布到网站'}</button>
 <button type="button" className="outline-button" onClick={()=>void refresh()}>刷新发布状态</button>
 {blocked&&<p>请先处理未保存输入、版本冲突或正在编辑的内容。</p>}
 {active&&<p role="status">{stages[active.state]||active.state}：{active.message}。可以关闭浏览器，任务会在本机继续；请保持电脑开机联网。</p>}
 {error&&<p role="alert" className="cms-warning">{error}</p>}
 <details><summary>发布历史与回退</summary><p>保留最近10份成功产物；含已永久删除内容的旧版本不可回退。历史公网副本的删除需要另行处理。</p><ol>{status?.history?.map((j:any)=><li key={j.id}><strong>{stages[j.state]||j.state}</strong> · {new Date(j.createdAt).toLocaleString('zh-CN')} · {j.id.slice(0,8)}<p>{j.message}</p>{j.counts&&<p>作品 {j.counts.works} / 记录 {j.counts.notes} / 媒体 {j.counts.media}</p>}{j.state==='succeeded'&&<button type="button" className="outline-button" disabled={blocked||sending||!!active} onClick={()=>void publish(j.id)}>回退到此版本</button>}</li>)}</ol></details>
 </section>;
}
