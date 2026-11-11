'use client';
import { Component, type ReactNode } from 'react';
import { resolveLink, type BodyBlock, type ContentLink as Link, type Work, type Note } from '@zhiqing/content';
import {useSiteSettings} from './Site';
import { ImageViewer, PixelIcon } from './Pixel';
import {CopyFeedback,useCopyFeedback} from './CopyFeedback';
export function EmptyState({text}: {text:string}) {
  return <div className="empty-state pixel-frame"><p>{text}</p><a className="text-link" href="/about#contact">关于与联系</a></div>;
}
export function ContentLink({link,works=[],notes=[],className='text-link'}: {link:Link;works?:Work[];notes?:Note[];className?:string}) {
  const href = resolveLink(link.target,works,notes);
  if (link.enabled===false || !href || !link.label.trim()) return null;
  const newTab = link.target.kind === 'external' && link.target.newTab;
  return <a href={href} className={className} target={newTab?'_blank':undefined} rel={newTab?'noopener noreferrer':undefined} download={link.target.kind === 'attachment'?link.target.filename:undefined}>{link.icon && link.icon!=="none" && <PixelIcon name={link.icon==="mail"?"mail":link.icon==="play"?"play":"download"} />}{link.label}{newTab && <span className="sr-only">（在新标签页打开）</span>}</a>;
}
export function CopyAddress() {
  const feedback=useCopyFeedback();
  return <div className="copy-control"><span className="copy-anchor"><button className="outline-button" type="button" onClick={() => {
    const url = new URL(location.pathname,location.origin); url.hash=location.hash;
    void feedback.copy(url.href,'地址已复制');
  }}>复制本页地址</button><CopyFeedback notice={feedback.notice}/></span></div>;
}
function CopyEmail({address}:{address:string}){
 const feedback=useCopyFeedback();
 return <span className="copy-anchor"><button className="outline-button" type="button" onClick={()=>feedback.copy(address,'邮箱已复制')}>复制邮箱</button><CopyFeedback notice={feedback.notice}/></span>;
}
export function Contacts({links,missing,works=[],notes=[]}: {links:Link[];missing:string;works?:Work[];notes?:Note[]}) {
  const visible=links.filter(link=>link.enabled!==false && link.label.trim() && resolveLink(link.target,works,notes));
  return <div className="contact-placeholder">{!visible.length ? <p>{missing}</p> : visible.map((link,i) => <div key={i}><ContentLink link={link} works={works} notes={notes} />{link.target.kind === 'email' && <><span className="contact-address">{link.target.address}</span><CopyEmail address={link.target.address}/></>}</div>)}</div>;
}
export function BodyBlocks({blocks,works=[],notes=[]}: {blocks:BodyBlock[];works?:Work[];notes?:Note[]}) {
  return <>{blocks.map((block,i) => {
    switch(block.type) {
      case 'paragraph': return <p key={i}>{block.text}</p>;
      case 'heading': return block.level===2?<h2 id={block.id} key={i}>{block.text}</h2>:<h3 id={block.id} key={i}>{block.text}</h3>;
      case 'quote': return <blockquote key={i}>{block.text}</blockquote>;
      case 'list': return block.ordered?<ol key={i}>{block.items.map((text,j)=><li key={j}>{text}</li>)}</ol>:<ul key={i}>{block.items.map((text,j)=><li key={j}>{text}</li>)}</ul>;
      case 'image': return <figure className="body-image pixel-frame" key={i}><ImageViewer src={block.src} alt={block.alt} caption={block.caption} /><figcaption>{block.caption}</figcaption></figure>;
      case 'gallery': return <div className="body-gallery" key={i}>{block.images.map((image,j)=><figure className="body-image pixel-frame" key={j}><ImageViewer {...image} /><figcaption>{image.caption}</figcaption></figure>)}</div>;
      case 'link': return <ContentLink key={i} link={block.link} works={works} notes={notes} className="button" />;
      case 'divider': return <hr key={i} />;
      default: return <p className="sample-note" key={i}>这段内容暂不支持显示。其他正文仍可正常阅读。</p>;
    }
  })}</>;
}
export function RequestFailure({retry}: {retry:()=>void}) {
  const settings=useSiteSettings();
  return <div className="wrap page-content"><div className="empty-state pixel-frame" role="alert"><h1 className="about-page-title">{settings?.errorTitle||"页面暂时没有加载成功"}</h1><p>{settings?.errorText||"请重试，或返回首页继续浏览。"}</p><div className="missing-actions"><button className="button" type="button" onClick={retry}>重试</button><a className="text-link" href="/">返回首页</a></div></div></div>;
}
export class FrontendBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError() {return {failed:true};}
  render() {return this.state.failed?<RequestFailure retry={()=>location.reload()} />:this.props.children;}
}
