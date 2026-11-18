// Every tuning number, name and story beat in one place. The city is a fixed
// 480x480-unit coastal grid; nothing below depends on the screen size.
export const STEP = 1 / 60;
export const CITY = { half: 240, roadGap: 48, roadWidth: 14, block: 34 };

// Golden-hour sun: warm, low, long shadows — the whole look of Solmar Bay.
export const SUN = { azimuth: 2.3, elevation: 0.42, color: 0xffd9a0, intensity: 2.6 };
export const SKY = { top: 0x2e6fb7, mid: 0xf7b267, low: 0xff8c5a, fog: 0xf2a56b };

export const PLAYER = {
  walkSpeed: 7, runSpeed: 12, turnSpeed: 9, health: 100,
  punchDamage: 20, punchRange: 2.4, pistolDamage: 34, pistolRange: 60,
};

export const CAR = {
  accel: 26, brake: 42, maxSpeed: 62, reverseMax: 16, grip: 8.5,
  turnRate: 2.1, handbrakeTurn: 3.4, stealWanted: 1,
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 26,           // unseen seconds before a star drops
  heliAtStars: 3,             // helicopter joins at 3 stars
  copCarsPerStar: [0, 1, 2, 3, 4, 5],
  bustRadius: 3.2, bustSeconds: 2.5,
};

export const SAVE_KEY = 'solmar-bay.save.v1';

// The seven story jobs. Each job is a chain of steps; a step is one objective
// with a map target and a line of dialogue that plays when it starts.
export const JOBS = [
  {
    id: 1, name: 'Harbor Lights', giver: 'MAMA ROSA', pay: 1500, rep: 120,
    intro: 'Rosa: The harbor crew lost a truck of "spare parts". Get it back before the tide does.',
    steps: [
      { type: 'goto', target: 'marina', text: 'Drive to the marina docks.', say: ['MAMA ROSA', 'Truck is parked by pier 4. Blue cab, white trailer. Don\u2019t scratch it.'] },
      { type: 'enter', target: 'marina', vehicle: 'truck', text: 'Get in the harbor truck.', say: ['RICO', 'Keys in the visor. Rosa thinks of everything.'] },
      { type: 'goto', target: 'safehouse', text: 'Deliver the truck to the safehouse.', say: ['LENA', 'Nice driving, Rico. Wrench already loves that truck.'] },
    ],
  },
  {
    id: 2, name: 'Hot Wheels', giver: 'LENA', pay: 2000, rep: 150,
    intro: 'Lena: A Cheetah GT is sitting outside the casino. Bring it home. Quietly. Or not.',
    steps: [
      { type: 'goto', target: 'casino', text: 'Reach the casino valet row.', say: ['LENA', 'Red Cheetah GT, plates SB-777. The valet is on his break.'] },
      { type: 'steal', target: 'casino', text: 'Steal the Cheetah GT.', say: ['RICO', 'Alarm\u2019s already crying. So much for quietly.'] },
      { type: 'escape', target: 'garage', text: 'Lose the cops, then reach the garage.', say: ['LENA', 'Garage door is open. Get it inside before the whole city sees it.'] },
    ],
  },
  {
    id: 3, name: 'The Courier', giver: 'DARIO', pay: 2200, rep: 160,
    intro: 'Dario: A package for the north side. Three stops, no questions, and the clock is ticking.',
    steps: [
      { type: 'goto', target: 'uptown', text: 'Drop 1 — Uptown plaza.', say: ['DARIO', 'First stop. Guy in the yellow jacket. Don\u2019t chat.'] },
      { type: 'goto', target: 'industrial', text: 'Drop 2 — Industrial yard.', say: ['DARIO', 'Second stop. Forklift guy. He pays in cash.'] },
      { type: 'goto', target: 'beach', text: 'Drop 3 — Beachfront kiosk.', say: ['DARIO', 'Last one. Then we eat. My treat.'] },
    ],
  },
  {
    id: 4, name: 'Sunset Run', giver: 'MAMA ROSA', pay: 3000, rep: 220,
    intro: 'Rosa: The Bay PD seized our boat money. Take the coastal road — and don\u2019t stop for anyone.',
    steps: [
      { type: 'goto', target: 'beach', text: 'Reach the coastal highway.', say: ['MAMA ROSA', 'The money truck is rolling north. Catch it on the coast road.'] },
      { type: 'chase', target: 'highway', text: 'Ram the money truck until it stops.', say: ['RICO', 'He\u2019s weaving! Stay on him, stay on him!'] },
      { type: 'escape', target: 'safehouse', text: 'Grab the cash and lose the heat.', say: ['MAMA ROSA', 'Beautiful. The harbor eats tonight.'] },
    ],
  },
  {
    id: 5, name: 'Old Town Blues', giver: 'LENA', pay: 3500, rep: 260,
    intro: 'Lena: The rival crew tagged our garage. Time to remind Old Town who runs it.',
    steps: [
      { type: 'goto', target: 'oldtown', text: 'Reach Old Town square on foot.', say: ['LENA', 'They\u2019re guarding the square. On foot, Rico. Make it loud.'] },
      { type: 'fight', target: 'oldtown', text: 'Clear the rival crew from the square.', say: ['RICO', 'Square\u2019s ours. Tell your boss the paint job is cancelled.'] },
      { type: 'goto', target: 'garage', text: 'Return to the garage.', say: ['LENA', 'Wrench is already buffing the tag out. You\u2019re a legend.'] },
    ],
  },
  {
    id: 6, name: 'Night Shift', giver: 'DARIO', pay: 4200, rep: 320,
    intro: 'Dario: A midnight delivery at the port. Cops everywhere. Drive like the tide is chasing you.',
    steps: [
      { type: 'goto', target: 'port', text: 'Reach the port gate.', say: ['DARIO', 'Port gate, midnight. The guard knows my face. He does not know yours.'] },
      { type: 'steal', target: 'port', text: 'Take the port container truck.', say: ['RICO', 'This thing turns like a cruise ship.'] },
      { type: 'escape', target: 'safehouse', text: 'Deliver it to the safehouse — with heat.', say: ['DARIO', 'You drive like the tide itself, Rico.'] },
    ],
  },
  {
    id: 7, name: 'King of the Bay', giver: 'MAMA ROSA', pay: 6000, rep: 500,
    intro: 'Rosa: One last job. The whole city is watching. Take the bay — and keep it.',
    steps: [
      { type: 'goto', target: 'downtown', text: 'Reach the downtown tower.', say: ['MAMA ROSA', 'The tower, Rico. Everything we built leads here.'] },
      { type: 'fight', target: 'downtown', text: 'Hold the plaza against the rival crew.', say: ['RICO', 'This is our city. This is our bay.'] },
      { type: 'escape', target: 'beach', text: 'Escape to the beachfront — finale.', say: ['MAMA ROSA', 'King of the Bay. Has a nice ring to it, no?'] },
    ],
  },
];

