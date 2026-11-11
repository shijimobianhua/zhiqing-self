// Exercises the real bundled component's async lifecycle with mocked hooks,
// canvas and clock. This is NOT browser rendering or real FPS evidence.
import {build} from 'esbuild';
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {introScene} from '../packages/ui/src/intro-scene.ts';
if (introScene.id === 'zhiqing-handbook-r4') {
  await import('./check-intro-r4-component.mjs');
  process.exit(0);
}
// CLI compatibility: the archived R1/R2 lifecycle check remains below.
if (introScene.id.startsWith('notes-handbook-r3')) {
  await import('./check-intro-r3-component.mjs');
  process.exit(0);
}
const compiled=(await build({entryPoints:['packages/ui/src/Intro.tsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],write:false})).outputFiles[0].text;
function setup(){
 let clock=0,rafId=0,timerId=0,dialog,button,canvas,cleanup;
 const listeners=new Map(),rafs=new Map(),timers=new Map(),images=[],states=[],draws=[];
 const main={focused:false,focus(){this.focused=true;}};
 const document={activeElement:null,documentElement:{dataset:{}},getElementById:()=>main,querySelector:()=>dialog};
 const window={setTimeout(fn,ms){timers.set(++timerId,{fn,at:clock+ms});return timerId;},
 addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);},
 dispatchEvent(e){listeners.get(e.type)?.();}};
 window.__zhiqingIntro={state:'play',reason:'',finish(reason){this.state='done';this.reason=reason;dialog?.close();window.dispatchEvent(new Event('zhiqing-intro-change'));}};
 const react={useRef:()=>({current:null}),useState:initial=>[initial,value=>states.push(value)],useEffect(fn){cleanup=fn;}};
 function jsx(type,props){
  let target={type,props,dataset:{},contains:e=>e===button};
  if(type==='canvas'){canvas=target;target.getContext=()=>({clearRect(){},drawImage(...args){draws.push(args.slice(1,3));},imageSmoothingEnabled:true});}
  if(type==='button')button=target;
  if(type==='dialog'){dialog=target;target.open=false;target.showModal=()=>{target.open=true;document.activeElement=button;};target.close=()=>{target.open=false;document.activeElement=null;};}
  if(props.ref)props.ref.current=target;
  return target;
 }
 class Image {constructor(){this.naturalWidth=introScene.spriteWidth*introScene.columns;this.naturalHeight=introScene.spriteHeight*introScene.rows;this.pending=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});images.push(this);}decode(){return this.pending;}}
 const module={exports:{}};
 vm.runInNewContext(compiled,{module,exports:module.exports,require:id=>{if(id==='react')return react;if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};throw Error(id);},window,document,Image,Event,location:{pathname:'/__unit-only'},performance:{now:()=>clock},requestAnimationFrame(fn){rafs.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>rafs.delete(id),clearTimeout:id=>timers.delete(id)});
 function mount(){module.exports.Intro({name:'世纪末之青'});const callback=cleanup;cleanup=callback();}
 function step(ms){clock=ms;for(const [id,t]of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}for(const [id,fn]of [...rafs]){rafs.delete(id);fn(clock);}}
 mount();
 return {window,images,states,draws,main,step,get dialog(){return dialog;},get button(){return button;},cleanup(){cleanup?.();},mount,rafs};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const checks=[];
{
 const s=setup();s.images[0].resolve();await flush();
 for(let ms=1000/60;ms<5650;ms+=1000/60)s.step(ms);
 assert.equal(s.window.__zhiqingIntro.reason,'completed');
 assert.equal(s.dialog.open,false);assert(s.main.focused);
 const metrics=JSON.parse(s.dialog.dataset.introMetrics);
 assert.equal(metrics.displayedActionFrames,introScene.frames);
 assert.equal(s.draws.length,introScene.frames);assert.equal(s.rafs.size,0);
 assert(s.states.includes('leaving'));
 checks.push('Simulated 60Hz clock: all32 action frames, finite5.6s completion, modal closes, main focus');
}
{
 const s=setup();s.button.props.onClick();s.images[0].reject(Error('late asset'));await flush();s.step(2000);
 assert.equal(s.window.__zhiqingIntro.reason,'skip');assert.equal(s.draws.length,0);assert(s.main.focused);
 checks.push('Skip before decode: late rejection and timeout cannot override skip or start animation');
}
{
 const s=setup();let prevented=false;s.dialog.props.onCancel({preventDefault(){prevented=true;}});s.images[0].resolve();await flush();s.step(2000);
 assert(prevented);assert.equal(s.window.__zhiqingIntro.reason,'escape');assert.equal(s.draws.length,0);
 checks.push('Escape before decode: no late playback');
}
{
 const s=setup();s.images[0].reject(Error('failed'));await flush();s.step(2000);
 assert.equal(s.window.__zhiqingIntro.reason,'image-failed');assert.equal(s.draws.length,0);
 checks.push('Failed decode remains image-failed after loading deadline');
}
{
 const s=setup();s.step(introScene.assetTimeoutMs+1);s.images[0].resolve();await flush();s.step(4000);
 assert.equal(s.window.__zhiqingIntro.reason,'image-timeout');assert.equal(s.draws.length,0);
 checks.push('Loading timeout: late decode never restarts scene');
}
{
 const s=setup();s.cleanup();assert.equal(s.window.__zhiqingIntro.state,'play');s.mount();s.images[0].reject(Error('old effect'));s.images[1].resolve();await flush();
 for(let ms=1000/60;ms<5650;ms+=1000/60)s.step(ms);
 assert.equal(s.window.__zhiqingIntro.reason,'completed');
 checks.push('Effect cleanup/replay: cancelled load ignored, shared visit not consumed, next effect completes');
}
fs.writeFileSync('docs/verification-intro-r2/component-lifecycle.json',JSON.stringify({date:'2026-11-01',scene:introScene.id,scope:'Real bundled component with mocked hooks/canvas/clock. Not browser, GPU, real FPS or visual evidence.',checks:checks.map(name=>({name,pass:true}))},null,2));
console.log('PASS: '+checks.length+' real-component async lifecycle cases (simulated clock, not actual FPS).');
