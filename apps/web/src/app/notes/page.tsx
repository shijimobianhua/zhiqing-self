import { NotesPage } from '@zhiqing/ui';
import { siteData, notes } from '@zhiqing/adapters';
import { metadataFor } from '../metadata';
import {getGraph} from '../../server/public-data';
export async function generateMetadata(){return metadataFor('/notes');}
export const dynamic='force-dynamic';
export default async function Notes() {const g=await getGraph();return <NotesPage notes={g.notes} emptyText={g.data.settings.emptyNotes} settings={g.data.settings} />;}
