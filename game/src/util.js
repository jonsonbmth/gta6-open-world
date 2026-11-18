// Canvas texture helpers — every sign, window grid and portrait is drawn, no assets.
import * as THREE from 'three';
import { rng } from './state.js';

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Neon shop sign: glowing text on a dark plate, with a soft halo baked in.
export function neonSignTexture(text, color, sub = '') {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0a0614'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.globalAlpha = 0.9; g.lineWidth = 3;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 26;
    g.fillStyle = '#ffffff';
    g.font = `900 ${sub ? 52 : 62}px Arial, sans-serif`;
    g.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2 + 2);
    g.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2 + 2);
    if (sub) {
      g.shadowBlur = 12; g.font = '700 26px Arial, sans-serif'; g.fillStyle = color;
      g.fillText(sub, w / 2, h - 30);
    }
  });
}

// Building facade: dark concrete with a grid of lit / dark windows.
export function windowsTexture(cols, rows, warmRatio = 0.45) {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#0b0e1e'; g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const r = rng();
      if (r < warmRatio) g.fillStyle = r < warmRatio * 0.7 ? '#ffca6a' : '#8fe3ff';
      else g.fillStyle = '#10142a';
      g.fillRect(x * cw + 4, y * ch + 5, cw - 8, ch - 10);
    }
  });
}

// Radial glow sprite texture (additive).
export function glowTexture() {
  return canvasTex(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  });
}

// Vertical streak texture for fake wet-road reflections.
export function streakTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = side; g.fillRect(0, 0, w, h);
  });
}

// A character portrait drawn on a 2D canvas: flat vector face, distinct per person.
export function drawPortrait(canvas, who) {
  const g = canvas.getContext('2d');
  const P = {
    rico: { skin: '#c98d5f', hair: '#1c1410', shirt: '#d8b13a', extra: 'cap' },
    lena: { skin: '#e8b48a', hair: '#7a2e1d', shirt: '#2e8f6e', extra: 'bandana' },
    rosa: { skin: '#8a5a34', hair: '#d9d9d9', shirt: '#6e3fa0', extra: 'glasses' },
    dario: { skin: '#b97a4e', hair: '#0d0d0d', shirt: '#a02c2c', extra: 'scar' },
    cop: { skin: '#e0aa7e', hair: '#3a2a1a', shirt: '#22335c', extra: 'badge' },
  }[who] || { skin: '#c98d5f', hair: '#222', shirt: '#444', extra: '' };
  g.fillStyle = '#141a38'; g.fillRect(0, 0, 72, 72);
  g.fillStyle = '#1d2447'; g.fillRect(0, 0, 72, 20);
  // shoulders
  g.fillStyle = P.shirt; g.beginPath(); g.moveTo(6, 72); g.quadraticCurveTo(36, 34, 66, 72); g.fill();
  // head
  g.fillStyle = P.skin; g.beginPath(); g.ellipse(36, 34, 17, 20, 0, 0, Math.PI * 2); g.fill();
  // hair
  g.fillStyle = P.hair; g.beginPath(); g.ellipse(36, 20, 17, 12, 0, Math.PI, 0); g.fill();
  g.fillRect(19, 14, 34, 8);
  // eyes + mouth
  g.fillStyle = '#101010'; g.fillRect(27, 32, 5, 4); g.fillRect(40, 32, 5, 4);
  g.strokeStyle = '#5a2e1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 46); g.lineTo(42, 46); g.stroke();
  if (P.extra === 'cap') { g.fillStyle = '#c22'; g.fillRect(18, 8, 36, 9); g.fillRect(18, 15, 44, 4); }
  if (P.extra === 'bandana') { g.fillStyle = '#ff2d95'; g.fillRect(19, 10, 34, 10); }
  if (P.extra === 'glasses') { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(24, 29, 10, 8); g.strokeRect(38, 29, 10, 8); }
  if (P.extra === 'scar') { g.strokeStyle = '#7a2010'; g.lineWidth = 2; g.beginPath(); g.moveTo(44, 26); g.lineTo(40, 38); g.stroke(); }
  if (P.extra === 'badge') { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(52, 58, 5, 0, Math.PI * 2); g.fill(); }
}

// Rain streak sprite (thin diagonal line).
export function rainTexture() {
  return canvasTex(16, 64, (g) => {
    g.strokeStyle = 'rgba(180,210,255,.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(10, 2); g.lineTo(6, 62); g.stroke();
  });
}
