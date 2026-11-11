import { cpSync, rmSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {introScene} from '../packages/ui/src/intro-scene.ts';
const root = path.resolve(import.meta.dirname, '..');
const stage = path.join(root, '.sites-source');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding:'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd:root, encoding:'utf8' }).trim();
if (dirty) throw new Error('Commit the validated local candidate before staging.');
mkdirSync(stage, {recursive:true});
if(execFileSync('git',['status','--porcelain'],{cwd:stage,encoding:'utf8'}).trim())throw new Error('Sites mirror has local changes; preserve and inspect before staging.');
const manifest = [];
function copy(file) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const data = readFileSync(file);
  if (/\.(tsx?|mjs|json|html|css)$/.test(file) && /Bearer\s+[A-Za-z0-9_.-]{24}|-----BEGIN (?:RSA |EC )?PRIVATE KEY/.test(data.toString('utf8'))) throw new Error(`Secret-like source ${rel}`);
  const dest = path.join(stage, rel); mkdirSync(path.dirname(dest), {recursive:true}); cpSync(file,dest);
  manifest.push({path:rel, sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});
}
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if ((name.startsWith('.next')||['node_modules','dist','.vite','public'].includes(name)) && !(dir.endsWith(path.join('apps','preview')) && name==='public')) continue;
    if ((name.startsWith('.env')&&name!=='.env.example') || name.endsWith('.tsbuildinfo') || name.endsWith('.log') || name.endsWith('.map')) continue;
    const file = path.join(dir,name);
    if (statSync(file).isDirectory()) walk(file); else copy(file);
  }
}
for (const file of ['package.json','package-lock.json','.gitignore','.gitattributes','README.md','.openai/hosting.json','.openai/test-site.json']) copy(path.join(root,file));
for (const dir of ['packages','apps/preview','apps/web']) walk(path.join(root,dir));
for (const file of ['prepare-assets.mjs','prepare-static-routes.mjs','load-public-fixtures.mjs','load-public-snapshot.mjs','render-static.tsx','test-contracts.mjs','check-snapshot.mjs']) copy(path.join(root,'scripts',file));
// The snapshot verifier uses this exact, reviewed R4 image allowlist.
copy(path.join(root,'assets/intro-r4-illustrations/manifest.json'));
// Remove only stale managed source files, never the mirror Git identity, dependencies or user files.
const selected=new Set(manifest.map(m=>m.path));
function removeStale(dir){if(!existsSync(dir))return;for(const name of readdirSync(dir)){if(['node_modules','dist','.vite'].includes(name)||name.startsWith('.next'))continue;const file=path.resolve(dir,name);if(!file.startsWith(path.resolve(stage)+path.sep))throw Error('Unsafe mirror cleanup path');if(statSync(file).isDirectory())removeStale(file);else{const rel=path.relative(stage,file).replaceAll('\\','/');if(!selected.has(rel))rmSync(file);}}}
for(const managed of ['packages','apps/preview','apps/web','scripts'])removeStale(path.join(stage,managed));
for(const rel of ['apps/preview/dist','dist']){const target=path.resolve(stage,rel);if(!target.startsWith(path.resolve(stage)+path.sep))throw Error('Unsafe mirror output path');rmSync(target,{recursive:true,force:true});}
// Include only tested build output, never application state or old delivery files.
cpSync(path.join(root,'apps/preview/dist'),path.join(stage,'apps/preview/dist'),{recursive:true});
cpSync(path.join(root,'dist'),path.join(stage,'dist'),{recursive:true});
const snapshot=JSON.parse(readFileSync(path.join(root,'packages/adapters/src/sites-data.json'),'utf8'));
const provenance={localCommit:head,candidate:'T5-R1 / R4 opening',snapshot:snapshot.snapshot.id,animation:{id:introScene.id,enabled:introScene.enabled,portrait:introScene.portrait,startLabel:introScene.startLabel,readyAtMs:introScene.readyAtMs,finishAtMs:introScene.finishAtMs,storyDurationMs:introScene.storyDurationMs,timings:introScene.timings,pages:introScene.pages,particles:introScene.particles,watchdogMs:introScene.watchdogMs,storyWatchdogMs:introScene.storyWatchdogMs},files:manifest};
writeFileSync(path.join(stage,'.openai/source-provenance.json'),JSON.stringify(provenance,null,2));
console.log(JSON.stringify({stage,localCommit:head,sourceFiles:manifest.length,hasManifest:existsSync(path.join(stage,'.openai/hosting.json'))}));
