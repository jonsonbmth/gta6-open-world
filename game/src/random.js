// Seeded RNG (mulberry32) so the city, traffic and pedestrians are identical
// on every run: screenshots and playtests stay deterministic.
var CV = window.CV || (window.CV = {});

CV.random = (function () {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    this.next = mulberry32(seed);
  }
  RNG.prototype.range = function (min, max) {
    return min + this.next() * (max - min);
  };
  RNG.prototype.int = function (min, max) {
    return Math.floor(this.range(min, max + 1));
  };
  RNG.prototype.pick = function (arr) {
    return arr[Math.floor(this.next() * arr.length)];
  };
  RNG.prototype.chance = function (p) {
    return this.next() < p;
  };

  return { RNG: RNG, mulberry32: mulberry32 };
})();
