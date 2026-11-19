// SOLMAR BAY — save/resume via localStorage. Resume restores the exact
// chapter + stage (it never restarts a job) and shows the current objective.
const KEY = 'solmar-bay-save-v11';

export function saveGame(state) {
  try {
    const data = {
      version: 11,
      savedAt: Date.now(),
      money: state.money,
      respect: state.respect,
      missions: state.missions,
      station: state.station,
      muted: state.muted,
      player: state.player,
      car: state.car,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 11) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function hasSave() {
  return loadGame() !== null;
}
