// SOLMAR BAY — keyboard input with a consume-on-read pressed queue.
// pressedOnce(code) returns true exactly once per physical press.
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this.onKeyUp = (e) => {
      this.down.delete(e.code);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  isDown(code) { return this.down.has(code); }

  // Consume-on-read: true once per press, then false until pressed again.
  pressedOnce(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  // Axis helpers for driving / walking.
  driveAxis() {
    let a = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) a += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) a -= 1;
    return a;
  }

  steerAxis() {
    let s = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) s += 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) s -= 1;
    return s;
  }
}
