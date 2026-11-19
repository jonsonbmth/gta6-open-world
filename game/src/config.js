// SOLMAR BAY — shared constants: dusk palette, city layout, names.
// Everything in this file is original: our own city, people, cars, stations.

export const SEED_DEFAULT = 1;

// --- Dusk palette (V11: BRIGHT golden hour, not midnight) -----------------
export const PALETTE = {
  skyTop: 0x2a3a7d, // deep blue-violet, high up
  skyMid: 0x8a5aa8, // purple band
  skyHorizon: 0xff9e64, // warm orange at the horizon
  sunCore: 0xfff3c4, // sun disc
  sunGlow: 0xffb36b,
  fog: 0xe8967a, // warm haze
  hemiSky: 0xffd9b0,
  hemiGround: 0x6b5570,
  sunLight: 0xffb070,
  ambient: 0x8a7a9a,
  asphalt: 0x33323a,
  sidewalk: 0x9a938a,
  heroRed: 0xd81e28,
  policeBlack: 0x1c2230,
  policeWhite: 0xe8ecf2,
};

// --- City layout (world units; avenue runs along Z, north = +Z) ------------
export const CITY = {
  avenueX: 0, // Solmar Avenue centre line
  avenueHalfWidth: 7,
  avenueZMin: -140,
  avenueZMax: 140,
  crossStreets: [-90, -45, 0, 45, 90], // z of east-west streets
  blockDepth: 30, // building blocks sit this deep off the avenue
  marinaX: 96, // marina quay centre
  marinaZ: 0,
  bayX: 150, // open water starts here
  skylineZ: -128, // downtown towers
  bounds: 165, // playable radius-ish box half-size
};

// Districts for the map + HUD labels. Each: name, rect [x0,z0,x1,z1], colour.
export const DISTRICTS = [
  { name: 'CROWN HEIGHTS', rect: [-120, -120, -20, -60], color: '#8a6fd0' },
  { name: 'MIRAMAR', rect: [20, -120, 120, -60], color: '#e08a4a' },
  { name: 'VELA QUARTER', rect: [-120, -60, -20, 20], color: '#d0b43a' },
  { name: 'DOCKSIDE', rect: [20, -20, 120, 40], color: '#3aa88a' },
  { name: 'PALM ROW', rect: [-120, 20, -20, 120], color: '#d05a8a' },
  { name: 'HARBOUR LIGHTS', rect: [20, 40, 120, 120], color: '#4a8ad0' },
  { name: 'THE DOCKS', rect: [80, -40, 140, 40], color: '#3aa88a' },
];

// Landmarks (name, x, z) — drawn on the map, one label each.
export const LANDMARKS = [
  { name: 'CROWN TOWER', x: -70, z: -95 },
  { name: 'MIRAMAR BEACH', x: 55, z: -95 },
  { name: 'LIGHTHOUSE', x: 108, z: -105 },
  { name: 'VELA MARKET', x: -60, z: -10 },
  { name: "LENA'S WORKSHOP", x: 60, z: 0 },
  { name: 'DOCKSIDE YARD', x: 80, z: 25 },
  { name: 'PALM ROW PLAZA', x: -70, z: 80 },
  { name: 'OLD PIER', x: 105, z: 55 },
  { name: 'PELICAN ISLE', x: 140, z: -30 },
  { name: 'HARBOR BRIDGE', x: 135, z: -60 },
];

// Shop names — invented for SOLMAR BAY (never the competitor's names).
export const SHOPS = [
  { name: 'TACOS EL FARO', color: '#ff9e2c' },
  { name: 'CLUB VELVET', color: '#ff4d8d' },
  { name: 'PIZZA LUNA', color: '#ffd23a' },
  { name: 'RAMEN YOKO', color: '#ff5a3a' },
  { name: 'HOTEL MIRAMAR', color: '#3ad0ff' },
  { name: 'BODEGA SOL', color: '#7dff6a' },
  { name: 'CAFE BRISA', color: '#ff8a5c' },
  { name: 'VINYL HAVEN', color: '#c07dff' },
  { name: 'SURF & SUPPLY', color: '#3affd0' },
  { name: 'BAR EL ANCLA', color: '#ff3a6a' },
  { name: 'DULCE VIDA', color: '#ffe066' },
  { name: 'AUTO SPA', color: '#5ca8ff' },
];

export const RADIO = [
  { name: 'VAPOR 101.3', song: 'Glass Horizon — Neon Palms', hue: 0.55 },
  { name: 'SOLMAR FM 88.1', song: 'Midnight Ferry — The Breakers', hue: 0.08 },
  { name: 'COSTA DEL SOUL', song: 'Golden Hour — Marisol Vega', hue: 0.85 },
];

export const CREW = {
  rico: { name: 'Rico Marín', color: '#ffd23a', skin: '#c68a5e', hair: '#2a1a10' },
  lena: { name: 'Lena "Wrench" Ortiz', color: '#ff7ab0', skin: '#a06a42', hair: '#1a1a1a' },
  rosa: { name: 'Mama Rosa', color: '#b08aff', skin: '#b57a52', hair: '#e8e8e8' },
  dario: { name: 'Dario "Fuze" Kane', color: '#7ad0ff', skin: '#8a5a3a', hair: '#3a2410' },
};

// Chase-shot staging (shared by shots.js and the playtest).
export const CHASE = {
  heroStart: { x: 1.6, z: -12 },
  policeAhead: [
    { x: -2.2, z: 8 },
    { x: 3.4, z: 26 },
  ],
  camBack: 6.6,
  camSide: 2.6,
  camHeight: 2.3,
  camLookAhead: 5,
  speedKmh: 167,
};

// Deterministic RNG (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}
