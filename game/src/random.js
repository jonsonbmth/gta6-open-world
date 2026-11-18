// SOLMAR BAY — deterministic seeded random numbers so every screenshot
// preset and every playtest run builds the same city.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }
  /** float in [0, 1) */
  f() { return this.next(); }
  /** float in [min, max) */
  range(min, max) { return min + this.next() * (max - min); }
  /** int in [min, max] */
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  /** pick one element */
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** true with probability p */
  chance(p) { return this.next() < p; }
  /** -1 or 1 */
  sign() { return this.next() < 0.5 ? -1 : 1; }
}
