// Procedural canvas textures: every surface in the city is textured, never a
// flat color. All textures are drawn on offscreen canvases at load time, so
// the game ships no image files and makes no network request.

import { makeRng } from './util.js';

function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function speckle(ctx, size, rng, colors, count, maxR) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rng.pick(colors);
    ctx.globalAlpha = 0.12 + rng.next() * 0.25;
    const r = 0.5 + rng.next() * maxR;
    ctx.beginPath();
    ctx.arc(rng.next() * size, rng.next() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function asphaltTexture() {
  return canvasTexture(256, (ctx, s) => {
    const rng = makeRng(11);
    ctx.fillStyle = '#33363b';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, ['#2a2d31', '#3d4046', '#26282c', '#45484e'], 2600, 1.6);
    // faint cracks
    ctx.strokeStyle = 'rgba(20,20,22,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      let x = rng.next() * s;
      let y = rng.next() * s;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += rng.range(-26, 26);
        y += rng.range(-26, 26);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // worn patches
    ctx.fillStyle = 'rgba(70,70,76,0.25)';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(rng.next() * s, rng.next() * s, rng.range(18, 46), rng.range(10, 26), rng.next() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 6, 6);
}

export function sidewalkTexture() {
  return canvasTexture(256, (ctx, s) => {
    const rng = makeRng(23);
    ctx.fillStyle = '#9a938a';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, ['#8d867c', '#a39c92', '#847d74'], 1400, 1.4);
    // paver joints
    ctx.strokeStyle = 'rgba(70,64,58,0.55)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = 0; i <= s; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
  }, 8, 8);
}

export function sandTexture() {
  return canvasTexture(256, (ctx, s) => {
    const rng = makeRng(37);
    ctx.fillStyle = '#e8d5a8';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, ['#dcc793', '#f2e2b8', '#cdb87e'], 2200, 1.5);
  }, 10, 10);
}

export function waterTexture() {
  return canvasTexture(256, (ctx, s) => {
    const rng = makeRng(41);
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#2e8fb8');
    grad.addColorStop(0.5, '#1f7ba6');
    grad.addColorStop(1, '#2e9cc4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const x = rng.next() * s;
      const y = rng.next() * s;
      const len = rng.range(8, 30);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + rng.range(-3, 3));
      ctx.stroke();
    }
  }, 4, 4);
}

// One facade variant per call: brick, stucco, glass curtain, concrete panel,
// painted plaster. Windows are lit or dark at random; the ground floor is a
// darker band so shopfronts sit naturally on top of it.
export function facadeTexture(variant, seed) {
  const palettes = [
    { base: '#b0705a', dark: '#8f5644', win: '#2c3e4d', lit: '#ffd98a' }, // brick red
    { base: '#c9a06a', dark: '#a37c4e', win: '#33454f', lit: '#ffe6a3' }, // sandstone
    { base: '#7d94a6', dark: '#5d7383', win: '#1d2f3a', lit: '#bfe6ff' }, // blue glass
    { base: '#9c8f7d', dark: '#7d7160', win: '#2a3540', lit: '#ffd27a' }, // concrete
    { base: '#a8b08a', dark: '#848c68', win: '#2f3b33', lit: '#fff0a0' }, // sage plaster
    { base: '#c98d7a', dark: '#a86a58', win: '#33272e', lit: '#ffd98a' }, // coral
  ];
  const p = palettes[variant % palettes.length];
  return canvasTexture(256, (ctx, s) => {
    const rng = makeRng(seed);
    ctx.fillStyle = p.base;
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, [p.dark, p.base], 500, 2);
    // horizontal floor bands
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < s; y += 42) ctx.fillRect(0, y, s, 3);
    // window grid
    const cols = 5;
    const rows = 5;
    const ww = 30;
    const wh = 26;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 14 + c * 48;
        const y = 12 + r * 48;
        const lit = rng.chance(0.28);
        ctx.fillStyle = lit ? p.lit : p.win;
        ctx.fillRect(x, y, ww, wh);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x, y, ww, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + ww / 2 - 1, y, 2, wh);
      }
    }
    // ground-floor band (shopfronts cover this)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, s - 46, s, 46);
  }, 1, 1);
}

// A shop sign: bold name on a colored board, drawn as a texture so the name
// is crisp at any distance. Returns a texture sized for a wide board.
export function shopSignTexture(name, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, 0, 512, 10);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 84);
  ctx.fillStyle = fg;
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Striped awning canvas: alternating color bands.
export function awningTexture(colorA, colorB) {
  return canvasTexture(128, (ctx, s) => {
    const stripes = 8;
    const w = s / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i * w, 0, w, s);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, s - 14, s, 14);
  }, 2, 1);
}

// Billboard / poster texture with a short line of text.
export function posterTexture(lines, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px Arial, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 128, 60 + i * 44));
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(20, 240, 216, 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
