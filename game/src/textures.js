// SOLSTICE BAY — canvas textures: every facade, face, sign and ground surface
// is painted in code (no image files, no downloads). Rich painted facades are
// what keeps the buildings from reading as plain window-grid boxes.
window.SB = window.SB || {};
SB.TEX = (function () {
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function tex(c, rx, ry) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); }
    return t;
  }
  function rnd(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Building facade: painted windows with varied sizes/lit states, floor bands,
  // ground-floor shop with a readable sign, awning stripes, balconies, AC units.
  function facade(opts) {
    const o = opts || {};
    const base = o.base || '#d8b48f';
    const floors = o.floors || 5;
    const c = canvas(256, 512);
    const g = c.getContext('2d');
    const R = rnd(o.seed || 7);
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 512);
    // subtle vertical shading + grime
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 512);
    const shopH = 92;
    const floorH = (512 - shopH) / floors;
    for (let f = 0; f < floors; f++) {
      const y0 = 8 + f * floorH;
      // floor band
      g.fillStyle = 'rgba(0,0,0,0.10)';
      g.fillRect(0, y0 + floorH - 5, 256, 4);
      const cols = 4 + Math.floor(R() * 2);
      for (let i = 0; i < cols; i++) {
        const w = 30 + R() * 14, h = 34 + R() * 22;
        const x = 14 + i * ((256 - 28) / cols) + R() * 6;
        const y = y0 + 8 + R() * 6;
        const lit = R() < 0.42;
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x - 3, y - 3, w + 6, h + 6);
        g.fillStyle = lit ? (R() < 0.5 ? '#ffd98a' : '#ffeec2') : (R() < 0.5 ? '#2c3e55' : '#43586e');
        g.fillRect(x, y, w, h);
        // window shine + mullions
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(x, y, w, 6);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(x + w / 2 - 1, y, 2, h);
        // balcony on some windows
        if (R() < 0.3) {
          g.fillStyle = 'rgba(20,20,28,0.8)';
          g.fillRect(x - 4, y + h + 2, w + 8, 10);
          g.fillStyle = 'rgba(255,255,255,0.16)';
          for (let b = 0; b < 4; b++) g.fillRect(x + b * (w / 4), y + h + 3, 2, 8);
        }
      }
      // AC unit on some floors
      if (R() < 0.5) {
        const ax = 20 + R() * 190, ay = y0 + floorH - 22;
        g.fillStyle = '#cfd4d8';
        g.fillRect(ax, ay, 26, 14);
        g.fillStyle = '#8a9298';
        for (let v = 0; v < 3; v++) g.fillRect(ax + 3, ay + 3 + v * 4, 20, 2);
      }
    }
    // ground-floor shop
    const sy = 512 - shopH;
    g.fillStyle = o.shopColor || '#20303e';
    g.fillRect(0, sy, 256, shopH);
    // awning stripes
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? (o.awning || '#e84c6a') : '#f5efe2';
      g.fillRect(i * 32, sy, 32, 22);
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, sy + 20, 256, 4);
    // shop glass + door
    g.fillStyle = '#9fd8e8';
    g.fillRect(16, sy + 30, 150, 52);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(16, sy + 30, 150, 10);
    g.fillStyle = '#1c2733';
    g.fillRect(182, sy + 30, 52, 52);
    g.fillStyle = '#ffd98a';
    g.fillRect(190, sy + 38, 36, 26);
    // sign text
    g.fillStyle = o.signColor || '#ffd94d';
    g.font = 'bold 22px Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(o.sign || 'MANGO & RYE', 128, sy + 78);
    return tex(c);
  }

  // Drawn character face (dialog portraits + crew cards + 3D head texture).
  function face(opts) {
    const o = opts || {};
    const c = canvas(128, 128);
    const g = c.getContext('2d');
    g.fillStyle = o.bg || '#2a2438';
    g.fillRect(0, 0, 128, 128);
    const skin = o.skin || '#c98d64';
    // head
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(64, 66, 38, 44, 0, 0, Math.PI * 2);
    g.fill();
    // ears
    g.beginPath(); g.ellipse(26, 66, 8, 12, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(102, 66, 8, 12, 0, 0, Math.PI * 2); g.fill();
    // hair
    g.fillStyle = o.hair || '#2a1a12';
    g.beginPath();
    g.ellipse(64, 38, 40, 26, 0, Math.PI, 0);
    g.fill();
    g.fillRect(24, 30, 80, 14);
    if (o.hairStyle === 'mohawk') { g.fillRect(56, 6, 16, 26); }
    if (o.hairStyle === 'bun') { g.beginPath(); g.arc(64, 12, 12, 0, Math.PI * 2); g.fill(); }
    if (o.hairStyle === 'cap') {
      g.fillStyle = o.capColor || '#c2242e';
      g.beginPath(); g.ellipse(64, 34, 42, 20, 0, Math.PI, 0); g.fill();
      g.fillRect(24, 30, 82, 8);
    }
    // brows + eyes
    g.fillStyle = o.hair || '#2a1a12';
    g.fillRect(38, 56, 18, 5);
    g.fillRect(72, 56, 18, 5);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(47, 68, 8, 6, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(81, 68, 8, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a22';
    g.beginPath(); g.arc(48, 68, 3.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(80, 68, 3.5, 0, Math.PI * 2); g.fill();
    // nose + mouth
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(64, 72); g.lineTo(61, 82); g.lineTo(67, 82); g.stroke();
    g.strokeStyle = '#7a3b2e';
    g.lineWidth = 3;
    g.beginPath();
    if (o.smile === false) { g.moveTo(52, 96); g.quadraticCurveTo(64, 92, 76, 96); }
    else { g.moveTo(52, 94); g.quadraticCurveTo(64, 102, 76, 94); }
    g.stroke();
    // shirt
    g.fillStyle = o.shirt || '#4c9e8f';
    g.fillRect(0, 112, 128, 16);
    return c;
  }

  // Ground: one big painted canvas — asphalt avenues with dashes, crosswalks,
  // sidewalks, sand beach and water edge. Far richer than a flat gray plane.
  function ground() {
    const S = 2048;
    const c = canvas(S, S);
    const g = c.getContext('2d');
    const R = rnd(99);
    // base: warm sidewalk concrete
    g.fillStyle = '#b8a88e';
    g.fillRect(0, 0, S, S);
    // speckle
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      g.fillRect(R() * S, R() * S, 3, 3);
    }
    // beach sand on the west edge + water
    g.fillStyle = '#e8d29a';
    g.fillRect(0, 0, 220, S);
    g.fillStyle = '#2e8fa8';
    g.fillRect(0, 0, 70, S);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = 0; y < S; y += 46) g.fillRect(66, y, 10, 22);
    // roads: grid every 44 world units -> 2048/420 px per unit ≈ 4.876
    const px = S / 420;
    const roadW = 14 * px;
    const step = 44 * px;
    function road(x0, y0, w, h) {
      g.fillStyle = '#3a3f46';
      g.fillRect(x0, y0, w, h);
      // center dashes
      g.fillStyle = '#e8c33c';
      if (w > h) { for (let x = x0 + 8; x < x0 + w - 20; x += 42) g.fillRect(x, y0 + h / 2 - 2, 24, 4); }
      else { for (let y = y0 + 8; y < y0 + h - 20; y += 42) g.fillRect(x0 + w / 2 - 2, y, 4, 24); }
      // edge lines
      g.fillStyle = 'rgba(255,255,255,0.55)';
      if (w > h) { g.fillRect(x0, y0 + 6, w, 3); g.fillRect(x0, y0 + h - 9, w, 3); }
      else { g.fillRect(x0 + 6, y0, 3, h); g.fillRect(x0 + w - 9, y0, 3, h); }
    }
    const off = S / 2;
    for (let i = -4; i <= 4; i++) {
      const p = off + i * step - roadW / 2;
      if (p > 240) road(p, 0, roadW, S); // vertical avenues
      if (p > 240) road(0, p, S, roadW); // horizontal streets
    }
    // crosswalks at intersections
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const cx = off + i * step, cy = off + j * step;
      if (cx < 260 || cy < 260) continue;
      for (let k = -2; k <= 2; k++) {
        g.fillRect(cx - roadW / 2 + 8, cy + k * 12 - 3, roadW - 16, 6);
        g.fillRect(cx + k * 12 - 3, cy - roadW / 2 + 8, 6, roadW - 16);
      }
    }
    // sidewalk curbs around blocks
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 4;
    for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) {
      const x0 = off + i * step + roadW / 2, y0 = off + j * step + roadW / 2;
      if (x0 < 240) continue;
      g.strokeRect(x0 + 2, y0 + 2, step - roadW - 4, step - roadW - 4);
    }
    return tex(c);
  }

  // Sunset sky gradient for the dome.
  function sky() {
    const c = canvas(64, 512);
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#2b1d4e');
    grad.addColorStop(0.35, '#6b3a7d');
    grad.addColorStop(0.6, '#c65f7c');
    grad.addColorStop(0.8, '#f0965a');
    grad.addColorStop(1.0, '#ffd194');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 512);
    return tex(c);
  }

  // Soft radial pool for the helicopter spotlight.
  function pool() {
    const c = canvas(256, 256);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,246,200,0.85)');
    grad.addColorStop(0.5, 'rgba(255,240,170,0.35)');
    grad.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return tex(c);
  }

  // Soft cloud puff sprite.
  function cloud() {
    const c = canvas(256, 128);
    const g = c.getContext('2d');
    const blobs = [[60, 80, 34], [110, 62, 44], [170, 74, 38], [210, 88, 26], [90, 92, 30], [150, 94, 28]];
    for (const [x, y, r] of blobs) {
      const grad = g.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255,235,220,0.85)');
      grad.addColorStop(1, 'rgba(255,235,220,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    return tex(c);
  }

  // Neon shop sign strip.
  function sign(text, bg, fg) {
    const c = canvas(512, 96);
    const g = c.getContext('2d');
    g.fillStyle = bg || '#14101f';
    g.fillRect(0, 0, 512, 96);
    g.strokeStyle = fg || '#ff5d8f';
    g.lineWidth = 4;
    g.strokeRect(6, 6, 500, 84);
    g.fillStyle = fg || '#ff5d8f';
    g.font = 'bold 52px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = fg || '#ff5d8f';
    g.shadowBlur = 18;
    g.fillText(text, 256, 52);
    return tex(c);
  }

  return { facade, face, ground, sky, pool, cloud, sign, canvas, tex };
})();
