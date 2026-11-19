// Keyboard + pointer input. Movement keys are read live; one-shot actions are
// queued and consumed on read, so a single keypress is never applied twice or lost
// between frames.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_MAP = 8;
export const ACTION_RADIO = 16;
export const ACTION_DO = 32;
export const ACTION_MUTE = 64;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  KeyE: ACTION_ENTER_CAR,
  KeyM: ACTION_MAP,
  KeyR: ACTION_RADIO,
  KeyF: ACTION_DO,
  KeyN: ACTION_MUTE,
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) queued |= action;
    if (event.code === 'Space') event.preventDefault();
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function onPointer() {
    queued |= ACTION_CONFIRM;
  }
  if (canvas) canvas.addEventListener('pointerdown', onPointer);

  return {
    // -1/0/1 steering and throttle from the held keys.
    drive() {
      const steer = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const throttle = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
      return { steer, throttle, brake: held.has('Space'), run: held.has('ShiftLeft') || held.has('ShiftRight') };
    },
    // One-shot actions since the last call; reading consumes them.
    takeActions() {
      const out = queued;
      queued = 0;
      return out;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (canvas) canvas.removeEventListener('pointerdown', onPointer);
    },
  };
}
