import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../apps/web/package.json',import.meta.url)),sharp=require('sharp');
const root=path.resolve(import.meta.dirname,'..'),original=path.join(root,'assets/role-202611-illustrations'),out=path.join(root,'apps/preview/public/assets/role-202611');
fs.mkdirSync(out,{recursive:true});
const manifest=[];
for(const name of ['01-desk','02-curiosity','03-making','04-journal','05-connecting','06-testing','07-salute','08-analysis']){
 const source=path.join(original,name+'.png');if(!fs.existsSync(source))throw Error('Missing approved original: '+name);
 const target=path.join(out,name+'.webp');await sharp(source).resize({width:name==='01-desk'?768:640,kernel:'nearest',withoutEnlargement:true}).webp({lossless:true}).toFile(target);
 const bytes=fs.readFileSync(target);manifest.push({name,publicPath:'/assets/role-202611/'+name+'.webp',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,sourceSha256:createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
}
for(const [name,width]of [['avatar',512],['avatar-96',96]]){const target=path.join(out,name+'.webp');await sharp(path.join(original,'primary.png')).resize(width,width,{kernel:'nearest'}).webp({lossless:true}).toFile(target);manifest.push({name,publicPath:'/assets/role-202611/'+name+'.webp',sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex'),bytes:fs.statSync(target).size});}
fs.writeFileSync(path.join(original,'manifest.json'),JSON.stringify({identity:'skill primary 2026-11-08',generated:'built-in image_gen; individually reviewed',files:manifest},null,2)+'\n');
console.log('Prepared '+manifest.length+' new role assets; '+manifest.reduce((a,v)=>a+v.bytes,0)+' bytes.');
