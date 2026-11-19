// Small shared helpers: seeded random, math, canvas texture builders.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// Shortest-arc angle interpolation (radians).
export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function fmtMoney(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Make a canvas, draw on it, return the canvas (caller turns it into a texture or data URL).
export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

// A soft radial glow sprite texture in any colour (used for fake bloom).
export function glowTexture(color) {
  const c = makeCanvas(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color + 'cc');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// Vertical fading streak (wet-road reflection) texture.
export function streakTexture(color) {
  const c = makeCanvas(32, 128, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, color + 'ee');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 128);
  });
  return new THREE.CanvasTexture(c);
}

export function hexToCss(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}
