// Aurelia Bay — shared utilities: seeded random numbers, math helpers, DOM helpers.
// Everything deterministic: one fixed seed drives the whole city so every load
// of the game builds the same streets, the same buildings, the same traffic.
(function () {
  'use strict';

  // mulberry32: small fast seeded PRNG. Same seed, same stream, every run.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The city's one fixed seed. Change it and the whole city re-rolls.
  var CITY_SEED = 20261123;

  function makeRng(seed) {
    var next = mulberry32(seed);
    return {
      next: next,
      range: function (lo, hi) { return lo + next() * (hi - lo); },
      int: function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      chance: function (p) { return next() < p; },
      sign: function () { return next() < 0.5 ? -1 : 1; }
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
  }
  function angleLerp(a, b, t) {
    var d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }
  function dist2(ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return dx * dx + dz * dz;
  }
  function formatMoney(n) {
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function formatClock(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = Math.floor(minutes % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function el(id) { return document.getElementById(id); }
  function show(node, on) {
    if (node) node.style.display = on ? '' : 'none';
  }

  window.AB = window.AB || {};
  window.AB.util = {
    CITY_SEED: CITY_SEED,
    makeRng: makeRng,
    clamp: clamp,
    lerp: lerp,
    damp: damp,
    angleLerp: angleLerp,
    dist2: dist2,
    formatMoney: formatMoney,
    formatClock: formatClock,
    el: el,
    show: show
  };
})();
