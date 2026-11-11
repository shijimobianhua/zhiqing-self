export {roleAsset,roleAssetMap,mapPublicRoleAssets} from './role-assets.ts';
import {roleAsset} from './role-assets.ts';
import type {FooterCard} from './footer.ts';
export {footerIcons,footerLinkVisible,publicFooter} from './footer.ts';
export type {FooterCard,FooterIcon} from './footer.ts';
export type LinkTarget =
  | { kind: 'path'; path: string }
  | { kind: 'internal'; collection: 'works' | 'notes'; id: string; section?: string }
  | { kind: 'external'; url: string; newTab?: boolean }
  | { kind: 'email'; address: string }
  | { kind: 'attachment'; url: string; filename: string };
export type ContentLink = { label: string; target: LinkTarget; required?: boolean; enabled?: boolean; icon?: 'none'|'play'|'download'|'mail'; sort?: number };
export type BodyBlock =
  | { type: 'paragraph' | 'quote'; text: string }
  | { type: 'heading'; level: 2 | 3; id: string; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'image'; src: string; alt: string; caption: string }
  | { type: 'gallery'; images: { src: string; alt: string; caption: string }[] }
  | { type: 'link'; link: ContentLink }
  | { type: 'divider' }
  | { type: 'unsupported'; originalType: string };
export type Section = { id: string; title: string; paragraphs: string[]; blocks?: BodyBlock[] };
export type Work = {
  id: string;
  schemaVersion: 1;
  revision: string;
  kind: 'fixture' | 'published';
  slug: string;
  number: string;
  title: string;
  summary: string;
  type: string;
  stage: string;
  art: 'ideas' | 'steps';
  image: string;
  imageAlt: string;
  imageWidth?: number; imageHeight?: number;
  sections: Section[];
  titleStyle?: 'pixel' | 'reading';
  nature?: string;
  contribution?: string;
  tags?: string[];
  links?: ContentLink[];
  relatedNoteIds?: string[];
  publishedAt?: string;
  updatedAt?: string;
  updateSummary?: string;
  share?: { title?: string; description?: string; image?: string };
  relatedWorkIds?: string[]; businessDate?: string; sort?: number;
  coverCaption?: string; coverFocalX?: number; coverFocalY?: number;
};

export type Note = {
  productName?: string; productURL?: string;
  id: string; schemaVersion: 1; revision: string; kind: 'fixture'|'published'; slug: string;
  title: string; summary: string; type: string; maturity: string; topics: string[];
  date: string; update: string; relatedWorkIds: string[];
  cover?: {src: string; alt: string; caption: string};
  links?: ContentLink[]; publishedAt?: string; updatedAt?: string;
  sections: {id: string; title: string; text: string; blocks?: BodyBlock[]}[];
  share?: Work['share'];
  sort?: number;
};
export type SiteData = {
  contextArticles?: Note[];
  schemaVersion: 1; revision: string;
  settings: {
    name: string; avatar: string; description: string; shareImage: string;
    navigation: {label: string; href: string; enabled?:boolean}[]; contacts: ContentLink[];
    contactHeading: string; contactIntro: string; contactMissing: string;
    footerTitle: string; footerTagline: string; backendNotice: string;
    footerCards?: FooterCard[]; footerKeywords?: ContentLink[];
    missingTitle: string; missingText: string; emptyWorks: string; emptyNotes: string;
    notesEnabled?:boolean; copyright?:string; footerEyebrow?:string; contactNavEnabled?:boolean; contactNavLabel?:string; menuNotice?:string; errorTitle?:string; errorText?:string;
    worksHeading?:string; worksIntro?:string; notesHeading?:string; notesIntro?:string;
    pageShares?:Record<string,{title?:string;description?:string;image?:string}>;
  };
  home: {
    greeting: string; titleLines: string[]; description: string[];
    image: string; imageAlt: string; imageCaption: string; actions: ContentLink[];
    featuredWorkIds: string[]; sections: ('works'|'updates'|'about')[];
    worksTitle: string; updatesTitle: string;
    now: {enabled: boolean; title: string; text: string; dateLabel: string};
    aboutTitle: string[]; aboutParagraphs: string[];
    updatesEnabled?:boolean;
  };
  about: {eyebrow: string; titleLines: string[]; description: string[]; sections: Section[];image?:string;imageAlt?:string;resume?:ContentLink};
  kind?:'fixture'|'published'; candidate?:string;
};

