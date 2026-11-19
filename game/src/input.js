// SOLMAR BAY — keyboard input: held-key set plus a consume-on-read
// key-press queue (each press is delivered exactly once).
(function () {
  'use strict';
  window.SB = window.SB || {};

  var I = {
    held: {},
    queue: [],
  };

  var GAME_KEYS = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyF', 'KeyM',
    'KeyR', 'KeyP', 'KeyH', 'Enter', 'Escape', 'ShiftLeft', 'ShiftRight',
  ];

  I.init = function () {
    window.addEventListener('keydown', function (e) {
      if (GAME_KEYS.indexOf(e.code) < 0) return;
      if (e.code === 'Space') e.preventDefault();
      if (!I.held[e.code]) I.queue.push(e.code);
      I.held[e.code] = true;
    });
    window.addEventListener('keyup', function (e) {
      I.held[e.code] = false;
    });
    window.addEventListener('blur', function () {
      I.held = {};
    });
  };

  // True while the key is held down.
  I.down = function (code) {
    return !!I.held[code];
  };

  // True once per press; consumes the press.
  I.pressed = function (code) {
    var idx = I.queue.indexOf(code);
    if (idx < 0) return false;
    I.queue.splice(idx, 1);
    return true;
  };

  // Throttle -1..1 and steer -1..1 from held keys.
  I.driveInput = function () {
    var throttle = 0;
    if (I.down('KeyW')) throttle += 1;
    if (I.down('KeyS')) throttle -= 1;
    var steer = 0;
    if (I.down('KeyA')) steer -= 1;
    if (I.down('KeyD')) steer += 1;
    return { throttle: throttle, steer: steer, handbrake: I.down('Space') };
  };

  // On-foot move input: forward/strafe -1..1.
  I.walkInput = function () {
    var fwd = 0, strafe = 0;
    if (I.down('KeyW')) fwd += 1;
    if (I.down('KeyS')) fwd -= 1;
    if (I.down('KeyA')) strafe -= 1;
    if (I.down('KeyD')) strafe += 1;
    return { fwd: fwd, strafe: strafe, run: I.down('ShiftLeft') || I.down('ShiftRight') };
  };

  SB.input = I;
})();
