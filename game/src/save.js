// Save/load: best drift, missions won, cash — localStorage, survives reload.
const KEY = 'solmar-bay-save-v16';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { bestDrift: 0, missionsWon: 0, cash: 0 };
    const d = JSON.parse(raw);
    return {
      bestDrift: d.bestDrift | 0,
      missionsWon: d.missionsWon | 0,
      cash: d.cash | 0,
    };
  } catch (e) {
    return { bestDrift: 0, missionsWon: 0, cash: 0 };
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}
