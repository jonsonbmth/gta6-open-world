// HUD: mission panel, VBPD dispatch, weapon slots, crew cards, money +
// wanted stars, circular minimap, health/armor, dialog with DRAWN character
// portraits (canvas faces, never letter avatars), speed + car + radio,
// drift/near-miss popups, title screen and pause map menu.

(function () {
  'use strict';
  const U = VB.util;
  const C = VB.CONFIG;

  // --- Drawn portraits (procedural 2D faces) ---
  function drawPortrait(canvas, person) {
    const g = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    // Background wash.
    g.fillStyle = person.bg || '#2a4a6a';
    g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.44;
    // Neck + shoulders.
    g.fillStyle = person.skin;
    g.fillRect(cx - 9, cy + 22, 18, 16);
    g.fillStyle = person.shirt;
    g.beginPath();
    g.moveTo(6, H); g.quadraticCurveTo(cx, H - 34, W - 6, H); g.closePath(); g.fill();
    // Face.
    g.fillStyle = person.skin;
    g.beginPath(); g.ellipse(cx, cy, 22, 26, 0, 0, Math.PI * 2); g.fill();
    // Hair.
    g.fillStyle = person.hair;
    g.beginPath();
    g.ellipse(cx, cy - 14, 23, 16, 0, Math.PI, 0);
    g.fill();
    if (person.hairStyle === 'mohawk') {
      g.beginPath(); g.ellipse(cx, cy - 26, 6, 10, 0, 0, Math.PI * 2); g.fill();
    } else if (person.hairStyle === 'long') {
      g.fillRect(cx - 24, cy - 12, 7, 34);
      g.fillRect(cx + 17, cy - 12, 7, 34);
    } else if (person.hairStyle === 'bald') {
      g.fillStyle = person.skin;
      g.beginPath(); g.ellipse(cx, cy - 16, 20, 10, 0, Math.PI, 0); g.fill();
      g.fillStyle = person.hair;
    }
    // Brows + eyes (or sunglasses).
    if (person.shades) {
      g.fillStyle = '#101018';
      g.fillRect(cx - 18, cy - 6, 16, 9);
      g.fillRect(cx + 2, cy - 6, 16, 9);
      g.fillRect(cx - 2, cy - 4, 4, 3);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(cx - 16, cy - 5, 5, 3);
      g.fillRect(cx + 4, cy - 5, 5, 3);
    } else {
      g.fillStyle = '#1a1a1a';
      g.beginPath(); g.arc(cx - 9, cy - 2, 2.6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 9, cy - 2, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = person.hair;
      g.fillRect(cx - 13, cy - 10, 9, 2.5);
      g.fillRect(cx + 4, cy - 10, 9, 2.5);
    }
    // Nose + mouth.
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(cx - 1.5, cy + 3, 3, 7);
    g.strokeStyle = '#5a2a2a'; g.lineWidth = 2.4;
    g.beginPath();
    if (person.smile === false) { g.moveTo(cx - 8, cy + 16); g.lineTo(cx + 8, cy + 16); }
    else { g.arc(cx, cy + 11, 8, 0.15 * Math.PI, 0.85 * Math.PI); }
    g.stroke();
    // Scar / accessory.
    if (person.scar) {
      g.strokeStyle = 'rgba(120,40,40,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx + 12, cy - 12); g.lineTo(cx + 17, cy - 2); g.stroke();
    }
  }

  const PORTRAITS = {
    fixer: { skin: '#c98a5a', hair: '#e8e8e8', shirt: '#3a5a2a', bg: '#3a2a1a', shades: false, scar: true, smile: false },
    hero: { skin: '#c98a5a', hair: '#1a1a1a', shirt: '#18b7d8', bg: '#1a3a4a', shades: true },
    crew0: { skin: '#e8b88a', hair: '#6a3a1a', shirt: '#e8a33d', bg: '#4a2a3a', shades: true, hairStyle: 'long' },
    crew1: { skin: '#8a5a3a', hair: '#111111', shirt: '#3aa84a', bg: '#2a3a2a', shades: false, hairStyle: 'bald' },
    crew2: { skin: '#f2c9a0', hair: '#2a1a10', shirt: '#d84a9a', bg: '#3a2a4a', shades: false, hairStyle: 'mohawk' },
  };

  // --- Minimap ---
  const MapDraw = {
    draw(canvas, player, cruisers, route) {
      const g = canvas.getContext('2d');
      const S = canvas.width, R = S / 2;
      g.clearRect(0, 0, S, S);
      g.save();
      g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.clip();
      // Land + water.
      g.fillStyle = '#3a4a3a'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#1e6f8e'; g.fillRect(0, 0, S, S * 0.16); // ocean (north)
      g.fillStyle = '#e8c98f'; g.fillRect(0, S * 0.16, S, S * 0.05); // beach
      // Districts.
      const cols = ['#4a5a6a', '#5a4a6a', '#6a5a3a', '#3a5a5a', '#5a6a3a', '#6a4a4a'];
      C.districts.forEach((d, i) => {
        g.fillStyle = cols[i % cols.length];
        const x = ((d.x - d.w / 2 + 160) / 320) * S, y = ((d.z - d.h / 2 + 160) / 320) * S;
        g.fillRect(x, y, (d.w / 320) * S, (d.h / 320) * S);
      });
      // Roads.
      g.strokeStyle = '#222831'; g.lineWidth = 5;
      for (let i = 0; i < 6; i++) {
        const p = (i + 0.5) * S / 6;
        g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
        g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
      }
      g.strokeStyle = '#e8d44d'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const p = (i + 0.5) * S / 6;
        g.setLineDash([6, 6]);
        g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
        g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
        g.setLineDash([]);
      }
      // GPS route (dashed green) to the garage.
      if (route) {
        g.strokeStyle = '#2aff66'; g.lineWidth = 3; g.setLineDash([7, 5]);
        g.beginPath();
        route.forEach((pt, i) => {
          const x = ((pt.x + 160) / 320) * S, y = ((pt.z + 160) / 320) * S;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.stroke(); g.setLineDash([]);
        const last = route[route.length - 1];
        g.fillStyle = '#2aff66';
        g.beginPath(); g.arc(((last.x + 160) / 320) * S, ((last.z + 160) / 320) * S, 6, 0, Math.PI * 2); g.fill();
      }
      // Police dots.
      for (const c of cruisers) {
        const x = ((c.position.x + 160) / 320) * S, y = ((c.position.z + 160) / 320) * S;
        g.fillStyle = '#2a7aff';
        g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
      }
      // Player arrow.
      const px = ((player.x + 160) / 320) * S, py = ((player.z + 160) / 320) * S;
      g.save();
      g.translate(px, py);
      g.rotate(Math.atan2(player.fx, -player.fz));
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill();
      g.strokeStyle = '#18b7d8'; g.lineWidth = 2; g.stroke();
      g.restore();
      g.restore();
      // Ring + N.
      g.strokeStyle = '#ffb52a'; g.lineWidth = 3;
      g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 13px Arial';
      g.textAlign = 'center'; g.fillText('N', R, 16);
    },
  };

  const HUD = {
    els: {},

    build() {
      const $ = (id) => document.getElementById(id);
      this.els = {
        mission: $('mission-panel'), dispatch: $('dispatch-panel'),
        weapons: $('weapon-slots'), crew: $('crew-cards'),
        money: $('money'), clock: $('clock'), stars: $('stars'),
        insight: $('in-sight'), minimap: $('minimap'),
        district: $('district'), street: $('street'),
        health: $('health-fill'), armor: $('armor-fill'),
        rep: $('rep-line'), dialog: $('dialog'),
        dialogFace: $('dialog-face'), dialogName: $('dialog-name'), dialogText: $('dialog-text'),
        speed: $('speed'), carName: $('car-name'), carCond: $('car-cond'), carCondFill: $('car-cond-fill'),
        radio: $('radio'), popup: $('popup'), title: $('title-screen'),
        pause: $('pause-menu'), pauseMap: $('pause-map'),
        hint: $('hint'), debug: $('debug'),
      };
      this.buildMission();
      this.buildDispatch();
      this.buildWeapons();
      this.buildCrew();
      this.buildStars();
      drawPortrait(this.els.dialogFace, PORTRAITS.fixer);
      this.setDialog('fixer');
    },

    buildMission() {
      const m = C.mission;
      this.els.mission.innerHTML =
        '<div class="m-job">' + m.job + ' · <span>' + m.title + '</span></div>' +
        '<div class="m-obj">' + m.objective + '</div>' +
        '<div class="m-row"><span class="m-stage">STAGE ' + m.stage + '/' + m.stages + '</span>' +
        '<span class="m-timer" id="mission-timer">' + U.fmtTime(m.timer) + '</span></div>' +
        '<div class="m-bar"><div class="m-fill" style="width:' + (m.stage / m.stages * 100) + '%"></div></div>' +
        '<div class="m-next">NEXT&nbsp;&nbsp;' + m.next + '</div>';
    },

    buildDispatch() {
      let rows = '';
      for (const u of C.units) {
        rows += '<div class="d-row"><span class="d-id">' + u.id + '</span>' +
          '<span class="d-tac t-' + u.tactic.toLowerCase().replace(' ', '-') + '">' + u.tactic + '</span>' +
          '<span class="d-dist" data-unit="' + u.id + '">' + u.dist + ' m</span></div>';
      }
      this.els.dispatch.innerHTML =
        '<div class="d-head"><span>VBPD DISPATCH</span><span>6 UNITS · CODE 4</span></div>' +
        rows + '<div class="d-foot">+2 more units · roadblock ahead</div>';
    },

    buildWeapons() {
      let html = '';
      for (const w of C.weapons) {
        html += '<div class="w-slot' + (w.active ? ' active' : '') + (w.locked ? ' locked' : '') + '">' +
          '<div class="w-num">' + w.n + '</div>' +
          '<div class="w-ic">' + this.weaponIcon(w.icon) + '</div>' +
          '<div class="w-name">' + w.name + '</div>' +
          '<div class="w-ammo">' + w.ammo + '</div></div>';
      }
      this.els.weapons.innerHTML = html;
    },

    weaponIcon(kind) {
      const paths = {
        fist: 'M6 14h3l2-5h2l-1 5h3l2 2v8H6z',
        pistol: 'M4 8h16v4H9v7H6v-7H4z',
        smg: 'M3 9h18v3H9v3h4v5H9v-5H3z',
        shotgun: 'M2 10h22v3H12v5H9v-5H2z',
        rifle: 'M2 9h24v3H14v3h5v4h-4v-4H8v5H5v-5H2z',
        rpg: 'M2 11h20v4H2zM20 9h4v8h-4z',
      };
      return '<svg viewBox="0 0 28 28" width="26" height="26"><path d="' + (paths[kind] || paths.fist) + '" fill="currentColor"/></svg>';
    },

    buildCrew() {
      let html = '';
      C.crew.forEach((c, i) => {
        html += '<div class="crew-card"><canvas class="crew-face" width="52" height="52" data-crew="' + i + '"></canvas>' +
          '<div><div class="crew-key">' + c.key + '&nbsp; ' + c.skill + '</div>' +
          '<div class="crew-name">' + c.nick + ' · ' + c.role + '</div></div></div>';
      });
      this.els.crew.innerHTML = html;
      this.els.crew.querySelectorAll('canvas').forEach((cv) => {
        drawPortrait(cv, PORTRAITS['crew' + cv.dataset.crew]);
      });
    },

    buildStars() {
      let html = '';
      for (let i = 0; i < 5; i++) html += '<span class="star' + (i < C.player.wanted ? ' on' : '') + '">★</span>';
      this.els.stars.innerHTML = html;
    },

    setDialog(who) {
      const d = VB.missions.dialog.current();
      const people = {
        fixer: { name: 'Nico Ramos', role: 'FIXER · OLD PORT', key: 'fixer' },
        crew0: { name: 'Sofia Delgado', role: 'DRIVER · CREW', key: 'crew0' },
        crew2: { name: 'Nadia Kim', role: 'LOOKOUT · CREW', key: 'crew2' },
      };
      const p = people[d.who] || people.fixer;
      drawPortrait(this.els.dialogFace, PORTRAITS[p.key]);
      this.els.dialogName.textContent = p.name + '  ';
      const role = document.createElement('span');
      role.className = 'd-role';
      role.textContent = p.role;
      this.els.dialogName.appendChild(role);
      this.els.dialogText.textContent = d.text;
    },

    setPopup(main, sub) {
      this.els.popup.innerHTML = '<div class="p-main">' + main + '</div>' +
        (sub ? '<div class="p-sub">' + sub + '</div>' : '');
    },

    update(state, player, cruisers, dt) {
      this.els.money.textContent = U.fmtMoney(state.money);
      const timer = document.getElementById('mission-timer');
      if (timer) timer.textContent = U.fmtTime(state.timer);
      this.els.health.style.width = state.health + '%';
      this.els.armor.style.width = state.armor + '%';
      this.els.rep.textContent = 'REP ' + state.rep + ' · ' + C.player.repName + ' — ' + state.repXp + ' / ' + C.player.repMax + ' XP';
      this.els.speed.textContent = VB.cars.speedKmh();
      this.els.carCondFill.style.width = C.car.condition + '%';
      this.els.carCond.textContent = C.car.condition + '%';
      // Minimap (throttled to every other frame).
      if (!this._mapTick) this._mapTick = 0;
      if ((this._mapTick++ % 2) === 0) {
        MapDraw.draw(this.els.minimap, player, cruisers, VB.shots.route);
      }
      // District under the player.
      const d = C.districts.find((dd) =>
        player.x >= dd.x - dd.w / 2 && player.x <= dd.x + dd.w / 2 &&
        player.z >= dd.z - dd.h / 2 && player.z <= dd.z + dd.h / 2);
      this.els.district.textContent = d ? d.name : 'MIRAMAR STRAND';
      this.els.street.textContent = C.streets[Math.abs(Math.floor(player.x / 40)) % C.streets.length];
    },

    showTitle(show) { this.els.title.style.display = show ? 'flex' : 'none'; },
    showPause(show) {
      this.els.pause.style.display = show ? 'flex' : 'none';
      if (show) this.drawPauseMap();
    },

    drawPauseMap() {
      const g = this.els.pauseMap.getContext('2d');
      const W = this.els.pauseMap.width, H = this.els.pauseMap.height;
      g.fillStyle = '#2a3a2a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1e6f8e'; g.fillRect(0, 0, W, H * 0.18);
      g.fillStyle = '#e8c98f'; g.fillRect(0, H * 0.18, W, H * 0.05);
      const cols = ['#4a5a6a', '#5a4a6a', '#6a5a3a', '#3a5a5a', '#5a6a3a', '#6a4a4a'];
      C.districts.forEach((d, i) => {
        const x = ((d.x - d.w / 2 + 160) / 320) * W, y = ((d.z - d.h / 2 + 160) / 320) * H;
        g.fillStyle = cols[i % cols.length];
        g.fillRect(x, y, (d.w / 320) * W, (d.h / 320) * H);
      });
      g.strokeStyle = '#222831'; g.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        const p = (i + 0.5) * W / 6;
        g.beginPath(); g.moveTo(p, 0); g.lineTo(p, H); g.stroke();
        g.beginPath(); g.moveTo(0, (i + 0.5) * H / 6); g.lineTo(W, (i + 0.5) * H / 6); g.stroke();
      }
      // Labels AFTER the roads so no grid line crosses the text.
      C.districts.forEach((d) => {
        const x = ((d.x - d.w / 2 + 160) / 320) * W, y = ((d.z - d.h / 2 + 160) / 320) * H;
        g.fillStyle = '#fff'; g.font = 'bold 12px Arial'; g.textAlign = 'center';
        g.fillText(d.name, x + (d.w / 320) * W / 2, y + 18);
      });
      // GPS route + markers.
      g.strokeStyle = '#2aff66'; g.lineWidth = 3; g.setLineDash([8, 6]);
      g.beginPath();
      VB.shots.route.forEach((pt, i) => {
        const x = ((pt.x + 160) / 320) * W, y = ((pt.z + 160) / 320) * H;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.stroke(); g.setLineDash([]);
      // Player dot (white) at the hero + gold star at the garage.
      const hx = ((6 + 160) / 320) * W, hy = ((17 + 160) / 320) * H;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#18b7d8'; g.lineWidth = 2.5; g.stroke();
      const gx = ((-64 + 160) / 320) * W, gy = ((-70 + 160) / 320) * H;
      g.fillStyle = '#ffd52a'; g.font = 'bold 20px Arial'; g.textAlign = 'center';
      g.fillText('★', gx, gy + 7);
      g.fillStyle = '#ffd52a'; g.font = 'bold 13px Arial'; g.textAlign = 'left';
      g.fillText('★ GARAGE — Solana Avenue', 14, H - 14);
      g.fillText('● YOU — Miramar Strand', 14, H - 34);
    },
  };

  VB.hud = HUD;
  VB.drawPortrait = drawPortrait;
})();
