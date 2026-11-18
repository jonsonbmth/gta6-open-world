// HUD: DOM panels, minimap + city map canvases, portraits, floating text.
import { currentJob, stageLabel, nextObjective, CREW } from './missions.js';
import { RADIO, WEAPONS } from './state.js';
import { CITY } from './city.js';

const $ = (id) => document.getElementById(id);

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US');
}

export function showHud(on) {
  $('hud').classList.toggle('hidden', !on);
  $('title-screen').classList.toggle('hidden', on);
}

export function drawPortrait(crewKey) {
  const c = CREW[crewKey] || CREW.rico;
  const cv = $('portrait');
  const g = cv.getContext('2d');
  g.fillStyle = '#2a2350';
  g.fillRect(0, 0, 72, 72);
  // shoulders
  g.fillStyle = c.shirt;
  g.beginPath();
  g.ellipse(36, 74, 30, 22, 0, Math.PI, 0);
  g.fill();
  // head
  g.fillStyle = c.skin;
  g.beginPath();
  g.ellipse(36, 34, 19, 22, 0, 0, Math.PI * 2);
  g.fill();
  // hair
  g.fillStyle = c.hair;
  g.beginPath();
  g.ellipse(36, 20, 20, 13, 0, Math.PI, 0);
  g.fill();
  // eyes + smile
  g.fillStyle = '#141414';
  g.beginPath(); g.arc(29, 33, 2.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(43, 33, 2.6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#141414';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(36, 42, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
}

export function setDialogue(crewKey, text) {
  const c = CREW[crewKey] || CREW.rico;
  $('dialogue-name').textContent = c.name;
  $('dialogue-text').textContent = text;
  drawPortrait(crewKey);
}

// Minimap: bright blue city grid on a dark sea, rotating with the player.
export function drawMinimap(playerX, playerZ, heading, police, missionPos) {
  const cv = $('minimap');
  const g = cv.getContext('2d');
  const S = 220, C = S / 2;
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath();
  g.arc(C, C, C - 2, 0, Math.PI * 2);
  g.clip();
  // sea + land
  g.fillStyle = '#16224e';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#2e3a6e';
  g.fillRect(0, 0, S, S - 34);
  g.fillStyle = '#1d6a9e';
  g.fillRect(0, S - 34, S, 34);
  // rotate the world around the player
  g.translate(C, C);
  g.rotate(-heading);
  const scale = 0.55; // world units -> px
  const wx = (x) => (x - playerX) * scale;
  const wz = (z) => (z - playerZ) * scale;
  // roads
  g.fillStyle = '#8fa3d8';
  g.fillRect(wx(-11), wz(-210), 22 * scale, 420 * scale);
  for (const z of CITY.crossZ) {
    g.fillRect(wx(-130), wz(z - 7), 260 * scale, 14 * scale);
  }
  // blocks
  g.fillStyle = '#4a568e';
  for (let z = -190; z <= 170; z += 24) {
    if (CITY.crossZ.some((cz) => Math.abs(z - cz) < 12)) continue;
    g.fillRect(wx(-33), wz(z - 9), 14 * scale, 18 * scale);
    g.fillRect(wx(19), wz(z - 9), 14 * scale, 18 * scale);
  }
  // mission marker
  if (missionPos) {
    g.fillStyle = '#ffd23e';
    g.beginPath();
    g.arc(wx(missionPos.x), wz(missionPos.z), 7, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.stroke();
  }
  // police blips
  g.fillStyle = '#ff4040';
  for (const p of police) {
    g.beginPath();
    g.arc(wx(p.x), wz(p.z), 4.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // player arrow (screen-fixed, pointing up)
  g.fillStyle = '#ff3040';
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(C, C - 14);
  g.lineTo(C + 9, C + 10);
  g.lineTo(C, C + 4);
  g.lineTo(C - 9, C + 10);
  g.closePath();
  g.fill();
  g.stroke();
}

export function drawBigMap(playerX, playerZ, heading, wanted, missionPos, garagePos, safehousePos) {
  const cv = $('bigmap');
  const g = cv.getContext('2d');
  const W = 760, H = 520;
  const sx = (x) => W / 2 + x * 1.9;
  const sz = (z) => H / 2 + z * 1.05;

  // --- dark elegant base with a soft vignette, not flat blue ---
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#10142e');
  base.addColorStop(0.6, '#0d1126');
  base.addColorStop(1, '#0a0d20');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // faint coordinate grid
  g.strokeStyle = 'rgba(140,160,220,0.10)';
  g.lineWidth = 1;
  for (let x = 40; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = 'rgba(160,180,240,0.5)';
  g.font = '700 10px Arial';
  g.textAlign = 'center';
  'ABCDEFGH'.split('').forEach((c, i) => g.fillText(c, 60 + i * 80, 14));
  '123456'.split('').forEach((c, i) => g.fillText(c, 12, 62 + i * 80));

  // --- district zones: soft tinted regions with dashed borders ---
  // Labels are collected here and drawn AFTER the roads, so text always
  // sits on top of the road strokes (like a real game map).
  const districtLabels = [];
  function zone(path, color, label, lx, lz, sub) {
    g.fillStyle = color;
    g.beginPath();
    path();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.setLineDash([6, 5]);
    g.lineWidth = 1.5;
    g.stroke();
    g.setLineDash([]);
    if (label) districtLabels.push({ label, lx, lz, sub });
  }
  zone(() => { g.moveTo(sx(-135), sz(-215)); g.lineTo(sx(135), sz(-215)); g.lineTo(sx(135), sz(-118)); g.lineTo(sx(-135), sz(-118)); g.closePath(); }, 'rgba(122,92,255,0.16)', 'DOWNTOWN', 0, -155, 'FINANCIAL DISTRICT');
  zone(() => { g.moveTo(sx(-135), sz(-118)); g.lineTo(sx(-16), sz(-118)); g.lineTo(sx(-16), sz(160)); g.lineTo(sx(-135), sz(160)); g.closePath(); }, 'rgba(61,255,122,0.10)', 'WESTSIDE', -78, -32, 'PALM ROW · MARKET');
  zone(() => { g.moveTo(sx(16), sz(-118)); g.lineTo(sx(135), sz(-118)); g.lineTo(sx(135), sz(160)); g.lineTo(sx(16), sz(160)); g.closePath(); }, 'rgba(255,176,32,0.10)', 'EASTSIDE', 78, -32, 'DOCKSIDE · YARDS');
  zone(() => { g.moveTo(sx(-135), sz(160)); g.lineTo(sx(135), sz(160)); g.lineTo(sx(135), sz(215)); g.lineTo(sx(-135), sz(215)); g.closePath(); }, 'rgba(0,229,255,0.10)', '', 0, 0);

  // --- the bay: blue gradient + WIGGLY coastline + sand + an island ---
  const coastY = (x) => 168 + Math.sin(x / 34) * 7 + Math.sin(x / 13 + 2) * 4;
  const bay = g.createLinearGradient(0, sz(165), 0, H);
  bay.addColorStop(0, '#1d6a9e');
  bay.addColorStop(0.4, '#14457e');
  bay.addColorStop(1, '#0a2448');
  g.fillStyle = bay;
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(0, sz(coastY(-200)));
  for (let x = -200; x <= 200; x += 8) g.lineTo(sx(x), sz(coastY(x)));
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  // sand beach along the coast
  g.strokeStyle = 'rgba(220,190,130,0.85)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(0, sz(coastY(-200)));
  for (let x = -200; x <= 200; x += 8) g.lineTo(sx(x), sz(coastY(x)));
  g.stroke();
  // wave lines
  g.strokeStyle = 'rgba(160,220,255,0.25)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    for (let x = -180 + i * 70; x <= -100 + i * 70; x += 6) {
      const y = sz(196 + i * 6) + Math.sin(x / 9) * 2;
      if (x === -180 + i * 70) g.moveTo(sx(x), y); else g.lineTo(sx(x), y);
    }
    g.stroke();
  }
  // Pelican Isle + bridge
  g.fillStyle = '#22355e';
  g.beginPath();
  g.ellipse(sx(88), sz(200), 34, 20, -0.3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.font = '800 10px Arial';
  g.fillText('PELICAN ISLE', sx(88), sz(200) + 4);
  g.strokeStyle = '#8fa3d8';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(sx(52), sz(180));
  g.quadraticCurveTo(sx(70), sz(190), sx(88), sz(196));
  g.stroke();
  g.strokeStyle = '#ffe9a8';
  g.lineWidth = 1.5;
  g.setLineDash([5, 5]);
  g.beginPath();
  g.moveTo(sx(52), sz(180));
  g.quadraticCurveTo(sx(70), sz(190), sx(88), sz(196));
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#b8c8f0';
  g.font = '700 9px Arial';
  g.fillText('PELICAN BRIDGE', sx(70), sz(182));

  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = '900 20px Arial';
  g.textAlign = 'center';
  g.shadowColor = 'rgba(0,0,0,0.8)';
  g.shadowBlur = 6;
  g.fillText('OLD HARBOUR', sx(-45), sz(198));
  g.shadowBlur = 0;

  // --- park + hills ---
  g.fillStyle = 'rgba(46,160,90,0.55)';
  g.beginPath();
  g.ellipse(sx(-82), sz(88), 52, 34, 0.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(30,120,60,0.8)';
  for (const [dx, dy] of [[-18, -8], [6, 4], [20, -12], [-4, 14], [26, 8]]) {
    g.beginPath();
    g.arc(sx(-82 + dx), sz(88 + dy), 5, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.65)';
  g.font = '800 10px Arial';
  g.fillText('VERDANT PARK', sx(-82), sz(78));
  // hills: contour arcs in the north-west
  g.strokeStyle = 'rgba(200,170,120,0.35)';
  g.lineWidth = 1.5;
  for (let r = 12; r <= 36; r += 12) {
    g.beginPath();
    g.arc(sx(-108), sz(-150), r, 0.3, Math.PI * 1.2);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.font = '800 9px Arial';
  g.fillText('CROWN HILLS', sx(-108), sz(-150) - 42);

  // --- harbour piers ---
  g.fillStyle = '#8a6a3a';
  for (let i = 0; i < 4; i++) {
    g.fillRect(sx(-34 + i * 20) - 3, sz(168), 6, 30);
  }
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.font = '800 9px Arial';
  g.fillText('PIER 9', sx(-14), sz(168) + 42);

  // --- roads: highway curve, main avenue, cross streets, minor grid ---
  function road(path, width, color, glow) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.shadowColor = glow || 'rgba(0,0,0,0)';
    g.shadowBlur = glow ? 12 : 0;
    g.beginPath();
    path();
    g.stroke();
    g.shadowBlur = 0;
  }
  // ring highway sweeping around downtown
  road(() => { g.moveTo(sx(-135), sz(-60)); g.quadraticCurveTo(sx(-95), sz(-205), sx(0), sz(-200)); g.quadraticCurveTo(sx(95), sz(-205), sx(135), sz(-60)); }, 16, '#7a8cc8', 'rgba(122,140,200,0.5)');
  // minor streets
  g.strokeStyle = 'rgba(143,163,216,0.45)';
  g.lineWidth = 5;
  for (const z of [-100, -20, 60, 130]) {
    g.beginPath(); g.moveTo(sx(-128), sz(z)); g.lineTo(sx(128), sz(z)); g.stroke();
  }
  for (const x of [-75, -45, 45, 75]) {
    g.beginPath(); g.moveTo(sx(x), sz(-110)); g.lineTo(sx(x), sz(155)); g.stroke();
  }
  // cross streets (thick)
  for (const z of CITY.crossZ) {
    road(() => { g.moveTo(sx(-130), sz(z)); g.lineTo(sx(130), sz(z)); }, 13, '#8fa3d8', 'rgba(143,163,216,0.35)');
  }
  // Lumen Avenue: the main spine, thick + glowing
  road(() => { g.moveTo(sx(0), sz(-208)); g.lineTo(sx(0), sz(168)); }, 24, '#93a7dd', 'rgba(147,167,221,0.6)');
  // marina boulevard along the waterfront
  road(() => { g.moveTo(sx(-128), sz(158)); g.quadraticCurveTo(sx(0), sz(166), sx(128), sz(158)); }, 11, '#8fa3d8', 'rgba(143,163,216,0.35)');
  // centre dashes on the main avenue
  g.strokeStyle = 'rgba(255,233,168,0.8)';
  g.lineWidth = 2;
  g.setLineDash([10, 12]);
  g.beginPath(); g.moveTo(sx(0), sz(-200)); g.lineTo(sx(0), sz(160)); g.stroke();
  g.setLineDash([]);
  // road name labels
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = '800 11px Arial';
  g.save();
  g.translate(sx(-13), sz(0));
  g.rotate(-Math.PI / 2);
  g.fillText('L U M E N   A V E N U E', 0, 0);
  g.restore();
  g.font = '700 9px Arial';
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillText('MARINA BLVD', sx(-58), sz(150));
  g.fillText('DOWNTOWN LOOP', sx(-80), sz(-196));
  g.fillText('PALM ROW', sx(-60), sz(-80));
  g.fillText('DOCKSIDE WAY', sx(60), sz(40));
  // district labels on top of everything drawn so far
  for (const { label, lx, lz, sub } of districtLabels) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = '900 20px Arial';
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.9)';
    g.shadowBlur = 8;
    g.fillText(label, sx(lx), sz(lz));
    g.shadowBlur = 0;
    if (sub) {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.font = '700 10px Arial';
      g.shadowColor = 'rgba(0,0,0,0.9)';
      g.shadowBlur = 4;
      g.fillText(sub, sx(lx), sz(lz) + 15);
      g.shadowBlur = 0;
    }
  }

  // --- landmarks: distinct shapes + colours, never stacked ---
  function starPath(x, y, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  function shieldPath(x, y, r) {
    g.beginPath();
    g.moveTo(x, y - r);
    g.lineTo(x + r * 0.8, y - r * 0.5);
    g.lineTo(x + r * 0.8, y + r * 0.2);
    g.quadraticCurveTo(x + r * 0.8, y + r, x, y + r * 1.2);
    g.quadraticCurveTo(x - r * 0.8, y + r, x - r * 0.8, y + r * 0.2);
    g.lineTo(x - r * 0.8, y - r * 0.5);
    g.closePath();
  }
  function housePath(x, y, r) {
    g.beginPath();
    g.moveTo(x - r, y + r * 0.7);
    g.lineTo(x - r, y - r * 0.2);
    g.lineTo(x, y - r);
    g.lineTo(x + r, y - r * 0.2);
    g.lineTo(x + r, y + r * 0.7);
    g.closePath();
  }
  function icon(x, y, shape, color, label, dy = 20) {
    g.save();
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.fillStyle = color;
    if (shape === 'star') starPath(x, y, 11);
    else if (shape === 'shield') shieldPath(x, y, 10);
    else if (shape === 'house') housePath(x, y, 10);
    else if (shape === 'diamond') { g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 11, y); g.lineTo(x, y + 11); g.lineTo(x - 11, y); g.closePath(); }
    else if (shape === 'cross') { g.fillRect(x - 10, y - 3.5, 20, 7); g.fillRect(x - 3.5, y - 10, 7, 20); }
    else if (shape === 'hex') { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; if (i === 0) g.moveTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); else g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); } g.closePath(); }
    else if (shape === 'tri') { g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 11, y + 8); g.lineTo(x - 11, y + 8); g.closePath(); }
    else { g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); }
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#fff';
    g.font = '800 11px Arial';
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.9)';
    g.shadowBlur = 4;
    g.fillText(label, x, y + dy);
    g.shadowBlur = 0;
  }
  icon(sx(-45), sz(-20), 'circle', '#ff7a3c', 'IRONWORKS GUNS');
  icon(sx(48), sz(-100), 'cross', '#ff4040', 'ST. MARY HOSPITAL');
  icon(sx(-48), sz(-150), 'shield', '#4fc3ff', 'SBPD HQ');
  icon(sx(42), sz(60), 'hex', '#ffb020', 'SALT & SMOKE');
  icon(sx(-105), sz(30), 'tri', '#7a5cff', 'LUMEN CINEMA');
  if (garagePos) icon(sx(garagePos.x), sz(garagePos.z), 'diamond', '#3dff7a', 'GARAGE');
  if (safehousePos) icon(sx(safehousePos.x), sz(safehousePos.z), 'house', '#ff2d95', 'SAFEHOUSE');

  // --- GPS route: glowing line from the player to the objective along the roads ---
  if (missionPos) {
    const px = sx(playerX), py = sz(playerZ);
    const mx = sx(missionPos.x), my = sz(missionPos.z);
    g.save();
    g.strokeStyle = '#3dff7a';
    g.lineWidth = 4;
    g.shadowColor = '#3dff7a';
    g.shadowBlur = 12;
    g.setLineDash([12, 8]);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(sx(0), py); // to Lumen Avenue
    g.lineTo(sx(0), my); // along the avenue
    g.lineTo(mx, my); // to the objective
    g.stroke();
    g.restore();
    // pulsing mission star: glow rings + star
    g.strokeStyle = 'rgba(255,210,62,0.5)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 20, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,210,62,0.25)';
    g.beginPath(); g.arc(mx, my, 28, 0, Math.PI * 2); g.stroke();
    icon(mx, my, 'star', '#ffd23e', 'MISSION', 32);
    g.fillStyle = 'rgba(61,255,122,0.9)';
    g.font = '800 10px Arial';
    const dist = Math.round(Math.hypot(missionPos.x - playerX, missionPos.z - playerZ));
    g.fillText(`${dist}m`, (px + mx) / 2, Math.min(py, my) - 12);
  }

  // --- player: direction cone + arrow ---
  const px = sx(playerX), py = sz(playerZ);
  // forward = (sin h, cos h) in world (x, z); on the map +x is right, +z is down,
  // so the canvas angle of the heading is atan2(cos h, sin h).
  const mapAng = Math.atan2(Math.cos(heading), Math.sin(heading));
  const cone = g.createRadialGradient(px, py, 4, px, py, 44);
  cone.addColorStop(0, 'rgba(255,48,64,0.5)');
  cone.addColorStop(1, 'rgba(255,48,64,0)');
  g.fillStyle = cone;
  g.beginPath();
  g.moveTo(px, py);
  g.arc(px, py, 44, mapAng - 0.5, mapAng + 0.5);
  g.closePath();
  g.fill();
  g.save();
  g.translate(px, py);
  g.rotate(mapAng + Math.PI / 2);
  g.fillStyle = '#ff3040';
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.shadowColor = '#ff3040';
  g.shadowBlur = 10;
  g.beginPath();
  g.moveTo(0, -13);
  g.lineTo(9, 10);
  g.lineTo(0, 4);
  g.lineTo(-9, 10);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();

  // --- compass (top right) ---
  const cx = W - 44, cy = 44;
  g.fillStyle = 'rgba(10,14,32,0.85)';
  g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = '#ff4040';
  g.beginPath();
  g.moveTo(cx, cy - 20);
  g.lineTo(cx + 6, cy + 4);
  g.lineTo(cx - 6, cy + 4);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff';
  g.font = '900 12px Arial';
  g.fillText('N', cx, cy - 26);
  g.font = '700 10px Arial';
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillText('S', cx, cy + 26);
  g.fillText('W', cx - 26, cy + 3);
  g.fillText('E', cx + 26, cy + 3);

  // --- wanted stars on the map (top left) ---
  if (wanted > 0) {
    g.fillStyle = 'rgba(10,14,32,0.85)';
    g.fillRect(14, 14, 150, 30);
    g.strokeStyle = 'rgba(255,64,64,0.6)';
    g.strokeRect(14, 14, 150, 30);
    g.fillStyle = '#ffd23e';
    g.font = '900 16px Arial';
    g.textAlign = 'left';
    g.fillText('★'.repeat(wanted) + '☆'.repeat(5 - wanted), 22, 35);
    g.fillStyle = '#ff6060';
    g.font = '800 10px Arial';
    g.fillText('WANTED', 118, 35);
    g.textAlign = 'center';
  }

  // --- legend (bottom left) ---
  g.fillStyle = 'rgba(10,14,32,0.88)';
  g.fillRect(14, H - 118, 168, 104);
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.strokeRect(14, H - 118, 168, 104);
  g.fillStyle = '#fff';
  g.font = '900 11px Arial';
  g.textAlign = 'left';
  g.fillText('LEGEND', 26, H - 100);
  const rows = [['★', '#ffd23e', 'Mission'], ['◆', '#3dff7a', 'Garage'], ['⌂', '#ff2d95', 'Safehouse'], ['—', '#3dff7a', 'GPS route'], ['●', '#ff7a3c', 'Services']];
  g.font = '700 11px Arial';
  rows.forEach(([sym, col, label], i) => {
    g.fillStyle = col;
    g.fillText(sym, 26, H - 82 + i * 16);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillText(label, 46, H - 82 + i * 16);
  });
  g.textAlign = 'center';
}

