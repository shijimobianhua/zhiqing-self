from pathlib import Path
import subprocess, json, zipfile, hashlib, re
root=Path(__file__).resolve().parents[1]
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf8').split('\0')
allowed=[]
for name in tracked:
    if not name: continue
    p=Path(name)
    include=(name in {'README.md','.gitignore','.gitattributes','package.json','package-lock.json','.openai/hosting.json','.openai/test-site.json'} or ('/' not in name and name.endswith(('.md','.cmd'))) or name.startswith(('apps/','packages/','scripts/','assets/zhiqing-site-illustrations/','docs/')))
    if not include: continue
    if any(part in {'node_modules','.git','.next','dist','runtime','exports','private-media','backups','.sites-source','.sites-runtime'} for part in p.parts): raise RuntimeError('Forbidden tracked runtime path: '+name)
    if p.name.startswith('.env') and p.name!='.env.example': raise RuntimeError('Private environment tracked')
    allowed.append((name,root/name))
release=json.loads((root/'docs/verification-t3/local-release.json').read_text(encoding='utf8'))
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
private=json.loads((root/'runtime/t3/secrets.json').read_text(encoding='utf8')) if (root/'runtime/t3/secrets.json').exists() else {}
secret_values=[private.get(k,'') for k in ['databaseURL','adminDatabaseURL','payloadSecret','ownerPassword','pgPassword']]
manifest={'stage':'T3-R1','deliveryRecordCommit':head,'applicationCommit':release['applicationCommit'],'localOrigin':'http://127.0.0.1:3000','sitesDeploymentChanged':False,'sitesVersionRetained':2,'contents':'source, SQL migrations, nonsecret templates, demand documents, verification evidence; no live runtime/database/media/credentials','files':[]}
out=root/'exports'/'世纪末之青-T3本机后台交付-2026-10-28.zip';out.parent.mkdir(exist_ok=True)
if out.exists(): raise RuntimeError('Delivery archive exists; preserve it and choose a new revision')
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,file in sorted(allowed):
        data=file.read_bytes()
        for value in secret_values:
            if value and len(value)>12 and value.encode() in data: raise RuntimeError('Private value in '+name)
        manifest['files'].append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        archive.writestr('zhiqing-self-t3-r1/'+name,data)
    archive.writestr('zhiqing-self-t3-r1/交付版本与校验.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    for entry in manifest['files']:
        assert hashlib.sha256(archive.read('zhiqing-self-t3-r1/'+entry['path'])).hexdigest()==entry['sha256']
digest=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.sha256.txt').write_text(digest+'  '+out.name+'\n',encoding='utf8')
print(json.dumps({'archive':str(out),'bytes':out.stat().st_size,'files':len(manifest['files'])+1,'sha256':digest,'deliveryRecordCommit':head},ensure_ascii=True))
