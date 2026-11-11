import {ContextIndex,ContextDetail} from './Context';
import type { SiteData, Work, Note } from '@zhiqing/content';
import { HomeView } from './Home';
import { WorkArchive, WorkDetailView } from './Work';
import { NotesPage, NoteDetailView } from './Notes';
import { AboutView, NotFound } from './Pages';
import { TestStates } from './TestStates';
export function RouteView({pathname,data,works,notes}: {pathname:string;data:SiteData;works:Work[];notes:Note[]}) {
  if(pathname==='/product-in-context')return <ContextIndex data={data}/>;
 const context=(data.contextArticles??[]).find(n=>pathname==='/product-in-context/'+n.slug);if(context)return <ContextDetail article={context} works={works} notes={notes}/>;
 if(pathname==='/')return <HomeView data={data} works={works} notes={notes} />;
  if(pathname==='/works')return <WorkArchive works={works} emptyText={data.settings.emptyWorks} />;
  if(pathname==='/notes')return <NotesPage notes={notes} emptyText={data.settings.emptyNotes} />;
  if(pathname==='/about')return <AboutView data={data} works={works} notes={notes} />;
  if(pathname==='/test-states')return <TestStates data={data} works={works} notes={notes} />;
  const work=works.find(item=>pathname===`/works/${item.slug}`);
  if(work)return <WorkDetailView work={work} publicWorks={works} related={works.find(item=>item.id!==work.id)} notes={notes} />;
  const note=notes.find(item=>pathname===`/notes/${item.slug}`);
  if(note)return <NoteDetailView note={note} publicWorks={works} publicNotes={notes} relatedWorks={works.filter(work=>note.relatedWorkIds.includes(work.id))} />;
  return <NotFound settings={data.settings} />;
}
