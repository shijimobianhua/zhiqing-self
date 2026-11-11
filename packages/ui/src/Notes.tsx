'use client';
import { useEffect, useState } from 'react';
import type { Note, Work, SiteData } from '@zhiqing/content';
import { safeHash } from '@zhiqing/content';
import { PixelIcon, ImageViewer } from './Pixel';
import { useReturnPosition, saveReturnPosition, ReturnLink } from './Return';
import { EmptyState, CopyAddress, BodyBlocks, ContentLink } from './Content';
import { WorkCard } from './Work';
import { usePublicPresentation } from './Site';
export function NotesPage({ notes, emptyText, settings }: { notes: Note[]; emptyText: string; settings?:SiteData["settings"] }) {
  const formal=usePublicPresentation();
  useReturnPosition("notes");
  return <div className="wrap notes-page">
    <header className="page-intro"><p className="eyebrow">JOURNAL / 沿途的思考</p><h1 className="page-title">{settings?.notesHeading||"记录"}</h1><p className="lead">{settings?.notesIntro||"想法、过程，以及尚未完成的探索。"}</p>{!formal && notes.some(n=>n.kind==="fixture") && <p className="sample-note">以下是设计示例文章，标题与日期不代表真实发布内容。</p>}</header>
    {!notes.length && <EmptyState text={emptyText} />}<div className="notes-list">{notes.map((note, i) => <a className="note-card pixel-frame" href={`/notes/${note.slug}`} id={`note-${note.slug}`} onClick={() => saveReturnPosition("notes", note.slug)} key={note.slug}><div className="note-date"><time>{note.date}</time><span>{note.type}{note.topics.length > 0 && ` · ${note.topics.join(" / ")}`}</span></div><div><h2>{note.title}</h2><p>{note.summary}</p><span className="note-more"><PixelIcon name="page" />{!formal && note.kind==="fixture"?"阅读示例记录":"阅读全文"}</span></div><span className="note-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span></a>)}</div>
  </div>;
}

export function NoteDetailView({ note, relatedWorks = [], publicWorks = relatedWorks, publicNotes = [note], preview=false }: { preview?:boolean; note: Note; relatedWorks?: Work[]; publicWorks?: Work[]; publicNotes?: Note[] }) {
  const formal=usePublicPresentation();
  const slug = note.slug;
  const [active, setActive] = useState('');
  useEffect(() => {
    const id = safeHash(window.location.hash);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [slug]);
  useEffect(() => {
    if (!note) return;
    const update = () => {
      const current = note.sections.filter(section => (document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= 180).at(-1);
      setActive(current?.id ?? note.sections[0]?.id ?? '');
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [note]);
  if (!note) return null;
  const sections = note.sections.flatMap(s => [{id:s.id,title:s.title},...(s.blocks??[]).filter(b=>b.type==="heading").map(b=>({id:b.id,title:b.text}))]);
  return <div data-content-version={`${note.id}:${note.revision}`} className="wrap notes-page">
    <header className="page-intro"><ReturnLink kind="notes" /><p className="eyebrow note-detail-label">{note.type} · {note.date} · {!formal && note.kind==="fixture"?"示例文章":note.maturity}</p><h1 className="note-title">{note.title}</h1><p className="lead">{note.summary}</p>{!preview && <CopyAddress />}{note.links?.map((link,i)=><ContentLink key={i} link={link} works={publicWorks} notes={publicNotes} />)}{!formal && note.kind==="fixture" && <p className="sample-note">本文为阅读体验示例，内容与日期尚未由站主确认。</p>}</header>
    {note.cover && <figure className="detail-cover pixel-frame"><ImageViewer {...note.cover} /><figcaption>{note.cover.caption}</figcaption></figure>}
    <details className="note-mobile-toc"><summary>本页内容</summary>{sections.map(section => <a href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined} key={section.id}>{section.title}</a>)}</details>
    <div className="note-reading"><article className="note-prose">{note.sections.map(section => <section id={section.id} key={section.id}><h2>{section.title}</h2><p>{section.text}</p>{section.blocks && <BodyBlocks blocks={section.blocks} works={publicWorks} notes={publicNotes} />}</section>)}{note.kind==="fixture" && <blockquote>让好奇心有一个起点，也给尚未完成的事留一点空间。</blockquote>}<a className="text-link" href="/works">看看作品</a>{relatedWorks.map(work => <WorkCard key={work.id} work={work} />)}</article><aside className="note-toc" aria-label="本页目录"><strong>本页内容</strong>{sections.map((section, i) => <a href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined} key={section.id}>{String(i + 1).padStart(2, '0')} · {section.title}</a>)}</aside></div>
  </div>;
}
