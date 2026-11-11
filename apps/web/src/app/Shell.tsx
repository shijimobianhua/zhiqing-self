'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type {SiteData,Work,Note} from '@zhiqing/content';
import { SiteLayout } from '@zhiqing/ui';

export default function Shell({children,backend=false,data,hasNotes,works=[],notes=[],isolated=false}: {children:ReactNode;backend?:boolean;data:SiteData;hasNotes:boolean;works?:Work[];notes?:Note[];isolated?:boolean}) {const pathname=usePathname();if(pathname.startsWith("/preview/"))return <>{children}</>;return <SiteLayout pathname={pathname} data={data} works={works} notes={notes} notice={isolated?'隔离恢复试用 · T5-R1 / 独立数据库、独立媒体、独立站主；主库未覆盖':backend?'本机真实内容测试 · T5-R1 / 保留的介绍文案仍待本人确认':undefined} versionLabel={backend?'T5-R1 本机测试':undefined} dataLabel={backend?'PostgreSQL 已发布快照，非远程生产':undefined} hasNotes={hasNotes} environment="本机 Next">{children}</SiteLayout>;}
