// Keyboard + mouse state. `down` is held keys, `hit` is keys pressed since
// the last frame (edge-triggered, consumed by the game loop each frame).

export const keysDown = new Set();
export const keysHit = new Set();
export const mouse = { x: 0, y: 0, down: false };

let attached = false;

export function initInput() {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keysDown.add(e.code);
    keysHit.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.code));
  window.addEventListener('blur', () => {
    keysDown.clear();
    keysHit.clear();
  });
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mousedown', () => {
    mouse.down = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
}

export function isDown(code) {
  return keysDown.has(code);
}

export function wasHit(code) {
  return keysHit.has(code);
}

// Call once per frame after all systems read input.
export function endFrameInput() {
  keysHit.clear();
}

// Steering / throttle helpers: arrows or WASD.
export function driveInput() {
  const throttle =
    (isDown('KeyW') || isDown('ArrowUp') ? 1 : 0) -
    (isDown('KeyS') || isDown('ArrowDown') ? 1 : 0);
  const steer =
    (isDown('KeyA') || isDown('ArrowLeft') ? 1 : 0) -
    (isDown('KeyD') || isDown('ArrowRight') ? 1 : 0);
  const handbrake = isDown('Space');
  return { throttle, steer, handbrake };
}

export function walkInput() {
  const fwd =
    (isDown('KeyW') || isDown('ArrowUp') ? 1 : 0) -
    (isDown('KeyS') || isDown('ArrowDown') ? 1 : 0);
  const strafe =
    (isDown('KeyD') || isDown('ArrowRight') ? 1 : 0) -
    (isDown('KeyA') || isDown('ArrowLeft') ? 1 : 0);
  const run = isDown('ShiftLeft') || isDown('ShiftRight');
  return { fwd, strafe, run };
}
