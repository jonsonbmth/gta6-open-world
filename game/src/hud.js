// HUD for SOLMAR BAY: dense four-corner panels, round minimap, dialogue with
// procedural portraits, floating action text, and the AAA city map overlay.
// DOM writes are cached (a value is only written when it changes) and the
// minimap redraws every 2nd frame, keeping headless capture fast.
//
// MAP LABEL FIXES (V9 nits): MIRAMAR BEACH sits well clear of LIGHTHOUSE,
// and the name OLD PIER appears exactly once (the zone is THE DOCKS).
const PORTRAITS = {
  'Mama Rosa': { skin: '#c68642', hair: '#e8e8e8', bg: '#5b3a7a', cap: null },
  'Lena "Wrench" Ortiz': { skin: '#e0ac69', hair: '#2a1a12', bg: '#a32a6e', cap: '#e06aa8' },
  'Dario "Fuze" Kane': { skin: '#8d5524', hair: '#1a1a1a', bg: '#1f6b45', cap: '#3fae6a' },
  'Rico Marín': { skin: '#c68642', hair: '#2a1a12', bg: '#8a6d1f', cap: '#c01825' },
};

function drawPortrait(canvas, speaker) {
  const p = PORTRAITS[speaker] || PORTRAITS['Rico Marín'];
  const g = canvas.getContext('2d');
  const S = canvas.width;
  g.clearRect(0, 0, S, S);
  g.fillStyle = p.bg;
  g.fillRect(0, 0, S, S);
  // Face.
  g.fillStyle = p.skin;
  g.beginPath();
  g.arc(S / 2, S * 0.55, S * 0.34, 0, Math.PI * 2);
  g.fill();
  // Hair / cap.
  g.fillStyle = p.cap || p.hair;
  g.beginPath();
  g.arc(S / 2, S * 0.42, S * 0.36, Math.PI, Math.PI * 2);
  g.fill();
  if (p.cap) {
    g.fillRect(S * 0.14, S * 0.38, S * 0.72, S * 0.1);
  }
  // Eyes + smile.
  g.fillStyle = '#141414';
  g.beginPath();
  g.arc(S * 0.38, S * 0.55, S * 0.045, 0, Math.PI * 2);
  g.arc(S * 0.62, S * 0.55, S * 0.045, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#141414';
  g.lineWidth = S * 0.03;
  g.beginPath();
  g.arc(S / 2, S * 0.66, S * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
}

export class HUD {
  constructor() {
    this.cache = {};
    this._actionTimer = null;
    this._dlgTimer = null;
    this._mapVisible = false;
    this._frame = 0;
  }

  _set(id, value) {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  _el(id) {
    return document.getElementById(id);
  }

  update(state) {
    this._frame++;
    this._set('obj-chapter', state.chapter);
    this._set('obj-title', state.jobTitle);
    this._set('obj-text', state.objective);
    this._set('obj-next', 'NEXT → ' + state.next);
    this._set('clock-day', 'DAY ' + state.day);
    this._set('clock-time', state.timeStr);
    this._set('money', '$' + state.money.toLocaleString('en-US'));
    this._set('district', state.district);
    this._set('respect-label', `RESPECT ${state.respectLevel} · ${state.respect} / 1000`);
    this._set('radio-station', state.radioStation);
    this._set('radio-song', state.radioSong);
    this._set('car-name', state.carName);
    this._set('speed-num', String(state.speedKmh));
    this._set('gear', state.onFoot ? 'ON FOOT' : 'GEAR ' + state.gear);
    this._set('wanted-label', state.wanted === 0 ? 'CLEAN' : 'PURSUIT ACTIVE');

    // Wanted stars with blink (shots freeze the blink at 0.75).
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    this._set('stars', stars);
    const starEl = this._el('stars');
    if (starEl) starEl.style.opacity = state.wanted > 0 ? String(state.starBlink ?? 1) : '1';

    // Bars (width writes only on change).
    const stagePct = Math.round((state.stageIndex / Math.max(1, state.stageCount)) * 100);
    this._bar('obj-stage-fill', stagePct);
    this._bar('respect-fill', Math.round((state.respect / 1000) * 100));
    this._bar('cond-fill', state.condition);

    // Minimap every 2nd frame.
    if (this._frame % 2 === 0) this.drawMinimap(state);
    // Map overlay redraws while open (hud.update runs in map mode).
    if (this._mapVisible) this.drawMapCanvas(state);
  }

  _bar(id, pct) {
    const key = id + ':w';
    if (this.cache[key] === pct) return;
    this.cache[key] = pct;
    const el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
  }

  showDialogue(speaker, text, holdMs = 6000) {
    const box = this._el('dialogue');
    if (!box) return;
    this._set('dlg-speaker', speaker);
    this._set('dlg-text', text);
    const canvas = this._el('dlg-portrait');
    if (canvas) drawPortrait(canvas, speaker);
    box.classList.add('visible');
    if (this._dlgTimer) clearTimeout(this._dlgTimer);
    this._dlgTimer = setTimeout(() => box.classList.remove('visible'), holdMs);
  }

  clearDialogue() {
    const box = this._el('dialogue');
    if (box) box.classList.remove('visible');
    if (this._dlgTimer) clearTimeout(this._dlgTimer);
  }

  actionText(text, holdMs = 2600) {
    const el = this._el('action-text');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('pop');
    el.classList.remove('hold');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('pop');
    if (this._actionTimer) clearTimeout(this._actionTimer);
    this._actionTimer = setTimeout(() => el.classList.remove('pop'), holdMs);
  }

  // Pin the action text visible (frozen screenshot staging).
  holdActionText(text) {
    const el = this._el('action-text');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('pop');
    el.classList.add('hold');
    if (this._actionTimer) clearTimeout(this._actionTimer);
  }

  clearActionText() {
    const el = this._el('action-text');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('pop');
    el.classList.remove('hold');
    if (this._actionTimer) clearTimeout(this._actionTimer);
  }

  drawMinimap(state) {
    const cv = this._el('minimap');
    if (!cv) return;
    const g = cv.getContext('2d');
    const S = cv.width;
    const R = S / 2;
    g.clearRect(0, 0, S, S);
    // Brightened base (V7 fix) so the minimap reads at a glance.
    g.fillStyle = '#16233d';
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.clip();
    // Grid + avenue + cross streets, centered on the player.
    const scale = 1.6; // px per world unit
    const px = state.pos.x;
    const pz = state.pos.z;
    g.strokeStyle = 'rgba(90,140,220,0.5)';
    g.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      g.moveTo(R + i * 22 - ((px * scale) % 22), 0);
      g.lineTo(R + i * 22 - ((px * scale) % 22), S);
      g.stroke();
      g.beginPath();
      g.moveTo(0, R + i * 22 - ((pz * scale) % 22));
      g.lineTo(S, R + i * 22 - ((pz * scale) % 22));
      g.stroke();
    }
    // Avenue (vertical) + cross streets.
    g.strokeStyle = '#e8d44d';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(R - px * scale, 0);
    g.lineTo(R - px * scale, S);
    g.stroke();
    g.strokeStyle = 'rgba(232,212,77,0.55)';
    g.lineWidth = 3;
    for (const cz of [-80, -40, 0, 40, 80]) {
      g.beginPath();
      g.moveTo(0, R + (cz - pz) * scale);
      g.lineTo(S, R + (cz - pz) * scale);
      g.stroke();
    }
    // GPS route to target.
    if (state.target) {
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 2;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.moveTo(R, R);
      g.lineTo(R + (state.target.x - px) * scale, R + (state.target.z - pz) * scale);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#facc15';
      g.beginPath();
      g.arc(R + (state.target.x - px) * scale, R + (state.target.z - pz) * scale, 5, 0, Math.PI * 2);
      g.fill();
    }
    // Police blips.
    g.fillStyle = '#3b82f6';
    for (const u of state.police || []) {
      g.beginPath();
      g.arc(R + (u.x - px) * scale, R + (u.z - pz) * scale, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow.
    g.save();
    g.translate(R, R);
    g.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)));
    g.fillStyle = '#f8fafc';
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(6, 7);
    g.lineTo(0, 3);
    g.lineTo(-6, 7);
    g.closePath();
    g.fill();
    g.restore();
    g.restore();
    // Ring.
    g.strokeStyle = '#facc15';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.stroke();
  }

  showMap() {
    const el = this._el('map-screen');
    if (el) el.classList.add('visible');
    this._mapVisible = true;
  }

  hideMap() {
    const el = this._el('map-screen');
    if (el) el.classList.remove('visible');
    this._mapVisible = false;
  }

  get mapVisible() {
    return this._mapVisible;
  }

  // AAA city map: districts, ring highway, named streets, bay + Pelican Isle
  // + bridge, landmark icons, GPS route, compass, legend, grid A–H / 1–6.
  drawMapCanvas(state) {
    const cv = this._el('map-canvas');
    if (!cv) return;
    const g = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    const mx = (x) => ((x + 120) / 260) * W;
    // Leave a footer strip: world maps to H-30 so bottom zone labels never
    // collide with the footer line (V10 map fix).
    const mz = (z) => ((z + 120) / 230) * (H - 30);

    g.fillStyle = '#0a1230';
    g.fillRect(0, 0, W, H);

    // Bay (east side) + Pelican Isle.
    g.fillStyle = '#0d2b52';
    g.fillRect(mx(75), 0, W - mx(75), H);
    g.fillStyle = '#123a68';
    g.beginPath();
    g.ellipse(mx(105), mz(0), 42, 16, 0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7dd3fc';
    g.font = 'bold 13px Arial';
    g.textAlign = 'center';
    g.fillText('PELICAN ISLE', mx(105), mz(-18));

    // Grid A–H / 1–6.
    g.strokeStyle = 'rgba(120,160,220,0.25)';
    g.lineWidth = 1;
    g.fillStyle = '#8fb3e8';
    g.font = '12px Arial';
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * W;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
      g.fillText(String.fromCharCode(65 + i), x + 20, 16);
    }
    for (let i = 0; i < 6; i++) {
      const y = (i / 6) * H;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
      g.fillText(String(i + 1), 6, y + 28);
    }

    // District zones (dashed borders, tinted fills).
    const zones = [
      { name: 'CROWN HEIGHTS', x0: -110, z0: -110, x1: -20, z1: -30, c: '#a78bfa' },
      { name: 'MIRAMAR', x0: 10, z0: -110, x1: 80, z1: -30, c: '#fb923c' },
      { name: 'VELA QUARTER', x0: -110, z0: -10, x1: -40, z1: 50, c: '#facc15' },
      { name: 'PALM ROW', x0: -110, z0: 60, x1: -20, z1: 110, c: '#f472b6' },
      { name: 'DOCKSIDE', x0: 10, z0: 10, x1: 70, z1: 60, c: '#34d399' },
      { name: 'HARBOUR LIGHTS', x0: -10, z0: 60, x1: 30, z1: 105, c: '#22d3ee' },
      { name: 'THE DOCKS', x0: 35, z0: 60, x1: 75, z1: 105, c: '#2dd4bf' },
    ];
    for (const zn of zones) {
      g.fillStyle = zn.c + '22';
      g.fillRect(mx(zn.x0), mz(zn.z0), mx(zn.x1) - mx(zn.x0), mz(zn.z1) - mz(zn.z0));
      g.strokeStyle = zn.c;
      g.setLineDash([6, 5]);
      g.lineWidth = 1.5;
      g.strokeRect(mx(zn.x0), mz(zn.z0), mx(zn.x1) - mx(zn.x0), mz(zn.z1) - mz(zn.z0));
      g.setLineDash([]);
      g.fillStyle = zn.c;
      g.font = 'bold 14px Arial';
      g.textAlign = 'center';
      g.fillText(zn.name, (mx(zn.x0) + mx(zn.x1)) / 2, mz(zn.z1) - 8);
    }

    // Ring highway.
    g.strokeStyle = '#facc15';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(mx(-104), mz(-104), mx(72) - mx(-104), mz(104) - mz(-104), 26);
    g.stroke();

    // Named streets.
    g.strokeStyle = '#e8ecf5';
    g.lineWidth = 2.5;
    const streets = [
      { x0: 0, z0: -104, x1: 0, z1: 104, name: 'SOLMAR AVENUE', lx: 6, lz: 40, vertical: true },
      { x0: -104, z0: -40, x1: 72, z1: -40, name: 'CANAL STREET', lx: -60, lz: -46 },
      { x0: -104, z0: 10, x1: 72, z1: 10, name: 'VELA STREET', lx: -70, lz: 4 },
      { x0: -104, z0: 75, x1: 72, z1: 75, name: 'PALM BOULEVARD', lx: -60, lz: 69 },
      { x0: -104, z0: -85, x1: 72, z1: -85, name: 'CROWN ROAD', lx: -60, lz: -91 },
      { x0: 45, z0: -104, x1: 45, z1: 104, name: 'HARBOUR WAY', lx: 51, lz: 30, vertical: true },
    ];
    for (const s of streets) {
      g.beginPath();
      g.moveTo(mx(s.x0), mz(s.z0));
      g.lineTo(mx(s.x1), mz(s.z1));
      g.stroke();
      g.fillStyle = '#dbe4f5';
      g.font = 'bold 12px Arial';
      g.textAlign = 'left';
      if (s.vertical) {
        g.save();
        g.translate(mx(s.lx), mz(s.lz));
        g.rotate(-Math.PI / 2);
        g.fillText(s.name, 0, 0);
        g.restore();
      } else {
        g.fillText(s.name, mx(s.lx), mz(s.lz));
      }
    }

    // Harbor Bridge.
    g.strokeStyle = '#f8fafc';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(mx(70), mz(20));
    g.lineTo(mx(112), mz(-8));
    g.stroke();
    g.fillStyle = '#dbe4f5';
    g.font = 'bold 12px Arial';
    g.textAlign = 'center';
    g.fillText('HARBOR BRIDGE', mx(92), mz(14));

    // Landmarks (triangle icons + labels). MIRAMAR BEACH is placed well away
    // from LIGHTHOUSE; OLD PIER appears exactly once.
    const landmarks = [
      { name: 'CROWN TOWER', x: -60, z: -80, dy: -10 },
      { name: 'VELA MARKET', x: -30, z: 20, dy: -10 },
      { name: "LENA'S WORKSHOP", x: 35, z: 25, dy: -10 },
      { name: 'DOCKSIDE YARD', x: 40, z: 45, dy: 18 },
      { name: 'PALM ROW PLAZA', x: -70, z: 95, dy: -10 },
      { name: 'LIGHTHOUSE', x: 60, z: -100, dy: -10 },
      { name: 'MIRAMAR BEACH', x: 25, z: -95, dy: 18 },
      { name: 'OLD PIER', x: 60, z: 85, dy: 18 },
    ];
    for (const lm of landmarks) {
      const x = mx(lm.x);
      const y = mz(lm.z);
      g.fillStyle = '#facc15';
      g.beginPath();
      g.moveTo(x, y - 7);
      g.lineTo(x + 6, y + 5);
      g.lineTo(x - 6, y + 5);
      g.closePath();
      g.fill();
      g.fillStyle = '#f8fafc';
      g.font = 'bold 12px Arial';
      g.textAlign = 'center';
      g.fillText(lm.name, x, y + lm.dy);
    }

    // GPS route: Rico -> mission target.
    if (state.target) {
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      g.beginPath();
      g.moveTo(mx(state.pos.x), mz(state.pos.z));
      g.lineTo(mx(state.target.x), mz(state.target.z));
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ef4444';
      g.beginPath();
      g.arc(mx(state.target.x), mz(state.target.z), 7, 0, Math.PI * 2);
      g.fill();
    }

    // Police blips.
    g.fillStyle = '#3b82f6';
    for (const u of state.police || []) {
      g.beginPath();
      g.arc(mx(u.x), mz(u.z), 5, 0, Math.PI * 2);
      g.fill();
    }

    // Rico marker.
    g.save();
    g.translate(mx(state.pos.x), mz(state.pos.z));
    g.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)));
    g.fillStyle = '#f8fafc';
    g.beginPath();
    g.moveTo(0, -11);
    g.lineTo(8, 8);
    g.lineTo(0, 4);
    g.lineTo(-8, 8);
    g.closePath();
    g.fill();
    g.restore();
    g.fillStyle = '#f8fafc';
    g.font = 'bold 12px Arial';
    g.textAlign = 'center';
    g.fillText('RICO', mx(state.pos.x), mz(state.pos.z) - 14);

    // Compass (top-right).
    g.strokeStyle = '#facc15';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(W - 46, 46, 20, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ef4444';
    g.beginPath();
    g.moveTo(W - 46, 30);
    g.lineTo(W - 40, 52);
    g.lineTo(W - 52, 52);
    g.closePath();
    g.fill();
    g.fillStyle = '#f8fafc';
    g.font = 'bold 13px Arial';
    g.fillText('N', W - 46, 22);

    // Legend (top-right, below the compass).
    const lx = W - 190;
    const ly = 84;
    g.fillStyle = 'rgba(5,10,25,0.85)';
    g.fillRect(lx, ly, 172, 118);
    g.strokeStyle = '#facc15';
    g.strokeRect(lx, ly, 172, 118);
    g.fillStyle = '#facc15';
    g.font = 'bold 13px Arial';
    g.textAlign = 'left';
    g.fillText('LEGEND', lx + 12, ly + 20);
    const items = [
      ['#22d3ee', 'GPS route'],
      ['#ef4444', 'Mission target'],
      ['#f8fafc', 'Rico'],
      ['#3b82f6', 'Police'],
      ['#0d2b52', 'Water / bay'],
    ];
    g.font = '12px Arial';
    items.forEach(([c, label], i) => {
      g.fillStyle = c;
      g.fillRect(lx + 12, ly + 32 + i * 17, 12, 12);
      g.fillStyle = '#e8ecf5';
      g.fillText(label, lx + 30, ly + 42 + i * 17);
    });

    // Footer.
    g.fillStyle = '#8fb3e8';
    g.font = '12px Arial';
    g.textAlign = 'center';
    g.fillText('M / ESC to close · GPS route to the mission target · Districts, landmarks and police shown live', W / 2, H - 10);
  }
}
