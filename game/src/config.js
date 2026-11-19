// SOLMAR BAY — shared constants: world layout, districts, jobs, radio, names.
// The city is a grid of avenues running north (-Z) and streets running east-west.
// Solmar Avenue (x = 0) is the main north-south spine; the marina sits on the bay
// to the east (+X); the sun sets in the south-west so the chase camera, which looks
// north, always sees the lit side of the hero car.

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay-save-v13';
export const BEST_KEY = 'solmar-bay-best-v13';

// World extents (metres). The playable city is roughly 220 x 200.
export const WORLD = {
  minX: -110,
  maxX: 110,
  minZ: -105,
  maxZ: 105,
  avenueX: [-72, -36, 0, 36, 72], // north-south avenues
  streetZ: [-72, -36, 0, 36, 72], // east-west streets
  roadHalf: 5.5,
};

// Six districts, each with a map colour and a centre. The map draws them in this order.
export const DISTRICTS = [
  { name: 'CROWN HEIGHTS', x: -72, z: -72, w: 62, h: 52, color: '#7c6bd6', label: '#b7a8ff' },
  { name: 'MIRAMAR', x: 30, z: -72, w: 62, h: 52, color: '#d97b4a', label: '#ffb287' },
  { name: 'VELA QUARTER', x: -72, z: 30, w: 62, h: 52, color: '#d9b84a', label: '#ffe28a' },
  { name: 'THE DOCKS', x: 30, z: 30, w: 62, h: 52, color: '#3fb8a6', label: '#7fe8d8' },
  { name: 'HARBOUR LIGHTS', x: 30, z: 62, w: 62, h: 34, color: '#4a90d9', label: '#8fc3ff' },
  { name: 'PALM ROW', x: -36, z: 62, w: 62, h: 34, color: '#d94a8a', label: '#ff8fc0' },
];

export const LANDMARKS = [
  { name: 'CROWN TOWER', x: -54, z: -54, icon: '▲' },
  { name: 'LIGHTHOUSE', x: 78, z: -78, icon: '▲' },
  { name: 'VELA MARKET', x: -54, z: 54, icon: '▲' },
  { name: "LENA'S WORKSHOP", x: 54, z: 54, icon: '▲' },
  { name: 'DOCKSIDE YARD', x: 78, z: 78, icon: '▲' },
  { name: 'OLD PIER', x: 84, z: 92, icon: '▲' },
  { name: 'PALM ROW PLAZA', x: -18, z: 90, icon: '▲' },
  { name: 'PELICAN ISLE', x: 96, z: -18, icon: '◆' },
];

export const STREETS = [
  { name: 'CROWN ROAD', z: -72, horizontal: true },
  { name: 'CANAL STREET', z: -36, horizontal: true },
  { name: 'PALM BOULEVARD', z: 72, horizontal: true },
  { name: 'SOLMAR AVENUE', x: 0, horizontal: false },
  { name: 'HARBOUR WAY', x: 72, horizontal: false },
  { name: 'VELA STREET', x: -72, horizontal: false },
];

// Shop signs along Solmar Avenue (fresh names, never the competitor's).
export const SHOPS = [
  'RAMEN YOKO', 'PIZZA LUNA', 'TACOS EL FARO', 'CAFÉ BRISA', 'SURF & SOLE',
  'MERCADO SOL', 'BAR LUCERO', 'DONUT DORADO', 'LIBROS MAR', 'FLOWER KIOSK',
];

// Radio: three stations, each a loop of procedural chord pads + bass.
export const RADIO = [
  { name: 'VAPOR 101.3', track: 'Glass Horizon — Neon Palms', hue: 'synth' },
  { name: 'SOL FM 88.1', track: 'Golden Hour — The Tides', hue: 'chill' },
  { name: 'BAY BEAT 95.6', track: 'Night Drive — Coastline', hue: 'drive' },
];

