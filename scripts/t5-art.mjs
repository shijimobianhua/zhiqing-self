// Encoding-only optimization, no resizing or drawing. Verify identical decoded pixels.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(new URL('../apps/web/package.json',import.meta.url)),sharp=require('sharp');
const files=[];for(const name of ['01-collecting-ideas','02-connecting-ideas','03-testing-feedback','character-avatar']){
 const source=path.join(root,'apps/preview/public/assets',name+'.png'),target=source.replace(/\.png$/,'.webp');
 await sharp(source).webp({lossless:true,effort:6}).toFile(target);
 const a=await sharp(source).ensureAlpha().raw().toBuffer(),b=await sharp(target).ensureAlpha().raw().toBuffer();
 if(!a.equals(b))throw Error('Decoded pixels changed: '+name);
 const small=source.replace(/\.png$/,name==='character-avatar'?'-96.webp':'-768.webp');
 const width=name==='character-avatar'?96:768;
 await sharp(source).resize({width,kernel:'nearest'}).webp({lossless:true,effort:6}).toFile(small);
 const expected=await sharp(source).resize({width,kernel:'nearest'}).ensureAlpha().raw().toBuffer(),actual=await sharp(small).ensureAlpha().raw().toBuffer();
 if(!expected.equals(actual))throw Error('Responsive nearest-neighbor pixels changed');
 files.push({name,pngBytes:fs.statSync(source).size,webpBytes:fs.statSync(target).size,pixelSha256:createHash('sha256').update(a).digest('hex'),decodedPixelsIdentical:true,responsiveWidth:width,responsiveBytes:fs.statSync(small).size,responsiveKernel:'nearest',responsivePixelsVerified:true});
}fs.mkdirSync(path.join(root,'docs/verification-t5'),{recursive:true});fs.writeFileSync(path.join(root,'docs/verification-t5/art-encoding.json'),JSON.stringify({candidate:'T5-R1',originalsRetained:true,files},null,2));console.log(JSON.stringify(files));
