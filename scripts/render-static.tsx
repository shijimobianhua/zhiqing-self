import { renderToString } from 'react-dom/server';
import { SiteLayout, RouteView } from '@zhiqing/ui';
import { siteData, works, notes } from '@zhiqing/adapters';
export function render(pathname:string) {
  return renderToString(<SiteLayout pathname={pathname} data={siteData} hasNotes={notes.length>0}><RouteView pathname={pathname} data={siteData} works={works} notes={notes} /></SiteLayout>);
}
