// Saving: the whole campaign state (money, REP, job progress, upgrades, the
// player's spot in the city) in one localStorage row, written after every
// completed job and from the pause menu.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 1,
      money: state.player.money,
      rep: state.player.rep,
      jobIndex: state.missions.jobIndex,
      completed: state.missions.completed,
      upgrades: state.player.upgrades,
      health: state.player.health,
      x: state.player.x,
      z: state.player.z,
      station: state.station,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}
