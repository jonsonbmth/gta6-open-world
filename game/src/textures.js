// Procedural canvas textures: asphalt with lane markings, building facades with
// lit window grids, awnings, car paint fleck, water, wooden planks, and a radial
// light-pool decal. No image files — every texture is drawn at boot from a seed.
import * as THREE from 'three';
import { pick, range } from './random.js';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Dark asphalt with a warm tint, subtle speckle and a centre dashed line.
export function asphaltTexture(random) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#282524';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i += 1) {
    const v = Math.floor(range(random, 30, 78));
    g.fillStyle = `rgb(${v + 12},${v + 6},${v})`;
    g.fillRect(Math.floor(random() * 256), Math.floor(random() * 256), 2, 2);
  }
  // Warm wear patches where tyres run.
  for (let i = 0; i < 14; i += 1) {
    g.fillStyle = `rgba(120,100,70,${range(random, 0.02, 0.05)})`;
    g.beginPath();
    g.ellipse(random() * 256, random() * 256, range(random, 20, 70), range(random, 8, 24), random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // Dashed centre line (yellow) — the road plane is oriented so this runs along the street.
  g.fillStyle = '#d9a83c';
  for (let y = 0; y < 256; y += 32) g.fillRect(124, y + 4, 8, 18);
  // Edge lines.
  g.fillStyle = 'rgba(230,230,220,0.55)';
  g.fillRect(6, 0, 4, 256);
  g.fillRect(246, 0, 4, 256);
  return toTexture(c, 1, 8);
}

// A building facade: warm base colour, a grid of windows (some lit golden), a
// darker ground floor with a shopfront band.
export function facadeTexture(random, base) {
  const c = makeCanvas(256, 512);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  // Subtle vertical shading so the face is not flat.
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.16)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  const cols = 4;
  const rows = 8;
  const ww = 40;
  const wh = 34;
  const gapX = (256 - cols * ww) / (cols + 1);
  const gapY = 22;
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = gapX + col * (ww + gapX);
      const y = 18 + r * (wh + gapY);
      const lit = random() < 0.35;
      g.fillStyle = lit ? pick(random, ['#ffd98a', '#ffce6e', '#ffe9b0']) : pick(random, ['#3a4a5c', '#2e3d4e', '#46586c']);
      g.fillRect(x, y, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x, y, ww, 5);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x, y + wh - 4, ww, 4);
    }
  }
  // Ground floor: darker band with a shopfront.
  g.fillStyle = 'rgba(20,16,12,0.55)';
  g.fillRect(0, 452, 256, 60);
  g.fillStyle = '#e8d9a0';
  g.fillRect(18, 466, 220, 30);
  g.fillStyle = 'rgba(30,20,10,0.85)';
  g.font = 'bold 20px sans-serif';
  g.textAlign = 'center';
  g.fillText(pick(random, ['CAFÉ', 'SHOP', 'MARKET', 'BAR', 'BAKERY']), 128, 488);
  return toTexture(c);
}

// Striped awning in warm colours.
export function awningTexture(random, a, b) {
  const c = makeCanvas(128, 64);
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = i % 2 === 0 ? a : b;
    g.fillRect(i * 16, 0, 16, 64);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, 52, 128, 12);
  return toTexture(c, 2, 1);
}

// Car paint: vivid base with a fine metallic fleck.
export function paintTexture(random, base) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    g.fillRect(Math.floor(random() * 128), Math.floor(random() * 128), 1, 1);
  }
  return toTexture(c);
}

// Calm bay water: deep blue-green with soft light streaks.
export function waterTexture(random) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2a5a74');
  grad.addColorStop(0.5, '#1d4258');
  grad.addColorStop(1, '#16303f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i += 1) {
    g.fillStyle = `rgba(255,220,150,${range(random, 0.03, 0.1)})`;
    g.fillRect(random() * 256, random() * 256, range(random, 20, 80), 2);
  }
  for (let i = 0; i < 40; i += 1) {
    g.fillStyle = `rgba(255,255,255,${range(random, 0.02, 0.06)})`;
    g.fillRect(random() * 256, random() * 256, range(random, 8, 40), 1);
  }
  return toTexture(c, 6, 6);
}

// Wooden planks for the marina quay — ROUGH, so the marina light cannot streak.
export function plankTexture(random) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#7a5a3c';
  g.fillRect(0, 0, 256, 256);
  for (let p = 0; p < 8; p += 1) {
    const shade = Math.floor(range(random, -14, 14));
    g.fillStyle = `rgb(${122 + shade},${90 + shade},${60 + shade})`;
    g.fillRect(0, p * 32, 256, 30);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, p * 32 + 30, 256, 2);
    for (let i = 0; i < 26; i += 1) {
      g.fillStyle = `rgba(60,40,20,${range(random, 0.08, 0.2)})`;
      g.fillRect(random() * 256, p * 32 + random() * 30, range(random, 6, 30), 1);
    }
  }
  return toTexture(c, 4, 4);
}

// Radial warm light pool, drawn additively under the hero car so it never sits
// on pitch-black asphalt.
export function lightPoolTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,214,140,0.55)');
  grad.addColorStop(0.5, 'rgba(255,190,110,0.22)');
  grad.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return toTexture(c);
}

// A soft round glow sprite (taillights, street lamps, police light bars).
export function glowTexture() {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c);
}
