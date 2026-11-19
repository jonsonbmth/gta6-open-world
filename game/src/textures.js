// SOLMAR BAY — procedural textures, all drawn on canvas at load time.
// No image files, no network: every sign, window grid and portrait is
// generated in code.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var U = SB.utils;
  var T = {};
  var cache = {};

  // A neon shop sign: dark panel, glowing colored text, bright border.
  T.neonSign = function (name, color) {
    var key = 'sign|' + name + '|' + color;
    if (cache[key]) return cache[key];
    var c = U.canvas(512, 128);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, 0, 512, 128);
    // Subtle panel texture.
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (var i = 0; i < 40; i++) ctx.fillRect(Math.random() * 512, Math.random() * 128, 2, 2);
    // Glowing border.
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    U.roundRect(ctx, 8, 8, 496, 112, 14);
    ctx.stroke();
    // Text, sized to fit.
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffffff';
    var size = 58;
    ctx.font = 'bold ' + size + 'px Arial, sans-serif';
    while (ctx.measureText(name).width > 460 && size > 22) {
      size -= 4;
      ctx.font = 'bold ' + size + 'px Arial, sans-serif';
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 66);
    // Second pass in the neon color for saturation.
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillText(name, 256, 66);
    ctx.globalAlpha = 1;
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache[key] = tex;
    return tex;
  };

  // A grid of lit windows for a building facade (emissive map). Warm yellow
  // and cyan windows, some dark, on a near-black base.
  T.windows = function (variant) {
    var key = 'win|' + variant;
    if (cache[key]) return cache[key];
    var rng = U.mulberry32(1000 + variant * 77);
    var c = U.canvas(256, 512);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, 256, 512);
    var cols = 8, rows = 20;
    var cw = 256 / cols, ch = 512 / rows;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var r = rng();
        if (r < 0.45) continue; // dark window
        var warm = rng() < 0.7;
        ctx.fillStyle = warm
          ? 'rgba(255, 190, 90, ' + (0.55 + rng() * 0.45).toFixed(2) + ')'
          : 'rgba(120, 220, 255, ' + (0.5 + rng() * 0.4).toFixed(2) + ')';
        ctx.fillRect(x * cw + 4, y * ch + 5, cw - 8, ch - 10);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache[key] = tex;
    return tex;
  };

  // Asphalt with lane dashes and edge lines, tiled along the avenue.
  T.road = function () {
    if (cache.road) return cache.road;
    var c = U.canvas(256, 256);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0e1c';
    ctx.fillRect(0, 0, 256, 256);
    // Speckle.
    for (var i = 0; i < 900; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05).toFixed(2) + ')';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    // Edge lines.
    ctx.fillStyle = 'rgba(255, 210, 63, 0.85)';
    ctx.fillRect(6, 0, 5, 256);
    ctx.fillRect(245, 0, 5, 256);
    // Center dashes.
    ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
    ctx.fillRect(125, 20, 6, 70);
    ctx.fillRect(125, 150, 6, 70);
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.road = tex;
    return tex;
  };

  // Sidewalk slabs.
  T.sidewalk = function () {
    if (cache.walk) return cache.walk;
    var c = U.canvas(128, 128);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 124, 124);
    ctx.beginPath();
    ctx.moveTo(64, 0); ctx.lineTo(64, 128);
    ctx.moveTo(0, 64); ctx.lineTo(128, 64);
    ctx.stroke();
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.walk = tex;
    return tex;
  };

  // Wooden dock planks for the marina.
  T.dockWood = function () {
    if (cache.wood) return cache.wood;
    var c = U.canvas(256, 128);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(0, 0, 256, 128);
    for (var y = 0; y < 4; y++) {
      ctx.fillStyle = y % 2 ? '#54402a' : '#42301e';
      ctx.fillRect(0, y * 32, 256, 32);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, y * 32, 256, 2);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.wood = tex;
    return tex;
  };

  // Stylized portrait for the dialogue box: a flat-shaded face with hair,
  // drawn per character. Returns a data URL for an <img>.
  T.portrait = function (who) {
    var key = 'portrait|' + who;
    if (cache[key]) return cache[key];
    var c = U.canvas(96, 96);
    var ctx = c.getContext('2d');
    var faces = {
      rico: { skin: '#c98a5e', hair: '#1a1210', hairStyle: 'short', shirt: '#ffd23f', extra: 'cap' },
      rosa: { skin: '#b97a4e', hair: '#e8e8e8', hairStyle: 'bun', shirt: '#ff2d95', extra: 'earring' },
      lena: { skin: '#d9a06f', hair: '#7a2d12', hairStyle: 'pony', shirt: '#00e5ff', extra: 'goggles' },
      dario: { skin: '#8a5a34', hair: '#0d0d0d', hairStyle: 'buzz', shirt: '#2eff8f', extra: 'beard' },
    };
    var f = faces[who] || faces.rico;
    // Background.
    var g = ctx.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, '#1a1440');
    g.addColorStop(1, '#0a0618');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
    // Shoulders / shirt.
    ctx.fillStyle = f.shirt;
    ctx.beginPath();
    ctx.moveTo(8, 96);
    ctx.quadraticCurveTo(48, 58, 88, 96);
    ctx.closePath();
    ctx.fill();
    // Neck + head.
    ctx.fillStyle = f.skin;
    ctx.fillRect(42, 58, 12, 14);
    ctx.beginPath();
    ctx.ellipse(48, 42, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair.
    ctx.fillStyle = f.hair;
    if (f.hairStyle === 'bun') {
      ctx.beginPath(); ctx.arc(48, 14, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(48, 24, 23, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
    } else if (f.hairStyle === 'pony') {
      ctx.beginPath(); ctx.ellipse(48, 24, 23, 13, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(72, 40, 7, 18, 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (f.hairStyle === 'buzz') {
      ctx.beginPath(); ctx.ellipse(48, 26, 22, 9, 0, Math.PI, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(48, 25, 23, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#101010';
    ctx.beginPath(); ctx.arc(40, 42, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(56, 42, 3, 0, Math.PI * 2); ctx.fill();
    // Brows + mouth.
    ctx.strokeStyle = f.hair;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(35, 35); ctx.lineTo(45, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(51, 34); ctx.lineTo(61, 35); ctx.stroke();
    ctx.strokeStyle = '#7a3a28';
    ctx.beginPath(); ctx.moveTo(42, 56); ctx.quadraticCurveTo(48, 60, 54, 56); ctx.stroke();
    if (f.extra === 'beard') {
      ctx.fillStyle = 'rgba(13,13,13,0.85)';
      ctx.beginPath(); ctx.ellipse(48, 58, 16, 10, 0, 0, Math.PI); ctx.fill();
    }
    if (f.extra === 'goggles') {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(40, 28, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(56, 28, 6, 0, Math.PI * 2); ctx.stroke();
    }
    if (f.extra === 'earring') {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(26, 52, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(70, 52, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (f.extra === 'cap') {
      ctx.fillStyle = '#c81e2b';
      ctx.beginPath(); ctx.ellipse(48, 22, 24, 9, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(24, 20, 48, 4);
    }
    var url = c.toDataURL('image/png');
    cache[key] = url;
    return url;
  };

  SB.textures = T;
})();
