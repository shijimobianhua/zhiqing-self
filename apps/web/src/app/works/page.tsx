import {WorkArchive} from '@zhiqing/ui';import {siteData} from '@zhiqing/adapters';import {getGraph} from '../../server/public-data';import {metadataFor} from '../metadata';
export const dynamic='force-dynamic';export async function generateMetadata(){return metadataFor('/works');}
export default async function Works(){const g=await getGraph();return <WorkArchive works={g.works} emptyText={g.data.settings.emptyWorks} settings={g.data.settings} />;}
