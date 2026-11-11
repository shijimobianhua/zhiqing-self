import React, { useEffect } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { contentHead } from '@zhiqing/content';
import { works, notes, siteData, redirects } from '@zhiqing/adapters';
import { SiteLayout, RouteView, FrontendBoundary } from '@zhiqing/ui';
import '@zhiqing/design/fonts.css';
import '@zhiqing/design/style.css';
import '@zhiqing/design/pages.css';
import '@zhiqing/design/interactions.css';
import '@zhiqing/design/notes.css';
import '@zhiqing/design/critical-font.css';
import '@zhiqing/design/content.css';
import '@zhiqing/design/intro.css';
import '@zhiqing/design/footer.css';
import '@zhiqing/design/desktop.css';
const pathname = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
declare const __PUBLIC_RELEASE__: boolean;
const formal=typeof __PUBLIC_RELEASE__!=='undefined'&&__PUBLIC_RELEASE__;
if(redirects[pathname])window.location.replace(redirects[pathname]);
function Page() {
  useEffect(()=>{
    const head=contentHead(pathname,siteData,works,notes,formal);
    document.title=head.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content',head.description);
  },[]);
  return <RouteView pathname={pathname} data={siteData} works={works} notes={notes} />;
}
const root=document.getElementById('root')!;
const app=<React.StrictMode><SiteLayout pathname={pathname} data={siteData} works={works} notes={notes} hasNotes={notes.length > 0} presentation={formal?"public":"preview"}><FrontendBoundary><Page /></FrontendBoundary></SiteLayout></React.StrictMode>;
if(root.dataset.route===pathname) hydrateRoot(root,app);
else createRoot(root).render(app);
