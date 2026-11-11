// Tests the actual serialized production bootstrap, including fail-open paths.
// Browser multi-tab evidence is separate; this is not a browser/device simulator.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {introScene} from '../packages/ui/src/intro-scene.ts';
if (introScene.id === 'zhiqing-handbook-r4') {
  await import('./check-intro-r4.mjs');
  process.exit(0);
}
// CLI compatibility: retain historical R1/R2 checks below and route R3 to its
// own evidence directory before evaluating the old raster-atlas assumptions.
if (introScene.id.startsWith('notes-handbook-r3')) {
  await import('./check-intro-r3.mjs');
  process.exit(0);
}
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const source=html.match(/<script>(;\([\s\S]+?)<\/script>/)?.[1];
assert(source,'Serialized prepaint bootstrap must exist');
assert(introScene.leaveAtMs>0 && introScene.leaveAtMs<introScene.finishAtMs);
assert(introScene.finishAtMs+introScene.assetTimeoutMs<introScene.watchdogMs,'Watchdog must allow the complete configured scene and asset timeout');
assert(/^\/assets\/[a-z0-9-]+\.webp$/.test(introScene.sprite));
new vm.Script(source);
for(const key of ['zhiqing-intro-seen-v1','zhiqing-intro-coordinator-v1','zhiqing-intro-open-page-v1'])assert(source.includes(key),'Visit coordination keys must stay independent of scene revision');
async function execute(options={}) {
  const dataset={},timers=new Map(); let timerId=0;
  const context={document:{documentElement:{dataset},querySelector:()=>null},location:{pathname:options.route??'/'},Event,
    performance:{now:()=>1},clearTimeout:id=>timers.delete(id),
    sessionStorage:{getItem(){if(options.storageBlocked)throw Error('Blocked');return options.seen?'1':null;},setItem(){}},
    matchMedia:query=>({matches:query.includes('reduced-motion')?!!options.reduced:options.desktop!==false,addEventListener(){}}),
    navigator:{locks:options.noLocks?undefined:{query:async()=>{if(options.queryFailed)throw Error('Unavailable');return {held:options.otherPage?[{name:'zhiqing-intro-open-page-v1'}]:[]};},request(name,arg,fn){const callback=typeof arg==='function'?arg:fn;return Promise.resolve().then(()=>callback({name}));}}},
  };
  context.window={setTimeout(fn){timers.set(++timerId,fn);return timerId;},dispatchEvent(){},addEventListener(){}};
  vm.runInNewContext(source,context);
  for(let i=0;i<20;i++)await Promise.resolve();
  return {controller:context.window.__zhiqingIntro,dataset,timers};
}
const checks=[];
for(const [name,options,expected] of [
  ['first eligible visit',{},introScene.enabled?'play':'done'],
  ['other live page suppresses opening',{otherPage:true},'done'],
  ['same tab already viewed',{seen:true},'done'],
  ['narrow or touch-like desktop query does not match',{desktop:false},'done'],
  ['reduce motion',{reduced:true},'done'],
  ['storage denied',{storageBlocked:true},'done'],
  ['Web Locks unavailable',{noLocks:true},'done'],
  ['Web Locks query failure',{queryFailed:true},'done'],
  ['admin excluded',{route:'/admin'},undefined],
  ['preview excluded',{route:'/preview/content/test'},undefined],
]) {
  const result=await execute(options);
  assert.equal(result.controller?.state,expected,name);
  if(expected==='done')assert.equal(result.dataset.zhiqingIntro,undefined,name+' must not cover content');
  checks.push({name,pass:true});
}
if(introScene.enabled){
  const stalled=await execute();
  for(const callback of [...stalled.timers.values()])callback();
  assert.equal(stalled.controller.state,'done');
  assert.equal(stalled.controller.reason,'watchdog');
  assert.equal(stalled.dataset.zhiqingIntro,undefined);
  checks.push({name:'stalled UI watchdog uncovers content',pass:true});
}
const require=createRequire(new URL('../apps/web/package.json',import.meta.url)),sharp=require('sharp');
const original=path.join(root,introScene.sourceFile);
const published=path.join(root,'apps/preview/public',introScene.sprite);
const isR2=introScene.id==='pixel-salute-r2';
let expected;
if(isR2){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/verification-intro-r2/asset-manifest.json'),'utf8'));
  assert.equal(manifest.sourceSha256,createHash('sha256').update(fs.readFileSync(original)).digest('hex'));
  assert.equal(manifest.frames.length,introScene.frames);
  assert.equal(new Set(manifest.frames.map(f=>f.sha256)).size,introScene.frames,'No duplicate poses in the supplied action track');
  const composite=[];
  for(const frame of manifest.frames){
    const {left,top,width,height}=frame.sourceBounds;
    const pixels=await sharp(original).extract({left,top,width,height}).png().toBuffer();
    const registered=await sharp({create:{width:224,height:224,channels:4,background:'#00000000'}}).composite([{input:pixels,left:Math.round((224-width)/2),top:224-12-height}]).png().toBuffer();
    const small=await sharp(registered).resize(160,160,{kernel:'nearest'}).png().toBuffer();
    assert.equal(createHash('sha256').update(small).digest('hex'),frame.sha256,'Deterministic source registration');
    composite.push({input:small,left:frame.index%introScene.columns*160,top:Math.floor(frame.index/introScene.columns)*160});
  }
  expected=await sharp({create:{width:160*introScene.columns,height:160*introScene.rows,channels:4,background:'#00000000'}}).composite(composite).raw().toBuffer();
}else expected=await sharp(original).resize({width:introScene.spriteWidth,kernel:'nearest'}).ensureAlpha().raw().toBuffer();
const actual=await sharp(published).ensureAlpha().raw().toBuffer();
assert.equal(expected.length,actual.length);
let transparentRGBChanges=0;
for(let i=0;i<expected.length;i+=4){
  assert.equal(actual[i+3],expected[i+3],'Alpha must be unchanged');
  if(expected[i+3])assert(expected.subarray(i,i+3).equals(actual.subarray(i,i+3)),'Visible RGB must match exact nearest-neighbor derivative');
  else if(!expected.subarray(i,i+3).equals(actual.subarray(i,i+3)))transparentRGBChanges++;
}
const metadata=await sharp(published).metadata();
assert(metadata.hasAlpha); assert.equal(metadata.width,introScene.spriteWidth*(isR2?introScene.columns:1)); assert.equal(metadata.height,introScene.spriteHeight*(isR2?introScene.rows:1));
const report={date:'2026-10-29',scene:{id:introScene.id,enabled:introScene.enabled,finishAtMs:introScene.finishAtMs},scope:'Serialized-bootstrap unit tests and deterministic asset checks; not actual OS/browser preference tests',checks,asset:{original:introScene.sourceFile,published:path.relative(root,published).replaceAll('\\','/'),bytes:fs.statSync(published).size,width:metadata.width,height:metadata.height,hasAlpha:true,nearestDerivativeVisibleRGBAndAlphaVerified:true,transparentRGBChanges,note:'WebP canonicalizes RGB under alpha=0; visible RGB and every alpha value are unchanged.',sha256:createHash('sha256').update(fs.readFileSync(published)).digest('hex')}};
report.date=isR2?'2026-11-01':'2026-10-29';
report.asset.note=isR2?'32 source-derived raster poses at a 30fps timebase; registration/visible pixels checked. Unique hashes do not prove natural movement. Browser cadence is not tested here.':report.asset.note;
const reportDir=path.join(root,isR2?'docs/verification-intro-r2':'docs/verification-intro');
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'bootstrap-and-asset.json'),JSON.stringify(report,null,2));
console.log(`PASS: ${checks.length} serialized bootstrap cases; alpha and nearest-neighbor asset verified.`);
