// Local-only, read-only QA host. Never staged to Sites or used for CMS writes.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const port=Number(process.env.T5_LAB_PORT||4173);
const instrumentation=`<script>(()=>{
const metrics={lcp:null,cls:0,events:[],longTasks:[],errors:[],supported:PerformanceObserver.supportedEntryTypes};
function expose(){metrics.visibility=document.visibilityState;metrics.navigation=performance.getEntriesByType('navigation').map(e=>({duration:e.duration,domContentLoaded:e.domContentLoadedEventEnd,transferSize:e.transferSize}));metrics.resources=performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).pathname,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize,duration:e.duration}));let e=document.getElementById('t5-lab-metrics');if(!e){e=document.createElement('script');e.type='application/json';e.id='t5-lab-metrics';document.documentElement.append(e)}e.textContent=JSON.stringify(metrics)}
for(const type of ['largest-contentful-paint','layout-shift','event','longtask'])try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')metrics.lcp={ms:e.startTime,element:e.element?.tagName,id:e.element?.id,url:e.url};if(type==='layout-shift'&&!e.hadRecentInput)metrics.cls+=e.value;if(type==='event'&&e.interactionId)metrics.events.push({name:e.name,duration:e.duration,interactionId:e.interactionId});if(type==='longtask')metrics.longTasks.push({start:e.startTime,duration:e.duration})}expose()}).observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})})}catch{}
addEventListener('error',e=>{metrics.errors.push(e.message||'resource failure');expose()},true);addEventListener('unhandledrejection',e=>{metrics.errors.push(String(e.reason));expose()});addEventListener('DOMContentLoaded',expose);addEventListener('load',expose);setInterval(expose,500);
})()</script>`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.txt':'text/plain'};
const modes=new Set(['normal','slow','font-failure','reduce-rules','zoom-200','clipboard-failure']);
const counts={};
http.createServer(async(req,res)=>{try{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Read-only QA host');}
 const url=new URL(req.url,'http://127.0.0.1:'+port),mode=url.searchParams.get('lab')||req.headers.cookie?.match(/(?:^|; )t5lab=([^;]+)/)?.[1]||'normal';
 if(!modes.has(mode)){res.writeHead(400);return res.end('Unknown lab mode');}
 if(url.pathname==='/__t5/status'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({port,mode,counts,scope:'loopback QA only; read-only; slow=150ms plus 200000 bytes/s per response, gzip text, no CPU throttling'}));}
 const slow=mode==='slow';if(slow)await new Promise(r=>setTimeout(r,150));
 if(mode==='font-failure'&&/\.woff2$/.test(url.pathname)){counts.fontFailures=(counts.fontFailures||0)+1;res.writeHead(503,{'Cache-Control':'no-store'});return res.end('Intentional local QA font failure');}
 let bytes,status=200,type,headers={};
 if(url.pathname==='/admin'||url.pathname.startsWith('/_next/')||url.pathname.startsWith('/api/cms/')){
  const upstream=await fetch('http://127.0.0.1:3000'+req.url,{headers:{...(req.headers.cookie?{cookie:req.headers.cookie}:{}),Origin:'http://127.0.0.1:3000',accept:req.headers.accept||'*/*'},redirect:'manual'});
  bytes=Buffer.from(await upstream.arrayBuffer());status=upstream.status;type=upstream.headers.get('content-type')||'application/octet-stream';
 }else{
  let rel=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(dist,rel);
  if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){file=path.join(dist,'404.html');status=404;}
  bytes=fs.readFileSync(file);type=mime[path.extname(file)]||'application/octet-stream';
 }
 if(type.includes('text/html')){
  let extra=instrumentation;
  if(mode==='zoom-200')extra+='<style>html{zoom:2}</style>';
  if(mode==='clipboard-failure')extra+='<script>Object.defineProperty(navigator,"clipboard",{value:{writeText:()=>Promise.reject(new Error("local QA denied"))},configurable:true})</script>';
  bytes=Buffer.from(bytes.toString().replace('<head>','<head>'+extra));
 }
 if(mode==='reduce-rules'&&type.includes('text/css'))bytes=Buffer.from(bytes.toString().replaceAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g,'@media all'));
 if(/text|javascript|json/.test(type)&&req.headers['accept-encoding']?.includes('gzip')){bytes=gzipSync(bytes);headers['Content-Encoding']='gzip';}
 const privateRoute=url.pathname==='/admin'||url.pathname.startsWith('/api/cms/');
 const cache=!privateRoute&&(url.searchParams.get('cache')==='warm'||req.headers.cookie?.includes('t5cache=warm'));headers={...headers,'Content-Type':type,'Cache-Control':privateRoute?'private, no-store':cache?'public, max-age=3600':'no-store','X-T5-Lab':'read-only QA; not deployed'};
 if(url.searchParams.has('lab'))headers['Set-Cookie']=['t5lab='+mode+'; Path=/; SameSite=Strict','t5cache='+(url.searchParams.get('cache')==='warm'?'warm':'cold')+'; Path=/; SameSite=Strict'];
 res.writeHead(status,headers);if(req.method==='HEAD')return res.end();
 counts[mode]=(counts[mode]||0)+1;
 if(slow){for(let i=0;i<bytes.length;i+=10000){if(res.destroyed)break;res.write(bytes.subarray(i,i+10000));await new Promise(r=>setTimeout(r,50));}res.end();}else res.end(bytes);
 }catch(e){if(!res.headersSent)res.writeHead(500);res.end('Local QA host failed');console.error(e.message);}
}).listen(port,'127.0.0.1',()=>console.log('T5 read-only lab http://127.0.0.1:'+port));
