// Keyboard + mouse-drag look. Keys are exposed as a live state object;
// edge-triggered actions (E, M, R, F, N, H) fire callbacks once per press.
export function createInput() {
  const keys = {};
  const handlers = {};
  const state = { keys, lookX: 0, lookY: 0, dragging: false };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (handlers[e.code]) handlers[e.code]();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  let lastX = 0, lastY = 0;
  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, .clickable')) return;
    state.dragging = true;
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { state.dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!state.dragging) return;
    state.lookX += (e.clientX - lastX) * 0.004;
    state.lookY = Math.max(-0.5, Math.min(0.5, state.lookY + (e.clientY - lastY) * 0.003));
    lastX = e.clientX; lastY = e.clientY;
  });

  state.on = (code, fn) => { handlers[code] = fn; };
  state.pressed = (code) => !!keys[code];
  return state;
}