// Named map anchors, in city coordinates (x east, z south; beach is south).
export const PLACES = {
  safehouse: { x: -72, z: 96, label: 'Safehouse' },
  garage: { x: -24, z: 96, label: 'Lena\u2019s Garage' },
  marina: { x: 120, z: 168, label: 'Marina Docks' },
  casino: { x: 72, z: -24, label: 'Casino Royale Bay' },
  uptown: { x: -120, z: -120, label: 'Uptown Plaza' },
  industrial: { x: 144, z: -144, label: 'Industrial Yard' },
  beach: { x: -48, z: 192, label: 'Beachfront' },
  highway: { x: 96, z: 192, label: 'Coastal Highway' },
  oldtown: { x: -144, z: 24, label: 'Old Town Square' },
  port: { x: 168, z: 96, label: 'Port Gate' },
  downtown: { x: 24, z: -72, label: 'Downtown Tower' },
};

export const RADIO = [
  { name: 'SOLMAR FM 101.2', track: 'The Palms — "Neon Tide"', hue: 0.13, bpm: 104 },
  { name: 'BAY ROCK 96.7', track: 'Copper Static — "Highway Heat"', hue: 0.0, bpm: 132 },
  { name: 'TIDE TALK 88.4', track: 'DJ Marisol — "Sunset Session"', hue: 0.55, bpm: 92 },
];

export const COP_UNITS = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 33', 'UNIT 45', 'UNIT 58'];
export const COP_STATUS = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'BOXING IN', 'CLOSING IN'];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Turbo Engine', cost: 1800, desc: '+25% top speed' },
  { id: 'armor', name: 'Reinforced Armor', cost: 1500, desc: '+50 max health' },
  { id: 'tires', name: 'Sport Tires', cost: 900, desc: 'Sharper handling' },
  { id: 'paint', name: 'Midnight Repaint', cost: 400, desc: 'Fresh look, clears wanted' },
];

export const PALETTE = {
  asphalt: 0x2b2f36, sidewalk: 0x8d9299, sand: 0xe8d29a, ocean: 0x1e6f8e,
  grass: 0x5d8a4a, building: [0xd8cfc0, 0xc4b8a4, 0xb0c4cc, 0xd9c1a7, 0xa8b8a0, 0xcfd6da],
  palm: 0x3f7a3a, trunk: 0x7a5a3a,
};
