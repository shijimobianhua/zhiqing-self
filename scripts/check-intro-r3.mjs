// R3: exercise the serialized build bootstrap and verify the unchanged original
// portrait. Mocked preferences/locks are unit inputs, not actual browser evidence.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { introScene } from '../packages/ui/src/intro-scene.ts';

const root = path.resolve(import.meta.dirname, '..');
assert(/^notes-handbook-r3(?:-\d+)?$/.test(introScene.id), 'This check supports the R3 scene family');
// A revised candidate never overwrites an earlier R3 revision's evidence.
const reportDir = path.join(root, 'docs', `verification-intro-${introScene.id.replace('notes-handbook-', '')}`);
const baseline = '414df8b'; // Delivered R2 source; its original portrait is unchanged from T5.
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const source = html.match(/<script>(;\([\s\S]+?)<\/script>/)?.[1];
assert(source, 'Build must contain the actual serialized prepaint bootstrap');
assert(html.includes(`data-intro-scene="${introScene.id}"`), 'Build is stale or lacks the R3 shared component');
assert(Number.isFinite(introScene.finishAtMs) && introScene.finishAtMs > 0, 'Scene duration must be finite and positive');
assert.equal(introScene.leaveAtMs, introScene.timings.leaveAtMs);
const t = introScene.timings;
assert(0 < t.assembleAtMs && t.assembleAtMs < t.bookAtMs && t.bookAtMs < t.pageAtMs);
assert(t.pageAtMs < t.portraitAtMs && t.portraitAtMs < t.portraitReadyAtMs);
assert(t.portraitReadyAtMs <= t.nameAtMs && t.nameAtMs < t.leaveAtMs && t.leaveAtMs < introScene.finishAtMs);
assert(introScene.finishAtMs + introScene.assetTimeoutMs < introScene.watchdogMs,
  'Watchdog must leave room for the entire scene plus the asset budget');
assert.equal(introScene.portrait, '/assets/character-avatar.webp');
assert.equal(introScene.sourceFile, 'apps/preview/public/assets/character-avatar.png');
assert(!JSON.stringify(introScene).includes('intro-salute-r2'), 'Active scene must not use the R2 pose atlas');
new vm.Script(source);
for (const key of ['zhiqing-intro-seen-v1', 'zhiqing-intro-coordinator-v1', 'zhiqing-intro-open-page-v1']) {
  assert(source.includes(key), 'Visit keys must remain independent of scene revisions');
}
const sessionPath = 'packages/ui/src/intro-session.ts';
const oldSession = execFileSync('git', ['show', `${baseline}:${sessionPath}`], { cwd: root, encoding: 'utf8' });
assert.equal(fs.readFileSync(path.join(root, sessionPath), 'utf8').replaceAll('\r\n', '\n'), oldSession.replaceAll('\r\n', '\n'),
  'R3 must preserve the delivered visit coordination module');

async function execute(options = {}) {
  const dataset = {}, timers = new Map();
  let timerId = 0;
  const context = {
    document: { documentElement: { dataset }, querySelector: () => null },
    location: { pathname: options.route ?? '/' }, Event,
    performance: { now: () => 1 }, clearTimeout: id => timers.delete(id),
    sessionStorage: {
      getItem() { if (options.storageBlocked) throw Error('Blocked'); return options.seen ? '1' : null; },
      setItem() {},
    },
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? !!options.reduced : options.desktop !== false, addEventListener() {} }),
    navigator: { locks: options.noLocks ? undefined : {
      query: async () => { if (options.queryFailed) throw Error('Unavailable'); return { held: options.otherPage ? [{ name: 'zhiqing-intro-open-page-v1' }] : [] }; },
      request(name, arg, fn) { const callback = typeof arg === 'function' ? arg : fn; return Promise.resolve().then(() => callback({ name })); },
    } },
  };
  context.window = { setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, dispatchEvent() {}, addEventListener() {} };
  vm.runInNewContext(source, context);
  for (let i = 0; i < 24; i++) await Promise.resolve();
  return { controller: context.window.__zhiqingIntro, dataset, timers };
}
const checks = [];
for (const [name, options, expected] of [
  ['first eligible visit', {}, introScene.enabled ? 'play' : 'done'],
  ['other live page suppresses opening', { otherPage: true }, 'done'],
  ['same tab already viewed', { seen: true }, 'done'],
  ['narrow or touch-like desktop query does not match', { desktop: false }, 'done'],
  ['reduce motion', { reduced: true }, 'done'],
  ['storage denied', { storageBlocked: true }, 'done'],
  ['Web Locks unavailable', { noLocks: true }, 'done'],
  ['Web Locks query failure', { queryFailed: true }, 'done'],
  ['admin excluded', { route: '/admin' }, undefined],
  ['preview excluded', { route: '/preview/content/test' }, undefined],
]) {
  const result = await execute(options);
  assert.equal(result.controller?.state, expected, name);
  if (expected === 'done') assert.equal(result.dataset.zhiqingIntro, undefined, `${name} must expose content`);
  checks.push({ name, pass: true });
}
if (introScene.enabled) {
  const stalled = await execute();
  for (const callback of [...stalled.timers.values()]) callback();
  assert.equal(stalled.controller.state, 'done');
  assert.equal(stalled.controller.reason, 'watchdog');
  assert.equal(stalled.dataset.zhiqingIntro, undefined);
  checks.push({ name: 'stalled UI watchdog exposes content', pass: true });
}

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const sharp = require('sharp');
const originalPath = introScene.sourceFile;
const publishedPath = `apps/preview/public/${introScene.portrait.replace(/^\/+/, '')}`;
const original = fs.readFileSync(path.join(root, originalPath));
const published = fs.readFileSync(path.join(root, publishedPath));
for (const [file, bytes] of [[originalPath, original], [publishedPath, published]]) {
  const oldBytes = execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, maxBuffer: 20 * 1024 * 1024 });
  assert.equal(sha(bytes), sha(oldBytes), `Original portrait asset was modified: ${file}`);
}
const [sourceMetadata, publishedMetadata] = await Promise.all([sharp(original).metadata(), sharp(published).metadata()]);
assert.equal(sourceMetadata.width, 1254); assert.equal(sourceMetadata.height, 1254);
assert.equal(publishedMetadata.width, 1254); assert.equal(publishedMetadata.height, 1254);
const [sourcePixels, publishedPixels] = await Promise.all([
  sharp(original).ensureAlpha().raw().toBuffer(), sharp(published).ensureAlpha().raw().toBuffer(),
]);
assert(sourcePixels.equals(publishedPixels), 'Full original PNG and lossless WebP must decode to identical RGBA pixels');
const clientScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)]
  .map(match => match[1]).filter(file => file.startsWith('/assets/') && file.endsWith('.js'));
