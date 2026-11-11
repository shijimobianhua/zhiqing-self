// Build-time slicing/registration only; generated drawings remain unchanged.
// Every frame is translated on a fixed canvas, never warped or pose-interpolated.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../apps/web/package.json',import.meta.url)), sharp=require('sharp');
const root=path.resolve(import.meta.dirname,'..');
const src=path.join(root,'assets/intro-r2-illustrations/01-salute-atlas.png');
const reportDir=path.join(root,'docs/verification-intro-r2');
fs.mkdirSync(reportDir,{recursive:true});
const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const rows=4,cols=8,cell=224,out=160;
// Select transparent valleys near the expected inter-row separators.
// The generated sheet has uneven row spacing. These separators are reviewed
// against this immutable 1586x992 source; never infer them for a new drawing.
if(info.width!==1586||info.height!==992)throw Error('Review row cuts for changed source');
// The final generated row (y>=825) changes scale. Reject it rather than let the
// character shrink. The accepted final pose is held, with no fabricated motion.
const cuts=[0,212,422,627,825];
const composites=[],frames=[];
for(let f=0;f<cols*rows;f++){
 const row=Math.floor(f/cols),col=f%cols,left=Math.round(col*info.width/cols),right=Math.round((col+1)*info.width/cols),top=cuts[row],bottom=cuts[row+1];
 let x0=right,y0=bottom,x1=left,y1=top;
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const width=x1-x0+1,height=y1-y0+1;
 if(width>cell-8||height>cell-8)throw Error('Frame exceeds fixed registration canvas: '+f);
 const pixels=await sharp(src).extract({left:x0,top:y0,width,height}).toBuffer();
 const registered=await sharp({create:{width:cell,height:cell,channels:4,background:'#00000000'}})
  .composite([{input:pixels,left:Math.round((cell-width)/2),top:cell-12-height}]).png().toBuffer();
 const small=await sharp(registered).resize(out,out,{kernel:'nearest'}).png().toBuffer();
 const frameFile=path.join(reportDir,'frame-'+String(f).padStart(2,'0')+'.png');
 fs.writeFileSync(frameFile,small);
 composites.push({input:small,left:col*out,top:row*out});
 frames.push({index:f,sourceBounds:{left:x0,top:y0,width,height},registration:'translation only; centered silhouette and common bust baseline',sha256:createHash('sha256').update(small).digest('hex')});
}
const atlas=await sharp({create:{width:cols*out,height:rows*out,channels:4,background:'#00000000'}}).composite(composites).webp({lossless:true,effort:6}).toBuffer();
const dest=path.join(root,'apps/preview/public/assets/intro-salute-r2.webp');
fs.writeFileSync(dest,atlas);
const contact=await sharp({create:{width:cols*out,height:rows*out,channels:4,background:'#faf8f3'}}).composite(composites).png().toBuffer();
fs.writeFileSync(path.join(reportDir,'contact-sheet.png'),contact);
fs.writeFileSync(path.join(reportDir,'asset-manifest.json'),JSON.stringify({generatedSource:'assets/intro-r2-illustrations/01-salute-atlas.png',sourceSize:{width:info.width,height:info.height},sourceSha256:createHash('sha256').update(fs.readFileSync(src)).digest('hex'),cuts,cellSize:out,columns:cols,rows,frames,atlasBytes:atlas.length,atlasSha256:createHash('sha256').update(atlas).digest('hex'),note:'Registration and nearest-neighbor derivative are deterministic. Unique hashes do not prove natural motion; visual review is separate.'},null,2));
console.log(JSON.stringify({source:info.width+'x'+info.height,cuts,frames:frames.length,uniqueFrames:new Set(frames.map(f=>f.sha256)).size,atlasBytes:atlas.length}));
