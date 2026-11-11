// Enhance visible HTML only. No element is hidden while waiting for JS or the observer.
export function setupScrollReveal(root:HTMLElement,pathname:string){
 const desktop=matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const selectors=['.hero-copy','.hero-window','.page-intro','.detail-heading','.section-heading','.work-card','.note-card','.update-title>h2','.update-item','.now-card','.about>div','.about-layout>.prose>section','.contact-panel','[data-reveal-key]'];
 const key='zhiqing-reveal-v1:'+pathname;let seen=new Set<string>();try{seen=new Set(JSON.parse(sessionStorage.getItem(key)||'[]'));}catch{}
 let observer:IntersectionObserver|undefined,started=false;const animated=new Set<HTMLElement>();
 const clear=()=>{observer?.disconnect();observer=undefined;for(const el of animated){el.classList.remove('reveal-enter');el.style.removeProperty('--reveal-delay');}animated.clear();};
 const start=()=>{
  if(started||!desktop.matches||reduced.matches||!('IntersectionObserver'in window))return;
  if(window.__zhiqingIntro&&window.__zhiqingIntro.state!=='done')return;
  started=true;const identities=new Map<Element,string>();
  observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target as HTMLElement,id=identities.get(el)!;observer?.unobserve(el);if(seen.has(id))continue;seen.add(id);try{sessionStorage.setItem(key,JSON.stringify([...seen]));}catch{}el.classList.add('reveal-enter');animated.add(el);}},{threshold:0.06});
  const unique=new Set<HTMLElement>();selectors.forEach((selector,group)=>root.querySelectorAll<HTMLElement>(selector).forEach((el,index)=>{if(unique.has(el))return;unique.add(el);const identity=el.dataset.revealKey||el.id||el.dataset.contentVersion?.split(':')[0]||`${group}:${el.closest('section[id]')?.id||''}:${index}`;identities.set(el,identity);if(seen.has(identity))return;
   const siblings=el.parentElement?Array.from(el.parentElement.children).filter(child=>child.matches('.work-card,.note-card,.update-item,.footer-card-wrap')):[];el.style.setProperty('--reveal-delay',`${Math.max(0,Math.min(siblings.indexOf(el),5))*70}ms`);observer!.observe(el);
  }));
 };
 const preference=()=>{if(!desktop.matches||reduced.matches){clear();started=false;}else start();};
 const restore=(event:PageTransitionEvent)=>{if(event.persisted){clear();started=false;start();}};
 window.addEventListener('zhiqing-intro-change',start);window.addEventListener('pageshow',restore);desktop.addEventListener('change',preference);reduced.addEventListener('change',preference);start();
 return()=>{clear();window.removeEventListener('zhiqing-intro-change',start);window.removeEventListener('pageshow',restore);desktop.removeEventListener('change',preference);reduced.removeEventListener('change',preference);};
}
