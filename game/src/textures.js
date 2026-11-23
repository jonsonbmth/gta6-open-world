// Aurelia Bay — procedural canvas textures. Every surface in the city is
// textured from a canvas drawn at load: no image files, no network, and the
// same seed always paints the same walls. Flat colours are the enemy; even a
// cheap speckle + mortar-line pass makes a facade read as brick, not plastic.
(function () {
  'use strict';
  var U = window.AB.util;

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function toTexture(c, repeatX, repeatY) {
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (repeatX) t.repeat.set(repeatX, repeatY || repeatX);
    t.anisotropy = 4;
    return t;
  }

  function speckle(ctx, w, h, rng, n, colors, alpha) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = colors[Math.floor(rng.next() * colors.length)];
      ctx.globalAlpha = alpha * (0.4 + rng.next() * 0.6);
      var s = 1 + rng.next() * 2.5;
      ctx.fillRect(rng.next() * w, rng.next() * h, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // Dark worn asphalt with speckle and faint patch rectangles.
  function asphaltTexture(seed) {
    var rng = U.makeRng(seed);
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#33343a'; x.fillRect(0, 0, 256, 256);
    speckle(x, 256, 256, rng, 2600, ['#2a2b30', '#3d3e45', '#45464d', '#232428'], 0.9);
    for (var i = 0; i < 7; i++) {
      x.fillStyle = rng.chance(0.5) ? '#2c2d33' : '#3a3b41';
      x.globalAlpha = 0.5;
      x.fillRect(rng.next() * 200, rng.next() * 200, 30 + rng.next() * 60, 20 + rng.next() * 40);
    }
    x.globalAlpha = 1;
    // faint cracks
    x.strokeStyle = '#222327'; x.lineWidth = 1;
    for (var j = 0; j < 5; j++) {
      x.beginPath();
      var px = rng.next() * 256, py = rng.next() * 256;
      x.moveTo(px, py);
      for (var k = 0; k < 5; k++) { px += rng.range(-28, 28); py += rng.range(-28, 28); x.lineTo(px, py); }
      x.stroke();
    }
    return toTexture(c, 6, 6);
  }

  // Pale concrete sidewalk with expansion joints and stains.
  function sidewalkTexture(seed) {
    var rng = U.makeRng(seed);
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#b8b0a0'; x.fillRect(0, 0, 256, 256);
    speckle(x, 256, 256, rng, 1500, ['#a89f8d', '#c4bcae', '#9d9484'], 0.7);
    x.strokeStyle = '#8f8674'; x.lineWidth = 3;
    x.strokeRect(1, 1, 254, 254);
    x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke();
    for (var i = 0; i < 6; i++) {
      x.fillStyle = '#8a8272'; x.globalAlpha = 0.25;
      x.beginPath(); x.ellipse(rng.next() * 256, rng.next() * 256, 12 + rng.next() * 22, 8 + rng.next() * 14, rng.next() * 3, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
    return toTexture(c, 8, 8);
  }

  // Warm sand with speckle and a few shells.
  function sandTexture(seed) {
    var rng = U.makeRng(seed);
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#e6d3a3'; x.fillRect(0, 0, 256, 256);
    speckle(x, 256, 256, rng, 2200, ['#dcc793', '#f0e0b4', '#cbb57e'], 0.8);
    for (var i = 0; i < 14; i++) {
      x.fillStyle = rng.pick(['#f5ead0', '#c9a86a', '#e8b4b8']);
      x.beginPath(); x.ellipse(rng.next() * 256, rng.next() * 256, 2 + rng.next() * 3, 1.5 + rng.next() * 2, rng.next() * 3, 0, Math.PI * 2); x.fill();
    }
    return toTexture(c, 10, 10);
  }

  // Ocean surface: deep teal with lighter wave streaks.
  function waterTexture(seed) {
    var rng = U.makeRng(seed);
    var c = canvas(256, 256), x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#1d7f9e'); g.addColorStop(0.5, '#2793b5'); g.addColorStop(1, '#166b8c');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 90; i++) {
      x.strokeStyle = 'rgba(255,255,255,' + (0.05 + rng.next() * 0.12) + ')';
      x.lineWidth = 1 + rng.next() * 2;
      x.beginPath();
      var px = rng.next() * 256, py = rng.next() * 256, len = 12 + rng.next() * 30;
      x.moveTo(px, py); x.lineTo(px + len, py + rng.range(-4, 4)); x.stroke();
    }
    return toTexture(c, 12, 12);
  }

  // A building facade: base wall colour, brick or panel courses, a grid of
  // windows (some lit warm, some dark glass, a few with blinds), a darker
  // ground-floor band. floors/cols tune the density per building.
  function facadeTexture(seed, base, style, floors, cols) {
    var rng = U.makeRng(seed);
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    if (style === 'brick') {
      // brick courses
      x.strokeStyle = 'rgba(0,0,0,0.16)'; x.lineWidth = 1;
      for (var by = 0; by < 256; by += 8) {
        x.beginPath(); x.moveTo(0, by); x.lineTo(256, by); x.stroke();
      }
      for (var bx = 0; bx < 256; bx += 16) {
        for (var yy = 0; yy < 256; yy += 16) {
          x.beginPath(); x.moveTo(bx + ((yy / 8) % 2 ? 8 : 0), yy); x.lineTo(bx + ((yy / 8) % 2 ? 8 : 0), yy + 8); x.stroke();
        }
      }
      speckle(x, 256, 256, rng, 900, ['rgba(0,0,0,0.10)', 'rgba(255,255,255,0.08)'], 0.8);
    } else if (style === 'panel') {
      x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 2;
      for (var py = 0; py <= 256; py += 64) { x.beginPath(); x.moveTo(0, py); x.lineTo(256, py); x.stroke(); }
      for (var px = 0; px <= 256; px += 64) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 256); x.stroke(); }
      speckle(x, 256, 256, rng, 700, ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.10)'], 0.8);
    } else {
      // stucco: soft blotches
      for (var s = 0; s < 40; s++) {
        x.fillStyle = rng.chance(0.5) ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
        x.beginPath(); x.ellipse(rng.next() * 256, rng.next() * 256, 14 + rng.next() * 30, 10 + rng.next() * 22, rng.next() * 3, 0, Math.PI * 2); x.fill();
      }
    }
    // window grid
    var top = 14, bottom = 216;
    var cellW = 256 / cols, cellH = (bottom - top) / floors;
    for (var f = 0; f < floors; f++) {
      for (var ci = 0; ci < cols; ci++) {
        var wx = ci * cellW + cellW * 0.22, wy = top + f * cellH + cellH * 0.18;
        var ww = cellW * 0.56, wh = cellH * 0.62;
        var roll = rng.next();
        var glass = roll < 0.18 ? '#ffd98a' : (roll < 0.55 ? '#2c3e50' : (roll < 0.8 ? '#5b7d99' : '#1f2c3a'));
        x.fillStyle = 'rgba(0,0,0,0.35)';
        x.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        x.fillStyle = glass;
        x.fillRect(wx, wy, ww, wh);
        // sky glint on glass
        x.fillStyle = 'rgba(255,255,255,0.28)';
        x.beginPath(); x.moveTo(wx, wy + wh); x.lineTo(wx + ww * 0.45, wy); x.lineTo(wx + ww * 0.7, wy); x.lineTo(wx + ww * 0.25, wy + wh); x.closePath(); x.fill();
        if (rng.chance(0.25)) {
          // blinds: horizontal slats
          x.fillStyle = 'rgba(255,255,255,0.35)';
          for (var sl = 0; sl < 3; sl++) x.fillRect(wx, wy + wh * (0.25 + sl * 0.22), ww, 1.5);
        }
      }
    }
    // ground floor band: darker shopfront strip
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, 216, 256, 40);
    x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(0, 216, 256, 3);
    return toTexture(c, 1, 1);
  }

  // A shop sign: coloured board, bold name, small subtitle.
  function signTexture(text, sub, bg, fg) {
    var c = canvas(512, 128), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 4; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = fg;
    x.font = 'bold 54px Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 256, sub ? 52 : 64);
    if (sub) {
      x.font = 'bold 26px Arial, sans-serif';
      x.globalAlpha = 0.85;
      x.fillText(sub, 256, 98);
      x.globalAlpha = 1;
    }
    return toTexture(c, 1, 1);
  }

  // Striped canvas awning.
  function awningTexture(c1, c2) {
    var c = canvas(128, 64), x = c.getContext('2d');
    for (var i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? c1 : c2;
      x.fillRect(i * 16, 0, 16, 64);
    }
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 52, 128, 12);
    return toTexture(c, 2, 1);
  }

  // Weathered wooden planks for the pier.
  function woodTexture(seed) {
    var rng = U.makeRng(seed);
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#8a6b45'; x.fillRect(0, 0, 256, 256);
    for (var p = 0; p < 8; p++) {
      x.fillStyle = p % 2 ? '#7d5f3c' : '#93755290';
      x.fillRect(0, p * 32, 256, 32);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, p * 32, 256, 2);
    }
    speckle(x, 256, 256, rng, 800, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.06)'], 0.8);
    return toTexture(c, 4, 4);
  }

  // Zebra crossing stripes.
  function crosswalkTexture() {
    var c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#33343a'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#e8e6df';
    for (var i = 0; i < 5; i++) x.fillRect(8 + i * 24, 10, 14, 108);
    return toTexture(c, 1, 1);
  }

  window.AB.textures = {
    asphalt: asphaltTexture,
    sidewalk: sidewalkTexture,
    sand: sandTexture,
    water: waterTexture,
    facade: facadeTexture,
    sign: signTexture,
    awning: awningTexture,
    wood: woodTexture,
    crosswalk: crosswalkTexture
  };
})();
