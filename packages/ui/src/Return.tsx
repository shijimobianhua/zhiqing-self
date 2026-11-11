'use client';
import { useEffect, useState } from 'react';
type Kind = 'works' | 'notes' | 'home';
const key = (kind: Kind) => `zhiqing-return:${kind}`;
export function saveReturnPosition(kind: 'works' | 'notes', slug: string) {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const source = path === '/' ? 'home' : path === `/${kind}` ? kind : null;
  if (!source) return;
  try {
    // Invalidate stale context from another detail visit. Never accept an external URL.
    sessionStorage.setItem(key(kind),JSON.stringify({source,y:window.scrollY,slug,at:Date.now()}));
  } catch { /* Ordinary archive navigation remains available. */ }
}
function readContext(kind: 'works'|'notes') {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(kind)) || 'null');
    const referPath = document.referrer ? new URL(document.referrer).pathname.replace(/\/$/,'') || '/' : '';
    const sourcePath = saved?.source === 'home' ? '/' : `/${kind}`;
    if (!saved || !['home',kind].includes(saved.source) || typeof saved.y !== 'number' || !Number.isFinite(saved.y) || saved.y < 0 || !/^[a-z0-9-]+$/.test(saved.slug) || Date.now()-saved.at > 30*60*1000) return null;
    if (!document.referrer && (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type !== 'reload') return null;
    if (document.referrer && (new URL(document.referrer).origin !== location.origin || (referPath !== sourcePath && referPath !== `/${kind}/${saved.slug}`))) return null;
    if (location.pathname.replace(/\/$/,'') !== `/${kind}/${saved.slug}` && !new URLSearchParams(location.search).has('return')) return null;
    return saved as {source: Kind; y: number; slug: string; at:number};
  } catch { return null; }
}
export function ReturnLink({kind}: {kind:'works'|'notes'}) {
  const [source,setSource] = useState<Kind>(kind);
  useEffect(() => { setSource(readContext(kind)?.source ?? kind); },[kind]);
  return <a className="text-link back-link" href={source === 'home' ? `/?return=${kind}` : `/${kind}?return=1`}>← 返回{source === 'home' ? '首页' : kind === 'works' ? '作品' : '记录'}</a>;
}
export function useReturnPosition(kind: Kind) {
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const from = kind === 'home' ? query.get('return') : query.has('return') ? kind : null;
    if (from !== 'works' && from !== 'notes') return;
    const saved = readContext(from);
    if (saved?.source === kind) requestAnimationFrame(() => {
      window.scrollTo({top:saved.y,behavior:'instant'});
      document.getElementById(`${from === 'works' ? 'work' : 'note'}-${saved.slug}`)?.focus({preventScroll:true});
    });
    try { sessionStorage.removeItem(key(from)); } catch { /* No stored state. */ }
    query.delete('return');
    history.replaceState(history.state,'',location.pathname+(query.size?'?'+query.toString():'')+location.hash);
  },[kind]);
}
