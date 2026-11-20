// SOLMAR BAY — keyboard input. WASD / arrows drive, Space handbrake-drifts,
// E enters or exits a car, F punches on foot, M opens the city map, P pauses,
// R resets the car, N toggles sound. An override object lets the playtest and
// the screenshot shots drive the car without a keyboard.

var SB = window.SB || (window.SB = {});

SB.input = (function () {
  const keys = {};
  // Test and shot scripts set these to drive the car programmatically.
  const override = { up: false, down: false, left: false, right: false, handbrake: false };

  function isDown(code) { return !!keys[code]; }

  const api = {
    keys: keys,
    override: override,
    // True while any of these physical keys is held.
    up: function () { return override.up || isDown('KeyW') || isDown('ArrowUp'); },
    down: function () { return override.down || isDown('KeyS') || isDown('ArrowDown'); },
    left: function () { return override.left || isDown('KeyA') || isDown('ArrowLeft'); },
    right: function () { return override.right || isDown('KeyD') || isDown('ArrowRight'); },
    handbrake: function () { return override.handbrake || isDown('Space'); },
    // Edge-triggered actions, consumed by the game loop.
    pressed: {},
  };

  window.addEventListener('keydown', function (e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) {
      e.preventDefault();
    }
    if (!keys[e.code]) api.pressed[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () {
    for (const k in keys) keys[k] = false;
  });

  return api;
})();
