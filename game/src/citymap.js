// The AAA city map: district zones, named streets, bay + island + bridge,
// landmark icons, GPS route with distance + ETA, compass, legend, grid.

import { DISTRICTS } from './config.js';

const LANDMARKS = [
  { name: 'OLD PIER', x: 66, z: -18, icon: 'anchor' },
  { name: 'PALM ROW PLAZA', x: -20, z: 12, icon: 'star' },
  { name: 'VELA MARKET', x: -28, z: -80, icon: 'shop' },
  { name: 'CROWN TOWER', x: -24, z: -168, icon: 'tower' },
  { name: 'MIRAMAR BEACH', x: 44, z: -212, icon: 'wave' },
  { name: 'CANAL BRIDGE', x: -30, z: -238, icon: 'bridge' },
  { name: 'DOCKSIDE YARD', x: 40, z: -128, icon: 'crane' },
  { name: 'LENA\'S WORKSHOP', x: -18, z: -96, icon: 'wrench' },
];

const STREETS = [
  { name: 'SOLMAR AVENUE', vertical: true, x: 0 },
  { name: 'PALM BOULEVARD', vertical: false, z: 30 },
  { name: 'VELA STREET', vertical: false, z: -90 },
  { name: 'CROWN ROAD', vertical: false, z: -190 },
  { name: 'HARBOUR WAY', vertical: true, x: 52 },
  { name: 'CANAL STREET', vertical: false, z: -230 },
];

// World bounds mapped onto the canvas.
const W = { x0: -110, x1: 160, z0: -270, z1: 90 };

