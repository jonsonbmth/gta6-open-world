// SOLSTICE BAY — configuration: every name, place and tuning number.
// All names are original inventions for this entry.
window.SB = window.SB || {};
SB.CFG = {
  city: 'SOLSTICE BAY',
  tagline: 'Sun, salt and sirens.',
  districts: ['Harbor Lights', 'Old Marina', 'Casino Strip', 'Palm Heights', 'Sunset Docks', 'Coral Row'],
  streets: ['Solstice Boulevard', 'Marlin Avenue', 'Pelican Way', 'Harbor Lights Drive', 'Coral Row'],
  hero: { name: 'Tommy "Torch" Vega', role: 'WHEELMAN', rep: 5, repName: 'WHEELMAN', xp: 1940, xpMax: 2600 },
  fixer: { name: 'Gus Moreno', role: 'FIXER · HARBOR LIGHTS', line: 'Four cruisers and a chopper, Torch — lose the blue lights or lose the car. Your call, make it fast.' },
  crew: [
    { name: 'Lena', role: 'DRIVER', action: 'SWAP PLATES', key: 'Z', skin: '#8d5a3b', hair: '#1c1410', shirt: '#e8b64c' },
    { name: 'Bo', role: 'MECHANIC', action: 'QUICK FIX', key: 'X', skin: '#c98d64', hair: '#5a3a1a', shirt: '#4c9e8f' },
    { name: 'Mia', role: 'LOOKOUT', action: 'EYES OUT', key: 'C', skin: '#f0c297', hair: '#2a1a12', shirt: '#e86a92' },
  ],
  police: { dept: 'SOLSTICE PD', units: [
    { name: 'MARLIN-4', tactic: 'RAMMING', dist: 9 },
    { name: 'PELICAN-2', tactic: 'RAMMING', dist: 14 },
    { name: 'STINGRAY-6', tactic: 'FLANKING', dist: 24 },
    { name: 'OSPREY-1', tactic: 'PURSUE', dist: 6 },
    { name: 'AIR-2', tactic: 'SPOTLIGHT', dist: 41 },
    { name: 'REEF-7', tactic: 'ROADBLOCK', dist: 92 },
  ], code: 4, total: 6 },
  mission: { job: 'JOB 6/8', title: 'THE HARBOR HEIST', stage: 'STAGE 2/4', time: '03:12',
    objective: 'Lose the heat, then bring the car to the garage on Marlin Avenue.',
    next: 'Reach the garage on Marlin Avenue' },
  weapons: [
    { name: 'FISTS', ammo: '∞', icon: 'fist' },
    { name: 'P9', ammo: '84', icon: 'pistol' },
    { name: 'VIPER SMG', ammo: '120', icon: 'smg', active: true },
    { name: '12G SHOTGUN', ammo: '18', icon: 'shotgun' },
    { name: 'AR-9', ammo: 'LOCKED', icon: 'rifle' },
    { name: 'RPG', ammo: 'LOCKED', icon: 'rpg' },
  ],
  car: { name: 'MERIDIAN GT', color: 0xc2242e, condition: 82 },
  radio: [
    { name: 'WAVE FM 96.5', song: '"Midnight Run" · The Solstice Club' },
    { name: 'LAGUNA FM 101.2', song: '"Neon Palms" · Marisol Vega' },
    { name: 'GOLD FM 88.1', song: '"Harbor Lights" · The Pelicans' },
  ],
  money: 31240,
  wanted: 4,
  // Tuning
  topSpeed: 145, accel: 26, brake: 42, drag: 0.35, steerRate: 1.9,
  chaseSpeed: 108, // staged chase speed shown in the cover shot
  world: { size: 420, block: 44, road: 14 },
};
