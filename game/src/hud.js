// HUD: every 2D interface element — mission card, dispatch board, weapons,
// crew cards, circular minimap with GPS route, health/armour/reputation,
// speed, dialogue, score popups, the start screen and the pause menu with
// its 9-district map. All DOM + canvas 2D; the 3D scene stays in main.js.

import { el, formatMoney, formatClock } from './util.js';
import { DISTRICTS, AVENUES, STREETS } from './city.js';
import { CREW } from './missions.js';

const WEAPONS = [
  { key: '1', name: 'FISTS', ammo: '\u221e' },
  { key: '2', name: 'P9', ammo: 96 },
  { key: '3', name: 'VIPER SMG', ammo: 140 },
  { key: '4', name: '12G SHOTGUN', ammo: 24 },
  { key: '5', name: 'AR-8', ammo: 'LOCKED' },
  { key: '6', name: 'RPG', ammo: 'LOCKED' },
];

const RADIO_STATIONS = [
  'SOL FM 101.3 — "Blue Skies"',
  'SOL FM 101.3 — "Midnight Palms"',
  'BAY FM 98.6 — "Neon Tideline"',
  'PIER FM 104.1 — "Golden Hour"',
];

function starsHtml(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < n ? '\u2605' : '\u2606';
  return s;
}

