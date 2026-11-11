import { introScene as scene } from './intro-scene';

export type IntroFrame = { stage: string; moving: boolean };
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number; color: string };
const paper = '#faf8f3', leaf = '#faf7ee', ink = '#59473b', blue = '#496777', gold = '#c8a46b';
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const noise = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export function introFrameAt(introMs: number, storyMs: number | null): IntroFrame {
  if (storyMs === null) return { stage: introMs < scene.readyAtMs ? 'notes' : 'awaiting-start', moving: true };
  if (storyMs < scene.timings.assembleEndMs) return { stage: 'assemble', moving: true };
  if (storyMs < scene.timings.turnsAtMs[0]) return { stage: 'settle', moving: false };
  if (storyMs >= scene.storyDurationMs) return { stage: 'complete', moving: false };
  if (storyMs >= scene.timings.leaveAtMs) return { stage: 'exit', moving: true };
  let i = 0;
  for (let j = 1; j < scene.timings.turnsAtMs.length; j++) if (storyMs >= scene.timings.turnsAtMs[j]) i = j;
  return { stage: storyMs < scene.timings.turnsAtMs[i] + scene.timings.turnMs ? 'turn-' + (i + 1) : 'spread-' + (i + 1),
    moving: storyMs < scene.timings.turnsAtMs[i] + scene.timings.turnMs };
}

