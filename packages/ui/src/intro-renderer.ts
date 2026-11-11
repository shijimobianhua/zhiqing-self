import { introScene } from './intro-scene-r3';

type Point = { x: number; y: number; rgb: number[] };
type MorphPoint = { from: Point; to: Point; colors: string[]; bendX: number; bendY: number; delay: number };
export type IntroFrame = { stage: string; moving: boolean };
const paper = '#faf8f3', ink = '#59473b', blue = '#496777', gold = '#c8a46b';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const noise = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function introFrameAt(ms: number): IntroFrame {
  const t = introScene.timings;
  if (ms < 300) return { stage: 'prelude', moving: false };
  if (ms < t.assembleAtMs) return { stage: 'notes', moving: true };
  if (ms < t.bookAtMs) return { stage: 'reassemble', moving: true };
  if (ms < t.pageAtMs) return { stage: 'handbook', moving: false };
  if (ms < t.portraitAtMs) return { stage: 'page', moving: true };
  if (ms < t.portraitReadyAtMs) return { stage: 'portrait', moving: true };
  if (ms < t.nameReadyAtMs) return { stage: 'signature', moving: true };
  if (ms < t.leaveAtMs) return { stage: 'hold', moving: false };
  if (ms < introScene.finishAtMs) return { stage: 'exit', moving: true };
  return { stage: 'complete', moving: false };
}

