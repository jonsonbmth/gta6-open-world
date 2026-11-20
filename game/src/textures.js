// Procedural canvas textures: every surface in Coral Vista is generated here
// at boot — no image files, no network. Facades, roads, signs, portraits.
var CV = window.CV || (window.CV = {});

CV.textures = (function () {
  var cache = {};

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function tex(c, rx, ry) {
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry || rx);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Building facade: window grid, some lit warm, awnings on the ground floor.
  function facade(seed, base, floors, litRatio) {
    var key = 'fac' + seed + base + floors;
    if (cache[key]) return cache[key];
    var rng = new CV.random.RNG(seed);
    var c = canvas(256, 256), cv = c[0], g = c[1];
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    // subtle vertical grime + panel lines
    for (var x = 0; x < 256; x += 32) {
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, 0, 2, 256);
    }
    var cols = 6, rows = Math.max(3, floors);
    var ww = 256 / cols, wh = 256 / rows;
    for (var r = 0; r < rows; r++) {
      for (var col = 0; col < cols; col++) {
        var lit = rng.next() < litRatio;
        var wx = col * ww + 5, wy = r * wh + 6;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(wx - 2, wy - 2, ww - 6, wh - 10);
        if (lit) {
          g.fillStyle = rng.pick(['#ffd97a', '#ffe9a8', '#ffb35c', '#fff3c4']);
        } else {
          g.fillStyle = rng.pick(['#1d2b3a', '#24384a', '#2e4a5e']);
        }
        g.fillRect(wx, wy, ww - 10, wh - 14);
        if (lit) {
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillRect(wx, wy, ww - 10, 4);
        }
      }
    }
    // ground-floor awning band
    g.fillStyle = shade(base, -30); g.fillRect(0, 236, 256, 20);
    var t = tex(cv);
    cache[key] = t;
    return t;
  }

  function road() {
    if (cache.road) return cache.road;
    var c = canvas(256, 256), cv = c[0], g = c[1];
    g.fillStyle = '#2b2b30'; g.fillRect(0, 0, 256, 256);
    // asphalt speckle
    for (var i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')';
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    for (var j = 0; j < 900; j++) {
      g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.16) + ')';
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    // centre double yellow + lane dashes + edge lines
    g.fillStyle = '#d8b93a'; g.fillRect(124, 0, 4, 256); g.fillRect(132, 0, 4, 256);
    g.fillStyle = '#e8e8e8';
    for (var y = 0; y < 256; y += 64) g.fillRect(62, y + 8, 4, 32);
    for (var y2 = 0; y2 < 256; y2 += 64) g.fillRect(194, y2 + 8, 4, 32);
    g.fillRect(6, 0, 4, 256); g.fillRect(246, 0, 4, 256);
    var t = tex(cv, 1, 8);
    cache.road = t;
    return t;
  }

  function sidewalk() {
    if (cache.walk) return cache.walk;
    var c = canvas(128, 128), cv = c[0], g = c[1];
    g.fillStyle = '#9a938a'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (var i = 0; i <= 128; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    }
    for (var j = 0; j < 300; j++) {
      g.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.08) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    var t = tex(cv, 6, 6);
    cache.walk = t;
    return t;
  }

  function sand() {
    if (cache.sand) return cache.sand;
    var c = canvas(128, 128), cv = c[0], g = c[1];
    g.fillStyle = '#e8c88f'; g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 1400; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(180,140,80,0.25)' : 'rgba(255,240,200,0.3)';
      g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    var t = tex(cv, 10, 10);
    cache.sand = t;
    return t;
  }

  function water() {
    if (cache.water) return cache.water;
    var c = canvas(128, 128), cv = c[0], g = c[1];
    var grad = g.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#1f7fb8'); grad.addColorStop(0.5, '#2a9ad4'); grad.addColorStop(1, '#1a6da3');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 120; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.1 + Math.random() * 0.25) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 10, 1);
    }
    var t = tex(cv, 8, 8);
    cache.water = t;
    return t;
  }

  function crosswalk() {
    if (cache.cross) return cache.cross;
    var c = canvas(128, 128), cv = c[0], g = c[1];
    g.fillStyle = '#2b2b30'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e8e8e8';
    for (var x = 4; x < 128; x += 20) g.fillRect(x, 8, 12, 112);
    var t = tex(cv);
    cache.cross = t;
    return t;
  }

  function sign(text, bg, fg) {
    var key = 'sign' + text;
    if (cache[key]) return cache[key];
    var c = canvas(512, 128), cv = c[0], g = c[1];
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = fg;
    g.font = 'bold 54px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var size = 54;
    while (g.measureText(text).width > 470 && size > 20) {
      size -= 4; g.font = 'bold ' + size + 'px Arial, sans-serif';
    }
    g.fillText(text, 256, 68);
    var t = tex(cv);
    cache[key] = t;
    return t;
  }

  function billboard(text, sub) {
    var key = 'bill' + text;
    if (cache[key]) return cache[key];
    var c = canvas(512, 256), cv = c[0], g = c[1];
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ff7a3d'); grad.addColorStop(1, '#c93d8b');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#ffffff';
    g.font = 'bold 64px Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText(text, 256, 110);
    g.font = 'bold 30px Arial, sans-serif';
    g.fillStyle = '#ffe9a8';
    g.fillText(sub, 256, 180);
    var t = tex(cv);
    cache[key] = t;
    return t;
  }

  // Soft radial glow sprite (police light pools, sun glow, spotlight pool).
  function glow(color) {
    var key = 'glow' + color;
    if (cache[key]) return cache[key];
    var c = canvas(128, 128), cv = c[0], g = c[1];
    var m = /(\d+),\s*(\d+),\s*(\d+)/.exec(color);
    var rgb = m ? (m[1] + ',' + m[2] + ',' + m[3]) : '255,255,255';
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(' + rgb + ',0.9)');
    grad.addColorStop(0.35, 'rgba(' + rgb + ',0.45)');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    var t = tex(cv);
    cache[key] = t;
    return t;
  }

  // Drawn character portrait: a small canvas face (skin, hair, eyes, mouth,
  // shirt) — the top-10 dialog boxes all show a face, never a letter.
  function portrait(p) {
    var key = 'port' + p.name;
    if (cache[key]) return cache[key];
    var c = canvas(96, 96), cv = c[0], g = c[1];
    // background
    var bg = g.createLinearGradient(0, 0, 0, 96);
    bg.addColorStop(0, '#3d6f9e'); bg.addColorStop(1, '#1d3a52');
    g.fillStyle = bg; g.fillRect(0, 0, 96, 96);
    // shirt
    g.fillStyle = p.shirt;
    g.beginPath(); g.moveTo(18, 96); g.lineTo(30, 70); g.lineTo(66, 70); g.lineTo(78, 96); g.closePath(); g.fill();
    // neck + head
    g.fillStyle = shade(p.skin, -25); g.fillRect(42, 58, 12, 16);
    g.fillStyle = p.skin;
    g.beginPath(); g.ellipse(48, 44, 22, 26, 0, 0, Math.PI * 2); g.fill();
    // hair
    g.fillStyle = p.hair;
    if (p.hairStyle === 'bob') {
      g.beginPath(); g.ellipse(48, 30, 24, 16, 0, Math.PI, 0); g.fill();
      g.fillRect(24, 28, 8, 26); g.fillRect(64, 28, 8, 26);
    } else if (p.hairStyle === 'ponytail') {
      g.beginPath(); g.ellipse(48, 28, 23, 14, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.ellipse(72, 48, 7, 16, 0.3, 0, Math.PI * 2); g.fill();
    } else if (p.hairStyle === 'bald') {
      g.beginPath(); g.ellipse(48, 24, 20, 8, 0, Math.PI, 0); g.fill();
    } else { // buzz
      g.beginPath(); g.ellipse(48, 30, 22, 13, 0, Math.PI, 0); g.fill();
    }
    // eyes
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(40, 44, 5, 4, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(56, 44, 5, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#141414';
    g.beginPath(); g.arc(40, 44, 2.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(56, 44, 2.5, 0, Math.PI * 2); g.fill();
    // brows + nose + mouth
    g.strokeStyle = p.hair; g.lineWidth = 2;
    g.beginPath(); g.moveTo(35, 37); g.lineTo(45, 36); g.stroke();
    g.beginPath(); g.moveTo(51, 36); g.lineTo(61, 37); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.moveTo(48, 48); g.lineTo(46, 54); g.stroke();
    g.strokeStyle = '#7a2e2e'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(40, 60); g.quadraticCurveTo(48, 65, 56, 60); g.stroke();
    var t = tex(cv);
    cache[key] = t;
    return { texture: t, canvas: cv };
  }

  return {
    facade: facade, road: road, sidewalk: sidewalk, sand: sand, water: water,
    crosswalk: crosswalk, sign: sign, billboard: billboard, glow: glow,
    portrait: portrait, shade: shade,
  };
})();
