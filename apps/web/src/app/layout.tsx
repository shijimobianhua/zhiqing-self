import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Shell from './Shell';
import {getGraph} from '../server/public-data';
import {introBootstrap,introPrepaintCSS} from '@zhiqing/ui/intro-session';
export const dynamic='force-dynamic';
import './admin.css';
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
export const metadata: Metadata = { title: process.env.T3_ENABLED === '1' ? '世纪末之青 · T5-R1 本机测试' : '世纪末之青 · T2-R1 私人测试', robots: { index: false, follow: false }, icons: {icon:'/assets/role-202611/avatar-96.webp'} };
export default async function RootLayout({children}: {children:ReactNode}) {const g=await getGraph();return <html lang="zh-CN" suppressHydrationWarning><head><style dangerouslySetInnerHTML={{__html:introPrepaintCSS}} /><script id="zhiqing-intro-session" dangerouslySetInnerHTML={{__html:introBootstrap}} /></head><body><Shell isolated={!!process.env.T4_ISOLATED_ID} data={g.data} works={g.works} notes={g.notes} hasNotes={g.notes.length>0} backend={process.env.T3_ENABLED === '1'}>{children}</Shell></body></html>; }
