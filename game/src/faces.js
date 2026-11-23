// Crew portraits for the HUD: small flat-style faces painted on canvas —
// skin, hair, eyes, expression and one signature accessory each.
(function () {
  const AB = window.AB || (window.AB = {});

  const CREW = [
    { name: 'VERA SOLANO', role: 'FIXER', skin: '#d9a066', hair: '#2a1a0a', hairStyle: 'bun', accessory: 'earring' },
    { name: 'LENA CRUZ', role: 'DRIVER', skin: '#c68e5e', hair: '#1a1a1a', hairStyle: 'short', accessory: 'cap' },
    { name: 'HUGO MARSH', role: 'MECHANIC', skin: '#e8b88a', hair: '#6b4a2a', hairStyle: 'beard', accessory: 'glasses' },
    { name: 'NINA OKAFOR', role: 'LOOKOUT', skin: '#8a5a34', hair: '#0a0a0a', hairStyle: 'braids', accessory: 'hoops' },
    { name: 'DANTE VALE', role: 'YOU', skin: '#c68e5e', hair: '#1a1a1a', hairStyle: 'short', accessory: 'scar' },
  ];

  function drawFace(def) {
    const c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    const g = c.getContext('2d');
    // Background.
    g.fillStyle = '#22303c';
    g.fillRect(0, 0, 96, 96);
    // Shoulders.
    g.fillStyle = '#3a4a5a';
    g.beginPath(); g.ellipse(48, 96, 34, 22, 0, Math.PI, 0); g.fill();
    // Face oval.
    g.fillStyle = def.skin;
    g.beginPath(); g.ellipse(48, 48, 26, 32, 0, 0, 7); g.fill();
    // Hair.
    g.fillStyle = def.hair;
    if (def.hairStyle === 'bun') {
      g.beginPath(); g.ellipse(48, 22, 26, 16, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.arc(48, 10, 9, 0, 7); g.fill();
    } else if (def.hairStyle === 'braids') {
      g.beginPath(); g.ellipse(48, 24, 27, 18, 0, Math.PI, 0); g.fill();
      g.fillRect(18, 30, 7, 42); g.fillRect(71, 30, 7, 42);
    } else if (def.hairStyle === 'beard') {
      g.beginPath(); g.ellipse(48, 24, 26, 14, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.ellipse(48, 66, 22, 14, 0, 0, Math.PI); g.fill();
    } else {
      g.beginPath(); g.ellipse(48, 24, 26, 15, 0, Math.PI, 0); g.fill();
    }
    // Eyes.
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(38, 46, 5, 4, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(58, 46, 5, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(38, 46, 2.4, 0, 7); g.fill();
    g.beginPath(); g.arc(58, 46, 2.4, 0, 7); g.fill();
    // Brows.
    g.strokeStyle = def.hair; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(32, 38); g.lineTo(44, 36); g.stroke();
    g.beginPath(); g.moveTo(52, 36); g.lineTo(64, 38); g.stroke();
    // Nose + mouth.
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(48, 50); g.lineTo(46, 58); g.stroke();
    g.strokeStyle = '#7a3a2a'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(40, 66); g.quadraticCurveTo(48, 71, 56, 66); g.stroke();
    // Accessories.
    if (def.accessory === 'cap') {
      g.fillStyle = '#c0392b';
      g.beginPath(); g.ellipse(48, 20, 27, 12, 0, Math.PI, 0); g.fill();
      g.fillRect(22, 18, 52, 5);
    } else if (def.accessory === 'glasses') {
      g.strokeStyle = '#111111'; g.lineWidth = 2;
      g.strokeRect(31, 41, 15, 11); g.strokeRect(51, 41, 15, 11);
      g.beginPath(); g.moveTo(46, 45); g.lineTo(51, 45); g.stroke();
    } else if (def.accessory === 'earring') {
      g.fillStyle = '#f1c40f';
      g.beginPath(); g.arc(23, 58, 3, 0, 7); g.fill();
      g.beginPath(); g.arc(73, 58, 3, 0, 7); g.fill();
    } else if (def.accessory === 'hoops') {
      g.strokeStyle = '#f1c40f'; g.lineWidth = 2;
      g.beginPath(); g.arc(23, 60, 4.5, 0, 7); g.stroke();
      g.beginPath(); g.arc(73, 60, 4.5, 0, 7); g.stroke();
    } else if (def.accessory === 'scar') {
      g.strokeStyle = 'rgba(120,40,30,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(60, 30); g.lineTo(66, 42); g.stroke();
    }
    return c.toDataURL('image/png');
  }

  function portraits() {
    const out = {};
    CREW.forEach(function (d) { out[d.name] = drawFace(d); });
    return out;
  }

  AB.Faces = { CREW: CREW, portraits: portraits };
})();
