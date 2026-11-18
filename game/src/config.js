// SOLMAR BAY — shared constants: palette, city layout, names.
// Every name here is invented for this game. The night is BRIGHT neon rain:
// a purple-blue sky, glowing streets, wet asphalt full of reflections.

export const PALETTE = {
  skyTop: 0x070b26,
  skyHorizon: 0x2a1b52,
  fog: 0x141a3a,
  asphalt: 0x0c0f1e,
  sidewalk: 0x1a1e30,
  water: 0x0a1e3a,
  sand: 0x2a2438,
  neonPink: '#ff2d95',
  neonCyan: '#00e5ff',
  neonAmber: '#ffb020',
  neonGreen: '#39ff88',
  neonViolet: '#a06bff',
  neonOrange: '#ff6b2d',
  heroRed: 0xe62129,
  policeRed: 0xff2222,
  policeBlue: 0x2266ff,
  lampWarm: 0xffb45e,
  windowWarm: '#ffd489',
  windowCool: '#9fd8ff',
};

// City bounds (metres). The bay lies west of x = -200.
export const CITY = {
  minX: -320, maxX: 320, minZ: -320, maxZ: 320,
  coastX: -200,
  // Lumen Avenue: the main boulevard, north-south at x = 0.
  avenueX: 0, avenueHalfWidth: 12,
  // Cross streets (east-west) and side streets (north-south).
  crossStreetsZ: [-240, -160, -80, 0, 80, 160, 240],
  sideStreetsX: [-160, -80, 80, 160],
  streetHalfWidth: 7,
  ringRadius: 285,
};