export function buildHUD(portraits) {
  const hud = el('hud');

  hud.innerHTML = `
    <div id="mission-card" class="panel">
      <div id="mission-job" class="mission-job"></div>
      <div id="mission-title" class="mission-title"></div>
      <div id="mission-brief" class="mission-brief"></div>
      <div class="mission-progress"><div id="mission-bar"></div></div>
      <div id="mission-stage" class="mission-stage"></div>
      <div id="mission-next" class="mission-next"></div>
    </div>
    <div id="money-bar">
      <div id="money" class="money"></div>
      <div id="stars" class="stars"></div>
      <div id="clock" class="clock"></div>
      <div id="in-sight" class="in-sight">IN SIGHT · AIR-3</div>
    </div>
    <div id="weapons" class="panel"></div>
    <div id="dispatch" class="panel">
      <div class="dispatch-head"><span>ABPD DISPATCH</span><span id="dispatch-count"></span></div>
      <div id="dispatch-rows"></div>
      <div id="dispatch-foot" class="dispatch-foot"></div>
    </div>
    <div id="vera-card" class="panel crew-card">
      <img id="vera-img" alt="">
      <div><div class="crew-name">VERA "THE VELVET" CASTILLO</div><div id="vera-quote" class="crew-quote"></div></div>
    </div>
    <div id="crew-cards"></div>
    <div id="minimap-wrap">
      <canvas id="minimap" width="220" height="220"></canvas>
      <div id="district-label" class="panel">
        <div id="district-name" class="district-name"></div>
        <div id="district-street" class="district-street"></div>
        <div id="district-rep" class="district-rep"></div>
        <div class="district-bar"><div id="district-bar-fill"></div></div>
      </div>
    </div>
    <div id="stats">
      <div class="stat-row"><span>HEALTH</span><div class="stat-bar"><div id="health-fill" class="fill health"></div></div><b id="health-num"></b></div>
      <div class="stat-row"><span>ARMOUR</span><div class="stat-bar"><div id="armour-fill" class="fill armour"></div></div><b id="armour-num"></b></div>
      <div class="stat-row"><span>REP</span><div class="stat-bar"><div id="rep-fill" class="fill rep"></div></div><b id="rep-num"></b></div>
      <div id="rep-level" class="rep-level"></div>
      <div id="speed" class="speed"></div>
      <div id="car-name" class="car-name"></div>
      <div id="car-condition" class="car-condition"></div>
      <div id="radio" class="radio"></div>
    </div>
    <div id="dialogue" class="panel">
      <img id="dialogue-img" alt="">
      <div><div id="dialogue-from" class="dialogue-from"></div><div id="dialogue-text" class="dialogue-text"></div></div>
    </div>
    <div id="popup"></div>
    <div id="prompt" class="prompt"></div>
    <div id="hint" class="hint"></div>
    <div id="vignette"></div>
  `;

  el('vera-img').src = portraits.vera;
  el('dialogue-img').src = portraits.vera;

  // Weapons list.
  el('weapons').innerHTML = WEAPONS.map((w, i) => `
    <div class="weapon ${i === 1 ? 'selected' : ''}"><span class="wkey">${w.key}</span><span class="wname">${w.name}</span><span class="wammo">${w.ammo}</span></div>
  `).join('');

  // Crew ability cards.
  el('crew-cards').innerHTML = CREW.map((c) => `
    <div class="panel crew-card" id="crew-${c.key}">
      <img src="${portraits[c.key === 'Z' ? 'lena' : c.key === 'X' ? 'hugo' : 'nina']}" alt="">
      <div class="crew-body">
        <div class="crew-name">${c.ability}</div>
        <div class="crew-desc">${c.name.split(' ')[0]} · ${c.role} — ${c.desc}</div>
      </div>
      <span class="crew-key">${c.key}</span>
      <span class="crew-ready" id="crew-ready-${c.key}">READY</span>
    </div>
  `).join('');

  // Start screen.
  const start = document.createElement('div');
  start.id = 'start-screen';
  start.innerHTML = `
    <div class="title-block">
      <div class="game-title">AURELIA BAY</div>
      <div class="game-sub">ISLE OF EMBERS · AN OPEN-WORLD CRIME STORY</div>
    </div>
    <div class="start-menu">
      <button class="menu-item selected" data-action="continue">CONTINUE</button>
      <button class="menu-item" data-action="new">NEW GAME</button>
      <button class="menu-item" data-action="load">LOAD GAME</button>
      <button class="menu-item" data-action="settings">SETTINGS</button>
    </div>
    <div class="start-saves">
      <div class="save-slot"><b>SLOT 1 · ACT III — THE EMBER RUN</b><span>66.1% complete · 7/8 jobs · Sunset Mile · $27,850 · 13:42</span></div>
      <div class="save-slot"><b>SLOT 2 · ACT II — MARKET SQUEEZE</b><span>32.8% complete · 3/8 jobs · Coral Market · $12,650 · 18:23</span></div>
      <div class="save-slot empty"><b>SLOT 3 · EMPTY</b><span>Save at the Ember Garage or from the pause menu</span></div>
    </div>
    <div class="start-foot">An original open-world crime story on an island that never existed · Keyboard &amp; mouse</div>
  `;
  document.body.appendChild(start);

  // Pause menu.
  const pause = document.createElement('div');
  pause.id = 'pause-menu';
  pause.classList.add('hidden');
  pause.innerHTML = `
    <div class="pause-head"><span>AURELIA BAY · <b>PAUSED</b></span><span id="pause-clock"></span></div>
    <div class="pause-tabs">
      <button class="pause-tab selected" data-tab="map">MAP</button>
      <button class="pause-tab" data-tab="story">STORY</button>
      <button class="pause-tab" data-tab="stats">STATS</button>
      <button class="pause-tab" data-tab="crew">CREW</button>
      <button class="pause-tab" data-tab="save">SAVE</button>
    </div>
    <div class="pause-body">
      <div class="pause-map-col">
        <canvas id="pause-map" width="640" height="460"></canvas>
        <div class="pause-map-foot">Click the map to set a waypoint · ESC resume</div>
      </div>
      <div class="pause-side">
        <div class="pause-side-title">CITY MAP</div>
        <div class="pause-side-text">Nine districts, one coastline. The yellow line is your GPS route to the Ember Garage — follow the roads, not the crow.</div>
        <div class="legend">
          <div><span class="dot yellow"></span>Mission target</div>
          <div><span class="dot white"></span>You</div>
          <div><span class="dot red"></span>Police unit</div>
          <div><span class="dot orange"></span>Police helicopter</div>
          <div><span class="dot green"></span>Safehouse</div>
          <div><span class="dot coral"></span>Job start</div>
        </div>
        <div class="pause-tip">TIP: cut through Vidrio Dunes to shake a tail — the alleys are too tight for cruisers.</div>
        <div class="pause-stats">
          <div><b>66.1%</b><span>COMPLETE</span></div>
          <div><b>7/8</b><span>JOBS DONE</span></div>
          <div><b>41</b><span>CARS STOLEN</span></div>
          <div><b>12</b><span>COPS ESCAPED</span></div>
        </div>
      </div>
    </div>
    <button id="resume-btn" class="resume-btn">RESUME</button>
  `;
  document.body.appendChild(pause);

  const minimap = el('minimap');
  const mmCtx = minimap.getContext('2d');
  const pauseMap = el('pause-map');
  const pmCtx = pauseMap.getContext('2d');

  function worldToMini(x, z, w, h = w) {
    return [((x + 180) / 360) * w, ((z + 180) / 360) * h];
  }

  function drawMinimap(state) {
    const s = 220;
    mmCtx.clearRect(0, 0, s, s);
    mmCtx.save();
    mmCtx.beginPath();
    mmCtx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    mmCtx.clip();
    // Sea + land.
    mmCtx.fillStyle = '#2e7ba6';
    mmCtx.fillRect(0, 0, s, s);
    mmCtx.fillStyle = '#4a7a52';
    mmCtx.fillRect(60, 0, s - 60, s);
    // Sand strip.
    mmCtx.fillStyle = '#e8d5a8';
    mmCtx.fillRect(52, 0, 10, s);
    // Roads.
    mmCtx.strokeStyle = '#d8d8d8';
    mmCtx.lineWidth = 3;
    for (const ax of AVENUES) {
      const [mx] = worldToMini(ax, 0, s);
      mmCtx.beginPath(); mmCtx.moveTo(mx, 0); mmCtx.lineTo(mx, s); mmCtx.stroke();
    }
    for (const sz of STREETS) {
      const [, mz] = worldToMini(0, sz, s);
      mmCtx.beginPath(); mmCtx.moveTo(0, mz); mmCtx.lineTo(s, mz); mmCtx.stroke();
    }
    // GPS route: player to the Ember Garage (0, -120).
    const [px, pz] = worldToMini(state.player.x, state.player.z, s);
    const [gx, gz] = worldToMini(0, -120, s);
    mmCtx.strokeStyle = '#ffd21f';
    mmCtx.lineWidth = 3;
    mmCtx.setLineDash([6, 4]);
    mmCtx.beginPath();
    mmCtx.moveTo(px, pz);
    mmCtx.lineTo(px, gz);
    mmCtx.lineTo(gx, gz);
    mmCtx.stroke();
    mmCtx.setLineDash([]);
    // Mission target.
    mmCtx.fillStyle = '#ffd21f';
    mmCtx.beginPath(); mmCtx.arc(gx, gz, 5, 0, Math.PI * 2); mmCtx.fill();
    // Police blips.
    mmCtx.fillStyle = '#ff3b30';
    for (const c of state.police) {
      const [cx, cz] = worldToMini(c.x, c.z, s);
      mmCtx.beginPath(); mmCtx.arc(cx, cz, 3.5, 0, Math.PI * 2); mmCtx.fill();
    }
    // Heli blip.
    if (state.heli) {
      const [hx, hz] = worldToMini(state.heli.x, state.heli.z, s);
      mmCtx.fillStyle = '#ff9500';
      mmCtx.beginPath(); mmCtx.arc(hx, hz, 4, 0, Math.PI * 2); mmCtx.fill();
    }
    // Player arrow.
    mmCtx.save();
    mmCtx.translate(px, pz);
    mmCtx.rotate(state.heading);
    mmCtx.fillStyle = '#ffffff';
    mmCtx.strokeStyle = '#111111';
    mmCtx.lineWidth = 1.5;
    mmCtx.beginPath();
    mmCtx.moveTo(0, -9);
    mmCtx.lineTo(6, 7);
    mmCtx.lineTo(-6, 7);
    mmCtx.closePath();
    mmCtx.fill();
    mmCtx.stroke();
    mmCtx.restore();
    mmCtx.restore();
    // Rim + north marker.
    mmCtx.strokeStyle = '#f2f2ee';
    mmCtx.lineWidth = 3;
    mmCtx.beginPath();
    mmCtx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    mmCtx.stroke();
    mmCtx.fillStyle = '#ffffff';
    mmCtx.font = 'bold 13px Arial';
    mmCtx.textAlign = 'center';
    mmCtx.fillText('N', s / 2, 16);
  }

  function drawPauseMap(state) {
    const w = 640;
    const h = 460;
    pmCtx.clearRect(0, 0, w, h);
    // Ocean.
    pmCtx.fillStyle = '#2e8fb8';
    pmCtx.fillRect(0, 0, w, h);
    // Districts as colored blocks on the land.
    const landX = 120;
    for (const d of DISTRICTS) {
      const [dx, dz] = worldToMini(d.x, d.z, w, h);
      const [dx2] = worldToMini(d.x + 60, d.z, w, h);
      pmCtx.fillStyle = d.color;
      pmCtx.globalAlpha = 0.85;
      pmCtx.fillRect(Math.max(landX, dx - 30), dz - 34, Math.max(60, dx2 - dx - 10), 68);
      pmCtx.globalAlpha = 1;
      pmCtx.fillStyle = '#ffffff';
      pmCtx.font = 'bold 13px Arial';
      pmCtx.textAlign = 'center';
      pmCtx.fillText(d.name.toUpperCase(), Math.max(landX + 40, dx), dz - 40);
    }
    // Roads.
    pmCtx.strokeStyle = '#f2f2ee';
    pmCtx.lineWidth = 2;
    for (const ax of AVENUES) {
      const [mx] = worldToMini(ax, 0, w, h);
      pmCtx.beginPath(); pmCtx.moveTo(mx, 0); pmCtx.lineTo(mx, h); pmCtx.stroke();
    }
    for (const sz of STREETS) {
      const [, mz] = worldToMini(0, sz, w, h);
      pmCtx.beginPath(); pmCtx.moveTo(landX, mz); pmCtx.lineTo(w, mz); pmCtx.stroke();
    }
    // GPS route.
    const [px, pz] = worldToMini(state.player.x, state.player.z, w, h);
    const [gx, gz] = worldToMini(0, -120, w, h);
    pmCtx.strokeStyle = '#ffd21f';
    pmCtx.lineWidth = 4;
    pmCtx.beginPath();
    pmCtx.moveTo(px, pz);
    pmCtx.lineTo(px, gz);
    pmCtx.lineTo(gx, gz);
    pmCtx.stroke();
    // Markers.
    const marker = (x, z, color, label) => {
      const [mx, mz] = worldToMini(x, z, w, h);
      pmCtx.fillStyle = color;
      pmCtx.beginPath(); pmCtx.arc(mx, mz, 8, 0, Math.PI * 2); pmCtx.fill();
      pmCtx.fillStyle = '#111111';
      pmCtx.font = 'bold 11px Arial';
      pmCtx.textAlign = 'center';
      pmCtx.fillText(label, mx, mz + 4);
    };
    marker(0, -120, '#ffd21f', 'G');
    marker(state.player.x, state.player.z, '#ffffff', '');
    marker(-60, 60, '#7fb069', 'H');
    marker(60, -40, '#ff8a7a', 'J');
    marker(-120, -40, '#ff8a7a', 'J');
    if (state.heli) marker(state.heli.x, state.heli.z, '#ff9500', '');
  }

  let lastPopup = 0;
  // Main HUD panels that must hide behind the pause menu, or their text
  // bleeds through the overlay and collides with the pause title.
  const HUD_PANELS = ['mission-card', 'money-bar', 'weapons', 'dispatch', 'vera-card',
    'crew-cards', 'minimap-wrap', 'stats', 'dialogue', 'hint', 'prompt', 'popup'];
  return {
    drawMinimap,
    drawPauseMap,
    showStart() {
      el('start-screen').classList.remove('hidden');
    },
    hideStart() {
      el('start-screen').classList.add('hidden');
    },
    showPause() {
      el('pause-menu').classList.remove('hidden');
      for (const id of HUD_PANELS) el(id).classList.add('hidden');
    },
    hidePause() {
      el('pause-menu').classList.add('hidden');
      for (const id of HUD_PANELS) el(id).classList.remove('hidden');
    },
    isPauseVisible() {
      return !el('pause-menu').classList.contains('hidden');
    },
    popup(main, sub) {
      const now = performance.now();
      if (now - lastPopup < 900) return;
      lastPopup = now;
      const p = el('popup');
      p.innerHTML = `<div class="popup-main">${main}</div><div class="popup-sub">${sub}</div>`;
      p.classList.remove('pop');
      void p.offsetWidth;
      p.classList.add('pop');
    },
    setPrompt(text) {
      el('prompt').textContent = text || '';
      el('prompt').style.display = text ? 'block' : 'none';
    },
    setDialogue(from, text, img) {
      el('dialogue-from').textContent = from;
      el('dialogue-text').textContent = text;
      if (img) el('dialogue-img').src = img;
    },
    setRadio(index) {
      el('radio').textContent = '\u266A ' + RADIO_STATIONS[index % RADIO_STATIONS.length];
    },
    update(s) {
      const job = s.job;
      el('mission-job').textContent = `JOB ${job.id}/8 · ${job.name}`;
      el('mission-title').textContent = s.stageTitle;
      el('mission-brief').textContent = job.brief;
      el('mission-bar').style.width = `${((s.stageIndex + 1) / job.stages.length) * 100}%`;
      const mm = String(Math.floor(s.timer / 60)).padStart(2, '0');
      const ss = String(Math.floor(s.timer % 60)).padStart(2, '0');
      el('mission-stage').textContent = `STAGE ${s.stageIndex + 1}/${job.stages.length} · ${mm}:${ss} — ${s.stage}`;
      el('mission-next').textContent = 'NEXT ' + (job.stages[s.stageIndex + 1] || 'Finish the job');
      el('money').textContent = formatMoney(s.money);
      el('stars').innerHTML = starsHtml(s.stars);
      el('clock').textContent = 'FRI ' + formatClock(s.clockMinutes);
      el('in-sight').style.display = s.heliActive ? 'block' : 'none';
      el('dispatch-count').textContent = `${s.units.length} UNITS · CODE ${s.stars}`;
      el('dispatch-rows').innerHTML = s.units.slice(0, 4).map((u) => `
        <div class="dispatch-row"><span>${u.name}</span><span class="role">${u.role}</span><span>${u.dist} m</span></div>
      `).join('');
      el('dispatch-foot').textContent = s.units.length > 4
        ? `+${s.units.length - 4} more units · roadblock ahead on Sunset Mile`
        : s.stars > 0 ? 'All units responding' : 'No units responding';
      el('vera-quote').textContent = '\u201C' + job.brief.split('.')[0] + '.\u201D';
      for (const c of CREW) {
        const cd = s.cooldowns[c.key];
        const ready = el(`crew-ready-${c.key}`);
        ready.textContent = cd > 0 ? `${Math.ceil(cd)}s` : 'READY';
        ready.classList.toggle('cooling', cd > 0);
      }
      el('district-name').textContent = s.district.toUpperCase();
      el('district-street').textContent = s.street;
      el('district-rep').textContent = `${s.districtStanding} · ${s.districtRep}`;
      el('district-bar-fill').style.width = `${s.districtRep}%`;
      el('health-num').textContent = Math.round(s.health);
      el('health-fill').style.width = `${s.health}%`;
      el('armour-num').textContent = Math.round(s.armour);
      el('armour-fill').style.width = `${s.armour}%`;
      el('rep-num').textContent = s.rep;
      el('rep-fill').style.width = `${Math.min(100, s.rep % 100)}%`;
      el('rep-level').textContent = `REP ${s.repLevel} · FIXER`;
      el('speed').textContent = s.inCar ? `${Math.round(Math.abs(s.speed) * 3.2)}` : '0';
      el('speed').innerHTML += '<span>KM/H</span>';
      el('car-name').textContent = s.inCar ? 'DORADO GT' : 'ON FOOT';
      el('car-condition').textContent = s.inCar
        ? `CONDITION ${Math.round(s.condition)}% · SPORTS · TUNE 2`
        : 'CONDITION 100% · SPORTS · TUNE 2';
      el('hint').textContent = s.inCar
        ? 'WASD drive · E enter & exit car · SPACE handbrake · SHIFT run · M city map · R radio · F action · N mute'
        : 'WASD walk · SHIFT run · E enter car · CLICK shoot · M city map · R radio · N mute';
      el('pause-clock').textContent = `FRI ${formatClock(s.clockMinutes)} · JOB ${job.id}/8 · ${formatMoney(s.money)} · ${starsHtml(s.stars)}`;
      drawMinimap(s);
    },
  };
}
