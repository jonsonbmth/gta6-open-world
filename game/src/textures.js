// Procedural canvas textures — every surface in Solmar Bay is textured, never
// flat. All generators are seeded so the same build always looks the same.
import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

// Dark asphalt with speckle noise, hairline cracks and faint patches.
export function asphaltTexture(seed = 7) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(seed);
  g.fillStyle = '#2b2b30';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i += 1) {
    const v = 34 + Math.floor(rnd() * 26);
    g.fillStyle = `rgb(${v},${v},${v + 4})`;
    g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 1.6, 1.6);
  }
  g.strokeStyle = 'rgba(12,12,14,0.55)';
  g.lineWidth = 1;
  for (let i = 0; i < 14; i += 1) {
    g.beginPath();
    let x = rnd() * 256;
    let y = rnd() * 256;
    g.moveTo(x, y);
    for (let s = 0; s < 6; s += 1) {
      x += (rnd() - 0.5) * 44;
      y += (rnd() - 0.5) * 44;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = 'rgba(10,10,12,0.25)';
    g.beginPath();
    g.ellipse(rnd() * 256, rnd() * 256, 14 + rnd() * 26, 8 + rnd() * 14, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c, 1, 12);
}

// Road strip: asphalt + white edge lines + dashed centre line, tiled by length.
export function roadTexture(seed = 11) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(seed);
  g.fillStyle = '#2a2a2f';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i += 1) {
    const v = 36 + Math.floor(rnd() * 24);
    g.fillStyle = `rgb(${v},${v},${v + 4})`;
    g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 1.6, 1.6);
  }
  g.fillStyle = 'rgba(240,240,235,0.85)';
  g.fillRect(8, 0, 5, 256);
  g.fillRect(243, 0, 5, 256);
  g.fillStyle = 'rgba(245,197,24,0.9)';
  for (let y = 0; y < 256; y += 64) g.fillRect(125, y + 8, 6, 32);
  return toTexture(c, 1, 16);
}

// Light concrete sidewalk with expansion-joint grid.
export function sidewalkTexture(seed = 3) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(seed);
  g.fillStyle = '#9a938a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3600; i += 1) {
    const v = 140 + Math.floor(rnd() * 30);
    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 1.6, 1.6);
  }
  g.strokeStyle = 'rgba(70,64,58,0.6)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
  return toTexture(c, 1, 12);
}

// Building facade: base tone + window grid. Some windows glow warm (lit
// interiors), others are dark blue glass. `lit` sets the lit fraction.
export function facadeTexture(base, seed = 5, lit = 0.35) {
  const [c, g] = canvas(256, 512);
  const rnd = mulberry32(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2600; i += 1) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 512), 2, 2);
  }
  const cols = 4;
  const rows = 9;
  const ww = 38;
  const wh = 30;
  const gx = (256 - cols * ww) / (cols + 1);
  const gy = (512 - rows * wh) / (rows + 1);
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = gx + col * (ww + gx);
      const y = gy + r * (wh + gy);
      const isLit = rnd() < lit;
      g.fillStyle = 'rgba(20,18,16,0.85)';
      g.fillRect(x - 2, y - 2, ww + 4, wh + 4);
      if (isLit) {
        const warm = 200 + Math.floor(rnd() * 40);
        g.fillStyle = `rgb(${warm},${150 + Math.floor(rnd() * 40)},70)`;
      } else {
        g.fillStyle = '#22384e';
      }
      g.fillRect(x, y, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x, y, ww, 4);
    }
  }
  // Ground floor: darker band with shopfront glass.
  g.fillStyle = 'rgba(30,26,22,0.9)';
  g.fillRect(0, 512 - 56, 256, 56);
  g.fillStyle = '#3d5a74';
  for (let x = 12; x < 244; x += 48) g.fillRect(x, 512 - 46, 36, 34);
  return toTexture(c);
}

// Brick wall in a warm tone.
export function brickTexture(base = '#b98a68', seed = 9) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(seed);
  g.fillStyle = '#8d6b52';
  g.fillRect(0, 0, 256, 256);
  const bh = 16;
  const bw = 42;
  for (let row = 0; row < 256 / bh; row += 1) {
    const off = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col < 256 / bw + 1; col += 1) {
      const v = Math.floor(rnd() * 24) - 12;
      g.fillStyle = `rgb(${185 + v},${138 + v},${104 + v})`;
      g.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  return toTexture(c, 2, 2);
}

// Striped awning.
export function awningTexture(colorA, colorB) {
  const [c, g] = canvas(128, 64);
  for (let x = 0; x < 128; x += 16) {
    g.fillStyle = (x / 16) % 2 === 0 ? colorA : colorB;
    g.fillRect(x, 0, 16, 64);
  }
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 52, 128, 12);
  return toTexture(c, 3, 1);
}

// Glowing shop sign: dark panel, bright text. Used as an emissive map.
export function signTexture(text, color) {
  const [c, g] = canvas(512, 96);
  g.fillStyle = '#101018';
  g.fillRect(0, 0, 512, 96);
  g.font = '800 44px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 22;
  g.fillStyle = color;
  g.fillText(text, 256, 50);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = '800 44px Arial, sans-serif';
  g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Sky dome gradient: natural blue above, warm gold at the horizon.
export function skyTexture() {
  const [c, g] = canvas(64, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2f5ea8');
  grad.addColorStop(0.35, '#5b8cc9');
  grad.addColorStop(0.55, '#a8c4e2');
  grad.addColorStop(0.72, '#f2c078');
  grad.addColorStop(1.0, '#f7a54b');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Calm bay water: deep blue with soft light streaks.
export function waterTexture(seed = 21) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(seed);
  g.fillStyle = '#2e6f8e';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = `rgba(255,235,190,${0.04 + rnd() * 0.08})`;
    g.fillRect(rnd() * 256, rnd() * 256, 20 + rnd() * 60, 1.5);
  }
  for (let i = 0; i < 120; i += 1) {
    g.fillStyle = `rgba(10,40,60,${0.08 + rnd() * 0.1})`;
    g.fillRect(rnd() * 256, rnd() * 256, 30 + rnd() * 70, 2);
  }
  return toTexture(c, 4, 4);
}

// Dark wooden quay planks — ROUGH by design (no specular streaks).
export function quayTexture(seed = 13) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry32(seed);
  g.fillStyle = '#7a6a58';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = 'rgba(20,16,12,0.7)';
    g.fillRect(0, y, 256, 2);
    const v = Math.floor(rnd() * 18) - 9;
    g.fillStyle = `rgb(${122 + v},${106 + v},${88 + v})`;
    g.fillRect(0, y + 2, 256, 30);
  }
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(Math.floor(rnd() * 256), Math.floor(rnd() * 256), 2, 1);
  }
  return toTexture(c, 6, 6);
}
