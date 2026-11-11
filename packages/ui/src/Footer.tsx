'use client';
import {useEffect,useRef,useState} from 'react';
import {publicFooter,resolveLink,type FooterCard,type SiteData,type Work,type Note} from '@zhiqing/content';
import {PixelIcon} from './Pixel';
import {CopyFeedback,useCopyFeedback} from './CopyFeedback';

function Card({card,works,notes}:{card:FooterCard;works:Work[];notes:Note[]}){
 const feedback=useCopyFeedback();
 const content=<><PixelIcon name={card.icon}/><span className="footer-card-copy"><span className="footer-card-title">{card.title}</span>{card.displayText&&<strong>{card.displayText}</strong>}{card.description&&<span className="footer-card-description">{card.description}</span>}</span><span className="footer-card-arrow" aria-hidden="true">{card.action==='copy'?'⧉':'→'}</span></>;
 const classes='footer-card pixel-frame';
 const link=card.action==='link'?card.link:null;
 const href=link?resolveLink(link.target,works,notes):null;
 const external=link?.target.kind==='external'&&link.target.newTab!==false;
 return <div className="footer-card-wrap" data-reveal-key={'footer-card:'+card.id}>
  {card.action==='copy'?<button className={classes} type="button" aria-label={`${card.title}，点击复制`} onClick={()=>feedback.copy(card.copyText)}>{content}</button>:href&&<a className={classes} href={href} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined} download={link?.target.kind==='attachment'?link.target.filename:undefined}>{content}{external&&<span className="sr-only">（在新标签页打开）</span>}</a>}
  {card.action==='copy'&&<CopyFeedback notice={feedback.notice}/>}
 </div>;
}
export function Footer({settings,works=[],notes=[]}:{settings:SiteData['settings'];works?:Work[];notes?:Note[]}){
 const {footerCards:cards,footerKeywords:keywords}=publicFooter(settings,works,notes);
 const viewport=useRef<HTMLDivElement>(null),group=useRef<HTMLDivElement>(null);
 const [moving,setMoving]=useState(false),[duration,setDuration]=useState(30),[focused,setFocused]=useState(false);
 useEffect(()=>{
  const desktop=matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const measure=()=>{const width=group.current?.scrollWidth??0;setMoving(desktop.matches&&!reduced.matches&&width>(viewport.current?.clientWidth??0)+1);setDuration(Math.max(20,width/28));};
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);if(viewport.current)observer?.observe(viewport.current);if(group.current)observer?.observe(group.current);
  desktop.addEventListener('change',measure);reduced.addEventListener('change',measure);window.addEventListener('resize',measure);measure();
  return()=>{observer?.disconnect();desktop.removeEventListener('change',measure);reduced.removeEventListener('change',measure);window.removeEventListener('resize',measure);};
 },[keywords.map(k=>k.label).join('|')]);
 const marquee=moving&&!focused;
 return <footer className="site-footer"><div className="wrap footer-content">
  {keywords.length>0&&<div className="footer-keywords" data-reveal-key="footer-keywords" ref={viewport} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false);}} aria-label="探索更多">
   <div className={`footer-keyword-track${marquee?' is-moving':''}`} style={{animationDuration:`${duration}s`}}><div className="footer-keyword-group" ref={group}>{keywords.map((link,i)=>{const external=link.target.kind==='external'&&link.target.newTab!==false;return <a key={i} href={resolveLink(link.target,works,notes)!} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined}>{link.label}<span aria-hidden="true">✦</span>{external&&<span className="sr-only">（在新标签页打开）</span>}</a>;})}</div>{marquee&&<div className="footer-keyword-group footer-keyword-duplicate" aria-hidden="true">{keywords.map((k,i)=><span key={i}>{k.label}<span>✦</span></span>)}</div>}</div>
  </div>}
  {cards.length>0&&<nav className="footer-cards" aria-label="页脚入口">{cards.map(card=><Card key={card.id} card={card} works={works} notes={notes}/>)}</nav>}
  <div className="footer-legal" data-reveal-key="footer-legal"><span>{settings.copyright||`© ${settings.name}`}</span><a href="#top" className="text-link">回到顶部 ↑</a></div>
 </div></footer>;
}
