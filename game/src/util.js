// Sirena Bay — small shared helpers: a seeded random stream so the city is
// the same every run, a few math helpers, and canvas-texture makers. Every
// texture in the game is painted on a canvas at load time: no image files,
// no network request, nothing downloaded.

(function () {
  'use strict';

  // mulberry32 — tiny deterministic PRNG. One stream per purpose keeps the
  // city, the traffic and the pedestrians independent of load order.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function range(rng, lo, hi) {
    return lo + rng() * (hi - lo);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // A canvas of the given size with a 2D context, ready to paint on.
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { canvas: c, ctx: c.getContext('2d') };
  }

  // Paint with a callback, then wrap the canvas in a three.js texture with
  // correct colour space. Repeat wrapping is optional for tiled surfaces.
  function makeTexture(w, h, painter, repeat) {
    const { canvas, ctx } = makeCanvas(w, h);
    painter(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    return tex;
  }

  // A soft ellipse (radial gradient fading to transparent) — the workhorse
  // for cheeks, shading, glows and soft shadows on painted textures.
  function softEllipse(ctx, x, y, rx, ry, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, colorWithAlpha(color, alpha));
    g.addColorStop(1, colorWithAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function colorWithAlpha(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // A rounded rectangle path, for signs, cards and face features.
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.SB = window.SB || {};
  window.SB.util = { makeRng, pick, range, clamp, lerp, makeCanvas, makeTexture, softEllipse, colorWithAlpha, roundRect };
})();
