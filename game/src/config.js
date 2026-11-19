// SOLMAR BAY — shared constants: palette, districts, chapters, shops, radio.
// Palette rule (V12): NATURAL golden hour. Blue sky above, warm gold at the
// horizon, buildings in cream / sand / white / pale yellow / glass blue.
// Neon is an accent, never the dominant color. No purple or magenta sky.
export const PALETTE = {
  skyTop: 0x4a7ec2,
  skyMid: 0x8fb4dd,
  skyHorizon: 0xf2b25c,
  sun: 0xffd9a0,
  sunLow: 0xff9e57,
  fog: 0xe8c48d,
  fogDensity: 0.0016,
  ambient: 0xffe3b8,
  ambientIntensity: 0.85,
  sunIntensity: 2.4,
  buildingTones: [0xf2e3c6, 0xe8d3ac, 0xf7f3e8, 0xf0d9a0, 0xcfe0ea, 0xe5cfa8, 0xf5e9d0],
  road: 0x2b2b30,
  sidewalk: 0x9a938a,
  water: 0x2e6f8e,
};

export const WORLD = {
  avenueX: 0,
  avenueHalf: 7,
  avenueNorth: -120,
  avenueSouth: 120,
  streets: [-80, -40, 0, 40, 80],
  marinaX0: 62,
  marinaX1: 118,
  marinaZ0: -30,
  marinaZ1: 50,
  groundSize: 320,
};

export const DISTRICTS = [
  { name: 'CROWN HEIGHTS', x0: -104, x1: -24, z0: -104, z1: -24, color: '#8a7fd6' },
  { name: 'VELA QUARTER', x0: -104, x1: -24, z0: 24, z1: 104, color: '#e8c832' },
  { name: 'PALM ROW', x0: -24, x1: 24, z0: 56, z1: 104, color: '#e87fb0' },
  { name: 'MIRAMAR', x0: 24, x1: 104, z0: -104, z1: -24, color: '#e88a4a' },
  { name: 'THE DOCKS', x0: 24, x1: 104, z0: 24, z1: 56, color: '#4ad6b0' },
  { name: 'HARBOUR LIGHTS', x0: 24, x1: 104, z0: 56, z1: 104, color: '#4a9ae8' },
];

export const STREETS = [
  { name: 'SOLMAR AVENUE', vertical: true, at: 0 },
  { name: 'CROWN ROAD', vertical: false, at: -80 },
  { name: 'CANAL STREET', vertical: false, at: -40 },
  { name: 'VELA STREET', vertical: false, at: 40 },
  { name: 'PALM BOULEVARD', vertical: false, at: 80 },
  { name: 'RICO WAY', vertical: true, at: -48 },
  { name: 'HARBOUR WAY', vertical: true, at: 48 },
];

export const LANDMARKS = [
  { name: 'CROWN TOWER', x: -64, z: -64 },
  { name: 'VELA MARKET', x: -64, z: 56 },
  { name: 'PALM ROW PLAZA', x: 0, z: 88 },
  { name: "LENA'S WORKSHOP", x: 64, z: 48 },
  { name: 'DOCKSIDE YARD', x: 80, z: 72 },
  { name: 'OLD PIER', x: 96, z: 96 },
  { name: 'MIRAMAR BEACH', x: 56, z: -72 },
  { name: 'LIGHTHOUSE', x: 96, z: -96 },
  { name: 'PELICAN ISLE', x: 130, z: -40 },
  { name: 'HARBOR BRIDGE', x: 60, z: -60 },
];

export const CHAPTERS = [
  { id: 1, title: 'First Run', objective: 'Drive to the garage on Crown Road', next: 'Follow the GPS route to Crown Road', target: { x: 0, z: -88 }, speaker: 'lena', line: 'Two units on your tail, Rico — lose them on Palm Row!' },
  { id: 2, title: 'Harbour Lights', objective: 'Meet the contact at the marina', next: 'Head east to the docks', target: { x: 88, z: 8 }, speaker: 'rosa', line: 'Tonight the city learns our name, Rico. Drive it home.' },
  { id: 3, title: 'Wrench Work', objective: "Get the VULPINE S tuned at Lena's workshop", next: "Drive to Lena's Workshop", target: { x: 64, z: 48 }, speaker: 'lena', line: 'Bring her in hot and I will make her faster. Trust me.' },
  { id: 4, title: 'The Faro Run', objective: 'Deliver the package to Tacos El Faro', next: 'Keep it under 3 stars', target: { x: -24, z: -40 }, speaker: 'dario', line: 'No stops, no sirens, no heroes. Just drive, Rico.' },
  { id: 5, title: 'Crown Heights', objective: 'Pick up the crew at Crown Tower', next: 'Watch the rooftops', target: { x: -64, z: -64 }, speaker: 'rosa', line: 'The whole city is watching tonight. Give them a show.' },
  { id: 6, title: 'Bridge Jump', objective: 'Lose the heat across the Harbor Bridge', next: 'AIR-1 is overhead — stay low', target: { x: 60, z: -60 }, speaker: 'dario', line: 'Bridge is clear for thirty seconds. Do not waste them.' },
  { id: 7, title: 'Homecoming', objective: 'Bring the VULPINE S home to Palm Row', next: 'Final run — make it count', target: { x: 0, z: 88 }, speaker: 'lena', line: 'Home stretch, Rico. This city is ours now.' },
];

export const CREW = {
  lena: { name: 'Lena "Wrench" Ortiz', initial: 'L', color: '#c2185b' },
  rosa: { name: 'Mama Rosa', initial: 'R', color: '#5e35b1' },
  dario: { name: 'Dario "Fuze" Kane', initial: 'D', color: '#1565c0' },
  rico: { name: 'Rico Marín', initial: 'R', color: '#ef6c00' },
};

export const SHOPS = [
  { name: 'RAMEN YOKO', color: '#ff5a5a' },
  { name: 'PIZZA LUNA', color: '#ffd54d' },
  { name: 'TACOS EL FARO', color: '#ff9e57' },
  { name: 'CLUB VELVET', color: '#ff5a8a' },
  { name: 'BODEGA', color: '#4ad6b0' },
  { name: 'HOTEL LUNA', color: '#37c8f5' },
  { name: 'LIQUOR', color: '#c792ff' },
  { name: 'KEBAB HOUSE', color: '#ffb74d' },
  { name: 'DONUTS', color: '#ff8ab0' },
  { name: 'PHARMACY', color: '#7fe0a8' },
  { name: 'BARBER', color: '#8fd0ff' },
  { name: 'LAUNDRY', color: '#ffe082' },
];

export const RADIO = [
  { name: 'VAPOR 101.3', track: 'Glass Horizon — Neon Palms', bpm: 96, root: 220 },
  { name: 'SOLMAR FM 88.5', track: 'Costa del Sol — The Marínas', bpm: 112, root: 196 },
  { name: 'NIGHT DRIVE 99.5', track: 'Midnight Run — Velvet Static', bpm: 124, root: 174 },
];

export const POLICE_UNITS = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'AIR-1'];

export const START_MONEY = 42780;
export const SAVE_KEY = 'solmar-bay-save-v12';
