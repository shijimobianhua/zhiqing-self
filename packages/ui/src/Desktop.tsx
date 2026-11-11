'use client';
import {useEffect,useRef,useState,type ReactNode,type PointerEvent,type KeyboardEvent} from 'react';
import type {SiteData,Work,Note} from '@zhiqing/content';
import {ContentLink} from './Content';
import {PixelIcon} from './Pixel';
import {artDisplay} from './Art';

type WindowID='desk'|'works'|'context'|'now';
const initial:Record<WindowID,{x:number;y:number;z:number;open:boolean}>={desk:{x:28,y:25,z:1,open:true},works:{x:680,y:190,z:2,open:false},context:{x:815,y:30,z:3,open:true},now:{x:815,y:435,z:4,open:true}};
export function Desktop({data,works,notes}:{data:SiteData;works:Work[];notes:Note[]}){
 const area=useRef<HTMLDivElement>(null),sequence=useRef(5),drag=useRef<{id:WindowID;px:number;py:number;x:number;y:number}|null>(null);
 const [windows,setWindows]=useState(initial),[selected,setSelected]=useState<WindowID>('desk');
 const [message,setMessage]=useState('');
 const [entering,setEntering]=useState(false);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined;const enter=()=>{if(window.__zhiqingIntro&&window.__zhiqingIntro.state!=='done')return;if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;try{if(sessionStorage.getItem('zhiqing-desktop-enter-v1'))return;sessionStorage.setItem('zhiqing-desktop-enter-v1','1');}catch{}setEntering(true);timer=setTimeout(()=>setEntering(false),700);};enter();window.addEventListener('zhiqing-intro-change',enter);return()=>{clearTimeout(timer);window.removeEventListener('zhiqing-intro-change',enter);};},[]);
 const fit=(id:WindowID,x:number,y:number)=>{const a=area.current,el=a?.querySelector<HTMLElement>('[data-desktop-window="'+id+'"]');return {x:Math.round(Math.max(0,Math.min(x,(a?.clientWidth??1200)-(el?.offsetWidth??400)))),y:Math.round(Math.max(0,Math.min(y,(a?.clientHeight??760)-(el?.offsetHeight??350))))};};
 const bring=(id:WindowID)=>{setSelected(id);const z=++sequence.current;setWindows(old=>({...old,[id]:{...old[id],z,open:true}}));requestAnimationFrame(()=>setWindows(old=>({...old,[id]:{...old[id],...fit(id,old[id].x,old[id].y)}})));};
 const close=(id:WindowID)=>{setWindows(old=>({...old,[id]:{...old[id],open:false}}));requestAnimationFrame(()=>area.current?.parentElement?.querySelector<HTMLButtonElement>('[data-open-window="'+id+'"]')?.focus());};
 useEffect(()=>{const measure=()=>setWindows(old=>Object.fromEntries(Object.entries(old).map(([id,w])=>[id,{...w,...fit(id as WindowID,w.x,w.y)}])) as typeof old);const observer=new ResizeObserver(measure);if(area.current)observer.observe(area.current);measure();return()=>observer.disconnect();},[]);
 const down=(id:WindowID,event:PointerEvent<HTMLButtonElement>)=>{if(!matchMedia('(min-width:1100px) and (pointer:fine)').matches||event.button!==0)return;bring(id);drag.current={id,px:event.clientX,py:event.clientY,x:windows[id].x,y:windows[id].y};event.currentTarget.setPointerCapture(event.pointerId);};
 const move=(event:PointerEvent<HTMLButtonElement>)=>{const d=drag.current;if(!d)return;const p=fit(d.id,d.x+event.clientX-d.px,d.y+event.clientY-d.py);setWindows(old=>({...old,[d.id]:{...old[d.id],...p}}));};
 const keyboard=(id:WindowID,e:KeyboardEvent<HTMLButtonElement>)=>{if(e.key==='Escape'){close(id);return;}if(!e.key.startsWith('Arrow')||!matchMedia('(min-width:1100px)').matches)return;e.preventDefault();const step=e.shiftKey?24:8;const p=fit(id,windows[id].x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),windows[id].y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));bring(id);setWindows(old=>({...old,[id]:{...old[id],...p}}));};
 const renderWindow=(id:WindowID,title:string,children:ReactNode)=>windows[id].open?<section key={id} data-desktop-window={id} className={'desk-window desk-window--'+id+(selected===id?' is-front':'')} style={{'--window-x':windows[id].x+'px','--window-y':windows[id].y+'px',zIndex:windows[id].z} as React.CSSProperties} aria-label={title} onPointerDown={()=>bring(id)}>
  <div className="desk-titlebar"><button className="desk-handle" type="button" aria-label={title+'，拖动或用方向键移动窗口'} aria-describedby="desktop-help" onPointerDown={e=>down(id,e)} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={e=>keyboard(id,e)}><span className="desk-status" aria-hidden="true"/>{title}</button><button type="button" className="desk-close" aria-label={'关闭'+title} onClick={()=>close(id)}><PixelIcon name="close"/></button></div>{children}</section>:null;
 const entries:[WindowID,string,'folder'|'page'|'spark'][]=[['desk','之青的工作台','spark'],['works','作品文件夹','folder'],['context','Product In Context','page'],['now','近况便笺','page']];
 return <section className="desktop-surface wrap" aria-label="之青的像素桌面" data-enter>
  <div className="desktop-topline"><span>世纪末之青的创作桌面</span><button className="desk-reset" type="button" onClick={()=>{setWindows({...initial});sequence.current=5;setMessage('已恢复桌面布局');}}>恢复桌面布局</button></div>
  <div ref={area} className={"desktop-area"+(entering?" desktop-entering":"")}>
   <div className="desktop-shortcuts" aria-label="桌面文件">{entries.map(([id,label,icon])=><button type="button" className={'desktop-file desktop-file--'+id} data-open-window={id} key={id} aria-expanded={windows[id].open} onClick={()=>bring(id)}><span className="desktop-file-icon"><PixelIcon name={icon}/></span><span>{label}</span></button>)}</div>
   {renderWindow('desk','之青的工作台',<div className="desk-main"><div className="desk-intro"><h1>{data.home.titleLines.map((line,i)=><span key={i} className={i===0?"desk-heading-first":undefined}>{line}{i<data.home.titleLines.length-1&&<br/>}</span>)}</h1><p>{data.home.description.map((line,i)=><span key={i}>{line}{i<data.home.description.length-1&&<br/>}</span>)}</p><div className="hero-actions"><a className="button" href="/works">查看作品</a><a className="text-link" href="/about">认识之青</a></div></div><img className="desk-character" src={artDisplay(data.home.image)} alt="之青在工作台亲手整理灵感便笺" width="768" height="512" fetchPriority="high"/></div>)}
   {renderWindow('context','Product In Context',<a className="desktop-context" href="/product-in-context"><span className="desktop-book" aria-hidden="true"><i/><i/><i/></span><h2>好用的 AI 产品，<br/>放进真实情境里看。</h2><p>从使用过程出发，逐期拆解产品的设计与选择。</p><span className="text-link">打开产品手账</span></a>)}
   {renderWindow('works','作品文件夹',<div className="desktop-work-list"><h2>作品</h2>{works.length?works.slice(0,3).map(w=><a href={'/works/'+w.slug} key={w.id}><PixelIcon name="folder"/>{w.title}</a>):<p>{data.settings.emptyWorks}</p>}<a className="text-link" href="/works">打开作品目录</a></div>)}
   {renderWindow('now','近况便笺',<div className="desktop-now"><h2>{data.home.now.enabled?data.home.now.title:'随手记'}</h2><p>{data.home.now.enabled?data.home.now.text:'作品、观察和日常记录，都从这里出发。'}</p>{data.home.now.dateLabel&&<time>{data.home.now.dateLabel}</time>}{notes.length>0&&<a className="text-link" href="/notes">阅读记录</a>}</div>)}
  </div><p className="desktop-help" id="desktop-help">点开文件夹或手账开始浏览。窗口标题栏可拖动，也可聚焦后用方向键移动。</p><span className="sr-only" role="status">{message}</span>
 </section>;
}