// Raster book, art and typography are cached once. Only particles / narrow page
// strips are projected per frame; no readback, font layout or DOM in the loop.
export function createIntroRenderer(canvas: HTMLCanvasElement, portrait: HTMLImageElement, illustrations: HTMLImageElement[], name = '世纪末之青') {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw Error('canvas-unavailable');
  const ctx = context, caches: HTMLCanvasElement[] = [];
  const surface = (w: number, h: number, paint: (g: Ctx) => void) => {
    const c = canvas.ownerDocument.createElement('canvas'); c.width = w; c.height = h; caches.push(c);
    const g = c.getContext('2d'); if (!g) throw Error('cache-unavailable');
    g.imageSmoothingEnabled = false; paint(g); return c;
  };
  const rect = (g: Ctx, x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  const panel = (g: Ctx, x: number, y: number, w: number, h: number, color: string, corner = 8) => {
    rect(g, x + corner, y, w - corner * 2, h, color);
    rect(g, x, y + corner, w, h - corner * 2, color);
    rect(g, x + corner / 2, y + corner / 2, w - corner, h - corner, color);
  };
  const note = (g: Ctx, x: number, y: number, color = '#edddb0', w = 44, h = 44) => {
    rect(g, x + 3, y + 4, w, h, '#d8cfb8'); rect(g, x, y, w, h, color);
    rect(g, x, y, w, 7, color === '#d8e3df' ? '#bfcec9' : '#ddc793');
    rect(g, x + w - 5, y + h - 3, 5, 3, '#c1b38c');
    rect(g, x + 9, y + 17, w - 18, 2, '#b2ab92'); rect(g, x + 9, y + 26, w - 24, 2, '#c0b89d');
  };
  const paperPage = () => surface(480, 560, g => {
    panel(g, 0, 0, 480, 560, '#c7b994', 14); panel(g, 2, 2, 476, 556, leaf, 14);
    // Quiet paper fibers and sewn corners, never random noise rebuilt per frame.
    for (let i = 0; i < 680; i++) rect(g, 16 + Math.floor(noise(i) * 448), 14 + Math.floor(noise(i + 900) * 532), 1 + i % 2, 1, '#eee8d8');
    for (let x = 22; x < 460; x += 12) { rect(g, x, 14, 5, 1, '#d7ccb4'); rect(g, x, 545, 5, 1, '#d7ccb4'); }
    for (let y = 24; y < 540; y += 12) { rect(g, 14, y, 1, 5, '#d7ccb4'); rect(g, 465, y, 1, 5, '#d7ccb4'); }
  });
  const basePage = paperPage();
  const fitImage = (g: Ctx, image: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const s = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const iw = Math.round(image.naturalWidth * s), ih = Math.round(image.naturalHeight * s);
    g.drawImage(image, Math.round(x + (w - iw) / 2), Math.round(y + (h - ih) / 2), iw, ih);
  };
  const motif = (g: Ctx, i: number) => {
    if (i === 0) {
      rect(g, 105, 341, 260, 4, '#bdc8bf'); rect(g, 239, 275, 4, 144, '#bdc8bf');
      note(g, 92, 291, '#edddb0', 66, 66); note(g, 213, 247, '#d8e3df', 66, 66); note(g, 316, 355, '#edddb0', 58, 58);
    } else if (i === 1) {
      panel(g, 100, 270, 272, 150, '#d6cab1', 8); panel(g, 104, 274, 264, 140, '#fffaf0', 6);
      rect(g, 123, 294, 72, 92, '#d5e0dc'); rect(g, 214, 294, 126, 8, gold);
      rect(g, 214, 320, 96, 4, '#b7c4bd'); rect(g, 214, 338, 114, 4, '#d8d0bc');
      rect(g, 214, 362, 47, 24, blue); rect(g, 274, 362, 66, 24, '#e9d5a6');
      rect(g, 82, 435, 64, 25, '#dec698'); rect(g, 91, 429, 56, 8, '#eee0bc');
    } else {
      panel(g, 120, 275, 232, 161, '#bba988', 6); rect(g, 124, 279, 108, 150, '#fffaf0'); rect(g, 236, 279, 112, 150, '#f2e8d2');
      rect(g, 232, 279, 4, 150, '#cebd9c');
      for (let y = 310; y < 407; y += 22) { rect(g, 139, y, 73, 3, '#b5bfb6'); rect(g, 253, y, 76, 3, '#c8b995'); }
      rect(g, 312, 275, 12, 39, blue); rect(g, 95, 292, 8, 123, ink); rect(g, 95, 405, 8, 14, gold);
    }
  };
  const makePage = (i: number, left: boolean) => surface(480, 560, g => {
    g.drawImage(basePage, 0, 0);
    if (i === 0) {
      // Decorative flyleaf: no fifth story, no extra copy.
      note(g, left ? 103 : 242, 150, '#edddb0', 84, 84);
      note(g, left ? 245 : 119, 281, '#d8e3df', 66, 66);
      rect(g, 93, 409, 288, 2, '#d9caa9'); rect(g, 93, 426, 203, 2, '#e0d6bf');
      return;
    }
    if (left) {
      if (i < 4) fitImage(g, illustrations[i - 1], 34, 39, 412, 470);
      else { g.save(); g.globalCompositeOperation = 'multiply'; fitImage(g, portrait, 40, 74, 400, 400); g.restore(); }
      if (i < 4) {
        rect(g, 39, 32, 73, 15, '#e9d9af'); rect(g, 362, 493, 74, 15, '#cddbd5');
      }
    } else if (i < 4) {
      const page = scene.pages[i - 1];
      rect(g, 61, 102, 46, 5, gold); rect(g, 113, 102, 16, 5, '#d7c393');
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '38px Fusion, Noto, sans-serif'; g.fillText(page.title, 240, 165);
      g.font = '26px Noto, sans-serif'; g.fillText(page.text, 240, 222);
      motif(g, i - 1);
    } else {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
      g.font = '42px Fusion, Noto, sans-serif'; g.fillText(name, 240, 267);
    }
  });
  const pages = Array.from({ length: 5 }, (_, i) => [makePage(i, true), makePage(i, false)]);
  const shell = surface(1060, 640, g => {
    panel(g, 22, 29, 1020, 596, '#dcd5c7', 22);
    panel(g, 13, 12, 1032, 604, '#59473b', 22); panel(g, 18, 15, 1022, 597, '#94724f', 20);
    panel(g, 23, 19, 1012, 585, '#b18c5c', 18); panel(g, 27, 23, 1004, 577, '#ab8458', 16);
    for (let x = 44; x < 1020; x += 13) { rect(g, x, 29, 6, 2, '#d9bc83'); rect(g, x, 590, 6, 2, '#d9bc83'); }
    for (let y = 46; y < 580; y += 13) { rect(g, 31, y, 2, 6, '#d9bc83'); rect(g, 1025, y, 2, 6, '#d9bc83'); }
    // Tabs, stacked page edges and a cloth spine provide depth without gloss.
    for (let i = 0; i < 5; i++) {
      panel(g, 1040, 86 + i * 83, 17, 53, [blue, gold, '#9fae9e', '#d3bb85', '#778f94'][i], 4);
      panel(g, 43 - i, 39 + i * 2, 974 + i * 2, 551 + i * 2, i % 2 ? '#b9aa89' : '#ded2b4', 12);
    }
    rect(g, 517, 26, 26, 579, '#79634d'); rect(g, 523, 29, 14, 575, '#a88a61');
    rect(g, 918, 575, 19, 47, blue); rect(g, 918, 620, 6, 7, blue); rect(g, 931, 620, 6, 7, blue);
  });
  const rings = surface(1060, 640, g => {
    for (const y of [81, 173, 265, 357, 449, 541]) {
      rect(g, 512, y + 2, 8, 11, '#867454'); rect(g, 541, y + 2, 8, 11, '#867454');
      for (let yy = -10; yy <= 10; yy += 2) for (let xx = -21; xx <= 21; xx += 2) {
        const r = xx * xx / (21 * 21) + yy * yy / 100;
        if (r <= 1 && r >= .45) rect(g, 530 + xx, y + yy, 2, 2, yy < -2 ? '#ead4a3' : yy < 3 ? '#b4955e' : '#735c3e');
      }
    }
  });
  const book = surface(1060, 640, g => {
    g.drawImage(shell, 0, 0); g.drawImage(pages[0][0], 50, 36); g.drawImage(pages[0][1], 530, 36); g.drawImage(rings, 0, 0);
  });
  const notes = Array.from({ length: 12 }, (_, i) => surface(54, 54, g => note(g, 2, 2, i % 3 === 1 ? '#d8e3df' : '#edddb0')));
  const homes = [[-360,-210],[-134,-239],[146,-230],[347,-192],[-400,-25],[390,5],[-358,188],[-164,237],[154,234],[351,184],[-198,-63],[196,-50]];
  const notePosition = (i: number, ms: number) => ({
    x: homes[i][0] + Math.sin(ms / 1000 * .65 + i * 1.4) * 10,
    y: homes[i][1] + Math.cos(ms / 1000 * .53 + i * 2.2) * 8,
  });
  let sourceCloud: HTMLCanvasElement | undefined;
  let particles: { from: Point; to: Point; dx: number; dy: number; delay: number }[] = [];
  const sample = (c: HTMLCanvasElement): Point[] => {
    const pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, result: Point[] = [];
    const stride = scene.particles.spacing;
    for (let y = 0; y < c.height; y += stride) for (let x = 0; x < c.width; x += stride) {
      const i = (y * c.width + x) * 4;
      if (pixels[i + 3] > 128) result.push({ x: x - 530, y: y - 320, color: 'rgb(' + pixels[i] + ',' + pixels[i+1] + ',' + pixels[i+2] + ')' });
    }
    return result;
  };
  const target = sample(book);
  let capturedAt: number | null = null, disposed = false;
  const startStory = (introMs: number) => {
    if (capturedAt !== null || disposed) return;
    capturedAt = introMs;
    sourceCloud = surface(1060, 640, g => {
      notes.forEach((note, i) => { const p = notePosition(i, introMs); g.drawImage(note, Math.round(530 + p.x - 27), Math.round(320 + p.y - 27)); });
    });
    const source = sample(sourceCloud), count = scene.particles.maxCount;
    particles = Array.from({ length: count }, (_, i) => ({
      from: source[Math.floor(i * source.length / count)], to: target[Math.floor(i * target.length / count)],
      dx: (noise(i + 2) - .5) * 200, dy: (noise(i + 707) - .5) * 150, delay: noise(i + 101) * .1,
    }));
  };
  let width = 1, height = 1, dpr = 1, scale = 1;
  let exits: { x: number; y: number; threshold: number }[] = [];
  const resize = () => {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width)); height = Math.max(1, Math.round(bounds.height));
    dpr = Math.min(scene.maxDpr, canvas.ownerDocument.defaultView?.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    scale = Math.max(.15, Math.min(1, (width - 72) / 1080, (height - 112) / 660));
    ctx.imageSmoothingEnabled = false;
    exits = [];
    for (let y = 0; y < height; y += 12) for (let x = 0; x < width; x += 12) exits.push({
      x, y, threshold: .69 * x / width + .18 * y / height + .13 * noise(x * 3 + y * 23),
    });
  };
  const renderBook = (storyMs: number) => {
    let spread = 0, turn = -1;
    for (let i = 0; i < 4; i++) if (storyMs >= scene.timings.turnsAtMs[i]) {
      if (storyMs < scene.timings.turnsAtMs[i] + scene.timings.turnMs) turn = i;
      else spread = i + 1;
    }
    ctx.drawImage(shell, -530, -320);
    ctx.drawImage(pages[spread][0], -480, -284);
    ctx.drawImage(pages[turn >= 0 ? turn + 1 : spread][1], 0, -284);
    if (turn >= 0) {
      const p = ease((storyMs - scene.timings.turnsAtMs[turn]) / scene.timings.turnMs);
      const angle = p * Math.PI, sine = Math.sin(angle), cosine = Math.cos(angle);
      const source = p < .5 ? pages[turn][1] : pages[turn + 1][0];
      // The old right page is the front, next left page its back. Narrow strips
      // deform along a curved sheet; reading content stays rasterized together.
      ctx.globalAlpha = sine * .12;
      rect(ctx, cosine < 0 ? -Math.abs(cosine) * 480 - 16 : 0, -280, Math.abs(cosine) * 480 + 18, 560, ink);
      ctx.globalAlpha = 1;
      const strips = 120, step = 480 / strips;
      for (let j = 0; j < strips; j++) {
        const u = j / strips, v = (j + 1) / strips;
        const project = (t: number) => cosine * t * 480 + sine * 18 * Math.sin(Math.PI * t);
        const x0 = project(u), x1 = project(v), x = Math.min(x0, x1), w = Math.max(.3, Math.abs(x1 - x0) + .6);
        const lift = sine * 24 * Math.sin(u * Math.PI / 2), h = 560 + sine * 7 * Math.sin(Math.PI * u);
        const sx = p < .5 ? j * step : 480 - (j + 1) * step;
        ctx.drawImage(source, sx, 0, step, 560, x, -284 - lift, w, h);
        ctx.globalAlpha = Math.round(sine * (2 + u * 3)) / 30;
        rect(ctx, x, -284 - lift, w, h, ink); ctx.globalAlpha = 1;
      }
    }
    ctx.drawImage(rings, -530, -320);
  };
  const draw = (introMs: number, storyMs: number | null = null): IntroFrame => {
    if (disposed) throw Error('renderer-disposed');
    const frame = introFrameAt(introMs, storyMs);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    if (frame.stage === 'complete') return frame;
    rect(ctx, 0, 0, width, height, paper);
    ctx.save(); ctx.translate(width / 2, height / 2 + 10); ctx.scale(scale, scale);
    if (storyMs === null) {
      notes.forEach((note, i) => {
        const appear = ease((introMs - 300 - i * 245) / 600), p = notePosition(i, introMs);
        ctx.globalAlpha = appear; ctx.drawImage(note, Math.round(p.x - 27), Math.round(p.y - 27 + (1 - appear) * 10));
      });
      ctx.globalAlpha = 1;
    } else if (storyMs < scene.timings.assembleEndMs) {
      if (capturedAt === null) startStory(introMs);
      const p = ease(storyMs / scene.timings.assembleEndMs);
      ctx.globalAlpha = 1 - ease(p / .4); ctx.drawImage(sourceCloud!, -530, -320);
      ctx.globalAlpha = Math.sin(p * Math.PI) ** .55;
      for (const particle of particles) {
        const q = ease((p - particle.delay) / (1 - particle.delay)), arc = Math.sin(q * Math.PI);
        ctx.fillStyle = q < .55 ? particle.from.color : particle.to.color;
        ctx.fillRect(Math.round(mix(particle.from.x, particle.to.x, q) + arc * particle.dx),
          Math.round(mix(particle.from.y, particle.to.y, q) + arc * particle.dy), 3 + arc * 2, 3 + arc * 2);
      }
      ctx.globalAlpha = ease((p - .55) / .45); ctx.drawImage(book, -530, -320); ctx.globalAlpha = 1;
    } else renderBook(storyMs);
    ctx.restore();
    if (storyMs !== null && storyMs >= scene.timings.leaveAtMs) {
      const p = ease((storyMs - scene.timings.leaveAtMs) / (scene.storyDurationMs - scene.timings.leaveAtMs));
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
      for (const tile of exits) if (tile.threshold <= p) ctx.fillRect(tile.x, tile.y, 12, 12);
      ctx.globalCompositeOperation = 'source-over';
    }
    return frame;
  };
  resize();
  return { draw, startStory, resize, dispose() { if (disposed) return; disposed = true; caches.forEach(c => { c.width = c.height = 0; }); particles = []; exits = []; } };
}
