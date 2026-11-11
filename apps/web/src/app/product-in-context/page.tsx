import {ContextIndex} from '@zhiqing/ui';
import {getGraph} from '../../server/public-data';
import {metadataFor} from '../metadata';
export const dynamic='force-dynamic';
export async function generateMetadata(){return metadataFor('/product-in-context');}
export default async function Page(){const g=await getGraph();return <ContextIndex data={g.data}/>;}
