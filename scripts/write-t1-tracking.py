from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
source=(root/'世纪末之青-Codex开发执行文件-Sites测试版-V1.md').read_text(encoding='utf-8-sig')
table=source.split('## 7. 全范围需求追踪')[1].split('## 8.')[0]
rows=[line for line in table.splitlines() if line.startswith('|') and not line.startswith('| ---') and 'PRD V2编号' not in line]
out=['# 需求追踪矩阵','', '2026-10-27 · T1-R1。状态表示当前实现与验证范围；不是完整首版验收。','', '| 原编号 | 需求 | 阶段归属与环境 | 当前状态与证据 |', '| --- | --- | --- | --- |']
for line in rows:
    cols=[s.strip() for s in line.split('|')[1:-1]]
    key=cols[0]
    status='未实现或未测，按归属阶段保留，不抵扣 P0。'
    if key.startswith('FE-'): status='既有示例前台候选；T1仅作品共享，完整内容契约、异常及真实内容待T2/T4。'
    if key=='AC-13': status='既有作品返回逻辑保留；记录等价恢复待T2。'
    if key=='AC-20': status='共享大图源码已迁移；本轮浏览器结果见 verification-t0-t1。'
    if key=='AC-22': status='卡片/详情/按钮/大图/设计样式同一源码；双构建与来源映射见 verification-t0-t1。'
    if key in ['AC-23','AC-24']: status='T1受影响项验证中；Sites访问与产物扫描见本阶段记录。真实手机及远程后台未测。'
    if key in ['AC-21','AC-30']: status='本次不启用/不执行；原始完整要求保留在后续上线清单。'
    out.append('| '+' | '.join(cols+[status])+' |')
out+=['','FE/CMS分组逐项展开：','', '| 编号 | 当前状态 | 后续阶段 |', '| --- | --- | --- |']
for i in range(1,8): out.append(f'| FE-{i:02} | 示例前台候选，尚非真实内容完成 | T2模板；T4已发布数据 |')
for i in range(1,8): out.append(f'| CMS-{i:02} | 未实现；Payload配置仅骨架 | T3最小闭环；T4全站；T5回归 |')
(root/'docs/需求追踪矩阵.md').write_text('\n'.join(out)+'\n',encoding='utf-8')
