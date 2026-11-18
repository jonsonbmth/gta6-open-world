// SOLMAR BAY — save/load via localStorage. Progress survives a reload:
// money, respect, current job + stage, radio station, garage, position.

const KEY = 'solmar-bay-save-v6';

export function saveGame(state) {
  try {
    const data = {
      version: 6,
      money: state.money,
      respect: state.respect,
      jobIndex: state.jobIndex,
      stageIndex: state.stageIndex,
      radioIndex: state.radioIndex,
      garage: state.garage,
      playerX: state.playerX,
      playerZ: state.playerZ,
      playerHeading: state.playerHeading,
      completedJobs: state.completedJobs,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
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
    if (data.version !== 6) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
