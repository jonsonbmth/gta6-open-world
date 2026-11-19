// SOLMAR BAY — keyboard input with a consume-on-read pressed queue.
// Held keys are read every frame; single presses are queued and consumed once,
// so a tap is never double-counted across frames.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};

  var held = {};
  var queue = [];

  function codeOf(e) { return e.code || ('Key' + e.key.toUpperCase()); }

  window.addEventListener('keydown', function (e) {
    var c = codeOf(e);
    if (!held[c]) queue.push(c);
    held[c] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(c) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { held[codeOf(e)] = false; });
  window.addEventListener('blur', function () { held = {}; queue.length = 0; });

  function isDown(code) { return !!held[code]; }

  // Returns true once per physical press; the press is consumed by the read.
  function pressed(code) {
    var i = queue.indexOf(code);
    if (i >= 0) { queue.splice(i, 1); return true; }
    return false;
  }

  function endFrame() { queue.length = 0; }

  // Test hook: inject a synthetic press (used by the playtest).
  function inject(code) { queue.push(code); held[code] = true; setTimeout(function () { held[code] = false; }, 50); }

  SB.input = { isDown: isDown, pressed: pressed, endFrame: endFrame, inject: inject };
})();
