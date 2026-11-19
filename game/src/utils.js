// SOLMAR BAY — shared utilities: seeded random, math, procedural canvas textures.
// Everything visual is generated at runtime from code: no external assets, fully offline.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  // Deterministic mulberry32 RNG. The city layout uses a fixed seed so screenshots
  // reproduce; gameplay variance comes from a second stream seeded by time.
  function RNG(seed) {
    var a = seed >>> 0;
    this.next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.range = function (lo, hi) { return lo + this.next() * (hi - lo); };
    this.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
    this.int = function (lo, hi) { return Math.floor(this.range(lo, hi + 1)); };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }
  function angleLerp(a, b, t) {
    var d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * t;
  }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  // --- Procedural canvas textures -------------------------------------------------
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // Soft radial glow sprite (white core fading out). Tint via sprite material color.
  function glowTexture() {
    var c = makeCanvas(128, 128), g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    return t;
  }

  // Vertical light streak: bright at the source end, fading along its length.
  // Used flat on the road under neon signs and lamps to fake wet-asphalt reflections.
  function streakTexture() {
    var c = makeCanvas(64, 256), g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    // Narrow in the middle, slightly wider near the source.
    g.beginPath();
    g.moveTo(22, 0); g.lineTo(42, 0); g.lineTo(34, 256); g.lineTo(30, 256);
    g.closePath(); g.fill();
    return new THREE.CanvasTexture(c);
  }

  // Round light pool for the ground under a lamp / police light bar.
  function poolTexture() {
    var c = makeCanvas(128, 128), g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  // Rain streak sprite: thin bright vertical dash.
  function rainTexture() {
    var c = makeCanvas(16, 64), g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(180,210,255,0)');
    grad.addColorStop(0.5, 'rgba(180,210,255,0.9)');
    grad.addColorStop(1, 'rgba(180,210,255,0)');
    g.fillStyle = grad; g.fillRect(6, 0, 4, 64);
    return new THREE.CanvasTexture(c);
  }

  // Building facade: dark concrete with a grid of windows, some lit warm / cyan.
  // Returns { map, emissive } canvases so the lit windows glow at night.
  function facadeTextures(seed, floors, cols) {
    var rng = new RNG(seed);
    var w = cols * 16, h = floors * 20;
    var cm = makeCanvas(w, h), ce = makeCanvas(w, h);
    var gm = cm.getContext('2d'), ge = ce.getContext('2d');
    gm.fillStyle = '#141824'; gm.fillRect(0, 0, w, h);
    ge.fillStyle = '#000000'; ge.fillRect(0, 0, w, h);
    for (var f = 0; f < floors; f++) {
      for (var c = 0; c < cols; c++) {
        var x = c * 16 + 3, y = f * 20 + 4;
        var r = rng.next();
        if (r < 0.42) { // lit warm
          ge.fillStyle = rng.pick(['#ffca6a', '#ffd98a', '#ffb84d', '#9be8ff']);
          ge.fillRect(x, y, 10, 12);
          gm.fillStyle = '#2a2f42'; gm.fillRect(x, y, 10, 12);
        } else if (r < 0.55) { // lit dim cyan
          ge.fillStyle = '#2e6f8e'; ge.fillRect(x, y, 10, 12);
          gm.fillStyle = '#1c2233'; gm.fillRect(x, y, 10, 12);
        } else { // dark glass
          gm.fillStyle = '#0d1322'; gm.fillRect(x, y, 10, 12);
        }
      }
    }
    var mt = new THREE.CanvasTexture(cm), et = new THREE.CanvasTexture(ce);
    mt.colorSpace = THREE.SRGBColorSpace; et.colorSpace = THREE.SRGBColorSpace;
    return { map: mt, emissive: et };
  }

  // Neon shop sign: glowing text on a dark panel, with a bright tube outline.
  function signTexture(name, color, sub) {
    var c = makeCanvas(512, 128), g = c.getContext('2d');
    g.fillStyle = '#070812'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = color; g.lineWidth = 5;
    g.shadowColor = color; g.shadowBlur = 22;
    g.strokeRect(10, 10, 492, 108);
    g.shadowBlur = 26;
    g.fillStyle = '#ffffff';
    g.font = '900 52px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(name, 256, sub ? 52 : 64);
    if (sub) {
      g.font = '700 26px "Segoe UI", Arial, sans-serif';
      g.fillStyle = '#ffffff';
      g.fillText(sub, 256, 98);
    }
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Vertical gradient sky dome texture: deep blue-violet above, warm city glow at horizon.
  function skyTexture() {
    var c = makeCanvas(16, 512), g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#02030a');
    grad.addColorStop(0.45, '#0a0e2a');
    grad.addColorStop(0.72, '#1a1440');
    grad.addColorStop(0.86, '#3a2060');
    grad.addColorStop(1, '#7a3a5e');
    g.fillStyle = grad; g.fillRect(0, 0, 16, 512);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Stylised portrait for the dialogue bar: flat-shaded face with character hair/hat.
  function drawPortrait(canvas, who) {
    var g = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    g.fillStyle = '#10142e'; g.fillRect(0, 0, W, H);
    var skin = { rico: '#c98d5e', lena: '#8a5a3b', rosa: '#b07a4e', dario: '#6e4630' }[who] || '#c98d5e';
    // shoulders
    g.fillStyle = who === 'rico' ? '#ffd21f' : (who === 'lena' ? '#ff7a3d' : (who === 'rosa' ? '#b06fd8' : '#2fae5f'));
    g.beginPath(); g.ellipse(W / 2, H + 12, 30, 26, 0, 0, Math.PI * 2); g.fill();
    // neck + head
    g.fillStyle = skin;
    g.fillRect(W / 2 - 6, 44, 12, 12);
    g.beginPath(); g.ellipse(W / 2, 32, 20, 23, 0, 0, Math.PI * 2); g.fill();
    // hair / hat
    if (who === 'rico') {
      g.fillStyle = '#e62129';
      g.beginPath(); g.ellipse(W / 2, 18, 21, 12, 0, Math.PI, 0); g.fill();
      g.fillRect(W / 2 - 22, 15, 44, 5);
    } else if (who === 'lena') {
      g.fillStyle = '#1c1c22';
      g.beginPath(); g.ellipse(W / 2, 20, 21, 14, 0, Math.PI, 0); g.fill();
      g.fillRect(12, 26, 6, 18); g.fillRect(54, 26, 6, 18);
    } else if (who === 'rosa') {
      g.fillStyle = '#e8e8e8';
      g.beginPath(); g.ellipse(W / 2, 16, 20, 11, 0, Math.PI, 0); g.fill();
    } else {
      g.fillStyle = '#101010';
      g.beginPath(); g.ellipse(W / 2, 19, 20, 10, 0, Math.PI, 0); g.fill();
    }
    // eyes + smile
    g.fillStyle = '#14100c';
    g.beginPath(); g.arc(W / 2 - 8, 32, 2.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(W / 2 + 8, 32, 2.6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#5a3220'; g.lineWidth = 2;
    g.beginPath(); g.arc(W / 2, 40, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }

  SB.utils = {
    RNG: RNG, clamp: clamp, lerp: lerp, damp: damp, angleLerp: angleLerp,
    dist2: dist2, $: $, el: el, makeCanvas: makeCanvas,
    glowTexture: glowTexture, streakTexture: streakTexture, poolTexture: poolTexture,
    rainTexture: rainTexture, facadeTextures: facadeTextures, signTexture: signTexture,
    skyTexture: skyTexture, drawPortrait: drawPortrait
  };
})();
