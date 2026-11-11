// Real bundled React effect with mocked hooks, clock and renderer shell.
// Stage classification uses the real renderer helper. This is not FPS evidence.
import {build} from 'esbuild';
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {introScene as scene} from '../packages/ui/src/intro-scene.ts';
const stageBundle=(await build({stdin:{contents:"export {introFrameAt} from './packages/ui/src/intro-renderer-r4.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false})).outputFiles[0].text;
const stageModule={exports:{}};new Function('module','exports',stageBundle)(stageModule,stageModule.exports);
const {introFrameAt}=stageModule.exports;
const compiled=(await build({entryPoints:['packages/ui/src/IntroR4.tsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],write:false,
 plugins:[{name:'renderer-shell',setup(b){b.onResolve({filter:/intro-renderer-r4$/},()=>({path:'mock',namespace:'r4-test'}));b.onLoad({filter:/.*/,namespace:'r4-test'},()=>({loader:'js',contents:'export function createIntroRenderer(...args){return globalThis.__R4Harness.create(...args)}'}));}}]})).outputFiles[0].text;
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
function setup(options={}){
 let clock=0,rafId=0,timerId=0,dialog,canvas,skip,startButton;
 const effects=[],cleanups=[],images=[],renderers=[],rafs=new Map(),timers=new Map(),listeners=new Map(),docListeners=new Map(),phases=[];
 const add=(map,name,fn)=>{const set=map.get(name)||new Set();set.add(fn);map.set(name,set);},remove=(map,name,fn)=>map.get(name)?.delete(fn);
 const emit=(map,e)=>{for(const fn of [...(map.get(e.type)||[])])fn(e);};
 const main={focused:false,focus(){this.focused=true;document.activeElement=this;}};
 let resolveFonts;const fontPromise=new Promise(resolve=>resolveFonts=resolve);
 const document={activeElement:null,documentElement:{dataset:{}},visibilityState:'visible',getElementById:()=>main,
  addEventListener:(name,fn)=>add(docListeners,name,fn),removeEventListener:(name,fn)=>remove(docListeners,name,fn),
  querySelector:()=>dialog,fonts:{load:()=>options.delayFonts?fontPromise:Promise.resolve([])}};
 const window={innerWidth:1440,innerHeight:900,devicePixelRatio:1,screen:{width:1920,height:1080},navigator:{userAgent:'R4 lifecycle mock'},
  setTimeout(fn,ms){timers.set(++timerId,{fn,at:clock+ms});return timerId;},clearTimeout:id=>timers.delete(id),
  addEventListener:(name,fn)=>add(listeners,name,fn),removeEventListener:(name,fn)=>remove(listeners,name,fn),dispatchEvent:e=>emit(listeners,e)};
 const controller=window.__zhiqingIntro={state:'play',reason:'',startedAt:0,
  setPlaybackPhase(phase){phases.push(phase);},finish(reason){this.state='done';this.reason=reason;dialog?.close();window.dispatchEvent(new Event('zhiqing-intro-change'));}};
 const react={useRef:initial=>({current:initial}),useState:initial=>[initial,()=>{}],useEffect:fn=>effects.push(fn)};
 function jsx(type,props){
  const target={type,props,dataset:{},focus(){document.activeElement=this;},contains:e=>e===skip||e===startButton};
  if(type==='canvas'){canvas=target;target.getContext=()=>options.noContext?null:{};}
  if(type==='button'){if(props.children==='start')startButton=target;else skip=target;}
  if(type==='dialog'){dialog=target;target.open=false;target.showModal=()=>{if(options.noDialog)throw Error('unavailable');target.open=true;document.activeElement=skip;};target.close=()=>{target.open=false;document.activeElement=null;};}
  if(props.ref)props.ref.current=target;return target;
 }
 class Image{
  constructor(){this.naturalWidth=options.invalidImage?0:1254;this.naturalHeight=1254;this.pending=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});images.push(this);}
  decode(){return this.pending;}
 }
 const harness={create(element,portrait,illustrations,name){
  if(!element.getContext())throw Error('no context');
  const renderer={draws:[],captures:[],disposed:false,resizes:0,illustrations,
   draw(intro,story){assert(!this.disposed);if(options.renderFail)throw Error('render');this.draws.push({intro,story});return introFrameAt(intro,story);},
   startStory(ms){this.captures.push(ms);},resize(){this.resizes++;},dispose(){this.disposed=true;}};
  renderers.push(renderer);return renderer;
 }};
 const module={exports:{}};
 vm.runInNewContext(compiled,{module,exports:module.exports,require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:null,
  document,window,navigator:window.navigator,Image,Event,location:{pathname:'/__unit-only'},performance:{now:()=>clock},__R4Harness:harness,
  requestAnimationFrame(fn){rafs.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>rafs.delete(id),clearTimeout:id=>timers.delete(id)});
 function mount(){module.exports.Intro({name:'世纪末之青'});for(const fn of effects.splice(0)){const cleanup=fn();if(cleanup)cleanups.push(cleanup);}}
 function cleanup(){for(const fn of cleanups.splice(0))fn();}
 function step(ms){clock=ms;for(const[id,timer]of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}for(const[id,fn]of [...rafs]){rafs.delete(id);fn(clock);}}
 mount();
 return{images,renderers,rafs,phases,controller,main,document,step,cleanup,mount,resolveFonts,
  resolve:async()=>{images.forEach(i=>i.resolve());await flush();},click:()=>startButton.props.onClick(),skip:()=>skip.props.onClick(),
  escape:()=>dialog.props.onCancel({preventDefault(){}}),visibility:()=>emit(docListeners,new Event('visibilitychange')),
  get dialog(){return dialog;}};
}
const checks=[],pass=name=>checks.push({name,pass:true});
const stopped=s=>{assert.equal(s.rafs.size,0);assert(s.renderers.every(r=>r.disposed));assert(!s.dialog.open);};
{
 const s=setup();s.click();assert.equal(s.renderers.length,0);await s.resolve();assert.equal(s.images.length,4);assert.equal(s.renderers[0].illustrations.length,3);
 s.click();assert.equal(s.renderers[0].captures.length,0);
 s.step(scene.readyAtMs);s.step(90000);assert.equal(s.controller.state,'play');assert(s.dialog.open);
 s.click();s.click();assert.deepEqual(s.renderers[0].captures,[90000]);
 s.step(90100);s.step(90000+scene.storyDurationMs);assert.equal(s.controller.reason,'completed');stopped(s);
 const m=JSON.parse(s.dialog.dataset.introMetrics);assert.equal(m.waitMs,90000-scene.readyAtMs);assert.equal(m.storyElapsedMs,scene.storyDurationMs);
 assert.deepEqual(s.phases,['notes','awaiting-start','story']);assert(!m.movement.stages['awaiting-start']);
 pass('Early clicks ignored; waits90s without auto-advance; exactly one start capture; story completes on own clock; wait excluded from movement');
}
for(const action of ['skip','escape'])for(const phase of ['loading','awaiting','story']){
 const s=setup();
 if(phase!=='loading'){await s.resolve();s.step(scene.readyAtMs);if(phase==='story')s.click();}
 s[action]();s.images.forEach(i=>i.resolve());await flush();s.step(200000);assert.equal(s.controller.reason,action==='skip'?'skip':'escape');stopped(s);assert(s.main.focused);
 pass(action+' during '+phase+' exits and restores main focus; no late restart');
}
for(let i=0;i<4;i++){
 const s=setup();s.images.forEach((image,j)=>j===i?image.reject(Error('failed')):image.resolve());await flush();assert.equal(s.controller.reason,'image-failed');stopped(s);
 pass('Asset failure '+i+' fails open; no partial illustration');
}
{
 const s=setup();s.step(scene.assetTimeoutMs+1);await s.resolve();assert.equal(s.controller.reason,'image-timeout');assert.equal(s.renderers.length,0);stopped(s);pass('Late decode after finite asset deadline cannot reopen');
}
{
 const s=setup({delayFonts:true});s.images.forEach(i=>i.resolve());await flush();s.step(scene.assetTimeoutMs+1);s.resolveFonts([]);await flush();assert.equal(s.controller.reason,'image-timeout');stopped(s);pass('Font deadline and late font completion fail open');
}
for(const options of [{invalidImage:true},{noContext:true},{noDialog:true},{renderFail:true}]){
 const s=setup(options);await s.resolve();assert.equal(s.controller.state,'done');assert.notEqual(s.controller.reason,'completed');stopped(s);pass('Setup failure '+Object.keys(options)[0]+' fails open');
}
{
 const s=setup();await s.resolve();s.step(scene.readyAtMs);s.document.visibilityState='hidden';s.visibility();assert.equal(s.controller.reason,'visibility-hidden');stopped(s);pass('Backgrounding during interactive wait ends safely');
}
{
 const s=setup();s.cleanup();s.mount();await s.resolve();assert.equal(s.renderers.length,1);s.step(scene.readyAtMs);s.click();s.step(scene.readyAtMs+scene.storyDurationMs);assert.equal(s.controller.reason,'completed');stopped(s);pass('StrictMode cleanup/replay ignores abandoned load and owns one renderer');
}
fs.mkdirSync('docs/verification-intro-r4',{recursive:true});fs.writeFileSync('docs/verification-intro-r4/component-lifecycle.json',JSON.stringify({date:'2026-11-02',scene:scene.id,checks,scope:'Bundled real effect, mocked React/clock/Canvas shell. Not browser FPS.'},null,2));console.log('PASS R4 lifecycle: '+checks.length);
