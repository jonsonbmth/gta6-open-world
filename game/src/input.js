// Keyboard and mouse, read once per frame. Keys are tracked by code so the
// layout does not matter; the mouse steers the camera (drag, or pointer lock
// on click) and fires the pistol.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MAP = 'map';
export const ACTION_ENTER = 'enter';
export const ACTION_PUNCH = 'punch';
export const ACTION_RADIO = 'radio';
export const ACTION_GARAGE = 'garage';
export const ACTION_HANDBRAKE = 'handbrake';
export const ACTION_RUN = 'run';
export const ACTION_SHOOT = 'shoot';
export const ACTION_WEAPON1 = 'weapon1';
export const ACTION_WEAPON2 = 'weapon2';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_HANDBRAKE,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MAP,
  KeyE: ACTION_ENTER,
  KeyF: ACTION_PUNCH,
  KeyR: ACTION_RADIO,
  KeyG: ACTION_GARAGE,
  Digit1: ACTION_WEAPON1,
  Digit2: ACTION_WEAPON2,
  ShiftLeft: ACTION_RUN,
  ShiftRight: ACTION_RUN,
};

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  const mouse = { dx: 0, dy: 0, down: false, clicked: false, x: 0, y: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onKeyDown(event) {
    if (event.code === 'Space') event.preventDefault();
    if (!event.repeat) {
      down.add(event.code);
      const action = KEY_ACTIONS[event.code];
      if (action) pressed.add(action);
    }
  }
  function onKeyUp(event) {
    down.delete(event.code);
  }
  function onMouseDown(event) {
    mouse.down = true;
    mouse.clicked = true;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (canvas.requestPointerLock && document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock(); } catch { /* pointer lock is optional */ }
    }
  }
  function onMouseUp() {
    mouse.down = false;
    dragging = false;
  }
  function onMouseMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (document.pointerLockElement === canvas) {
      mouse.dx += event.movementX;
      mouse.dy += event.movementY;
    } else if (dragging) {
      mouse.dx += event.clientX - lastX;
      mouse.dy += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  return {
    // -1/1 drive and steer, from WASD and the arrow keys.
    axes() {
      const forward = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0)
        - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
      const strafe = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0)
        - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
      return { forward, strafe };
    },
    isDown(action) {
      if (action === ACTION_RUN) return down.has('ShiftLeft') || down.has('ShiftRight');
      if (action === ACTION_HANDBRAKE) return down.has('Space');
      if (action === ACTION_SHOOT) return mouse.down;
      return false;
    },
    // True once, on the frame the key went down.
    wasPressed(action) {
      return pressed.has(action);
    },
    consumeMouse() {
      const out = { dx: mouse.dx, dy: mouse.dy };
      mouse.dx = 0;
      mouse.dy = 0;
      return out;
    },
    clicked() {
      return mouse.clicked;
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    },
  };
}
