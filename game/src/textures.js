// SOLMAR BAY — every texture is drawn on a canvas at run time.
// No image files, no network: neon signs, lit windows, wet-road streaks,
// glow sprites and character portraits are all procedural.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Soft radial glow — the fake-bloom sprite used on every light. */
export function makeGlowTexture(color = '#ffffff') {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.9;
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // Fade the outer ring to transparent black so additive blending looks clean.
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.6, 'rgba(255,255,255,0.55)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

/** Vertical streak that fades with distance — a wet-asphalt reflection. */
export function makeStreakTexture(color = '#ffffff') {
  const [c, g] = canvas(64, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(255,255,255,0)');
  side.addColorStop(0.5, 'rgba(255,255,255,1)');
  side.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = side;
  g.fillRect(0, 0, 64, 256);
  return toTexture(c);
}

/** Building windows: a grid of lit (warm/cool) and dark panes. */
export function makeWindowTexture(rng, cols = 8, rows = 16, litRatio = 0.55) {
  const [c, g] = canvas(cols * 16, rows * 16);
  g.fillStyle = '#0b0e1c';
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * 16 + 3, py = y * 16 + 3;
      if (rng.chance(litRatio)) {
        const warm = rng.chance(0.72);
        g.fillStyle = warm ? '#ffd489' : '#9fd8ff';
        g.globalAlpha = rng.range(0.55, 1);
        g.fillRect(px, py, 10, 9);
      } else {
        g.fillStyle = '#131728';
        g.globalAlpha = 1;
        g.fillRect(px, py, 10, 9);
      }
    }
  }
  g.globalAlpha = 1;
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A neon shop sign: glowing text on a dark panel. */
export function makeNeonSignTexture(text, color, w = 512, h = 128) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#0a0616';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = color;
  g.globalAlpha = 0.55;
  g.lineWidth = 3;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.globalAlpha = 1;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 64;
  g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  while (g.measureText(text).width > w - 40 && size > 18) {
    size -= 4;
    g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  }
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = '#ffffff';
  g.fillText(text, w / 2, h / 2 + 2);
  g.shadowBlur = 12;
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2 + 2);
  return toTexture(c);
}

/** Small text plate (POLICE doors, TAXI roof sign, licence plates). */
export function makeTextPlateTexture(text, fg = '#ffffff', bg = '#0a0a12', w = 256, h = 64) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 40px "Arial Black", Arial, sans-serif`;
  g.fillText(text, w / 2, h / 2 + 2);
  return toTexture(c);
}

/** Asphalt with lane dashes, edge lines and a subtle wet sheen. */
export function makeRoadTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#0c0f1e';
  g.fillRect(0, 0, 256, 256);
  // Speckle for wet asphalt grain.
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(14 + Math.random() * 22);
    g.fillStyle = `rgb(${v},${v + 4},${v + 16})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // Centre double line (yellow) and lane dashes (white).
  g.fillStyle = '#d9a521';
  g.fillRect(122, 0, 5, 256);
  g.fillRect(131, 0, 5, 256);
  g.fillStyle = '#c8d0e8';
  for (let y = 0; y < 256; y += 64) g.fillRect(62, y + 8, 5, 34);
  for (let y = 0; y < 256; y += 64) g.fillRect(190, y + 8, 5, 34);
  // Edge lines.
  g.fillStyle = '#8d97b8';
  g.fillRect(6, 0, 4, 256);
  g.fillRect(246, 0, 4, 256);
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Sidewalk paving: large dark tiles with lighter joints. */
export function makeSidewalkTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#1a1e30';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#2c3250';
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Stylised character portrait for the dialogue box (canvas 2D). */
export function makePortraitTexture(person) {
  const [c, g] = canvas(160, 160);
  // Background: dark violet with a neon rim.
  const bg = g.createLinearGradient(0, 0, 0, 160);
  bg.addColorStop(0, '#241a4a');
  bg.addColorStop(1, '#0d0a24');
  g.fillStyle = bg;
  g.fillRect(0, 0, 160, 160);
  g.strokeStyle = person.coat;
  g.lineWidth = 4;
  g.globalAlpha = 0.8;
  g.strokeRect(4, 4, 152, 152);
  g.globalAlpha = 1;
  // Shoulders / coat.
  g.fillStyle = person.coat;
  g.beginPath();
  g.ellipse(80, 168, 62, 44, 0, Math.PI, 0);
  g.fill();
  // Neck + face.
  g.fillStyle = person.skin;
  g.fillRect(70, 96, 20, 22);
  g.beginPath();
  g.ellipse(80, 76, 34, 40, 0, 0, Math.PI * 2);
  g.fill();
  // Hair / hat.
  g.fillStyle = person.hair;
  if (person.hat === 'hood') {
    g.beginPath();
    g.ellipse(80, 62, 40, 34, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = '#ffd60a';
    g.beginPath();
    g.ellipse(80, 58, 44, 30, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = person.skin;
    g.beginPath();
    g.ellipse(80, 76, 30, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = person.hair;
    g.beginPath();
    g.ellipse(80, 58, 32, 12, 0, Math.PI, 0);
    g.fill();
  } else if (person.hat === 'goggles') {
    g.beginPath();
    g.ellipse(80, 56, 36, 22, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = '#111827';
    g.fillRect(44, 58, 72, 14);
    g.fillStyle = '#7dd3fc';
    g.beginPath(); g.arc(60, 65, 8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(100, 65, 8, 0, Math.PI * 2); g.fill();
  } else if (person.hat === 'bandana') {
    g.fillStyle = '#dc2626';
    g.beginPath();
    g.ellipse(80, 54, 36, 20, 0, Math.PI, 0);
    g.fill();
    g.fillRect(44, 50, 72, 8);
  } else if (person.hat === 'bun') {
    g.beginPath();
    g.arc(80, 32, 14, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(80, 56, 36, 20, 0, Math.PI, 0);
    g.fill();
  } else {
    g.beginPath();
    g.ellipse(80, 56, 36, 22, 0, Math.PI, 0);
    g.fill();
  }
  // Eyes.
  g.fillStyle = '#111111';
  g.beginPath(); g.arc(66, 78, 4.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(94, 78, 4.5, 0, Math.PI * 2); g.fill();
  // Brows, nose, mouth.
  g.strokeStyle = '#111111';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(58, 68); g.lineTo(74, 66); g.stroke();
  g.beginPath(); g.moveTo(86, 66); g.lineTo(102, 68); g.stroke();
  g.beginPath(); g.moveTo(80, 82); g.lineTo(78, 92); g.stroke();
  g.beginPath(); g.moveTo(68, 100); g.quadraticCurveTo(80, 107, 92, 100); g.stroke();
  return toTexture(c);
}

/** Portrait as a data URL for the DOM dialogue box. */
export function makePortraitDataURL(person) {
  const [c, g] = canvas(160, 160);
  const tex = makePortraitTexture(person);
  g.drawImage(tex.image, 0, 0);
  return c.toDataURL('image/png');
}
