// faces.js — cartoon portrait generator for the HUD. Each portrait is
// drawn on a small canvas (face, hair, eyes, brows, nose, mouth on a
// colored background) and returned as a data: URI, so the HUD needs no
// image files at all. The portraits are what the dialog card, the crew
// cards and the title screen show.

(function () {
  'use strict';

  // Draw one cartoon face on a 120x120 canvas. opts: bg, skin, hair,
  // hairStyle ('crop' | 'bob' | 'ponytail' | 'beard' | 'bald' | 'cap'),
  // shirt, smile (0..1).
  function drawPortrait(opts) {
    var o = opts || {};
    var c = document.createElement('canvas');
    c.width = 120;
    c.height = 120;
    var ctx = c.getContext('2d');

    // Background.
    ctx.fillStyle = o.bg || '#3a6ab0';
    ctx.fillRect(0, 0, 120, 120);
    // Soft backdrop circle.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(60, 58, 46, 0, Math.PI * 2);
    ctx.fill();

    // Shoulders / shirt.
    ctx.fillStyle = o.shirt || '#2a4a7a';
    ctx.beginPath();
    ctx.moveTo(18, 120);
    ctx.quadraticCurveTo(22, 92, 60, 90);
    ctx.quadraticCurveTo(98, 92, 102, 120);
    ctx.closePath();
    ctx.fill();

    // Neck.
    ctx.fillStyle = o.skin || '#c68e5e';
    ctx.fillRect(52, 78, 16, 18);

    // Head.
    ctx.beginPath();
    ctx.ellipse(60, 56, 30, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears.
    ctx.beginPath();
    ctx.arc(30, 58, 7, 0, Math.PI * 2);
    ctx.arc(90, 58, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hair.
    ctx.fillStyle = o.hair || '#201510';
    var style = o.hairStyle || 'crop';
    if (style === 'crop') {
      ctx.beginPath();
      ctx.ellipse(60, 34, 30, 20, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(30, 30, 60, 8);
    } else if (style === 'bob') {
      ctx.beginPath();
      ctx.ellipse(60, 36, 32, 24, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(26, 34, 10, 34);
      ctx.fillRect(84, 34, 10, 34);
    } else if (style === 'ponytail') {
      ctx.beginPath();
      ctx.ellipse(60, 34, 30, 20, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(88, 52, 9, 20, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'cap') {
      ctx.beginPath();
      ctx.ellipse(60, 36, 31, 18, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(28, 36, 64, 8);
      ctx.fillRect(56, 42, 40, 7); // brim
    } else if (style === 'beard') {
      ctx.beginPath();
      ctx.ellipse(60, 34, 30, 18, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(60, 78, 24, 16, 0, 0, Math.PI);
      ctx.fill();
    }
    // 'bald': no hair drawn.

    // Eyes: white + dark pupil, looking at the viewer.
    [-1, 1].forEach(function (side) {
      var ex = 60 + side * 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 56, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1210';
      ctx.beginPath();
      ctx.arc(ex, 57, 3, 0, Math.PI * 2);
      ctx.fill();
      // Brows.
      ctx.strokeStyle = o.hair || '#201510';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 6, 45);
      ctx.lineTo(ex + 6, 44);
      ctx.stroke();
    });

    // Nose.
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 58);
    ctx.lineTo(58, 68);
    ctx.lineTo(62, 68);
    ctx.stroke();

    // Mouth: a smile whose curve follows opts.smile.
    var smile = o.smile === undefined ? 0.7 : o.smile;
    ctx.strokeStyle = '#6b3226';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(60, 72, 10, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    if (smile < 0.4) {
      // A flat, serious mouth instead of a smile.
      ctx.beginPath();
      ctx.moveTo(52, 76);
      ctx.lineTo(68, 76);
      ctx.stroke();
    }

    return c.toDataURL('image/png');
  }

  // The cast, in one place: every portrait the HUD and the title screen
  // use. Colors match the 3D crew's shirts so the HUD and the world agree.
  var CAST = {
    dante: { bg: '#7fb2e5', skin: '#c68e5e', hair: '#1c1410', hairStyle: 'crop', shirt: '#f0f0ea', smile: 0.8 },
    vera: { bg: '#7a5aa8', skin: '#e8b48c', hair: '#2a1a2e', hairStyle: 'bob', shirt: '#4a2a5e', smile: 0.5 },
    lena: { bg: '#3a9a5a', skin: '#d9a06a', hair: '#3a2410', hairStyle: 'ponytail', shirt: '#2a7a44', smile: 0.9 },
    hugo: { bg: '#d08a3a', skin: '#8a5a34', hair: '#14100c', hairStyle: 'beard', shirt: '#7a4a21', smile: 0.6 },
    nina: { bg: '#9a5ab0', skin: '#e8b48c', hair: '#a01818', hairStyle: 'bob', shirt: '#5a2a7a', smile: 0.7 },
  };

  var cache = {};

  function portrait(name) {
    if (!cache[name]) cache[name] = drawPortrait(CAST[name] || CAST.dante);
    return cache[name];
  }

  window.AB.faces = {
    drawPortrait: drawPortrait,
    portrait: portrait,
    CAST: CAST,
  };
})();
