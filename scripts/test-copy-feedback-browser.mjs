import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';

const root=process.cwd(),out=path.join(root,'runtime/site-publisher/copy-feedback-check');fs.mkdirSync(out,{recursive:true});
const tools=createRequire(path.join(root,'runtime/site-publisher/ui-check-tools/package.json'));
const {chromium}=tools('playwright-core');
const current=JSON.parse(fs.readFileSync('runtime/site-publisher/current.json','utf8'));
const snapshot=path.join(root,'runtime/site-publisher/jobs',current.id,'snapshot.json');
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import{Footer}from'./packages/ui/src/Footer';import{CopyAddress,Contacts}from'./packages/ui/src/Content';import snapshot from ${JSON.stringify(snapshot.replaceAll('\\','/'))};
import '@zhiqing/design/fonts.css';import '@zhiqing/design/style.css';import '@zhiqing/design/content.css';import '@zhiqing/design/interactions.css';import '@zhiqing/design/footer.css';
const settings=structuredClone(snapshot.data.settings);if(settings.footerCards.filter(c=>c.action==='copy').length<2){settings.footerCards=[{id:'link',title:'网站',displayText:'继续探索',description:'',icon:'link',enabled:true,action:'link',link:{label:'网站',target:{kind:'path',path:'/about'}}},...['邮箱','微信'].map((title,i)=>({id:'copy-'+i,title,displayText:'copy-check-'+i,description:'点击复制',icon:i?'chat':'mail',enabled:true,action:'copy',copyText:'copy-check-'+i}))];}
const app=createRoot(document.getElementById('root'));app.render(<><main className="wrap" style={{paddingTop:32,minHeight:850}}><h1>复制交互检查</h1><CopyAddress/><Contacts links={[{label:'邮箱',target:{kind:'email',address:'copy-check@example.com'}}]} missing=""/><p id="probe-anchor">其他内容保持原位</p></main><Footer settings={settings}/><div id="probe-bottom" style={{height:20}}/></>);window.unmountCopyProbe=()=>app.unmount();`;
await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},outfile:path.join(out,'fixture.js'),bundle:true,format:'iife',platform:'browser',jsx:'automatic',external:['/fonts/*','/assets/*'],logLevel:'silent'});
const publicRoot=path.join(root,'apps/preview/public');
const server=http.createServer((req,res)=>{
 try{const url=new URL(req.url,'http://localhost');let file;
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>');return;}
  if(['/fixture.js','/fixture.css'].includes(url.pathname))file=path.join(out,url.pathname.slice(1));
  else if(url.pathname.startsWith('/fonts/')){file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(publicRoot+path.sep))throw Error('path');}
  if(!file||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(fs.readFileSync(file));
 }catch{res.writeHead(400);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const report={at:new Date().toISOString(),sourceRelease:current.id,scenarios:[],passed:false};let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});report.browser=browser.version();
 for(const profile of [{name:'desktop',width:1440,height:1000},{name:'phone',width:390,height:844,isMobile:true,hasTouch:true},{name:'small-phone',width:320,height:740,isMobile:true,hasTouch:true},{name:'reduced-motion',width:1440,height:1000,reducedMotion:'reduce'}]){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.isMobile,hasTouch:profile.hasTouch,reducedMotion:profile.reducedMotion??'no-preference'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.copyMode='success';window.pendingCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>window.copyMode==='failure'?Promise.reject(Error('denied')):window.copyMode==='deferred'?new Promise((resolve,reject)=>window.pendingCopies.push({resolve,reject})):Promise.resolve()}});});
  await page.goto(origin);await page.locator('.footer-card-wrap>button').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{
   const rect=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
   window.readGeometry=()=>({boxes:[...document.querySelectorAll('main,.copy-control,.contact-placeholder,.copy-anchor,.site-footer,.footer-card-wrap,.footer-card,.footer-legal,#probe-anchor,#probe-bottom')].map(rect),page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight,window.scrollX,window.scrollY]});
   window.startGeometryProbe=()=>{const before=window.readGeometry();window.geometrySamples=0;window.geometryFailures=[];window.geometryRunning=true;const frame=()=>{if(!window.geometryRunning)return;const after=window.readGeometry();const delta=Math.max(...after.boxes.flatMap((r,i)=>r.map((v,j)=>Math.abs(v-before.boxes[i][j]))),...after.page.map((v,i)=>Math.abs(v-before.page[i])));window.geometrySamples++;if(delta>.05)window.geometryFailures.push(delta);requestAnimationFrame(frame);};requestAnimationFrame(frame);};
  });
  const buttons=page.locator('.footer-card-wrap>button'),first=buttons.nth(0),second=buttons.nth(1);await first.scrollIntoViewIfNeeded();await page.waitForTimeout(250);await page.evaluate(()=>window.startGeometryProbe());await first.click();
  const notice=first.locator('..').locator('.copy-feedback');await notice.filter({hasText:'已复制'}).waitFor({state:'visible'});await page.waitForTimeout(240);
  const typography=await notice.evaluate(el=>({font:getComputedStyle(el).fontSize,position:getComputedStyle(el).position,transition:getComputedStyle(el).transitionDuration,transform:getComputedStyle(el).transform}));assert.equal(typography.font,'12px');assert.equal(typography.position,'absolute');if(profile.reducedMotion)assert.equal(typography.transition,'0s');
  const overlap=await notice.evaluate(el=>{const a=el.getBoundingClientRect(),card=el.parentElement.querySelector('.footer-card'),bounds=card.getBoundingClientRect();const intersects=[...card.querySelectorAll('.footer-card-title,strong,.footer-card-description,.footer-card>.pixel-icon,.footer-card-arrow')].some(n=>{const b=n.getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>0&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0;});return {inside:a.left>=bounds.left&&a.right<=bounds.right&&a.top>=bounds.top&&a.bottom<=bounds.bottom,intersects};});assert(overlap.inside);assert(!overlap.intersects);
  await page.screenshot({path:path.join(out,profile.name+'-visible.png')});await notice.waitFor({state:'hidden',timeout:4000});await page.waitForTimeout(200);
  let geometry=await page.evaluate(()=>{window.geometryRunning=false;return {samples:window.geometrySamples,failures:window.geometryFailures};});assert(geometry.samples>10);assert.deepEqual(geometry.failures,[]);
  await page.evaluate(()=>{window.copyMode='failure';window.startGeometryProbe();});await first.click();await notice.filter({hasText:'复制失败，请重试'}).waitFor({state:'visible'});assert.equal(await page.locator('.footer-copy-fallback,input').count(),0);await notice.waitFor({state:'hidden',timeout:4000});geometry=await page.evaluate(()=>{window.geometryRunning=false;return {samples:window.geometrySamples,failures:window.geometryFailures};});assert.deepEqual(geometry.failures,[]);
  await page.evaluate(()=>window.copyMode='success');await first.click();await page.waitForTimeout(1100);await first.click();await page.waitForTimeout(1100);assert.equal(await notice.getAttribute('data-visible'),'true');await notice.waitFor({state:'hidden',timeout:3000});
  await first.click();await second.click();assert.equal(await page.locator('.footer-card-wrap>.copy-feedback[data-visible="true"]').count(),2);
  await page.evaluate(()=>window.copyMode='deferred');await first.click();await first.click();await page.evaluate(()=>window.pendingCopies[1].resolve());await page.waitForTimeout(50);await page.evaluate(()=>window.pendingCopies[0].reject(Error('stale')));await page.waitForTimeout(50);assert.equal(await notice.textContent(),'已复制');
  for(const [label,message] of [['复制本页地址','地址已复制'],['复制邮箱','邮箱已复制']]){await page.evaluate(()=>window.copyMode='success');const button=page.getByRole('button',{name:label,exact:true});await button.scrollIntoViewIfNeeded();await page.waitForTimeout(200);await page.evaluate(()=>window.startGeometryProbe());await button.click();const feedback=button.locator('..').locator('.copy-feedback');await feedback.filter({hasText:message}).waitFor({state:'visible'});await feedback.waitFor({state:'hidden',timeout:4000});const measured=await page.evaluate(()=>{window.geometryRunning=false;return window.geometryFailures;});assert.deepEqual(measured,[]);}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.equal(await page.locator('input:focus,textarea:focus').count(),0);assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.copyMode='deferred');await first.click();await page.evaluate(()=>window.unmountCopyProbe());await page.evaluate(()=>window.pendingCopies.at(-1).resolve());await page.waitForTimeout(30);assert.deepEqual(errors,[]);
  report.scenarios.push({profile:profile.name,viewport:[profile.width,profile.height],geometryStable:true,successFailureAndAutoDismiss:true,repeatAndIndependentCards:true,staleAsyncIgnored:true,addressAndEmailStable:true,noticeInsideCardWithoutOverlap:true,reducedMotion:!!profile.reducedMotion,unmountSafe:true});await context.close();
 }
 report.passed=true;
}catch(e){report.error=String(e.message);throw e;}finally{fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify(report,null,2));