// Public DTOs only. Publishing, revisions and private media authorization stay server-side in T3/T4.
export function resolveLink(target: LinkTarget, works: Work[] = [], notes: Note[] = []): string | null {
  if (!target || typeof target !== 'object') return null;
  switch (target.kind) {
    case 'path': {
      try { const decoded=decodeURIComponent(target.path); return /^\/(?!\/)[a-z0-9/#?=&%-]*$/i.test(target.path) && !/\/(admin|api|preview)(\/|$|[?#])/i.test(decoded) && !/\\|\/\/|\.\./.test(decoded) ? target.path : null; } catch {return null;}
    }
    case 'internal': {
      if (!['works','notes'].includes(target.collection)) return null;
      const record = (target.collection === 'works' ? works : notes).find(item => item.id === target.id);
      if (!record) return null;
      const section = target.section && record.sections.some(s => s.id === target.section) ? `#${encodeURIComponent(target.section)}` : '';
      return `/${target.collection}/${record.slug}${section}`;
    }
    case 'external': {
      try { const url = new URL(target.url); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
    }
    case 'email': return !/[%:\\]/.test(target.address) && /^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(target.address) ? `mailto:${target.address}` : null;
    case 'attachment': return (/^\/assets\/[a-z0-9-]+\.pdf$/.test(target.url)||/^\/assets\/(media|files)\/[a-f0-9]{64}\.pdf$/.test(target.url)||/^\/media\/[a-f0-9-]{36}\/original$/.test(target.url)) && !!target.filename.trim() ? target.url : null;
    default: return null;
  }
}

export function validateNote(note: Note): void {
  if ((note.kind==='fixture'?!/^fixture-note-[0-9]{3}$/.test(note.id):note.kind!=='published'||!/^[a-f0-9-]{36}$/.test(note.id)) || note.schemaVersion !== 1) throw new Error('Invalid note identity');
  validateSlug(note.slug);
  if (!note.title.trim() || !note.summary.trim() || !note.revision) throw new Error('Missing note field');
  validateSections(note.sections,note.kind==='published');
}
export function validateSlug(slug: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) || ['admin','api','new','preview','test-states'].includes(slug)) throw new Error('Invalid slug');
}
function validateSections(sections: {id: string; title: string; blocks?: BodyBlock[]}[],publishedMedia=false) {
  const ids = new Set<string>();
  const addId = (id: string) => { if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) throw new Error('Invalid or duplicate section'); ids.add(id); };
  for (const section of sections) {
    addId(section.id);
    if (!section.title.trim()) throw new Error('Missing heading');
    for (const block of section.blocks ?? []) {
      if (block.type === 'heading') addId(block.id);
      const media=(src:string)=>/^\/assets\/role-202611\/[a-z0-9-]+\.webp$/.test(src)||/^\/assets\/[a-z0-9-]+\.(png|webp)$/.test(src)||/^\/assets\/(media|files)\/[a-f0-9]{64}\.(png|webp)$/.test(src)||(publishedMedia&&/^\/media\/[a-f0-9-]{36}\/display$/.test(src));
      if (block.type === 'image' && (!media(block.src) || !block.alt.trim())) throw new Error('Invalid image block');
      if (block.type === 'gallery' && block.images.some(image => !media(image.src) || !image.alt.trim())) throw new Error('Invalid gallery');
      if (block.type === 'link' && block.link.required && !resolveLink(block.link.target)) {
        // Internal targets require the whole public graph; validatePublicGraph resolves them below.
        if (block.link.target.kind !== 'internal') throw new Error('Invalid required block link');
      }
    }
  }
}
export function validatePublicGraph(data: SiteData, works: Work[], notes: Note[]) {
  works.forEach(validateWork); notes.forEach(validateNote); (data.contextArticles??[]).forEach(validateNote);
  if (!data.settings.name.trim() || !data.home.greeting.trim() || !data.home.titleLines.some(line=>line.trim()) || !data.home.actions.some(link=>!!resolveLink(link.target,works,notes))) throw new Error('Missing home identity or action');
  if(new Set(data.home.sections).size!==data.home.sections.length || data.home.sections.some(key=>!['works','updates','about'].includes(key))) throw new Error('Invalid home sections');
  for (const records of [works, notes]) {
    if (new Set(records.map(r => r.id)).size !== records.length || new Set(records.map(r => r.slug)).size !== records.length) throw new Error('Duplicate content identity');
  }
  if (new Set(data.home.featuredWorkIds).size !== data.home.featuredWorkIds.length || data.home.featuredWorkIds.some(id => !works.some(w => w.id === id))) throw new Error('Invalid featured relationship');
  const links = [...data.home.actions, ...data.settings.contacts, ...works.flatMap(w => w.links ?? []), ...notes.flatMap(n => n.links ?? [])];
  for (const record of [...works, ...notes, ...(data.contextArticles??[]), {sections: data.about.sections}]) for (const section of record.sections) for (const block of section.blocks ?? []) if (block.type === 'link') links.push(block.link);
  if (links.some(link => link.required && (!link.label.trim() || !resolveLink(link.target,works,notes)))) throw new Error('Unresolvable required link');
}

