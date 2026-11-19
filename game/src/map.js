// The AAA city map: district zones with dashed borders, the ring highway,
// named streets, the bay + Pelican Isle + Harbor Bridge, landmark icons, a
// GPS route, compass, legend and grid. No label overlaps, nothing clipped.
import { DISTRICTS, STREETS, LANDMARKS } from './config.js';

const W = 1000;
const H = 640;
const SCALE = 2.6;
const CX = 500;
const CY = 320;
const OX = 15;

function px(x) {
  return CX + (x - OX) * SCALE;
}
function py(z) {
  return CY + z * SCALE;
}

export function drawCityMap(canvas, game) {
  const g = canvas.getContext('2d');
  const state = game.state;
  g.clearRect(0, 0, W, H);
  // Base.
  g.fillStyle = '#0a1230';
  g.fillRect(0, 0, W, H);
  // Grid + labels.
  g.strokeStyle = 'rgba(120,140,190,0.25)';
  g.lineWidth = 1;
  g.fillStyle = 'rgba(200,212,240,0.7)';
  g.font = '12px Arial';
  g.textAlign = 'center';
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  for (let i = 0; i < 7; i += 1) {
    const x = 100 + i * 120;
    g.beginPath();
    g.moveTo(x, 24);
    g.lineTo(x, H - 8);
    g.stroke();
    g.fillText(cols[i], x, 18);
  }
  g.textAlign = 'right';
  for (let i = 0; i < 6; i += 1) {
    const y = 60 + i * 100;
    g.beginPath();
    g.moveTo(8, y);
    g.lineTo(W - 8, y);
    g.stroke();
    g.fillText(String(i + 1), 92, y + 4);
  }
  // Bay water (right side).
  g.fillStyle = '#14385e';
  g.fillRect(px(62), py(-120), px(160) - px(62), py(120) - py(-120));
  // Pelican Isle.
  g.fillStyle = '#e8d9a8';
  g.beginPath();
  g.ellipse(px(130), py(-40), 26, 12, 0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#9ec8e8';
  g.font = 'bold 12px Arial';
  g.textAlign = 'center';
  g.fillText('PELICAN ISLE', px(130), py(-40) + 30);
  // Harbor Bridge.
  g.strokeStyle = '#e8e8e8';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px(20), py(-60));
  g.lineTo(px(140), py(-60));
  g.stroke();
  g.fillStyle = '#e8e8e8';
  g.fillText('HARBOR BRIDGE', px(80), py(-60) - 8);
  // District zones: dashed borders, name top-left INSIDE, clear of the ring.
  for (const d of DISTRICTS) {
    g.strokeStyle = d.color;
    g.lineWidth = 1.5;
    g.setLineDash([6, 4]);
    g.strokeRect(px(d.x0), py(d.z0), px(d.x1) - px(d.x0), py(d.z1) - py(d.z0));
    g.setLineDash([]);
    g.fillStyle = d.color;
    g.font = 'bold 13px Arial';
    g.textAlign = 'left';
    g.fillText(d.name, px(d.x0) + 10, py(d.z0) + 22);
  }
  // Streets.
  g.strokeStyle = 'rgba(240,244,255,0.9)';
  g.lineWidth = 2.5;
  for (const s of STREETS) {
    g.beginPath();
    if (s.vertical) {
      g.moveTo(px(s.at), py(-110));
      g.lineTo(px(s.at), py(110));
    } else {
      g.moveTo(px(-110), py(s.at));
      g.lineTo(px(60), py(s.at));
    }
    g.stroke();
  }
  // Street names (offset from the line so they never sit on it).
  g.fillStyle = '#ffffff';
  g.font = 'bold 12px Arial';
  g.textAlign = 'left';
  g.fillText('CROWN ROAD', px(-100), py(-80) - 6);
  g.fillText('CANAL STREET', px(-100), py(-40) - 6);
  g.fillText('VELA STREET', px(-100), py(40) - 6);
  g.fillText('PALM BOULEVARD', px(-100), py(80) - 6);
  g.save();
  g.translate(px(0) + 8, py(20));
  g.rotate(-Math.PI / 2);
  g.fillText('SOLMAR AVENUE', 0, 0);
  g.restore();
  g.save();
  g.translate(px(48) + 8, py(20));
  g.rotate(-Math.PI / 2);
  g.fillText('HARBOUR WAY', 0, 0);
  g.restore();
  // Ring highway (yellow rounded rect).
  g.strokeStyle = '#f5c518';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(px(-104), py(-104), px(104) - px(-104), py(104) - py(-104), 22);
  g.stroke();
  // Landmarks: yellow triangles + names, placed clear of each other.
  for (const lm of LANDMARKS) {
    if (lm.name === 'PELICAN ISLE' || lm.name === 'HARBOR BRIDGE') continue;
    const x = px(lm.x);
    const y = py(lm.z);
    g.fillStyle = '#f5c518';
    g.beginPath();
    g.moveTo(x, y - 8);
    g.lineTo(x + 6, y + 5);
    g.lineTo(x - 6, y + 5);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = 'bold 11px Arial';
    g.textAlign = 'center';
    // MIRAMAR BEACH and OLD PIER sit above their markers — clear of the
    // LIGHTHOUSE label and the ring line.
    const dy = (lm.name === 'MIRAMAR BEACH' || lm.name === 'OLD PIER') ? -14 : 20;
    g.fillText(lm.name, x, y + dy);
  }
  // GPS route: dashed cyan from Rico to the mission target.
  const p = game.playerPos();
  const t = game.missionTarget();
  g.strokeStyle = '#37c8f5';
  g.lineWidth = 2.5;
  g.setLineDash([8, 6]);
  g.beginPath();
  g.moveTo(px(p.x), py(p.z));
  g.lineTo(px(t.x), py(t.z));
  g.stroke();
  g.setLineDash([]);
  const distKm = (Math.hypot(t.x - p.x, t.z - p.z) * 0.0235).toFixed(2);
  g.fillStyle = '#37c8f5';
  g.font = 'bold 12px Arial';
  g.textAlign = 'center';
  g.fillText(`GPS ${distKm} KM · ETA 5 MIN`, (px(p.x) + px(t.x)) / 2 + 70, (py(p.z) + py(t.z)) / 2 - 10);
  // Mission target (red dot) + Rico (white triangle).
  g.fillStyle = '#ff4444';
  g.beginPath();
  g.arc(px(t.x), py(t.z), 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(px(p.x), py(p.z) - 9);
  g.lineTo(px(p.x) + 7, py(p.z) + 6);
  g.lineTo(px(p.x) - 7, py(p.z) + 6);
  g.closePath();
  g.fill();
  // Police dots (blue).
  g.fillStyle = '#4a9ae8';
  for (const pol of game.policePos()) {
    g.beginPath();
    g.arc(px(pol.x), py(pol.z), 5, 0, Math.PI * 2);
    g.fill();
  }
  // Compass (top-right, clear of the legend box below it).
  const ccx = W - 46;
  const ccy = 44;
  g.strokeStyle = '#f5c518';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(ccx, ccy, 18, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#ff4444';
  g.beginPath();
  g.moveTo(ccx, ccy - 13);
  g.lineTo(ccx + 6, ccy + 8);
  g.lineTo(ccx - 6, ccy + 8);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 12px Arial';
  g.textAlign = 'center';
  g.fillText('N', ccx, ccy - 24);
  // Legend (top-right, below the compass).
  const lx = W - 190;
  const ly = 78;
  g.fillStyle = 'rgba(6,10,24,0.85)';
  g.fillRect(lx, ly, 170, 118);
  g.strokeStyle = '#f5c518';
  g.lineWidth = 2;
  g.strokeRect(lx, ly, 170, 118);
  g.fillStyle = '#f5c518';
  g.font = 'bold 13px Arial';
  g.textAlign = 'left';
  g.fillText('LEGEND', lx + 12, ly + 20);
  const items = [
    ['#37c8f5', 'GPS route'],
    ['#ff4444', 'Mission target'],
    ['#ffffff', 'Rico'],
    ['#4a9ae8', 'Police'],
    ['#14385e', 'Water / bay'],
  ];
  g.font = '12px Arial';
  items.forEach(([c, label], i) => {
    g.fillStyle = c;
    g.fillRect(lx + 12, ly + 32 + i * 17, 12, 12);
    g.fillStyle = '#ffffff';
    g.fillText(label, lx + 30, ly + 42 + i * 17);
  });
  void state;
}
