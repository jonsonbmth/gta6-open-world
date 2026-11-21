// Canvas-painted textures: building facades, shop signs, wood planks,
// clouds, and the 2D portraits used by the HUD dialog and crew cards.
// Everything is drawn in code — no image files, no downloads.
const THREE = window.THREE;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function canvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A building facade: base colour, rows of lit/unlit windows, a ground-floor
// shopfront with a readable sign, an awning and a door.
export function facadeTexture(base, sign, signColor, floors, litRatio, rng) {
  const [c, g] = canvas(256, 512);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  // subtle vertical shading
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  // window grid (upper floors)
  const rows = floors, cols = 4;
  const top = 24, bottom = 380;
  const rh = (bottom - top) / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = 18 + col * 58, y = top + r * rh + 8;
      const lit = rng() < litRatio;
      g.fillStyle = lit ? '#ffd98a' : '#1d2733';
      g.fillRect(x, y, 38, Math.min(30, rh - 16));
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x, y, 38, 4);
      // window frame
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2;
      g.strokeRect(x, y, 38, Math.min(30, rh - 16));
    }
  }
  // ground floor: shopfront
  g.fillStyle = '#14181f';
  g.fillRect(0, 400, 256, 112);
  g.fillStyle = signColor;
  g.fillRect(0, 400, 256, 34);
  g.fillStyle = '#101418';
  g.font = 'bold 21px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(sign, 128, 418);
  // shop windows + door
  g.fillStyle = '#ffe9b0';
  g.fillRect(16, 446, 84, 52);
  g.fillRect(156, 446, 84, 52);
  g.fillStyle = '#2a2118';
  g.fillRect(108, 446, 40, 58);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(16, 446, 84, 6);
  g.fillRect(156, 446, 84, 6);
  // striped awning
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#f2ede2' : signColor;
    g.fillRect(16 + i * 28, 434, 28, 12);
  }
  return canvasTexture(c);
}

// Wooden dock planks.
export function woodTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#8a5a33';
  g.fillRect(0, 0, 256, 256);
  for (let p = 0; p < 8; p++) {
    const y = p * 32;
    g.fillStyle = p % 2 ? '#7d4f2b' : '#96683c';
    g.fillRect(0, y, 256, 30);
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.lineWidth = 2;
    g.strokeRect(-2, y, 260, 30);
    // grain
    g.strokeStyle = 'rgba(60,30,10,0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const gy = y + 5 + Math.random() * 20;
      g.beginPath();
      g.moveTo(0, gy);
      g.bezierCurveTo(80, gy + 3, 170, gy - 3, 256, gy);
      g.stroke();
    }
    // nails
    g.fillStyle = 'rgba(30,20,10,0.6)';
    g.beginPath(); g.arc(12, y + 15, 2, 0, 7); g.fill();
    g.beginPath(); g.arc(244, y + 15, 2, 0, 7); g.fill();
  }
  const t = canvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Soft round cloud puff for the sky.
