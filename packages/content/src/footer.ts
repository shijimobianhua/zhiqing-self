import {resolveLink, type ContentLink, type Work, type Note, type SiteData} from './index.ts';

export const footerIcons=['folder','page','spark','mail','link','github','x','chat'] as const;
export type FooterIcon=typeof footerIcons[number];
type CardBase={id:string;title:string;displayText:string;description:string;icon:FooterIcon;enabled:boolean};
export type FooterCard=CardBase & ({action:'link';link:ContentLink}|{action:'copy';copyText:string});

export function footerLinkVisible(link:ContentLink|undefined,settings:Pick<SiteData['settings'],'notesEnabled'>,works:Work[]=[],notes:Note[]=[]){
 if(!link||link.enabled===false||!link.label.trim()||!resolveLink(link.target,works,notes))return false;
 const t=link.target;
 if(t.kind==='path'){
  const base=t.path.split(/[?#]/)[0];
  if(!['/','/works','/notes','/about'].includes(base))return false;
  if(base==='/notes'&&settings.notesEnabled===false)return false;
 }
 return !(t.kind==='internal'&&t.collection==='notes'&&settings.notesEnabled===false);
}
export function publicFooter(settings:SiteData['settings'],works:Work[]=[],notes:Note[]=[]){
 return {
  footerCards:(settings.footerCards??[]).filter(card=>card.enabled!==false&&card.title.trim()&&(card.action==='copy'?!!card.copyText.trim():footerLinkVisible(card.link,settings,works,notes))),
  footerKeywords:(settings.footerKeywords??[]).filter(link=>footerLinkVisible(link,settings,works,notes))
 };
}
