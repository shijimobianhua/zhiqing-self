'use client';
import { useEffect, useState } from 'react';
import type { BodyBlock, SiteData, Work, Note } from '@zhiqing/content';
import { BodyBlocks, Contacts, RequestFailure } from './Content';
import { HomeView } from './Home';
import { NotesPage } from './Notes';
import { WorkArchive, WorkDetailView } from './Work';
const choices = ['empty','long-title','long-read','blocks','image-failure','request-failure','contact'] as const;
type Choice = typeof choices[number];
const names = ['零内容','长标题','长文阅读','正文块','图片失败','请求失败','联系复制'];
export function TestStates({data,works,notes}: {data:SiteData;works:Work[];notes:Note[]}) {
  const [choice,setChoice] = useState<Choice>('empty');
  const [retried,setRetried] = useState(false);
  useEffect(()=>{const value=new URLSearchParams(location.search).get('case');if(choices.includes(value as Choice))setChoice(value as Choice);},[]);
  const blocks: BodyBlock[] = [
    {type:'paragraph',text:'正文块示例：新增中文「龘、麤、邂逅」、标点，以及 English 2026。<script>alert(1)</script> 是普通文本。'},
    {type:'heading',level:2,id:'block-heading',text:'二级标题'}, {type:'heading',level:3,id:'block-subheading',text:'三级标题'},
    {type:'list',ordered:true,items:['先记录想法','再验证最小步骤']}, {type:'list',items:['保留证据','记录限制']},
    {type:'quote',text:'先动手，再继续探索。'},
    {type:'image',src:works[0].image,alt:works[0].imageAlt,caption:'有图注的示例插画'},
    {type:'gallery',images:works.map(work=>({src:work.image,alt:work.imageAlt,caption:work.title}))},
    {type:'link',link:{label:'按稳定 ID 查看作品',target:{kind:'internal',collection:'works',id:works[0].id}}},
    {type:'divider'},{type:'unsupported',originalType:'future-block'},
  ];
  return <div className="wrap page-content"><header className="page-intro"><p className="eyebrow">PRIVATE QA / 仅用于私人试用</p><h1 className="about-page-title">前台状态检查</h1><p>以下是主动选择的测试数据，不代表真实文章、请求、联系方式或后台。仅此页使用。</p></header><nav className="test-controls" aria-label="测试场景">{choices.map((value,i)=><a className="outline-button" href={`?case=${value}`} aria-current={choice===value?'page':undefined} key={value} onClick={event=>{event.preventDefault();setChoice(value);setRetried(false);history.replaceState(null,'',`?case=${value}`);}}>{names[i]}</a>)}</nav>
    <div className="test-panel">
      {choice==='empty' && <><p className="sample-note">零作品、零记录、关闭近况：首页无记录更新；共享导航会依据 hasNotes 隐藏记录入口。</p><HomeView data={{...data,home:{...data.home,featuredWorkIds:[],now:{...data.home.now,enabled:false}}}} works={[]} notes={[]} /><WorkArchive works={[]} emptyText={data.settings.emptyWorks} /><NotesPage notes={[]} emptyText={data.settings.emptyNotes} /></>}
      {choice==='long-title' && <WorkDetailView work={{...works[0],title:'从零散的好奇心出发，给尚未成形的想法搭建一个可以持续探索、记录和分享的长期空间 / A Long Creative Journey 2026',titleStyle:'reading'}} />}
      {choice==='long-read' && <article className="prose" aria-label="长文阅读压力测试"><h2>长文阅读压力测试</h2><p className="sample-note">重复段落仅用于检查滚动、字体、换行与阅读稳定性，不代表真实文章。</p><BodyBlocks works={works} notes={notes} blocks={Array.from({length:60},(_,i)=>i%10===0?{type:'heading' as const,level:2 as const,id:`long-section-${i}`,text:`第 ${i/10+1} 节：记录与探索`}:{type:'paragraph' as const,text:`${i+1} / 先记录想法，再验证最小步骤。保留过程中的选择与证据，让后来的自己能够理解当时的判断。中英混排 Creative Journey 2026；新增中文：龘、麤、邂逅。保持好奇，慢慢生长。`})} /></article>}
      {choice==='blocks' && <article className="prose"><BodyBlocks blocks={blocks} works={works} notes={notes} /></article>}
      {choice==='image-failure' && <article className="prose"><BodyBlocks blocks={[{type:'image',src:'/assets/missing-test-image.png',alt:'测试用缺失图片的文字替代',caption:'故意缺失的测试图，点击重试可再次请求。'}]} /></article>}
      {choice==='request-failure' && (retried?<p role="status">测试重试操作已完成。真实数据请求及后台故障注入在 T3/T4 实测。</p>:<RequestFailure retry={()=>setRetried(true)} />)}
      {choice==='contact' && <><p className="sample-note">以下 example.invalid 为保留测试地址，请勿实际发送；当前关于页没有配置真实联系。</p><Contacts missing="" links={[{label:'测试邮箱',target:{kind:'email',address:'sample@example.invalid'}}]} /></>}
    </div></div>;
}
