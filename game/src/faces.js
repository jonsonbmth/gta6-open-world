// Aurelia Bay — character portraits. Each crew member gets a small canvas
// portrait (face, hair, shirt, background wash) drawn in code, so the
// dialogue box and the crew cards show real faces, not letter avatars.
// The style is flat and warm: big eyes, a smile or a smirk, a signature
// accessory (cap, shades, hoop earrings, a beard).
(function () {
  'use strict';

  var CREW = {
    dante: { name: 'Dante "Dusk" Reyes', role: 'WHEELMAN · EMBER STRAND', skin: '#d9a066', hair: '#1a1a1a', hairStyle: 'short', shirt: '#c22e2e', bg: '#7fb8d9', accessory: 'none' },
    vera: { name: 'Vera "The Velvet" Castillo', role: 'FIXER', skin: '#f2c89b', hair: '#a63a2e', hairStyle: 'long', shirt: '#6b4f9e', bg: '#b08fd9', accessory: 'earrings' },
    lena: { name: 'Lena "Luz" Mora', role: 'DRIVER', skin: '#c98a5e', hair: '#1a1a1a', hairStyle: 'ponytail', shirt: '#2e6b4f', bg: '#8fd0a8', accessory: 'cap' },
    hugo: { name: 'Hugo "Wrench" Salas', role: 'MECHANIC', skin: '#a06a3b', hair: '#4a2e18', hairStyle: 'buzz', shirt: '#c97b2d', bg: '#e8b06a', accessory: 'beard' },
    nina: { name: 'Nina "Hawk" Duarte', role: 'LOOKOUT', skin: '#f7d7b0', hair: '#c9a227', hairStyle: 'bob', shirt: '#274b9f', bg: '#9db8e8', accessory: 'shades' },
    kiki: { name: 'Kiki "Switch" Okafor', role: 'HACKER', skin: '#7a4a26', hair: '#1a1a1a', hairStyle: 'afro', shirt: '#2f8fa8', bg: '#7fc9d9', accessory: 'headset' },
    marco: { name: 'Marco "The Tide" Reyes', role: 'SMUGGLER · WHEELMAN', skin: '#d9a066', hair: '#6e6e6e', hairStyle: 'slick', shirt: '#37505e', bg: '#a8bcc9', accessory: 'beard' }
  };

  function drawPortrait(key, size) {
    size = size || 96;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var x = c.getContext('2d');
    var p = CREW[key] || CREW.dante;
    var s = size / 96; // scale factor

    // background wash
    x.fillStyle = p.bg;
    x.fillRect(0, 0, size, size);
    x.fillStyle = 'rgba(255,255,255,0.18)';
    x.beginPath(); x.arc(size * 0.78, size * 0.2, size * 0.3, 0, Math.PI * 2); x.fill();

    var cx = size / 2, cy = size * 0.44, r = size * 0.26;
    // shoulders / shirt
    x.fillStyle = p.shirt;
    x.beginPath();
    x.moveTo(cx - r * 1.5, size);
    x.quadraticCurveTo(cx - r * 1.3, cy + r * 1.15, cx, cy + r * 1.05);
    x.quadraticCurveTo(cx + r * 1.3, cy + r * 1.15, cx + r * 1.5, size);
    x.closePath(); x.fill();
    // neck
    x.fillStyle = p.skin;
    x.fillRect(cx - r * 0.28, cy + r * 0.75, r * 0.56, r * 0.5);
    // face
    x.beginPath(); x.ellipse(cx, cy, r * 0.92, r * 1.05, 0, 0, Math.PI * 2); x.fill();
    // ears
    x.beginPath(); x.arc(cx - r * 0.95, cy + r * 0.1, r * 0.18, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx + r * 0.95, cy + r * 0.1, r * 0.18, 0, Math.PI * 2); x.fill();

    // hair by style
    x.fillStyle = p.hair;
    if (p.hairStyle === 'long') {
      x.beginPath(); x.ellipse(cx, cy - r * 0.25, r * 1.05, r * 1.15, 0, Math.PI, Math.PI * 2); x.fill();
      x.fillRect(cx - r * 1.05, cy - r * 0.2, r * 0.35, r * 1.7);
      x.fillRect(cx + r * 0.7, cy - r * 0.2, r * 0.35, r * 1.7);
    } else if (p.hairStyle === 'afro') {
      x.beginPath(); x.arc(cx, cy - r * 0.45, r * 1.15, 0, Math.PI * 2); x.fill();
    } else if (p.hairStyle === 'ponytail') {
      x.beginPath(); x.ellipse(cx, cy - r * 0.3, r * 1.0, r * 0.9, 0, Math.PI, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(cx + r * 1.05, cy + r * 0.3, r * 0.3, r * 0.8, 0.4, 0, Math.PI * 2); x.fill();
    } else if (p.hairStyle === 'bob') {
      x.beginPath(); x.ellipse(cx, cy - r * 0.2, r * 1.08, r * 1.0, 0, Math.PI, Math.PI * 2); x.fill();
      x.fillRect(cx - r * 1.05, cy - r * 0.1, r * 0.3, r * 0.9);
      x.fillRect(cx + r * 0.75, cy - r * 0.1, r * 0.3, r * 0.9);
    } else if (p.hairStyle === 'slick') {
      x.beginPath(); x.ellipse(cx, cy - r * 0.42, r * 0.95, r * 0.6, 0, Math.PI, Math.PI * 2); x.fill();
    } else if (p.hairStyle === 'buzz') {
      x.beginPath(); x.ellipse(cx, cy - r * 0.35, r * 0.95, r * 0.62, 0, Math.PI, Math.PI * 2); x.fill();
    } else {
      x.beginPath(); x.ellipse(cx, cy - r * 0.32, r * 0.98, r * 0.78, 0, Math.PI, Math.PI * 2); x.fill();
    }

    // eyebrows + eyes
    x.strokeStyle = p.hair; x.lineWidth = 2.2 * s; x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx - r * 0.55, cy - r * 0.28); x.lineTo(cx - r * 0.15, cy - r * 0.36); x.stroke();
    x.beginPath(); x.moveTo(cx + r * 0.15, cy - r * 0.36); x.lineTo(cx + r * 0.55, cy - r * 0.28); x.stroke();
    x.fillStyle = '#1a1a1a';
    x.beginPath(); x.arc(cx - r * 0.36, cy - r * 0.05, r * 0.11, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx + r * 0.36, cy - r * 0.05, r * 0.11, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(cx - r * 0.33, cy - r * 0.09, r * 0.035, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx + r * 0.39, cy - r * 0.09, r * 0.035, 0, Math.PI * 2); x.fill();
    // nose + mouth (a small smirk)
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1.6 * s;
    x.beginPath(); x.moveTo(cx, cy + r * 0.12); x.lineTo(cx + r * 0.06, cy + r * 0.32); x.stroke();
    x.strokeStyle = '#7a3a2e'; x.lineWidth = 2.4 * s;
    x.beginPath(); x.moveTo(cx - r * 0.3, cy + r * 0.52); x.quadraticCurveTo(cx, cy + r * 0.68, cx + r * 0.34, cy + r * 0.48); x.stroke();

    // accessories
    if (p.accessory === 'shades') {
      x.fillStyle = '#14141c';
      x.fillRect(cx - r * 0.62, cy - r * 0.2, r * 0.55, r * 0.32);
      x.fillRect(cx + r * 0.07, cy - r * 0.2, r * 0.55, r * 0.32);
      x.fillRect(cx - r * 0.08, cy - r * 0.12, r * 0.16, r * 0.08);
    } else if (p.accessory === 'cap') {
      x.fillStyle = '#c22e2e';
      x.beginPath(); x.ellipse(cx, cy - r * 0.42, r * 1.0, r * 0.55, 0, Math.PI, Math.PI * 2); x.fill();
      x.fillRect(cx - r * 1.0, cy - r * 0.48, r * 2.0, r * 0.22);
    } else if (p.accessory === 'beard') {
      x.fillStyle = p.hair;
      x.beginPath(); x.ellipse(cx, cy + r * 0.55, r * 0.72, r * 0.55, 0, 0, Math.PI); x.fill();
    } else if (p.accessory === 'earrings') {
      x.fillStyle = '#ffd94d';
      x.beginPath(); x.arc(cx - r * 0.98, cy + r * 0.32, r * 0.1, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(cx + r * 0.98, cy + r * 0.32, r * 0.1, 0, Math.PI * 2); x.fill();
    } else if (p.accessory === 'headset') {
      x.strokeStyle = '#22222a'; x.lineWidth = 3 * s;
      x.beginPath(); x.arc(cx, cy - r * 0.1, r * 1.05, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
      x.fillStyle = '#22222a';
      x.beginPath(); x.arc(cx - r * 0.95, cy + r * 0.05, r * 0.16, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(cx + r * 0.95, cy + r * 0.05, r * 0.16, 0, Math.PI * 2); x.fill();
    }
    return c;
  }

  var cache = {};
  function portraitURL(key, size) {
    var k = key + '@' + (size || 96);
    if (!cache[k]) cache[k] = drawPortrait(key, size || 96).toDataURL();
    return cache[k];
  }

  window.AB.faces = { CREW: CREW, drawPortrait: drawPortrait, portraitURL: portraitURL };
})();
