// Local lab entry only. Never included by Vite/Next or Sites staging.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SiteLayout, RouteView} from '@zhiqing/ui';
import {siteData, works, notes} from '@zhiqing/adapters';
import '@zhiqing/design/fonts.css';
import '@zhiqing/design/style.css';
import '@zhiqing/design/pages.css';
import '@zhiqing/design/interactions.css';
import '@zhiqing/design/notes.css';
import '@zhiqing/design/critical-font.css';
import '@zhiqing/design/content.css';
import '@zhiqing/design/intro.css';

// Dedicated lab path is excluded by the real visit bootstrap. These controls
// own this lab's controller only; there is no production replay query/shortcut.
function Lab() {
 const [run,setRun]=useState(0),[playing,setPlaying]=useState(false),[result,setResult]=useState('点击播放，可重复检查完整动作');
 const play=()=>{
  window.__zhiqingIntro={state:'play',reason:'',startedAt:performance.now(),finish(reason:string){
   this.state='done';this.reason=reason;
   document.querySelector<HTMLDialogElement>('dialog[data-intro-dialog]')?.close();
   window.dispatchEvent(new Event('zhiqing-intro-change'));
   setPlaying(false);
   const metrics=document.querySelector<HTMLElement>('dialog[data-intro-dialog]')?.dataset.introMetrics;
   setResult(reason==='completed'?'本次已播完。'+(metrics?' rAF采样：'+metrics:''):('结束原因：'+reason));
  }};
  const owned=window.__zhiqingIntro;
  window.setTimeout(()=>{if(window.__zhiqingIntro===owned&&owned.state==='play')owned.finish('watchdog');},9000);
  setPlaying(true);setRun(n=>n+1);
 };
 return <>
  <SiteLayout key={run} pathname="/" data={siteData} hasNotes={notes.length>0}><RouteView pathname="/" data={siteData} works={works} notes={notes}/></SiteLayout>
  {!playing&&<aside style={{position:'fixed',bottom:16,right:16,zIndex:100,padding:16,maxWidth:520,background:'#fffdf9',border:'2px solid #998773',fontSize:14}}>
   <strong>R2 本机审片台 · 未发布</strong><p>完整 5.6 秒；只留站名。此审片台允许重复播放，正常页面仍按同一次访问规则处理。</p>
   <button type="button" className="outline-button" onClick={play}>播放完整开场 R2</button>
   <details><summary>本次播放记录</summary><p style={{overflowWrap:'anywhere'}}>{result}</p></details>
  </aside>}
 </>;
}
window.__zhiqingIntro={state:'done',reason:'lab-idle',startedAt:0,finish(){}};
createRoot(document.getElementById('root')!).render(<React.StrictMode><Lab/></React.StrictMode>);
