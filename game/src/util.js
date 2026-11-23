// Shared helpers for AURELIA BAY: seeded randomness, math and tiny DOM tools.
// Every game file attaches to the single AB namespace on window.
(function () {
  const AB = window.AB || (window.AB = {});

  // Deterministic PRNG (mulberry32) so the city layout is stable run to run.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rng = mulberry32(20261123);

  function rand(a, b) { return a + rng() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function deg(d) { return (d * Math.PI) / 180; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, parent) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  // Eased step for camera and animation blends.
  function smooth(t) { return t * t * (3 - 2 * t); }

  AB.Util = { rng, rand, randInt, pick, clamp, lerp, deg, $, el, smooth, mulberry32 };
})();
