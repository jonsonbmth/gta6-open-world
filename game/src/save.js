// SOLMAR BAY — save / load in localStorage. Resume restores the exact
// mission and stage; it never restarts a job's stages.
(function () {
  'use strict';
  window.SB = window.SB || {};

  var KEY = 'solmarbay-save-v7';
  var S = {};

  S.save = function (state) {
    try {
      var data = {
        version: 7,
        cash: state.cash,
        respect: state.respect,
        missionIndex: state.missionIndex,
        missionStage: state.missionStage,
        completed: state.completed,
        garage: state.garage,
        hero: { x: state.x, z: state.z, heading: state.heading },
        inCar: state.inCar,
        station: state.station,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  };

  S.load = function () {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.version !== 7) return null;
      return data;
    } catch (e) {
      return null;
    }
  };

  S.hasSave = function () {
    return S.load() !== null;
  };

  S.clear = function () {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };

  SB.save = S;
})();
