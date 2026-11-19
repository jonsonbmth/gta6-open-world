// HUD: the four-corner display, the live minimap, and the full city map
// (M key) with districts, street names, a GPS route, compass and legend.

import { CFG, districtAt } from './config.js';

function el(id) {
  return document.getElementById(id);
}

function fmtTime(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function fmtCash(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

// --- Minimap ---------------------------------------------------------------
const MM = 190;
function mmX(x) {
  return ((x + 320) / 640) * MM;
}
function mmZ(z) {
  return ((z + 320) / 640) * MM;
}

function drawMinimap(ctx, data, time) {
  ctx.clearRect(0, 0, MM, MM);
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, MM, MM);
  // Districts, faint.
  for (const d of CFG.districts) {
    ctx.fillStyle = d.color + '44';
    ctx.fillRect(mmX(d.x0), mmZ(d.z0), mmX(d.x1) - mmX(d.x0), mmZ(d.z1) - mmZ(d.z0));
  }
  // Beach strip.
  ctx.fillStyle = '#e9d29e';
  ctx.fillRect(mmX(252), 0, mmX(320) - mmX(252), MM);
  // Roads.
  ctx.strokeStyle = '#cfd6dd';
  ctx.lineWidth = 2.5;
  for (const a of CFG.avenues) {
    ctx.beginPath();
    ctx.moveTo(mmX(a.x), 0);
    ctx.lineTo(mmX(a.x), MM);
    ctx.stroke();
  }
  for (const s of CFG.streets) {
    ctx.beginPath();
    ctx.moveTo(0, mmZ(s.z));
    ctx.lineTo(MM, mmZ(s.z));
    ctx.stroke();
  }
  // Checkpoints.
  data.checkpoints.forEach((cp, i) => {
    ctx.beginPath();
    ctx.arc(mmX(cp.x), mmZ(cp.z), i === data.checkpointIndex ? 5 + Math.sin(time * 5) : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = i < data.checkpointIndex ? '#2ecc71' : '#ff8c1a';
    ctx.fill();
  });
  // Police.
  ctx.fillStyle = '#4d7cff';
  for (const p of data.police) {
    ctx.beginPath();
    ctx.arc(mmX(p.x), mmZ(p.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = mmX(data.player.x);
  const pz = mmZ(data.player.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(Math.atan2(Math.sin(data.heading), -Math.cos(data.heading)));
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // North tick.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', MM / 2, 12);
}

// --- Big map ---------------------------------------------------------------
const MAP_W = 1100;
const MAP_H = 760;
const MAP_S = 1.1;
const MAP_OX = (MAP_W - 720 * MAP_S) / 2;
const MAP_OY = (MAP_H - 640 * MAP_S) / 2;
function mapX(x) {
  return MAP_OX + (x + 320) * MAP_S;
}
function mapZ(z) {
  return MAP_OY + (z + 320) * MAP_S;
}

function gpsRoute(player, target) {
  // Manhattan route through the road grid: nearest avenue, then the street
  // nearest the target, then the target.
  let ax = CFG.avenues[0].x;
  for (const a of CFG.avenues) if (Math.abs(a.x - player.x) < Math.abs(ax - player.x)) ax = a.x;
  let sz = CFG.streets[0].z;
  for (const s of CFG.streets) if (Math.abs(s.z - target.z) < Math.abs(sz - target.z)) sz = s.z;
  return [
    { x: player.x, z: player.z },
    { x: ax, z: player.z },
    { x: ax, z: sz },
    { x: target.x, z: sz },
    { x: target.x, z: target.z },
  ];
}

function drawBigMap(ctx, data, time) {
  ctx.clearRect(0, 0, MAP_W, MAP_H);
  const bg = ctx.createLinearGradient(0, 0, 0, MAP_H);
  bg.addColorStop(0, '#0e2233');
  bg.addColorStop(1, '#0a1a28');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // Grid + coordinates.
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  for (let gx = -320; gx <= 400; gx += 80) {
    ctx.beginPath();
    ctx.moveTo(mapX(gx), MAP_OY);
    ctx.lineTo(mapX(gx), MAP_OY + 640 * MAP_S);
    ctx.stroke();
    ctx.fillText(String(gx), mapX(gx) + 3, MAP_OY + 640 * MAP_S + 14);
  }
  for (let gz = -320; gz <= 320; gz += 80) {
    ctx.beginPath();
    ctx.moveTo(MAP_OX, mapZ(gz));
    ctx.lineTo(MAP_OX + 720 * MAP_S, mapZ(gz));
    ctx.stroke();
    ctx.fillText(String(gz), MAP_OX - 26, mapZ(gz) + 3);
  }

  // Ocean + beach.
  const oc = ctx.createLinearGradient(mapX(320), 0, mapX(400), 0);
  oc.addColorStop(0, '#2e7f9e');
  oc.addColorStop(1, '#155a75');
  ctx.fillStyle = oc;
  ctx.fillRect(mapX(320), MAP_OY, mapX(400) - mapX(320), 640 * MAP_S);
  ctx.fillStyle = '#e9d29e';
  ctx.fillRect(mapX(252), MAP_OY, mapX(320) - mapX(252), 640 * MAP_S);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'italic bold 15px Arial';
  ctx.save();
  ctx.translate(mapX(362), MAP_OY + 320 * MAP_S);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('S O L M A R   B A Y', 0, 0);
  ctx.restore();

  // Districts.
  for (const d of CFG.districts) {
    ctx.fillStyle = d.color + '2e';
    ctx.fillRect(mapX(d.x0), mapZ(d.z0), mapX(d.x1) - mapX(d.x0), mapZ(d.z1) - mapZ(d.z0));
    ctx.strokeStyle = d.color + '66';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mapX(d.x0), mapZ(d.z0), mapX(d.x1) - mapX(d.x0), mapZ(d.z1) - mapZ(d.z0));
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(d.name, (mapX(d.x0) + mapX(d.x1)) / 2, (mapZ(d.z0) + mapZ(d.z1)) / 2);
  }

  // Roads.
  ctx.strokeStyle = '#e8e4da';
  ctx.lineCap = 'round';
  for (const a of CFG.avenues) {
    ctx.lineWidth = a.name === 'Ocean Drive' ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(mapX(a.x), MAP_OY);
    ctx.lineTo(mapX(a.x), MAP_OY + 640 * MAP_S);
    ctx.stroke();
  }
  for (const s of CFG.streets) {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(MAP_OX, mapZ(s.z));
    ctx.lineTo(MAP_OX + 640 * MAP_S, mapZ(s.z));
    ctx.stroke();
  }
  // Street names.
  ctx.fillStyle = 'rgba(10,30,45,0.85)';
  ctx.font = 'bold 10px Arial';
  for (const a of CFG.avenues) {
    ctx.save();
    ctx.translate(mapX(a.x) - 4, MAP_OY + 320 * MAP_S);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(a.name.toUpperCase(), 0, 0);
    ctx.restore();
  }
  for (const s of CFG.streets) {
    ctx.textAlign = 'center';
    ctx.fillText(s.name.toUpperCase(), MAP_OX + 320 * MAP_S, mapZ(s.z) - 4);
  }

  // Marina piers.
  ctx.fillStyle = '#8a6a48';
  for (const pz of [150, 190, 230]) {
    ctx.fillRect(mapX(320), mapZ(pz) - 2, mapX(388) - mapX(320), 4);
  }

  // GPS route to the next checkpoint.
  const next = data.checkpoints[Math.min(data.checkpointIndex, data.checkpoints.length - 1)];
  if (next) {
    const route = gpsRoute(data.player, next);
    ctx.save();
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -time * 30;
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    route.forEach((p, i) => {
      if (i === 0) ctx.moveTo(mapX(p.x), mapZ(p.z));
      else ctx.lineTo(mapX(p.x), mapZ(p.z));
    });
    ctx.stroke();
    ctx.restore();
  }

  // Checkpoints, numbered.
  data.checkpoints.forEach((cp, i) => {
    const done = i < data.checkpointIndex;
    const isNext = i === data.checkpointIndex;
    ctx.beginPath();
    ctx.arc(mapX(cp.x), mapZ(cp.z), isNext ? 11 + Math.sin(time * 5) * 2 : 9, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#2ecc71' : '#ff8c1a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), mapX(cp.x), mapZ(cp.z) + 4);
  });

  // Police.
  for (const p of data.police) {
    ctx.beginPath();
    ctx.arc(mapX(p.x), mapZ(p.z), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#4d7cff';
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Player arrow.
  const px = mapX(data.player.x);
  const pz = mapZ(data.player.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(Math.atan2(Math.sin(data.heading), -Math.cos(data.heading)));
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(9, 11);
  ctx.lineTo(0, 5);
  ctx.lineTo(-9, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(px, pz, 20 + Math.sin(time * 3) * 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Title block.
  ctx.fillStyle = 'rgba(8,20,32,0.85)';
  ctx.fillRect(24, 22, 330, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(24, 22, 330, 64);
  ctx.fillStyle = '#ffd9a0';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', 40, 50);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '13px Arial';
  ctx.fillText(`CITY MAP  •  ${districtAt(data.player.x, data.player.z)}`, 40, 72);

  // Compass rose.
  const cx = MAP_W - 70;
  const cy = 70;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,20,32,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 26);
  ctx.lineTo(cx + 7, cy + 6);
  ctx.lineTo(cx - 7, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - 30);
  ctx.font = '10px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('E', cx + 24, cy + 4);
  ctx.fillText('S', cx, cy + 28);
  ctx.fillText('W', cx - 24, cy + 4);

  // Legend.
  const lx = 24;
  const ly = MAP_H - 132;
  ctx.fillStyle = 'rgba(8,20,32,0.85)';
  ctx.fillRect(lx, ly, 230, 108);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(lx, ly, 230, 108);
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('LEGEND', lx + 14, ly + 20);
  const items = [
    ['#ffffff', 'You'],
    ['#ff8c1a', 'Checkpoint'],
    ['#ff2e88', 'GPS route'],
    ['#4d7cff', 'Police'],
    ['#2ecc71', 'Cleared'],
  ];
  ctx.font = '12px Arial';
  items.forEach(([color, label], i) => {
    const y = ly + 40 + i * 14;
    ctx.fillStyle = color;
    ctx.fillRect(lx + 14, y - 9, 12, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(label, lx + 34, y);
  });

  // Scale bar.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('100 m', MAP_W - 24, MAP_H - 42);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(MAP_W - 24 - 100 * MAP_S, MAP_H - 36, 100 * MAP_S, 5);
}

// --- HUD object ------------------------------------------------------------
export function createHUD() {
  const minimapCtx = el('minimap').getContext('2d');
  const mapCtx = el('map-canvas').getContext('2d');
  let toastTimer = null;
  let messageTimer = null;
  let mapOpen = false;
  const startClock = 17 * 60 + 42; // 17:42 golden hour

  function toast(text, ms = 2600) {
    const t = el('hud-toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function showMessage(text, ms = 1900) {
    const m = el('hud-message');
    m.textContent = text;
    m.classList.add('show');
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => m.classList.remove('show'), ms);
  }

  return {
    toast,
    showMessage,
    isMapOpen() {
      return mapOpen;
    },
    openMap() {
      mapOpen = true;
      el('map-overlay').classList.add('show');
    },
    closeMap() {
      mapOpen = false;
      el('map-overlay').classList.remove('show');
    },
    showBusted() {
      el('busted-overlay').classList.add('show');
    },
    hideBusted() {
      el('busted-overlay').classList.remove('show');
    },
    showPause(v) {
      el('pause-overlay').classList.toggle('show', v);
    },
    showTitle(v) {
      el('title-screen').classList.toggle('show', v);
    },
    setLoadingDone() {
      el('loading').classList.add('done');
    },

    update(s, time) {
      // Corners: speed bottom-left, wanted/objective top-left, map top-right.
      el('hud-speed').textContent = String(Math.round(Math.abs(s.speed) * 3.6));
      const kmh = Math.abs(s.speed) * 3.6;
      el('hud-gear').textContent =
        s.onFoot ? 'ON FOOT' : kmh < 1 ? 'N' : kmh < 30 ? '1' : kmh < 60 ? '2' : kmh < 95 ? '3' : kmh < 140 ? '4' : '5';
      const driftEl = el('hud-drift');
      if (s.drifting && s.driftPoints > 0) {
        driftEl.textContent = `DRIFT +${s.driftPoints}`;
        driftEl.classList.add('show');
      } else {
        driftEl.classList.remove('show');
      }
      el('hud-cash').textContent = fmtCash(s.cash);
      el('hud-stars').textContent = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
      el('hud-stars').style.color = s.wanted > 0 ? '#ffd94d' : 'rgba(255,255,255,0.55)';
      const cp = s.checkpoints[Math.min(s.checkpointIndex, s.checkpoints.length - 1)];
      el('hud-objective').textContent = s.missionActive
        ? `SUNSET SPRINT  ${Math.min(s.checkpointIndex + 1, s.checkpoints.length)}/${s.checkpoints.length} — ${cp ? cp.name : ''}`
        : 'SUNSET SPRINT — next run starting…';
      el('hud-time').textContent = fmtTime(s.timeLeft);
      el('hud-time').style.color = s.timeLeft < 20 && s.missionActive ? '#ff5a5a' : '#ffffff';
      el('hud-district').textContent = districtAt(s.player.x, s.player.z);
      const mins = startClock + Math.floor(time / 5);
      el('hud-clock').textContent = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      el('hud-best-drift').textContent = `BEST DRIFT ${s.bestDrift}`;

      drawMinimap(minimapCtx, s, time);
      if (mapOpen) drawBigMap(mapCtx, s, time);
    },
  };
}
