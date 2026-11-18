// Shared helpers: seeded random, canvas textures, glow sprites, bright night env map.
import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Radial-gradient glow texture, reused by every fake-bloom sprite.
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function makeGlow(color, scale, opacity = 0.75) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}

// Neon shop sign: bright canvas text on a dark plate, always fully lit.
export function neonSignTexture(text, sub, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0618';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = color; g.lineWidth = 6;
  g.strokeRect(8, 8, 496, 144);
  g.font = '900 64px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(text, 256, sub ? 62 : 82);
  if (sub) {
    g.font = '700 34px Arial, sans-serif';
    g.shadowBlur = 14;
    g.fillStyle = '#ffffff';
    g.fillText(sub, 256, 122);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Building windows: mostly LIT (bright city, not dark). Returns { map, emissive }.
export function windowTextures(seed, warm = true) {
  const rnd = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#23233f';
  g.fillRect(0, 0, 128, 256);
  const cols = ['#ffd97a', '#ffe9b0', '#9fe8ff', '#ffd97a', '#fff3c4'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 6; x++) {
      const lit = rnd() < 0.72; // most windows lit: the city must read BRIGHT
      g.fillStyle = lit ? cols[Math.floor(rnd() * cols.length)] : '#101024';
      g.fillRect(6 + x * 20, 8 + y * 15, 14, 10);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const e = document.createElement('canvas');
  e.width = 128; e.height = 256;
  const ge = e.getContext('2d');
  ge.drawImage(c, 0, 0);
  const emissive = new THREE.CanvasTexture(e);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

// Extrude a 2D side profile into a 3D body: the anti-Minecraft helper.
// points: [[x, y], ...] with x = length (front = +x), y = height.
// The extrusion runs across the width (Z of the shape -> X of the mesh),
// the length lands on local +Z (nose forward), edges get a soft bevel.
// Returns a Mesh centred on X, sitting on y = 0.
export function extrudeProfile(points, width, mat, bevel = 0.06) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, steps: 1,
  });
  geo.rotateY(-Math.PI / 2); // shape X (length) -> local +Z, extrusion -> X
  geo.translate(width / 2, 0, 0); // centre the width on X
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

// A soft-edged slab (rounded box) via the same extrusion, for crates,
// containers and anything that must stay boxy but not sharp.
export function roundedSlab(w, h, d, mat, bevel = 0.08) {
  return extrudeProfile([[-d / 2, 0], [d / 2, 0], [d / 2, h], [-d / 2, h]], w, mat, bevel);
}
// paint and wet asphalt pick up colourful specular reflections.
export function nightEnvTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1a1440');
  grad.addColorStop(0.55, '#3a2a6e');
  grad.addColorStop(0.75, '#6a4a9e');
  grad.addColorStop(1, '#0c0a20');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  const blobs = [
    ['#ff2d95', 60, 150, 46], ['#00e5ff', 150, 140, 40], ['#ffd23e', 250, 155, 42],
    ['#ff2d95', 340, 145, 44], ['#00e5ff', 430, 150, 38], ['#ffffff', 200, 130, 22],
    ['#ff4040', 90, 170, 30], ['#4040ff', 380, 170, 30],
  ];
  for (const [col, x, y, r] of blobs) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Vertical alpha gradient texture for wet-road reflection streaks.
let streakTex = null;
export function streakTexture() {
  if (streakTex) return streakTex;
  const c = document.createElement('canvas');
  c.width = 16; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 128);
  streakTex = new THREE.CanvasTexture(c);
  return streakTex;
}

// A flat additive streak on the road, stretched toward the camera's road axis.
export function roadStreak(color, width, length, opacity = 0.55) {
  const m = new THREE.MeshBasicMaterial({
    map: streakTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), m);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// Additive light pool on the ground.
export function lightPool(color, radius, opacity = 0.4) {
  const m = new THREE.MeshBasicMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), m);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
