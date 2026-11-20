// SOLMAR BAY — configuration: city layout, districts, streets, palette, missions.
// All names are original inventions for this game.
export const GAME_TITLE = 'SOLMAR BAY';
export const GAME_SUBTITLE = 'A Golden Hour in Neon';
export const HERO_NAME = 'Rico Marín';
export const HERO_CAR = 'VULPINE S';

// City grid: streets run along x and z. Blocks sit between street lines.
export const STREET_X = [-320, -240, -160, -80, 0, 80, 160, 240, 320];
export const STREET_Z = [-240, -160, -80, 0, 80, 160, 240];
export const ROAD_HALF = 7; // half width of a road surface
export const CITY = { minX: -360, maxX: 360, minZ: -280, maxZ: 280 };
export const SEA_X = 380; // the sea starts east of this line
export const BEACH_X = 360;

export const STREET_NAMES_X = [
  'NORTH BAY RD', 'CORAL LANE', 'GULL STREET', 'PALM AVENUE', 'CENTRAL AVE',
  'SUNSET BLVD', 'HARBOR ROAD', 'OCEAN DRIVE', 'BAY STREET',
];
export const STREET_NAMES_Z = [
  'CROWN ROAD', 'CANAL STREET', 'PALM BOULEVARD', 'SOLMAR AVENUE',
  'SUNSET BLVD', 'HARBOR ROAD', 'OCEAN DRIVE',
];

export const DISTRICTS = [
  { name: 'CROWN HEIGHTS', x0: -360, z0: -280, x1: -80, z1: -80, color: '#8f7bd8' },
  { name: 'MIRAMAR', x0: -80, z0: -280, x1: 160, z1: -80, color: '#e08a5a' },
  { name: 'VELA QUARTER', x0: -360, z0: -80, x1: -80, z1: 80, color: '#d8c25a' },
  { name: 'THE DOCKS', x0: -80, z0: -80, x1: 160, z1: 80, color: '#5ad8c2' },
  { name: 'HARBOUR LIGHTS', x0: 160, z0: -80, x1: 360, z1: 80, color: '#5a8ad8' },
  { name: 'PALM ROW', x0: -160, z0: 80, x1: 160, z1: 280, color: '#d85a8a' },
  { name: 'MARINA BAY', x0: 160, z0: 80, x1: 360, z1: 280, color: '#5ad8e0' },
  { name: 'SOLMAR BEACH', x0: 360, z0: -280, x1: 440, z1: 280, color: '#e0c25a' },
];

export const LANDMARKS = [
  { name: 'CROWN TOWER', x: -200, z: -160 },
  { name: 'VELA MARKET', x: -200, z: 120 },
  { name: 'PALM ROW PLAZA', x: 0, z: 240 },
  { name: "LENA'S WORKSHOP", x: 200, z: 120 },
  { name: 'LIGHTHOUSE', x: 330, z: -200 },
  { name: 'PELICAN ISLE', x: 420, z: 40 },
  { name: 'DOCKSIDE YARD', x: 280, z: 200 },
  { name: 'OLD PIER', x: 330, z: 240 },
];

// Golden-hour palette.
export const PALETTE = {
  skyTop: 0x6fa8d8,
  skyHorizon: 0xffb347,
  sun: 0xffd27a,
  fog: 0xf7c98a,
  fogDensity: 0.0011,
  sunDir: { x: -0.55, y: 0.62, z: -0.45 }, // southwest, high, behind/above the camera
  sunColor: 0xffd9a0,
  hemiSky: 0xbfd9ee,
  hemiGround: 0x8a6a4a,
  asphalt: 0x33333a,
  asphaltWet: 0x2a2a30,
  sidewalk: 0x9a938a,
  sand: 0xd8b878,
  sea: 0x1a5a7a,
  buildingBase: ['#e8dcc8', '#d8c8a8', '#c8d8e0', '#e0c8b8', '#d0d0c8', '#e8e0d0'],
  glass: ['#2a4a6a', '#3a5a7a', '#1a3a5a', '#4a6a8a'],
};

// Sunset Sprint: 6 checkpoints across the city, in order.
export const CHECKPOINTS = [
  { name: 'Ocean Drive North', x: 320, z: -200 },
  { name: 'Crown Road', x: -240, z: -240 },
  { name: 'Vela Market', x: -200, z: 120 },
  { name: 'Palm Row Plaza', x: 0, z: 240 },
  { name: 'Dockside Yard', x: 280, z: 200 },
  { name: 'Marina Bay', x: 320, z: 240 },
];

export const CREW = [
  { name: 'Lena "Wrench" Ortiz', color: '#ff5a8a', role: 'Mechanic — your crew chief' },
  { name: 'Dario Voss', color: '#5a8aff', role: 'Driver — getaway specialist' },
  { name: 'Mama Rosa', color: '#ffd25a', role: 'Fixer — she knows everyone' },
];

export const DIALOGUE = {
  start: { who: 'Lena "Wrench" Ortiz', text: 'Two units on your tail, Rico — lose them on Palm Row!' },
  marina: { who: 'Mama Rosa', text: 'Tonight the city learns our name, Rico. Drive it home.' },
  drift: { who: 'Dario Voss', text: 'Now THAT is how you drift. Keep it sideways!' },
  nearMiss: { who: 'Lena "Wrench" Ortiz', text: 'Close! The cops saw that one. Keep moving!' },
};

export const SHOP_SIGNS = [
  'RAMEN YOKO', 'FLOWER KIOSK', 'TACOS EL FARO', 'CLUB NEON', 'MARKET',
  'SHOP', 'PIZZA SOL', 'BAR VELA', 'HOTEL MIRAMAR', 'BAKERY SOL', 'ARCADE 24',
  'GYM IRON', 'PHARMACY', 'BOOKS & CO', 'SURF SHOP', 'DONUTS',
];

export const RADIO = [
  { station: 'VAPOR 101.3', song: 'Glass Horizon — Neon Palms' },
  { station: 'SOLMAR 99.5', song: 'Sunset Drive — The Gulls' },
  { station: 'VELA FM', song: 'Harbour Lights — Marina Blue' },
];
