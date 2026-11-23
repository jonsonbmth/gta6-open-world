// Procedural canvas textures for AURELIA BAY. No image files: every surface
// is painted at load from a seeded canvas, so the game stays self-contained.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function tex(c, rx, ry) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Speckled asphalt with faint cracks and patch stains.
  function asphalt() {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#33363b'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) {
      const v = U.randInt(28, 78);
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 4) + ')';
      g.fillRect(U.rand(0, 256), U.rand(0, 256), 1.6, 1.6);
    }
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = 'rgba(20,20,22,0.55)'; g.lineWidth = 1;
      g.beginPath();
      let x = U.rand(0, 256), y = U.rand(0, 256);
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += U.rand(-34, 34); y += U.rand(-34, 34); g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(18,18,20,0.16)';
      g.beginPath(); g.ellipse(U.rand(0, 256), U.rand(0, 256), U.rand(20, 60), U.rand(12, 34), U.rand(0, 3), 0, 7); g.fill();
    }
    return tex(c, 40, 40);
  }

  // Pale pavement slabs with expansion joints.
  function concrete() {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#b9b3a4'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = U.randInt(150, 205);
      g.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 20) + ')';
      g.fillRect(U.rand(0, 256), U.rand(0, 256), 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(90,84,70,0.7)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    }
    return tex(c, 6, 6);
  }

  function sand() {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#dcc691'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) {
      const v = U.randInt(190, 235);
      g.fillStyle = 'rgb(' + v + ',' + (v - 28) + ',' + (v - 88) + ')';
      g.fillRect(U.rand(0, 256), U.rand(0, 256), 1.6, 1.6);
    }
    return tex(c, 8, 8);
  }

  // Building facade: window grid, varied lit windows, ground-floor band.
  function facade(base, floors, lit) {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    // subtle vertical grime
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.fillRect(U.rand(0, 256), 0, U.rand(2, 9), 256);
    }
    const cols = 6, fh = 256 / floors;
    for (let f = 0; f < floors; f++) {
      for (let col = 0; col < cols; col++) {
        const x = 14 + col * 40, y = 10 + f * fh;
        const w = 26, h = Math.min(fh - 16, 34);
        const isLit = U.rng() < lit;
        g.fillStyle = isLit ? '#ffd98a' : '#1d2a3a';
        g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.fillRect(x, y, w, 4);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y + h - 3, w, 3);
      }
    }
    // ground floor: darker band with door + shop windows
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 256 - 34, 256, 34);
    g.fillStyle = '#2c3a48';
    g.fillRect(20, 256 - 30, 44, 26);
    g.fillRect(88, 256 - 30, 44, 26);
    g.fillRect(156, 256 - 30, 44, 26);
    return tex(c, 1, 1);
  }

  // Shop sign board with the shop's name painted on it.
  function shopSign(name, bg, fg) {
    const c = canvas(512, 128), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = fg;
    g.font = 'bold 54px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, 256, 68);
    return tex(c, 1, 1);
  }

  // Striped awning canvas.
  function awning(c1, c2) {
    const c = canvas(128, 128), g = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? c1 : c2;
      g.fillRect(i * 16, 0, 16, 128);
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 100, 128, 28);
    return tex(c, 1, 1);
  }

  // Dense green foliage for hedges and bushes.
  function foliage() {
    const c = canvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#2e6b2f'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const v = U.randInt(0, 3);
      g.fillStyle = ['#357a35', '#2a5f2b', '#3f8a3a', '#27521f'][v];
      g.beginPath(); g.arc(U.rand(0, 128), U.rand(0, 128), U.rand(2, 5), 0, 7); g.fill();
    }
    return tex(c, 2, 1);
  }

  function water() {
    const c = canvas(256, 256), g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2f7fb8'); grad.addColorStop(1, '#1d5a8a');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 130; i++) {
      g.strokeStyle = 'rgba(255,255,255,' + U.rand(0.05, 0.22) + ')';
      g.lineWidth = 1.4;
      const y = U.rand(0, 256), x = U.rand(0, 256), len = U.rand(12, 52);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    }
    return tex(c, 6, 6);
  }

  function brick() {
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#9a5a44'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#c8b8a8';
    for (let y = 0; y < 16; y++) {
      g.fillRect(0, y * 16, 256, 2);
      const off = y % 2 ? 16 : 0;
      for (let x = 0; x < 9; x++) g.fillRect(x * 32 + off, y * 16, 2, 16);
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = 'rgba(0,0,0,' + U.rand(0.04, 0.12) + ')';
      g.fillRect(U.rand(0, 256), U.rand(0, 256), U.rand(4, 18), U.rand(2, 6));
    }
    return tex(c, 2, 2);
  }

  AB.Textures = { asphalt, concrete, sand, facade, shopSign, awning, foliage, water, brick };
})();
