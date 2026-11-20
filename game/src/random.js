// SOLMAR BAY — a small seeded random number generator so the city is the same
// on every load (deterministic layout, deterministic screenshots).

var SB = window.SB || (window.SB = {});

SB.random = (function () {
  // mulberry32 — tiny, fast, deterministic.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(20261120);

  return {
    // Float in [0, 1).
    next: function () { return rand(); },
    // Float in [min, max).
    range: function (min, max) { return min + rand() * (max - min); },
    // Integer in [min, max] inclusive.
    int: function (min, max) { return Math.floor(rand() * (max - min + 1)) + min; },
    // One item from an array.
    pick: function (arr) { return arr[Math.floor(rand() * arr.length)]; },
  };
})();
