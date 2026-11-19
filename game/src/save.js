// localStorage save for SOLMAR BAY. A save holds the player's money,
// respect, current job + stage, position, wanted level and radio station, so
// resuming drops the player back into the SAME job stage — never restarts it.
// All access is guarded: private browsing or a full quota must never throw.
const KEY = 'solmar-bay-save-v10';

export function saveGame(state) {
  try {
    const payload = {
      v: 10,
      money: state.money,
      respect: state.respect,
      jobIndex: state.jobIndex,
      stageIndex: state.stageIndex,
      wanted: state.wanted,
      station: state.station,
      pos: state.pos ? [state.pos.x, state.pos.z] : null,
      onFoot: !!state.onFoot,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 10) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
