// Central game state: player, money, wanted, missions, settings. Plain data only.
export const SAVE_KEY = 'solmar-bay-v5-save';

export function freshState() {
  return {
    money: 42780,
    respect: 320,
    respectLevel: 3,
    health: 100,
    armour: 60,
    wanted: 3,
    day: 1,
    clockMinutes: 22 * 60 + 46,
    weapon: 1,
    ammo: [Infinity, 24, 90, 12, 60],
    carCondition: 95,
    carName: 'VULPINE S',
    radioStation: 0,
    jobIndex: 0,
    jobStage: 0,
    jobsDone: 0,
    upgrades: { engine: 0, armour: 0 },
    paint: 0,
    onFoot: false,
    speedKmh: 0,
    busted: false,
    wasted: false,
    started: false,
    paused: false,
    mapOpen: false,
    garageOpen: false,
    muted: false,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { ...freshState(), ...data, started: false, paused: false, mapOpen: false, garageOpen: false, busted: false, wasted: false, onFoot: false, speedKmh: 0 };
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    const { money, respect, respectLevel, health, armour, wanted, day, clockMinutes, weapon, ammo, carCondition, carName, radioStation, jobIndex, jobStage, jobsDone, upgrades, paint } = state;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ money, respect, respectLevel, health, armour, wanted, day, clockMinutes, weapon, ammo, carCondition, carName, radioStation, jobIndex, jobStage, jobsDone, upgrades, paint }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* offline */ }
}

export const WEAPONS = [
  { name: 'FISTS', damage: 12, range: 2.2 },
  { name: 'PISTOL', damage: 22, range: 40 },
  { name: 'SMG', damage: 14, range: 35 },
  { name: 'SHOTGUN', damage: 55, range: 16 },
  { name: 'RIFLE', damage: 40, range: 80 },
];

export const RADIO = [
  { name: 'WAVEFORM 88.1', song: 'Glass Harbour — Midnight Static', hue: 0 },
  { name: 'VELVET FM 101.3', song: 'Neon Palms — Lumen Avenue', hue: 1 },
  { name: 'TIDE 96.7', song: 'Salt City — Harbour Lights', hue: 2 },
];

export const PAINTS = [
  { name: 'VULPINE RED', color: 0xff2020 },
  { name: 'CYAN SURGE', color: 0x00c8ff },
  { name: 'MAGENTA HEAT', color: 0xff2d95 },
  { name: 'SUNSET GOLD', color: 0xffb020 },
];
