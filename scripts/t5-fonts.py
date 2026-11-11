"""Reproducible full-cmap font partitioning. Originals and licenses remain intact."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import json, hashlib
root=Path(__file__).resolve().parents[1]
public=root/'apps/preview/public/fonts'
wanted=set(json.loads((root/'scripts/t5-font-codepoints.json').read_text(encoding='utf-8'))['codepoints'])
def ranges(points):
    result=[]
    for c in sorted(points):
        if result and c==result[-1][1]+1:result[-1][1]=c
        else:result.append([c,c])
    return ','.join(f'U+{a:X}' if a==b else f'U+{a:X}-{b:X}' for a,b in result)
def save(source,target,points):
    font=TTFont(source);options=subset.Options();options.recalc_timestamp=False
    job=subset.Subsetter(options=options);job.populate(unicodes=points);job.subset(font)
    for table in font['cmap'].tables:
        if table.isUnicode():table.cmap={c:g for c,g in table.cmap.items() if c in points}
    font.flavor='woff2';font.save(target);font.close()
    check=TTFont(target);actual=set(check.getBestCmap());check.close();assert actual==points,(target.name,sorted(points-actual),sorted(actual-points))
    return {'path':str(target.relative_to(root)).replace('\\','/'),'bytes':target.stat().st_size,'codepoints':len(points),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
css=[];report={'candidate':'T5-R1','allSourceCmapsPreserved':True,'files':[]}
source=public/'NotoSansSC-VF.ttf';font=TTFont(source);coverage=set(font.getBestCmap());font.close()
initial=wanted&coverage;groups=[('initial-v5',initial)]
remaining=coverage-initial
for block in sorted({c//256 for c in remaining}):groups.append((f'v5-{block:04x}',{c for c in remaining if c//256==block}))
out=public/'noto';out.mkdir(exist_ok=True);seen=set()
for name,points in groups:
    report['files'].append(save(source,out/(name+'.woff2'),points));assert not seen&points;seen|=points
    css.append(f"@font-face{{font-family:Noto;src:url('/fonts/noto/{name}.woff2') format('woff2');font-display:swap;font-weight:100 900;unicode-range:{ranges(points)}}}")
assert seen==coverage
# Remove only obsolete, known generated chunks after every new chunk has verified.
for old in out.glob('*.woff2'):
    if old.stem=='initial' or old.stem.startswith('block-'):old.unlink()
source=public/'fusion-pixel.woff2';font=TTFont(source);fusion=set(font.getBestCmap());font.close()
critical=wanted&fusion;report['files'].append(save(source,public/'fusion-critical-v5.woff2',critical))
# Original Fusion face in style.css remains as the complete fallback.
(root/'packages/design/fonts.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
# fonts.css is imported before style.css, so append critical face through a separate final import.
(root/'packages/design/critical-font.css').write_text(f"@font-face{{font-family:Fusion;src:url('/fonts/fusion-critical-v5.woff2') format('woff2');font-display:swap;font-weight:400;unicode-range:{ranges(critical)}}}\n",encoding='utf-8')
report.update(notoCodepoints=len(coverage),notoInitialCodepoints=len(initial),fusionSourceCodepoints=len(fusion),fusionCriticalCodepoints=len(critical),sourceNotoSha256=hashlib.sha256((public/'NotoSansSC-VF.ttf').read_bytes()).hexdigest(),sourceFusionSha256=hashlib.sha256(source.read_bytes()).hexdigest())
(root/'docs/verification-t5').mkdir(exist_ok=True)
(root/'docs/verification-t5/font-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
