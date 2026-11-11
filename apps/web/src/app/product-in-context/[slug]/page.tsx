import {notFound,permanentRedirect} from 'next/navigation';
import {ContextDetail} from '@zhiqing/ui';
import {getGraph} from '../../../server/public-data';
import {lookupPath} from '../../../server/t4/content';
import {isEnabled} from '../../../server/t3/config';
import {metadataFor} from '../../metadata';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){return metadataFor('/product-in-context/'+(await params).slug);}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const g=await getGraph();const found=isEnabled()?await lookupPath('product-in-context',slug):null;if(found?.redirect)permanentRedirect(found.redirect);const article=g.data.contextArticles?.find(n=>n.slug===slug);if(!article)notFound();return <ContextDetail article={article} works={g.works} notes={g.notes}/>;}
