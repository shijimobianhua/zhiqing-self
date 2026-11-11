import { AboutView } from '@zhiqing/ui';
import { siteData, works, notes } from '@zhiqing/adapters';
import { metadataFor } from '../metadata';
import {getGraph} from '../../server/public-data';
export async function generateMetadata(){return metadataFor('/about');}
export const dynamic='force-dynamic';
export default async function About() {const g=await getGraph();return <AboutView data={g.data} works={g.works} notes={g.notes} />;}
