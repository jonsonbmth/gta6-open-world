// textures.js — the procedural texture library for AURELIA BAY. Every
// surface in the city is a canvas-generated texture (GTA San Andreas PS2
// style: grain, brick, pavers — never flat colors). All canvases are drawn
// from a seeded RNG, so the textures are identical on every run.

(function () {
  'use strict';

  var util = window.AB.util;

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { canvas: c, ctx: c.getContext('2d') };
  }

  function toTexture(canvas, repeatX, repeatY) {
    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX || 1, repeatY || 1);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Speckle noise over a base fill: the grain that keeps asphalt, sand and
  // concrete from reading as flat color.
  function speckle(ctx, w, h, rng, count, light, dark) {
    for (var i = 0; i < count; i++) {
      var x = rng() * w;
      var y = rng() * h;
      ctx.fillStyle = rng() < 0.5 ? light : dark;
      ctx.globalAlpha = 0.05 + rng() * 0.12;
      var s = 1 + rng() * 2.5;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // Asphalt tile: 14 m wide (the whole road) by 14 m long. The tile carries
  // the center double yellow line and the lane dashes, so the road reads
  // as a real street from the chase camera.
  function asphaltTexture(seed) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(512, 512);
    var ctx = t.ctx;
    ctx.fillStyle = '#3a3d42';
    ctx.fillRect(0, 0, 512, 512);
    speckle(ctx, 512, 512, rng, 9000, '#565a61', '#26282c');
    // Patch repairs: darker rectangles, like real worn asphalt.
    for (var i = 0; i < 7; i++) {
      ctx.fillStyle = '#33363b';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(rng() * 512, rng() * 512, 40 + rng() * 90, 25 + rng() * 60);
    }
    ctx.globalAlpha = 1;
    // Center double yellow.
    ctx.fillStyle = '#d8b93a';
    ctx.fillRect(250, 0, 5, 512);
    ctx.fillRect(257, 0, 5, 512);
    // Lane dashes (two lanes each side).
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(124, 40, 5, 150);
    ctx.fillRect(124, 322, 5, 150);
    ctx.fillRect(383, 40, 5, 150);
    ctx.fillRect(383, 322, 5, 150);
    // Edge lines.
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(8, 0, 4, 512);
    ctx.fillRect(500, 0, 4, 512);
    return toTexture(t.canvas);
  }

  // A building facade: base color, a window grid with varied lit/dark
  // windows, floor banding and a darker base. The texture is drawn for one
  // 6 m wide by 6 m tall patch and repeated per building (UV-scaled).
  function facadeTexture(seed, base, trim) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(256, 256);
    var ctx = t.ctx;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 2200, 'rgba(255,255,255,0.5)', 'rgba(0,0,0,0.35)');
    // Subtle brick/concrete courses.
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    for (var y = 0; y < 256; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(256, y + 0.5);
      ctx.stroke();
    }
    // Window grid: 4 columns x 4 rows of tall windows.
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 4; col++) {
        var wx = 14 + col * 62;
        var wy = 12 + row * 62;
        var lit = rng();
        if (lit < 0.28) {
          ctx.fillStyle = '#f7e3ac'; // warm lit window
        } else if (lit < 0.55) {
          ctx.fillStyle = '#2e3a44'; // dark glass
        } else {
          ctx.fillStyle = '#5d707e'; // sky reflection
        }
        ctx.fillRect(wx, wy, 38, 44);
        // Window frame + sill.
        ctx.strokeStyle = trim;
        ctx.lineWidth = 3;
        ctx.strokeRect(wx - 2, wy - 2, 42, 48);
        ctx.fillStyle = trim;
        ctx.fillRect(wx - 2, wy + 46, 42, 4);
        // Mullion cross.
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(wx + 17, wy, 3, 44);
        ctx.fillRect(wx, wy + 20, 38, 3);
      }
    }
    return toTexture(t.canvas);
  }

  // Striped awning canvas (red/white, teal/white, orange/white...).
  function awningTexture(colorA, colorB) {
    var t = makeCanvas(128, 64);
    var ctx = t.ctx;
    for (var i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i * 16, 0, 16, 64);
    }
    // Scalloped bottom edge.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (var j = 0; j < 8; j++) {
      ctx.beginPath();
      ctx.arc(j * 16 + 8, 64, 8, Math.PI, 0);
      ctx.fill();
    }
    return toTexture(t.canvas);
  }

  // Sidewalk pavers: a grid of large slabs with grout lines and wear.
  function sidewalkTexture(seed) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(256, 256);
    var ctx = t.ctx;
    ctx.fillStyle = '#9a938a';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 3000, '#b5aea4', '#7d766c');
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 3;
    for (var i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64 + 0.5, 0);
      ctx.lineTo(i * 64 + 0.5, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 64 + 0.5);
      ctx.lineTo(256, i * 64 + 0.5);
      ctx.stroke();
    }
    return toTexture(t.canvas);
  }

  // Beach sand: pale tan with fine grain and a few shells/pebbles.
  function sandTexture(seed) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(256, 256);
    var ctx = t.ctx;
    ctx.fillStyle = '#e6d3a8';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 5000, '#f4e6c2', '#c9ae7e');
    for (var i = 0; i < 24; i++) {
      ctx.fillStyle = rng() < 0.5 ? '#ffffff' : '#b89a6a';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(rng() * 256, rng() * 256, 1 + rng() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return toTexture(t.canvas);
  }

  // Water: deep blue with lighter streaks (gentle, static — shots render
  // a single frame, so the water reads through its color and streaks).
  function waterTexture(seed) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(256, 256);
    var ctx = t.ctx;
    ctx.fillStyle = '#1d6fa8';
    ctx.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 90; i++) {
      ctx.strokeStyle = rng() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,40,80,0.18)';
      ctx.lineWidth = 1 + rng() * 2;
      var y = rng() * 256;
      ctx.beginPath();
      ctx.moveTo(rng() * 256, y);
      ctx.lineTo(rng() * 256 + 40, y + (rng() - 0.5) * 8);
      ctx.stroke();
    }
    return toTexture(t.canvas);
  }

  // Pier planks: weathered wood boards with gaps and grain.
  function pierTexture(seed) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(256, 256);
    var ctx = t.ctx;
    ctx.fillStyle = '#8a6b48';
    ctx.fillRect(0, 0, 256, 256);
    for (var p = 0; p < 8; p++) {
      var tone = 0.85 + rng() * 0.3;
      ctx.fillStyle = 'rgb(' + Math.round(138 * tone) + ',' + Math.round(107 * tone) + ',' + Math.round(72 * tone) + ')';
      ctx.fillRect(0, p * 32, 256, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, p * 32 + 30, 256, 2);
      // Grain streaks.
      ctx.strokeStyle = 'rgba(60,40,20,0.35)';
      ctx.lineWidth = 1;
      for (var g = 0; g < 6; g++) {
        var gy = p * 32 + 4 + rng() * 24;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(256, gy + (rng() - 0.5) * 4);
        ctx.stroke();
      }
    }
    return toTexture(t.canvas);
  }

  // A shop sign: bold text on a colored board with a thin border.
  function signTexture(text, bg, fg) {
    var t = makeCanvas(512, 128);
    var ctx = t.ctx;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = fg;
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
    var tex = toTexture(t.canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // A billboard: a big simple ad (sun + skyline + tagline) on a board.
  function billboardTexture(seed, headline, sub) {
    var rng = util.mulberry32(seed);
    var t = makeCanvas(512, 256);
    var ctx = t.ctx;
    var grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2f7fd0');
    grad.addColorStop(1, '#bfe3f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    // Sun.
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(420, 56, 34, 0, Math.PI * 2);
    ctx.fill();
    // Skyline blocks.
    ctx.fillStyle = '#1f3a52';
    for (var i = 0; i < 9; i++) {
      var bw = 30 + rng() * 40;
      var bh = 40 + rng() * 90;
      ctx.fillRect(10 + i * 55, 256 - bh - 40, bw, bh + 40);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(headline, 24, 96);
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(sub, 24, 140);
    var tex = toTexture(t.canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // A soft round cloud puff (radial gradient) for billboarded clouds.
  function cloudTexture() {
    var t = makeCanvas(256, 128);
    var ctx = t.ctx;
    ctx.clearRect(0, 0, 256, 128);
    var blobs = [
      [70, 80, 42], [120, 62, 52], [180, 80, 44], [100, 88, 36], [150, 90, 34],
    ];
    blobs.forEach(function (b) {
      var g = ctx.createRadialGradient(b[0], b[1], 4, b[0], b[1], b[2]);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b[0], b[1], b[2], 0, Math.PI * 2);
      ctx.fill();
    });
    var tex = toTexture(t.canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // Crosswalk stripes live as geometry, but the zebra tile (white bands
  // on asphalt) is handy for the wide crossing at the marina end.
  function zebraTexture() {
    var t = makeCanvas(256, 256);
    var ctx = t.ctx;
    ctx.fillStyle = '#3a3d42';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#e8e8e8';
    for (var i = 0; i < 6; i++) {
      ctx.fillRect(8 + i * 42, 0, 26, 256);
    }
    return toTexture(t.canvas);
  }

  window.AB.textures = {
    asphalt: asphaltTexture,
    facade: facadeTexture,
    awning: awningTexture,
    sidewalk: sidewalkTexture,
    sand: sandTexture,
    water: waterTexture,
    pier: pierTexture,
    sign: signTexture,
    billboard: billboardTexture,
    cloud: cloudTexture,
    zebra: zebraTexture,
    toTexture: toTexture,
  };
})();
