// Ember Bay — names, constants and tuning for the whole game.
// Every name here is original to this entry.
export const GAME = {
  title: 'EMBER BAY',
  tagline: 'Heat, hustle and high tide.',
  city: 'Ember Bay',
  hero: { name: 'Rico "Rook" Salazar', role: 'WHEELMAN', rep: 5, repXp: 1940, repMax: 2600 },
  fixer: { name: 'Dante "Doc" Reyes', role: 'FIXER', district: 'HARBOR POINT' },
  crew: [
    { name: 'Ana Ferrer', nick: 'Ace', role: 'DRIVER', key: 'Z', action: 'SWAP PLATES', shirt: 0x2e8bc0, skin: 0xc68642, hair: 0x2b1a12, hairStyle: 'long' },
    { name: 'Kiko Tanaka', nick: 'Wrench', role: 'MECHANIC', key: 'X', action: 'QUICK FIX', shirt: 0xd97b29, skin: 0xe8b88a, hair: 0x1a1a1a, hairStyle: 'short' },
    { name: 'Zoe Laurent', nick: 'Eyes', role: 'LOOKOUT', key: 'C', action: 'EYES OUT', shirt: 0xc94f7c, skin: 0x8d5524, hair: 0x3b2314, hairStyle: 'bun' },
  ],
  police: { name: 'Ember Bay PD', short: 'EBPD', code: 'CODE 4', units: 6 },
  dispatch: [
    { unit: 'FALCON-3', tactic: 'RAMMING', dist: 9 },
    { unit: 'HERON-5', tactic: 'RAMMING', dist: 14 },
    { unit: 'OSPREY-2', tactic: 'FLANKING', dist: 24 },
    { unit: 'KESTREL-8', tactic: 'PURSUE', dist: 6 },
    { unit: 'AIR-3', tactic: 'SPOTLIGHT', dist: 41 },
    { unit: 'BARRACUDA-1', tactic: 'ROADBLOCK', dist: 92 },
  ],
  mission: { job: 'JOB 7/8', name: 'THE EMBER RUN', stage: 'STAGE 3/4', timer: '03:12',
    objective: 'Lose the heat, then bring the car to the garage on Marlin Avenue.',
    next: 'Reach the garage on Marlin Avenue' },
  car: { name: 'VULCAN S', condition: 79 },
  radio: [
    { station: 'EMBER FM 99.1', song: '"Midnight Run" · The Solstice Club' },
    { station: 'COAST FM 104.3', song: '"Salt Air" · The Breakers' },
    { station: 'GOLD FM 88.1', song: '"Neon Palms" · The Miramar Club' },
  ],
  money: 31240,
  stars: 4,
  district: 'CASINO ROW',
  street: 'Ember Boulevard',
  districts: ['Harbor Point', 'Old Town', 'Casino Row', 'Palm Terrace', 'Sunset Docks', 'Coral Avenue'],
  dialog: 'Four cruisers and a chopper, Rook — lose the blue lights or lose the car. Your call, make it fast.',
};

export const WORLD = {
  roadLength: 260,
  roadWidth: 14,
  blockSize: 26,
  sunset: 0xff9a5c,
  skyTop: 0x7a4a8f,
  skyBottom: 0xffb27a,
  fogColor: 0xe8906a,
  fogNear: 60,
  fogFar: 220,
};

export const SHOT_SPEED_KMH = 108;
