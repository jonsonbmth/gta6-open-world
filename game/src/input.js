// Keyboard + mouse input. WASD drive / walk, E enter-exit car, SPACE
// handbrake, SHIFT run, M map / pause, R radio, F action, N mute, P pause.
// Mouse drag orbits the camera a little; click starts audio + dismisses title.

(function () {
  'use strict';

  const keys = {};
  const pressed = {}; // edge-triggered, consumed by the game loop

  const Input = {
    keys, pressed,
    dragX: 0, dragY: 0, dragging: false,

    init() {
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        keys[e.code] = true;
        pressed[e.code] = true;
        if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => { keys[e.code] = false; });
      window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

      let lx = 0, ly = 0;
      window.addEventListener('mousedown', (e) => { this.dragging = true; lx = e.clientX; ly = e.clientY; });
      window.addEventListener('mouseup', () => { this.dragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (!this.dragging) return;
        this.dragX += e.clientX - lx;
        this.dragY += e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
      });
    },

    down(code) { return !!keys[code]; },
    // True once per physical press; the game loop clears the set each frame.
    hit(code) { return !!pressed[code]; },
    endFrame() { for (const k in pressed) delete pressed[k]; this.dragX = 0; this.dragY = 0; },

    steer() {
      let s = 0;
      if (keys.KeyA || keys.ArrowLeft) s -= 1;
      if (keys.KeyD || keys.ArrowRight) s += 1;
      return s;
    },
    throttle() {
      let t = 0;
      if (keys.KeyW || keys.ArrowUp) t += 1;
      if (keys.KeyS || keys.ArrowDown) t -= 1;
      return t;
    },
  };

  VB.input = Input;
})();
