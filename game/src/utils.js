// SOLMAR BAY — small utilities: seeded random, math, canvas helpers.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var U = {};

  // Deterministic RNG (mulberry32) so screenshots reproduce with ?seed=.
  U.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.rand = function (rng, lo, hi) { return lo + rng() * (hi - lo); };
  U.pick = function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; };
  U.dist2 = function (ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return dx * dx + dz * dz;
  };
  U.angleLerp = function (a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };

  // Read a query param (?shot=chase, ?seed=1, ?perf=low, ?playtest=1).
  U.param = function (name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  };

  // Make a canvas of the given size.
  U.canvas = function (w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  // Rounded-rectangle path on a 2D context.
  U.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Soft radial glow texture (white core fading out) — tinted per sprite.
  U.glowTexture = function () {
    if (U._glow) return U._glow;
    var c = U.canvas(128, 128);
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    U._glow = tex;
    return tex;
  };

  // Vertical streak texture: bright at the top, fading down — the wet-road
  // reflection trick. Used as an additive plane lying on the road.
  U.streakTexture = function () {
    if (U._streak) return U._streak;
    var c = U.canvas(32, 256);
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 256);
    // Soften the horizontal edges.
    var side = ctx.createLinearGradient(0, 0, 32, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)');
    side.addColorStop(0.3, 'rgba(0,0,0,0)');
    side.addColorStop(0.7, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 32, 256);
    var tex = new THREE.CanvasTexture(c);
    U._streak = tex;
    return tex;
  };

  // Thin rain streak texture for the rain Points material.
  U.rainTexture = function () {
    if (U._rain) return U._rain;
    var c = U.canvas(8, 32);
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, 'rgba(180,200,255,0)');
    g.addColorStop(0.5, 'rgba(180,200,255,0.85)');
    g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(2, 0, 4, 32);
    var tex = new THREE.CanvasTexture(c);
    U._rain = tex;
    return tex;
  };

  // An additive glow sprite at a position, scaled and tinted.
  U.glowSprite = function (color, scale, opacity) {
    var mat = new THREE.SpriteMaterial({
      map: U.glowTexture(),
      color: color,
      transparent: true,
      opacity: opacity == null ? 0.85 : opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    return s;
  };

  // A fake wet-road reflection: an additive streak plane lying flat on the
  // road under a light source, stretched along the road.
  U.reflectionStreak = function (color, width, length, opacity) {
    var mat = new THREE.MeshBasicMaterial({
      map: U.streakTexture(),
      color: color,
      transparent: true,
      opacity: opacity == null ? 0.5 : opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.06;
    return m;
  };

  // A soft colored pool of light on the ground (police, lamps).
  U.lightPool = function (color, radius, opacity) {
    var mat = new THREE.MeshBasicMaterial({
      map: U.glowTexture(),
      color: color,
      transparent: true,
      opacity: opacity == null ? 0.4 : opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.05;
    return m;
  };

  SB.utils = U;
})();