// The seven story jobs. Each stage is one objective; `target` is a world position
// the GPS routes to. Stages: drive, enter-car, meet, wanted, escape, deliver, finale.
export const JOBS = [
  {
    id: 1, title: 'First Run',
    brief: 'Drive to the garage on Crown Road',
    stages: [
      { type: 'enter-car', text: 'Get in the VULPINE S', target: { x: 0, z: 30 } },
      { type: 'drive', text: 'Follow the GPS route to Crown Road', target: { x: -36, z: -72 } },
      { type: 'meet', text: 'Meet Lena at the garage', target: { x: -36, z: -72 } },
    ],
    dialogue: [
      { who: 'Lena "Wrench" Ortiz', line: 'Two units on your tail, Rico — lose them on Palm Row!' },
      { who: 'Lena "Wrench" Ortiz', line: 'The VULPINE is tuned and ready. Do not scratch the paint.' },
    ],
  },
  {
    id: 2, title: 'Harbour Lights',
    brief: 'Meet the contact at the marina',
    stages: [
      { type: 'drive', text: 'Head east to the docks', target: { x: 84, z: 40 } },
      { type: 'enter-car', text: 'Park and get out at the marina', target: { x: 84, z: 40 } },
      { type: 'meet', text: 'Meet Mama Rosa on the quay', target: { x: 92, z: 24 } },
    ],
    dialogue: [
      { who: 'Mama Rosa', line: 'Tonight the city learns our name, Rico. Drive it home.' },
    ],
  },
  {
    id: 3, title: 'Heat Wave',
    brief: 'Lose a 3-star wanted level',
    stages: [
      { type: 'wanted', text: 'The heat is on — shake the pursuit', target: { x: 0, z: -36 } },
      { type: 'escape', text: 'Break line of sight and cool down', target: { x: -72, z: 72 } },
    ],
    dialogue: [
      { who: 'Dario "Fuze" Kane', line: 'Three stars already? You drive like the city owes you money.' },
    ],
  },
  {
    id: 4, title: 'Neon Delivery',
    brief: 'Deliver the package to Vela Market',
    stages: [
      { type: 'drive', text: 'Pick up the package at the docks', target: { x: 72, z: 72 } },
      { type: 'drive', text: 'Deliver it to Vela Market — no scratches', target: { x: -54, z: 54 } },
    ],
    dialogue: [
      { who: 'Lena "Wrench" Ortiz', line: 'Fragile cargo. If you roll it, you pay for it.' },
    ],
  },
  {
    id: 5, title: 'Air Support',
    brief: 'Outrun the AIR-1 helicopter',
    stages: [
      { type: 'wanted', text: 'AIR-1 is overhead — keep moving', target: { x: 36, z: 0 } },
      { type: 'escape', text: 'Lose the helicopter under the bridge', target: { x: 72, z: -72 } },
    ],
    dialogue: [
      { who: 'Dario "Fuze" Kane', line: 'The heli cannot follow you under the bridge. Go!' },
    ],
  },
  {
    id: 6, title: 'The Long Way Home',
    brief: 'Cross the city to Palm Row Plaza',
    stages: [
      { type: 'drive', text: 'Take the ring highway north', target: { x: -72, z: -72 } },
      { type: 'drive', text: 'Cut through Miramar to Palm Row', target: { x: -18, z: 90 } },
    ],
    dialogue: [
      { who: 'Mama Rosa', line: 'Every street in this city knows your name now.' },
    ],
  },
  {
    id: 7, title: 'Golden Hour',
    brief: 'The final run — outrun them all to the lighthouse',
    stages: [
      { type: 'wanted', text: 'Five stars. Everything is on you', target: { x: 0, z: 0 } },
      { type: 'drive', text: 'Reach the lighthouse before sundown', target: { x: 78, z: -78 } },
    ],
    dialogue: [
      { who: 'Lena "Wrench" Ortiz', line: 'Last run, Rico. Make it the one they tell stories about.' },
    ],
  },
];

// Police units that call out during a pursuit.
export const UNITS = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 4', 'AIR-1'];

// Golden-hour palette — natural, never purple/magenta.
export const PALETTE = {
  skyTop: 0x3f74b8,
  skyHorizon: 0xf7c873,
  sun: 0xffd9a0,
  sunIntensity: 2.4,
  hemiSky: 0x9ec3e2,
  hemiGround: 0x8a6f4d,
  hemiIntensity: 0.95,
  heroPaint: 0xe8232a,
  heroLight: 0xffe6b8,
  fog: 0xd9c49a,
};
