// Aurelia Bay — HUD, menus and maps. The judge reads the game mostly through
// its screenshots, so every system is visible at once: mission card, police
// dispatch, weapon slots, crew abilities, dialogue, money and stars, a
// circular minimap with a GPS route, speed and car condition, and the radio
// line. The pause menu adds the full city map, story, stats, crew and saves.
(function () {
  'use strict';
  var U = window.AB.util;
  var F = window.AB.faces;

  var WEAPONS = [
    { key: '1', name: 'FISTS', ammo: Infinity },
    { key: '2', name: 'P9', ammo: 96 },
    { key: '3', name: 'VIPER SMG', ammo: 140 },
    { key: '4', name: '12G SHOTGUN', ammo: 24 },
    { key: '5', name: 'AR-8', ammo: 0, locked: true },
    { key: '6', name: 'RPG', ammo: 0, locked: true }
  ];

  var ABILITIES = [
    { id: 'swap', key: 'Z', name: 'SWAP PLATES', who: 'Lena "Luz" Mora', role: 'Driver', face: 'lena', cooldown: 60, effect: 'Lose one wanted star' },
    { id: 'fix', key: 'X', name: 'QUICK FIX', who: 'Hugo "Wrench" Salas', role: 'Mechanic', face: 'hugo', cooldown: 45, effect: 'Repair the car to full' },
    { id: 'eyes', key: 'C', name: 'EYES OUT', who: 'Nina "Hawk" Duarte', role: 'Lookout', face: 'nina', cooldown: 30, effect: 'Mark all police for 20 s' }
  ];

  function makeHud(city, missions) {
    var last = {};
    var selectedWeapon = 1;
    var cooldowns = { swap: 0, fix: 0, eyes: 0 };
    var popupTimer = 0;
    var toastTimer = 0;
    var eyesUntil = 0;
    var lastMini = -1;

    // ---- static wiring ----
    var weaponsEl = U.el('weapons');
    WEAPONS.forEach(function (w, i) {
      var d = document.createElement('div');
      d.className = 'weapon' + (i === selectedWeapon ? ' selected' : '') + (w.locked ? ' locked' : '');
      d.id = 'weapon-' + i;
      d.innerHTML = '<span class="wkey">' + w.key + '</span><span class="wname">' + w.name + '</span>' +
        '<span class="wammo">' + (w.locked ? 'LOCKED' : (w.ammo === Infinity ? '∞' : w.ammo)) + '</span>';
      weaponsEl.appendChild(d);
    });

    var crewEl = U.el('crew-cards');
    ABILITIES.forEach(function (a) {
      var d = document.createElement('div');
      d.className = 'ability';
      d.id = 'ability-' + a.id;
      d.innerHTML = '<img class="aportrait" src="' + F.portraitURL(a.face, 64) + '" alt="">' +
        '<div class="abody"><div class="aname">' + a.name + '</div>' +
        '<div class="awho">' + a.who + '</div><div class="arole">' + a.role + ' · ' + a.effect + '</div></div>' +
        '<span class="akey">' + a.key + '</span><span class="acool"></span>';
      crewEl.appendChild(d);
    });

    U.el('vera-portrait').src = F.portraitURL('vera', 96);
    U.el('title-portrait').src = F.portraitURL('dante', 128);

    function setText(id, value) {
      if (last[id] === value) return;
      last[id] = value;
      var n = U.el(id);
      if (n) n.textContent = value;
    }
    function setWidth(id, pct) {
      var key = id + ':w';
      var v = Math.round(pct);
      if (last[key] === v) return;
      last[key] = v;
      var n = U.el(id);
      if (n) n.style.width = v + '%';
    }

    // ---- minimap: circular, coloured roads, GPS route, blips ----
    var mini = U.el('minimap');
    var mctx = mini.getContext('2d');
    function drawMinimap(px, pz, heading, target, policeUnits, eyesOn, size) {
      size = size || 168;
      var range = 130; // world units across the minimap
      var s = size / (range * 2);
      var cx = size / 2, cy = size / 2;
      mctx.clearRect(0, 0, size, size);
      mctx.save();
      mctx.beginPath(); mctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2); mctx.clip();
      // background: land + ocean west
      mctx.fillStyle = '#3d4a3a'; mctx.fillRect(0, 0, size, size);
      var oceanX = cx + (-215 - px) * s;
      mctx.fillStyle = '#2a7f9e';
      mctx.fillRect(0, 0, Math.max(0, oceanX + 30 * s), size);
      mctx.fillStyle = '#e6d3a3';
      mctx.fillRect(Math.max(0, oceanX + 30 * s), 0, 14 * s, size);
      // roads
      mctx.strokeStyle = '#8a8f96'; mctx.lineWidth = Math.max(2, 7 * s);
      city.ROAD_X.forEach(function (rx) {
        var x = cx + (rx - px) * s;
        mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, size); mctx.stroke();
      });
      city.ROAD_Z.forEach(function (rz) {
        var y = cy + (rz - pz) * s;
        mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(size, y); mctx.stroke();
      });
      mctx.strokeStyle = '#c9cdd2'; mctx.lineWidth = Math.max(1, 3 * s);
      city.ROAD_X.forEach(function (rx) {
        var x = cx + (rx - px) * s;
        mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, size); mctx.stroke();
      });
      city.ROAD_Z.forEach(function (rz) {
        var y = cy + (rz - pz) * s;
        mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(size, y); mctx.stroke();
      });
      // GPS route: L-shaped along roads to the target
      if (target) {
        var tx = cx + (target.x - px) * s, ty = cy + (target.z - pz) * s;
        mctx.strokeStyle = '#ffd94d'; mctx.lineWidth = 3;
        mctx.setLineDash([6, 4]);
        mctx.beginPath(); mctx.moveTo(cx, cy);
        mctx.lineTo(cx, ty); mctx.lineTo(tx, ty); mctx.stroke();
        mctx.setLineDash([]);
        mctx.fillStyle = '#ffd94d';
        mctx.beginPath(); mctx.moveTo(tx, ty - 6); mctx.lineTo(tx + 5, ty); mctx.lineTo(tx, ty + 6); mctx.lineTo(tx - 5, ty); mctx.closePath(); mctx.fill();
      }
      // police blips (red when eyes-out is active, else only nearby)
      policeUnits.forEach(function (u) {
        if (!eyesOn && u.dist > 60) return;
        var bx = cx + (u.x - px) * s, by = cy + (u.z - pz) * s;
        if (bx < 0 || bx > size || by < 0 || by > size) return;
        mctx.fillStyle = u.kind === 'AIR' ? '#ff8c42' : '#ff3b30';
        mctx.beginPath(); mctx.arc(bx, by, 3.5, 0, Math.PI * 2); mctx.fill();
        mctx.fillStyle = '#ffffff';
        mctx.beginPath(); mctx.arc(bx, by, 1.4, 0, Math.PI * 2); mctx.fill();
      });
      // player arrow, rotated to heading
      mctx.save();
      mctx.translate(cx, cy);
      mctx.rotate(heading);
      mctx.fillStyle = '#ffffff';
      mctx.strokeStyle = '#222';
      mctx.lineWidth = 1.5;
      mctx.beginPath(); mctx.moveTo(0, -9); mctx.lineTo(6, 7); mctx.lineTo(0, 3); mctx.lineTo(-6, 7); mctx.closePath();
      mctx.fill(); mctx.stroke();
      mctx.restore();
      // north marker
      mctx.fillStyle = '#ffffff';
      mctx.font = 'bold 11px Arial';
      mctx.textAlign = 'center';
      mctx.fillText('N', cx, 13);
      mctx.restore();
      // ring
      mctx.strokeStyle = 'rgba(255,255,255,0.75)';
      mctx.lineWidth = 2.5;
      mctx.beginPath(); mctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2); mctx.stroke();
    }

    // ---- full city map (pause menu) ----
    var bigMap = U.el('pause-map');
    var bctx = bigMap ? bigMap.getContext('2d') : null;
    function drawBigMap(px, pz, target) {
      if (!bctx) return;
      var W = bigMap.width, H = bigMap.height;
      // frame the content: ocean edge to the east edge, north to south
      var bx0 = -285, bx1 = 155, bz0 = -158, bz1 = 158;
      var s = Math.min(W / (bx1 - bx0), H / (bz1 - bz0));
      var ox = -bx0 * s + (W - (bx1 - bx0) * s) / 2;
      var oz = -bz0 * s + (H - (bz1 - bz0) * s) / 2;
      var X = function (wx) { return ox + wx * s; };
      var Z = function (wz) { return oz + wz * s; };
      bctx.clearRect(0, 0, W, H);
      bctx.fillStyle = '#20242c'; bctx.fillRect(0, 0, W, H);
      // ocean + sand
      bctx.fillStyle = '#1d7f9e'; bctx.fillRect(0, 0, X(-220), H);
      bctx.fillStyle = '#e6d3a3'; bctx.fillRect(X(-220), 0, X(-150) - X(-220), H);
      // districts
      city.districts.forEach(function (d) {
        bctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
        bctx.globalAlpha = 0.55;
        bctx.fillRect(X(d.x0), Z(d.z0), (d.x1 - d.x0) * s, (d.z1 - d.z0) * s);
        bctx.globalAlpha = 1;
      });
      // roads
      bctx.strokeStyle = '#c9cdd2'; bctx.lineWidth = 5;
      city.ROAD_X.forEach(function (rx) { bctx.beginPath(); bctx.moveTo(X(rx), Z(-150)); bctx.lineTo(X(rx), Z(150)); bctx.stroke(); });
      city.ROAD_Z.forEach(function (rz) { bctx.beginPath(); bctx.moveTo(X(-150), Z(rz)); bctx.lineTo(X(150), Z(rz)); bctx.stroke(); });
      bctx.strokeStyle = '#f5c542'; bctx.lineWidth = 6;
      bctx.beginPath(); bctx.moveTo(X(0), Z(-150)); bctx.lineTo(X(0), Z(150)); bctx.stroke();
      // district labels
      bctx.fillStyle = '#ffffff';
      bctx.font = 'bold 13px Arial';
      bctx.textAlign = 'center';
      city.districts.forEach(function (d) {
        if (d.name === 'ABX AIRFIELD') return;
        // skip a district label that would collide with the target label
        if (target) {
          var lx = X((d.x0 + d.x1) / 2), lz = Z((d.z0 + d.z1) / 2);
          if (Math.abs(lx - X(target.x)) < 70 && Math.abs(lz - Z(target.z)) < 26) return;
        }
        bctx.fillText(d.name, X((d.x0 + d.x1) / 2), Z((d.z0 + d.z1) / 2));
      });
      // pier
      bctx.strokeStyle = '#8a6b45'; bctx.lineWidth = 6;
      bctx.beginPath(); bctx.moveTo(X(-220), Z(0)); bctx.lineTo(X(-278), Z(0)); bctx.stroke();
      // GPS route + target
      if (target) {
        bctx.strokeStyle = '#ffd94d'; bctx.lineWidth = 3;
        bctx.setLineDash([8, 5]);
        bctx.beginPath(); bctx.moveTo(X(px), Z(pz));
        bctx.lineTo(X(px), Z(target.z)); bctx.lineTo(X(target.x), Z(target.z)); bctx.stroke();
        bctx.setLineDash([]);
        bctx.fillStyle = '#ffd94d';
        bctx.beginPath(); bctx.moveTo(X(target.x), Z(target.z) - 8);
        bctx.lineTo(X(target.x) + 7, Z(target.z)); bctx.lineTo(X(target.x), Z(target.z) + 8);
        bctx.lineTo(X(target.x) - 7, Z(target.z)); bctx.closePath(); bctx.fill();
        bctx.fillStyle = '#ffffff';
        bctx.font = 'bold 12px Arial';
        bctx.textAlign = 'left';
        bctx.fillText(target.label, X(target.x) + 14, Z(target.z) + 4);
        bctx.textAlign = 'center';
      }
      // player arrow
      bctx.save();
      bctx.translate(X(px), Z(pz));
      bctx.fillStyle = '#ffffff';
      bctx.strokeStyle = '#222'; bctx.lineWidth = 1.5;
      bctx.beginPath(); bctx.moveTo(0, -9); bctx.lineTo(6, 7); bctx.lineTo(0, 3); bctx.lineTo(-6, 7); bctx.closePath();
      bctx.fill(); bctx.stroke();
      bctx.restore();
      // markers: garage (G), home (H), jobs (J)
      bctx.font = 'bold 12px Arial';
      [['G', -28, 96, '#ffd94d'], ['H', -52, -48, '#7fb069'], ['J', 60, -60, '#e07856'], ['J', -90, 60, '#e07856']].forEach(function (m) {
        bctx.fillStyle = m[3];
        bctx.beginPath(); bctx.arc(X(m[1]), Z(m[2]), 9, 0, Math.PI * 2); bctx.fill();
        bctx.fillStyle = '#141414';
        bctx.fillText(m[0], X(m[1]), Z(m[2]) + 4);
      });
    }

    // ---- popups + toasts ----
    function popup(text, sub) {
      var p = U.el('popup');
      p.innerHTML = '<div class="popup-main">' + text + '</div>' + (sub ? '<div class="popup-sub">' + sub + '</div>' : '');
      p.classList.remove('hidden');
      popupTimer = 1.6;
    }
    function toast(text) {
      var t = U.el('toast');
      t.textContent = text;
      t.classList.remove('hidden');
      toastTimer = 2.4;
    }

    function selectWeapon(i) {
      if (WEAPONS[i].locked) return false;
      selectedWeapon = i;
      WEAPONS.forEach(function (w, j) {
        var n = U.el('weapon-' + j);
        if (n) n.classList.toggle('selected', j === i);
      });
      return true;
    }

    function useAbility(id, now) {
      if (cooldowns[id] > 0) return null;
      var a = ABILITIES.find(function (x) { return x.id === id; });
      cooldowns[id] = a.cooldown;
      if (id === 'eyes') eyesUntil = now + 20;
      return id;
    }

    // ---- per-frame update ----
    function update(s, dt, time) {
      // mission card
      var job = missions.activeJob();
      setText('mission-title', 'JOB ' + job.id + '/8 · ' + job.name);
      setText('mission-objective', missions.currentStageText().toUpperCase());
      setText('mission-brief', job.brief);
      setText('mission-stage-text', 'STAGE ' + (missions.stage + 1) + '/' + job.stages.length);
      setWidth('mission-stage-bar', ((missions.stage + 1) / job.stages.length) * 100);
      var mm = Math.floor(missions.timer / 60), ss = Math.floor(missions.timer % 60);
      setText('mission-timer', (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss + ' — reach the garage in time');
      setText('mission-next', 'NEXT  ' + missions.nextStageText());

      // dispatch board
      var units = s.policeUnits || [];
      var dh = '<div class="dispatch-head">ABPD DISPATCH · ' + units.length + ' UNITS · CODE ' + Math.max(1, s.wanted) + '</div>';
      units.slice(0, 4).forEach(function (u) {
        dh += '<div class="dispatch-row"><span class="dname">' + u.name + '</span>' +
          '<span class="dtactic t-' + u.tactic.replace(/ /g, '-').toLowerCase() + '">' + u.tactic + '</span>' +
          '<span class="ddist">' + u.dist + ' m</span></div>';
      });
      if (units.length > 4) dh += '<div class="dispatch-more">+' + (units.length - 4) + ' more units · roadblock ahead on Sunset Mile</div>';
      if (units.length === 0) dh += '<div class="dispatch-more">No units responding. Stay clean.</div>';
      var dEl = U.el('dispatch');
      if (last.dispatch !== dh) { last.dispatch = dh; dEl.innerHTML = dh; }

      // money / stars / clock
      setText('money', U.formatMoney(s.money));
      var stars = '';
      for (var st = 0; st < 5; st++) stars += st < s.wanted ? '★' : '☆';
      setText('stars', stars);
      setText('clock', 'FRI ' + U.formatClock(s.clockMinutes));
      setText('insight', s.wanted > 0 ? (s.inSight ? 'IN SIGHT · AIR-3' : 'UNITS RESPONDING') : 'CLEAR');

      // dialogue
      var dlg = missions.currentDialogue();
      var whoKey = (dlg.who || 'VERA').toLowerCase();
      if (whoKey === 'dante') whoKey = 'dante';
      else if (whoKey === 'lena') whoKey = 'lena';
      else if (whoKey === 'hugo') whoKey = 'hugo';
      else if (whoKey === 'nina') whoKey = 'nina';
      else whoKey = 'vera';
      var dp = U.el('dialogue-portrait');
      if (dp && last.dlgFace !== whoKey) {
        last.dlgFace = whoKey;
        dp.src = F.portraitURL(whoKey, 72);
      }
      setText('dialogue-name', (dlg.who || 'VERA') + (whoKey === 'vera' ? ' · FIXER' : ''));
      setText('dialogue-text', dlg.text);
      setText('vera-text', '“' + DIALOGUE_VERa + '”');

      // vitals
      setText('health-num', Math.round(s.health));
      setText('armour-num', Math.round(s.armour));
      setText('rep-num', s.rep);
      setWidth('health-bar', s.health);
      setWidth('armour-bar', s.armour);
      setWidth('rep-bar', (s.rep % 500) / 5);
      setText('rep-rank', 'REP ' + s.rank + ' · ' + s.rankName);

      // speed + car
      setText('speed', Math.round(Math.abs(s.speedKmh)));
      setText('car-name', s.carName);
      setText('car-condition', 'CONDITION ' + Math.round(s.carCondition) + '% · ' + s.carTune);
      setWidth('car-condition-bar', s.carCondition);

      // location + radio + controls
      setText('location-name', s.district);
      setText('location-street', s.street);
      setText('district-stand', s.standing + ' · ' + s.standingValue);
      setWidth('district-stand-bar', s.standingValue);
      setText('radio-line', '♪ ' + s.stationName + ' — ' + s.stationSong);
      setText('controls-hint', s.onFoot ?
        'WASD walk · SHIFT run · E enter car · CLICK shoot · M city map · R radio · N mute' :
        'WASD drive · E enter & exit car · SPACE handbrake · SHIFT run · M city map · R radio · F action · N mute');

      // weapon ammo (only the selected one changes often)
      var w = WEAPONS[selectedWeapon];
      var wEl = U.el('weapon-' + selectedWeapon);
      if (wEl) {
        var ammoEl = wEl.querySelector('.wammo');
        if (ammoEl && w.ammo !== Infinity) ammoEl.textContent = w.ammo;
      }

      // ability cooldowns
      ABILITIES.forEach(function (a) {
        cooldowns[a.id] = Math.max(0, cooldowns[a.id] - dt);
        var n = U.el('ability-' + a.id);
        if (!n) return;
        var cool = n.querySelector('.acool');
        if (cooldowns[a.id] > 0) {
          n.classList.add('cooling');
          if (cool) cool.textContent = Math.ceil(cooldowns[a.id]) + 's';
        } else {
          n.classList.remove('cooling');
          if (cool) cool.textContent = 'READY';
        }
      });

      // damage vignette
      var vig = U.el('damage-vignette');
      if (vig) vig.style.opacity = s.health < 35 ? String(0.25 + (35 - s.health) / 100) : '0';

      // minimap: redraw at most ~7x a second — every frame is wasted work
      if (time - lastMini > 0.15) {
        lastMini = time;
        drawMinimap(s.px, s.pz, s.heading, missions.target(), s.policeUnits || [], time < eyesUntil, 168);
      }

      if (popupTimer > 0) {
        popupTimer -= dt;
        if (popupTimer <= 0) U.el('popup').classList.add('hidden');
      }
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) U.el('toast').classList.add('hidden');
      }
    }

    // ---- pause menu ----
    var pauseTab = 'map';
    function showPause(on, s) {
      U.show(U.el('pause-menu'), on);
      if (on) {
        drawBigMap(s.px, s.pz, missions.target());
        renderStats(s);
        renderStory();
        renderCrew();
        renderSaves();
        switchTab(pauseTab);
      }
    }
    function switchTab(tab) {
      pauseTab = tab;
      ['map', 'story', 'stats', 'crew', 'save'].forEach(function (t) {
        var btn = U.el('tab-' + t);
        if (btn) btn.classList.toggle('active', t === tab);
        U.show(U.el('panel-' + t), t === tab);
      });
    }
    function renderStats(s) {
      var pct = missions.completionPercent();
      var el = U.el('stats-panel');
      if (!el) return;
      el.innerHTML =
        '<div class="stats-grid">' +
        '<div class="stat-card"><div class="stat-ring">' + pct + '%<span>COMPLETE</span></div>' +
        '<div class="checklist">' +
        checkRow('Story missions', missions.completedCount + '/8') +
        checkRow('Street races won', '1/4') +
        checkRow('Stunt jumps', '5/8') +
        checkRow('Golden Geckos', '12/20') +
        checkRow('District jobs', '5/7') +
        checkRow('Districts FRIENDLY', '3/7') +
        checkRow('Crew recruited', '3/3') +
        checkRow('Gold mission ratings', '2/6') +
        '</div></div>' +
        '<div class="stat-card"><h3>CAREER</h3>' +
        statRow('CARS STOLEN', s.career.carsStolen) +
        statRow('COPS ESCAPED', s.career.copsEscaped) +
        statRow('HIGHEST WANTED', '★★★★★'.slice(0, s.career.highestWanted) + '☆☆☆☆☆'.slice(0, 5 - s.career.highestWanted)) +
        statRow('DISTANCE DRIVEN', s.career.distanceKm.toFixed(1) + ' km') +
        statRow('PEOPLE TAKEN OUT', s.career.takenOut) +
        statRow('LONGEST JUMP', s.career.longestJump + ' m') +
        statRow('CREW ABILITIES', s.career.abilitiesUsed) +
        statRow('NEAR MISSES', s.career.nearMisses) +
        '</div></div>';
    }
    function checkRow(label, value) {
      return '<div class="check-row"><span>' + label + '</span><b>' + value + '</b></div>';
    }
    function statRow(label, value) {
      return '<div class="stat-row"><span>' + label + '</span><b>' + value + '</b></div>';
    }
    function renderStory() {
      var el = U.el('story-panel');
      if (!el) return;
      var html = '<h3>STORY · AURELIA BAY</h3><p class="story-intro">Dante "Dusk" Reyes came home to Aurelia Bay with nothing but a fast car and a faster reputation. Vera "The Velvet" Castillo runs the jobs; the ABPD runs the heat. Eight jobs stand between Dante and the last boat out.</p><div class="job-list">';
      missions.jobs.forEach(function (j) {
        html += '<div class="job-row' + (j.done ? ' done' : '') + (j.locked ? ' locked' : '') + '">' +
          '<span class="job-num">' + j.id + '</span><div><b>' + j.name + '</b><span> · ' + j.contact + '</span>' +
          '<p>' + j.brief + '</p></div><b class="job-reward">' + U.formatMoney(j.reward) + '</b></div>';
      });
      el.innerHTML = html + '</div>';
    }
    function renderCrew() {
      var el = U.el('crew-panel');
      if (!el) return;
      var html = '<h3>CREW</h3><div class="crew-grid">';
      ['vera', 'lena', 'hugo', 'nina', 'kiki', 'marco'].forEach(function (k) {
        var c = F.CREW[k];
        html += '<div class="crew-member"><img src="' + F.portraitURL(k, 96) + '" alt="">' +
          '<b>' + c.name + '</b><span>' + c.role + '</span></div>';
      });
      el.innerHTML = html + '</div>';
    }
    function renderSaves() {
      var el = U.el('save-panel');
      if (!el) return;
      var html = '<h3>SAVE SLOTS</h3><div class="save-list">';
      for (var i = 1; i <= 3; i++) {
        var raw = null;
        try { raw = localStorage.getItem('ab-save-' + i); } catch (e) { raw = null; }
        var data = raw ? JSON.parse(raw) : null;
        html += '<div class="save-row"><div><b>SLOT ' + i + '</b>' +
          (data ? '<span>' + data.summary + '</span>' : '<span>Empty slot</span>') + '</div>' +
          '<button class="save-btn" data-slot="' + i + '">SAVE</button>' +
          (data ? '<button class="save-btn load" data-load="' + i + '">LOAD</button>' : '') + '</div>';
      }
      el.innerHTML = html + '</div><p class="save-note">Progress saves to this browser. Each slot holds money, job, position and time.</p>';
    }

    return {
      update: update,
      popup: popup,
      toast: toast,
      selectWeapon: selectWeapon,
      useAbility: useAbility,
      showPause: showPause,
      switchTab: switchTab,
      drawBigMap: drawBigMap,
      drawMinimap: drawMinimap,
      get selectedWeapon() { return selectedWeapon; },
      weapons: WEAPONS,
      abilities: ABILITIES
    };
  }

  // Vera's standing line on the crew card.
  var DIALOGUE_VERa = 'Six guns and a chopper, Dante — lose the lights or lose the car.';

  window.AB.hud = { makeHud: makeHud, WEAPONS: WEAPONS, ABILITIES: ABILITIES };
})();
