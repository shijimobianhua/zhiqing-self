'use client';
import {artSource} from './Art';
import { Fragment } from 'react';
import type { SiteData, Work, Note } from '@zhiqing/content';
import { PixelIcon } from './Pixel';
import { Contacts, BodyBlocks, ContentLink } from './Content';
import { usePublicPresentation } from './Site';
export function AboutView({ data, works = [], notes = [] }: { data: SiteData; works?: Work[]; notes?: Note[] }) {
  const formal=usePublicPresentation();
  return <div className="wrap page-content">
    <div className="page-intro">
      <p className="eyebrow">{data.about.eyebrow}</p>
      <h1 className="about-page-title">{data.about.titleLines.map((line,i)=><Fragment key={i}>{i>0&&<br />}{line}</Fragment>)}<span className="period">.</span></h1>
      <p className="lead">{data.about.description.map((line,i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)}</p>
      {!formal && data.kind!=="published" && <p className="sample-note">以下介绍文案为设计提案，待本人确认。</p>}
    </div>
    <div className="about-layout">
      <article className="prose">{data.about.image && <figure className="body-image pixel-frame"><img src={artSource(data.about.image)} alt={data.about.imageAlt || ""} /></figure>}
        {data.about.sections.map(section => <section key={section.id}><h2>{section.title}</h2>{section.paragraphs.map(p => <p key={p}>{p}</p>)}{section.blocks && <BodyBlocks blocks={section.blocks} works={works} notes={notes} />}</section>)}
        <a href="/works" className="text-link"><PixelIcon name="folder" />从作品认识我</a>{data.about.resume && <ContentLink link={data.about.resume} works={works} notes={notes} />}
      </article>
      <aside className="contact-panel pixel-frame" id="contact">
        <p className="eyebrow">LET'S TALK / 交流与联系</p>
        <h2>{data.settings.contactHeading}<span className="period">.</span></h2>
        <p>{data.settings.contactIntro}</p>
        <Contacts links={data.settings.contacts} missing={data.settings.contactMissing} works={works} notes={notes} />
      </aside>
    </div>
  </div>;
}

export function NotFound({ settings }: { settings: SiteData["settings"] }) {
  return <div className="wrap page-content missing-page">
    <p className="eyebrow">404 / 这里暂时没有内容</p>
    <h1 className="about-page-title">{settings.missingTitle}<span className="period">.</span></h1>
    <p className="lead">{settings.missingText}</p>
    <div className="missing-actions"><a className="button" href="/">返回首页</a><a className="text-link" href="/works">看看作品</a></div>
  </div>;
}
