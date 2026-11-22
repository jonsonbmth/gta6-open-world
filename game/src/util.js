// util.js — shared helpers for AURELIA BAY: a deterministic seeded RNG and
// small math/color helpers. Everything the game builds is seeded, so two
// runs of the game produce the same world (the dossier and the playtest
// both rely on that determinism).

(function () {
  'use strict';

  // mulberry32: a tiny fast seeded PRNG with a 32-bit state.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function range(rng, lo, hi) {
    return lo + rng() * (hi - lo);
  }

  // Parse a #rrggbb hex string into {r, g, b} (0-255 each). Returns null
  // for anything that is not a six-digit hex color.
  function hexToRgb(hex) {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  // Lighten (amount > 0) or darken (amount < 0) a hex color by a fraction.
  function shade(hex, amount) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var f = function (v) {
      var n = amount >= 0 ? v + (255 - v) * amount : v * (1 + amount);
      return Math.max(0, Math.min(255, Math.round(n)));
    };
    var toHex = function (v) {
      return ('0' + v.toString(16)).slice(-2);
    };
    return '#' + toHex(f(rgb.r)) + toHex(f(rgb.g)) + toHex(f(rgb.b));
  }

  window.AB = window.AB || {};
  window.AB.util = {
    mulberry32: mulberry32,
    clamp: clamp,
    lerp: lerp,
    pick: pick,
    range: range,
    hexToRgb: hexToRgb,
    shade: shade,
  };
})();
