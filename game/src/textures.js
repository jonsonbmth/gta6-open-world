// Procedural canvas textures, generated at runtime — no image files needed.
// Facades carry the visual richness: window grids, lit windows, awnings, signage.
// three.min.js is loaded by index.html as a classic script and exposes the
// global THREE; modules below use that global (no ES import of the vendor file).
const THREE = window.THREE;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A building facade: base colour, a grid of windows (some warm-lit, some dark
// glass), a darker ground floor with a shopfront band. Seeded so facades vary.
export function facadeTexture(base, glass, rng, floors = 8, cols = 5) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // subtle vertical shading strips so the wall is not one flat colour
  for (let x = 0; x < 256; x += 32) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    g.fillRect(x, 0, 32, 256);
  }
  const cw = 256 / cols;
  const fh = 220 / floors;
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + cw * 0.18;
      const y = 8 + f * fh + fh * 0.18;
      const w = cw * 0.64;
      const h = fh * 0.62;
      const lit = rng.chance(0.42);
      g.fillStyle = lit ? (rng.chance(0.6) ? '#ffd98a' : '#ffe9b8') : glass;
      g.fillRect(x, y, w, h);
      // window frame
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2;
      g.strokeRect(x, y, w, h);
      // mullion cross
      g.beginPath();
      g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h);
      g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2);
      g.stroke();
    }
  }
  // ground-floor shopfront band
  g.fillStyle = 'rgba(20,16,12,0.85)';
  g.fillRect(0, 228, 256, 28);
  g.fillStyle = '#f8e8c8';
  for (let x = 8; x < 250; x += 36) {
    g.fillRect(x, 234, 24, 16);
  }
  return toTexture(c);
}

// Road surface: dark asphalt with centre dashes, edge lines and a crosswalk.
// Drawn once per road segment, stretched along its length.
export function roadTexture(len, rng) {
  const [c, g] = canvas(128, 512);
  g.fillStyle = '#33333a';
  g.fillRect(0, 0, 128, 512);
  // asphalt noise
  for (let i = 0; i < 900; i++) {
    const v = rng.int(0, 22);
    g.fillStyle = `rgba(${v + 40},${v + 40},${v + 48},0.5)`;
    g.fillRect(rng.range(0, 128), rng.range(0, 512), 2, 2);
  }
  // wet sheen streaks (subtle horizontal bands)
  for (let i = 0; i < 14; i++) {
    g.fillStyle = 'rgba(255,220,160,0.05)';
    g.fillRect(0, rng.range(0, 512), 128, rng.range(2, 6));
  }
  // centre dashed line
  g.fillStyle = '#e8c84a';
  for (let y = 0; y < 512; y += 64) g.fillRect(62, y, 4, 34);
  // edge lines
  g.fillStyle = 'rgba(240,240,240,0.85)';
  g.fillRect(6, 0, 3, 512);
  g.fillRect(119, 0, 3, 512);
  // crosswalk near both ends
  g.fillStyle = 'rgba(240,240,240,0.9)';
  for (let x = 10; x < 118; x += 14) {
    g.fillRect(x, 18, 8, 26);
    g.fillRect(x, 468, 8, 26);
  }
  const t = toTexture(c, 1, Math.max(1, Math.round(len / 64)));
  return t;
}

// Sidewalk: light paving slabs with joints.
export function sidewalkTexture(rng) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#9a938a';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke();
  }
  for (let i = 0; i < 200; i++) {
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(rng.range(0, 128), rng.range(0, 128), 2, 2);
  }
  return toTexture(c, 4, 4);
}

// Shop sign: bold readable name on a coloured board.
export function signTexture(text, bg, fg) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 116);
  g.fillStyle = fg;
  g.font = 'bold 56px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const label = text.length > 14 ? text.slice(0, 14) : text;
  g.fillText(label, 256, 66);
  return toTexture(c);
}

// Radial glow sprite (for sun, lamps, headlights, taillight halo, light pools).
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(',1)', ',0.55)'));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft round pool of light on the ground (additive).
export function poolTexture() {
  return glowTexture('rgba(255,220,150,0.85)', 'rgba(255,220,150,0)');
}

// Sand: warm grains.
export function sandTexture(rng) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#d8b878';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 800; i++) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(120,90,40,0.18)' : 'rgba(255,240,200,0.18)';
    g.fillRect(rng.range(0, 128), rng.range(0, 128), 2, 2);
  }
  return toTexture(c, 8, 8);
}

// Sea: deep blue with faint moving-looking streaks (static texture, animated by UV offset in render).
export function seaTexture(rng) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#1a5a7a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
    g.lineWidth = rng.range(1, 3);
    const y = rng.range(0, 256);
    g.beginPath();
    g.moveTo(rng.range(0, 128), y);
    g.lineTo(rng.range(128, 256), y + rng.range(-6, 6));
    g.stroke();
  }
  const t = toTexture(c, 6, 6);
  return t;
}