assert(clientScripts.length > 0, 'Build must reference its client entry');
for (const script of clientScripts) {
  const bytes = fs.readFileSync(path.join(root, 'dist', script.replace(/^\/+/, '')), 'utf8');
  assert(!bytes.includes('intro-salute-r2.webp'), 'Active client entry still references the rejected R2 pose atlas');
}

const report = {
  date: '2026-11-01', scene: { id: introScene.id, enabled: introScene.enabled, finishAtMs: introScene.finishAtMs },
  scope: 'Built serialized-bootstrap unit inputs and deterministic asset checks. Not real multi-tab, OS preference, rendering or FPS evidence.',
  baseline, checks, visitModuleUnchangedIgnoringEOL: true, clientScripts,
  asset: {
    original: originalPath, published: publishedPath, originalSha256: sha(original), publishedSha256: sha(published),
    publishedBytes: published.length, width: publishedMetadata.width, height: publishedMetadata.height,
    hasAlpha: publishedMetadata.hasAlpha === true, rgbaEqualToOriginal: true, unchangedFromBaseline: true,
    note: 'The full white-background original assets are retained unchanged. Canvas multiply compositing may suppress displayed white; this asset check does not verify that visual result. No redrawn face or pose atlas.',
  },
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'bootstrap-and-asset.json'), JSON.stringify(report, null, 2));
console.log(`PASS: ${checks.length} serialized bootstrap cases; original full portrait byte/pixel preservation; no active R2 atlas.`);
