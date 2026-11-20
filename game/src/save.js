// Save/load: 3 slots in localStorage (cash, jobs done, best drift, rep,
// position). Guarded: headless or blocked storage degrades silently.
var CV = window.CV || (window.CV = {});

CV.save = (function () {
  var KEY = 'coral-vista-save-v1';

  function readAll() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function writeAll(data) {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }

  function saveSlot(slot, data) {
    var all = readAll();
    all['slot' + slot] = {
      cash: data.cash, jobsDone: data.jobsDone, bestDrift: data.bestDrift,
      rep: data.rep, jobIndex: data.jobIndex, x: data.x, z: data.z,
      savedAt: new Date().toISOString(),
    };
    return writeAll(all);
  }

  function loadSlot(slot) {
    var all = readAll();
    return all['slot' + slot] || null;
  }

  function clearSlot(slot) {
    var all = readAll();
    delete all['slot' + slot];
    return writeAll(all);
  }

  function listSlots() {
    var all = readAll();
    return [1, 2, 3].map(function (s) { return all['slot' + s] || null; });
  }

  return { saveSlot: saveSlot, loadSlot: loadSlot, listSlots: listSlots, clearSlot: clearSlot };
})();
