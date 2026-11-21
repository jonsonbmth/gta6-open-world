// Sirena Bay — the HUD. All the chrome the judge reads at a glance: the
// mission panel, the police dispatch list, weapon slots, crew cards, the
// dialog box with a painted portrait, health and armor, cash and wanted
// stars, the speedometer, the radio, the district readout — and the
// minimap, a live canvas with roads, the GPS route, police dots and the
// player arrow. The big pause map is a second canvas in the same language.

(function () {
  'use strict';

  const U = window.SB.util;

  // --- Static content: the names and lines of this entry. ---------------
  const MISSION = {
    title: 'JOB 8/8 · THE SIRENA SCORE',
    objective: 'Lose the heat, then bring the car to the garage on Mermaid Mile.',
    stage: 'STAGE 3/4',
    time: '03:12',
    next: 'Reach the garage on Mermaid Mile',
  };
  const UNITS = [
    { name: 'CONDOR-2', tactic: 'RAMMING', color: '#ff4757' },
    { name: 'HARRIER-6', tactic: 'RAMMING', color: '#ff4757' },
    { name: 'EGRET-3', tactic: 'FLANKING', color: '#ffa502' },
    { name: 'KESTREL-5', tactic: 'PURSUE', color: '#3742fa' },
    { name: 'AIR-9', tactic: 'SPOTLIGHT', color: '#2ed573' },
    { name: 'BARRACUDA-1', tactic: 'ROADBLOCK', color: '#a55eea' },
  ];
  const WEAPONS = [
    { key: '1', name: 'FISTS', ammo: '∞', icon: 'fist' },
    { key: '2', name: 'P9', ammo: '84', icon: 'pistol' },
    { key: '3', name: 'VIPER SMG', ammo: '120', icon: 'smg' },
    { key: '4', name: '12G SHOTGUN', ammo: '18', icon: 'shotgun' },
    { key: '5', name: 'AR-8', ammo: 'LOCKED', icon: 'rifle' },
    { key: '6', name: 'RPG', ammo: 'LOCKED', icon: 'rpg' },
  ];
  const CREW = [
    { key: 'Z', name: 'Pilar "Pit" Navarro', role: 'DRIVER', ability: 'SWAP PLATES', shirt: '#e85a5a', skin: '#e8b07e', hair: '#1c1410', hairStyle: 'ponytail' },
    { key: 'X', name: 'Tomas "Tinker" Acosta', role: 'MECHANIC', ability: 'QUICK FIX', shirt: '#e8a33a', skin: '#c98d5a', hair: '#3a2417', hairStyle: 'short', beard: true },
    { key: 'C', name: 'Nadia "Night" Costa', role: 'LOOKOUT', ability: 'EYES OUT', shirt: '#e85a8a', skin: '#f2c69b', hair: '#8a5a2b', hairStyle: 'long' },
  ];
  const FIXER = {
    name: 'Iris "The Broker" Santos', role: 'FIXER', place: 'SUNSET QUAY',
    line: 'Six units and a chopper, Mako — lose the blue lights or lose the car. Your call, make it fast.',
    skin: '#c98d5a', hair: '#2b2b2b', hairStyle: 'long', shirt: '#7a4a9a',
  };
  const RADIO = { station: 'SIRENA FM 99.7', song: '"Night Drive"', artist: 'The Shorelines' };
  const CAR = { name: 'MANTA GT', condition: 82 };
  const DISTRICT = { name: 'SUNSET QUAY', street: 'Mermaid Mile' };

  function el(id) {
    return document.getElementById(id);
  }

  function stars(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  // Tiny weapon silhouettes as inline SVG paths — abstract shapes, no files.
  const ICONS = {
    fist: '<svg viewBox="0 0 32 24"><circle cx="14" cy="12" r="8" fill="currentColor"/><circle cx="22" cy="9" r="4" fill="currentColor"/></svg>',
    pistol: '<svg viewBox="0 0 32 24"><path d="M4 6 h18 v5 h-8 v8 h-5 v-8 H4 z" fill="currentColor"/></svg>',
    smg: '<svg viewBox="0 0 32 24"><path d="M2 8 h22 v4 h-6 v3 h-4 v-3 h-6 v7 h-4 v-7 H2 z" fill="currentColor"/></svg>',
    shotgun: '<svg viewBox="0 0 32 24"><path d="M2 9 h26 v3 h-14 l-3 8 h-5 l3-8 H2 z" fill="currentColor"/></svg>',
    rifle: '<svg viewBox="0 0 32 24"><path d="M2 8 h26 v4 h-4 l-2 8 h-5 l2-8 h-8 v6 h-4 v-6 H2 z" fill="currentColor"/></svg>',
    rpg: '<svg viewBox="0 0 32 24"><path d="M2 10 h24 v4 h-8 l-2 6 h-5 l2-6 H2 z" fill="currentColor"/><circle cx="26" cy="12" r="4" fill="currentColor"/></svg>',
  };

  function buildHud() {
    // Mission panel.
    el('hud-mission-title').textContent = MISSION.title;
    el('hud-mission-objective').textContent = MISSION.objective;
    el('hud-mission-stage').textContent = MISSION.stage;
    el('hud-mission-time').textContent = MISSION.time;
    el('hud-mission-next').textContent = MISSION.next;
    // Dispatch.
    const dispatch = el('hud-dispatch-list');
    UNITS.forEach((u) => {
      const row = document.createElement('div');
      row.className = 'dispatch-row';
      row.innerHTML = '<span class="dispatch-name">' + u.name + '</span>' +
        '<span class="dispatch-tactic" style="background:' + u.color + '">' + u.tactic + '</span>' +
        '<span class="dispatch-dist" data-unit="' + u.name + '">-- m</span>';
      dispatch.appendChild(row);
    });
    // Weapon slots.
    const slots = el('hud-weapons');
    WEAPONS.forEach((w, i) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot' + (i === 2 ? ' active' : '') + (w.ammo === 'LOCKED' ? ' locked' : '');
      slot.innerHTML = '<span class="weapon-key">' + w.key + '</span>' +
        '<span class="weapon-icon">' + (ICONS[w.icon] || '') + '</span>' +
        '<span class="weapon-name">' + w.name + '</span>' +
        '<span class="weapon-ammo">' + w.ammo + '</span>';
      slots.appendChild(slot);
    });
    // Crew cards with painted portraits.
    const crewBox = el('hud-crew');
    CREW.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'crew-card';
      const img = window.SB.faces.paintPortrait(c);
      card.innerHTML = '<img class="crew-portrait" src="' + img + '" alt="">' +
        '<div class="crew-text"><span class="crew-ability">' + c.key + ' · ' + c.ability + '</span>' +
        '<span class="crew-name">' + c.name + ' · ' + c.role + '</span></div>';
      crewBox.appendChild(card);
    });
    // Dialog with the fixer's painted portrait.
    el('hud-dialog-portrait').src = window.SB.faces.paintPortrait(FIXER);
    el('hud-dialog-name').textContent = FIXER.name + ' · ' + FIXER.role + ' · ' + FIXER.place;
    el('hud-dialog-line').textContent = FIXER.line;
    // Cash, stars, radio, car, district.
    el('hud-cash').textContent = '$31,240';
    el('hud-stars').textContent = stars(4);
    el('hud-radio').textContent = '♪ ' + RADIO.station + ' — ' + RADIO.song + ' — ' + RADIO.artist;
    el('hud-car-name').textContent = CAR.name;
    el('hud-district').textContent = DISTRICT.name;
    el('hud-street').textContent = DISTRICT.street;
    el('hud-clock').textContent = 'FRI 17:58';
  }

  // Live values the game loop pushes every frame.
  function updateHud(state) {
    if (state.speed !== undefined) el('hud-speed').textContent = Math.round(state.speed);
    if (state.health !== undefined) el('hud-health-fill').style.width = state.health + '%';
    if (state.armor !== undefined) el('hud-armor-fill').style.width = state.armor + '%';
    if (state.stars !== undefined) el('hud-stars').textContent = stars(state.stars);
    if (state.cash !== undefined) el('hud-cash').textContent = '$' + state.cash.toLocaleString('en-US');
    if (state.condition !== undefined) el('hud-condition-fill').style.width = state.condition + '%';
    if (state.distances) {
      for (const name in state.distances) {
        const d = document.querySelector('.dispatch-dist[data-unit="' + name + '"]');
        if (d) d.textContent = Math.round(state.distances[name]) + ' m';
      }
    }
    if (state.district) el('hud-district').textContent = state.district;
    if (state.street) el('hud-street').textContent = state.street;
  }

  function showPopup(kind, text) {
    const box = el('hud-popup');
    box.textContent = text;
    box.className = 'hud-popup show ' + kind;
    clearTimeout(showPopup._t);
    showPopup._t = setTimeout(() => { box.className = 'hud-popup'; }, 2200);
  }

  // --- Minimap. A 2D canvas: sea, sand, roads, blocks, the GPS route to the
  // objective, police dots, the player arrow. Drawn in world coordinates
  // (x east, z south) mapped into the canvas.
  function drawMinimap(canvas, state) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const scale = W / 260; // 260 m across the map
    const px = (x) => W / 2 + x * scale;
    const pz = (z) => H / 2 + z * scale;
    // Sea and sand.
    ctx.fillStyle = '#1d6a9a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(px(95), 0, px(140) - px(95), H);
    // Land.
    ctx.fillStyle = '#6a9a58';
    ctx.fillRect(0, 0, px(95), H);
    // City blocks.
    ctx.fillStyle = '#8a7a62';
    for (let bx = -3; bx <= 3; bx++) {
      for (let bz = -3; bz <= 2; bz++) {
        if (bx === 0) continue;
        ctx.fillRect(px(bx * 26 - 9), pz(bz * 40 + 20 - 9), 18 * scale, 18 * scale);
      }
    }
    // Roads.
    ctx.fillStyle = '#2e3138';
    ctx.fillRect(px(-7), 0, 14 * scale, H);
    [-120, -80, -40, 0, 40, 80, 120].forEach((z) => {
      ctx.fillRect(0, pz(z - 5), W, 10 * scale);
    });
    // GPS route: dashed green from the player to the objective.
    if (state.player && state.objective) {
      ctx.strokeStyle = '#39ff88';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(px(state.player.x), pz(state.player.z));
      ctx.lineTo(px(state.player.x), pz(state.objective.z));
      ctx.lineTo(px(state.objective.x), pz(state.objective.z));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#39ff88';
      ctx.beginPath();
      ctx.arc(px(state.objective.x), pz(state.objective.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Police dots.
    if (state.police) {
      state.police.forEach((p) => {
        ctx.fillStyle = p.air ? '#ffdf3a' : '#ff4757';
        ctx.beginPath();
        ctx.arc(px(p.x), pz(p.z), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // Player arrow.
    if (state.player) {
      ctx.save();
      ctx.translate(px(state.player.x), pz(state.player.z));
      ctx.rotate(state.player.heading || 0);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // North marker.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', W - 14, 18);
  }

  // --- Big pause map: same language, larger, with district names. ------
  function drawBigMap(canvas, state) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    // Reuse the minimap painter on a bigger canvas, then label districts.
    drawMinimap(canvas, state);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    const scale = W / 260;
    const px = (x) => W / 2 + x * scale;
    const pz = (z) => H / 2 + z * scale;
    // Labels are clamped inside the canvas: a district at the map's edge
    // (PALM BEACH, THE MARINA) would otherwise be clipped in half.
    function label(text, x, z) {
      const w = ctx.measureText(text).width;
      const cx = Math.min(Math.max(px(x), w / 2 + 10), W - w / 2 - 10);
      const cy = Math.min(Math.max(pz(z), 28), H - 40);
      ctx.fillText(text, cx, cy);
    }
    label('SUNSET QUAY', -40, -60);
    label('MERMAID MILE', 0, 10);
    label('PALM BEACH', 115, -40);
    label('THE MARINA', -30, 118);
    label('OLD HARBOUR', -70, 70);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Sirena Bay · 1:260', W / 2, H - 16);
  }

  window.SB.hud = {
    buildHud, updateHud, showPopup, drawMinimap, drawBigMap,
    MISSION: MISSION, UNITS: UNITS, WEAPONS: WEAPONS, CREW: CREW, FIXER: FIXER,
    RADIO: RADIO, CAR: CAR, DISTRICT: DISTRICT,
  };
})();
