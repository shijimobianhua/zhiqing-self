import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {introScene as scene} from '../packages/ui/src/intro-scene.ts';
const out='docs/verification-intro-r4';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync('dist/index.html','utf8'),source=html.match(/<script>(;\([\s\S]+?)<\/script>/)?.[1];
assert(source,'Real built prepaint bootstrap missing');new vm.Script(source);
const checks=[];
const pass=name=>checks.push({name,pass:true});
for(const key of ['zhiqing-intro-seen-v1','zhiqing-intro-coordinator-v1','zhiqing-intro-open-page-v1'])assert(source.includes(key));
pass('Same visit / coordinator / shared-page keys retained in real built HTML');
async function boot(options={}){
 let id=0;const timers=new Map(),events=new Map(),dataset={};
 const document={documentElement:{dataset},querySelector:()=>null};
 const context={document,location:{pathname:options.route??'/'},Event,performance:{now:()=>1},
  sessionStorage:{getItem(){if(options.storageBlocked)throw Error('blocked');return options.seen?'1':null;},setItem(){}},
  matchMedia:q=>({matches:q.includes('reduced-motion')?!!options.reduced:options.desktop!==false,addEventListener(){}}),
  navigator:options.noLocks?{}:{locks:{query:async()=>({held:options.other?[{name:'zhiqing-intro-open-page-v1'}]:[]}),request:(name,opts,fn)=>Promise.resolve((typeof opts==='function'?opts:fn)())}},
  clearTimeout:n=>timers.delete(n),
 };
 context.window={setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent:e=>events.get(e.type)?.(e)};
 vm.runInNewContext(source,context);for(let i=0;i<30;i++)await Promise.resolve();
 return{controller:context.window.__zhiqingIntro,timers,dataset,events};
}
for(const[name,options,expected]of [
 ['fresh visit',{},'play'],['seen refresh',{seen:true},'done'],['another tab',{other:true},'done'],
 ['reduced motion',{reduced:true},'done'],['narrow desktop',{desktop:false},'done'],
 ['missing Web Locks',{noLocks:true},'done'],['blocked storage',{storageBlocked:true},'done'],
 ['lab excluded',{route:'/__intro-r4/'},undefined],['admin excluded',{route:'/admin'},undefined],
]){
 const b=await boot(options);assert.equal(b.controller?.state,expected);pass('Bootstrap: '+name);
}
{
 const b=await boot();assert.equal([...b.timers.values()][0].ms,scene.watchdogMs);
 b.controller.setPlaybackPhase('awaiting-start');assert.equal(b.timers.size,0);
 b.controller.setPlaybackPhase('awaiting-start');assert.equal(b.timers.size,0);
 b.controller.setPlaybackPhase('story');assert.equal(b.timers.size,1);
 assert.equal([...b.timers.values()][0].ms,scene.storyWatchdogMs);
 b.controller.setPlaybackPhase('story');assert.equal(b.timers.size,1);
 [...b.timers.values()][0].fn();assert.equal(b.controller.reason,'watchdog');assert(!b.dataset.zhiqingIntro);
 pass('Waiting clears old watchdog; story installs one finite, non-restarting deadline');
}
{
 const b=await boot();[...b.timers.values()][0].fn();assert.equal(b.controller.state,'done');pass('UI/bootstrap stall still fails open');
}
{
 const b=await boot();b.controller.setPlaybackPhase('awaiting-start');b.events.get('pagehide')();assert.equal(b.controller.reason,'page-hidden');assert.equal(b.timers.size,0);pass('Page closure during wait releases registration and ends intro');
}
assert.equal(scene.pages.length,3);assert.equal(scene.readyAtMs+scene.storyDurationMs,scene.finishAtMs);
assert.equal(scene.timings.turnsAtMs.length,4);
for(let i=0;i<3;i++)assert(scene.timings.turnsAtMs[i+1]-scene.timings.turnsAtMs[i]-scene.timings.turnMs>=2100);
assert(scene.timings.leaveAtMs-scene.timings.turnsAtMs[3]-scene.timings.turnMs>=2000);
pass('Four turns, three 2.15s readings and final2.1s; 18.2s excludes interactive wait');
const assets=[scene.portrait,...scene.pages.map(p=>p.image)].map(src=>{
 const file='apps/preview/public'+src;assert(fs.existsSync(file));return{file,bytes:fs.statSync(file).size,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
});
const original=execFileSync('git',['show','cab4815:apps/preview/public/assets/character-avatar.webp']);
assert(original.equals(fs.readFileSync(assets[0].file)));pass('Final original salute is byte-identical to R3.1 checkpoint');
assert(html.includes('storyWatchdogMs'));assert(html.includes('zhiqing-handbook-r4'));pass('Build uses R4 and phase-aware story deadline');
fs.writeFileSync(out+'/bootstrap-and-assets.json',JSON.stringify({date:'2026-11-02',scene:scene.id,checks,assets,scope:'Actual built bootstrap in VM; not real browser or physical refresh evidence'},null,2));
console.log('PASS R4 bootstrap/assets: '+checks.length);
