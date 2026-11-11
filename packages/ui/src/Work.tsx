'use client';
import { useEffect, useState } from 'react';
import { safeHash, type Work, type Section, type SiteData } from '@zhiqing/content';
import { ImageViewer } from './Pixel';
import { ReturnLink, saveReturnPosition, useReturnPosition } from './Return';
import { BodyBlocks, ContentLink, CopyAddress, EmptyState } from './Content';
import type { Note } from '@zhiqing/content';
import { artSource } from './Art';
import { usePublicPresentation } from './Site';

function Cover({ work }: { work: Work }) {
  const formal=usePublicPresentation();
  const [failed, setFailed] = useState(false);
  return <div className={`cover ${work.art}`} aria-hidden="true">
    <span className="cover-label">{formal ? work.type : work.kind === "fixture" ? "示例作品" : "试用内容"} · {work.number}</span>
    {failed ? <span className="cover-fallback">{work.title}{!formal && <> · {work.kind === "fixture" ? "示例作品" : "试用内容"}</>}</span> : <img className="cover-image" src={artSource(work.image)} alt="" style={{objectPosition:`${work.coverFocalX??50}% ${work.coverFocalY??50}%`}} width={work.imageWidth ?? 1536} height={work.imageHeight ?? 1024} loading="lazy" onError={() => setFailed(true)} />}
  </div>;
}

export function WorkCard({ work }: { work: Work }) {
  const formal=usePublicPresentation();
  return <a data-content-version={`${work.id}:${work.revision}`} className={`work-card pixel-frame ${work.kind === "published" ? "native-media" : ""}`} id={`work-${work.slug}`} href={`/works/${work.slug}`} onClick={() => saveReturnPosition("works",work.slug)}>
    <Cover work={work} />
    <div className="work-copy">
      <div className="card-top"><span className="tag">{work.type}</span><span className="work-stage">{work.stage}</span></div>
      <h3>{work.title}</h3><p>{work.summary}</p>
      <div className="card-foot"><span>{formal ? "作品" : work.kind === "fixture" ? "示例项目" : "测试作品"} / {work.number}</span><span className="work-action">查看作品</span></div>
    </div>
  </a>;
}

export function WorkArchive({ works, emptyText = "作品正在整理中。", settings }: { works: Work[]; emptyText?: string; settings?:SiteData["settings"] }) {
  const formal=usePublicPresentation();
  useReturnPosition("works");
  return <div className="wrap page-content">
    <div className="page-intro">
      <p className="eyebrow">PROJECTS / 持续生长的作品集</p>
      <h1 className="page-title">{settings?.worksHeading||"作品"}</h1>
      <p className="lead">{settings?.worksIntro||"把想法放进现实，留下过程与选择。"}</p>
      {!formal && <p className="sample-note">{works.some(w=>w.kind === "fixture") ? "本页为设计示例，项目与介绍不代表真实发布内容。" : "本页仅展示已发布测试内容。"}</p>}
    </div>
    {!works.length && <EmptyState text={emptyText} />}<div className="work-grid">{works.map(work => <WorkCard key={work.slug} work={work} />)}</div>
    {!formal && <p className="works-end">{works.some(w=>w.kind === "fixture") ? "以上为示例项目。真实作品将在确认内容后补充。" : "以上仅展示当前已发布内容，草稿不会公开。"}</p>}
  </div>;
}

function TableOfContents({ sections, active }: { sections: Section[]; active: string }) {
  return <nav aria-label="本页目录" className="toc-links">
    {sections.map((section, i) => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined}>
      <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span> {section.title}
    </a>)}
  </nav>;
}

