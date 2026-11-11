// Self-contained: serialized into both HTML heads. Live Web Locks coordinate
// tabs; no durable "visited" cookie or expiring heartbeat substitutes for closure.
import { introScene } from './intro-scene';
export function introSessionBoot(options: { enabled?: boolean; watchdogMs?: number; storyWatchdogMs?: number } = {}) {
  if (window.__zhiqingIntro) return;
  const html = document.documentElement;
  const route = location.pathname.replace(/\/$/, '') || '/';
  if (!/^\/$|^\/about$|^\/(works|notes)(\/[^/]+)?$/.test(route)) return;
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let watchdog: number | undefined;
  const controller = window.__zhiqingIntro = {
    state: 'checking', reason: '', startedAt: 0, playbackPhase: 'loading',
    setPlaybackPhase(phase: string) {
      if (controller.state !== 'play' || controller.playbackPhase === phase) return;
      controller.playbackPhase = phase;
      if (phase === 'awaiting-start') clearTimeout(watchdog);
      if (phase === 'story') {
        clearTimeout(watchdog);
        watchdog = window.setTimeout(() => controller.finish('watchdog'), options.storyWatchdogMs ?? 18000);
      }
    },
    finish(reason: string) {
      clearTimeout(watchdog);
      controller.state = 'done'; controller.reason = reason;
      delete html.dataset.zhiqingIntro;
      const dialog = document.querySelector<HTMLDialogElement>('dialog[data-intro-dialog]');
      if (dialog?.open) dialog.close();
      window.dispatchEvent(new Event('zhiqing-intro-change'));
    },
  };
  let seen = false;
  try { seen = sessionStorage.getItem('zhiqing-intro-seen-v1') === '1'; }
  catch { controller.finish('storage-unavailable'); return; }
  if (!navigator.locks?.request || !navigator.locks.query) {
    controller.finish('coordination-unavailable'); return;
  }
  const eligible = options.enabled !== false && desktop.matches && !reduced.matches && !seen;
  if (eligible) html.dataset.zhiqingIntro = 'pending';
  watchdog = window.setTimeout(() => controller.finish('watchdog'), options.watchdogMs ?? 5500);
  let release: (() => void) | undefined;
  let registration = 0;
  async function register(mayPlay: boolean) {
    const generation = ++registration;
    try {
      await navigator.locks.request('zhiqing-intro-coordinator-v1', async () => {
        if (generation !== registration) return;
        const locks = await navigator.locks.query();
        const anotherPage = locks.held?.some(lock => lock.name === 'zhiqing-intro-open-page-v1') === true;
        let registered!: () => void;
        const ready = new Promise<void>(resolve => { registered = resolve; });
        // Register while the decision lock is held, so simultaneous fresh tabs
        // cannot both claim the opening. All pages hold compatible shared locks.
        void navigator.locks.request('zhiqing-intro-open-page-v1', { mode: 'shared' }, () => {
          registered();
          if (generation !== registration) return;
          return new Promise<void>(resolve => { release = resolve; });
        }).catch(() => { registered(); controller.finish('registration-failed'); });
        await ready;
        if (generation !== registration || controller.state === 'done') return;
        sessionStorage.setItem('zhiqing-intro-seen-v1', '1');
        if (mayPlay && !anotherPage && desktop.matches && !reduced.matches) {
          controller.state = 'play'; controller.startedAt = performance.now();
          window.dispatchEvent(new Event('zhiqing-intro-change'));
        } else {
          clearTimeout(watchdog);
          controller.finish(anotherPage ? 'another-page-open' : 'return-or-preference');
        }
      });
    } catch { controller.finish('coordination-failed'); }
  }
  void register(eligible);
  window.addEventListener('pagehide', () => {
    ++registration; release?.(); release = undefined;
    clearTimeout(watchdog); controller.finish('page-hidden');
  });
  window.addEventListener('pageshow', event => { if (event.persisted) void register(false); });
  const preferenceChanged = () => {
    if (!desktop.matches || reduced.matches) controller.finish('preference-changed');
  };
  desktop.addEventListener('change', preferenceChanged);
  reduced.addEventListener('change', preferenceChanged);
}
export const introBootstrap = `;(${introSessionBoot.toString()})(${JSON.stringify({enabled:introScene.enabled,watchdogMs:introScene.watchdogMs,storyWatchdogMs:introScene.storyWatchdogMs})});`;
export const introPrepaintCSS = 'html[data-zhiqing-intro="pending"] body::before{content:"";position:fixed;inset:0;background:#faf8f3;z-index:9998;pointer-events:none}';
declare global {
  interface Window {
    __zhiqingIntro?: { state: string; reason: string; startedAt: number; playbackPhase?: string; setPlaybackPhase?: (phase: string) => void; finish: (reason: string) => void };
  }
}
