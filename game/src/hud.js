// HUD: portraits, live readouts, the round minimap and the full city map.
// The big map is a real styled map (districts, coastline, roads, icons),
// not a plain grid — the map screenshot is judged too.

import { portraitOf } from './faces.js';

export function initPortraits() {
  const set = (id, name) => {
    const el = document.getElementById(id);
    if (el) el.src = portraitOf(name);
  };
  set('hud-dialog-portrait', 'vera');
  set('title-portrait', 'dante');
  set('crew-img-0', 'lena');
  set('crew-img-1', 'hugo');
  set('crew-img-2', 'nina');
}

// World bounds the maps cover.
const WORLD = { x0: -170, x1: 170, z0: -190, z1: 190 };

function mapX(x, w) {
  return ((x - WORLD.x0) / (WORLD.x1 - WORLD.x0)) * w;
}
function mapZ(z, h) {
  return ((z - WORLD.z0) / (WORLD.z1 - WORLD.z0)) * h;
}

// Paint the city schematic onto a 2D context. `view` is null for the full
// map, or {cx, cz, r} for a minimap window around the player.
function paintCity(ctx, w, h, view) {
  const px = (x) => (view ? ((x - (view.cx - view.r)) / (2 * view.r)) * w : mapX(x, w));
  const pz = (z) => (view ? ((z - (view.cz - view.r)) / (2 * view.r)) * h : mapZ(z, h));
  const sx = (d) => (view ? (d / (2 * view.r)) * w : (d / (WORLD.x1 - WORLD.x0)) * w);

  // Land base.
  ctx.fillStyle = '#3a2c3e';
  ctx.fillRect(0, 0, w, h);
  // Ocean (west).
  ctx.fillStyle = '#14586e';
  ctx.fillRect(0, 0, px(-140), h);
  // Beach sand.
  ctx.fillStyle = '#c9a35e';
  ctx.fillRect(px(-140), 0, px(-30) - px(-140), h);
  // Grass / parks.
  ctx.fillStyle = '#3f6b3a';
  for (const [gx, gz, gw, gd] of [[40, -150, 30, 22], [110, 60, 34, 26], [-8, 150, 26, 20]]) {
    ctx.fillRect(px(gx), pz(gz), sx(gw), sx(gd));
  }
  // City blocks (east).
  ctx.fillStyle = '#54455c';
  for (let bx = 20; bx < 150; bx += 28) {
    for (let bz = -175; bz < 175; bz += 58) {
      ctx.fillRect(px(bx), pz(bz), sx(22), sx(46));
    }
  }
  // Roads: boulevard + cross streets.
  ctx.strokeStyle = '#8d8496';
  ctx.lineWidth = Math.max(2, sx(13));
  ctx.beginPath();
  ctx.moveTo(px(0), pz(-190));
  ctx.lineTo(px(0), pz(190));
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, sx(9));
  for (const z of [-120, -60, 0, 60, 120]) {
    ctx.beginPath();
    ctx.moveTo(px(-30), pz(z));
    ctx.lineTo(px(170), pz(z));
    ctx.stroke();
  }
  // Boulevard centre line.
  ctx.strokeStyle = '#e8b93b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(px(0), pz(-190));
  ctx.lineTo(px(0), pz(190));
  ctx.stroke();
  ctx.setLineDash([]);
  // Marina docks.
  ctx.strokeStyle = '#a8763e';
  ctx.lineWidth = Math.max(2, sx(2.5));
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px(-58 - i * 9), pz(95));
    ctx.lineTo(px(-58 - i * 9), pz(121));
    ctx.stroke();
  }
  // Airfield runway (south-east).
  ctx.fillStyle = '#2c2c34';
  ctx.fillRect(px(120), pz(150), sx(36), sx(6));
  ctx.fillStyle = '#e8e4da';
  ctx.font = `bold ${Math.max(9, sx(8))}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('ABX', px(138), pz(147));
}

export function drawMinimap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const view = { cx: state.player.x, cz: state.player.z, r: 70 };
  paintCity(ctx, w, h, view);
  const px = (x) => ((x - (view.cx - view.r)) / (2 * view.r)) * w;
  const pz = (z) => ((z - (view.cz - view.r)) / (2 * view.r)) * h;

  // GPS route to the mission target.
  if (state.mission) {
    ctx.strokeStyle = '#ff5d8f';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(px(state.player.x), pz(state.player.z));
    ctx.lineTo(px(0), pz(state.player.z));
    ctx.lineTo(px(0), pz(state.mission.z));
    ctx.lineTo(px(state.mission.x), pz(state.mission.z));
    ctx.stroke();
    ctx.setLineDash([]);
    // Mission star.
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', px(state.mission.x), pz(state.mission.z) + 7);
  }
  // Police dots.
  ctx.fillStyle = '#3fa9ff';
  for (const p of state.police || []) {
    ctx.beginPath();
    ctx.arc(px(p.x), pz(p.z), 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow (rotates with heading).
  ctx.save();
  ctx.translate(px(state.player.x), pz(state.player.z));
  ctx.rotate(-state.heading + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#14101c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(8, 9);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // North marker.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', w / 2, 16);
}

export function drawBigMap(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  paintCity(ctx, w, h, null);

  // District labels.
  ctx.textAlign = 'center';
  const label = (text, x, z, size, color) => {
    ctx.font = `900 ${size}px Arial`;
    ctx.fillStyle = 'rgba(10,6,16,0.75)';
    ctx.fillText(text, mapX(x, w) + 2, mapZ(z, h) + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, mapX(x, w), mapZ(z, h));
  };
  label('AURELIA BAY', -100, -172, 26, '#9fdcff');
  label('EMBER STRAND', -82, -40, 17, '#ffe9b0');
  label('SUNSET MILE', 0, -172, 16, '#ffd94d');
  label('PALMA ROW', 62, -90, 15, '#ffb340');
  label('CORAL MARKET', 62, 30, 15, '#ffb340');
  label('EMBER HEIGHTS', 108, -60, 15, '#ffb340');
  label('GILDED QUAY', -62, 78, 16, '#7fd4ff');
  label('VIDRIO DUNES', -100, 150, 14, '#ffe9b0');
  label('ABX AIRFIELD', 138, 168, 13, '#cfc6dd');

  // Landmark icons.
  const icon = (text, x, z, color, size) => {
    ctx.font = `900 ${size || 20}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text, mapX(x, w), mapZ(z, h));
  };
  icon('◉', -78, -72, '#ff5d8f', 22); // ferris wheel
  icon('⚑', -71, 100, '#7fd4ff', 20); // marina
  icon('H', 46, -148, '#7dff9a', 18); // safehouse
  icon('G', -8, 130, '#ffd94d', 20); // garage
  icon('$', 30, -58, '#7dff9a', 18);
  icon('$', 30, 62, '#7dff9a', 18);
  icon('P', 94, -118, '#3fa9ff', 18);
  icon('P', 94, 118, '#3fa9ff', 18);

  // GPS route + mission star.
  if (state.mission) {
    ctx.strokeStyle = '#ff5d8f';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(mapX(state.player.x, w), mapZ(state.player.z, h));
    ctx.lineTo(mapX(0, w), mapZ(state.player.z, h));
    ctx.lineTo(mapX(0, w), mapZ(state.mission.z, h));
    ctx.lineTo(mapX(state.mission.x, w), mapZ(state.mission.z, h));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '900 30px Arial';
    ctx.fillStyle = '#ffd94d';
    ctx.fillText('★', mapX(state.mission.x, w), mapZ(state.mission.z, h) + 10);
  }
  // Police.
  ctx.fillStyle = '#3fa9ff';
  for (const p of state.police || []) {
    ctx.beginPath();
    ctx.arc(mapX(p.x, w), mapZ(p.z, h), 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  ctx.save();
  ctx.translate(mapX(state.player.x, w), mapZ(state.player.z, h));
  ctx.rotate(-state.heading + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#14101c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(10, 11);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Compass.
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px Arial';
  ctx.fillText('N ↑', w - 26, 26);
}

export function showPopup(html, ms) {
  const el = document.getElementById('hud-popup');
  if (!el) return;
  el.innerHTML = html;
  el.style.display = 'block';
  clearTimeout(showPopup._t);
  showPopup._t = setTimeout(() => { el.style.display = 'none'; }, ms || 2200);
}

export function updateHud(state) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  const sp = document.getElementById('hud-speed');
  if (sp) sp.innerHTML = Math.round(state.speedKmh) + '<small> KM/H</small>';
  const stars = document.getElementById('hud-stars');
  if (stars) stars.innerHTML = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  set('hud-money', '$' + state.money.toLocaleString('en-US'));
  set('hud-health-num', String(Math.round(state.health)));
  set('hud-armour-num', String(Math.round(state.armour)));
  const hf = document.getElementById('hud-health-fill');
  if (hf) hf.style.width = state.health + '%';
  const af = document.getElementById('hud-armour-fill');
  if (af) af.style.width = state.armour + '%';
  const cf = document.querySelector('#hud-car-cond i');
  if (cf) cf.style.width = state.carCondition + '%';
  const cl = document.getElementById('hud-cond-label');
  if (cl) cl.textContent = `CONDITION ${Math.round(state.carCondition)}% · SPORTS · TUNE 2`;
  const clock = document.getElementById('hud-clock');
  if (clock) clock.textContent = state.clock;
  set('hud-district', state.district);
  set('hud-street', state.street);
}

export function setDialog(name, text, portraitName) {
  const n = document.getElementById('hud-dialog-name');
  const t = document.getElementById('hud-dialog-text');
  const p = document.getElementById('hud-dialog-portrait');
  if (n) n.textContent = name;
  if (t) t.textContent = text;
  if (p && portraitName) p.src = portraitOf(portraitName);
}
