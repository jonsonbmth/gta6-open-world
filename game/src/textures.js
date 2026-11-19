// SOLMAR BAY — procedural canvas textures. Every surface gets a texture:
// flat single-colour surfaces are what make a game look like Minecraft.
// All textures are generated at runtime from a seeded RNG — no assets.
import * as THREE from 'three';
import { rng } from './config.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckle(ctx, w, h, rand, n, colors, sizeMax = 2) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.globalAlpha = 0.08 + rand() * 0.25;
    const s = 1 + rand() * sizeMax;
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

// --- Asphalt: dark base, cracks, oil stains, patch seams -------------------
export function asphaltTexture(seed = 7) {
  const rand = rng(seed);
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#4d4c56';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, rand, 5200, ['#42414b', '#55545f', '#5a5966', '#46454f'], 3);
  // patch seams (rectangles of slightly different asphalt)
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#2f2e37' : '#383740';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(rand() * 400, rand() * 400, 60 + rand() * 120, 40 + rand() * 90);
  }
  ctx.globalAlpha = 1;
  // cracks: dark wandering polylines
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = '#1d1c22';
    ctx.lineWidth = 1 + rand() * 1.5;
    ctx.beginPath();
    let x = rand() * 512, y = rand() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      x += (rand() - 0.5) * 70; y += (rand() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // oil stains: soft dark radial blobs
  for (let i = 0; i < 9; i++) {
    const x = rand() * 512, y = rand() * 512, r = 12 + rand() * 34;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(12,12,18,0.55)');
    g.addColorStop(1, 'rgba(12,12,18,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // faint wet sheen streaks (vertical, catch the dusk light)
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = 'rgba(255,170,120,0.05)';
    ctx.fillRect(rand() * 512, 0, 2 + rand() * 5, 512);
  }
  return toTexture(c, 1, 10);
}

// --- Sidewalk concrete: joints + stains ------------------------------------
export function concreteTexture(seed = 11) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#9a938a';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rand, 2600, ['#8d867d', '#a39c92', '#948d84'], 2);
  ctx.strokeStyle = 'rgba(60,55,50,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(70,60,50,0.18)';
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 14 + rand() * 26, 8 + rand() * 14, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c, 6, 6);
}

// --- Rough dark quay concrete (marina): NO specular streaks -----------------
export function quayTexture(seed = 13) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  // Light warm concrete: the dark version read as a black void in dusk light.
  ctx.fillStyle = '#6d6862';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rand, 3000, ['#625d58', '#786f66', '#57524d'], 3);
  ctx.strokeStyle = 'rgba(20,18,16,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 256); ctx.stroke();
  }
  return toTexture(c, 8, 8);
}

// --- Building facade: window grid, some lit warm, some dark -----------------
export function facadeTexture(seed, base = '#7a6a58', litRatio = 0.45) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 512);
  speckle(ctx, 256, 512, rand, 1800, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.07)'], 3);
  // floor bands
  const floors = 8, cols = 5;
  const ww = 256 / cols, wh = 512 / floors;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = col * ww + ww * 0.18, y = f * wh + wh * 0.2;
      const w = ww * 0.64, h = wh * 0.55;
      const lit = rand() < litRatio;
      if (lit) {
        const warm = ['#ffd27a', '#ffb35c', '#ffe6a8', '#ffc47e'][Math.floor(rand() * 4)];
        ctx.fillStyle = warm;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x, y, w, h * 0.25);
      } else {
        ctx.fillStyle = rand() > 0.5 ? '#2c3448' : '#232c3d';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,180,120,0.18)';
        ctx.fillRect(x, y, w * 0.4, h);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
    // floor separator line
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, f * wh, 256, 3);
  }
  return toTexture(c, 1, 1);
}

// --- Brick -----------------------------------------------------------------
export function brickTexture(seed = 21, base = '#8a4a3a') {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#6e6a64';
  ctx.fillRect(0, 0, 256, 256);
  const bh = 16, bw = 42;
  for (let row = 0; row < 16; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col < 7; col++) {
      const v = (rand() - 0.5) * 26;
      ctx.fillStyle = `rgb(${138 + v | 0},${74 + v * 0.5 | 0},${58 + v * 0.4 | 0})`;
      ctx.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  speckle(ctx, 256, 256, rand, 900, ['rgba(0,0,0,0.15)'], 2);
  return toTexture(c, 2, 2);
}

// --- Roof: dark + vents + stains -------------------------------------------
export function roofTexture(seed = 31) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#3f3a38';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rand, 2200, ['#353130', '#4a4442', '#2e2a29'], 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
  }
  return toTexture(c, 1, 1);
}

// --- Awning stripes ---------------------------------------------------------
export function awningTexture(color = '#ff4d6a') {
  const [c, ctx] = canvas(128, 128);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f2ede4' : color;
    ctx.fillRect(i * 16, 0, 16, 128);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 110, 128, 18);
  return toTexture(c, 2, 1);
}

// --- Neon shop sign: glowing text on dark glass ------------------------------
export function neonSignTexture(name, color) {
  const [c, ctx] = canvas(512, 128);
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, 512, 128);
  ctx.font = 'bold 62px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = color;
  ctx.fillText(name, 256, 66);
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.fillText(name, 256, 66);
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// --- Radial glow sprite (for neon, lamps, taillights) -----------------------
export function glowTexture(color = '#ffffff') {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color + 'cc');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- Water: deep blue-teal with sun streaks ----------------------------------
export function waterTexture(seed = 41) {
  const rand = rng(seed);
  const [c, ctx] = canvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  // Lighter dusk blues so the bay reads as water catching the sunset, not ink.
  grad.addColorStop(0, '#2a5f8e');
  grad.addColorStop(0.5, '#21537e');
  grad.addColorStop(1, '#1a4568');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(255,${170 + rand() * 60 | 0},120,${0.05 + rand() * 0.16})`;
    ctx.fillRect(rand() * 512, rand() * 512, 20 + rand() * 90, 1 + rand() * 2);
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(140,220,255,${0.05 + rand() * 0.1})`;
    ctx.fillRect(rand() * 512, rand() * 512, 10 + rand() * 50, 1 + rand() * 2);
  }
  return toTexture(c, 6, 6);
}

// --- Wood planks (docks) -----------------------------------------------------
export function woodTexture(seed = 51) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#6e5236';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    const v = (rand() - 0.5) * 30;
    ctx.fillStyle = `rgb(${110 + v | 0},${82 + v * 0.6 | 0},${54 + v * 0.4 | 0})`;
    ctx.fillRect(0, i * 32 + 1, 256, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let k = 0; k < 5; k++) ctx.fillRect(rand() * 256, i * 32 + 4 + rand() * 24, 8 + rand() * 30, 1);
  }
  return toTexture(c, 4, 4);
}

// --- Grass / dirt patch -------------------------------------------------------
export function groundTexture(seed = 61) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#5d6e46';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rand, 3200, ['#4f6039', '#6b7d52', '#7a6e4a', '#55663f'], 3);
  return toTexture(c, 24, 24);
}

// --- Sand (beach) --------------------------------------------------------------
export function sandTexture(seed = 71) {
  const rand = rng(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#d9b98c';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rand, 2800, ['#c9a87a', '#e8cb9e', '#c2a071'], 2);
  return toTexture(c, 10, 10);
}
