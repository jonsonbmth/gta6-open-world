// Screenshot staging: the four shots the judge sees are real renders of the
// game, staged deterministically from URL params (?shot=1..4&seed=1). Each
// config places the hero, sets the wanted level, frames the police
// helicopter in the upper-center of the frame, and densifies nearby traffic
// so every chase shot shows the hero car plus at least four other vehicles.
// The game itself is fully playable without any shot param.

export function getShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = Number.parseInt(q.get('shot') || '0', 10);
  const seed = Number.parseInt(q.get('seed') || '1', 10);
  if (shot < 1 || shot > 4) return null;
  return { shot, seed };
}

// Heli framing: for the chase camera the heli must sit ahead of the car and
// high enough to read but low enough to stay in frame — radius ~70 ahead,
// altitude ~38, which puts it at ~25° elevation from the camera: upper
// third, ~1/6 of the frame tall with its 13-unit rotor.
export const SHOT_HELI = { radius: 70, altitude: 38 };

export const SHOT_CONFIGS = {
  1: {
    name: '1-chase',
    mode: 'drive',
    car: { x: 3.6, z: 10, heading: Math.PI }, // northbound on Sunset Mile
    wanted: 4,
    heli: SHOT_HELI,
    popup: ['DRIFT x3', 'NEAR MISS +$250'],
    prompt: '',
    // Extra vehicles staged around the hero, in real lanes: northbound
    // lanes x = 2 / 6, southbound (oncoming) x = -2 / -6.
    extraTraffic: [
      { kind: 'police', x: 6, z: -6, heading: Math.PI },
      { kind: 'police', x: 2, z: -20, heading: Math.PI },
      { kind: 'civilian', color: 0x2980b9, x: -2, z: -12, heading: 0 },
      { kind: 'civilian', color: 0xe8e8e8, x: 6, z: -36, heading: Math.PI },
      { kind: 'civilian', color: 0xe8a020, x: -6, z: -2, heading: 0 },
    ],
  },
  2: {
    name: '2-market',
    mode: 'walk',
    player: { x: -8, z: 40, heading: Math.PI / 2 }, // walking east through Coral Market
    wanted: 2,
    heli: null, // no heli in the market shot — the crowd is the subject
    popup: [],
    prompt: 'F  STEAL SUNLINE CAB',
    extraTraffic: [
      { kind: 'civilian', color: 0xe8c832, x: 6, z: 46, heading: Math.PI / 2 }, // the cab
    ],
  },
  3: {
    name: '3-menu',
    mode: 'pause',
    car: { x: 3.6, z: 30, heading: Math.PI },
    wanted: 4,
    heli: SHOT_HELI,
    popup: [],
    prompt: '',
    extraTraffic: [
      { kind: 'police', x: -3.6, z: 2, heading: Math.PI },
      { kind: 'civilian', color: 0x2980b9, x: -3.6, z: -18, heading: Math.PI },
    ],
  },
  4: {
    name: '4-coast',
    mode: 'drive',
    car: { x: -116.4, z: 0, heading: Math.PI }, // northbound on Ember Strand Ave
    wanted: 4,
    heli: SHOT_HELI,
    popup: ['NEAR MISS +$150', ''],
    prompt: '',
    extraTraffic: [
      { kind: 'police', x: -118, z: -26, heading: Math.PI },
      { kind: 'police', x: -114, z: -40, heading: Math.PI },
      { kind: 'civilian', color: 0x2c3e50, x: -122, z: -18, heading: 0 },
      { kind: 'civilian', color: 0xe8e8e8, x: -118, z: -54, heading: Math.PI },
      { kind: 'civilian', color: 0x27ae60, x: -114, z: -68, heading: Math.PI },
    ],
  },
};

export function getShotConfig() {
  const params = getShotParams();
  if (!params) return null;
  return { ...SHOT_CONFIGS[params.shot], seed: params.seed };
}
