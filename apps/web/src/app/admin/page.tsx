import Admin from './AdminT4';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';export const metadata={title:'本机私人后台 · T5 · 世纪末之青',robots:{index:false,follow:false}};
export default function Page(){if(process.env.T3_ENABLED!=='1')notFound();return <Admin />;}
