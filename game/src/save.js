// Save game: best drift score, cash earned, missions completed and the
// player's last district, kept in localStorage under one key.

const KEY = 'solmar-bay-save-v14';

export function defaultSave() {
  return { cash: 0, bestDrift: 0, missionsWon: 0, checkpointsHit: 0, visits: 0 };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

export function storeSave(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