// Five named districts. Each has a colour used by the minimap and the AAA city map.
export const DISTRICTS = [
  { id: 'lumen', name: 'LUMEN STRIP', x0: -80, z0: -80, x1: 80, z1: 80, color: '#ff2d95', blurb: 'Downtown neon core' },
  { id: 'harbour', name: 'OLD HARBOUR', x0: -200, z0: 80, x1: -80, z1: 240, color: '#00e5ff', blurb: 'Piers, boats, warehouses' },
  { id: 'marina', name: 'MARINA DEL SOL', x0: -200, z0: -240, x1: -80, z1: -80, color: '#ffb020', blurb: 'Beachfront hotels' },
  { id: 'vista', name: 'VISTA HEIGHTS', x0: 80, z0: -240, x1: 280, z1: -80, color: '#a06bff', blurb: 'Hillside homes' },
  { id: 'coral', name: 'CORAL DOCKS', x0: 80, z0: 80, x1: 280, z1: 240, color: '#39ff88', blurb: 'Docks and containers' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  if (x < CITY.coastX) return { id: 'bay', name: 'SOLMAR BAY', color: '#00e5ff', blurb: 'Open water' };
  return { id: 'outskirts', name: 'OUTSKIRTS', color: '#8899bb', blurb: 'Ring highway' };
}

// Eight landmarks for the AAA city map.
export const LANDMARKS = [
  { name: 'Lumen Tower', x: 24, z: -32, icon: 'tower' },
  { name: 'The Meridian', x: -48, z: -120, icon: 'hotel' },
  { name: 'Pier 9', x: -216, z: 150, icon: 'anchor' },
  { name: 'Old Lighthouse', x: -248, z: -56, icon: 'light' },
  { name: 'Galaxy Bowl', x: 128, z: 24, icon: 'star' },
  { name: 'Coral Market', x: 180, z: 160, icon: 'shop' },
  { name: 'Solmar Bridge', x: -232, z: -40, icon: 'bridge' },
  { name: 'Pelican Isle', x: -264, z: -40, icon: 'isle' },
];

// Neon shopfronts along Lumen Avenue. All names invented for this game.
export const SHOPS = [
  { name: 'LA LUNA', color: '#ff2d95', kind: 'bar' },
  { name: 'VOLT', color: '#00e5ff', kind: 'electronics' },
  { name: 'TIDE & TACO', color: '#ffb020', kind: 'food' },
  { name: 'MIRAGE', color: '#a06bff', kind: 'club' },
  { name: 'HOTEL AZUL', color: '#00e5ff', kind: 'hotel' },
  { name: 'CASA FUEGO', color: '#ff6b2d', kind: 'food' },
  { name: 'PIER 9', color: '#39ff88', kind: 'bar' },
  { name: 'SUENO MOTEL', color: '#ff2d95', kind: 'motel' },
  { name: 'GALAXY BOWL', color: '#a06bff', kind: 'bowling' },
  { name: 'EL FARO', color: '#ffb020', kind: 'cafe' },
  { name: 'MIDNIGHT GARAGE', color: '#00e5ff', kind: 'garage' },
  { name: 'SOL CAFE', color: '#ffb020', kind: 'cafe' },
  { name: 'AQUA BAR', color: '#00e5ff', kind: 'bar' },
  { name: 'LUMEN LANES', color: '#39ff88', kind: 'bowling' },
  { name: 'CORAL CLUB', color: '#ff2d95', kind: 'club' },
  { name: 'TURBO WASH', color: '#00aaff', kind: 'carwash' },
];

// Radio stations (procedural WebAudio, no audio files).
export const RADIO = [
  {
    id: 'waveform', name: 'WAVEFORM 88.1', genre: 'Synthwave',
    tracks: ['Midnight Overdrive', 'Rain on Lumen Ave', 'Ultraviolet'],
    bpm: 112, root: 55, scale: [0, 3, 5, 7, 10], bright: true,
  },
  {
    id: 'palma', name: 'PALMA 104.2', genre: 'Latin funk',
    tracks: ['Harbour Lights', 'Palm Shadows', 'Coastal Run'],
    bpm: 98, root: 65.41, scale: [0, 2, 4, 7, 9], bright: false,
  },
  {
    id: 'static', name: 'STATIC 97.6', genre: 'Lo-fi beats',
    tracks: ['Velvet Storm', 'Neon Tide', 'Slow Marina'],
    bpm: 84, root: 49, scale: [0, 3, 5, 7, 12], bright: false,
  },
];

// Traffic car models (hero car is the VULPINE S).
export const TRAFFIC_MODELS = [
  { name: 'COMET', type: 'sedan', colors: [0x2b6cb0, 0x718096, 0x9b2c2c] },
  { name: 'SUNDOWN', type: 'coupe', colors: [0xd69e2e, 0x2d3748, 0x744210] },
  { name: 'BARRACUDA', type: 'muscle', colors: [0x1a202c, 0x97266d, 0x276749] },
  { name: 'PELICAN', type: 'van', colors: [0xe2e8f0, 0x4a5568, 0x2c5282] },
  { name: 'TORO', type: 'suv', colors: [0x2d3748, 0x744210, 0x1a365d] },
  { name: 'TAXI', type: 'taxi', colors: [0xf6c90e] },
];

// The crew.
export const CREW = {
  rico: { name: 'Rico Marín', role: 'Driver', coat: '#ffd60a', skin: '#c98d5e', hair: '#1a1210', hat: 'hood' },
  lena: { name: "Lena 'Wrench' Ortiz", role: 'Mechanic', coat: '#ff2d95', skin: '#8d5524', hair: '#2b0f1e', hat: 'goggles' },
  dario: { name: "Dario 'Fuze' Kane", role: 'Muscle', coat: '#00e5ff', skin: '#e8b08a', hair: '#3a2415', hat: 'bandana' },
  rosa: { name: 'Mama Rosa', role: 'The Fixer', coat: '#a06bff', skin: '#b57a4a', hair: '#e8e8e8', hat: 'bun' },
};

// Police units.
export const POLICE_UNITS = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 33', 'UNIT 45'];
export const HELI_NAME = 'AIR-1';

// Gameplay tuning.
export const TUNE = {
  heroTopSpeed: 62,        // m/s (~223 km/h)
  heroAccel: 26,
  heroBrake: 42,
  trafficSpeed: 11,
  policeTopSpeed: 58,
  wantedDecayPerSec: 0.02,
  nearMissDist: 4.5,
  nearMissReward: 250,
  startMoney: 42780,
  startRespect: 320,
  respectMax: 1000,
};
