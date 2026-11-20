// HUD: the top-10 formula rendered as DOM — mission panel, police dispatch
// board, weapon slots, crew cards, drawn-portrait dialog, round minimap,
// speed/car/radio cluster, motion cues, plus the full city-map screen.
var CV = window.CV || (window.CV = {});

CV.hud = (function () {
  var C = CV.config;
  var el = {};
  var minimapCtx = null, mapCtx = null;
  var cueTimer = 0;
  var lastTextUpdate = 0;

  function $(id) { return document.getElementById(id); }

  function stars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function tacticColor(t) {
    return { RAMMING: '#ff4757', PURSUE: '#ffa502', FLANKING: '#eccc68', SPOTLIGHT: '#70a1ff', ROADBLOCK: '#e84118', FIRING: '#ff6b81', 'CLOSING IN': '#2ed573' }[t] || '#a4b0be';
  }

  function init() {
    ['hud', 'hud-mission', 'hud-dispatch', 'hud-money', 'hud-weapons', 'hud-crew',
     'hud-dialog', 'hud-speed', 'hud-cues', 'hud-hint', 'minimap', 'district',
     'health-bar', 'armor-bar', 'rep-bar', 'map-screen', 'map-canvas',
     'title-screen', 'playtest-results'].forEach(function (id) { el[id] = $(id); });
    if (el.minimap) minimapCtx = el.minimap.getContext('2d');
    if (el['map-canvas']) mapCtx = el['map-canvas'].getContext('2d');
    buildMission();
    buildDispatch();
    buildWeapons();
    buildCrew();
    buildDialog();
    buildMoney();
  }

  function buildMission() {
    var job = CV.missions.currentJob();
    el['hud-mission'].innerHTML =
      '<div class="m-job">JOB ' + (CV.missions.state.jobIndex + 1) + '/8 · ' + job.title + ' <span class="m-timer" id="m-timer">2:47</span></div>' +
      '<div class="m-brief">' + job.brief + '</div>' +
      '<div class="m-stage"><span>STAGE ' + CV.missions.state.stage + '/' + CV.missions.state.stages + '</span>' +
      '<div class="bar"><div class="fill" id="m-stage-fill" style="width:' + (CV.missions.state.stage / CV.missions.state.stages * 100) + '%"></div></div></div>' +
      '<div class="m-next">NEXT &nbsp;' + job.next + '</div>';
  }

  function buildDispatch() {
    var rows = CV.police.dispatchRows();
    var html = '<div class="d-head"><span>CVPD DISPATCH</span><span>6 UNITS · CODE 4</span></div>';
    rows.forEach(function (r) {
      html += '<div class="d-row"><span class="d-call">' + r.call + '</span>' +
        '<span class="d-tactic" style="background:' + tacticColor(r.tactic) + '">' + r.tactic + '</span>' +
        '<span class="d-dist">' + r.dist + ' m</span></div>';
    });
    html += '<div class="d-foot">+2 more units · roadblock ahead</div>';
    el['hud-dispatch'].innerHTML = html;
  }

  function buildWeapons() {
    var html = '';
    C.WEAPONS.forEach(function (w, i) {
      html += '<div class="w-slot' + (w.locked ? ' locked' : '') + (i === 2 ? ' active' : '') + '">' +
        '<span class="w-num">' + (i + 1) + '</span>' +
        '<span class="w-icon">' + (w.locked ? '🔒' : ['✊', '🔫', '🔫', '💣', '🔫', '🚀'][i]) + '</span>' +
        '<span class="w-name">' + w.name + '</span>' +
        '<span class="w-ammo">' + (w.locked ? 'LOCKED' : w.ammo) + '</span></div>';
    });
    el['hud-weapons'].innerHTML = html;
  }

  function buildCrew() {
    var html = '';
    C.CREW.forEach(function (m, idx) {
      html += '<div class="crew-card"><canvas class="crew-port" width="48" height="48" data-port="' + idx + '"></canvas>' +
        '<div><div class="crew-ability"><span class="key">' + m.key + '</span> ' + m.ability + '</div>' +
        '<div class="crew-name">' + m.name.split(' ')[0] + ' · ' + m.role + '</div></div></div>';
    });
    el['hud-crew'].innerHTML = html;
    // paint the drawn portraits into the crew canvases
    el['hud-crew'].querySelectorAll('canvas').forEach(function (cv) {
      var member = C.CREW[parseInt(cv.getAttribute('data-port'), 10)];
      if (member) cv.getContext('2d').drawImage(CV.textures.portrait(member).canvas, 0, 0, 48, 48);
    });
  }

  function buildDialog() {
    var f = C.FIXER;
    el['hud-dialog'].innerHTML =
      '<canvas id="dlg-port" width="64" height="64"></canvas>' +
      '<div><div class="dlg-name">' + f.name + ' <span>' + f.role + '</span></div>' +
      '<div class="dlg-line">' + f.line + '</div></div>';
    var cv = $('dlg-port');
    if (cv) cv.getContext('2d').drawImage(CV.textures.portrait(f).canvas, 0, 0, 64, 64);
  }

  function buildMoney() {
    el['hud-money'].innerHTML =
      '<div class="money-day">' + C.DAY.label + ' ' + C.DAY.time + '</div>' +
      '<div class="money-cash" id="money-cash">$' + CV.missions.state.cash.toLocaleString('en-US') + '</div>' +
      '<div class="money-stars">' + stars(C.PLAYER.wanted) + '</div>' +
      '<div class="money-sight">IN SIGHT · AIR-3</div>';
  }

  function showCue(main, sub) {
    el['hud-cues'].innerHTML = '<div class="cue-main">' + main + '</div><div class="cue-sub">' + (sub || '') + '</div>';
    el['hud-cues'].style.opacity = '1';
    cueTimer = 2.2;
  }

  // ---- Minimap (round canvas, north up, GPS route + blips).
  function drawMinimap(hero, police, checkpoints, cpIndex) {
    if (!minimapCtx) return;
    var g = minimapCtx, S = 150, R = 120; // world radius shown
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#101c26'; g.fillRect(0, 0, S, S);
    var px = function (x) { return S / 2 + (x - hero.x) / R * (S / 2); };
    var py = function (z) { return S / 2 + (z - hero.z) / R * (S / 2); };
    // ocean + beach (east)
    g.fillStyle = '#1f7fb8'; g.fillRect(px(C.OCEAN_X), 0, S, S);
    g.fillStyle = '#e8c88f'; g.fillRect(px(C.BEACH.x0), 0, px(C.OCEAN_X) - px(C.BEACH.x0), S);
    // roads
    g.strokeStyle = '#4a5a6a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(px(C.AVENUE_X), 0); g.lineTo(px(C.AVENUE_X), S); g.stroke();
    [-120, -80, -40, 0, 40].forEach(function (x) {
      g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), S); g.stroke();
    });
    [-160, -120, -80, -40, 0, 40, 80, 120].forEach(function (z) {
      g.beginPath(); g.moveTo(0, py(z)); g.lineTo(S, py(z)); g.stroke();
    });
    // GPS route: hero -> remaining checkpoints
    g.strokeStyle = '#39ff88'; g.lineWidth = 3; g.setLineDash([6, 4]);
    g.beginPath(); g.moveTo(px(hero.x), py(hero.z));
    for (var i = cpIndex; i < checkpoints.length; i++) g.lineTo(px(checkpoints[i].x), py(checkpoints[i].z));
    g.stroke(); g.setLineDash([]);
    // checkpoints
    checkpoints.forEach(function (cp, i) {
      if (i < cpIndex) return;
      g.fillStyle = i === cpIndex ? '#39ff88' : '#e8c33d';
      g.beginPath(); g.arc(px(cp.x), py(cp.z), i === cpIndex ? 6 : 4, 0, Math.PI * 2); g.fill();
    });
    // police blips
    g.fillStyle = '#4d8dff';
    police.forEach(function (u) {
      g.beginPath(); g.arc(px(u.state.x), py(u.state.z), 3.5, 0, Math.PI * 2); g.fill();
    });
    // hero arrow
    g.save();
    g.translate(px(hero.x), py(hero.z));
    g.rotate(Math.atan2(Math.sin(hero.heading), Math.cos(hero.heading)));
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.restore();
    g.restore();
    // ring + N
    g.strokeStyle = '#f5c518'; g.lineWidth = 3;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 12px Arial'; g.textAlign = 'center';
    g.fillText('N', S / 2, 14);
  }

  // ---- Full city-map screen (M): districts, landmarks, GPS route, stats.
  function drawMapScreen(hero, cpIndex) {
    if (!mapCtx) return;
    var g = mapCtx, W = 640, H = 520;
    var X0 = -190, X1 = 200, Z0 = -230, Z1 = 240;
    var px = function (x) { return 30 + (x - X0) / (X1 - X0) * (W - 60); };
    var py = function (z) { return 24 + (z - Z0) / (Z1 - Z0) * (H - 60); };
    g.fillStyle = '#0d1822'; g.fillRect(0, 0, W, H);
    // ocean
    g.fillStyle = '#1668a0'; g.fillRect(px(C.OCEAN_X), 0, W - px(C.OCEAN_X), H);
    g.fillRect(0, py(230), W, H - py(230));
    // beach
    g.fillStyle = '#d9b878'; g.fillRect(px(C.BEACH.x0), 0, px(C.OCEAN_X) - px(C.BEACH.x0), H);
    // districts
    C.DISTRICTS.forEach(function (d) {
      g.fillStyle = d.color + '33';
      g.fillRect(px(d.x0), py(d.z0), px(d.x1) - px(d.x0), py(d.z1) - py(d.z0));
      g.strokeStyle = d.color; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      g.strokeRect(px(d.x0), py(d.z0), px(d.x1) - px(d.x0), py(d.z1) - py(d.z0));
      g.setLineDash([]);
      g.fillStyle = d.color; g.font = 'bold 13px Arial'; g.textAlign = 'left';
      g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 3;
      g.strokeText(d.name, px(d.x0) + 6, py(d.z0) + 18);
      g.fillText(d.name, px(d.x0) + 6, py(d.z0) + 18);
      g.font = '10px Arial'; g.fillStyle = '#ffffff';
      g.strokeText(d.sub, px(d.x0) + 6, py(d.z0) + 32);
      g.fillText(d.sub, px(d.x0) + 6, py(d.z0) + 32);
    });
    // roads
    g.strokeStyle = '#5a6a7a'; g.lineWidth = 3;
    [C.AVENUE_X, -120, -80, -40, 0, 40].forEach(function (x) {
      g.beginPath(); g.moveTo(px(x), py(Z0)); g.lineTo(px(x), py(Z1)); g.stroke();
    });
    [-160, -120, -80, -40, 0, 40, 80, 120].forEach(function (z) {
      g.beginPath(); g.moveTo(px(X0), py(z)); g.lineTo(px(X1), py(z)); g.stroke();
    });
    // grid letters + numbers
    g.fillStyle = '#8fa3b0'; g.font = '11px Arial'; g.textAlign = 'center';
    'ABCDEFGH'.split('').forEach(function (ch, i) { g.fillText(ch, px(X0) + (i + 0.5) * (W - 60) / 8, 14); });
    for (var r = 0; r < 6; r++) g.fillText(String(r + 1), 12, py(Z0) + (r + 0.5) * (H - 60) / 6);
    // landmarks
    C.LANDMARKS.forEach(function (lm) {
      g.fillStyle = '#ffc53d';
      g.beginPath(); g.moveTo(px(lm.x), py(lm.z) - 7); g.lineTo(px(lm.x) + 6, py(lm.z) + 5); g.lineTo(px(lm.x) - 6, py(lm.z) + 5); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.font = '10px Arial'; g.textAlign = 'left';
      g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 3;
      g.strokeText(lm.name, px(lm.x) + 9, py(lm.z) + 4);
      g.fillText(lm.name, px(lm.x) + 9, py(lm.z) + 4);
    });
    // GPS route + checkpoints
    g.strokeStyle = '#39ff88'; g.lineWidth = 3; g.setLineDash([8, 5]);
    g.beginPath(); g.moveTo(px(hero.x), py(hero.z));
    for (var i = cpIndex; i < C.CHECKPOINTS.length; i++) g.lineTo(px(C.CHECKPOINTS[i].x), py(C.CHECKPOINTS[i].z));
    g.stroke(); g.setLineDash([]);
    C.CHECKPOINTS.forEach(function (cp, i) {
      g.fillStyle = i === cpIndex ? '#39ff88' : '#e8c33d';
      g.beginPath(); g.arc(px(cp.x), py(cp.z), 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#0d1822'; g.font = 'bold 10px Arial'; g.textAlign = 'center';
      g.fillText(String(i + 1), px(cp.x), py(cp.z) + 3);
    });
    // player arrow
    g.save();
    g.translate(px(hero.x), py(hero.z));
    g.rotate(Math.atan2(Math.sin(hero.heading), Math.cos(hero.heading)));
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill();
    g.restore();
    // compass + scale
    g.fillStyle = '#ffffff'; g.font = 'bold 14px Arial'; g.textAlign = 'right';
    g.fillText('N ↑', W - 14, 44);
    g.fillStyle = '#ffffff'; g.fillRect(30, H - 16, 60, 3);
    g.font = '11px Arial'; g.textAlign = 'left';
    g.fillText('100 m', 30, H - 22);
    // footer: GPS distance + ETA
    var d = CV.missions.distanceToCheckpoint(hero);
    g.fillStyle = '#39ff88'; g.font = 'bold 13px Arial'; g.textAlign = 'center';
    g.fillText('GPS ' + (d / 1000).toFixed(2) + ' KM · ETA ' + Math.max(1, Math.round(d / 220)) + ' MIN', W / 2, H - 6);
  }

  function fillMapPanels() {
    var m = CV.missions.state;
    var pct = Math.round((m.jobsDone / 8) * 100);
    $('map-complete').textContent = pct + '%';
    $('map-rank').textContent = 'RANK ' + C.PLAYER.repLevel + ' · ' + C.PLAYER.repRank;
    $('map-rep').textContent = m.rep.toLocaleString('en-US') + ' RP';
    $('map-cash').textContent = '$' + m.cash.toLocaleString('en-US');
    $('map-jobs').textContent = m.jobsDone + '/8';
    $('map-drift').textContent = m.bestDrift + ' pts';
    $('map-near').textContent = m.nearMiss;
    var slots = CV.save.listSlots();
    var html = '';
    slots.forEach(function (s, i) {
      html += '<div class="save-row"><span>SLOT ' + (i + 1) + ' · ' + (s ? ('$' + s.cash.toLocaleString('en-US') + ' · ' + s.jobsDone + '/8 jobs') : 'EMPTY') + '</span><button data-slot="' + (i + 1) + '">SAVE</button></div>';
    });
    $('map-saves').innerHTML = html;
  }

  // The HUD shows only when neither the title nor the map screen is up
  // (both are full-screen; the HUD would ghost through their translucency).
  function syncHud() {
    var titleOn = el['title-screen'].style.display === 'flex';
    var mapOn = el['map-screen'].style.display === 'flex';
    el.hud.style.display = (titleOn || mapOn) ? 'none' : '';
  }

  function showMap(hero, cpIndex) {
    el['map-screen'].style.display = 'flex';
    syncHud();
    drawMapScreen(hero, cpIndex);
    fillMapPanels();
  }
  function hideMap() {
    el['map-screen'].style.display = 'none';
    syncHud();
  }
  function mapVisible() { return el['map-screen'].style.display === 'flex'; }
  function showTitle() {
    el['title-screen'].style.display = 'flex';
    syncHud();
  }
  function hideTitle() {
    el['title-screen'].style.display = 'none';
    syncHud();
  }

  function update(dt, game) {
    // Motion-cue fade.
    if (cueTimer > 0) {
      cueTimer -= dt;
      if (cueTimer <= 0) el['hud-cues'].style.opacity = '0';
    }
    // The minimap + district follow the feet on foot, the car while driving.
    var who = (game.mode === 'onfoot' || game.mode === 'marina') ? game.foot : game.hero;
    // Text updates at ~10 Hz.
    lastTextUpdate += dt;
    if (lastTextUpdate < 0.1) {
      drawMinimap(who, CV.police.units, C.CHECKPOINTS, CV.missions.state.checkpoint);
      return;
    }
    lastTextUpdate = 0;
    var m = CV.missions.state;
    var timerEl = $('m-timer');
    if (timerEl) timerEl.textContent = CV.missions.timerText();
    var cashEl = $('money-cash');
    if (cashEl) cashEl.textContent = '$' + m.cash.toLocaleString('en-US');
    // Dispatch distances (live).
    var rows = CV.police.dispatchRows();
    var dRows = el['hud-dispatch'].querySelectorAll('.d-row');
    rows.forEach(function (r, i) {
      if (dRows[i]) dRows[i].querySelector('.d-dist').textContent = r.dist + ' m';
    });
    // Speed cluster.
    var hero = game.hero;
    $('speed-num').textContent = hero.kmh();
    $('speed-car').textContent = C.CAR.name;
    $('cond-fill').style.width = C.CAR.condition + '%';
    $('cond-num').textContent = C.CAR.condition + '%';
    // District + bars follow the feet on foot, the car while driving.
    var d = CV.world.districtAt(who.x, who.z);
    el.district.innerHTML = '<b>' + d.name + '</b><span>' + d.sub + '</span>';
    el['health-bar'].style.width = C.PLAYER.health + '%';
    el['armor-bar'].style.width = C.PLAYER.armor + '%';
    el['rep-bar'].style.width = (m.rep / C.PLAYER.repMax * 100) + '%';
    $('rep-text').textContent = 'REP ' + C.PLAYER.repLevel + ' · ' + C.PLAYER.repRank + ' — ' + m.rep + ' / ' + C.PLAYER.repMax + ' XP';
    drawMinimap(who, CV.police.units, C.CHECKPOINTS, m.checkpoint);
    if (mapVisible()) drawMapScreen(hero, m.checkpoint);
  }

  return {
    init: init, update: update, showCue: showCue, showMap: showMap, hideMap: hideMap,
    mapVisible: mapVisible, showTitle: showTitle, hideTitle: hideTitle,
    drawMinimap: drawMinimap, drawMapScreen: drawMapScreen,
  };
})();
