// VERANO BAY — open-world crime game (gta6-01 V18).
// Config: every name, colour and tuning number the game uses. All names are
// original inventions for this entry: no Rockstar or commercial-game names.

window.VB = window.VB || {};

VB.CONFIG = {
  city: 'VERANO BAY',
  tagline: 'Sun, salt and sirens.',
  hero: { name: 'Dario Mendoza', nick: 'Daz', callsign: 'DAZ' },
  fixer: { name: 'Nico Ramos', nick: 'Nickel', role: 'FIXER', district: 'OLD PORT' },
  crew: [
    { name: 'Sofia Delgado', nick: 'Sof', role: 'DRIVER', key: 'Z', skill: 'SWAP PLATES' },
    { name: 'Marcus Cole', nick: 'Marsh', role: 'MECHANIC', key: 'X', skill: 'QUICK FIX' },
    { name: 'Nadia Kim', nick: 'Nova', role: 'LOOKOUT', key: 'C', skill: 'EYES OUT' },
  ],
  police: { dept: 'VBPD', full: 'Verano Bay Police Department' },
  units: [
    { id: 'KITE-2', tactic: 'RAMMING', dist: 9 },
    { id: 'SURF-7', tactic: 'RAMMING', dist: 14 },
    { id: 'TIDE-9', tactic: 'FLANKING', dist: 24 },
    { id: 'GULL-3', tactic: 'PURSUE', dist: 6 },
    { id: 'AIR-1', tactic: 'SPOTLIGHT', dist: 41 },
    { id: 'REEF-5', tactic: 'ROADBLOCK', dist: 92 },
  ],
  mission: {
    job: 'JOB 5/8',
    title: 'THE TIDE RUN',
    objective: 'Lose the heat, then bring the car to the garage on Solana Avenue.',
    stage: 3, stages: 4, timer: 151, next: 'Reach the garage on Solana Avenue',
  },
  jobs: [
    { n: 1, name: 'FIRST LIGHT', done: true, rating: 'GOLD' },
    { n: 2, name: 'SALT IN THE WOUND', done: true, rating: 'SILVER' },
    { n: 3, name: 'LOW TIDE', done: true, rating: 'GOLD' },
    { n: 4, name: 'NIGHT FERRY', done: true, rating: 'BRONZE' },
    { n: 5, name: 'THE TIDE RUN', done: false, rating: '—' },
    { n: 6, name: 'GLASS HOUSE', done: false, rating: '—' },
    { n: 7, name: 'HIGH WATER', done: false, rating: '—' },
    { n: 8, name: 'KING TIDE', done: false, rating: '—' },
  ],
  car: { name: 'TEMPEST GT', color: 0x18b7d8, condition: 87 },
  radio: { station: 'SOL FM 101.5', song: 'Neon Palms', artist: 'The Miramar Club' },
  radios: [
    { station: 'SOL FM 101.5', song: 'Neon Palms', artist: 'The Miramar Club' },
    { station: 'LAGUNA 96.2', song: 'Salt Air', artist: 'Marina Vale' },
    { station: 'PALMA 88.4', song: 'Night Ferry', artist: 'DJ Corriente' },
  ],
  weapons: [
    { n: 1, name: 'FISTS', ammo: '∞', icon: 'fist', locked: false },
    { n: 2, name: 'P9', ammo: '84', icon: 'pistol', locked: false },
    { n: 3, name: 'VIPER SMG', ammo: '120', icon: 'smg', locked: false, active: true },
    { n: 4, name: '12G SHOTGUN', ammo: '18', icon: 'shotgun', locked: false },
    { n: 5, name: 'AR-9', ammo: 'LOCKED', icon: 'rifle', locked: true },
    { n: 6, name: 'RPG', ammo: 'LOCKED', icon: 'rpg', locked: true },
  ],
  player: { money: 31240, wanted: 4, health: 78, armor: 64, rep: 5, repName: 'WHEELMAN', repXp: 1940, repMax: 2600 },
  districts: [
    { name: 'MIRAMAR STRAND', x: -90, z: -60, w: 120, h: 90 },
    { name: 'MARINA DEL SOL', x: 30, z: -70, w: 110, h: 80 },
    { name: 'OLD PORT', x: -100, z: 30, w: 100, h: 80 },
    { name: 'CASINO ROW', x: 10, z: 20, w: 90, h: 70 },
    { name: 'SUNSET HEIGHTS', x: -80, z: 110, w: 110, h: 70 },
    { name: 'PALM DISTRICT', x: 40, z: 100, w: 100, h: 70 },
  ],
  streets: ['Solana Avenue', 'Verano Boulevard', 'Calle del Mar', 'Harbor Way', 'Palma Street', 'Corriente Road'],
  shops: ['MANGO & RYE', 'CASINO AZUL', 'BOLT BURGER', 'TACO MAREA', 'SURF & SOUND', 'LA LUNA BAR', 'PIER 9 DINER', 'NEON MART'],
  sky: { top: 0x2b3a6e, mid: 0xd95f43, low: 0xffb35c, sun: 0xffd27a },
  fog: 0xd98a5f,
  // Chase-shot staging: camera + hero + cruisers + heli, tuned so all four
  // cruisers and a BIG helicopter sit inside the frame.
  chase: {
    heroPos: { x: 6, z: 17 },
    heroRot: -0.12,
    camPos: { x: 10, y: 3.6, z: 25 },
    camLook: { x: 1, y: 2.2, z: -2 },
    cruisers: [
      { x: -3, z: 6, rot: 0.08 },    // ahead-left, boxing in
      { x: 13, z: 4, rot: -0.06 },   // ahead-right, boxing in
      { x: -8, z: 16, rot: 0.15 },   // alongside-left, in frame
      { x: 15, z: 14, rot: -0.10 },  // alongside-right, in frame
    ],
    heliPos: { x: -18, y: 26, z: -28 },
    heliScale: 1.9,
  },
};

// URL params: ?shot=chase|title|map|marina stages a screenshot scene;
// ?debug=1 shows the debug readout. No param = free play from the title screen.
VB.params = new URLSearchParams(location.search);
VB.shot = VB.params.get('shot') || '';
VB.debug = VB.params.get('debug') === '1';
