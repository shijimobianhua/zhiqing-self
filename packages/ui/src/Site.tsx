'use client';
import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from 'react';
import { resolveLink, type SiteData, type Work, type Note } from '@zhiqing/content';
import { PixelIcon, trapDialogFocus } from './Pixel';
import { useReturnPosition } from './Return';
import { artThumbnail } from './Art';
import { Intro } from './Intro';
import {Footer} from './Footer';
import {setupScrollReveal} from './scroll-reveal';
import {lockMenuScroll} from './mobile-menu';
export const SiteSettingsContext=createContext<SiteData['settings']|null>(null);
export const useSiteSettings=()=>useContext(SiteSettingsContext);
const SitePresentationContext=createContext<'preview'|'public'>('preview');
export const usePublicPresentation=()=>useContext(SitePresentationContext)==='public';
function Navigation({ pathname, settings, hasNotes, notice }: { pathname: string; settings: SiteData["settings"]; hasNotes: boolean; notice?: string }) {
  const navigation = [...settings.navigation.filter(n=>n.href!=="/product-in-context"),{label:"Product In Context",href:"/product-in-context",enabled:true}].filter(item => item.enabled!==false && !!resolveLink({kind:"path",path:item.href}) && (hasNotes || item.href !== "/notes"));
  const isCurrent = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const formal=usePublicPresentation();
  const unlock=useRef<null|(()=>void)>(null);
  const openMenu=()=>{if(dialog.current?.open)return;unlock.current=lockMenuScroll();try{dialog.current?.showModal();setMenuOpen(true);}catch{unlock.current?.();unlock.current=null;}};
  useEffect(()=>{const desktop=matchMedia("(min-width:768px)");const changed=()=>{if(desktop.matches)dialog.current?.close();};desktop.addEventListener("change",changed);return()=>{desktop.removeEventListener("change",changed);unlock.current?.();};},[]);
  return <>
    <Intro name={settings.name} />
    <a className="skip" href="#main">跳到主要内容</a>
    {!formal && <div className="preview-notice">{notice ?? <>私人测试候选 · T2-R1 <span aria-hidden="true">/</span> 页面内容为示例，待补充真实资料</>}</div>}
    <header className="site-header"><div className="wrap nav">
      <a className="brand" href="/" aria-label={`${settings.name}，回到首页`}><img src={artThumbnail(settings.avatar)} width="36" height="36" alt="" />{settings.name}</a>
      <nav className="desktop-nav" aria-label="主导航">{navigation.map(item => <a key={item.href} href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}>{item.label}</a>)}{settings.contactNavEnabled!==false&&<a href="/about#contact">{settings.contactNavLabel||"联系"}</a>}</nav>
      <button ref={menuButton} className="menu-button" type="button" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={openMenu}><PixelIcon name="menu" />菜单</button>
    </div></header>
    <dialog ref={dialog} id="mobile-menu" className="mobile-menu-dialog" aria-labelledby="menu-title" onKeyDown={trapDialogFocus} onClick={event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}} onClose={() => { unlock.current?.();unlock.current=null;setMenuOpen(false); menuButton.current?.focus({ preventScroll: true }); }}>
      <div className="mobile-menu-panel pixel-frame">
      <div className="dialog-top"><h2 id="menu-title">去哪里看看？</h2><button className="outline-button" type="button" autoFocus onClick={() => dialog.current?.close()}><PixelIcon name="close" />关闭</button></div>
      <nav aria-label="手机导航">{navigation.map(item => <a key={item.href} href={item.href} className={isCurrent(item.href) ? 'mobile-current' : undefined} aria-current={isCurrent(item.href) ? 'page' : undefined} onClick={() => dialog.current?.close()}>{item.label}</a>)}{settings.contactNavEnabled!==false&&<a href="/about#contact" onClick={() => dialog.current?.close()}>{settings.contactNavLabel||"联系"}</a>}</nav>
      <p>{settings.menuNotice||"保持好奇，慢慢生长。"}</p></div>
    </dialog>
  </>;
}
export function SiteLayout({ pathname, data, hasNotes, children, works = [], notes = [], presentation = "preview", environment = "私人 Sites", notice, dataLabel = data.kind==="published"?"审核后的公开测试快照":"允许的示例快照", versionLabel = data.candidate??"T2-R1 私人测试" }: { pathname: string; data: SiteData; hasNotes: boolean; children: ReactNode; works?: Work[]; notes?: Note[]; presentation?: "preview"|"public"; environment?: string; notice?: string; dataLabel?: string; versionLabel?: string }) {
  const formal=presentation==="public";
  useReturnPosition("home");
  const root=useRef<HTMLDivElement>(null);
  // Stock scroll reveals removed: desktop and reading content remain visible at rest.
  return <SitePresentationContext.Provider value={presentation}><SiteSettingsContext.Provider value={data.settings}><div ref={root} id="top" data-site-version={data.revision}><Navigation pathname={pathname} settings={data.settings} hasNotes={hasNotes} notice={notice??(data.kind==="published"?"私人 Sites 快照 · T5-R1 / 仅含审核后的公开试用内容；与本机后台独立更新":undefined)} />{!formal && <span className="environment-label">{environment} · {dataLabel}</span>}<main id="main" tabIndex={-1}>{children}</main><Footer settings={data.settings} works={works} notes={notes}/></div></SiteSettingsContext.Provider></SitePresentationContext.Provider>;
}

