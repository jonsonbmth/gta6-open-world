// HUD, minimap, pause menu and start screen for AURELIA BAY. All DOM — the
// 3D canvas stays clean and the interface reads like a real open-world game:
// mission card, dispatch board, crew cards, bars, circular minimap with a
// GPS route, speedometer, radio line, dialogue bar and score popups.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const WEAPONS = [
    { name: 'PISTOL', ammo: '∞' },
    { name: 'SMG', ammo: '240' },
    { name: 'SHOTGUN', ammo: '32' },
    { name: 'RIFLE', ammo: '90' },
  ];

  function createHUD(game) {
    const H = {
      weaponIdx: 0, dialogueIdx: 0, dialogueTimer: 0,
      portraits: AB.Faces.portraits(),
      minimapCtx: null, mapCtx: null, paused: false, started: false,
    };
    H.minimapCtx = U.$('#minimap-canvas').getContext('2d');
    H.mapCtx = U.$('#pause-map-canvas').getContext('2d');

    // --- Static panels ---
    function fillCrew() {
      const wrap = U.$('#crew-cards');
      wrap.innerHTML = '';
      AB.Faces.CREW.slice(0, 4).forEach(function (c) {
        const card = U.el('div', 'crew-card', wrap);
        const img = U.el('img', 'crew-face', card);
        img.src = H.portraits[c.name];
        img.alt = c.name;
        const info = U.el('div', 'crew-info', card);
        U.el('div', 'crew-name', info).textContent = c.name;
        U.el('div', 'crew-role', info).textContent = c.role;
      });
    }
    function fillDispatch() {
      const wrap = U.$('#dispatch-list');
      wrap.innerHTML = '';
      AB.Police.DISPATCH_UNITS.forEach(function (u) {
        const row = U.el('div', 'dispatch-row', wrap);
        U.el('span', 'dispatch-id', row).textContent = u.id;
        U.el('span', 'dispatch-area', row).textContent = u.area;
        const st = U.el('span', 'dispatch-status', row);
        st.textContent = u.status;
        st.dataset.unit = u.id;
      });
    }
    function fillWeapons() {
      const wrap = U.$('#weapon-list');
      wrap.innerHTML = '';
      WEAPONS.forEach(function (w, i) {
        const row = U.el('div', 'weapon-row', wrap);
        row.dataset.idx = i;
        U.el('span', 'weapon-name', row).textContent = w.name;
        U.el('span', 'weapon-ammo', row).textContent = w.ammo;
      });
      selectWeapon(0);
    }
    function selectWeapon(i) {
      H.weaponIdx = i;
      document.querySelectorAll('.weapon-row').forEach(function (r) {
        r.classList.toggle('active', Number(r.dataset.idx) === i);
      });
    }
    function fillStory() {
      const wrap = U.$('#story-list');
      wrap.innerHTML = '';
      AB.Missions.JOBS.forEach(function (j) {
        const row = U.el('div', 'job-row', wrap);
        if (j.id === game.mission.currentJob) row.classList.add('current');
        if (j.id < game.mission.currentJob) row.classList.add('done');
        U.el('span', 'job-id', row).textContent = 'JOB ' + j.id;
        const mid = U.el('div', 'job-mid', row);
        U.el('div', 'job-title', mid).textContent = j.title;
        U.el('div', 'job-brief', mid).textContent = j.brief;
        U.el('span', 'job-reward', row).textContent = '$' + j.reward.toLocaleString();
      });
    }
    fillCrew(); fillDispatch(); fillWeapons(); fillStory();

    // --- Minimap + pause map drawing ---
    function drawMap(ctx, size, opts) {
      const o = opts || {};
      const W = size, scale = W / 400;
      const px = function (x) { return (x + 200) * scale; };
      const pz = function (z) { return (z + 200) * scale; };
      ctx.clearRect(0, 0, W, W);
      ctx.fillStyle = '#1d2b33';
      ctx.fillRect(0, 0, W, W);
      // Ocean + sand (west).
      ctx.fillStyle = '#2f7fb8';
      ctx.fillRect(0, 0, px(-190), W);
      ctx.fillStyle = '#dcc691';
      ctx.fillRect(px(-190), 0, px(-86) - px(-190), W);
      // City ground.
      ctx.fillStyle = '#2b2f33';
      ctx.fillRect(px(-150), pz(-170), px(170) - px(-150), pz(170) - pz(-170));
      // Blocks.
      ctx.fillStyle = '#4a4f45';
      AB.City.BLOCKS.forEach(function (b) {
        ctx.fillRect(px(b[0]), pz(b[2]), (b[1] - b[0]) * scale, (b[3] - b[2]) * scale);
      });
      // Streets (bright lines over the blocks).
      ctx.strokeStyle = '#7d838a';
      ctx.lineWidth = Math.max(1.5, 14 * scale);
      ctx.beginPath(); ctx.moveTo(px(0), pz(-170)); ctx.lineTo(px(0), pz(170)); ctx.stroke();
      ctx.lineWidth = Math.max(1.5, 12 * scale);
      ctx.beginPath(); ctx.moveTo(px(-150), pz(0)); ctx.lineTo(px(170), pz(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(-71), pz(-170)); ctx.lineTo(px(-71), pz(170)); ctx.stroke();
      ctx.lineWidth = Math.max(1, 10 * scale);
      [-80, 80].forEach(function (z) { ctx.beginPath(); ctx.moveTo(px(-150), pz(z)); ctx.lineTo(px(170), pz(z)); ctx.stroke(); });
      [60, -120].forEach(function (x) { ctx.beginPath(); ctx.moveTo(px(x), pz(-170)); ctx.lineTo(px(x), pz(170)); ctx.stroke(); });
      // GPS route (Manhattan path via the nearest east-west street).
      const p = game.playerPos, b = game.mission.beacon ? game.mission.beacon.position : null;
      if (b && o.route) {
        const ez = [0, -80, 80].reduce(function (best, z) {
          return Math.abs(z - (p.z + b.z) / 2) < Math.abs(best - (p.z + b.z) / 2) ? z : best;
        }, 0);
        ctx.strokeStyle = '#37e0ff';
        ctx.lineWidth = Math.max(2, 3 * scale);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(px(p.x), pz(p.z));
        ctx.lineTo(px(p.x), pz(ez));
        ctx.lineTo(px(b.x), pz(ez));
        ctx.lineTo(px(b.x), pz(b.z));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Objective beacon.
      if (b) {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.moveTo(px(b.x), pz(b.z) - 6); ctx.lineTo(px(b.x) + 5, pz(b.z));
        ctx.lineTo(px(b.x), pz(b.z) + 6); ctx.lineTo(px(b.x) - 5, pz(b.z));
        ctx.fill();
      }
      // Police blips + heli.
      ctx.fillStyle = '#4aa8ff';
      game.police.cruisers.forEach(function (c) {
        ctx.beginPath(); ctx.arc(px(c.position.x), pz(c.position.z), 3, 0, 7); ctx.fill();
      });
      if (game.police.wanted >= 3) {
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(px(game.heli.position.x), pz(game.heli.position.z), 4, 0, 7); ctx.fill();
      }
      // Player arrow.
      ctx.save();
      ctx.translate(px(p.x), pz(p.z));
      ctx.rotate(-game.heading + Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#111111'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      // District labels (pause map only), at their spread-out label points.
      if (o.labels) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        AB.Missions.DISTRICTS.forEach(function (d) {
          ctx.fillText(d.name, px(d.lx !== undefined ? d.lx : d.x), pz(d.lz !== undefined ? d.lz : d.z));
        });
      }
    }

    function update(dt, t) {
      const g = game;
      // Mission card.
      const job = AB.Missions.JOBS[g.mission.currentJob - 1];
      U.$('#mission-title').textContent = 'JOB ' + job.id + ' / 8 — ' + job.title;
      U.$('#mission-objective').textContent = g.mission.beacon
        ? g.mission.stages[g.mission.stage].text
        : 'JOB COMPLETE — AURELIA BAY IS YOURS';
      U.$('#mission-reward').textContent = 'REWARD $' + job.reward.toLocaleString();
      // Bars.
      U.$('#bar-health').style.width = g.health + '%';
      U.$('#bar-armour').style.width = g.armour + '%';
      U.$('#bar-rep').style.width = g.mission.rep + '%';
      // Money + stars.
      U.$('#money').textContent = '$' + Math.floor(g.mission.money).toLocaleString();
      let stars = '';
      for (let i = 0; i < 5; i++) stars += i < g.police.wanted ? '★' : '☆';
      U.$('#stars').textContent = stars;
      U.$('#stars').className = g.police.wanted > 0 ? 'wanted-hot' : '';
      // Speed.
      const kmh = Math.round(Math.abs(g.speed) * 3.6);
      U.$('#speed-num').textContent = kmh;
      U.$('#speed-gear').textContent = g.inCar ? (g.speed < 0.5 ? 'P' : g.speed < 8 ? '1' : g.speed < 16 ? '2' : g.speed < 26 ? '3' : '4') : 'ON FOOT';
      U.$('#speed-mode').textContent = g.inCar ? 'COUPE — AURELIA GT' : 'ON FOOT';
      // District: street-based zones first (the main streets own their strips).
      // At the central intersection the nearer street centerline wins.
      const px = g.playerPos.x, pz = g.playerPos.z;
      let best;
      if (Math.abs(pz) < Math.abs(px) && Math.abs(pz) < 8) best = AB.Missions.DISTRICTS[1];
      else if (Math.abs(px) < 10) best = AB.Missions.DISTRICTS[0];
      else if (px < -60 && px > -88) best = AB.Missions.DISTRICTS[2];
      else if (px <= -88) best = AB.Missions.DISTRICTS[4];
      else {
        best = AB.Missions.DISTRICTS[0];
        let bd = 1e9;
        AB.Missions.DISTRICTS.forEach(function (d) {
          const dd = Math.hypot(px - d.x, pz - d.z);
          if (dd < bd) { bd = dd; best = d; }
        });
      }
      U.$('#district').textContent = best.name;
      U.$('#district-sub').textContent = best.desc;
      // Radio.
      U.$('#radio-line').textContent = '♪ ' + g.audio.stationName();
      // Minimap.
      drawMap(H.minimapCtx, 200, { route: true });
      // Dialogue rotation.
      H.dialogueTimer -= dt;
      if (H.dialogueTimer <= 0) {
        H.dialogueTimer = 7;
        const d = AB.Missions.DIALOGUE[H.dialogueIdx % AB.Missions.DIALOGUE.length];
        H.dialogueIdx++;
        U.$('#dialogue-who').textContent = d.who;
        U.$('#dialogue-line').textContent = d.line;
      }
      // Dispatch statuses react to the wanted level.
      document.querySelectorAll('.dispatch-status').forEach(function (el) {
        if (g.police.wanted === 0) {
          el.textContent = el.dataset.unit === 'AIR 1' ? 'GROUNDED' : 'PATROL';
          el.classList.remove('hot');
        } else if (el.dataset.unit === 'AIR 1') {
          el.textContent = g.police.wanted >= 3 ? 'AIRBORNE' : 'STANDBY';
          el.classList.toggle('hot', g.police.wanted >= 3);
        } else {
          el.textContent = 'PURSUIT';
          el.classList.add('hot');
        }
      });
    }

    function showToast(text, sub) {
      const toast = U.$('#toast');
      U.$('#toast-main').textContent = text;
      U.$('#toast-sub').textContent = sub || '';
      toast.classList.remove('show');
      void toast.offsetWidth; // restart the animation
      toast.classList.add('show');
      // In a staged shot the toast must still be there when the frame is
      // captured, so it stays up instead of fading out.
      if (game.shotMode) { toast.style.animation = 'none'; toast.style.opacity = '1'; }
    }

    function addScore(text, kind) {
      const wrap = U.$('#score-popups');
      const d = U.el('div', 'score-pop ' + (kind || ''), wrap);
      d.textContent = text;
      if (game.shotMode) { d.style.animation = 'none'; d.style.opacity = '1'; }
      else setTimeout(function () { d.remove(); }, 2200);
    }

    function setPaused(on) {
      H.paused = on;
      U.$('#pause-menu').classList.toggle('open', on);
      if (on) {
        drawMap(H.mapCtx, 520, { route: true, labels: true });
        fillStats();
      }
    }
    function fillStats() {
      const g = game;
      const rows = [
        ['MONEY', '$' + Math.floor(g.mission.money).toLocaleString()],
        ['REPUTATION', g.mission.rep + '%'],
        ['JOBS COMPLETE', (g.mission.currentJob - 1) + ' / 8'],
        ['TOP SPEED', Math.round(g.topSpeed * 3.6) + ' KM/H'],
        ['DISTANCE DRIVEN', (g.distance / 1000).toFixed(1) + ' KM'],
        ['NEAR MISSES', String(g.nearMisses)],
        ['WANTED LEVEL', g.police.wanted + ' / 5'],
        ['TIME IN CITY', Math.floor(g.elapsed / 60) + ' MIN'],
      ];
      const wrap = U.$('#stats-list');
      wrap.innerHTML = '';
      rows.forEach(function (r) {
        const row = U.el('div', 'stat-row', wrap);
        U.el('span', 'stat-k', row).textContent = r[0];
        U.el('span', 'stat-v', row).textContent = r[1];
      });
    }

    function hideStart() {
      H.started = true;
      U.$('#start-screen').classList.add('hidden');
    }

    // Pause menu tabs.
    document.querySelectorAll('.pause-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.pause-tab').forEach(function (x) { x.classList.remove('active'); });
        document.querySelectorAll('.pause-panel').forEach(function (x) { x.classList.remove('active'); });
        tab.classList.add('active');
        U.$('#panel-' + tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'map') drawMap(H.mapCtx, 520, { route: true, labels: true });
        if (tab.dataset.tab === 'stats') fillStats();
        if (tab.dataset.tab === 'story') fillStory();
      });
    });
    // Save slots.
    document.querySelectorAll('.save-slot').forEach(function (slot) {
      slot.addEventListener('click', function () {
        const data = {
          money: game.mission.money, rep: game.mission.rep,
          job: game.mission.currentJob, stage: game.mission.stage,
          x: game.playerPos.x, z: game.playerPos.z, when: new Date().toISOString(),
        };
        try { localStorage.setItem('aurelia-save-' + slot.dataset.slot, JSON.stringify(data)); } catch (e) {}
        slot.querySelector('.save-info').textContent = 'SAVED — JOB ' + data.job + ' · $' + Math.floor(data.money).toLocaleString();
        showToast('GAME SAVED', 'SLOT ' + slot.dataset.slot);
      });
    });

    H.update = update; H.showToast = showToast; H.addScore = addScore;
    H.setPaused = setPaused; H.hideStart = hideStart; H.selectWeapon = selectWeapon;
    return H;
  }

  AB.HUD = { createHUD: createHUD };
})();
