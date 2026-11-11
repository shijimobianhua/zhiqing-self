// Local review entry only. Not imported by the normal Vite/Next build or Sites.
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SiteLayout, RouteView} from '@zhiqing/ui';
import {siteData, works, notes} from '@zhiqing/adapters';
import {introScene} from '../packages/ui/src/intro-scene';
import '@zhiqing/design/fonts.css';
import '@zhiqing/design/style.css';
import '@zhiqing/design/pages.css';
import '@zhiqing/design/interactions.css';
import '@zhiqing/design/notes.css';
import '@zhiqing/design/critical-font.css';
import '@zhiqing/design/content.css';
import '@zhiqing/design/intro.css';

type IntervalStats = {
  samples?: number;
  p95Ms?: number | null;
  maxMs?: number | null;
  over34Count?: number;
  over34Ratio?: number;
  over100Count?: number;
};
type IntroMetrics = {
  scene?: string;
  elapsedMs?: number;
  environment?: {
    width?: number;
    height?: number;
    dpr?: number;
    userAgent?: string;
    visibility?: string;
    [key: string]: unknown;
  };
  movement?: {all?: IntervalStats; stages?: Record<string, IntervalStats>};
  [key: string]: unknown;
};
type ReviewRecord = {
  schemaVersion: 1;
  lab: 'intro-r3';
  recordedAt: string;
  trigger: 'automatic' | 'manual';
  finishReason: string;
  labOverrides: {narrowOrTouchWindow: boolean; reducedMotionExplicitReplay: boolean};
  metrics: IntroMetrics | null;
  note: string;
};
const desktopQuery = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
const durationLabel = Number((introScene.finishAtMs / 1000).toFixed(2)).toString();
function currentConditions() {
  return {
    desktop: window.matchMedia(desktopQuery).matches,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
function number(value: unknown, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '未记录';
}
const stageLabels: Record<string, string> = {
  notes: '便笺', stack: '叠层便笺', morph: '解构与重组', reassemble: '解构与重组', handbook: '手账', signature: '站名显现', hold: '定格', complete: '结束',
  book: '手账', page: '书页展开', portrait: '之青显现', exit: '进入正文',
};
function StatsRow({label, stats}: {label: string; stats: IntervalStats}) {
  return <tr><th scope="row">{label}</th><td>{stats.samples ?? '未记录'}</td>
    <td>{number(stats.p95Ms)} ms</td><td>{number(stats.maxMs)} ms</td>
    <td>{typeof stats.over34Ratio === 'number' ? number(stats.over34Ratio * 100) + '%' : '未记录'}</td>
    <td>{stats.over100Count ?? '未记录'}</td></tr>;
}
function Results({record}: {record: ReviewRecord}) {
  const metrics = record.metrics;
  const reasonLabels: Record<string, string> = {
    completed: '完整播放结束', skip: '已跳过', escape: 'Esc退出',
    watchdog: '超时保护退出', 'image-failed': '角色素材加载失败',
    'image-timeout': '角色素材加载超时', 'dialog-unavailable': '浏览器对话框不可用', 'render-failed': '场景绘制失败', 'visibility-hidden': '页面转入后台，已结束本次播放',
  };
  return <details className="r3-review-results"><summary>本次播放记录：{reasonLabels[record.finishReason] ?? record.finishReason}</summary>
    {metrics ? <>
      <p>时长 {number(metrics.elapsedMs, 0)} ms；窗口 {metrics.environment?.width ?? '未记录'} × {metrics.environment?.height ?? '未记录'}；DPR {number(metrics.environment?.dpr)}；页面状态 {metrics.environment?.visibility ?? '未记录'}。</p>
      {typeof metrics.setupMs === 'number' && <p>素材与场景准备 {number(metrics.setupMs)} ms（不计入{durationLabel}秒场景时长）。</p>}
      {typeof metrics.estimatedCadenceHz === 'number' && <p>本次rAF采样推算约 {number(metrics.estimatedCadenceHz)} Hz；显示器真实刷新率未从系统读取。</p>}
      {metrics.movement && <div className="r3-review-table"><table><thead><tr><th>运动阶段</th><th>采样</th><th>P95间隔</th><th>最长间隔</th><th>超过34ms</th><th>超过100ms</th></tr></thead><tbody>
        {metrics.movement.all && <StatsRow label="全部运动段" stats={metrics.movement.all}/>}
        {Object.entries(metrics.movement.stages ?? {}).map(([name, stats]) => <StatsRow key={name} label={stageLabels[name] ?? name} stats={stats}/>)}
      </tbody></table></div>}
      <p>验收参考：运动段P95≤20ms、超过34ms的间隔≤1%、超过100ms为0。rAF记录表示回调节奏，不能单独证明实际屏幕呈现或动作自然度。</p>
    </> : <p>本次未形成完整采样记录，不据此判断帧率。</p>}
    {(record.labOverrides.narrowOrTouchWindow || record.labOverrides.reducedMotionExplicitReplay) && <p>本次为审片台主动试播，使用了窄窗/偏好覆盖；不能当作正常网站桌面条件或减少动态效果测试。</p>}
    <details><summary>原始JSON</summary><pre>{JSON.stringify(record, null, 2)}</pre></details>
  </details>;
}
function Lab() {
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [record, setRecord] = useState<ReviewRecord | null>(null);
  const [conditions, setConditions] = useState(currentConditions);
  const attemptedAutoplay = useRef(false);
  const watchdog = useRef<number | undefined>(undefined);
  const play = useCallback((trigger: 'automatic' | 'manual') => {
    window.clearTimeout(watchdog.current);
    const conditionsAtStart = currentConditions();
    // The dedicated lab path is excluded by the real visit bootstrap. This
    // controller belongs only to this lab; no production replay flag is added.
    window.__zhiqingIntro = {
      state: 'play', reason: '', startedAt: performance.now(),
      finish(reason: string) {
        if (this.state === 'done') return;
        this.state = 'done'; this.reason = reason;
        window.clearTimeout(watchdog.current);
        const dialog = document.querySelector<HTMLDialogElement>('dialog[data-intro-dialog]');
        dialog?.close();
        window.dispatchEvent(new Event('zhiqing-intro-change'));
        let metrics: IntroMetrics | null = null;
        try { if (dialog?.dataset.introMetrics) metrics = JSON.parse(dialog.dataset.introMetrics); } catch { /* Record a missing sample instead of failing the review. */ }
        setRecord({schemaVersion: 1, lab: 'intro-r3', recordedAt: new Date().toISOString(), trigger,
          finishReason: reason,
          labOverrides: {narrowOrTouchWindow: !conditionsAtStart.desktop, reducedMotionExplicitReplay: conditionsAtStart.reduced},
          metrics, note: 'Local review only; rAF timing is not a visual-pass or actual-presentation guarantee.'});
        setPlaying(false);
      },
    };
    const owned = window.__zhiqingIntro;
    watchdog.current = window.setTimeout(() => {
      if (window.__zhiqingIntro === owned && owned.state === 'play') owned.finish('watchdog');
    }, introScene.watchdogMs);
    setRecord(null); setPlaying(true); setRun(n => n + 1);
  }, []);
  useEffect(() => {
    const desktop = window.matchMedia(desktopQuery);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setConditions(currentConditions());
    desktop.addEventListener('change', update); reduced.addEventListener('change', update);
    window.addEventListener('resize', update);
    if (!attemptedAutoplay.current) {
      attemptedAutoplay.current = true;
      if (desktop.matches && !reduced.matches) play('automatic');
    }
    return () => {
      desktop.removeEventListener('change', update); reduced.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      // Keep an in-flight visit during StrictMode effect replay. Its controller
      // owns its finite watchdog and the shared Intro owns drawing cleanup.
    };
  }, [play]);
  const download = () => {
    if (!record) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'zhiqing-intro-r3-' + record.recordedAt.replace(/[:.]/g, '-') + '.json';
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    <SiteLayout key={run} pathname="/" data={siteData} hasNotes={notes.length > 0}><RouteView pathname="/" data={siteData} works={works} notes={notes}/></SiteLayout>
    {!playing && <aside className="r3-review-panel" aria-label="R3本机审片控制">
      <strong>R3 本机审片台 · 未发布</strong>
      <p>{durationLabel}秒便笺与手账开场，结尾为原版抱拳图。符合桌面条件且未开启减少动态效果时，首次进入会自动播放一次。</p>
      {(!conditions.desktop || conditions.reduced) && <p className="r3-review-hint">当前窗口 {conditions.width} × {conditions.height}。{!conditions.desktop ? '正常网站要求宽度至少1024px、鼠标精确指针与悬停条件。' : ''}{conditions.reduced ? '系统已开启减少动态效果，本页未自动播放。' : ''} 可点击按钮主动审片；此覆盖仅限审片台，正常网站规则不变。</p>}
      <div className="r3-review-actions"><button type="button" className="outline-button" onClick={() => play('manual')}>{record ? '重播完整开场 R3' : '播放完整开场 R3'}</button>
        <button type="button" className="outline-button" disabled={!record} onClick={download}>下载本次JSON记录</button></div>
      {record && <Results record={record}/>}
      <p className="r3-review-small">正常访问规则测试：<a href="/">本机网站入口</a>。审片台不登记为存活网站页面，也不自动通过视觉或帧率验收。</p>
    </aside>}
  </>;
}
document.documentElement.dataset.introLab = 'r3';
window.__zhiqingIntro = {state: 'done', reason: 'lab-idle', startedAt: 0, finish() {}};
createRoot(document.getElementById('root')!).render(<React.StrictMode><Lab/></React.StrictMode>);
