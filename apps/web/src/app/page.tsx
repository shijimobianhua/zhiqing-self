import { HomeView } from '@zhiqing/ui';
import { notes } from '@zhiqing/adapters';
import {getGraph} from '../server/public-data';
import {metadataFor} from './metadata';
export const dynamic='force-dynamic';
export async function generateMetadata(){return metadataFor('/');}
export default async function Home(){const g=await getGraph();return <HomeView data={g.data} works={g.works} notes={g.notes} />;}
