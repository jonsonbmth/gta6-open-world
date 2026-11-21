// HUD: mission panel, police dispatch, weapon slots, crew cards, money and
// wanted stars, dialog with a drawn portrait, minimap with GPS route,
// speedometer, radio, and the DRIFT / NEAR MISS popup.
import { GAME } from './config.js';
import { drawPortrait } from './textures.js';

const $ = (s) => document.querySelector(s);

const WEAPONS = [
  { name: 'FISTS', ammo: '∞', icon: '◯', active: false },
  { name: 'P9', ammo: '84', icon: '▟', active: false },
  { name: 'VIPER SMG', ammo: '120', icon: '▛', active: true },
  { name: '12G SHOTGUN', ammo: '18', icon: '▟', active: false },
  { name: 'AR-8', ammo: 'LOCKED', icon: '▛', active: false },
  { name: 'RPG', ammo: 'LOCKED', icon: '▸', active: false },
];

const TACTIC_CLASS = {
  RAMMING: 'red', PURSUIT: 'blue', PURSUE: 'blue', FLANKING: 'amber',
  SPOTLIGHT: 'cyan', ROADBLOCK: 'purple', FIRING: 'red', 'BOXING IN': 'amber',
};

export function buildHUD() {
  // mission panel
  const m = GAME.mission;
  $('#mission-panel').innerHTML = `
    <div class="m-job">${m.job} · ${m.name}</div>
    <div class="m-obj">${m.objective}</div>
    <div class="m-row"><span class="m-stage">${m.stage}</span><span class="m-timer">${m.timer}</span></div>
    <div class="m-bar"><div class="m-fill" style="width:72%"></div></div>
    <div class="m-next"><span>NEXT</span> ${m.next}</div>`;
  // dispatch
  const d = $('#dispatch-rows');
  d.innerHTML = GAME.dispatch.map((u) => `
    <div class="d-row"><span class="d-unit">${u.unit}</span>
    <span class="d-tac ${TACTIC_CLASS[u.tactic] || ''}">${u.tactic}</span>
    <span class="d-dist">${u.dist} m</span></div>`).join('');
  $('#dispatch-head').innerHTML = `<span>EMBER BAY PD DISPATCH</span><span>${GAME.police.units} UNITS · ${GAME.police.code}</span>`;
  // weapons
  $('#weapons').innerHTML = WEAPONS.map((w) => `
    <div class="w-slot${w.active ? ' active' : ''}">
      <div class="w-icon">${w.icon}</div><div class="w-name">${w.name}</div>
      <div class="w-ammo">${w.ammo}</div></div>`).join('');
  // crew cards with drawn portraits
  const crewEl = $('#crew-cards');
  crewEl.innerHTML = GAME.crew.map((c, i) => `
    <div class="crew-card"><canvas class="crew-face" width="64" height="64" data-i="${i}"></canvas>
    <div><div class="crew-act">${c.key} · ${c.action}</div>
    <div class="crew-name">${c.name} · ${c.role}</div></div></div>`).join('');
  GAME.crew.forEach((c, i) => {
    const el = crewEl.querySelector(`[data-i="${i}"]`);
    drawPortrait(el, {
      skin: '#' + c.skin.toString(16).padStart(6, '0'),
      hair: '#' + c.hair.toString(16).padStart(6, '0'),
      hairStyle: c.hairStyle,
      shirt: '#' + c.shirt.toString(16).padStart(6, '0'),
      bg: '#2c2140', bg2: '#171022',
    });
  });
  // money + stars
  $('#money').textContent = '$' + GAME.money.toLocaleString('en-US');
  $('#stars').innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<span class="star${i < GAME.stars ? ' on' : ''}">★</span>`).join('');
  // dialog with the fixer portrait
  $('#dialog-text').textContent = GAME.dialog;
  $('#dialog-name').textContent = `${GAME.fixer.name} · ${GAME.fixer.role} · ${GAME.fixer.district}`;
  drawPortrait($('#dialog-face'), {
    skin: '#c68642', hair: '#9a9a9a', hairStyle: 'grey',
    shirt: '#3a5a7a', bg: '#2c2140', bg2: '#171022',
  });
  // district / health / armour / rep
  $('#district').textContent = GAME.district;
  $('#street').textContent = GAME.street;
  $('#car-name').textContent = GAME.car.name;
  $('#car-cond').style.width = GAME.car.condition + '%';
  $('#cond-pct').textContent = GAME.car.condition + '%';
  $('#rep-line').textContent = `REP ${GAME.hero.rep} · ${GAME.hero.role} — ${GAME.hero.repXp} / ${GAME.hero.repMax} XP`;
  $('#rep-fill').style.width = Math.round((GAME.hero.repXp / GAME.hero.repMax) * 100) + '%';
  setRadio(0);
}

export function setSpeed(kmh) {
  $('#speed').textContent = String(Math.round(kmh));
}

let radioIdx = 0;
export function setRadio(i) {
  radioIdx = ((i % GAME.radio.length) + GAME.radio.length) % GAME.radio.length;
  const r = GAME.radio[radioIdx];
  $('#radio').textContent = `♪ ${r.station} — ${r.song}`;
  return radioIdx;
}
export function cycleRadio() { return setRadio(radioIdx + 1); }

export function showPopup(html) {
  const p = $('#popup');
  p.innerHTML = html;
  p.classList.add('show');
}
export function hidePopup() { $('#popup').classList.remove('show'); }

// Big city map for the pause menu: districts, roads, water, the GPS route
// to the garage, and the player marker.
export function drawBigMap(ctx, heroPos) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = '#0e1a24';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#14506e';
  ctx.fillRect(0, H * 0.7, W, H * 0.3);
  ctx.fillStyle = '#1d2f3d';
  for (let x = 0; x < 10; x++) {
    for (let z = 0; z < 7; z++) {
      if (z === 3) continue;
      ctx.fillRect(20 + x * (W - 40) / 10 + 3, 20 + z * (H - 40) / 7 + 3, (W - 40) / 10 - 6, (H - 40) / 7 - 6);
    }
  }
  ctx.strokeStyle = '#3a4a58';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke();
  ctx.lineWidth = 6;
  [0.15, 0.32, 0.5, 0.68, 0.85].forEach((fx) => {
    ctx.beginPath(); ctx.moveTo(W * fx, 0); ctx.lineTo(W * fx, H); ctx.stroke();
  });
  // GPS route to the garage
  const toMap = (x, z) => [W / 2 + (x / 160) * W, H / 2 + (z / 160) * H];
  const ROUTE = [[heroPos.x, heroPos.z], [45, 0], [95, 0]];
  ctx.strokeStyle = '#37e08b';
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ROUTE.forEach(([x, z], i) => {
    const [mx, mz] = toMap(x, z);
    i ? ctx.lineTo(mx, mz) : ctx.moveTo(mx, mz);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  const [gx, gz] = toMap(95, 0);
  ctx.fillStyle = '#37e08b';
  ctx.beginPath(); ctx.arc(gx, gz, 10, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('GARAGE', gx - 34, gz - 16);
  // districts
  ctx.fillStyle = '#9fb6c6';
  ctx.font = 'bold 18px Arial';
  GAME.districts.forEach((d, i) => {
    ctx.fillText(d.toUpperCase(), 24 + (i % 3) * (W / 3), 44 + Math.floor(i / 3) * (H / 2.4));
  });
  // player
  const [px, pz] = toMap(heroPos.x, heroPos.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, pz, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#37e08b';
  ctx.beginPath(); ctx.arc(px, pz, 5, 0, 7); ctx.fill();
}
export function drawMinimap(ctx, player, cruisers, route) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const toMap = (x, z) => [W / 2 + (x / 160) * W, H / 2 + (z / 160) * H];
  ctx.fillStyle = '#101c26';
  ctx.fillRect(0, 0, W, H);
  // water (south)
  ctx.fillStyle = '#14506e';
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  // blocks
  ctx.fillStyle = '#1d2f3d';
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      if (z === 4) continue;
      ctx.fillRect(8 + x * (W - 16) / 8 + 2, 8 + z * (H - 16) / 8 + 2, (W - 16) / 8 - 4, (H - 16) / 8 - 4);
    }
  }
  // roads
  ctx.strokeStyle = '#3a4a58';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.lineWidth = 3;
  [0.2, 0.36, 0.5, 0.64, 0.8].forEach((fx) => {
    ctx.beginPath(); ctx.moveTo(W * fx, 0); ctx.lineTo(W * fx, H); ctx.stroke();
  });
  // GPS route (dashed green)
  if (route && route.length > 1) {
    ctx.strokeStyle = '#37e08b';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    route.forEach(([x, z], i) => {
      const [mx, mz] = toMap(x, z);
      i ? ctx.lineTo(mx, mz) : ctx.moveTo(mx, mz);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const [ex, ez] = toMap(route[route.length - 1][0], route[route.length - 1][1]);
    ctx.fillStyle = '#37e08b';
    ctx.beginPath(); ctx.arc(ex, ez, 5, 0, 7); ctx.fill();
  }
  // police dots
  ctx.fillStyle = '#4da3ff';
  (cruisers || []).forEach((c) => {
    const [mx, mz] = toMap(c.position.x, c.position.z);
    ctx.beginPath(); ctx.arc(mx, mz, 3.5, 0, 7); ctx.fill();
  });
  // player arrow
  const [px, pz] = toMap(player.x, player.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(-player.yaw + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
