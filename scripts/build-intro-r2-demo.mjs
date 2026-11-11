import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const runtime=path.join(root,'runtime');
const outdir=process.env.R2_LAB_OUTDIR?path.resolve(root,process.env.R2_LAB_OUTDIR):path.join(runtime,'intro-r2');
if(!outdir.startsWith(runtime+path.sep))throw Error('R2 lab output must stay inside the project runtime directory.');
const archive=path.join(root,'design/intro-r2-archive');
const key=file=>process.platform==='win32'?path.resolve(file).toLowerCase():path.resolve(file);
const frozen=new Map([
  [key(path.join(root,'packages/ui/src/Intro.tsx')),{file:'Intro.tsx',loader:'tsx'}],
  [key(path.join(root,'packages/ui/src/intro-scene.ts')),{file:'intro-scene.ts',loader:'ts'}],
  [key(path.join(root,'packages/design/intro.css')),{file:'intro.css',loader:'css'}],
]);
// Read the retained text assets, not Git, at build/launch time. Resolve imports
// from the original module directory so only the historical scene is replaced.
const frozenR2={name:'frozen-r2-scene',setup(builder){
  builder.onLoad({filter:/(?:Intro\.tsx|intro-scene\.ts|intro\.css)$/},args=>{
    const source=frozen.get(key(args.path));
    if(!source)return;
    const file=path.join(archive,source.file);
    return {contents:fs.readFileSync(file,'utf8'),loader:source.loader,resolveDir:path.dirname(args.path),watchFiles:[file]};
  });
}};
fs.mkdirSync(outdir,{recursive:true});
await build({absWorkingDir:root,entryPoints:['scripts/intro-r2-demo.tsx'],bundle:true,outdir,entryNames:'lab',jsx:'automatic',format:'esm',target:'es2022',external:['/fonts/*','/assets/*'],define:{'process.env.NODE_ENV':'"production"'},plugins:[frozenR2]});
fs.writeFileSync(path.join(outdir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>之青 R2 本机审片台</title><link rel="stylesheet" href="/__intro-r2/lab.css"></head><body><div id="root"></div><script type="module" src="/__intro-r2/lab.js"></script></body></html>');
console.log('Local R2 lab compiled; excluded from Sites build/staging.');
