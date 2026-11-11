// Exercise the real bundled R3 component's async lifecycle. React hooks,
// Canvas scene and clock are mocked; these numbers are NOT browser/GPU/FPS proof.
import { build } from 'esbuild';
import vm from 'node:vm';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { introScene } from '../packages/ui/src/intro-scene.ts';

const root = path.resolve(import.meta.dirname, '..');
assert(/^notes-handbook-r3(?:-\d+)?$/.test(introScene.id), 'This check supports the R3 scene family');
const compiled = (await build({
  absWorkingDir: root, entryPoints: ['packages/ui/src/Intro.tsx'], bundle: true,
  platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], write: false,
  plugins: [{ name: 'isolated-r3-scene', setup(builder) {
    builder.onResolve({ filter: /(?:^|\/)intro-renderer(?:\.ts)?$/ }, () => ({ path: 'scene', namespace: 'r3-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'r3-test' }, () => ({
      loader: 'js', contents: 'export function createIntroRenderer(canvas, portrait, name) { return globalThis.__r3Harness.create(canvas, portrait, name); }',
    }));
  } }],
})).outputFiles[0].text;

const flush = async () => { for (let i = 0; i < 24; i++) await Promise.resolve(); };
function setup(options = {}) {
  let clock = 0, rafId = 0, timerId = 0, dialog, button, canvas;
  const effects = [], cleanups = [], images = [], states = [], renderers = [], textNodes = [];
  const listeners = new Map(), documentListeners = new Map(), rafs = new Map(), timers = new Map();
  const add = (map, name, fn) => { const set = map.get(name) ?? new Set(); set.add(fn); map.set(name, set); };
  const remove = (map, name, fn) => map.get(name)?.delete(fn);
  const emit = (map, event) => { for (const fn of [...(map.get(event.type) ?? [])]) fn(event); };
  const main = { focused: false, focus() { this.focused = true; document.activeElement = this; } };
  let resolveFonts;
  const fontsPending = new Promise(resolve => { resolveFonts = resolve; });
  const document = {
    activeElement: null, documentElement: { dataset: {} }, visibilityState: 'visible', hidden: false,
    getElementById: () => main, querySelector: () => dialog,
    addEventListener: (name, fn) => add(documentListeners, name, fn),
    removeEventListener: (name, fn) => remove(documentListeners, name, fn),
    fonts: { load: () => options.delayFonts ? fontsPending : Promise.resolve([]), ready: Promise.resolve() },
  };
  const window = {
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    navigator: { userAgent: 'R3 lifecycle mock; not a real browser' },
    screen: { width: 1920, height: 1080 },
    setTimeout(fn, ms) { timers.set(++timerId, { fn, at: clock + ms }); return timerId; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, fn) => add(listeners, name, fn),
    removeEventListener: (name, fn) => remove(listeners, name, fn),
    dispatchEvent: event => emit(listeners, event),
    requestAnimationFrame(fn) { rafs.set(++rafId, fn); return rafId; },
    cancelAnimationFrame: id => rafs.delete(id),
  };
  const finishes = [];
  window.__zhiqingIntro = {
    state: options.alreadyDone ? 'done' : 'play', reason: options.alreadyDone ? 'another-page-open' : '', startedAt: 0,
    finish(reason) { finishes.push(reason); this.state = 'done'; this.reason = reason; dialog?.close(); window.dispatchEvent(new Event('zhiqing-intro-change')); },
  };
  const react = {
    useRef: () => ({ current: null }), useState: initial => [initial, value => states.push(value)],
    useEffect: fn => effects.push(fn), useLayoutEffect: fn => effects.push(fn),
  };
  function jsx(type, props) {
    const target = {
      type, props, dataset: {}, width: props.width ?? 1440, height: props.height ?? 900,
      contains: element => element === button,
      getBoundingClientRect: () => ({ width: 1440, height: 900, x: 0, y: 0, top: 0, left: 0, bottom: 900, right: 1440 }),
    };
    for (const child of [props.children].flat(Infinity)) if (typeof child === 'string') textNodes.push(child);
    if (type === 'canvas') { canvas = target; target.getContext = () => options.noContext ? null : {}; }
    if (type === 'button') button = target;
    if (type === 'dialog') {
      dialog = target; target.open = false;
      target.showModal = () => { if (options.noDialog) throw Error('unavailable'); target.open = true; document.activeElement = button; };
      target.close = () => { target.open = false; document.activeElement = null; };
    }
    if (typeof props.ref === 'function') props.ref(target); else if (props.ref) props.ref.current = target;
    return target;
  }
  class Image {
    constructor() {
      this.naturalWidth = options.invalidImage ? 0 : 1254; this.naturalHeight = options.invalidImage ? 0 : 1254;
      this.pending = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); images.push(this);
    }
    decode() { return this.pending; }
  }
  const harness = {
    create(element, portrait, name) {
      if (!element.getContext('2d')) throw Error('canvas-unavailable');
      const renderer = {
        name, portrait, draws: [], resizes: 0, disposed: false, disposeCount: 0,
        draw(ms) {
          assert(!this.disposed, 'Disposed renderer must not draw');
          if (options.drawThrowsAt !== undefined && ms >= options.drawThrowsAt) throw Error('intentional draw error');
          this.draws.push(ms);
          // Stage boundaries follow config. The renderer is still a stub: this
          // tests whether component metrics honor moving flags, not artwork.
          const t = introScene.timings;
          if (ms < 300) return { stage: 'test-prelude', moving: false };
          if (ms < t.assembleAtMs) return { stage: 'test-notes', moving: true };
          if (ms < t.bookAtMs) return { stage: 'test-reassemble', moving: true };
          if (ms < t.pageAtMs) return { stage: 'test-handbook', moving: false };
          if (ms < t.portraitAtMs) return { stage: 'test-page', moving: true };
          if (ms < t.portraitReadyAtMs) return { stage: 'test-portrait', moving: true };
          if (ms < t.nameReadyAtMs) return { stage: 'test-signature', moving: true };
          if (ms < t.leaveAtMs) return { stage: 'test-hold', moving: false };
          if (ms < introScene.finishAtMs) return { stage: 'test-exit', moving: true };
          return { stage: 'test-complete', moving: false };
        },
        resize() { assert(!this.disposed, 'Disposed renderer must not resize'); this.resizes++; },
        dispose() { this.disposed = true; this.disposeCount++; },
      };
      renderers.push(renderer); return renderer;
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: id => { if (id === 'react') return react; if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx }; throw Error(id); },
    window, document, Image, Event, location: { pathname: '/__unit-only' },
    navigator: window.navigator, screen: window.screen,
    performance: { now: () => clock }, __r3Harness: harness,
    requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
  });
  function mount() {
    module.exports.Intro({ name: '世纪末之青' });
    for (const effect of effects.splice(0)) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
  }
  function cleanup() { for (const fn of cleanups.splice(0)) fn(); }
  function step(ms) {
    clock = ms;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    for (const [id, fn] of [...rafs]) { rafs.delete(id); fn(clock); }
  }
  mount();
  return {
    window, document, main, images, states, renderers, rafs, timers, finishes, textNodes,
    step, mount, cleanup, resolveFonts, listenerCount: name => listeners.get(name)?.size ?? 0,
    get dialog() { return dialog; }, get button() { return button; }, get canvas() { return canvas; },
  };
}
const runToEnd = state => { for (let ms = 1000 / 60; ms < introScene.finishAtMs + 40; ms += 1000 / 60) state.step(ms); };
const checks = [];
function record(name) { checks.push({ name, pass: true }); }
function assertStopped(state) {
  assert.equal(state.rafs.size, 0, 'Finished scene must cancel pending frame callbacks');
  assert.equal(state.listenerCount('resize'), 0, 'Finished scene must release its resize listener');
  assert(state.renderers.every(renderer => renderer.disposed), 'Finished scene must release cached renderers');
}

