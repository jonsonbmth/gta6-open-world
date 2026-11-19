// SOLMAR BAY — HUD: dense four-corner panels, round minimap, dialogue bar,
// toasts and the full AAA city map. DOM writes are cached (only changed text
// is written) and the minimap redraws every second frame.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var U = SB.utils;

  var last = {};
  var frame = 0;
  var dialogueTimer = 0;
  var toastTimer = 0;
  var actionTimer = 0;

  var NAMES = {
    rico: 'Rico Marín', lena: 'Lena "Wrench" Ortiz',
    rosa: 'Mama Rosa', dario: 'Dario "Fuze" Kane'
  };

  function setText(id, value) {
    if (last[id] === value) return;
    last[id] = value;
    var e = U.$(id);
    if (e) e.textContent = value;
  }

  function setStars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    setText('sp-stars', s);
    setText('sp-wanted', n > 0 ? 'WANTED ' + s : 'CLEAN');
    var p = U.$('sp-pursuit');
    if (p) p.style.visibility = n > 0 ? 'visible' : 'hidden';
  }

  function refreshMission() {
    var j = SB.missions.current();
    var s = SB.missions.stage();
    var p = SB.missions.progress();
    setText('mp-chapter', 'CH ' + p.job);
    setText('mp-title', j.title);
    setText('mp-desc', s.text);
    setText('mp-stage', 'STAGE ' + p.stage + '/' + p.stages);
    setText('mp-next', 'NEXT → ' + s.next);
    var bar = U.$('mp-bar');
    if (bar) {
      var kids = bar.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].className = i < p.stage ? 'on' : '';
      }
    }
  }

  function showDialogue(who, line) {
    var box = U.$('dialogue');
    if (!box) return;
    U.drawPortrait(U.$('dlg-portrait'), who);
    setText('dlg-name', NAMES[who] || who);
    setText('dlg-line', line);
    box.classList.remove('hidden');
    dialogueTimer = 6;
  }

  function hideDialogue() {
    var box = U.$('dialogue');
    if (box) box.classList.add('hidden');
    dialogueTimer = 0;
  }

  function toast(text) {
    var t = U.$('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    toastTimer = 4;
  }

  function showAction(text) {
    var t = U.$('action-toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    actionTimer = 1.6;
  }

  function fmtMoney(n) {
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // --- Minimap ------------------------------------------------------------------
  var mm = null, mmCtx = null;
  function minimapInit() {
    mm = U.$('minimap');
    if (mm) mmCtx = mm.getContext('2d');
  }
  function mmXY(x, z) {
    // World x -115..130, z -130..115 -> 220x220 canvas, north up.
    return [(x + 115) / 245 * 220, (z + 130) / 245 * 220];
  }
  function drawMinimap(gs) {
    if (!mmCtx) return;
    var g = mmCtx;
    g.clearRect(0, 0, 220, 220);
    g.save();
    g.beginPath(); g.arc(110, 110, 108, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#0a1230'; g.fillRect(0, 0, 220, 220);
    // Bay (east).
    g.fillStyle = '#0e2a52';
    var bx = mmXY(132, 0)[0];
    g.fillRect(bx, 0, 220 - bx, 220);
    // Blocks.
    g.fillStyle = '#141c38';
    g.fillRect(8, 8, 204, 204);
    // Roads.
    g.strokeStyle = '#3a4a7a'; g.lineWidth = 5; g.lineCap = 'round';
    SB.world.AVENUES.forEach(function (x) {
      var p = mmXY(x, -130), q = mmXY(x, 115);
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
    });
    SB.world.STREETS.forEach(function (z) {
      var p = mmXY(-115, z), q = mmXY(130, z);
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
    });
    // Solmar Avenue highlight.
    g.strokeStyle = '#ffd21f'; g.lineWidth = 2;
    var s0 = mmXY(0, -130), s1 = mmXY(0, 115);
    g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.stroke();
    // GPS route (Manhattan path to the target).
    var t = SB.missions.target();
    if (t) {
      var p0 = mmXY(gs.x, gs.z), p1 = mmXY(t.x, gs.z), p2 = mmXY(t.x, t.z);
      g.strokeStyle = '#00e5ff'; g.lineWidth = 3; g.setLineDash([6, 4]);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffd21f';
      g.beginPath(); g.arc(p2[0], p2[1], 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = 1.5; g.stroke();
    }
    // Police blips.
    SB.police.units().forEach(function (u, i) {
      var p = mmXY(u.group.position.x, u.group.position.z);
      g.fillStyle = i % 2 ? '#ff2020' : '#2a55ff';
      g.beginPath(); g.arc(p[0], p[1], 4, 0, Math.PI * 2); g.fill();
    });
    // Player arrow (rotated by heading, north = -y on the map).
    var pp = mmXY(gs.x, gs.z);
    g.save();
    g.translate(pp[0], pp[1]);
    g.rotate(Math.atan2(Math.sin(gs.heading), -Math.cos(gs.heading)) + Math.PI / 2);
    g.fillStyle = '#ff2a2a';
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    g.restore();
    g.restore();
    // Round frame ring.
    g.strokeStyle = '#ffd21f'; g.lineWidth = 3;
    g.beginPath(); g.arc(110, 110, 108, 0, Math.PI * 2); g.stroke();
  }

  // --- Full city map --------------------------------------------------------------
  var big = null, bigCtx = null;
  function bigmapInit() {
    big = U.$('bigmap');
    if (big) bigCtx = big.getContext('2d');
  }
  var MAP = { x0: 40, y0: 34, s: 2.55, wx0: -115, wz0: -130 };
  function bmXY(x, z) {
    return [MAP.x0 + (x - MAP.wx0) * MAP.s, MAP.y0 + (z - MAP.wz0) * MAP.s];
  }
  function drawBigMap(gs) {
    if (!bigCtx) return;
    var g = bigCtx;
    var W = big.width, H = big.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#070d26';
    g.fillRect(0, 0, W, H);
    // Grid A-H / 1-6.
    g.fillStyle = '#8a94b8';
    g.font = '700 15px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    var cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (var ci = 0; ci < 8; ci++) {
      g.fillText(cols[ci], MAP.x0 + (ci + 0.5) * (260 * MAP.s / 8), 20);
    }
    g.textAlign = 'left';
    for (var ri = 0; ri < 6; ri++) {
      g.fillText(String(ri + 1), 12, MAP.y0 + (ri + 0.5) * (245 * MAP.s / 6) + 5);
    }
    // Land base.
    var land = bmXY(132, 115);
    g.fillStyle = '#0d1734';
    g.fillRect(MAP.x0, MAP.y0, land[0] - MAP.x0, bmXY(0, 115)[1] - MAP.y0);
    // Bay + island + bridge.
    g.fillStyle = '#0e2a52';
    g.fillRect(land[0], MAP.y0, W - 40 - land[0], bmXY(0, 115)[1] - MAP.y0);
    var isl = bmXY(168, 10);
    g.fillStyle = '#12264a';
    g.beginPath(); g.ellipse(isl[0], isl[1], 42, 16, -0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7ad9ff'; g.font = '700 14px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('PELICAN ISLE', isl[0], isl[1] - 24);
    var b0 = bmXY(132, 40), b1 = bmXY(160, 16);
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.stroke();
    g.fillStyle = '#cfe3ff'; g.font = '700 13px "Segoe UI", Arial, sans-serif';
    g.fillText('HARBOR BRIDGE', (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 - 8);
    g.fillStyle = '#4a6a9a'; g.font = '800 22px "Segoe UI", Arial, sans-serif';
    g.fillText('SOLMAR BAY', land[0] + 90, bmXY(0, 100)[1]);
    // District zones (dashed).
    var zones = [
      { n: 'CROWN HEIGHTS', x0: -110, z0: -128, x1: -6, z1: -46, c: '#b06fd8' },
      { n: 'MIRAMAR', x0: 8, z0: -128, x1: 108, z1: -46, c: '#ff7a3d' },
      { n: 'VELA QUARTER', x0: -110, z0: -34, x1: -46, z1: 34, c: '#ffd21f' },
      { n: 'DOCKSIDE', x0: 46, z0: -34, x1: 108, z1: 34, c: '#3dff7a' },
      { n: 'PALM ROW', x0: -110, z0: 46, x1: -6, z1: 110, c: '#ff2d95' },
      { n: 'HARBOUR LIGHTS', x0: 46, z0: 46, x1: 108, z1: 110, c: '#00e5ff' },
      { n: 'OLD PIER', x0: 100, z0: 20, x1: 128, z1: 92, c: '#7ad9ff' }
    ];
    zones.forEach(function (zn) {
      var p0 = bmXY(zn.x0, zn.z0), p1 = bmXY(zn.x1, zn.z1);
      g.strokeStyle = zn.c; g.lineWidth = 1.6; g.setLineDash([7, 5]);
      g.strokeRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
      g.setLineDash([]);
      g.fillStyle = zn.c;
      g.globalAlpha = 0.08;
      g.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
      g.globalAlpha = 1;
      g.font = '800 14px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText(zn.n, (p0[0] + p1[0]) / 2, p1[1] - 8);
    });
    // Ring highway.
    var r0 = bmXY(-100, -115), r1 = bmXY(118, 100);
    g.strokeStyle = '#ffd21f'; g.lineWidth = 4;
    g.beginPath();
    g.roundRect(r0[0], r0[1], r1[0] - r0[0], r1[1] - r0[1], 26);
    g.stroke();
    // Streets.
    g.lineCap = 'round';
    SB.world.AVENUES.forEach(function (x) {
      var p0 = bmXY(x, -130), p1 = bmXY(x, 115);
      g.strokeStyle = x === 0 ? '#e8ecff' : '#5a6a9a';
      g.lineWidth = x === 0 ? 4 : 2.5;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    });
    SB.world.STREETS.forEach(function (z) {
      var p0 = bmXY(-115, z), p1 = bmXY(130, z);
      g.strokeStyle = '#5a6a9a'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    });
    // Street names (placed to avoid the zone labels).
    g.fillStyle = '#dbe7ff'; g.font = '700 13px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    function streetLabel(txt, x, z, vertical) {
      var p = bmXY(x, z);
      g.save();
      g.translate(p[0], p[1]);
      if (vertical) g.rotate(-Math.PI / 2);
      g.fillText(txt, 0, 0);
      g.restore();
    }
    streetLabel('SOLMAR AVENUE', 3, -10, true);
    streetLabel('CROWN ROAD', -40, -100, false);
    streetLabel('VELA STREET', -70, -40, false);
    streetLabel('CANAL STREET', 28, -80, false);
    streetLabel('PALM BOULEVARD', -60, 80, false);
    streetLabel('HARBOUR WAY', 80, 60, true);
    // Landmarks. Anchors are kept clear of the street labels above and of
    // each other (labels are ~110 px wide at this scale).
    var marks = [
      { n: 'CROWN TOWER', x: -60, z: -90, s: '▲' },
      { n: 'MIRAMAR BEACH', x: 92, z: -98, s: '●' },
      { n: "LENA'S WORKSHOP", x: 52, z: -20, s: '⚙' },
      { n: 'VELA MARKET', x: -12, z: -40, s: '◆' },
      { n: 'DOCKSIDE YARD', x: 80, z: 0, s: '■' },
      { n: 'PALM ROW PLAZA', x: -60, z: 96, s: '★' },
      { n: 'LIGHTHOUSE', x: 118, z: -100, s: '▲', lx: -30 },
      { n: 'OLD PIER', x: 116, z: 74, s: '⚓' }
    ];
    marks.forEach(function (mk) {
      var p = bmXY(mk.x, mk.z);
      g.fillStyle = '#ffd21f'; g.font = '16px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText(mk.s, p[0], p[1] - 4);
      g.fillStyle = '#ffffff'; g.font = '700 12px "Segoe UI", Arial, sans-serif';
      g.fillText(mk.n, p[0] + (mk.lx || 0), p[1] + 12);
    });
    // GPS route + ETA box.
    var t = SB.missions.target();
    if (t) {
      var q0 = bmXY(gs.x, gs.z), q1 = bmXY(t.x, gs.z), q2 = bmXY(t.x, t.z);
      g.strokeStyle = '#00e5ff'; g.lineWidth = 4; g.setLineDash([10, 6]);
      g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffd21f';
      g.beginPath(); g.arc(q2[0], q2[1], 8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
      var dist = Math.round(Math.hypot(t.x - gs.x, t.z - gs.z));
      var eta = Math.max(1, Math.round(dist / 28));
      var bx = Math.min(q2[0] + 14, W - 190), by = Math.max(q2[1] - 40, 40);
      g.fillStyle = 'rgba(6,8,20,0.9)';
      g.fillRect(bx, by, 168, 34);
      g.strokeStyle = '#00e5ff'; g.lineWidth = 1.5; g.strokeRect(bx, by, 168, 34);
      g.fillStyle = '#00e5ff'; g.font = '800 16px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'left';
      g.fillText(dist + ' m  ·  ' + eta + ' min', bx + 12, by + 23);
    }
    // Police blips + player arrow.
    SB.police.units().forEach(function (u, i) {
      var p = bmXY(u.group.position.x, u.group.position.z);
      g.fillStyle = i % 2 ? '#ff2020' : '#2a55ff';
      g.beginPath(); g.arc(p[0], p[1], 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    });
    var pp = bmXY(gs.x, gs.z);
    g.save();
    g.translate(pp[0], pp[1]);
    g.rotate(Math.atan2(Math.sin(gs.heading), -Math.cos(gs.heading)) + Math.PI / 2);
    g.fillStyle = '#ff2a2a';
    g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 4); g.lineTo(-9, 10); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    g.restore();
    g.fillStyle = '#fff'; g.font = '800 13px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    // Above the arrow: below it the label collides with the OLD PIER label
    // when Rico stands on the quay.
    g.fillText('RICO', pp[0], pp[1] - 22);
    // Wanted stars top-left + compass top-right + legend.
    var stars = SB.police.wanted();
    g.fillStyle = 'rgba(6,8,20,0.85)';
    g.fillRect(MAP.x0 + 8, MAP.y0 + 8, 150, 34);
    g.fillStyle = '#ffd21f'; g.font = '20px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'left';
    var ss = '';
    for (var i = 0; i < 5; i++) ss += i < stars ? '★' : '☆';
    g.fillText(ss, MAP.x0 + 18, MAP.y0 + 33);
    var cx = W - 78, cy = MAP.y0 + 34;
    g.strokeStyle = '#ffd21f'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff2a2a';
    g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx + 6, cy + 8); g.lineTo(cx - 6, cy + 8); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = '800 13px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('N', cx, cy - 30);
    var lx = W - 218, ly = MAP.y0 + 84;
    g.fillStyle = 'rgba(6,8,20,0.9)';
    g.fillRect(lx, ly, 190, 118);
    g.strokeStyle = '#ffd21f'; g.lineWidth = 1.5; g.strokeRect(lx, ly, 190, 118);
    g.fillStyle = '#ffd21f'; g.font = '800 14px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'left';
    g.fillText('LEGEND', lx + 12, ly + 22);
    var items = [
      ['#00e5ff', 'GPS route'], ['#ffd21f', 'Mission target'],
      ['#ff2a2a', 'Rico'], ['#2a55ff', 'Police'], ['#0e2a52', 'Water / bay']
    ];
    g.font = '700 13px "Segoe UI", Arial, sans-serif';
    items.forEach(function (it, i) {
      g.fillStyle = it[0];
      g.fillRect(lx + 12, ly + 34 + i * 17, 12, 12);
      g.fillStyle = '#fff';
      g.fillText(it[1], lx + 30, ly + 45 + i * 17);
    });
  }

  function openMap(gs) {
    var ov = U.$('map-overlay');
    if (!ov) return;
    ov.classList.remove('hidden');
    drawBigMap(gs);
  }
  function closeMap() {
    var ov = U.$('map-overlay');
    if (ov) ov.classList.add('hidden');
  }
  function mapOpen() {
    var ov = U.$('map-overlay');
    return !!(ov && !ov.classList.contains('hidden'));
  }

  // --- Per-frame HUD update -------------------------------------------------------
  function update(dt, gs) {
    frame++;
    if (dialogueTimer > 0) {
      dialogueTimer -= dt;
      if (dialogueTimer <= 0) hideDialogue();
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) { var t = U.$('toast'); if (t) t.classList.remove('show'); }
    }
    if (actionTimer > 0) {
      actionTimer -= dt;
      if (actionTimer <= 0) { var a = U.$('action-toast'); if (a) a.classList.remove('show'); }
    }
    setText('sp-money', fmtMoney(gs.money));
    setStars(gs.wanted);
    setText('sp-day', 'DAY 1 · ' + gs.clock);
    setText('nav-district', gs.district);
    setText('nav-respect', 'RESPECT ' + gs.respectLevel + ' · ' + gs.respect + ' / 1000');
    var rb = U.$('nav-respect-bar');
    if (rb) rb.style.width = Math.min(100, gs.respect / 10) + '%';
    setText('vp-radio', gs.station);
    setText('vp-song', gs.song);
    setText('vp-car', gs.carName);
    setText('vp-cond', Math.round(gs.condition) + '%');
    var cb = U.$('vp-cond-bar');
    if (cb) cb.style.width = Math.round(gs.condition) + '%';
    var kmh = Math.round(Math.abs(gs.speedKmh));
    var sp = U.$('vp-speed');
    if (sp && last.speed !== kmh) {
      last.speed = kmh;
      sp.innerHTML = kmh + ' <small>KM/H</small>';
    }
    setText('vp-gear', gs.inCar ? ('GEAR ' + gs.gear) : 'ON FOOT');
    // Minimap every 2nd frame.
    if (frame % 2 === 0) drawMinimap(gs);
    // Keep the big map live while it is open.
    if (mapOpen()) drawBigMap(gs);
  }

  function getState(gs) {
    return {
      money: gs.money, wanted: gs.wanted, speedKmh: gs.speedKmh,
      job: SB.missions.progress().job, stage: SB.missions.progress().stage,
      district: gs.district, carName: gs.carName, inCar: gs.inCar,
      clock: gs.clock, mapOpen: mapOpen()
    };
  }

  function init() {
    minimapInit();
    bigmapInit();
  }

  SB.hud = {
    init: init, update: update, refreshMission: refreshMission,
    showDialogue: showDialogue, hideDialogue: hideDialogue,
    toast: toast, showAction: showAction, openMap: openMap,
    closeMap: closeMap, mapOpen: mapOpen, drawBigMap: drawBigMap,
    getState: getState, fmtMoney: fmtMoney
  };
})();
