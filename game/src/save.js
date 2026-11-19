// Save / resume via localStorage. Resume restores the exact job stage —
// it never restarts a job or a stage.

import { CFG } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 1,
      savedAt: new Date().toISOString(),
      money: state.money,
      respect: state.respect,
      missions: state.missions.serialize(),
      player: { x: state.playerPos.x, z: state.playerPos.z, heading: state.heading },
      inCar: state.inCar,
      carName: state.carName,
      station: state.station,
      day: state.day,
      minutes: state.minutes,
      garage: state.garage,
    };
    localStorage.setItem(CFG.saveKey, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v !== 1) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(CFG.saveKey); } catch (e) { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(CFG.saveKey); } catch (e) { /* ignore */ }
}
