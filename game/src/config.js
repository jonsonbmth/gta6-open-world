// SOLMAR BAY — shared constants: palette, names, world layout, radio, districts.
// Every name here is invented for this game; nothing is taken from any commercial game.

export const CFG = {
  // world layout (metres)
  avenueX: 0, // main chase avenue runs along Z at x = 0
  avenueHalfWidth: 7,
  avenueZMin: -260,
  avenueZMax: 80,
  crossStreets: [30, -40, -90, -140, -190, -230],
  bayX: 64, // water starts east of this
  marina: { x: 56, z: -18 }, // quay / docks
  // chase shot framing (cover) — low, close, rear-3/4 from the right
  chaseCam: { back: 6.8, side: 2.4, height: 2.6, lookAhead: 6, lookHeight: 1.2 },
  // palette — night neon rain
  skyTop: 0x070a24,
  skyHorizon: 0x2a1a4a,
  fogColor: 0x0d1026,
  fogDensity: 0.0055,
  asphalt: 0x11131c,
  heroRed: 0xe62129,
  neonPink: '#ff2d95',
  neonCyan: '#00e5ff',
  neonYellow: '#ffd23f',
  neonGreen: '#39ff8e',
  neonOrange: '#ff7a1a',
  policeRed: 0xff2222,
  policeBlue: 0x2266ff,
  // gameplay
  maxWanted: 5,
  saveKey: 'solmar-bay-save-v1',
  startMoney: 42780,
  startRespect: 320,
  respectMax: 1000,
};

export const DISTRICTS = [
  { name: 'PALM ROW', x: -34, z: 10, w: 46, h: 60, color: '#ff2d95' },
  { name: 'HARBOUR LIGHTS', x: 34, z: -30, w: 44, h: 70, color: '#00e5ff' },
  { name: 'VELA QUARTER', x: -30, z: -80, w: 44, h: 66, color: '#ffd23f' },
  { name: 'DOCKSIDE', x: 40, z: -120, w: 40, h: 70, color: '#39ff8e' },
  { name: 'CROWN HEIGHTS', x: -26, z: -170, w: 46, h: 80, color: '#b98cff' },
  { name: 'MIRAMAR', x: 30, z: -210, w: 46, h: 70, color: '#ff7a1a' },
  { name: 'OLD PIER', x: 66, z: -18, w: 30, h: 46, color: '#7fd4ff' },
  { name: 'CANAL DISTRICT', x: -32, z: -240, w: 50, h: 40, color: '#ff5c7a' },
];

// Shop signs along the avenue — invented names, neon colours. Full street length.
export const SHOPS = [
  'LUMEN NOODLES', 'VOLT TATTOO', 'CORAL MART', 'NEON PETALS',
  'TIDE & TACO', 'ORBIT GAMES', 'MARINA MOTEL', 'SALT AIR BAR',
  'PIXEL DONUTS', 'WAVE RECORDS', 'KAIJU RAMEN', 'LOTUS LAUNDRY',
  'EMBER GRILL', 'NOVA NAILS', 'DRIFT SURF', 'HALO BAKERY',
  'PULSE PHONES', 'GILDED PAWN', 'AQUA SPA', 'COMET BURGERS',
  'VELVET CINEMA', 'JUNIPER BOOKS', 'TURBO WASH', 'SIREN SUSHI',
];
export const NEON_COLORS = ['#ff2d95', '#00e5ff', '#ffd23f', '#39ff8e', '#ff7a1a', '#b98cff'];

export const RADIO = [
  { name: 'VAPOR 101.3', genre: 'synthwave', songs: ['Glass Horizon', 'Midnight Alloy', 'Static Bloom'] },
  { name: 'BAIA FM 88.7', genre: 'latin', songs: ['Salsa del Mar', 'Calle Luna', 'Ritmo Rojo'] },
  { name: 'MIDNIGHT DRIVE 96.1', genre: 'lofi', songs: ['Rain on Chrome', 'Slow Avenue', 'Neon Reverie'] },
];

