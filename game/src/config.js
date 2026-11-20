// CORAL VISTA — game data: every name, character, street, shop, mission and
// line of dialogue is original to this game.
var CV = window.CV || (window.CV = {});

CV.config = (function () {
  var C = {};

  // ---- World layout (metres). Coral Avenue runs north-south at x = 90,
  // beach to its east, the city grid to its west, the marina south-east.
  C.AVENUE_X = 90;
  C.ROAD_W = 16;
  C.BLOCK = 40;
  C.CITY = { x0: -160, x1: 100, z0: -200, z1: 160 };
  C.BEACH = { x0: 112, x1: 160, z0: -200, z1: 200 };
  C.OCEAN_X = 160;
  C.MARINA = { x0: 40, x1: 140, z0: 160, z1: 230 };

  C.DISTRICTS = [
    { name: 'PALM COURT', sub: 'Coral Avenue', x0: 40, x1: 112, z0: -200, z1: -40, color: '#e8a33d' },
    { name: 'JACARANDA HEIGHTS', sub: 'Heights Row', x0: -160, x1: 40, z0: -200, z1: -80, color: '#b07fd4' },
    { name: 'THE BOARDWALK', sub: 'Pier 9', x0: 40, x1: 160, z0: -40, z1: 60, color: '#3db7c9' },
    { name: 'OLD HARBOR', sub: 'Cannery Lane', x0: -160, x1: 40, z0: -80, z1: 40, color: '#d46a5a' },
    { name: 'MARINA DEL SOL', sub: 'Sunset Quay', x0: 40, x1: 160, z0: 60, z1: 230, color: '#e8c33d' },
    { name: 'CROWN POINT', sub: 'Summit Drive', x0: -160, x1: 40, z0: 40, z1: 160, color: '#7fb069' },
  ];

  C.LANDMARKS = [
    { name: 'Pier 9 Ferris Wheel', x: 128, z: 10 },
    { name: 'Coral Vista Sign', x: 96, z: -120 },
    { name: 'Sunset Quay', x: 90, z: 185 },
    { name: 'Jacaranda Tower', x: -60, z: -140 },
    { name: 'The Boardwalk', x: 120, z: -10 },
    { name: 'Old Cannery', x: -100, z: -20 },
  ];

  C.SHOPS = [
    { name: 'TACO DEL MAR', x: 78, z: -120, bg: '#c9402e', fg: '#ffe9a8' },
    { name: 'NEON PALMS DINER', x: 78, z: -60, bg: '#1f6f8b', fg: '#ffffff' },
    { name: 'SURF & SOUND', x: 78, z: 0, bg: '#e07b39', fg: '#1a1a2e' },
    { name: 'LA BRISA CAFE', x: 78, z: 60, bg: '#3d8b4f', fg: '#fff3c4' },
    { name: 'GOLDEN HOUR HOTEL', x: 78, z: 110, bg: '#8b3d7a', fg: '#ffe9a8' },
    { name: 'PIER 9 ARCADE', x: 104, z: -20, bg: '#2743a8', fg: '#ffd23d' },
  ];

  C.BILLBOARDS = [
    { text: 'CORAL FM 99.3', sub: 'GOLDEN STATIC ALL DAY', x: 104, z: -150 },
    { text: 'VISIT PIER 9', sub: 'RIDES · ARCADE · TACOS', x: 104, z: 40 },
  ];

  // ---- Story: 8 jobs. The player is Javi "Jett" Cortez.
  C.PLAYER = { name: 'Javi "Jett" Cortez', cash: 24680, wanted: 4, health: 88, armor: 64, rep: 1820, repMax: 2400, repRank: 'RUNNER', repLevel: 4 };

  C.JOBS = [
    { title: 'FIRST LIGHT', brief: 'Pick up the Aurora GT from the impound lot.', next: 'Drive to the impound lot' },
    { title: 'SALT AIR', brief: 'Shake the tail and meet Maya at Pier 9.', next: 'Meet Maya at Pier 9' },
    { title: 'PAPER TRAIL', brief: 'Grab the ledger from the Old Cannery office.', next: 'Reach the Old Cannery' },
    { title: 'THE LONG WAY HOME', brief: 'Lose the heat, then bring the car to the garage on Palm Court.', next: 'Reach the garage on Palm Court' },
    { title: 'TIDE RUNNER', brief: 'Outrun the roadblock on the causeway.', next: 'Break through the roadblock' },
    { title: 'NIGHT MARKET', brief: 'Drop the package at the night market.', next: 'Reach the night market' },
    { title: 'HIGH WATER', brief: 'Get Tomas out of the marina before the raid.', next: 'Reach Sunset Quay' },
    { title: 'GOLDEN HOUR', brief: 'One last run. Lose every unit and vanish.', next: 'Vanish' },
  ];
  C.JOB_INDEX = 3; // current job: THE LONG WAY HOME
  C.JOB_STAGES = 4;
  C.JOB_STAGE = 3;

  C.CHECKPOINTS = [
    { x: 90, z: -20, label: 'CP 1 · Palm Court' },
    { x: 90, z: 60, label: 'CP 2 · The Boardwalk' },
    { x: 20, z: 60, label: 'CP 3 · Old Harbor' },
    { x: 20, z: -60, label: 'CP 4 · Jacaranda' },
    { x: 90, z: -60, label: 'CP 5 · Coral Avenue' },
    { x: 90, z: -140, label: 'GARAGE · Palm Court' },
  ];

  // ---- Crew (drawn portraits in hud.js).
  C.CREW = [
    { name: 'Maya "Mox" Delgado', role: 'DRIVER', ability: 'SWAP PLATES', key: 'Z', skin: '#c68642', hair: '#1a1a1a', hairStyle: 'bob', shirt: '#2e86ab' },
    { name: 'Tomas "Wrench" Okafor', role: 'MECHANIC', ability: 'QUICK FIX', key: 'X', skin: '#5c3a21', hair: '#0d0d0d', hairStyle: 'buzz', shirt: '#e07b39' },
    { name: 'Ivy "Scope" Tanaka', role: 'LOOKOUT', ability: 'EYES OUT', key: 'C', skin: '#e8b88a', hair: '#3d2314', hairStyle: 'ponytail', shirt: '#7b4ba8' },
  ];
  C.FIXER = { name: 'Uncle Ray Delacroix', role: 'FIXER · MARINA DEL SOL', skin: '#8d5524', hair: '#d9d9d9', hairStyle: 'bald', shirt: '#3d8b4f', line: 'Four stars and a chopper, Jett — lose the blue lights or lose the car. Your call, make it fast.' };

  // ---- CVPD dispatch: 6 units, live distances, tactics.
  C.DISPATCH = [
    { call: 'FALCON-2', tactic: 'RAMMING', dist: 8 },
    { call: 'SURF-9', tactic: 'RAMMING', dist: 14 },
    { call: 'GULL-7', tactic: 'PURSUE', dist: 19 },
    { call: 'TIDE-4', tactic: 'FLANKING', dist: 26 },
    { call: 'AIR-3', tactic: 'SPOTLIGHT', dist: 42 },
    { call: 'REEF-11', tactic: 'ROADBLOCK', dist: 87 },
  ];

  // ---- Weapons: 6 slots, two locked.
  C.WEAPONS = [
    { name: 'FISTS', ammo: '∞', locked: false },
    { name: 'P9', ammo: '84', locked: false },
    { name: 'VIPER SMG', ammo: '120', locked: false },
    { name: '12G SHOTGUN', ammo: '18', locked: false },
    { name: 'AR-9', ammo: '—', locked: true },
    { name: 'RPG', ammo: '—', locked: true },
  ];

  C.CAR = { name: 'AURORA GT', condition: 81, gear: 5, topSpeed: 178 };
  C.RADIO = { station: 'CORAL FM 99.3', song: 'Golden Static — The Palmettos' };
  C.DAY = { label: 'FRI', time: '17:58' };

  // ---- Look: golden hour, clear air (thin fog only, no whiteout).
  C.SKY = { top: '#2f6fd0', mid: '#e8853d', low: '#ffc46b', horizon: '#ffb35c' };
  C.SUN = { color: '#ffd9a0', intensity: 2.0, pos: [-60, 90, -120] };
  C.FOG = { color: '#f7b267', near: 220, far: 620 };

  return C;
})();
