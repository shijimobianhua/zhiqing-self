import Recover from './Recover';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';export const metadata={title:'本地账号恢复 · 世纪末之青',robots:{index:false,follow:false}};
export default function Page(){if(process.env.T3_ENABLED!=='1')notFound();return <Recover />;}
