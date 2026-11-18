// Shared game state for SOLMAR BAY. One mutable object, imported by every system.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;
export function angLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

// Seeded RNG: the same seed rebuilds the same city, so screenshots are reproducible.
const params = new URLSearchParams(location.search);
export const SEED = parseInt(params.get('seed') || '7', 10);
export const SHOT = params.get('shot') || '';
export const rng = mulberry32(SEED);

// City layout constants (metres). Main avenue runs along Z at x = 0.
export const CITY = {
  avenueX: 0, avenueHalf: 9,
  crossZ: [-200, -100, 0, 100, 200],
  blockHalf: 34, streetHalf: 7,
  north: -320, south: 320, west: -210, east: 210,
  marinaZ: 265, downtownZ: -260,
  garage: { x: -52, z: 96 },        // Lena's garage, west side
  safehouse: { x: 44, z: -148 },    // Rico's apartment
  impound: { x: 120, z: -40 },      // impound lot, east side
};

// The single game state object.
export const S = {
  mode: 'title', // title | playing | paused | map | garage | busted | wasted
  time: 22.78,   // 22:47, game clock hours
  day: 1,
  money: 42780, rep: 320, respect: 3,
  health: 82, armour: 45,
  wanted: 0, wantedTimer: 0,
  weapon: 1, ammo: [Infinity, 24, 90, 12, 60],
  radio: 0, radioOn: true,
  mission: 0, stage: 0, objective: null,
  inCar: false, car: null, speedKmh: 0,
  player: { x: 0, z: 40, heading: Math.PI, onFoot: true },
  kills: 0, nearMisses: 0, drifts: 0,
  startedAt: performance.now(),
  muted: false,
};

export const WEAPONS = [
  { name: 'FISTS', dmg: 12, range: 2.2 },
  { name: 'PISTOL', dmg: 26, range: 60 },
  { name: 'SMG', dmg: 14, range: 45 },
  { name: 'SHOTGUN', dmg: 55, range: 18 },
  { name: 'RIFLE', dmg: 45, range: 120 },
];

export const STATIONS = [
  { name: 'WAVEFORM 88.1', song: 'Glass Harbour — Midnight Static', hue: '#7ee2ff', bpm: 96, minor: true },
  { name: 'VELVET FM 104.6', song: 'Mara Voss — Rain On Neon', hue: '#ff2d95', bpm: 78, minor: true },
  { name: 'TIDE 97.3', song: 'The Breakers — Low Tide Run', hue: '#ffd23f', bpm: 118, minor: false },
];

export const DISTRICTS = [
  { name: 'LUMEN AVENUE', x0: -30, x1: 30, z0: -240, z1: 240 },
  { name: 'OLD HARBOUR', x0: -210, x1: 210, z0: 240, z1: 330 },
  { name: 'DOWNTOWN', x0: -210, x1: 210, z0: -330, z1: -240 },
  { name: 'WESTSIDE', x0: -210, x1: -30, z0: -240, z1: 240 },
  { name: 'EASTSIDE', x0: 30, x1: 210, z0: -240, z1: 240 },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.name;
  return 'SOLMAR BAY';
}