export function WorkDetailView({ work, related, notes = [], publicWorks = [work,...(related?[related]:[])], preview=false, relatedWorks=[] }: { work: Work; related?: Work; notes?: Note[]; publicWorks?: Work[]; preview?:boolean;relatedWorks?:Work[] }) {
  const formal=usePublicPresentation();
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!work) return;
    const id = safeHash(window.location.hash);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    const headings = work.sections.flatMap(s=>[{id:s.id},...(s.blocks??[]).filter(b=>b.type==="heading")]).map(section => document.getElementById(section.id)).filter((el): el is HTMLElement => !!el);
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-100px 0px -65% 0px', threshold: 0 });
    headings.forEach(heading => observer.observe(heading));
    return () => observer.disconnect();
  }, [work]);
  const others=relatedWorks.length?relatedWorks:related?[related]:[];
  const sections = work.sections.flatMap(s => [{id:s.id,title:s.title,paragraphs:s.paragraphs}, ...(s.blocks ?? []).filter(b => b.type === "heading").map(b => ({id:b.id,title:b.text,paragraphs:[]}))]);
  return <div data-content-version={`${work.id}:${work.revision}`} className={`wrap page-content ${work.kind === "published" ? "native-media" : ""}`}>
    <ReturnLink kind="works" />
    <div className="detail-heading">
      <p className="eyebrow">{work.type}{!formal && <> / {work.kind === "fixture" ? "示例项目" : "测试作品"}</>}</p>
      <h1 className={`page-title ${work.titleStyle === "reading" || work.title.length > 14 ? "reading-title" : ""}`}>{work.title}</h1>
      <p className="lead">{work.summary}</p>{!preview && <CopyAddress />}{work.links?.map((link,i) => <ContentLink key={i} link={link} works={publicWorks} notes={notes} />)}
      <dl className="detail-meta">
        <div><dt>项目性质</dt><dd>{work.nature ?? "概念练习"}</dd></div>
        <div><dt>当前阶段</dt><dd>{work.stage}</dd></div>
        {(!formal || work.contribution) && <div><dt>个人贡献</dt><dd>{work.contribution ?? "待补充真实内容"}</dd></div>}
      </dl>
      {(preview || !formal) && <p className="sample-note">{preview ? "当前为已保存草稿，公开版本未改变。" : work.kind === "fixture" ? "这是设计示例，不代表真实项目或已验证的成果。" : "已发布测试内容，不代表正式公开上线。"}</p>}{work.tags?.length? <p className="work-tags">{work.tags.map(t=><span className="tag" key={t}>{t}</span>)}</p>:null}{work.businessDate&&<p>业务日期：{work.businessDate}</p>}{work.updatedAt&&<p>实质更新：{work.updatedAt} · {work.updateSummary}</p>}
    </div>
    {work.image ? <figure className="detail-cover pixel-frame"><ImageViewer src={work.image} alt={work.imageAlt} width={work.imageWidth} height={work.imageHeight} caption={`${work.title} · ${work.kind === "fixture" ? "像素场景插画" : "作品封面"}`} /><figcaption>{!formal && work.kind === "fixture" ? "之青的创作场景 · 示例配图，非产品实际截图" : work.coverCaption || work.imageAlt}</figcaption></figure> : !formal ? <p className="sample-note">尚未选择封面，草稿可继续编辑。</p> : null}
    <details className="mobile-contents"><summary>本页内容</summary><TableOfContents sections={sections} active={active} /></details>
    <div className="reading-layout">
      <article className="prose">
        {work.sections.map((section, i) => <section key={section.id} aria-labelledby={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.blocks && <BodyBlocks blocks={section.blocks} works={publicWorks} notes={notes} />}
          {!formal && i === 0 && work.kind === "fixture" && <blockquote>此案例用于验证作品叙事与阅读体验，不包含未经证实的结果。</blockquote>}
        </section>)}
        {notes.filter(note => work.relatedNoteIds?.includes(note.id)).map(note => <p key={note.id}><a className="text-link" href={`/notes/${note.slug}`}>{note.title}</a></p>)}{others.length>0 && <section className="related-work"><h2>继续看看</h2>{others.map(other=><WorkCard key={other.id} work={other} />)}</section>}
      </article>
      <aside className="desktop-contents"><p className="toc-title">本页内容</p><TableOfContents sections={sections} active={active} /></aside>
    </div>
  </div>;
}

