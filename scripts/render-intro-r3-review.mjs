import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';

// CPU raster review of the ACTUAL browser renderer. These are not screenshots,
// browser GPU frames or evidence of realtime 60fps. No application deps changed.
const root=path.resolve(import.meta.dirname,'..');
const exportsDir=path.join(root,'exports');
const rendererPath=path.join(root,'design/intro-r3-1-archive/intro-renderer.ts');
const configPath=path.join(root,'design/intro-r3-1-archive/intro-scene.ts');
const cssPath=path.join(root,'design/intro-r3-1-archive/intro.css');
const configBundle=(await build({entryPoints:[configPath],bundle:true,write:false,format:'cjs',platform:'node',target:'node24'})).outputFiles[0].text;
const configModule={exports:{}};
new Function('module','exports',configBundle)(configModule,configModule.exports);
const {introScene}=configModule.exports;
const revision=introScene.id.match(/r\d+(?:-\d+)?$/)?.[0];
if(!revision)throw Error('Cannot derive safe revision from active scene '+introScene.id);
const runtime=path.join(root,'runtime/intro-'+revision);
const evidence=path.join(root,'docs/verification-intro-'+revision);
const compositeMode=/\.intro-canvas\s*\{[^}]*mix-blend-mode\s*:\s*multiply/.test(fs.readFileSync(cssPath,'utf8'))?'multiply':'source-over';
const bundledNode=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node');
const nativeRequire=createRequire(path.join(bundledNode,'package.json'));
const {createCanvas,loadImage,GlobalFonts}=nativeRequire('@napi-rs/canvas');
fs.mkdirSync(runtime,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
const bundlePath=path.join(runtime,'renderer-offline.cjs');
await build({entryPoints:[rendererPath],outfile:bundlePath,bundle:true,format:'cjs',platform:'node',target:'node24'});
const require=createRequire(import.meta.url);
const {createIntroRenderer}=require(bundlePath);
const portraitPath=path.join(root,'apps/preview/public',introScene.portrait);
const portrait=await loadImage(portraitPath);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fontResults=[];
for(const [relative,family] of [['apps/preview/public/fonts/fusion-pixel.woff2','Fusion'],['apps/preview/public/fonts/NotoSansSC-VF.ttf','Noto']]){
 let registered=false,error=null;
 try{registered=!!GlobalFonts.registerFromPath(path.join(root,relative),family)&&GlobalFonts.has(family);}catch(e){error=String(e.message);}
 fontResults.push({file:relative,family,registered,error});
}
function createReview(width,height,dpr=2){
 const canvas=createCanvas(Math.round(width*dpr),Math.round(height*dpr));
 const doc={createElement(tag){if(tag!=='canvas')throw Error('Unexpected renderer element '+tag);return createCanvas(1,1);},defaultView:{devicePixelRatio:dpr}};
 canvas.ownerDocument=doc;
 canvas.getBoundingClientRect=()=>({width,height,left:0,top:0,right:width,bottom:height,x:0,y:0});
 const renderer=createIntroRenderer(canvas,portrait,'世纪末之青');
 const composed=createCanvas(canvas.width,canvas.height),g=composed.getContext('2d');
 g.imageSmoothingEnabled=false;
 const compose=()=>{
  g.globalCompositeOperation='source-over';g.fillStyle='#faf8f3';g.fillRect(0,0,composed.width,composed.height);
  g.globalCompositeOperation=compositeMode;g.drawImage(canvas,0,0);g.globalCompositeOperation='source-over';return composed;
 };
 return{canvas,renderer,width,height,dpr,compose};
}
const t=introScene.timings;
const times=introScene.finishAtMs>10000
 ?[500,2500,5500,Math.round((t.assembleAtMs+t.bookAtMs)/2),t.bookAtMs,t.pageAtMs-700,t.pageAtMs+600,t.portraitAtMs+400,t.portraitReadyAtMs,t.nameReadyAtMs+500,t.leaveAtMs+500,introScene.finishAtMs-83,introScene.finishAtMs]
 :[500,1200,t.bookAtMs,t.pageAtMs-200,t.pageAtMs+300,t.portraitAtMs+100,t.portraitReadyAtMs,t.nameReadyAtMs+300,t.leaveAtMs+200,introScene.finishAtMs-100,introScene.finishAtMs];
const reportPath=path.join(evidence,'offline-render.json');
const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):{};
const record={date:'2026-11-01',scene:introScene.id,revision,scope:'Offline CPU Canvas2D rasterization of actual intro-renderer.ts with CSS canvas blend simulated against a fixed review paper. NOT browser screenshots, realtime FPS, DOM text timing or webpage reveal validation.',compositeMode,rendererSha256:sha(rendererPath),configSha256:sha(configPath),cssSha256:sha(cssPath),portrait:{file:path.relative(root,portraitPath).replaceAll('\\','/'),sha256:sha(portraitPath),width:portrait.width,height:portrait.height},fonts:fontResults,referenceVideo:'User-supplied MP4 is reference only; no reference frames/assets copied into site.',...(!process.argv.includes('--video-only')?{}:{keyframes:previous.keyframes??[],contacts:previous.contacts??[],holdWhiteBackground:previous.holdWhiteBackground??null})};
const start=performance.now();
GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','OfflineLabels');
if(!process.argv.includes('--video-only')){
 record.keyframes=[];record.contacts=[];record.holdWhiteBackground=[];
 for(const [label,width,height]of [['wide',1440,900],['short',1440,600]]){
  const review=createReview(width,height,2);
  const tileW=480,tileH=Math.round(height/width*tileW),labelH=30,cols=3,rows=Math.ceil(times.length/cols);
  const sheet=createCanvas(cols*tileW,rows*(tileH+labelH));const g=sheet.getContext('2d');
  g.fillStyle='#eeeae1';g.fillRect(0,0,sheet.width,sheet.height);g.font='16px OfflineLabels';g.imageSmoothingEnabled=false;
  for(let i=0;i<times.length;i++){
   const ms=times[i],stage=review.renderer.draw(ms);
   const file='offline-'+label+'-'+String(ms).padStart(4,'0')+'ms.png';
   const composed=review.compose();
   const bytes=composed.toBuffer('image/png');fs.writeFileSync(path.join(evidence,file),bytes);
   const x=i%cols*tileW,y=Math.floor(i/cols)*(tileH+labelH);
   // Contact backdrop clarifies alpha holes without pretending to be the site.
   g.fillStyle='#eeeae1';g.fillRect(x,y,tileW,tileH+labelH);g.fillStyle='#3b2c27';g.fillText(ms+'ms · '+stage.stage,x+10,y+20);
   // Immutable image avoids a native deferred source-surface snapshot using a
   // later animation frame when the same canvas is subsequently redrawn.
   g.drawImage(await loadImage(bytes),x,y+labelH,tileW,tileH);
   record.keyframes.push({elapsedMs:ms,viewport:{width,height,dpr:2},pixelSize:{width:review.canvas.width,height:review.canvas.height},file,stage:stage.stage,moving:stage.moving,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const contact='offline-'+label+'-contact.png';fs.writeFileSync(path.join(evidence,contact),sheet.toBuffer('image/png'));record.contacts.push(contact);
  // At the final hold, original white image corners and the former page edge
  // must blend into the same review paper. This tests CPU composition only.
  if(revision!=='r3'){
   const ms=t.nameReadyAtMs+500;review.renderer.draw(ms);const composed=review.compose(),ctx=composed.getContext('2d');
   const scale=Math.max(.2,Math.min(1,(width-56)/860,(height-72)/640));
   const cx=width/2,cy=height/2+5,expected=[250,248,243,255];
   const positions=[['outside',10,10],['portrait-top-left',cx+(-209+4)*scale,cy+(-245+4)*scale],['portrait-top-right',cx+(209-4)*scale,cy+(-245+4)*scale],['portrait-bottom-left',cx+(-209+4)*scale,cy+(-245+418-4)*scale],['portrait-bottom-right',cx+(209-4)*scale,cy+(-245+418-4)*scale],['former-page-left-edge',cx-237*scale,cy]];
   const samples=positions.map(([name,x,y])=>{const pixel=Array.from(ctx.getImageData(Math.round(x*2),Math.round(y*2),1,1).data),tolerance=name.startsWith('portrait-')?2:0,maxRgbDelta=Math.max(...pixel.slice(0,3).map((n,i)=>Math.abs(n-expected[i])));return{name,cssPosition:{x,y},pixel,expected,exactPaperMatch:pixel.every((n,i)=>n===expected[i]),maxRgbDelta,tolerance,pass:maxRgbDelta<=tolerance&&pixel[3]===255};});
   record.holdWhiteBackground.push({viewport:{width,height,dpr:2},elapsedMs:ms,compositeMode,samples,pass:samples.every(s=>s.pass),scope:'Offline CPU pixel assertion against fixed review paper; not browser blend verification.',note:'The unchanged source image includes near-white254/253 pixels. Portrait background allows at most2 RGB levels from paper after multiply/rounding; outside and former page edge require exact paper. All raw values and exact-match results are retained.'});
  }
  review.renderer.dispose();
 }
 record.keyframeGenerationMs=Math.round(performance.now()-start);
 fs.writeFileSync(reportPath,JSON.stringify(record,null,2));
 console.log(JSON.stringify({phase:'keyframes-ready',scene:introScene.id,files:record.keyframes.length,contacts:record.contacts,fonts:fontResults,ms:record.keyframeGenerationMs,scope:'offline CPU; not realtime/browser FPS'}));
}
if(process.argv.includes('--video')||process.argv.includes('--video-only')){
 fs.mkdirSync(exportsDir,{recursive:true});
 const binaries=path.join(root,'runtime/intro-r3-analysis-deps/imageio_ffmpeg/binaries');
 const ffmpeg=fs.readdirSync(binaries).find(f=>/^ffmpeg.*\.exe$/i.test(f));
 if(!ffmpeg)throw Error('Expected existing ffmpeg executable in ignored analysis cache');
 const output=path.join(exportsDir,'之青-'+revision.toUpperCase()+'-离线审片-2026-11-01.mp4');
 const videoStart=performance.now(),width=1440,height=900,fps=60;
 const review=createReview(width,height,2);
 const videoCanvas=createCanvas(width,height),videoContext=videoCanvas.getContext('2d');videoContext.imageSmoothingEnabled=false;
 const child=spawn(path.join(binaries,ffmpeg),['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size',width+'x'+height,'-framerate',String(fps),'-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an',output],{windowsHide:true,stdio:['pipe','ignore','pipe']});
 let stderr='',failure=null;
 child.stderr.on('data',b=>{stderr+=b.toString();});child.on('error',e=>{failure=e;});child.stdin.on('error',e=>{failure=e;});
 const exit=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
 const count=Math.round(introScene.finishAtMs/1000*fps);
 try{
  for(let i=0;i<count;i++){
   if(failure)throw failure;
   const ms=i*1000/fps;review.renderer.draw(ms);
   videoContext.drawImage(review.compose(),0,0,width,height);const bytes=videoCanvas.data();
   // Write completion applies stream backpressure: at most one RGBA frame
   // awaits the ffmpeg pipe, rather than queuing the entire sequence in memory.
   await new Promise((resolve,reject)=>child.stdin.write(bytes,e=>e?reject(e):resolve()));
   if(i%60===0)console.log(JSON.stringify({phase:'offline-encoding',frame:i,total:count}));
  }
  child.stdin.end();const status=await exit;
  if(status.code!==0||failure)throw failure??Error('ffmpeg exit '+status.code+': '+stderr);
  review.renderer.dispose();
  record.video={file:path.relative(root,output).replaceAll('\\','/'),bytes:fs.statSync(output).size,sha256:sha(output),width,height,encodedFps:fps,frames:count,durationSeconds:count/fps,elapsedSampleStepMs:1000/fps,generationMs:Math.round(performance.now()-videoStart),input:'Renderer atDPR2, nearest-neighbor downsample to1440x900 rawRGBA, serialized with pipe backpressure.',compositing:'Scene canvas composited using '+compositeMode+' onto fixed site paper review color; does not include the actual underlying web page or native dialog/DOM controls.',scope:'Offline export sampled every1/60s, not an actual capture or proof that the browser displays60fps.'};
  fs.writeFileSync(reportPath,JSON.stringify(record,null,2));
  console.log(JSON.stringify({phase:'offline-video-ready',...record.video}));
 }catch(e){child.stdin.destroy();child.kill();record.video={error:String(e.message),scope:'Offline export failed; no realtime/browser claim'};fs.writeFileSync(reportPath,JSON.stringify(record,null,2));throw e;}
}
