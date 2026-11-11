import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const assets = ['01-collecting-ideas', '02-connecting-ideas', '03-testing-feedback', 'character-avatar'].flatMap(name=>[name+'.png',name+'.webp',name+(name==='character-avatar'?'-96.webp':'-768.webp')]);
assets.push('intro-window-v1.webp');
assets.push('intro-salute-r2.webp');
const input=JSON.parse(readFileSync(path.join(root,'packages/adapters/src/sites-data.json'),'utf8'));
const reviewed=new Map((input?.snapshot.media??[]).map(m=>[m.path,m]));
const illustrationManifest=JSON.parse(readFileSync(path.join(root,'assets/intro-r4-illustrations/manifest.json'),'utf8'));
const illustrations=new Map(illustrationManifest.items.map(item=>[item.path,item]));
const records = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) { walk(file); continue; }
    const rel = path.relative(dist, file).replaceAll('\\', '/');
    if (/(^|\/)(\.env|node_modules|backups|private-media|\.git)|\.map$|\.zip$|\.sql$/.test(rel)) throw new Error(`Disallowed output ${rel}`);
    const bytes = readFileSync(file);
    if (/\.(html|js|css|json)$/.test(rel)) {
      const text = bytes.toString('utf8');
      if (/https?:\/\/(?:localhost|127\.0\.0\.1)|\/@fs\/|postgres(?:ql)?:\/\/|Bearer\s+[A-Za-z0-9_.-]{12}|PAYLOAD_SECRET|DATABASE_URL/.test(text)) throw new Error(`Private/local dependency in ${rel}`);
    }
    if(/^assets\/intro-r4\//.test(rel)){const item=illustrations.get(rel);if(!item||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error(`Unreviewed illustration ${rel}`);}
    else if(/^assets\/cms-/.test(rel)){const item=reviewed.get(rel);if(!item||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error(`Unreviewed media ${rel}`);}else if (/^assets\/.*\.(png|webp|pdf)$/.test(rel) && !assets.includes(name)) throw new Error(`Unlisted image ${rel}`);
    records.push({path:rel, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex')});
  }
}
walk(dist);
const output = { candidate:input?.snapshot.candidate??'T2-R1', snapshot:input?.snapshot.id??'sites-t2-fixtures-20261027-1', schemaVersion:1, workIds:input?.snapshot.workIds??['fixture-work-001','fixture-work-002'], allowedImages:assets, otherContent:input?'Audited public test DTO subset; no database export.':'Existing visibly labelled home/about copy and three sample notes; no database export.',reviewedMedia:[...reviewed.values()], files:records };
const report=path.resolve(root,process.argv[2]||'docs/verification-t4/static-snapshot-scan.json');if(!report.startsWith(root+path.sep))throw new Error('Report must stay in project');mkdirSync(path.dirname(report),{recursive:true});writeFileSync(report,JSON.stringify({...output,verificationContext:'Local build snapshot verification; actual platform version recorded independently'},null,2));
console.log(`PASS: ${records.length} output files; reviewed public test media, no localhost backend, secrets, database dumps or source maps.`);
