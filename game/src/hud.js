// SOLMAR BAY — the HUD: dense four-corner DOM panels plus a round rotating
// minimap. DOM writes are cached (only changed text is touched) and the
// minimap redraws every 2nd frame.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;

  var H = {
    els: {},
    cache: {},
    minimapBase: null,
    frame: 0,
    dialogueTimer: null,
    floatQueue: [],
  };

  function $(id) { return document.getElementById(id); }

  // Set text only when it changed — avoids layout thrash every frame.
  function setText(id, value) {
    if (H.cache[id] === value) return;
    H.cache[id] = value;
    var el = H.els[id];
    if (el) el.textContent = value;
  }

  function setWidth(id, pct) {
    var key = id + '|w';
    var v = Math.round(pct);
    if (H.cache[key] === v) return;
    H.cache[key] = v;
    var el = H.els[id];
    if (el) el.style.width = v + '%';
  }

  H.init = function () {
    ['hud-mission-title', 'hud-mission-desc', 'hud-stage', 'hud-stage-bar',
     'hud-next', 'hud-clock', 'hud-cash', 'hud-stars', 'hud-wanted',
     'hud-district', 'hud-respect', 'hud-respect-bar', 'hud-radio',
     'hud-song', 'hud-car', 'hud-condition', 'hud-condition-bar',
     'hud-speed', 'hud-gear', 'hud-float', 'hud-dialogue', 'hud-dialogue-name',
     'hud-dialogue-text', 'hud-dialogue-portrait', 'hud-objective-flash'
    ].forEach(function (id) { H.els[id] = $(id); });
    H.minimap = $('minimap');
    if (H.minimap) H.minimapCtx = H.minimap.getContext('2d');
    H.buildMinimapBase();
  };

  // Pre-render the static city base for the minimap once.
  H.buildMinimapBase = function () {
    var c = U.canvas(360, 360);
    var ctx = c.getContext('2d');
    // Land.
    ctx.fillStyle = '#18204a';
    ctx.fillRect(0, 0, 360, 360);
    // Bay (east).
    var bayGrad = ctx.createLinearGradient(300, 0, 360, 0);
    bayGrad.addColorStop(0, '#0e4a72');
    bayGrad.addColorStop(1, '#0a3350');
    ctx.fillStyle = bayGrad;
    ctx.fillRect(300, 0, 60, 360);
    // Districts, faint.
    C.districts.forEach(function (d) {
      ctx.fillStyle = d.color + '44';
      ctx.fillRect(H.mapX(d.x - d.w / 2), H.mapZ(d.z - d.h / 2), d.w * 360 / 340, d.h * 360 / 400);
    });
    // Ring highway.
    ctx.strokeStyle = '#e8c85a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(180, 180, 165, 175, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Avenue + streets.
    ctx.strokeStyle = '#5a6a9a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 0); ctx.lineTo(180, 360);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (var z = -160; z <= 160; z += 40) {
      ctx.beginPath();
      ctx.moveTo(0, H.mapZ(z)); ctx.lineTo(360, H.mapZ(z));
      ctx.stroke();
    }
    H.minimapBase = c;
  };

  H.mapX = function (wx) { return ((wx + 170) / 340) * 360; };
  H.mapZ = function (wz) { return ((wz + 200) / 400) * 360; };

  // District under a world position.
  H.districtAt = function (x, z) {
    for (var i = 0; i < C.districts.length; i++) {
      var d = C.districts[i];
      if (Math.abs(x - d.x) < d.w / 2 && Math.abs(z - d.z) < d.h / 2) return d.name;
    }
    return 'LUMEN STRIP';
  };

  // Set HTML only when it changed (used for the mission title badge).
  function setHtml(id, value) {
    if (H.cache[id] === value) return;
    H.cache[id] = value;
    var el = H.els[id];
    if (el) el.innerHTML = value;
  }

  H.showDialogue = function (who, text, delayMs) {
    var show = function () {
      var crew = C.crew[who] || C.crew.rico;
      setText('hud-dialogue-name', crew.name);
      setText('hud-dialogue-text', text);
      var img = H.els['hud-dialogue-portrait'];
      if (img) img.src = SB.textures.portrait(who);
      var box = H.els['hud-dialogue'];
      if (box) box.style.display = 'flex';
      if (H.dialogueTimer) clearTimeout(H.dialogueTimer);
      // In screenshot mode the dialogue stays up for the frame.
      if (SB.shots && SB.shots.mode) return;
      H.dialogueTimer = setTimeout(function () {
        if (box) box.style.display = 'none';
      }, 4200);
    };
    if (delayMs) setTimeout(show, delayMs);
    else show();
  };

  H.floatText = function (text, color) {
    var el = H.els['hud-float'];
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#ffd23f';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1.1)';
    // In screenshot mode the bonus text stays up for the frame.
    if (SB.shots && SB.shots.mode) return;
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-24px) scale(1)';
    }, 1400);
  };

  H.flashObjective = function (text) {
    var el = H.els['hud-objective-flash'];
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(function () { el.style.opacity = '0'; }, 2600);
  };

  // Main per-frame HUD update. state: { cash, respect, wanted, speedKmh,
  // gear, condition, carName, inCar, mission, stage, stageLabel, next,
  // clock, district, radio, song, playerX, playerZ, heading, target }
  H.update = function (dt, state) {
    H.frame++;
    var m = state.mission;
    setHtml('hud-mission-title', m
      ? '<span class="ch">' + m.chapter + '</span>' + m.title
      : 'FREE ROAM');
    setText('hud-mission-desc', m ? m.brief : 'Solmar Bay is yours. Explore, earn, survive.');
    setText('hud-stage', state.stageLabel || '');
    setText('hud-next', 'NEXT → ' + (state.next || 'Explore the city'));
    if (m) setWidth('hud-stage-bar', ((state.stageIndex + 1) / m.stages.length) * 100);
    setText('hud-clock', state.clock || 'DAY 1  22:47');
    setText('hud-cash', '$' + state.cash.toLocaleString('en-US'));
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < state.wanted ? '★' : '☆';
    setText('hud-stars', stars);
    var wantedEl = H.els['hud-wanted'];
    if (wantedEl) {
      wantedEl.style.display = state.wanted > 0 ? 'block' : 'none';
      setText('hud-wanted', state.wanted > 0 ? 'WANTED — PURSUIT ACTIVE' : '');
    }
    setText('hud-district', state.district || 'LUMEN STRIP');
    setText('hud-respect', 'RESPECT ' + Math.floor(state.respect / 200 + 1) + '   ' + Math.floor(state.respect) + ' / 1000');
    setWidth('hud-respect-bar', (state.respect / 1000) * 100);
    setText('hud-radio', state.radio || '');
    setText('hud-song', state.song || '');
    setText('hud-car', state.inCar ? state.carName : 'ON FOOT');
    setText('hud-condition', 'CONDITION ' + Math.round(state.condition) + '%');
    setWidth('hud-condition-bar', state.condition);
    setText('hud-speed', state.inCar ? Math.round(state.speedKmh) + ' KM/H' : '');
    setText('hud-gear', state.inCar ? 'GEAR ' + state.gear : '');

    // Minimap every 2nd frame.
    if (H.frame % 2 === 0) H.drawMinimap(state);
  };

  H.drawMinimap = function (state) {
    var ctx = H.minimapCtx;
    if (!ctx || !H.minimapBase) return;
    var S = 180;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    // Rotate the world so the player always points up.
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-state.heading);
    var px = H.mapX(state.playerX) - 180;
    var pz = H.mapZ(state.playerZ) - 180;
    ctx.drawImage(H.minimapBase, -180 - px, -180 - pz);
    // Mission target blip.
    if (state.target) {
      var tx = H.mapX(state.target.x) - 180 - px;
      var tz = H.mapZ(state.target.z) - 180 - pz;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(tx, tz, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Police blips.
    ctx.fillStyle = '#ff4040';
    (state.policeBlips || []).forEach(function (b) {
      var bx = H.mapX(b.x) - 180 - px;
      var bz = H.mapZ(b.z) - 180 - pz;
      ctx.beginPath();
      ctx.arc(bx, bz, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    // Player arrow (screen space, always up).
    ctx.fillStyle = '#ff2a1a';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2 - 11);
    ctx.lineTo(S / 2 + 7, S / 2 + 8);
    ctx.lineTo(S / 2, S / 2 + 3);
    ctx.lineTo(S / 2 - 7, S / 2 + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Border ring.
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  SB.hud = H;
})();
