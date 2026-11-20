// Keyboard input: driving keys plus the action keys (map, enter/exit, radio,
// mute). Exposes a plain state object the game loop and the playtest read.
var CV = window.CV || (window.CV = {});

CV.input = (function () {
  var keys = {};
  var pressed = {}; // edge-triggered, consumed by main.js each frame
  var state = { forward: false, back: false, left: false, right: false, handbrake: false, run: false };

  var MAP = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'handbrake', ShiftLeft: 'run', ShiftRight: 'run' };
  var ACTION = { KeyM: 'map', KeyE: 'action', KeyR: 'radio', KeyN: 'mute', KeyF: 'interact', Escape: 'escape', Enter: 'start' };

  function init() {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space') e.preventDefault();
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
      var s = MAP[e.code];
      if (s) state[s] = true;
    });
    window.addEventListener('keyup', function (e) {
      keys[e.code] = false;
      var s = MAP[e.code];
      if (s) state[s] = false;
    });
    window.addEventListener('blur', function () {
      keys = {};
      state.forward = state.back = state.left = state.right = state.handbrake = state.run = false;
    });
  }

  // Returns and clears the action pressed this frame (e.g. 'map'), or null.
  function consumeAction() {
    for (var code in pressed) {
      if (pressed[code] && ACTION[code]) {
        pressed[code] = false;
        return ACTION[code];
      }
    }
    return null;
  }
  function clearPressed() { pressed = {}; }
  function isDown(code) { return !!keys[code]; }
  // Test hooks: let the playtest drive without a real keyboard.
  function setTest(name, v) { state[name] = v; }

  return { init: init, state: state, consumeAction: consumeAction, clearPressed: clearPressed, isDown: isDown, setTest: setTest };
})();
