'use client';
import { useEffect, useRef, useState } from 'react';
import { introSessionBoot } from './intro-session';
import { introScene as scene } from './intro-scene';
import { createIntroRenderer, type IntroFrame } from './intro-renderer-r4';

const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b), over34Count = values.filter(n => n > 34).length;
  return { samples: values.length, p95Ms: sorted[Math.floor(sorted.length * .95)] ?? null,
    medianMs: sorted[Math.floor(sorted.length * .5)] ?? null, maxMs: sorted.at(-1) ?? null,
    over34Count, over34Ratio: values.length ? over34Count / values.length : 0, over100Count: values.filter(n => n >= 100).length };
};
export function Intro({ name }: { name: string }) {
  const dialog = useRef<HTMLDialogElement>(null), canvas = useRef<HTMLCanvasElement>(null), skip = useRef<HTMLButtonElement>(null);
  const startAction = useRef<() => void>(() => {});
  const [phase, setPhase] = useState('waiting');
  useEffect(() => {
    introSessionBoot({ enabled: scene.enabled, watchdogMs: scene.watchdogMs, storyWatchdogMs: scene.storyWatchdogMs });
    let cancelled = false, started = false, settled = false, written = false, raf = 0, start = 0, setupMs = 0;
    let readyAt: number | null = null, storyStart: number | null = null, renderer: ReturnType<typeof createIntroRenderer> | undefined;
    const timers: number[] = [], movement: number[] = [], waiting: number[] = [], stages: Record<string, number[]> = {};
    let environment: Record<string, unknown> | undefined;
    const viewportChanges: { atMs: number; width: number; height: number; dpr: number }[] = [];
    const focusContent = () => document.getElementById('main')?.focus({ preventScroll: true });
    const stop = () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
      renderer?.dispose(); renderer = undefined; startAction.current = () => {};
    };
    const record = (reason: string) => {
      if (written || !environment || !dialog.current) return;
      written = true; const now = performance.now(), all = summarize(movement);
      dialog.current.dataset.introMetrics = JSON.stringify({
        scene: scene.id, reason, elapsedMs: Math.round(now - start), setupMs,
        fixedDurationMs: scene.finishAtMs, storyElapsedMs: storyStart === null ? 0 : Math.round(now - storyStart),
        waitMs: readyAt === null ? 0 : Math.max(0, Math.round((storyStart ?? now) - readyAt)),
        startActivated: storyStart !== null,
        environment: { ...environment, visibilityAtEnd: document.visibilityState,
          widthAtEnd: window.innerWidth, heightAtEnd: window.innerHeight, dprAtEnd: window.devicePixelRatio },
        viewportChanges,
        movement: { all, stages: Object.fromEntries(Object.entries(stages).map(([key, values]) => [key, summarize(values)])) },
        awaitingStart: summarize(waiting),
        estimatedCadenceHz: all.medianMs ? Math.round(10000 / all.medianMs) / 10 : null, displayRefreshHz: null,
        rafBudgetMet: reason === 'completed' && environment.visibility === 'visible' && document.visibilityState === 'visible' &&
          all.samples >= 30 && all.p95Ms !== null && all.p95Ms <= 20 && all.over34Ratio <= .01 && all.over100Count === 0,
        note: 'Moving animation callbacks only; waiting callbacks separate. Neither rAF nor offline rendering proves presented FPS.',
      });
    };
    const finish = (reason: string) => {
      record(reason); stop(); window.__zhiqingIntro?.finish(reason); focusContent();
    };
    const resize = () => {
      try {
        renderer?.resize();
        if (environment) viewportChanges.push({ atMs: Math.round(performance.now() - start),
          width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio });
      } catch { finish('render-failed'); }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden' && started && window.__zhiqingIntro?.state === 'play') finish('visibility-hidden');
    };
    const sync = () => {
      if (cancelled) return;
      if (window.__zhiqingIntro?.state !== 'play') {
        record(window.__zhiqingIntro?.reason || 'external-end'); stop(); dialog.current?.close();
        if (started && document.visibilityState !== 'hidden') focusContent(); return;
      }
      if (started || !dialog.current) return;
      started = true; setPhase('waiting');
      try { dialog.current.showModal(); } catch { finish('dialog-unavailable'); return; }
      delete document.documentElement.dataset.zhiqingIntro;
      const images = [scene.portrait, ...scene.pages.map(p => p.image)].map(src => { const image = new Image(); image.src = src; return image; });
      const text = [name, scene.startLabel, ...scene.pages.flatMap(p => [p.title, p.text])].join('');
      Promise.all([...images.map(image => image.decode()),
        document.fonts?.load('38px Fusion', text) ?? Promise.resolve(),
        document.fonts?.load('26px Noto', text) ?? Promise.resolve()])
        .then(() => {
          if (cancelled || settled || window.__zhiqingIntro?.state !== 'play') return;
          if (!canvas.current || images.some(image => !image.naturalWidth || !image.naturalHeight)) { finish('image-failed'); return; }
          try {
            const beforeSetup = performance.now();
            renderer = createIntroRenderer(canvas.current, images[0], images.slice(1), name);
            renderer.draw(0, null); setupMs = performance.now() - beforeSetup;
            settled = true; start = performance.now();
            environment = { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio,
              rendererMaxDpr: scene.maxDpr, userAgent: navigator.userAgent,
              screenWidth: window.screen?.width ?? null, screenHeight: window.screen?.height ?? null, visibility: document.visibilityState };
            setPhase('running'); window.__zhiqingIntro?.setPlaybackPhase?.('notes');
            window.addEventListener('resize', resize);
            startAction.current = () => {
              if (cancelled || !renderer || readyAt === null || storyStart !== null || window.__zhiqingIntro?.state !== 'play') return;
              const now = performance.now();
              try { renderer.startStory(now - start); } catch { finish('render-failed'); return; }
              storyStart = now; window.__zhiqingIntro?.setPlaybackPhase?.('story'); setPhase('story');
              skip.current?.focus({ preventScroll: true });
            };
            let previous: IntroFrame | undefined, last = start, leaving = false;
            const tick = (now: number) => {
              if (cancelled || window.__zhiqingIntro?.state !== 'play') return;
              try {
                const introMs = now - start, storyMs = storyStart === null ? null : now - storyStart;
                const state = renderer!.draw(introMs, storyMs), dt = now - last;
                if (previous?.moving && state.moving && previous.stage === state.stage && dt > 0) {
                  if (state.stage === 'awaiting-start') waiting.push(dt);
                  else { movement.push(dt); (stages[state.stage] ||= []).push(dt); }
                }
                last = now; previous = state;
                if (canvas.current) canvas.current.dataset.stage = state.stage;
                if (storyStart === null && readyAt === null && introMs >= scene.readyAtMs) {
                  readyAt = now; setPhase('awaiting-start'); window.__zhiqingIntro?.setPlaybackPhase?.('awaiting-start');
                }
                if (!leaving && storyMs !== null && storyMs >= scene.timings.leaveAtMs) { leaving = true; setPhase('leaving'); }
                if (storyMs !== null && storyMs >= scene.storyDurationMs) { finish('completed'); return; }
                raf = requestAnimationFrame(tick);
              } catch { finish('render-failed'); }
            };
            raf = requestAnimationFrame(tick);
          } catch { finish('render-failed'); }
        }).catch(() => { if (!cancelled && window.__zhiqingIntro?.state === 'play') finish('image-failed'); });
      timers.push(window.setTimeout(() => {
        if (!settled && !cancelled && window.__zhiqingIntro?.state === 'play') finish('image-timeout');
      }, scene.assetTimeoutMs));
    };
    window.addEventListener('zhiqing-intro-change', sync); document.addEventListener('visibilitychange', visibility); sync();
    return () => {
      cancelled = true; stop(); timers.forEach(clearTimeout); dialog.current?.close();
      window.removeEventListener('zhiqing-intro-change', sync); document.removeEventListener('visibilitychange', visibility);
    };
  }, [name]);
  const dismiss = (reason: string) => { window.__zhiqingIntro?.finish(reason); document.getElementById('main')?.focus({ preventScroll: true }); };
  return <dialog ref={dialog} data-intro-dialog="" data-intro-scene={scene.id} data-phase={phase}
    className="intro-gate" aria-labelledby="intro-title" onCancel={event => { event.preventDefault(); dismiss('escape'); }}>
    <canvas ref={canvas} className="intro-canvas" width={1} height={1} aria-hidden="true" />
    <h2 id="intro-title" className="intro-accessible-title">{name}</h2>
    <div className="intro-topline"><button ref={skip} type="button" autoFocus className="outline-button" onClick={() => dismiss('skip')}>{scene.skipLabel}</button></div>
    <button type="button" className="intro-start" hidden={phase !== 'awaiting-start'} onClick={() => startAction.current()}>{scene.startLabel}</button>
  </dialog>;
}
