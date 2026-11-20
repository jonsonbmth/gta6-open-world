// SOLMAR BAY — save / load: cash, best drift and missions won persist in
// localStorage; the car position saves too, so the player resumes where they left off.

var SB = window.SB || (window.SB = {});

SB.save = (function () {
  const KEY = 'solmar-bay-save-v15';

  function saveGame(state) {
    try {
      const data = {
        cash: state.cash,
        bestDrift: state.bestDrift,
        missionsWon: state.missionsWon,
        carX: state.playerPos.x,
        carZ: state.playerPos.z,
        heading: state.heading,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadGame() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.cash !== 'number') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clearSave() {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  return { saveGame: saveGame, loadGame: loadGame, clearSave: clearSave };
})();
