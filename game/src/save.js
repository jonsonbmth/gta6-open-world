// Save / load: localStorage slot for money, REP, mission, day, owned cars.
import { S } from './state.js';

const KEY = 'solmar-bay-save-v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function saveGame() {
  try {
    const data = {
      v: 1, day: S.day, money: S.money, rep: S.rep, respect: S.respect,
      health: S.health, armour: S.armour, mission: S.mission, stage: S.stage,
      time: S.time, ammo: S.ammo.slice(1), radio: S.radio,
      px: S.player.x, pz: S.player.z,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.v !== 1) return null;
    S.day = d.day; S.money = d.money; S.rep = d.rep; S.respect = d.respect;
    S.health = d.health; S.armour = d.armour; S.mission = d.mission; S.stage = d.stage;
    S.time = d.time; S.radio = d.radio || 0;
    if (Array.isArray(d.ammo)) for (let i = 0; i < d.ammo.length; i++) S.ammo[i + 1] = d.ammo[i];
    S.player.x = d.px ?? 0; S.player.z = d.pz ?? 40;
    return d;
  } catch (e) { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
}
