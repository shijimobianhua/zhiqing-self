import {ContextIndex,ContextDetail} from './Context';
import type {SiteData,Work,Note} from '@zhiqing/content';
import {HomeView} from './Home';
import {WorkArchive,WorkDetailView} from './Work';
import {NotesPage,NoteDetailView} from './Notes';
import {AboutView,NotFound} from './Pages';
// Public entry has no import path to the local test-state screen.
export function RouteView({pathname,data,works,notes}:{pathname:string;data:SiteData;works:Work[];notes:Note[]}){
 if(pathname==='/product-in-context')return <ContextIndex data={data}/>;
 const context=(data.contextArticles??[]).find(n=>pathname==='/product-in-context/'+n.slug);if(context)return <ContextDetail article={context} works={works} notes={notes}/>;
 if(pathname==='/')return <HomeView data={data} works={works} notes={notes}/>;
 if(pathname==='/works')return <WorkArchive works={works} emptyText={data.settings.emptyWorks} settings={data.settings}/>;
 if(pathname==='/notes'&&data.settings.notesEnabled!==false)return <NotesPage notes={notes} emptyText={data.settings.emptyNotes} settings={data.settings}/>;
 if(pathname==='/about')return <AboutView data={data} works={works} notes={notes}/>;
 const work=works.find(w=>pathname===`/works/${w.slug}`);if(work)return <WorkDetailView work={work} publicWorks={works} related={works.find(w=>w.id!==work.id)} notes={notes}/>;
 const note=notes.find(n=>pathname===`/notes/${n.slug}`);if(note)return <NoteDetailView note={note} publicWorks={works} publicNotes={notes} relatedWorks={works.filter(w=>note.relatedWorkIds.includes(w.id))}/>;
 return <NotFound settings={data.settings}/>;
}
