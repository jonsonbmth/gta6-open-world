// SOLMAR BAY — save / resume via localStorage.
// Resume restores the exact job AND stage: it never restarts a job's stages.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var KEY = 'solmar-bay-save-v9';

  function defaults() {
    return {
      version: 9, money: 42780, respect: 320, respectLevel: 2,
      job: 0, stage: 0, jobsDone: 0,
      garage: ['VULPINE S'], muted: false, station: 0,
      bestSpeed: 0, nearMisses: 0, savedAt: 0
    };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.version !== 9) return null;
      return d;
    } catch (e) { return null; }
  }

  function save(state) {
    try {
      var d = {
        version: 9, money: state.money, respect: state.respect,
        respectLevel: state.respectLevel, job: state.job, stage: state.stage,
        jobsDone: state.jobsDone, garage: state.garage.slice(),
        muted: state.muted, station: state.station,
        bestSpeed: state.bestSpeed, nearMisses: state.nearMisses,
        savedAt: Date.now()
      };
      window.localStorage.setItem(KEY, JSON.stringify(d));
      return true;
    } catch (e) { return false; }
  }

  function clear() {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
  }

  SB.save = { KEY: KEY, defaults: defaults, load: load, save: save, clear: clear };
})();