// One renderer and a few cached raster surfaces; no DOM changes in the loop.
// Coordinates are CSS pixels. The portrait is the unmodified original, not a
// generated/morphed face. Only the white page and its occlusion ever move.
export function createIntroRenderer(canvas: HTMLCanvasElement, portrait: HTMLImageElement, name = '世纪末之青') {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw Error('canvas-unavailable');
  const ctx = context;
  const caches: HTMLCanvasElement[] = [];
  const makeCanvas = (width: number, height: number) => {
    const c = canvas.ownerDocument.createElement('canvas'); c.width = width; c.height = height;
    caches.push(c); return c;
  };
  const surface = (width: number, height: number, paint: (c: CanvasRenderingContext2D) => void) => {
    const c = makeCanvas(width, height), g = c.getContext('2d');
    if (!g) throw Error('cache-unavailable');
    g.imageSmoothingEnabled = false; paint(g); return c;
  };
  const poly = (g: CanvasRenderingContext2D, points: number[][], fill: string, stroke?: string) => {
    g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  };
  const rect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color; g.fillRect(x, y, w, h);
  };
  const book = surface(280, 188, g => {
    poly(g, [[11, 43], [130, 22], [140, 30], [150, 22], [270, 43], [270, 180], [145, 186], [140, 178], [135, 186], [11, 180]], blue, ink);
    poly(g, [[15, 40], [126, 18], [139, 27], [139, 169], [127, 161], [15, 179]], '#e2dccb', ink);
    poly(g, [[141, 27], [154, 18], [266, 40], [266, 179], [154, 161], [141, 169]], '#e2dccb', ink);
    poly(g, [[19, 35], [126, 14], [138, 24], [138, 162], [126, 154], [19, 174]], '#f8f5ea', '#9c998b');
    poly(g, [[142, 24], [154, 14], [262, 35], [262, 174], [154, 154], [142, 162]], '#ffffff', '#9c998b');
    rect(g, 139, 28, 2, 143, '#c5bdab');
    // A quiet diagram, ruled lines and a cloth binding, without pseudo-writing.
    rect(g, 34, 55, 18, 18, '#d6e3e2'); rect(g, 35, 56, 16, 2, blue);
    rect(g, 81, 47, 23, 21, '#ece0c6'); rect(g, 82, 48, 21, 2, gold);
    rect(g, 56, 65, 21, 1, '#a3b4b3'); rect(g, 76, 59, 1, 7, '#a3b4b3');
    for (let y = 92; y < 145; y += 10) {
      rect(g, 34, y, 79, 1, '#d8d4c7'); rect(g, 34, y + 2, 38, 1, '#e4dfd2');
    }
    rect(g, 231, 35, 9, 24, '#d8bd84');
    poly(g, [[232, 162], [240, 163], [240, 185], [236, 181], [232, 185]], gold);
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(noise(i + 3) * 250 + 15), y = Math.floor(noise(i + 701) * 14 + 165);
      if (x < 125 || x > 155) rect(g, x, y, 1, 1, i % 2 ? '#b5b6a5' : '#d7d3bf');
    }
  });
  const notes = Array.from({ length: introScene.particles.noteCount }, (_, i) => surface(38, 38, g => {
    const colors = ['#f0dfad', '#e8d5a4', '#dce7e3', '#f4e9c9'];
    // Adhesive strip, soft paper edge, lifted bottom corner. No window bar,
    // document frame or dog-eared top corner: these are square sticky notes.
    rect(g, 5, 7, 30, 29, '#e0d8c4');
    poly(g, [[3, 3], [33, 3], [33, 30], [30, 33], [3, 33]], colors[i % colors.length]);
    rect(g, 3, 3, 30, 5, i % 4 < 2 ? '#dfc88f' : '#c7d6d1');
    poly(g, [[30, 30], [33, 30], [30, 33]], i % 4 < 2 ? '#c8b482' : '#b7cbc5');
    rect(g, 9, 14, 18, 1, '#a9a68f');
    rect(g, 9, 20, i % 3 === 0 ? 12 : 18, 1, '#b7b39a');
    if (i % 3 !== 2) rect(g, 9, 26, 11, 1, '#c0bca5');
  }));
  const homes = [[-318, -190], [160, -212], [-348, 4], [274, 177], [-106, -240], [341, 78], [-74, 231], [322, -137], [-272, 191], [157, 216], [-158, -80], [112, 30]];
  const notePosition = (i: number, ms: number) => ({
    x: homes[i % homes.length][0] + Math.sin(ms / 1000 * .7 + i * 1.4) * 14,
    y: homes[i % homes.length][1] + Math.cos(ms / 1000 * .55 + i * 2.2) * 10,
  });
  // Freeze the floating papers exactly at the transition boundary so the
  // particle handoff starts from their actual positions, not a new big file.
  const sourceCloud = surface(440, 320, g => {
    notes.forEach((note, i) => {
      const p = notePosition(i, introScene.timings.assembleAtMs);
      g.drawImage(note, Math.round(220 + p.x / 2 - 19), Math.round(160 + p.y / 2 - 19));
    });
  });
  const title = surface(560, 82, g => {
    g.fillStyle = '#3b2c27'; g.font = '40px Fusion, Noto, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 280, 42);
  });
  const sample = (c: HTMLCanvasElement): Point[] => {
    const pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, points: Point[] = [];
    const stride = introScene.particles.spacing;
    for (let y = 0; y < c.height; y += stride) for (let x = 0; x < c.width; x += stride) {
      const i = (y * c.width + x) * 4;
      if (pixels[i + 3] > 128) points.push({ x: (x - c.width / 2) * 2, y: (y - c.height / 2) * 2, rgb: [pixels[i], pixels[i + 1], pixels[i + 2]] });
    }
    return points;
  };
  const source = sample(sourceCloud), target = sample(book), count = Math.min(introScene.particles.maxCount, Math.max(source.length, target.length));
  const particles: MorphPoint[] = Array.from({ length: count }, (_, i) => {
    const a = source[Math.floor(i * source.length / count)], b = target[Math.floor(i * target.length / count)];
    return { from: a, to: b, colors: Array.from({ length: 5 }, (_, k) => `rgb(${a.rgb.map((v, j) => Math.round(lerp(v, b.rgb[j], k / 4))).join(',')})`),
      bendX: (noise(i + 17) - .5) * 280, bendY: (noise(i + 97) - .5) * 190,
      delay: noise(i + 203) * .12 };
  });
  const portraitTiles = Array.from({ length: 53 * 53 }, (_, i) => ({
    x: i % 53 * 8, y: Math.floor(i / 53) * 8,
    threshold: ((i % 53 + Math.floor(i / 53)) / 104) * .6 + noise(i + 101) * .4,
  }));
  let width = 0, height = 0, dpr = 1, scale = 1, disposed = false;
  let exits: { x: number; y: number; threshold: number }[] = [];
  const resize = () => {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width)); height = Math.max(1, Math.round(bounds.height));
    dpr = Math.min(introScene.maxDpr, canvas.ownerDocument.defaultView?.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    scale = Math.max(.2, Math.min(1, (width - 56) / 860, (height - 72) / 640));
    ctx.imageSmoothingEnabled = false;
    exits = [];
    for (let y = 0; y < height; y += 12) for (let x = 0; x < width; x += 12) {
      exits.push({ x, y, threshold: .65 * x / width + .18 * y / height + .17 * noise(x * 3 + y * 23) });
    }
  };
  const cached = (image: HTMLCanvasElement, alpha: number, x = -image.width, y = -image.height) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = clamp(alpha); ctx.drawImage(image, x, y, image.width * 2, image.height * 2); ctx.globalAlpha = 1;
  };
  const drawPortrait = (progress: number, nameOpacity: number) => {
    if (progress > 0) {
      // Render-only compositing: original white is neutral on the paper tint.
      // No asset edits, no AI regeneration, and no white portrait rectangle.
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(portrait, -209, -245, 418, 418);
      ctx.restore();
      if (progress < 1) {
        ctx.fillStyle = paper;
        for (const tile of portraitTiles) if (tile.threshold > progress) ctx.fillRect(-209 + tile.x, -245 + tile.y, Math.min(8, 418 - tile.x), Math.min(8, 418 - tile.y));
      }
    }
    if (nameOpacity > 0) {
      ctx.globalAlpha = nameOpacity; ctx.drawImage(title, -280, 181); ctx.globalAlpha = 1;
    }
  };
  const draw = (elapsedMs: number): IntroFrame => {
    if (disposed) throw Error('renderer-disposed');
    const ms = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0), frame = introFrameAt(ms), t = introScene.timings;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    if (ms >= introScene.finishAtMs) return frame;
    rect(ctx, 0, 0, width, height, paper);
    ctx.save(); ctx.translate(width / 2, height / 2 + 5); ctx.scale(scale, scale);
    if (ms < t.pageAtMs) {
      const p = smooth((ms - t.assembleAtMs) / (t.bookAtMs - t.assembleAtMs));
      if (ms < t.bookAtMs) {
        if (ms < t.assembleAtMs) {
          notes.forEach((note, i) => {
            const appear = smooth((ms - 300 - i * 380) / 650), pos = notePosition(i, ms);
            ctx.globalAlpha = appear;
            ctx.drawImage(note, pos.x - 38, pos.y - 38 + (1 - appear) * 12, 76, 76);
          });
          ctx.globalAlpha = 1;
        } else cached(sourceCloud, 1 - smooth((p - .03) / .30));
        if (ms >= t.assembleAtMs) {
          ctx.globalAlpha = Math.sin(p * Math.PI) ** .55;
          for (const particle of particles) {
            const q = smooth((p - particle.delay) / (1 - particle.delay)), arc = Math.sin(q * Math.PI);
            const x = lerp(particle.from.x, particle.to.x, q) + particle.bendX * arc;
            const y = lerp(particle.from.y, particle.to.y, q) + particle.bendY * arc;
            ctx.fillStyle = particle.colors[Math.min(4, Math.floor(q * 4))];
            const size = lerp(7, 3, arc); ctx.fillRect(Math.round(x), Math.round(y), size, size);
          }
          ctx.globalAlpha = 1;
        }
      }
      cached(book, smooth((p - .62) / .38));
    } else {
      const q = smooth((ms - t.pageAtMs) / (t.portraitAtMs - t.pageAtMs));
      cached(book, 1 - smooth(q / .9));
      // The right page, then a flat white portrait page. No portrait transform.
      const from = [[4, -140], [244, -116], [244, 150], [4, 132]], to = [[-237, -270], [237, -270], [237, 273], [-237, 273]];
      const corners = from.map((point, i) => point.map((n, j) => lerp(n, to[i][j], q)));
      if (ms >= t.leaveAtMs) {
        const p = smooth((ms - t.leaveAtMs) / 450), sx = width / scale / 2 + 5, sy = height / scale / 2 + 10;
        poly(ctx, [[-lerp(237, sx, p), -lerp(270, sy, p)], [lerp(237, sx, p), -lerp(270, sy, p)], [lerp(237, sx, p), lerp(273, sy, p)], [-lerp(237, sx, p), lerp(273, sy, p)]], paper);
      } else {
        const pageColor = `rgb(${Math.round(lerp(255, 250, q))},${Math.round(lerp(255, 248, q))},${Math.round(lerp(255, 243, q))})`;
        const edgeColor = `rgb(${Math.round(lerp(196, 250, q))},${Math.round(lerp(188, 248, q))},${Math.round(lerp(170, 243, q))})`;
        poly(ctx, corners, pageColor, edgeColor);
      }
      drawPortrait(smooth((ms - t.portraitAtMs) / (t.portraitReadyAtMs - t.portraitAtMs)), smooth((ms - t.nameAtMs) / (t.nameReadyAtMs - t.nameAtMs)));
    }
    ctx.restore();
    if (ms >= t.leaveAtMs) {
      const p = smooth((ms - t.leaveAtMs) / (introScene.finishAtMs - t.leaveAtMs));
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000000';
      for (const tile of exits) if (tile.threshold <= p) ctx.fillRect(tile.x, tile.y, 12, 12);
      ctx.globalCompositeOperation = 'source-over';
    }
    return frame;
  };
  resize();
  return { draw, resize, dispose() { if (disposed) return; disposed = true; caches.forEach(c => { c.width = c.height = 0; }); exits = []; } };
}