export function contentHead(pathname: string, data: SiteData, works: Work[], notes: Note[], formal=false) {
  const record = works.find(r => pathname === `/works/${r.slug}`) ?? notes.find(r => pathname === `/notes/${r.slug}`) ?? (data.contextArticles??[]).find(r=>pathname===`/product-in-context/${r.slug}`);
  const pageTitle = ({'/':'首页','/works':'作品','/notes':'记录','/product-in-context':'Product In Context','/about':'关于','/test-states':'前台状态试验'} as Record<string,string>)[pathname];
  const override=data.settings.pageShares?.[pathname];
  return { title: `${record?.share?.title || override?.title || record?.title || pageTitle || data.settings.missingTitle} · ${data.settings.name}${formal?'':` · ${data.candidate??'T2-R1 私人测试'}`}`, description: record?.share?.description || override?.description || record?.summary || data.settings.description, image: roleAsset(record?.share?.image || override?.image || ('image' in (record ?? {}) ? (record as Work).image : record&&'cover' in record&&record.cover?record.cover.src:data.settings.shareImage)) };
}

export function recentUpdates(works: Work[],notes: Note[]) {
  const items=[...notes.filter(n=>n.update.trim()).map(n=>({id:n.id,slug:n.slug,collection:'notes' as const,title:n.title,type:n.type,date:n.updatedAt??n.publishedAt??n.date,summary:n.update})),...works.filter(w=>w.updatedAt && w.updateSummary?.trim()).map(w=>({id:w.id,slug:w.slug,collection:'works' as const,title:w.title,type:w.type,date:w.updatedAt!,summary:w.updateSummary!}))];
  return items.filter(item=>Number.isFinite(Date.parse(item.date.replaceAll('.','-')))).sort((a,b)=>Date.parse(b.date.replaceAll('.','-'))-Date.parse(a.date.replaceAll('.','-')));
}


export function safeHash(hash: string): string {
  try { return decodeURIComponent(hash.replace(/^#/, '')); } catch { return ''; }
}

// T1 contract: a public fixture view, not the future complete CMS schema.
export function validateWork(work: Work): void {
  if (work.schemaVersion !== 1 || (work.kind==='fixture' ? !/^fixture-work-[0-9]{3}$/.test(work.id) : work.kind!=='published' || !/^[a-f0-9-]{36}$/.test(work.id))) throw new Error('Invalid public identity');
  validateSlug(work.slug);
  if (!work.title.trim() || !work.summary.trim() || !work.revision) throw new Error('Missing required public field');
  if (!(work.kind==='fixture' ? /^\/assets\/[a-z0-9-]+\.png$/.test(work.image) : (/^\/media\/[a-f0-9-]{36}\/display$/.test(work.image) || /^\/assets\/cms-[a-f0-9-]{36}-display\.webp$/.test(work.image)||/^\/assets\/(media|files)\/[a-f0-9]{64}\.webp$/.test(work.image)))) throw new Error('Invalid public media route');
  const ids = new Set<string>();
  for (const section of work.sections) {
    if (!/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id)) throw new Error('Invalid or duplicate section');
    if (!section.title || !section.paragraphs.every(p => typeof p === 'string')) throw new Error('Invalid section');
    ids.add(section.id);
  }
  validateSections(work.sections,work.kind==='published');
}
export {entryFields,entryLabels,type EntryKind,type Field} from './editor.ts';
