// Canvas-generated textures: building windows, neon signs, road, portraits.
// Everything is drawn in code — no image assets, fully offline.

import { makeCanvas, mulberry32 } from './utils.js';

// Lit-window facade for buildings. Returns { map, emissiveMap }.
export function facadeTexture({ w = 256, h = 512, cols = 6, rows = 14, lit = 0.55, seed = 1, warm = '#ffd27a', cool = '#7fd4ff' } = {}) {
  const rnd = mulberry32(seed);
  const base = makeCanvas(w, h, (g) => {
    g.fillStyle = '#14161f';
    g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cw + 3, py = y * ch + 4, pw = cw - 6, ph = ch - 8;
        if (rnd() < lit) {
          g.fillStyle = rnd() < 0.7 ? warm : cool;
          g.globalAlpha = 0.55 + rnd() * 0.45;
        } else {
          g.fillStyle = '#0a0c12';
          g.globalAlpha = 1;
        }
        g.fillRect(px, py, pw, ph);
      }
    }
    g.globalAlpha = 1;
  });
  const map = new THREE.CanvasTexture(base);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(base);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap: emissive };
}

// A neon shop sign: glowing text on a dark board, with a coloured frame.
export function signTexture(text, color, { w = 512, h = 128 } = {}) {
  const c = makeCanvas(w, h, (g) => {
    g.fillStyle = '#0a0a12';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.font = `bold ${Math.min(64, (w - 40) / Math.max(4, text.length) * 1.9)}px Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.shadowBlur = 24;
    g.fillText(text, w / 2, h / 2 + 2);
    g.fillStyle = color;
    g.globalAlpha = 0.85;
    g.fillText(text, w / 2, h / 2 + 2);
    g.globalAlpha = 1;
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Asphalt with centre dashes and edge lines for the avenue.
export function roadTexture() {
  const c = makeCanvas(256, 512, (g) => {
    g.fillStyle = '#20242f';
    g.fillRect(0, 0, 256, 512);
    // subtle noise patches
    const rnd = mulberry32(7);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.25)';
      g.fillRect(rnd() * 256, rnd() * 512, 4 + rnd() * 22, 3 + rnd() * 10);
    }
    // centre dashes (two lanes each way)
    g.fillStyle = 'rgba(255,214,90,0.85)';
    for (let y = 0; y < 512; y += 64) g.fillRect(126, y, 4, 34);
    // lane lines
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 0; y < 512; y += 64) {
      g.fillRect(62, y, 3, 30);
      g.fillRect(190, y, 3, 30);
    }
    // edge lines
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(6, 0, 3, 512);
    g.fillRect(247, 0, 3, 512);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// Stylised character portrait (drawn face) as a data URL for the dialogue box.
export function portraitURL(who) {
  const faces = {
    rico: { skin: '#d9a06b', hair: '#3a2410', hat: '#e62129', shirt: '#ffd23f' },
    lena: { skin: '#c98d5f', hair: '#7a2d12', hat: null, shirt: '#ff7a1a' },
    rosa: { skin: '#b97f52', hair: '#e8e8e8', hat: null, shirt: '#b98cff' },
    dario: { skin: '#8a5a33', hair: '#141414', hat: null, shirt: '#39ff8e' },
  };
  const f = faces[who] || faces.rico;
  const c = makeCanvas(160, 160, (g) => {
    // backdrop
    const bg = g.createLinearGradient(0, 0, 0, 160);
    bg.addColorStop(0, '#1c1440');
    bg.addColorStop(1, '#0a0e2a');
    g.fillStyle = bg;
    g.fillRect(0, 0, 160, 160);
    // shoulders / shirt
    g.fillStyle = f.shirt;
    g.beginPath();
    g.ellipse(80, 168, 62, 52, 0, Math.PI, 0);
    g.fill();
    // neck + head
    g.fillStyle = f.skin;
    g.fillRect(70, 96, 20, 22);
    g.beginPath();
    g.ellipse(80, 72, 34, 40, 0, 0, Math.PI * 2);
    g.fill();
    // hair
    g.fillStyle = f.hair;
    g.beginPath();
    g.ellipse(80, 46, 34, 22, 0, Math.PI, 0);
    g.fill();
    if (who === 'lena') { // side ponytail
      g.beginPath(); g.ellipse(112, 78, 10, 26, 0.3, 0, Math.PI * 2); g.fill();
    }
    if (who === 'rosa') { // bun
      g.beginPath(); g.arc(80, 26, 14, 0, Math.PI * 2); g.fill();
    }
    if (f.hat) { // Rico's red cap
      g.fillStyle = f.hat;
      g.beginPath();
      g.ellipse(80, 40, 36, 18, 0, Math.PI, 0);
      g.fill();
      g.fillRect(44, 38, 74, 8);
      g.fillStyle = '#ffd23f';
      g.font = 'bold 11px Arial';
      g.textAlign = 'center';
      g.fillText('SB', 80, 36);
    }
    // eyes
    g.fillStyle = '#141414';
    g.beginPath(); g.arc(67, 72, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(93, 72, 4, 0, Math.PI * 2); g.fill();
    // brows + smile
    g.strokeStyle = '#141414';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(60, 62); g.lineTo(74, 60); g.stroke();
    g.beginPath(); g.moveTo(86, 60); g.lineTo(100, 62); g.stroke();
    g.beginPath(); g.arc(80, 90, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    // frame
    g.strokeStyle = 'rgba(255,210,63,0.9)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 156, 156);
  });
  return c.toDataURL('image/png');
}

// Title logo texture for the big SOLMAR BAY sign on the title screen backdrop.
export function logoTexture() {
  const c = makeCanvas(1024, 256, (g) => {
    g.clearRect(0, 0, 1024, 256);
    const grad = g.createLinearGradient(0, 20, 0, 200);
    grad.addColorStop(0, '#ff2d95');
    grad.addColorStop(0.5, '#ffd23f');
    grad.addColorStop(1, '#00e5ff');
    g.font = '900 118px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ff2d95';
    g.shadowBlur = 34;
    g.fillStyle = grad;
    g.fillText('SOLMAR BAY', 512, 108);
    g.shadowBlur = 0;
    g.font = 'bold 34px Arial, sans-serif';
    g.fillStyle = '#e8ecff';
    g.fillText('A  N I G H T  I N  T H E  R A I N', 512, 208);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
