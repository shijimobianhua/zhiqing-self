import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {normalize,validate,publicDTO} from '../apps/web/src/server/t4/model.ts';
import {publicFields} from '../apps/web/src/server/t4/public-fields.ts';
import {publicGraph} from '../apps/web/src/server/t4/content.ts';
import {publicFooter,resolveLink} from '../packages/content/src/index.ts';
import {setupScrollReveal} from '../packages/ui/src/scroll-reveal.ts';
import {lockMenuScroll} from '../packages/ui/src/mobile-menu.ts';
import {assertPublicCopy} from './site/public-copy.mjs';

const base=JSON.parse(fs.readFileSync('runtime/site-publisher/jobs/697159a5-4c96-44d3-926b-d49d784af3f3/snapshot.json','utf8')).data;
const link=(label,target)=>({label,target,enabled:true});
const card=(id,target={kind:'path',path:'/works'})=>({id,title:'作品',displayText:'创作与过程',description:'',icon:'folder',enabled:true,action:'link',link:link('作品',target)});
const copy={id:'wechat',title:'微信',displayText:'联系之青',description:'点击复制',icon:'chat',enabled:true,action:'copy',copyText:'local-copy-check'};

await test('footer editing, public whitelist, disabled entries, and safe targets',async()=>{
 const old=normalize('settings',base.settings);assert.deepEqual(old.footerCards,[]);assert.deepEqual(old.footerKeywords,[]);
 const d=normalize('settings',{...base.settings,footerCards:[card('work'),copy,card('hidden')],footerKeywords:[link('项目',{kind:'path',path:'/works'})]});
 d.footerCards[2].enabled=false;const saved=normalize('settings',d);validate('settings',saved,[],[],[]);
 const view=publicFields('settings',{...publicDTO('settings','settings',saved,1,''),privateSecret:'must-not-export'});assert(!('privateSecret'in view));assert.equal(view.footerCards[1].copyText,copy.copyText);
 const graph=await publicGraph({query:async()=>({rows:[{id:'settings',kind:'settings',published:{view},publication_version:1}]})});assert.deepEqual(graph.data.settings.footerCards.map(c=>c.id),['work','wechat']);
 const moved={...d,footerCards:[copy,d.footerCards[0]]};assert.deepEqual(normalize('settings',moved).footerCards.map(c=>c.id),['wechat','work']);assert.equal(normalize('settings',{...moved,footerCards:[]}).footerCards.length,0);
 const disabled=publicFooter({...base.settings,notesEnabled:false,footerCards:[card('note',{kind:'path',path:'/notes'}),card('unpublished',{kind:'internal',collection:'works',id:'missing'}),{...copy,enabled:false}],footerKeywords:[link('记录',{kind:'path',path:'/notes'})]});assert.deepEqual(disabled,{footerCards:[],footerKeywords:[]});
 const valid=card('email',{kind:'email',address:'hello@example.com'});assert.equal(resolveLink(valid.link.target),'mailto:hello@example.com');assert.equal(publicFooter({...base.settings,footerCards:[valid]}).footerCards.length,1);
 for(const url of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com'])assert.throws(()=>validate('settings',normalize('settings',{...base.settings,footerCards:[card('bad',{kind:'external',url})]}),[],[],[]));
 assert.throws(()=>normalize('settings',{...base.settings,footerCards:[{...copy,action:'script'}]}));assert.throws(()=>validate('settings',normalize('settings',{...base.settings,footerCards:[{...copy,copyText:''}]}),[],[],[]));
 const hidden=normalize('settings',{...base.settings,footerCards:[{...card('off',{kind:'external',url:'javascript:bad'}),enabled:false}]});validate('settings',hidden,[],[],[]);
});

const tmp=path.resolve('runtime/site-publisher/footer-ui-check');fs.mkdirSync(tmp,{recursive:true});
await build({stdin:{contents:`import React from 'react';import{renderToString}from'react-dom/server';import{Footer}from'./packages/ui/src/Footer';import{SiteLayout}from'./packages/ui/src/Site';import{EntryFields,move}from'./apps/web/src/app/admin/FormControls';export{move,Footer,SiteLayout,EntryFields};export const footer=(settings)=>renderToString(<Footer settings={settings}/>);export const admin=(draft)=>renderToString(<EntryFields kind="settings" draft={draft} onChange={()=>{}} items={[]} media={[]}/>);export const site=(data)=>renderToString(<SiteLayout pathname="/" data={data} hasNotes={false} presentation="public"><p>正文可见</p></SiteLayout>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:path.join(tmp,'render.mjs'),bundle:true,format:'esm',platform:'node',jsx:'automatic',external:['react','react-dom/server','react/jsx-runtime'],logLevel:'silent'});
const render=await import(pathToFileURL(path.join(tmp,'render.mjs')));
await test('footer and admin render with zero, one, two, five and long entries',()=>{
 for(const n of [0,1,2,5,12]){const settings={...base.settings,footerCards:Array.from({length:n},(_,i)=>({...card('card-'+i),displayText:'长账号'.repeat(30)})),footerKeywords:[]};const html=render.footer(settings);assert.equal((html.match(/class="footer-card pixel-frame"/g)||[]).length,n);assertPublicCopy(html);if(!n)assert(!html.includes('aria-label="页脚入口"'));}
 const settings={...base.settings,footerCards:[copy,card('external',{kind:'external',url:'https://example.com',newTab:true})],footerKeywords:[link('创作',{kind:'path',path:'/works'})]};const html=render.site({...base,settings});assertPublicCopy(html);assert(html.includes('target="_blank" rel="noopener noreferrer"'));assert(html.includes('点击复制'));assert(!html.includes('THANKS FOR STOPPING BY'));assert(html.includes('class="mobile-menu-dialog"'));assert(html.includes('mobile-menu-panel pixel-frame'));assert(html.includes('正文可见'));assert(!html.includes('opacity:0'));
 const editor=render.admin(normalize('settings',settings));assert(editor.includes('添加卡片'));assert(editor.includes('添加关键词'));assert(editor.includes('要复制的文字'));assert(editor.includes('上移'));assert(editor.includes('下移'));assert.deepEqual(render.move(['a','b','c'],0,2),['c','b','a']);
});

function fakeEnvironment(){
 const old={};for(const key of ['window','document','matchMedia','sessionStorage','IntersectionObserver'])old[key]=Object.getOwnPropertyDescriptor(globalThis,key);
 const events=new Map(),observers=[],storage=new Map(),scrolls=[];
 const media=new Map();const matchMedia=query=>{if(!media.has(query)){const listeners=new Set();media.set(query,{matches:!query.includes('reduce'),addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f),change(value){this.matches=value;for(const f of listeners)f();}});}return media.get(query);};
 const style=()=>({position:'',top:'',left:'',right:'',width:'',overflow:'',scrollBehavior:'',setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}});
 const window={scrollY:1600,scrollX:0,__zhiqingIntro:{state:'done'},addEventListener:(key,f)=>{if(!events.has(key))events.set(key,new Set());events.get(key).add(f);},removeEventListener:(key,f)=>events.get(key)?.delete(f),scrollTo:v=>scrolls.push(v)};
 const document={body:{style:style()},documentElement:{style:style()}};
 const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 class IntersectionObserver{constructor(fn){this.fn=fn;this.items=new Set();observers.push(this);}observe(el){this.items.add(el);}unobserve(el){this.items.delete(el);}disconnect(){this.items.clear();}enter(el){this.fn([{target:el,isIntersecting:true}]);}}
 window.IntersectionObserver=IntersectionObserver;
 Object.assign(globalThis,{window,document,matchMedia,sessionStorage,IntersectionObserver});
 return {window,document,scrolls,observers,media,events,storage,style,restore(){for(const [k,v]of Object.entries(old)){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}};
}
await test('menu scroll locking restores scrolled position and previous styles exactly once',()=>{
 const env=fakeEnvironment();try{env.document.body.style.position='relative';env.document.documentElement.style.scrollBehavior='smooth';const release=lockMenuScroll();assert.equal(env.document.body.style.top,'-1600px');assert.equal(env.document.body.style.position,'fixed');release();release();assert.equal(env.document.body.style.position,'relative');assert.equal(env.document.body.style.top,'');assert.equal(env.document.documentElement.style.scrollBehavior,'smooth');assert.deepEqual(env.scrolls,[{left:0,top:1600,behavior:'instant'}]);}finally{env.restore();}
});
await test('reveal waits for intro, reveals once, persists across reload, and respects preferences',()=>{
 const env=fakeEnvironment();try{
  const classes=new Set(),el={dataset:{revealKey:'card:one'},id:'',classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},style:env.style(),parentElement:null};const root={querySelectorAll:selector=>selector==='[data-reveal-key]'?[el]:[]};
  env.window.__zhiqingIntro.state='play';let cleanup=setupScrollReveal(root,'/');assert.equal(env.observers.length,0);env.window.__zhiqingIntro.state='done';for(const fn of env.events.get('zhiqing-intro-change'))fn();assert.equal(env.observers.length,1);const observer=env.observers[0];assert(observer.items.has(el));observer.enter(el);assert(classes.has('reveal-enter'));assert(!observer.items.has(el));cleanup();assert(!classes.has('reveal-enter'));
  cleanup=setupScrollReveal(root,'/');assert.equal(env.observers.at(-1).items.size,0);cleanup();
  env.media.get('(prefers-reduced-motion:reduce)').matches=true;const before=env.observers.length;cleanup=setupScrollReveal(root,'/new');assert.equal(env.observers.length,before);cleanup();env.media.get('(prefers-reduced-motion:reduce)').matches=false;env.media.get('(min-width:768px) and (hover:hover) and (pointer:fine)').matches=false;cleanup=setupScrollReveal(root,'/mobile');assert.equal(env.observers.length,before);cleanup();
  env.media.get('(min-width:768px) and (hover:hover) and (pointer:fine)').matches=true;globalThis.sessionStorage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};cleanup=setupScrollReveal(root,'/no-storage');env.observers.at(-1).enter(el);assert(classes.has('reveal-enter'));cleanup();
 }finally{env.restore();}
});

await test('DOM clicks: clipboard success/fallback, menu reopen/close, and editor list controls',async()=>{
 const require=createRequire(path.resolve('runtime/site-publisher/ui-check-tools/package.json'));
 const {parseHTML}=await import(pathToFileURL(require.resolve('linkedom')));
 const dom=parseHTML('<html><body><div id="root"></div></body></html>');
 const keys=['window','document','navigator','location','matchMedia','sessionStorage','HTMLElement','requestAnimationFrame','cancelAnimationFrame','IS_REACT_ACT_ENVIRONMENT'];const old=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const media=new Map(),scrolls=[],copied=[];let failCopy=false;
 const mql=query=>{if(!media.has(query))media.set(query,{matches:false,listeners:new Set(),addEventListener(_,fn){this.listeners.add(fn);},removeEventListener(_,fn){this.listeners.delete(fn);}});return media.get(query);};
 const win=dom.window;win.__zhiqingIntro={state:'done',reason:'dom-test',finish(){}};win.scrollY=1600;win.scrollX=0;win.scrollTo=value=>scrolls.push(value);win.matchMedia=mql;
 const storage=new Map();const values={window:win,document:dom.document,navigator:{userAgent:'DOM-test',clipboard:{async writeText(text){if(failCopy)throw Error('denied');copied.push(text);}}},location:new URL('http://127.0.0.1:3000/about'),matchMedia:mql,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},HTMLElement:dom.HTMLElement,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,IS_REACT_ACT_ENVIRONMENT:true};
 for(const[k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});
 const proto=dom.HTMLElement.prototype;proto.showModal=function(){this.open=true;this.setAttribute('open','');};proto.close=function(){if(!this.open)return;this.open=false;this.removeAttribute('open');this.dispatchEvent(new dom.Event('close'));};proto.getBoundingClientRect=function(){return {left:16,top:100,right:400,bottom:600,width:384,height:500};};
 const {act,createElement:h,useState}=await import('react');const {createRoot}=await import('react-dom/client');const container=dom.document.getElementById('root'),root=createRoot(container);const click=async el=>{assert(el,'Expected click target');await act(async()=>{el.dispatchEvent(new dom.Event('click',{bubbles:true}));});};
 try{
  const settings={...base.settings,footerCards:[copy],footerKeywords:[]};await act(async()=>root.render(h(render.Footer,{settings})));await click(container.querySelector('button.footer-card'));assert.deepEqual(copied,[copy.copyText]);assert(container.textContent.includes('已复制'));failCopy=true;await click(container.querySelector('button.footer-card'));assert.equal(container.querySelector('.footer-copy-fallback'),null);assert(container.textContent.includes('复制失败，请重试'));assert.equal(container.querySelector('.copy-feedback').dataset.visible,'true');
  await act(async()=>root.render(h(render.SiteLayout,{pathname:'/about',data:{...base,settings},hasNotes:false,presentation:'public'},h('p',null,'内容'))));const menu=container.querySelector('#mobile-menu');await click(container.querySelector('.menu-button'));assert(menu.open);assert.equal(dom.document.body.style.position,'fixed');await click(menu.querySelector('button'));assert(!menu.open);assert.equal(scrolls.at(-1).top,1600);
  await click(container.querySelector('.menu-button'));await click(menu.querySelector('nav a'));assert(!menu.open);await click(container.querySelector('.menu-button'));const viewport=mql('(min-width:768px)');await act(async()=>{viewport.matches=true;for(const fn of viewport.listeners)fn();});assert(!menu.open);
  let current;function Editor(){const[draft,setDraft]=useState(normalize('settings',{...base.settings,footerCards:[card('one'),{...card('two'),title:'关于'}]}));current=draft;return h(render.EntryFields,{kind:'settings',draft,onChange:(key,value)=>setDraft(d=>({...d,[key]:value})),items:[],media:[]});}
  await act(async()=>root.render(h(Editor)));const field=container.querySelector('#footerCards');await click([...field.querySelectorAll('button')].find(b=>b.textContent==='下移'));assert.deepEqual(current.footerCards.map(c=>c.id),['two','one']);await click([...field.querySelectorAll('button')].find(b=>b.textContent==='添加卡片'));assert.equal(current.footerCards.length,3);await click([...field.querySelectorAll('button')].find(b=>b.textContent==='移除'));assert.equal(current.footerCards.length,2);assert.equal(current.footerCards[0].id,'one');
 }finally{await act(async()=>root.unmount());for(const[k,v]of Object.entries(old)){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