let floaterTimer = null;
export function floatText(text) {
  const el = $('floater');
  el.textContent = text;
  el.style.transition = 'none';
  el.style.opacity = '1';
  el.style.transform = 'translate(-50%, -50%) scale(1.15)';
  clearTimeout(floaterTimer);
  floaterTimer = setTimeout(() => {
    el.style.transition = 'opacity 0.5s, transform 0.5s';
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -70%) scale(1)';
  }, 1100);
}

let toastTimer = null;
export function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

export function updateHud(state, policeRows, speedKmh) {
  const job = currentJob(state);
  $('mission-chapter').textContent = job.chapter;
  $('mission-title').textContent = job.title;
  $('mission-desc').textContent = job.desc;
  $('mission-stage-label').textContent = stageLabel(state);
  $('mission-next').textContent = nextObjective(state);
  const segs = $('mission-segments');
  if (segs.children.length !== job.stages.length) {
    segs.innerHTML = job.stages.map((_, i) => `<i class="${i < state.jobStage ? 'on' : ''}"></i>`).join('');
  } else {
    [...segs.children].forEach((el, i) => el.classList.toggle('on', i < state.jobStage));
  }
  const pr = $('police-rows');
  pr.innerHTML = policeRows.map((r) => {
    const cls = r.status === 'RAMMING' ? 'st-ram' : r.status === 'CLOSING IN' ? 'st-close' : r.status === 'OVERHEAD SPOTLIGHT' ? 'st-air' : 'st-pursuit';
    return `<div class="pr"><span>${r.name}</span><span class="st ${cls}">${r.status}</span><span>${r.dist}</span></div>`;
  }).join('') || '<div class="pr"><span>NO UNITS</span><span class="st st-close">CLEAR</span><span>—</span></div>';
  const hh = Math.floor(state.clockMinutes / 60) % 24;
  const mm = Math.floor(state.clockMinutes % 60);
  $('clock').textContent = `DAY ${state.day}  |  ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('money').textContent = fmtMoney(state.money);
  $('stars').textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  $('wanted-label').textContent = state.wanted > 0 ? 'WANTED' : 'CLEAN';
  $('pursuit-label').textContent = state.wanted >= 3 ? 'PURSUIT ACTIVE' : state.wanted > 0 ? 'POLICE ALERTED' : '';
  document.querySelectorAll('.wpn').forEach((el) => {
    const w = Number(el.dataset.w);
    el.classList.toggle('active', w === state.weapon);
    const b = el.querySelector('b');
    if (b) b.textContent = state.ammo[w] === Infinity ? '∞' : state.ammo[w];
  });
  $('health-bar').style.width = `${state.health}%`;
  $('armour-bar').style.width = `${state.armour}%`;
  $('rep-bar').style.width = `${(state.respect % 200) / 2}%`;
  $('rep-text').textContent = `${state.respect} / 1000`;
  $('respect-label').textContent = `RESPECT ${state.respectLevel}`;
  const radio = RADIO[state.radioStation % RADIO.length];
  $('radio-station').textContent = radio.name;
  $('radio-song').textContent = radio.song;
  $('car-name').textContent = state.onFoot ? 'ON FOOT' : state.carName;
  $('cond-bar').style.width = `${state.carCondition}%`;
  $('cond-text').textContent = `${Math.round(state.carCondition)}%`;
  $('speed-num').textContent = String(Math.round(speedKmh));
}

export function districtAt(x, z) {
  if (z > 160) return 'OLD HARBOUR';
  if (z < -150) return 'DOWNTOWN';
  if (x < -25) return 'WESTSIDE';
  if (x > 25) return 'EASTSIDE';
  return 'LUMEN AVENUE';
}

export function setDistrict(name) {
  $('district-pill').textContent = name;
}
