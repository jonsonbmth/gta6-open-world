// Deterministic seeded random numbers (mulberry32). Every procedural choice in
// the world — building heights, traffic colours, pedestrian clothes — draws from
// one stream per seed, so the same seed always builds the same city.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function range(random, min, max) {
  return min + random() * (max - min);
}

export function rangeInt(random, min, max) {
  return Math.floor(range(random, min, max + 1));
}