function icon(g, kind, x, y) {
  g.save();
  g.translate(x, y);
  g.fillStyle = '#ffd23f';
  g.strokeStyle = '#0a0a12';
  g.lineWidth = 2;
  if (kind === 'star') {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 9 : 4;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      g[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'anchor') {
    g.beginPath(); g.arc(0, -4, 3.5, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, -1); g.lineTo(0, 9); g.moveTo(-7, 4); g.lineTo(7, 4); g.stroke();
    g.beginPath(); g.arc(0, 9, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  } else if (kind === 'tower') {
    g.fillRect(-4, -9, 8, 18);
    g.beginPath(); g.moveTo(0, -14); g.lineTo(3, -9); g.lineTo(-3, -9); g.closePath(); g.fill();
  } else if (kind === 'wave') {
    g.beginPath();
    for (let i = -8; i <= 8; i++) g[i === -8 ? 'moveTo' : 'lineTo'](i, Math.sin(i * 0.7) * 3);
    g.stroke();
    g.beginPath();
    for (let i = -8; i <= 8; i++) g[i === -8 ? 'moveTo' : 'lineTo'](i, 6 + Math.sin(i * 0.7) * 3);
    g.stroke();
  } else if (kind === 'bridge') {
    g.beginPath(); g.moveTo(-9, 6); g.lineTo(9, 6); g.moveTo(-6, 6); g.lineTo(-6, -6); g.moveTo(6, 6); g.lineTo(6, -6); g.moveTo(-6, -6); g.quadraticCurveTo(0, 2, 6, -6); g.stroke();
  } else if (kind === 'crane') {
    g.beginPath(); g.moveTo(-2, 9); g.lineTo(-2, -8); g.lineTo(8, -8); g.moveTo(-2, -8); g.lineTo(2, -2); g.stroke();
  } else if (kind === 'wrench') {
    g.beginPath(); g.arc(-3, -4, 4, 0.6, Math.PI * 1.6); g.stroke();
    g.beginPath(); g.moveTo(0, -1); g.lineTo(7, 7); g.stroke();
  } else { // shop
    g.strokeRect(-7, -2, 14, 10);
    g.beginPath(); g.moveTo(-8, -2); g.lineTo(0, -9); g.lineTo(8, -2); g.closePath(); g.stroke();
  }
  g.restore();
}

export function drawCityMap(canvas, state) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const px = (x) => ((x - W.x0) / (W.x1 - W.x0)) * w;
  const py = (z) => ((z - W.z0) / (W.z1 - W.z0)) * h;

  // dark ocean + land base
  g.fillStyle = '#0a1a33';
  g.fillRect(0, 0, w, h);
  const landGrad = g.createLinearGradient(0, 0, w, 0);
  landGrad.addColorStop(0, '#141a2e');
  landGrad.addColorStop(1, '#1a2038');
  g.fillStyle = landGrad;
  g.fillRect(0, 0, px(64), h);

  // grid A–H / 1–6
  g.strokeStyle = 'rgba(255,255,255,0.07)';
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.font = 'bold 13px Arial';
  g.textAlign = 'center';
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) * (w / 8);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    g.fillText('ABCDEFGH'[i], x, 16);
  }
  for (let i = 0; i < 6; i++) {
    const y = (i + 0.5) * (h / 6);
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    g.fillText(String(i + 1), 12, y + 4);
  }

  // district zones with dashed borders
  for (const d of DISTRICTS) {
    g.fillStyle = d.color + '22';
    g.strokeStyle = d.color;
    g.lineWidth = 1.6;
    g.setLineDash([8, 6]);
    g.beginPath();
    g.rect(px(d.x - d.w / 2), py(d.z - d.h / 2), px(d.x + d.w / 2) - px(d.x - d.w / 2), py(d.z + d.h / 2) - py(d.z - d.h / 2));
    g.fill();
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = d.color;
    g.font = 'bold 14px Arial';
    g.fillText(d.name, px(d.x), py(d.z + d.h / 2) - 8);
  }

  // ring highway (rounded rectangle loop)
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(px(-52), py(-232), px(48) - px(-52), py(52) - py(-232), 40);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(px(-52), py(-232), px(48) - px(-52), py(52) - py(-232), 40);
  g.stroke();

  // streets
  g.strokeStyle = 'rgba(230,236,255,0.75)';
  g.lineWidth = 3;
  for (const s of STREETS) {
    g.beginPath();
    if (s.vertical) { g.moveTo(px(s.x), 0); g.lineTo(px(s.x), h); }
    else { g.moveTo(0, py(s.z)); g.lineTo(px(64), py(s.z)); }
    g.stroke();
  }
  // street name labels
  g.fillStyle = 'rgba(230,236,255,0.85)';
  g.font = 'bold 12px Arial';
  g.save();
  g.translate(px(0) + 10, h / 2);
  g.rotate(-Math.PI / 2);
  g.fillText('SOLMAR AVENUE', 0, 0);
  g.restore();
  g.textAlign = 'left';
  g.fillText('PALM BOULEVARD', px(8), py(30) - 8);
  g.fillText('VELA STREET', px(-52), py(-90) - 8);
  g.fillText('CROWN ROAD', px(-52), py(-190) - 8);
  g.fillText('HARBOUR WAY', px(52) + 8, py(-60));
  g.fillText('CANAL STREET', px(8), py(-230) - 8);
  g.textAlign = 'center';

  // bay + Pelican Isle + bridge
  g.fillStyle = '#123a5c';
  g.beginPath();
  g.ellipse(px(96), py(-120), 26, 15, 0.4, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#7fd4ff';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#7fd4ff';
  g.font = 'bold 12px Arial';
  g.fillText('PELICAN ISLE', px(96), py(-120) - 22);
  g.strokeStyle = '#e8ecff';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(px(60), py(-60));
  g.lineTo(px(96), py(-104));
  g.stroke();
  g.fillStyle = '#e8ecff';
  g.fillText('HARBOR BRIDGE', px(78), py(-78) - 8);
  g.fillStyle = '#4d7fb8';
  g.font = 'italic bold 16px Arial';
  g.fillText('SOLMAR BAY', px(110), py(20));

  // landmarks
  for (const lm of LANDMARKS) {
    icon(g, lm.icon, px(lm.x), py(lm.z));
    g.fillStyle = '#ffffff';
    g.font = 'bold 11px Arial';
    g.fillText(lm.name, px(lm.x), py(lm.z) + 22);
  }

  // GPS route: player -> mission marker (mission stage 1 route)
  if (state.marker && state.playerPos) {
    const sx = px(state.playerPos.x), sy = py(state.playerPos.z);
    const tx = px(state.marker.x), ty = py(state.marker.z);
    const midX = sx + (tx - sx) * 0.5;
    g.strokeStyle = '#00e5ff';
    g.lineWidth = 5;
    g.setLineDash([]);
    g.shadowColor = '#00e5ff';
    g.shadowBlur = 10;
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(midX, sy, tx, ty);
    g.stroke();
    g.shadowBlur = 0;
    // destination pin
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.arc(tx, ty, 10, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#0a0a12';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#0a0a12';
    g.font = 'bold 13px Arial';
    g.fillText('★', tx, ty + 4);
    // distance + ETA (to the right of the pin, clear of other labels)
    const dist = Math.hypot(state.marker.x - state.playerPos.x, state.marker.z - state.playerPos.z);
    const eta = Math.max(1, Math.round(dist / 16));
    g.fillStyle = 'rgba(6,8,18,0.85)';
    g.fillRect(tx + 16, ty - 15, 148, 30);
    g.strokeStyle = '#00e5ff';
    g.lineWidth = 1.5;
    g.strokeRect(tx + 16, ty - 15, 148, 30);
    g.fillStyle = '#00e5ff';
    g.font = 'bold 13px Arial';
    g.textAlign = 'left';
    g.fillText(`${Math.round(dist)} m  ·  ${eta} min`, tx + 26, ty + 4);
    g.textAlign = 'center';
  }

  // player arrow
  if (state.playerPos) {
    const x = px(state.playerPos.x), y = py(state.playerPos.z);
    g.save();
    g.translate(x, y);
    g.rotate(Math.atan2(Math.sin(state.heading || 0), Math.cos(state.heading || 0)) + Math.PI);
    g.fillStyle = '#ff2d55';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath();
    g.fill(); g.stroke();
    g.restore();
    g.fillStyle = '#ffffff';
    g.font = 'bold 11px Arial';
    g.fillText('RICO', x, y + 26);
  }

  // police blips
  if (state.policePositions) {
    for (const p of state.policePositions) {
      g.fillStyle = '#2266ff';
      g.beginPath();
      g.arc(px(p.x), py(p.z), 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.stroke();
    }
  }

  // compass
  const cx = w - 46, cy = 46;
  g.fillStyle = 'rgba(6,8,18,0.8)';
  g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ff2d55';
  g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx + 6, cy + 6); g.lineTo(cx - 6, cy + 6); g.closePath(); g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 13px Arial';
  g.fillText('N', cx, cy - 30);

  // legend (top-right, under compass)
  const lx = w - 190, ly = 92;
  g.fillStyle = 'rgba(6,8,18,0.85)';
  g.fillRect(lx, ly, 176, 118);
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 1;
  g.strokeRect(lx, ly, 176, 118);
  g.textAlign = 'left';
  g.fillStyle = '#ffd23f';
  g.font = 'bold 13px Arial';
  g.fillText('LEGEND', lx + 12, ly + 20);
  g.font = '12px Arial';
  const rows = [
    ['#00e5ff', 'GPS route'],
    ['#ffd23f', 'Mission target'],
    ['#ff2d55', 'Rico'],
    ['#2266ff', 'Police'],
    ['#7fd4ff', 'Water / bay'],
  ];
  rows.forEach(([c, label], i) => {
    g.fillStyle = c;
    g.fillRect(lx + 12, ly + 32 + i * 17, 12, 12);
    g.fillStyle = '#e8ecff';
    g.fillText(label, lx + 30, ly + 42 + i * 17);
  });
  g.textAlign = 'center';

  // wanted stars (top-left of map)
  g.fillStyle = 'rgba(6,8,18,0.85)';
  g.fillRect(14, 14, 150, 34);
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.strokeRect(14, 14, 150, 34);
  g.font = 'bold 20px Arial';
  g.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i < (state.wanted || 0) ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    g.fillText('★', 24 + i * 26, 40);
  }
  g.textAlign = 'center';
}
