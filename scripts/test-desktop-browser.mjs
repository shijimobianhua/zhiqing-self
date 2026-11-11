// Focused application behavior regression; visual audits use the unmodified skill scripts.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(path.join(process.cwd(),'runtime/site-publisher/ui-check-tools/package.json'));
const {chromium}=require('playwright-core'),out='docs/verification-desktop-20261110';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const report={browser:browser.version(),headless:true,checks:[],profiles:[],errors:[],intro:null,passed:false};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:3000/');await page.locator('.desktop-area').waitFor();await page.evaluate(()=>document.fonts.ready);
 const desktop=page.locator('.desktop-area'),desk=page.locator('[data-desktop-window="desk"]'),handle=desk.locator('.desk-handle');
 const before=await desk.boundingBox(),b=await handle.boundingBox();await page.mouse.move(b.x+90,b.y+20);await page.mouse.down();await page.mouse.move(b.x+160,b.y+75,{steps:10});await page.mouse.up();const after=await desk.boundingBox();assert(after.x>before.x+30&&after.y>before.y+20);report.checks.push('pointer drag moves real window');
 await page.mouse.move(after.x+50,after.y+20);await page.mouse.down();await page.mouse.move(1435,895,{steps:10});await page.mouse.up();const ar=await desktop.boundingBox(),dr=await desk.boundingBox();assert(dr.x>=ar.x&&dr.y>=ar.y&&dr.x+dr.width<=ar.x+ar.width+1&&dr.y+dr.height<=ar.y+ar.height+1);report.checks.push('drag constrained to desktop');
 await page.getByRole('button',{name:'恢复桌面布局'}).click();await handle.focus();const keyBefore=await desk.boundingBox();await handle.press('ArrowRight');const keyAfter=await desk.boundingBox();assert(keyAfter.x>keyBefore.x);report.checks.push('keyboard movement');
 await handle.press('Escape');await desk.waitFor({state:'detached'});assert.equal(await page.locator('[data-open-window="desk"]').evaluate(e=>document.activeElement===e),true);await page.locator('[data-open-window="desk"]').click();await desk.waitFor();report.checks.push('close focus recovery and reopen');
 await page.locator('[data-open-window="works"]').click();await page.locator('[data-desktop-window="works"]').waitFor();await page.getByRole('button',{name:'恢复桌面布局'}).click();await page.locator('[data-desktop-window="works"]').waitFor({state:'detached'});report.checks.push('folder opens and layout reset restores defaults');
 for(const width of [1440,1024,820,768,390,320]){
  await page.setViewportSize({width,height:width<600?844:900});await page.waitForTimeout(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.locator('.desk-character').evaluate(e=>e.complete&&e.naturalWidth>0));report.profiles.push({width,overflow:false,characterLoaded:true});
 }
 await page.getByRole('button',{name:'菜单',exact:true}).click();await page.locator('#mobile-menu').getByRole('link',{name:'Product In Context',exact:true}).click();await page.waitForURL('**/product-in-context');await page.getByRole('heading',{name:/Product.*In Context/}).waitFor();assert(await page.locator('.context-ledger img').evaluate(e=>e.complete&&e.naturalWidth>0));report.checks.push('mobile menu route and column art');
 await context.close();
 const animation=await browser.newContext({viewport:{width:1440,height:900}}),p=await animation.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto('http://127.0.0.1:3000/about#contact');await p.locator('.intro-start').waitFor({state:'visible',timeout:12000});await p.locator('.intro-start').click();
 for(const [stage,name]of [['spread-1','intro-spread-1'],['spread-2','intro-spread-2'],['spread-3','intro-spread-3'],['spread-4','intro-spread-4']]){
  await p.waitForFunction(s=>document.querySelector('canvas')?.dataset.stage===s,stage,{timeout:6000});await p.screenshot({path:path.join(out,name+'.png')});
 }
 await p.locator('[data-intro-dialog]').waitFor({state:'hidden',timeout:6000});assert.equal(new URL(p.url()).pathname,'/about');assert.equal(new URL(p.url()).hash,'#contact');
 report.intro=await p.locator('[data-intro-dialog]').evaluate(el=>JSON.parse(el.dataset.introMetrics||'null'));report.checks.push('new role four-page real browser playback and original route preserved');
 await p.reload();await p.waitForTimeout(150);assert(!(await p.locator('[data-intro-dialog]').evaluate(e=>e.open)));report.checks.push('refresh does not replay');
 const second=await animation.newPage();await second.goto('http://127.0.0.1:3000/');await second.waitForTimeout(150);assert(!(await second.locator('[data-intro-dialog]').evaluate(e=>e.open)));report.checks.push('other tab does not replay');await second.close();await p.close();
 const fresh=await animation.newPage();await fresh.goto('http://127.0.0.1:3000/');await fresh.locator('.intro-start').waitFor({state:'visible',timeout:12000});await fresh.keyboard.press('Escape');await fresh.locator('[data-intro-dialog]').waitFor({state:'hidden'});report.checks.push('close all tabs replays; Escape exits');await animation.close();
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await browser.close();fs.writeFileSync(path.join(out,'browser-behavior.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,profiles:report.profiles,errors:report.errors}));}
