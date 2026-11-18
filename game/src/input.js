// SOLMAR BAY — keyboard input. Held keys are a live set; presses are a
// consume-on-read queue, so a quick tap is never lost between slow frames
// (a frame can take 150 ms in software rendering — clearing presses at the
// end of a frame would drop taps that land mid-render).

export class Input {
  constructor() {
    this.down = new Set();
    this.pressedQueue = new Set();
    this._onDown = (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressedQueue.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    };
    this._onUp = (e) => this.down.delete(e.code);
    this._onBlur = () => { this.down.clear(); };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', this._onBlur);
  }
  isDown(code) { return this.down.has(code); }
  /** True once per physical press: consumes the queued press. */
  pressed(code) {
    if (this.pressedQueue.has(code)) {
      this.pressedQueue.delete(code);
      return true;
    }
    return false;
  }
  /** Drop queued presses (e.g. on a state transition). */
  clearPressed() { this.pressedQueue.clear(); }
  /** Kept for API compatibility; the queue is consume-on-read now. */
  endFrame() {}
  destroy() {
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
