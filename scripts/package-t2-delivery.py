from pathlib import Path
import subprocess, json, zipfile, hashlib

root=Path(__file__).resolve().parents[1]
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf-8').split('\0')
allowed=[]
docs={'README.md','.openai/test-site.json','.gitignore','.gitattributes','.openai/hosting.json','package.json','package-lock.json'}
for name in tracked:
    if not name: continue
    if name in docs or (name.endswith('.md') and '/' not in name) or name.startswith(('apps/','packages/','scripts/','assets/zhiqing-site-illustrations/','docs/verification-t0-t1/','docs/verification-t2/')) or (name.startswith('docs/') and '/' not in name[5:]):
        if any(p in {'node_modules','.git','.next','dist','exports','private-media','backups'} for p in Path(name).parts): continue
        if Path(name).name.startswith('.env') and Path(name).name!='.env.example': raise RuntimeError('Environment file in source')
        allowed.append((name,root/name))
for file in (root/'dist').rglob('*'):
    if file.is_file(): allowed.append(('dist/'+file.relative_to(root/'dist').as_posix(),file))

release=json.loads((root/'docs/verification-t2/sites-release.json').read_text(encoding='utf-8'))
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
manifest={'deliveryRecordCommit':head,'applicationCommit':release['localSourceCommit'],'siteSourceCommit':release['source']['commit_sha'],'siteVersion':release['version']['number'],'url':release['deployment']['url'],'files':[]}
out=root/'exports'/'世纪末之青-T2前台阶段交付-2026-10-28.zip'
suffix=2
while out.exists():
    out=root/'exports'/f'世纪末之青-T2前台阶段交付-2026-10-28-{suffix}.zip'
    suffix+=1
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,file in sorted(allowed):
        data=file.read_bytes()
        manifest['files'].append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        archive.writestr('zhiqing-self-t2-r1/'+name,data)
    archive.writestr('zhiqing-self-t2-r1/交付版本与校验.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    for entry in manifest['files']:
        assert hashlib.sha256(archive.read('zhiqing-self-t2-r1/'+entry['path'])).hexdigest()==entry['sha256']
digest=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.sha256.txt').write_text(digest+'  '+out.name+'\n',encoding='utf-8')
print(json.dumps({'archive':str(out),'bytes':out.stat().st_size,'files':len(manifest['files'])+1,'sha256':digest,'deliveryRecordCommit':head},ensure_ascii=True))
