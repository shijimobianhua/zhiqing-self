"""Full T5 opening update source/report delivery; never overwrite old archives."""
from pathlib import Path
import subprocess, json, zipfile, hashlib
from urllib.parse import urlparse, unquote
root=Path(__file__).resolve().parents[1]
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf8').split('\0')
allowed=[]
for name in filter(None,tracked):
    p=Path(name)
    include=(name in {'README.md','.gitignore','.gitattributes','package.json','package-lock.json','.openai/hosting.json','.openai/test-site.json','.openai/t4-snapshot-allowlist.json'} or ('/' not in name and name.endswith(('.md','.cmd'))) or name.startswith(('apps/','packages/','scripts/','assets/zhiqing-site-illustrations/','assets/intro-illustrations/','docs/')))
    if not include:continue
    if any(part in {'node_modules','.git','.next','dist','runtime','exports','private-media','backups','.sites-source','.sites-runtime'} for part in p.parts):raise RuntimeError('Forbidden tracked runtime path: '+name)
    if p.name.startswith('.env') and p.name!='.env.example':raise RuntimeError('Private environment tracked')
    allowed.append((name,root/name))
release=json.loads((root/'docs/verification-t5-opening/release.json').read_text(encoding='utf8'))
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
configs=[]
for p in [root/'runtime/t3/secrets.json',*(root/'runtime/t3/restores').glob('*/secrets.json')]:
    if p.exists():configs.append(json.loads(p.read_text(encoding='utf8')))
secrets=[c.get(k,'') for c in configs for k in ['databaseURL','adminDatabaseURL','payloadSecret','ownerPassword','pgPassword']]
secrets += [unquote(urlparse(c[k]).password or '') for c in configs for k in ['databaseURL','adminDatabaseURL'] if c.get(k)]
manifest={'stage':'T5 opening update R1','deliveryRecordCommit':head,'applicationCommit':release['applicationCommit'],'sites':release['sites'],'animation':release['animation'],'contents':'Full tracked source, SQL, nonsecret templates, requirements, reports, public art and original intro art; no live database/private media/credentials/dependencies','files':[]}
out=root/'exports'/'世纪末之青-T5开场更新与维护交接-2026-10-29.zip'
out.parent.mkdir(exist_ok=True)
if out.exists():raise RuntimeError('Preserve existing delivery archive; choose a new revision')
prefix='zhiqing-self-t5-opening-r1/'
with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,file in sorted(allowed):
        data=file.read_bytes()
        for secret in secrets:
            if secret and len(secret)>12 and secret.encode() in data:raise RuntimeError('Private value in '+name)
        manifest['files'].append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        archive.writestr(prefix+name,data)
    archive.writestr(prefix+'交付版本与校验.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    for item in manifest['files']:assert hashlib.sha256(archive.read(prefix+item['path'])).hexdigest()==item['sha256']
digest=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.sha256.txt').write_text(digest+'  '+out.name+'\n',encoding='utf8')
receipt={'archive':str(out),'bytes':out.stat().st_size,'files':len(manifest['files'])+1,'sha256':digest,'deliveryRecordCommit':head,'crcAndAllFileHashesVerified':True,'privateConfigScanCount':len(configs)}
(root/'docs/verification-t5-opening/delivery-archive.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(receipt,ensure_ascii=True))
