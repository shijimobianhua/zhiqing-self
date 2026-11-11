import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {introScene as scene} from '../packages/ui/src/intro-scene.ts';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/verification-intro-r4'),runtime=path.join(root,'runtime/intro-r4');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(runtime,{recursive:true});
const nativeRequire=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'));
const {createCanvas,loadImage,GlobalFonts}=nativeRequire('@napi-rs/canvas');
const fonts=[];
for(const [file,family]of [['fusion-pixel.woff2','Fusion'],['NotoSansSC-VF.ttf','Noto']])fonts.push({family,registered:!!GlobalFonts.registerFromPath(path.join(root,'apps/preview/public/fonts',file),family)});
GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','Labels');
const bundle=path.join(runtime,'renderer-offline.cjs');
await build({entryPoints:['packages/ui/src/intro-renderer-r4.ts'],outfile:bundle,bundle:true,platform:'node',format:'cjs'});
const {createIntroRenderer}=createRequire(import.meta.url)(bundle);
const load=async src=>loadImage(path.join(root,'apps/preview/public',src));
const portrait=await load(scene.portrait),illustrations=await Promise.all(scene.pages.map(p=>load(p.image)));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const record={date:'2026-11-02',scene:scene.id,scope:'Offline CPU render of real scene, NOT browser screenshot, presented FPS or native start control. Simulated click at3850ms; transparent exit composited on review paper.',rendererSha256:sha('packages/ui/src/intro-renderer-r4.ts'),configSha256:sha('packages/ui/src/intro-scene.ts'),fonts,keyframes:[],assets:illustrations.map((image,i)=>({file:scene.pages[i].image,width:image.width,height:image.height,sha256:sha(path.join(root,'apps/preview/public',scene.pages[i].image))}))};
function review(width,height){
 const canvas=createCanvas(width*2,height*2);
 canvas.ownerDocument={createElement(){return createCanvas(1,1);},defaultView:{devicePixelRatio:2}};
 canvas.getBoundingClientRect=()=>({width,height});
 const renderer=createIntroRenderer(canvas,portrait,illustrations),composed=createCanvas(width,height),g=composed.getContext('2d');g.imageSmoothingEnabled=false;
 let activated=false;
 return{renderer,draw(ms){if(ms>=scene.readyAtMs&&!activated){renderer.startStory(scene.readyAtMs);activated=true;}const frame=renderer.draw(ms,activated?ms-scene.readyAtMs:null);g.fillStyle='#faf8f3';g.fillRect(0,0,width,height);g.drawImage(canvas,0,0,width,height);return{frame,image:composed};}};
}
const times=[500,2500,3850,4500,5150,5800,6600,8700,9500,11600,12500,14500,15400,17400,18200];
for(const[label,width,height]of [['wide',1440,900],['short',1440,600]]){
 const r=review(width,height),tileW=480,tileH=height/3,rows=Math.ceil(times.length/3),sheet=createCanvas(1440,rows*(tileH+30)),g=sheet.getContext('2d');g.fillStyle='#eeeae1';g.fillRect(0,0,sheet.width,sheet.height);g.font='16px Labels';g.imageSmoothingEnabled=false;
 for(let i=0;i<times.length;i++){
  const ms=times[i],{frame,image}=r.draw(ms),file='offline-'+label+'-'+ms+'.png',bytes=image.toBuffer('image/png');fs.writeFileSync(path.join(out,file),bytes);
  const x=i%3*tileW,y=Math.floor(i/3)*(tileH+30);g.fillStyle='#59473b';g.fillText(ms+'ms / '+frame.stage,x+10,y+21);g.drawImage(await loadImage(bytes),x,y+30,tileW,tileH);
  record.keyframes.push({file,ms,stage:frame.stage,width,height,dpr:2,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 fs.writeFileSync(path.join(out,'offline-'+label+'-contact.png'),sheet.toBuffer('image/png'));r.renderer.dispose();
}
if(process.argv.includes('--video')){
 const binaries=path.join(root,'runtime/intro-r3-analysis-deps/imageio_ffmpeg/binaries'),ffmpeg=fs.readdirSync(binaries).find(f=>/^ffmpeg.*\.exe$/i.test(f));
 const video='exports/之青-R4-离线审片-2026-11-02.mp4';fs.mkdirSync('exports',{recursive:true});
 const proc=spawn(path.join(binaries,ffmpeg),['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1440x900','-framerate','60','-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an',video],{windowsHide:true,stdio:['pipe','ignore','pipe']});
 let stderr='';proc.stderr.on('data',b=>stderr+=b);const done=new Promise(resolve=>proc.on('close',resolve));const r=review(1440,900),frames=Math.round(scene.finishAtMs/1000*60),begin=Date.now();
 for(let i=0;i<frames;i++){const{image}=r.draw(i*1000/60);await new Promise((resolve,reject)=>proc.stdin.write(image.data(),error=>error?reject(error):resolve()));}
 proc.stdin.end();if(await done!==0)throw Error(stderr);r.renderer.dispose();record.video={file:video,encodedFps:60,frames,duration:frames/60,generationMs:Date.now()-begin,bytes:fs.statSync(video).size,sha256:sha(video),scope:'Offline export, not realtime browser evidence; native start omitted.'};
}
fs.writeFileSync(path.join(out,'offline-render.json'),JSON.stringify(record,null,2));console.log(JSON.stringify({keyframes:record.keyframes.length,video:record.video??null}));
