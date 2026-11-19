// Save / resume via localStorage. Resume restores money, chapter, respect
// and position — it never restarts job stages.
import { SAVE_KEY, START_MONEY } from './config.js';

export function defaultSave() {
  return {
    money: START_MONEY,
    chapter: 1,
    stage: 0,
    respect: 320,
    respectLevel: 2,
    player: { x: 0, z: 10, heading: Math.PI, inCar: true },
    car: { x: 0, z: 10, heading: Math.PI },
    wanted: 0,
    savedAt: Date.now(),
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return { ...defaultSave(), ...data };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      money: state.money,
      chapter: state.chapter,
      stage: state.stage,
      respect: state.respect,
      respectLevel: state.respectLevel,
      player: state.player,
      car: state.car,
      wanted: state.wanted,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
