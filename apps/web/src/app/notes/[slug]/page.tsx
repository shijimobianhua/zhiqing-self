import {notFound,permanentRedirect} from 'next/navigation';
import {NoteDetailView} from '@zhiqing/ui';import {lookupPath} from '../../../server/t4/content';import {getGraph} from '../../../server/public-data';import {isEnabled} from '../../../server/t3/config';import {metadataFor} from '../../metadata';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){return metadataFor('/notes/'+(await params).slug);}
export default async function NotePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const g=await getGraph();const result=isEnabled()?await lookupPath('notes',slug):null;if(result?.redirect)permanentRedirect(result.redirect);const note=g.notes.find(n=>n.slug===slug);if(!note)notFound();return <NoteDetailView note={note} publicWorks={g.works} publicNotes={g.notes} relatedWorks={g.works.filter(w=>note.relatedWorkIds.includes(w.id))} />;}
