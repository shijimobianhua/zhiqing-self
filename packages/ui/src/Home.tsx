'use client';
import type {SiteData,Work,Note} from '@zhiqing/content';
import {Desktop} from './Desktop';
import {WorkCard} from './Work';
export function HomeView({data,works,notes}:{data:SiteData;works:Work[];notes:Note[]}){
 const featured=data.home.featuredWorkIds.map(id=>works.find(w=>w.id===id)).filter((w):w is Work=>!!w);
 return <><Desktop data={data} works={works} notes={notes}/>{featured.length>0&&data.home.sections.includes('works')&&<section className="studio-work wrap" id="works"><div className="section-heading"><h2>作品</h2><a className="text-link" href="/works">查看全部作品</a></div><div className="work-grid">{featured.map(w=><WorkCard work={w} key={w.id}/>)}</div></section>}{data.home.sections.includes('about')&&<section className="home-profile wrap" id="about"><h2>关于之青</h2><div>{data.home.aboutParagraphs.map(p=><p key={p}>{p}</p>)}<a className="text-link" href="/about">阅读我的介绍</a></div></section>}</>;
}