{
  const state = setup(); state.images[0].resolve(); await flush(); runToEnd(state);
  assert.equal(state.window.__zhiqingIntro.reason, 'completed'); assert(!state.dialog.open); assert(state.main.focused);
  assertStopped(state);
  const metrics = JSON.parse(state.dialog.dataset.introMetrics);
  assert.equal(metrics.scene, introScene.id); assert(Math.abs(metrics.elapsedMs - introScene.finishAtMs) <= 35);
  assert(metrics.movement.all.samples > 0); assert(!metrics.movement.stages['test-hold'], 'Static hold must not be a movement stage');
  assert(!metrics.movement.stages['test-prelude'], 'Static prelude must not be a movement stage');
  assert(!metrics.movement.stages['test-handbook'], 'Steady handbook must not be a movement stage');
  assert.equal(metrics.environment.width, 1440); assert.equal(metrics.environment.height, 900);
  assert.equal(metrics.environment.dpr, 1); assert.equal(metrics.environment.visibility, 'visible');
  assert.deepEqual([...new Set(state.textNodes)].sort(), ['跳过开场', '世纪末之青'].sort());
  record('Finite scene completes on simulated clock, exposes per-movement metrics, closes modal, focuses content and releases resources');
}
{
  const state = setup(); state.button.props.onClick(); state.images[0].reject(Error('late decode error')); await flush(); state.step(2000);
  assert.equal(state.window.__zhiqingIntro.reason, 'skip'); assert.equal(state.renderers.length, 0); assert(state.main.focused); assertStopped(state);
  record('Skip during asset decode: late rejection/deadline cannot start rendering or overwrite skip');
}
{
  const state = setup(); let prevented = false;
  state.dialog.props.onCancel({ preventDefault() { prevented = true; } }); state.images[0].resolve(); await flush(); state.step(2000);
  assert(prevented); assert.equal(state.window.__zhiqingIntro.reason, 'escape'); assert.equal(state.renderers.length, 0); assertStopped(state);
  record('Escape during asset decode: late successful decode cannot start rendering');
}
for (const reason of ['skip', 'escape']) {
  const state = setup(); state.images[0].resolve(); await flush(); state.step(100);
  const renderer = state.renderers[0], count = renderer.draws.length;
  if (reason === 'skip') state.button.props.onClick(); else state.dialog.props.onCancel({ preventDefault() {} });
  state.step(2000); assert.equal(state.window.__zhiqingIntro.reason, reason);
  assert.equal(renderer.draws.length, count); assert(state.main.focused); assertStopped(state);
  record(`${reason} after rendering begins: no late frames and all scene resources released`);
}
{
  const state = setup(); state.images[0].reject(Error('failed')); await flush(); state.step(2000);
  assert.equal(state.window.__zhiqingIntro.reason, 'image-failed'); assert.equal(state.renderers.length, 0); assertStopped(state);
  record('Decode failure retains its cause after the loading deadline');
}
{
  const state = setup(); state.step(introScene.assetTimeoutMs + 1); state.images[0].resolve(); await flush(); state.step(4000);
  assert.equal(state.window.__zhiqingIntro.reason, 'image-timeout'); assert.equal(state.renderers.length, 0); assertStopped(state);
  record('Asset timeout: a late decode never restarts the scene');
}
{
  const state = setup({ delayFonts: true }); state.images[0].resolve(); await flush();
  state.step(introScene.assetTimeoutMs + 1); state.resolveFonts([]); await flush();
  assert.equal(state.window.__zhiqingIntro.reason, 'image-timeout'); assert.equal(state.renderers.length, 0); assertStopped(state);
  record('Font readiness shares the finite asset budget; late font completion cannot restart the scene');
}
{
  const state = setup({ invalidImage: true }); state.images[0].resolve(); await flush(); state.step(2000);
  assert.equal(state.window.__zhiqingIntro.state, 'done'); assert.notEqual(state.window.__zhiqingIntro.reason, 'completed');
  assert.equal(state.renderers.length, 0); assertStopped(state);
  record('Invalid decoded portrait dimensions fail open before renderer creation');
}
{
  const state = setup({ noContext: true }); state.images[0].resolve(); await flush(); state.step(2000);
  assert.equal(state.window.__zhiqingIntro.reason, 'render-failed'); assert(!state.dialog.open); assertStopped(state);
  record('Unavailable Canvas context fails open with render-failed');
}
{
  const state = setup({ drawThrowsAt: 100 }); state.images[0].resolve(); await flush(); state.step(150); state.step(2000);
  assert.equal(state.window.__zhiqingIntro.reason, 'render-failed'); assert(!state.dialog.open); assertStopped(state);
  record('Runtime drawing failure closes the scene and cancels future work');
}
{
  const state = setup({ noDialog: true });
  assert.equal(state.window.__zhiqingIntro.reason, 'dialog-unavailable'); assert.equal(state.images.length, 0); assertStopped(state);
  record('Unavailable native dialog fails open without fetching artwork');
}
{
  const state = setup({ alreadyDone: true }); assert.equal(state.images.length, 0); assert(!state.dialog.open);
  assert.equal(state.window.__zhiqingIntro.reason, 'another-page-open'); assertStopped(state);
  record('Already-suppressed visit creates no image request or renderer');
}
{
  const state = setup(); state.cleanup(); assert.equal(state.window.__zhiqingIntro.state, 'play');
  state.mount(); state.images[0].reject(Error('cancelled effect')); state.images[1].resolve(); await flush(); runToEnd(state);
  assert.equal(state.window.__zhiqingIntro.reason, 'completed'); assert.equal(state.renderers.length, 1); assertStopped(state);
  record('Effect cleanup/remount ignores stale decode without consuming the shared visit');
}
{
  const state = setup(); state.images[0].resolve(); await flush();
  const renderer = state.renderers[0], before = renderer.resizes;
  assert(state.listenerCount('resize') > 0); state.window.dispatchEvent(new Event('resize')); assert(renderer.resizes > before);
  state.window.__zhiqingIntro.finish('watchdog'); const after = renderer.resizes;
  state.window.dispatchEvent(new Event('resize')); state.step(4000);
  assert.equal(renderer.resizes, after); assert.equal(state.window.__zhiqingIntro.reason, 'watchdog'); assertStopped(state);
  record('Resize is active only during the scene; external watchdog cancels renderer and listeners');
}
{
  const state = setup(); state.images[0].resolve(); await flush(); state.step(100);
  state.document.visibilityState = 'hidden'; state.document.hidden = true;
  state.window.dispatchEvent(new Event('visibilitychange')); state.step(3000);
  assert.equal(state.window.__zhiqingIntro.reason, 'visibility-hidden'); assertStopped(state);
  const metrics = JSON.parse(state.dialog.dataset.introMetrics);
  assert.equal(metrics.environment.visibilityAtEnd, 'hidden'); assert.equal(metrics.rafBudgetMet, false);
  record('Backgrounded scene stops and cannot report a completed visible-window cadence pass');
}
{
  const state = setup(); state.images[0].resolve(); await flush();
  const holdStart = introScene.timings.nameReadyAtMs + 100, holdEnd = introScene.leaveAtMs - 200;
  assert(holdEnd > holdStart, 'Configured signature hold must permit a static-gap fixture');
  for (let ms = 1000 / 60; ms < holdStart; ms += 1000 / 60) state.step(ms);
  for (const ms of [holdStart, (holdStart + holdEnd) / 2, holdEnd]) state.step(ms);
  for (let ms = introScene.leaveAtMs; ms < introScene.finishAtMs + 40; ms += 1000 / 60) state.step(ms);
  const metrics = JSON.parse(state.dialog.dataset.introMetrics);
  assert.equal(metrics.movement.all.over100Count, 0, 'Injected static-hold delays must not contaminate movement statistics');
  assert(!metrics.movement.stages['test-hold']); assertStopped(state);
  record('Movement statistics exclude synthetic long static holds rather than diluting them into a whole-scene average');
}

// Revision-specific output preserves the first R3 candidate's records.
const reportDir = path.join(root, 'docs', `verification-intro-${introScene.id.replace('notes-handbook-', '')}`);
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'component-lifecycle.json'), JSON.stringify({
  date: '2026-11-01', scene: introScene.id,
  scope: 'Real bundled component with mocked hooks, native dialog, scene renderer and clock. No real browser, GPU, OS preference or FPS claims.',
  checks,
}, null, 2));
console.log(`PASS: ${checks.length} R3 component async/resource/metrics cases (simulated clock; not actual FPS).`);