export const CARS = {
  hero: { name: 'VULPINE S', color: 0xe62129, topSpeed: 62, accel: 26 },
  police: { name: 'INTERCEPTOR', color: 0x14161d, topSpeed: 55, accel: 24 },
  traffic: [
    { name: 'KOBALT GT', color: 0x2a6cff },
    { name: 'STRATA X', color: 0xc8ccd4 },
    { name: 'MARLIN SEDAN', color: 0x3fae6a },
    { name: 'ORCA SUV', color: 0x8a5cff },
    { name: 'PELICAN VAN', color: 0xd8a13c },
    { name: 'FALCO COUPE', color: 0x37c8c0 },
  ],
};

export const CREW = {
  rico: { name: 'Rico Marín', role: 'Driver', color: '#ffd23f', cap: '#e62129', coat: '#ffd23f' },
  lena: { name: 'Lena "Wrench" Ortiz', role: 'Mechanic', color: '#ff7a1a', hair: '#7a2d12' },
  rosa: { name: 'Mama Rosa', role: 'Fixer', color: '#b98cff', hair: '#e8e8e8' },
  dario: { name: 'Dario "Fuze" Kane', role: 'Muscle', color: '#39ff8e', hair: '#141414' },
};

// 7 story jobs. Each has stages; a stage completes by reaching a marker,
// collecting, waiting out, or holding wanted stars (wanted stages LATCH).
export const JOBS = [
  {
    id: 1, chapter: 'CH 1', title: 'First Run',
    brief: 'Mama Rosa needs the VULPINE S moved before the rain lets up. Drive it to the garage on Palm Row.',
    stages: [
      { label: 'Get in the VULPINE S', type: 'enter-car', hint: 'Press E near the red sports car' },
      { label: 'Drive to the garage on Palm Row', type: 'goto', at: { x: -14, z: -52 }, hint: 'Follow the GPS route on the map' },
      { label: 'Lose the heat — stay unseen 20s', type: 'evade', seconds: 20, hint: 'Keep out of the police cones' },
      { label: 'Park inside the garage', type: 'goto', at: { x: -14, z: -58 }, hint: 'Slow down and roll in' },
    ],
    reward: 1200,
    dialogue: [
      { who: 'rosa', text: 'Rico, mijo — the car is hot. Move it before the storm breaks.' },
      { who: 'lena', text: 'Engine is tuned, brakes are new. Don\'t scratch her, capisce?' },
    ],
  },
  {
    id: 2, chapter: 'CH 2', title: 'Wet Work, Dry Pay',
    brief: 'Collect the drop from the Old Pier and bring it back to Lena\'s workshop.',
    stages: [
      { label: 'Reach the Old Pier docks', type: 'goto', at: { x: 56, z: -18 }, hint: 'Head east to the marina' },
      { label: 'Pick up the package', type: 'collect', hint: 'Walk to the glowing crate' },
      { label: 'Return to Lena\'s workshop', type: 'goto', at: { x: -18, z: -96 }, hint: 'Any car will do — steal one if you must' },
    ],
    reward: 1800,
    dialogue: [
      { who: 'dario', text: 'Pier is watched. Walk in like you own the place.' },
      { who: 'lena', text: 'Package better be dry. My workshop, my rules.' },
    ],
  },
  {
    id: 3, chapter: 'CH 3', title: 'Three Stars Over Solmar',
    brief: 'The crew needs a distraction. Rack up 3 wanted stars and hold them — then vanish.',
    stages: [
      { label: 'Raise your wanted level to 3 stars', type: 'wanted', stars: 3, hint: 'Speed past patrols. They will notice.' },
      { label: 'Hold 3 stars for 30 seconds', type: 'wanted-hold', stars: 3, seconds: 30, hint: 'Stay moving — the latch keeps your progress' },
      { label: 'Lose the cops and reach the safehouse', type: 'goto', at: { x: -24, z: -150 }, hint: 'Break line of sight, then run' },
    ],
    reward: 2500,
    dialogue: [
      { who: 'rosa', text: 'Make noise, Rico. The whole city should be looking at you.' },
      { who: 'dario', text: 'Three stars and you walk away? That\'s legend talk.' },
    ],
  },
  {
    id: 4, chapter: 'CH 4', title: 'Neon Alley Getaway',
    brief: 'Dario is pinned down in Vela Quarter. Get him out and drive him to the docks.',
    stages: [
      { label: 'Reach Dario in Vela Quarter', type: 'goto', at: { x: -26, z: -84 }, hint: 'He is behind the noodle shop' },
      { label: 'Pick up Dario', type: 'collect', hint: 'Stop close and he jumps in' },
      { label: 'Escape to Dockside with 2+ stars', type: 'goto', at: { x: 38, z: -128 }, hint: 'They will chase — drive like it' },
    ],
    reward: 3200,
    dialogue: [
      { who: 'dario', text: 'Rico! Alley behind the shop — move, move, MOVE!' },
      { who: 'lena', text: 'His door better close. I am not fixing dents tonight.' },
    ],
  },
  {
    id: 5, chapter: 'CH 5', title: 'The Long Way Home',
    brief: 'A client car must cross the whole city at night. Deliver it to Crown Heights untouched.',
    stages: [
      { label: 'Take the client car from the marina', type: 'enter-car', hint: 'The silver Strata X by the quay' },
      { label: 'Drive north to Crown Heights', type: 'goto', at: { x: -22, z: -182 }, hint: 'Keep the paint clean — damage costs you' },
      { label: 'Hand over the keys', type: 'collect', hint: 'Park in the marked bay' },
    ],
    reward: 4000,
    dialogue: [
      { who: 'rosa', text: 'One scratch and the client pays half. Drive like glass.' },
      { who: 'lena', text: 'It is a Strata X, not a boat. Treat her gently.' },
    ],
  },
  {
    id: 6, chapter: 'CH 6', title: 'Storm Break',
    brief: 'The storm peaks at midnight. Run the ring road, hit every checkpoint, beat the clock.',
    stages: [
      { label: 'Checkpoint 1 — Canal District', type: 'goto', at: { x: -30, z: -236 }, hint: 'North, past the towers' },
      { label: 'Checkpoint 2 — Miramar beach', type: 'goto', at: { x: 44, z: -208 }, hint: 'Cut east across the bridge' },
      { label: 'Checkpoint 3 — back to Palm Row', type: 'goto', at: { x: -10, z: 20 }, hint: 'Full send down the avenue' },
    ],
    reward: 5000,
    dialogue: [
      { who: 'dario', text: 'Ring road, three flags, one storm. You in or you in?' },
      { who: 'lena', text: 'Wipers on, foot down. The city is yours tonight.' },
    ],
  },
  {
    id: 7, chapter: 'CH 7', title: 'Solmar by Night',
    brief: 'The final job: one last run through every district, then meet the crew at the marina.',
    stages: [
      { label: 'Tour Palm Row, Vela, Crown Heights', type: 'goto', at: { x: -24, z: -170 }, hint: 'The GPS route covers the tour' },
      { label: 'Meet the crew at the Old Pier', type: 'goto', at: { x: 56, z: -18 }, hint: 'End of the road — and the beginning' },
    ],
    reward: 8000,
    dialogue: [
      { who: 'rosa', text: 'Tonight the city learns our name, Rico. Drive it home.' },
      { who: 'lena', text: 'Whatever happens — the crew rides together.' },
    ],
  },
];

export const TIPS = [
  'WASD drive / walk · E enter car · M map · R radio · F action · Space handbrake',
  'Steal any parked car. Police notice speeding and collisions.',
  'Missions pay cash. Cash buys respect. Respect opens the city.',
];
