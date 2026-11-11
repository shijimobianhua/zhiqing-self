"""Full T5/R4 source, reviewed static output and handoff; excludes live state."""
from pathlib import Path
import subprocess, json, zipfile, hashlib
from urllib.parse import urlparse, unquote

root = Path(__file__).resolve().parents[1]
outdir = root / 'exports'
receipt_dir = root / 'docs/verification-t5-r4'
tracked = subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf8').split('\0')
release = json.loads((receipt_dir/'release.json').read_text(encoding='utf8'))
if release['sites']['status'] != 'succeeded':
    raise RuntimeError('Package must identify an actually successful T5 deployment')
head = subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
forbidden = {'node_modules','.git','.next','runtime','exports','private-media','backups','.sites-source','.sites-runtime'}
files = {}
for name in filter(None, tracked):
    p = Path(name)
    include = (name in {'README.md','.gitignore','.gitattributes','package.json','package-lock.json','.openai/hosting.json','.openai/test-site.json','.openai/t4-snapshot-allowlist.json'}
               or ('/' not in name and name.endswith(('.md','.cmd')))
               or name.startswith(('apps/','packages/','scripts/','assets/','design/','docs/')))
    if not include: continue
    if any(part in forbidden or part == 'dist' for part in p.parts):
        raise RuntimeError('Unexpected tracked runtime path: '+name)
    if p.name.startswith('.env') and p.name != '.env.example':
        raise RuntimeError('Private environment path tracked')
    files[name] = root/name

# Include exactly the static output verified against the published source.
static = json.loads((receipt_dir/'source-match.json').read_text(encoding='utf8'))['staticFiles']
for item in static:
    name = 'dist/'+item['path']
    file = root/name
    if hashlib.sha256(file.read_bytes()).hexdigest() != item['sha256']:
        raise RuntimeError('Static output changed after deployment: '+name)
    files[name] = file
files['发布来源映射.json'] = root/'.sites-source/.openai/source-provenance.json'
video = root/'exports/之青-R4-离线审片-2026-11-02.mp4'
video_info = json.loads((root/'docs/verification-intro-r4/offline-render.json').read_text(encoding='utf8'))['video']
if hashlib.sha256(video.read_bytes()).hexdigest() != video_info['sha256']:
    raise RuntimeError('R4 review video changed')
files['审片资料/'+video.name] = video

# Read known local values only for absence assertions; never serialize them.
configs = []
for file in (root/'runtime').rglob('secrets.json'):
    configs.append(json.loads(file.read_text(encoding='utf-8-sig')))
secrets = []
for config in configs:
    secrets += [config.get(key,'') for key in ('databaseURL','adminDatabaseURL','payloadSecret','ownerPassword','pgPassword')]
    secrets += [unquote(urlparse(config[key]).password or '') for key in ('databaseURL','adminDatabaseURL') if config.get(key)]
secrets = [value.encode() for value in set(secrets) if isinstance(value,str) and len(value)>=8]

manifest = {'stage':'T5 / R4 opening','deliveryRecordCommit':head,
            'applicationCommit':release['applicationCommit'],'sites':release['sites'],
            'snapshot':release['contentSnapshot'],'animation':release['animation'],
            'sourceProvenanceScope':'发布来源映射.json对应发布输入；交付README/报告补入平台回执。代码和dist不变，文档差异见docs/verification-t5-r4/delivery-source-differences.json。',
            'instructions':'先读docs/T5-R4部署与新包说明.md。dist可部署静态前台；真实后台需按交接改造、配置和迁移，私有数据另行导出。',
            'contents':'Tracked source, SQL, nonsecret templates, requirements, reports, original art/prompts, frozen history, verified published dist and offline review video. No live DB/private media/credentials/dependencies.',
            'files':[]}
outdir.mkdir(exist_ok=True)
output = outdir/'世纪末之青-T5-R4完整部署交接-2026-11-02.zip'
if output.exists(): raise RuntimeError('Preserve old archive; use a new revision name')
prefix = 'zhiqing-self-t5-r4/'
with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,file in sorted(files.items()):
        data = file.read_bytes()
        if any(secret in data for secret in secrets):
            raise RuntimeError('Private value found in '+name)
        manifest['files'].append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        archive.writestr(prefix+name,data)
    archive.writestr(prefix+'交付版本与校验.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for item in manifest['files']:
        assert hashlib.sha256(archive.read(prefix+item['path'])).hexdigest() == item['sha256']
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.sha256.txt').write_text(digest+'  '+output.name+'\n',encoding='utf8')
receipt = {'archive':str(output),'bytes':output.stat().st_size,'files':len(manifest['files'])+1,
           'sha256':digest,'deliveryRecordCommit':head,'applicationCommit':release['applicationCommit'],
           'sitesVersion':release['sites']['versionNumber'],'crcAndAllFileHashesVerified':True,
           'privateConfigScanCount':len(configs),'staticFiles':len(static)}
(receipt_dir/'delivery-archive.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(receipt,ensure_ascii=True))
