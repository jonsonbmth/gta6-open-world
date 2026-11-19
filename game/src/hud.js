// SOLMAR BAY — HUD: DOM overlay (no backdrop-filter / drop-shadow — those
// are 10x slower in headless Chrome), cached DOM writes, a 2D minimap drawn
// every 2nd frame, dialogue with canvas portraits, and the AAA city map.
import { DISTRICTS, LANDMARKS, CREW, RADIO } from './config.js';

function drawPortrait(canvas, key) {
  const ctx = canvas.getContext('2d');
  const who = CREW[key] || CREW.rosa;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = who.color;
  ctx.fillRect(0, 0, W, H);
  // Face.
  ctx.fillStyle = who.skin;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.52, W * 0.34, 0, Math.PI * 2);
  ctx.fill();
  // Hair.
  ctx.fillStyle = who.hair;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.42, W * 0.36, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(W * 0.14, H * 0.12, W * 0.72, H * 0.2);
  // Eyes + smile.
  ctx.fillStyle = '#14100c';
  ctx.beginPath(); ctx.arc(W * 0.38, H * 0.52, W * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.62, H * 0.52, W * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#14100c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.6, W * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

// World -> map canvas transform. Map covers x [-165,165], z [-145,145].
function mapX(x, w) { return ((x + 165) / 330) * w; }
function mapZ(z, h) { return ((145 - z) / 290) * h; }

export class HUD {
  constructor(game) {
    this.game = game;
    this.cache = {};
    this.el = {};
    const ids = ['mission-badge', 'mission-title', 'mission-objective', 'mission-next',
      'mission-progress', 'clock', 'money', 'stars', 'wanted-label', 'district-pill',
      'respect-text', 'respect-bar', 'radio-name', 'radio-song', 'car-name',
      'condition-bar', 'speed', 'gear', 'dialogue-box', 'dialogue-name',
      'dialogue-line', 'dialogue-portrait', 'action-text', 'hint-bar',
      'minimap', 'map-overlay', 'map-canvas', 'title-screen', 'btn-start',
      'save-note', 'speed-unit'];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.minimapCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.mapCtx = this.el['map-canvas'] ? this.el['map-canvas'].getContext('2d') : null;
    this.frame = 0;
    this.mapOpen = false;
    this.actionUntil = 0;
    this.pinnedAction = null;
    if (this.el['btn-start']) {
      this.el['btn-start'].addEventListener('click', () => this.game.startGame());
    }
  }

  setText(id, text) {
    if (this.cache[id] === text) return;
    this.cache[id] = text;
    const el = this.el[id];
    if (el) el.textContent = text;
  }

  setStyle(id, prop, value) {
    const key = id + ':' + prop;
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    const el = this.el[id];
    if (el) el.style[prop] = value;
  }

  showDialogue(speakerKey, name, color, line) {
    this.setText('dialogue-name', name);
    this.setText('dialogue-line', line);
    this.setStyle('dialogue-name', 'color', color);
    const box = this.el['dialogue-box'];
    if (box) box.style.display = 'flex';
    const portrait = this.el['dialogue-portrait'];
    if (portrait) drawPortrait(portrait, speakerKey);
  }

  hideDialogue() {
    const box = this.el['dialogue-box'];
    if (box) box.style.display = 'none';
  }

  showAction(text, ms = 2600) {
    this.setText('action-text', text);
    const el = this.el['action-text'];
    if (el) el.style.display = 'block';
    this.actionUntil = performance.now() + ms;
  }

  pinAction(text) {
    this.pinnedAction = text;
    this.setText('action-text', text);
    const el = this.el['action-text'];
    if (el) el.style.display = 'block';
  }

  districtAt(x, z) {
    if (Math.abs(x) < 20 && z > -140 && z < 140) return 'SOLMAR AVENUE';
    for (const d of DISTRICTS) {
      const [x0, z0, x1, z1] = d.rect;
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return d.name;
    }
    return 'SOLMAR BAY';
  }

  update(dt) {
    const g = this.game;
    const m = g.missions.current();
    const st = g.missions.currentStage();
    this.setText('mission-badge', 'CH ' + m.id);
    this.setText('mission-title', m.title);
    this.setText('mission-objective', st.text);
    this.setText('mission-next', 'NEXT → ' + st.next);
    this.setStyle('mission-progress', 'width', ((g.missions.stage + 1) / m.stages.length * 100) + '%');
    this.setText('clock', 'DAY 1 · 18:47');
    this.setText('money', '$' + g.money.toLocaleString('en-US'));
    const stars = '★'.repeat(g.police.wanted) + '☆'.repeat(5 - g.police.wanted);
    this.setText('stars', stars);
    this.setText('wanted-label', g.police.wanted > 0 ? 'PURSUIT ACTIVE' : 'CLEAN');
    this.setStyle('wanted-label', 'color', g.police.wanted > 0 ? '#ff5a4a' : '#7dff6a');
    const pos = g.playerPos();
    this.setText('district-pill', this.districtAt(pos.x, pos.z));
    this.setText('respect-text', 'RESPECT ' + g.respectLevel + ' · ' + g.respect + ' / 1000');
    this.setStyle('respect-bar', 'width', (g.respect / 10) + '%');
    const station = g.audio.currentStation();
    this.setText('radio-name', station.name);
    this.setText('radio-song', station.song);
    this.setText('car-name', g.driving ? 'VULPINE S' : 'ON FOOT');
    this.setStyle('condition-bar', 'width', g.carCondition + '%');
    const speed = g.displaySpeedKmh != null ? g.displaySpeedKmh : Math.round(g.speedKmh);
    this.setText('speed', String(speed));
    this.setText('gear', g.driving ? 'GEAR ' + g.gear : 'ON FOOT');
    if (this.pinnedAction == null && this.actionUntil && performance.now() > this.actionUntil) {
      const el = this.el['action-text'];
      if (el) el.style.display = 'none';
      this.actionUntil = 0;
    }
    // Minimap every 2nd frame.
    this.frame++;
    if (this.frame % 2 === 0) this.drawMinimap();
    if (this.mapOpen) this.drawMap();
  }

  drawMinimap() {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const g = this.game;
    const W = 150, H = 150, R = 72;
    const pos = g.playerPos();
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2);
    ctx.clip();
    // BRIGHTENED base (V7 fix — dark minimap was unreadable).
    ctx.fillStyle = '#2a3a5e';
    ctx.fillRect(0, 0, W, H);
    // Water (east).
    ctx.fillStyle = '#2a6a9a';
    ctx.fillRect(mapX(128, W), 0, W, H);
    // Streets: a local window around the player.
    const scale = 2.1; // px per world unit
    const cx = W / 2 - pos.x * scale, cz = H / 2 + pos.z * scale;
    ctx.strokeStyle = '#c8d2e0';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx + 0 * scale, 0); ctx.lineTo(cx + 0 * scale, H); ctx.stroke();
    ctx.lineWidth = 3;
    for (const z of [-90, -45, 0, 45, 90]) {
      ctx.beginPath(); ctx.moveTo(0, cz - z * scale); ctx.lineTo(W, cz - z * scale); ctx.stroke();
    }
    // GPS target marker.
    const target = g.missions.currentStage().target;
    if (target) {
      ctx.fillStyle = '#ff4a3a';
      ctx.beginPath();
      ctx.arc(cx + target.x * scale, cz - target.z * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Police dots.
    ctx.fillStyle = '#4a90ff';
    for (const u of g.police.units) {
      const p = u.car.group.position;
      ctx.beginPath();
      ctx.arc(cx + p.x * scale, cz - p.z * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow (rotates with heading).
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.atan2(Math.sin(g.heading), Math.cos(g.heading)));
    ctx.fillStyle = '#ffdd3a';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Ring.
    ctx.strokeStyle = '#ffdd3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, R - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  openMap() {
    this.mapOpen = true;
    const ov = this.el['map-overlay'];
    if (ov) ov.style.display = 'flex';
    // The dialogue box peeks below the map frame — hide it while mapping.
    const dlg = this.el['dialogue-box'];
    if (dlg) dlg.style.display = 'none';
    this.drawMap();
  }

  closeMap() {
    this.mapOpen = false;
    const ov = this.el['map-overlay'];
    if (ov) ov.style.display = 'none';
  }

  toggleMap() {
    if (this.mapOpen) this.closeMap(); else this.openMap();
  }

  drawMap() {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const g = this.game;
    const W = 880, H = 580;
    ctx.clearRect(0, 0, W, H);
    // Deep navy base.
    ctx.fillStyle = '#101a33';
    ctx.fillRect(0, 0, W, H);
    // Grid + labels.
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * (W / 8);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.fillText('ABCDEFGH'[i], x, 16);
    }
    for (let i = 0; i < 6; i++) {
      const y = (i + 0.5) * (H / 6);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillText(String(i + 1), 10, y + 4);
    }
    // Bay water (east).
    ctx.fillStyle = '#16405f';
    ctx.fillRect(mapX(128, W), 0, W - mapX(128, W), H);
    // Pelican Isle.
    ctx.fillStyle = '#d9b98c';
    ctx.beginPath();
    ctx.ellipse(mapX(150, W), mapZ(-30, H), 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // District zones with dashed borders.
    for (const d of DISTRICTS) {
      const [x0, z0, x1, z1] = d.rect;
      ctx.fillStyle = d.color + '22';
      ctx.fillRect(mapX(x0, W), mapZ(z1, H), mapX(x1, W) - mapX(x0, W), mapZ(z0, H) - mapZ(z1, H));
      ctx.strokeStyle = d.color;
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mapX(x0, W), mapZ(z1, H), mapX(x1, W) - mapX(x0, W), mapZ(z0, H) - mapZ(z1, H));
      ctx.setLineDash([]);
      ctx.fillStyle = d.color;
      ctx.font = 'bold 13px Arial';
      // Name at the TOP-LEFT inside the zone: center placement collided with
      // landmark labels (VELA QUARTER / VELA MARKET, CROWN HEIGHTS /
      // CROWN ROAD, DOCKSIDE / DOCKSIDE YARD, PALM ROW / PALM ROW PLAZA).
      // Inset 12/18 so the ring-highway line never crosses the text.
      ctx.fillText(d.name, mapX(x0, W) + 12, mapZ(z1, H) + 18);
    }
    // Ring highway (yellow rounded rect).
    ctx.strokeStyle = '#ffdd3a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(mapX(-120, W), mapZ(120, H), mapX(120, W) - mapX(-120, W), mapZ(-120, H) - mapZ(120, H), 26);
    ctx.stroke();
    // Streets.
    ctx.strokeStyle = '#e8ecf2';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(mapX(0, W), 0); ctx.lineTo(mapX(0, W), H); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (const z of [-90, -45, 0, 45, 90]) {
      ctx.beginPath(); ctx.moveTo(0, mapZ(z, H)); ctx.lineTo(W, mapZ(z, H)); ctx.stroke();
    }
    // Street names.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.save();
    ctx.translate(mapX(0, W) + 10, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('SOLMAR AVENUE', 0, 0);
    ctx.restore();
    ctx.fillText('CROWN ROAD', mapX(-70, W), mapZ(-90, H) - 6);
    ctx.fillText('CANAL STREET', mapX(-70, W), mapZ(-45, H) - 6);
    ctx.fillText('VELA STREET', mapX(-70, W), mapZ(0, H) - 6);
    ctx.fillText('PALM BOULEVARD', mapX(-70, W), mapZ(45, H) - 6);
    ctx.fillText('HARBOR WAY', mapX(60, W), mapZ(0, H) - 6);
    // Harbor Bridge deck line (z=-60, north of the marina). The name comes
    // from the LANDMARKS loop — do not draw it twice.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mapX(128, W), mapZ(-60, H));
    ctx.lineTo(mapX(200, W), mapZ(-60, H));
    ctx.stroke();
    // Landmark icons (yellow triangles) + labels — placed to never overlap.
    ctx.font = 'bold 11px Arial';
    for (const lm of LANDMARKS) {
      const x = mapX(lm.x, W), y = mapZ(lm.z, H);
      ctx.fillStyle = '#ffdd3a';
      ctx.beginPath();
      ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x - 5, y + 4); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lm.name, x, y + 17);
    }
    // GPS route: dashed cyan from player to target.
    const pos = g.playerPos();
    const target = g.missions.currentStage().target;
    if (target) {
      ctx.strokeStyle = '#3ad0ff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(mapX(pos.x, W), mapZ(pos.z, H));
      ctx.lineTo(mapX(target.x, W), mapZ(target.z, H));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff4a3a';
      ctx.beginPath();
      ctx.arc(mapX(target.x, W), mapZ(target.z, H), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('GPS 2.30 KM · ETA 5 MIN', mapX(target.x, W), mapZ(target.z, H) - 12);
    }
    // Player marker (white arrow).
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(mapX(pos.x, W), mapZ(pos.z, H));
    ctx.rotate(Math.atan2(Math.sin(g.heading), Math.cos(g.heading)));
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Compass (top-right) + legend (top-right below compass).
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('N', W - 26, 30);
    ctx.fillStyle = '#ff4a3a';
    ctx.beginPath();
    ctx.moveTo(W - 26, 36); ctx.lineTo(W - 20, 52); ctx.lineTo(W - 32, 52); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffdd3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(W - 168, 66, 142, 118);
    ctx.fillStyle = '#ffdd3a';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LEGEND', W - 156, 86);
    ctx.font = '12px Arial';
    const items = [
      ['#3ad0ff', 'GPS route'],
      ['#ff4a3a', 'Mission target'],
      ['#ffffff', 'Rico'],
      ['#4a90ff', 'Police'],
      ['#16405f', 'Water / bay'],
    ];
    items.forEach(([c, label], i) => {
      ctx.fillStyle = c;
      ctx.fillRect(W - 156, 96 + i * 18, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, W - 138, 106 + i * 18);
    });
    ctx.textAlign = 'center';
  }

  // Snapshot of HUD state (used by the map shot + playtest).
  hudState() {
    const g = this.game;
    const pos = g.playerPos();
    return {
      money: g.money,
      wanted: g.police.wanted,
      speedKmh: g.displaySpeedKmh != null ? g.displaySpeedKmh : Math.round(g.speedKmh),
      chapter: g.missions.chapter + 1,
      stage: g.missions.stage + 1,
      objective: g.missions.objectiveText(),
      district: this.districtAt(pos.x, pos.z),
      radio: g.audio.currentStation().name,
      driving: g.driving,
      respect: g.respect,
    };
  }
}