export function cloudTexture() {
  const [c, g] = canvas(256, 128);
  const blob = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,235,220,${a})`);
    gr.addColorStop(1, 'rgba(255,235,220,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  };
  blob(70, 80, 55, 0.85); blob(130, 65, 65, 0.9); blob(190, 82, 50, 0.8); blob(110, 90, 70, 0.7);
  return canvasTexture(c);
}

// Police door decal: "EBPD" + badge star.
export function policeDecalTexture() {
  const [c, g] = canvas(256, 128);
  g.clearRect(0, 0, 256, 128);
  g.fillStyle = '#12263f';
  g.font = '900 54px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('EBPD', 128, 62);
  g.font = 'bold 20px Arial, sans-serif';
  g.fillText('EMBER BAY POLICE', 128, 96);
  // badge star
  g.fillStyle = '#c9a227';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 8 : 18;
    const x = 34 + Math.cos(a) * r, y = 34 + Math.sin(a) * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath(); g.fill();
  return canvasTexture(c);
}

// Shirt with horizontal stripes.
export function stripeTexture(c1, c2) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = c1;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = c2;
  for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 14);
  return canvasTexture(c);
}

// ---- 2D portraits (HUD) -------------------------------------------------
// Draw a readable cartoon face on a 2D canvas: skin, hair, eyes, brows,
// nose shading, mouth, plus a coloured collar. Used for the dialog fixer
// portrait and the three crew cards.
export function drawPortrait(el, opts) {
  const g = el.getContext('2d');
  const W = el.width, H = el.height;
  g.clearRect(0, 0, W, H);
  // background
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, opts.bg || '#3a2b4d');
  bg.addColorStop(1, opts.bg2 || '#1d1526');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.46, r = W * 0.30;
  // neck + shoulders
  g.fillStyle = opts.skin;
  g.fillRect(cx - r * 0.32, cy + r * 0.72, r * 0.64, r * 0.7);
  g.fillStyle = opts.shirt;
  g.beginPath();
  g.ellipse(cx, H * 1.02, W * 0.62, H * 0.34, 0, Math.PI, 0);
  g.fill();
  // collar
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.moveTo(cx - r * 0.5, H * 0.86);
  g.lineTo(cx, H * 0.74);
  g.lineTo(cx + r * 0.5, H * 0.86);
  g.lineTo(cx + r * 0.28, H * 0.98);
  g.lineTo(cx, H * 0.9);
  g.lineTo(cx - r * 0.28, H * 0.98);
  g.closePath(); g.fill();
  // head
  g.fillStyle = opts.skin;
  g.beginPath();
  g.ellipse(cx, cy, r, r * 1.12, 0, 0, 7);
  g.fill();
  // ears
  g.beginPath(); g.ellipse(cx - r * 0.98, cy, r * 0.16, r * 0.26, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + r * 0.98, cy, r * 0.16, r * 0.26, 0, 0, 7); g.fill();
  // hair
  g.fillStyle = opts.hair;
  if (opts.hairStyle === 'cap') {
    g.beginPath();
    g.ellipse(cx, cy - r * 0.62, r * 1.04, r * 0.6, 0, Math.PI, 0);
    g.fill();
    g.fillRect(cx - r * 1.05, cy - r * 0.66, r * 2.1, r * 0.22);
  } else if (opts.hairStyle === 'long') {
    g.beginPath();
    g.ellipse(cx, cy - r * 0.28, r * 1.12, r * 1.15, 0, Math.PI * 0.95, Math.PI * 2.05);
    g.fill();
    g.beginPath();
    g.ellipse(cx - r * 1.0, cy + r * 0.55, r * 0.34, r * 0.8, 0.15, 0, 7);
    g.fill();
    g.beginPath();
    g.ellipse(cx + r * 1.0, cy + r * 0.55, r * 0.34, r * 0.8, -0.15, 0, 7);
    g.fill();
  } else if (opts.hairStyle === 'bun') {
    g.beginPath();
    g.ellipse(cx, cy - r * 0.55, r * 1.02, r * 0.62, 0, Math.PI, 0);
    g.fill();
    g.beginPath(); g.arc(cx, cy - r * 1.18, r * 0.34, 0, 7); g.fill();
  } else if (opts.hairStyle === 'grey') {
    g.beginPath();
    g.ellipse(cx, cy - r * 0.6, r * 1.02, r * 0.55, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath();
    g.ellipse(cx - r * 0.4, cy - r * 0.7, r * 0.3, r * 0.18, -0.4, 0, 7);
    g.fill();
  } else {
    g.beginPath();
    g.ellipse(cx, cy - r * 0.58, r * 1.03, r * 0.6, 0, Math.PI, 0);
    g.fill();
  }
  // eyebrows
  g.strokeStyle = opts.hair;
  g.lineWidth = Math.max(2, r * 0.09);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - r * 0.62, cy - r * 0.28); g.lineTo(cx - r * 0.2, cy - r * 0.36); g.stroke();
  g.beginPath(); g.moveTo(cx + r * 0.62, cy - r * 0.28); g.lineTo(cx + r * 0.2, cy - r * 0.36); g.stroke();
  // eyes
  const eye = (ex) => {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(ex, cy - r * 0.08, r * 0.2, r * 0.24, 0, 0, 7); g.fill();
    g.fillStyle = '#1a1512';
    g.beginPath(); g.arc(ex, cy - r * 0.08, r * 0.1, 0, 7); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ex + r * 0.04, cy - r * 0.12, r * 0.035, 0, 7); g.fill();
  };
  eye(cx - r * 0.4); eye(cx + r * 0.4);
  // nose shading
  g.strokeStyle = 'rgba(0,0,0,0.22)';
  g.lineWidth = Math.max(1.5, r * 0.05);
  g.beginPath();
  g.moveTo(cx, cy + r * 0.08);
  g.quadraticCurveTo(cx + r * 0.06, cy + r * 0.34, cx - r * 0.02, cy + r * 0.4);
  g.stroke();
  // mouth
  g.strokeStyle = '#7a3b2e';
  g.lineWidth = Math.max(2, r * 0.08);
  g.beginPath();
  g.arc(cx, cy + r * 0.42, r * 0.34, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  // cheek shading
  g.fillStyle = 'rgba(255,120,90,0.18)';
  g.beginPath(); g.ellipse(cx - r * 0.62, cy + r * 0.32, r * 0.22, r * 0.14, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx + r * 0.62, cy + r * 0.32, r * 0.22, r * 0.14, 0, 0, 7); g.fill();
}
