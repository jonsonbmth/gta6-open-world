// Keyboard input with consume-on-read presses (no stuck keys).

export class Input {
  constructor() {
    this.keys = new Set();
    this._pressed = new Set();
    this._onDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this._pressed.add(e.code);
    };
    this._onUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => { this.keys.clear(); this._pressed.clear(); };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', this._onBlur);
  }

  down(code) { return this.keys.has(code); }

  // True once per physical press; consumes the press.
  pressed(code) {
    if (this._pressed.has(code)) {
      this._pressed.delete(code);
      return true;
    }
    return false;
  }

  // WASD / arrows as -1..1 axes.
  axis() {
    const x = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    const y = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    return { x, y };
  }

  dispose() {
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
