// Keyboard input: WASD/arrows, Space, Shift, E, F, M, P, R, N.
export function createInput() {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered, consumed by the game each frame
  function down(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  }
  function up(e) { keys.delete(e.code); }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return {
    get drive() { return (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0); },
    get steer() { return (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0); },
    get handbrake() { return keys.has('Space'); },
    get run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    wasPressed(code) {
      if (pressed.has(code)) { pressed.delete(code); return true; }
      return false;
    },
    clearPressed() { pressed.clear(); },
  };
}
