// Small shared helpers: deterministic random, math, canvas textures.
// Every texture in the game is drawn procedurally at load — no image assets.

(function () {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }
  function fmtMoney(n) { return '$' + n.toLocaleString('en-US'); }
  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // Draw a canvas and return it as a THREE.CanvasTexture (nearest-safe, sRGB).
  function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // Building facade: rows of lit/unlit windows on a warm wall.
  function facadeTexture(seed, wall, lit) {
    return canvasTexture(128, 256, (g, w, h) => {
      g.fillStyle = wall; g.fillRect(0, 0, w, h);
      const rnd = mulberry32(seed);
      for (let y = 10; y < h - 8; y += 22) {
        for (let x = 8; x < w - 8; x += 18) {
          const on = rnd() < 0.55;
          g.fillStyle = on ? lit : 'rgba(20,26,44,0.9)';
          g.fillRect(x, y, 12, 14);
          if (on && rnd() < 0.25) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 12, 4); }
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 18, w, 18);
    });
  }

  // Shop sign board: bold text on a coloured band.
  function signTexture(text, bg, fg) {
    return canvasTexture(256, 48, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg;
      g.font = 'bold 26px Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 1);
    });
  }

  // Ground: asphalt grid with lane dashes, crosswalks and sidewalk tint.
  function groundTexture() {
    return canvasTexture(1024, 1024, (g, w, h) => {
      g.fillStyle = '#3a3f4a'; g.fillRect(0, 0, w, h); // asphalt
      const block = 128, road = 34;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const x = i * block + road / 2, y = j * block + road / 2;
          g.fillStyle = '#565b66'; g.fillRect(x, y, block - road, block - road); // sidewalk
          g.fillStyle = '#6b7280'; g.fillRect(x + 6, y + 6, block - road - 12, block - road - 12); // block top
        }
      }
      // Lane dashes along every road centre.
      g.fillStyle = '#e8d44d';
      for (let i = 0; i < 8; i++) {
        const c = i * block + road / 2 - 2;
        for (let y = 0; y < h; y += 32) { g.fillRect(c, y, 4, 18); g.fillRect(y, c, 18, 4); }
      }
      // Crosswalks at two junctions.
      g.fillStyle = '#e8e8e8';
      for (const [cx, cy] of [[384, 384], [640, 512]]) {
        for (let k = 0; k < 6; k++) { g.fillRect(cx - 30 + k * 12, cy - 40, 7, 80); }
      }
    });
  }

  // Sunset sky dome gradient with a soft sun glow.
  function skyTexture() {
    return canvasTexture(1024, 512, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, '#1d2a55');
      grad.addColorStop(0.38, '#5a4a8a');
      grad.addColorStop(0.62, '#d95f43');
      grad.addColorStop(0.8, '#ffb35c');
      grad.addColorStop(1.0, '#ffcf8a');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      // Sun glow, low on the horizon.
      const rg = g.createRadialGradient(w * 0.62, h * 0.72, 4, w * 0.62, h * 0.72, 190);
      rg.addColorStop(0, 'rgba(255,236,180,0.95)');
      rg.addColorStop(0.25, 'rgba(255,200,110,0.55)');
      rg.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      // Thin cloud streaks.
      g.fillStyle = 'rgba(255,190,170,0.28)';
      for (const [cx, cy, cw] of [[120, 150, 260], [520, 110, 320], [820, 190, 220], [300, 230, 180]]) {
        g.beginPath(); g.ellipse(cx, cy, cw, 10, 0, 0, Math.PI * 2); g.fill();
      }
    });
  }

  // Soft round cloud puff (used as billboard sprites in the marina shot).
  function cloudTexture() {
    return canvasTexture(256, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const blobs = [[64, 84, 42], [110, 66, 52], [160, 78, 46], [200, 90, 34], [90, 92, 40]];
      for (const [x, y, r] of blobs) {
        const rg = g.createRadialGradient(x, y, 4, x, y, r);
        rg.addColorStop(0, 'rgba(255,235,225,0.9)');
        rg.addColorStop(1, 'rgba(255,235,225,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    });
  }

  // Soft radial glow (headlight pools, spotlight pool, muzzle glow).
  function glowTexture(inner, outer) {
    return canvasTexture(128, 128, (g, w, h) => {
      const rg = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      rg.addColorStop(0, inner);
      rg.addColorStop(1, outer);
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    });
  }

  VB.util = {
    mulberry32, clamp, lerp, damp, fmtMoney, fmtTime,
    canvasTexture, facadeTexture, signTexture, groundTexture, skyTexture,
    cloudTexture, glowTexture,
  };
})();
