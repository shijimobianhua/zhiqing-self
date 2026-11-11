import type { Metadata } from 'next';
import { contentHead } from '@zhiqing/content';
import { siteData, notes } from '@zhiqing/adapters';
import {getGraph} from '../server/public-data';
// Set only to an approved HTTP(S) origin. No future domain is invented.
export async function metadataFor(path: string): Promise<Metadata> {
 const {data,works,notes}=await getGraph();
 const head=contentHead(path,data,works,notes);
 const origin=process.env.SITE_ORIGIN;
 let canonical: string|undefined;
 if(origin) { const url=new URL(origin); if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash) throw new Error('SITE_ORIGIN must be an approved origin'); canonical=new URL(path,url).href; }
 return {title:head.title,description:head.description,alternates:canonical?{canonical}:undefined,openGraph:{title:head.title,description:head.description,type:'website',siteName:data.settings.name,url:canonical,images:canonical?[new URL(head.image,canonical).href]:undefined},twitter:{card:'summary_large_image',title:head.title,description:head.description,images:canonical?[new URL(head.image,canonical).href]:undefined}};
}
