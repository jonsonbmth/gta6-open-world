// Painted character portraits (canvas 2D, returned as data: URIs): the
// dialog portrait, the title-screen hero card and the three crew cards.
// Big, bold, readable at small sizes — large eyes with highlights, strong
// brows, a clear nose and mouth, distinct hair and accessories per person.

function paintPortrait(spec) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const x = c.getContext('2d');

  // Warm sunset backdrop.
  const bg = x.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, spec.bg[0]);
  bg.addColorStop(1, spec.bg[1]);
  x.fillStyle = bg;
  x.fillRect(0, 0, S, S);
  x.fillStyle = 'rgba(255,255,255,0.10)';
  x.beginPath();
  x.arc(200, 46, 34, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = 'rgba(0,0,0,0.14)';
  x.beginPath();
  x.arc(34, 210, 44, 0, Math.PI * 2);
  x.fill();

  const cx = S / 2;
  const cy = 118;
  const skin = spec.skin;

  // Neck + shoulders.
  x.fillStyle = shade(skin, -18);
  x.fillRect(cx - 22, 168, 44, 34);
  x.fillStyle = spec.shirt;
  x.beginPath();
  x.moveTo(cx - 88, S);
  x.quadraticCurveTo(cx - 84, 196, cx - 40, 188);
  x.lineTo(cx + 40, 188);
  x.quadraticCurveTo(cx + 84, 196, cx + 88, S);
  x.closePath();
  x.fill();
  // Shirt detail: collar or stripes.
  x.fillStyle = 'rgba(0,0,0,0.18)';
  x.beginPath();
  x.moveTo(cx - 40, 188);
  x.lineTo(cx, 214);
  x.lineTo(cx + 40, 188);
  x.lineTo(cx + 22, 188);
  x.lineTo(cx, 200);
  x.lineTo(cx - 22, 188);
  x.closePath();
  x.fill();
  if (spec.chain) {
    x.strokeStyle = '#ffd94d';
    x.lineWidth = 6;
    x.beginPath();
    x.arc(cx, 196, 30, 0.25 * Math.PI, 0.75 * Math.PI);
    x.stroke();
  }

  // Ears.
  x.fillStyle = shade(skin, -8);
  x.beginPath();
  x.ellipse(cx - 62, cy + 6, 13, 20, 0, 0, Math.PI * 2);
  x.ellipse(cx + 62, cy + 6, 13, 20, 0, 0, Math.PI * 2);
  x.fill();
  if (spec.earrings) {
    x.fillStyle = '#ffd94d';
    x.beginPath();
    x.arc(cx - 62, cy + 26, 6, 0, Math.PI * 2);
    x.arc(cx + 62, cy + 26, 6, 0, Math.PI * 2);
    x.fill();
  }

  // Face: a wide rounded oval.
  x.fillStyle = skin;
  x.beginPath();
  x.ellipse(cx, cy, 62, 72, 0, 0, Math.PI * 2);
  x.fill();

  // Hair (behind the face edge for long styles, over the top otherwise).
  x.fillStyle = spec.hair;
  if (spec.hairStyle === 'long') {
    x.beginPath();
    x.ellipse(cx, cy + 26, 74, 92, 0, Math.PI * 0.08, Math.PI * 0.92);
    x.fill();
    x.fillStyle = skin;
    x.beginPath();
    x.ellipse(cx, cy, 62, 72, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = spec.hair;
    x.beginPath();
    x.ellipse(cx, cy - 46, 64, 34, 0, Math.PI, Math.PI * 2);
    x.fill();
  } else if (spec.hairStyle === 'ponytail') {
    x.beginPath();
    x.ellipse(cx + 66, cy + 30, 18, 44, 0.3, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.ellipse(cx, cy - 48, 64, 32, 0, Math.PI, Math.PI * 2);
    x.fill();
  } else if (spec.hairStyle === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1 + i / 8);
      x.beginPath();
      x.arc(cx + Math.cos(a) * 56, cy - 44 + Math.sin(a) * 22, 20, 0, Math.PI * 2);
      x.fill();
    }
  } else if (spec.hairStyle === 'beanie') {
    x.fillStyle = spec.beanie || '#c23b4e';
    x.beginPath();
    x.ellipse(cx, cy - 56, 66, 36, 0, Math.PI, Math.PI * 2);
    x.fill();
    x.fillRect(cx - 66, cy - 62, 132, 16);
  } else if (spec.hairStyle === 'swept') {
    x.beginPath();
    x.ellipse(cx - 6, cy - 52, 62, 30, -0.18, Math.PI * 0.95, Math.PI * 2.05);
    x.fill();
    x.beginPath();
    x.ellipse(cx + 34, cy - 30, 22, 14, 0.5, 0, Math.PI * 2);
    x.fill();
  } else if (spec.hairStyle === 'cap') {
    x.fillStyle = spec.cap || '#1f6fb2';
    x.beginPath();
    x.ellipse(cx, cy - 52, 64, 30, 0, Math.PI, Math.PI * 2);
    x.fill();
    x.fillRect(cx - 64, cy - 52, 128, 10);
    x.beginPath();
    x.ellipse(cx, cy - 44, 66, 10, 0, 0, Math.PI);
    x.fill();
  }

  // Beard.
  if (spec.beard) {
    x.fillStyle = spec.hair;
    x.beginPath();
    x.ellipse(cx, cy + 34, 58, 46, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    x.fill();
    x.fillStyle = skin;
    x.beginPath();
    x.ellipse(cx, cy + 18, 40, 26, 0, 0, Math.PI * 2);
    x.fill();
  }

  // Brows: thick, expressive.
  x.strokeStyle = spec.hair;
  x.lineWidth = 9;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx - 48, cy - 24);
  x.quadraticCurveTo(cx - 26, cy - 34, cx - 8, cy - 26);
  x.moveTo(cx + 8, cy - 26);
  x.quadraticCurveTo(cx + 26, cy - 34, cx + 48, cy - 24);
  x.stroke();

  // Eyes: big whites, dark irises, white highlights.
  const eyeY = cy - 4;
  for (const side of [-1, 1]) {
    const ex = cx + side * 28;
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.ellipse(ex, eyeY, 15, 12, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = spec.eye || '#241a12';
    x.beginPath();
    x.arc(ex, eyeY + 1, 7.5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(ex - 2.5, eyeY - 2.5, 2.6, 0, Math.PI * 2);
    x.fill();
    // Upper lash line.
    x.strokeStyle = 'rgba(20,10,10,0.7)';
    x.lineWidth = 3;
    x.beginPath();
    x.arc(ex, eyeY, 15, Math.PI * 1.08, Math.PI * 1.92);
    x.stroke();
  }

  // Sunglasses over the eyes when specified.
  if (spec.glasses) {
    x.fillStyle = 'rgba(15,10,25,0.92)';
    x.beginPath();
    x.ellipse(cx - 28, eyeY, 20, 13, 0, 0, Math.PI * 2);
    x.ellipse(cx + 28, eyeY, 20, 13, 0, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#ffd94d';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(cx - 8, eyeY - 2);
    x.lineTo(cx + 8, eyeY - 2);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.beginPath();
    x.ellipse(cx - 32, eyeY - 5, 7, 4, -0.5, 0, Math.PI * 2);
    x.ellipse(cx + 24, eyeY - 5, 7, 4, -0.5, 0, Math.PI * 2);
    x.fill();
  }

  // Nose: a soft shaded wedge with a highlight.
  x.fillStyle = shade(skin, -22);
  x.beginPath();
  x.moveTo(cx - 6, cy + 10);
  x.quadraticCurveTo(cx - 8, cy + 30, cx, cy + 32);
  x.quadraticCurveTo(cx + 8, cy + 30, cx + 6, cy + 10);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.25)';
  x.beginPath();
  x.ellipse(cx - 2, cy + 18, 3, 7, 0, 0, Math.PI * 2);
  x.fill();

  // Blush.
  x.fillStyle = 'rgba(255,90,90,0.20)';
  x.beginPath();
  x.ellipse(cx - 44, cy + 30, 13, 8, 0, 0, Math.PI * 2);
  x.ellipse(cx + 44, cy + 30, 13, 8, 0, 0, Math.PI * 2);
  x.fill();

  // Mouth.
  const my = cy + 46;
  if (spec.smile === 'smirk') {
    x.strokeStyle = spec.lips || '#8e2f3c';
    x.lineWidth = 6;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx - 18, my);
    x.quadraticCurveTo(cx + 2, my + 8, cx + 22, my - 4);
    x.stroke();
  } else if (spec.smile === 'grin') {
    x.fillStyle = '#5e1620';
    x.beginPath();
    x.ellipse(cx, my + 2, 22, 12, 0, 0, Math.PI);
    x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.ellipse(cx, my + 1, 20, 6, 0, Math.PI, Math.PI * 2);
    x.fill();
  } else {
    x.fillStyle = spec.lips || '#a83a44';
    x.beginPath();
    x.ellipse(cx, my + 2, 20, 9, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.beginPath();
    x.ellipse(cx, my - 1, 12, 3.5, 0, 0, Math.PI * 2);
    x.fill();
  }

  return c.toDataURL('image/png');
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

// The cast of Aurelia Bay. Every spec is original to this game.
export const CAST = {
  dante: {
    skin: '#c98d5f', hair: '#1c1210', hairStyle: 'swept', shirt: '#14324a',
    lips: '#7e2f33', smile: 'smirk', chain: true, bg: ['#3b1d4e', '#b33a4e'],
  },
  vera: {
    skin: '#b57a4e', hair: '#241016', hairStyle: 'long', shirt: '#5e2a72',
    lips: '#c22f4a', smile: 'smirk', earrings: true, bg: ['#40204e', '#c24b5a'],
  },
  lena: {
    skin: '#a06a42', hair: '#120d0c', hairStyle: 'ponytail', shirt: '#c2521e',
    lips: '#9c3440', smile: 'grin', bg: ['#1d3a4e', '#2e7a5e'],
  },
  hugo: {
    skin: '#8a5a34', hair: '#2a1a10', hairStyle: 'beanie', shirt: '#4a5d23',
    beard: true, smile: 'grin', bg: ['#3a2a1a', '#7a5a1e'],
  },
  nina: {
    skin: '#c08a5e', hair: '#17100e', hairStyle: 'curly', shirt: '#c22f6a',
    lips: '#a83a44', smile: 'smirk', glasses: true, bg: ['#4e1d3a', '#7a2a5e'],
  },
};

export function portraitOf(name) {
  return paintPortrait(CAST[name]);
}
