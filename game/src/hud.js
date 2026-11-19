// Dense four-corner HUD (DOM overlay): mission panel, status, round minimap,
// vehicle + radio, dialogue with portraits, floating action text, title screen,
// full city-map overlay. DOM writes are cached — only changed values touch the DOM.

import { fmtMoney } from './utils.js';
import { portraitURL } from './textures.js';
import { drawCityMap } from './citymap.js';
import { DISTRICTS, CREW } from './config.js';

function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (Math.abs(x - d.x) <= d.w / 2 && Math.abs(z - d.z) <= d.h / 2) return d.name;
  }
  return x > 60 ? 'SOLMAR BAY' : 'SOLMAR AVENUE';
}

export class HUD {
  constructor() {
    this.cache = {};
    this.frame = 0;
    this.el = {};
    const ids = ['mission-panel', 'mission-chapter', 'mission-title', 'mission-stage', 'mission-bar', 'mission-next',
      'clock', 'money', 'stars', 'wanted-label', 'pursuit-label',
      'minimap', 'district-label', 'respect-label', 'respect-bar',
      'radio-station', 'radio-song', 'car-name', 'condition-bar', 'condition-text', 'speed', 'gear',
      'dialogue', 'dialogue-portrait', 'dialogue-name', 'dialogue-text',
      'float-text', 'title-screen', 'title-resume', 'map-overlay', 'map-canvas', 'toast', 'hud', 'objective-marker'];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.mapOpen = false;
    this._portraits = {};
    for (const k of Object.keys(CREW)) this._portraits[k] = portraitURL(k);
    this._dialogueTimer = 0;
  }

  _set(key, el, value) {
    if (!el) return;
    if (this.cache[key] !== value) {
      this.cache[key] = value;
      el.textContent = value;
    }
  }

  _setHTML(key, el, value) {
    if (!el) return;
    if (this.cache[key] !== value) {
      this.cache[key] = value;
      el.innerHTML = value;
    }
  }

  _setWidth(key, el, pct) {
    const v = Math.round(pct * 100);
    if (!el) return;
    if (this.cache[key] !== v) {
      this.cache[key] = v;
      el.style.width = v + '%';
    }
  }

  update(s) {
    this.frame++;
    // top-left: mission
    this._set('chapter', this.el['mission-chapter'], s.job ? s.job.chapter : '—');
    this._set('mtitle', this.el['mission-title'], s.job ? s.job.title : 'FREE ROAM');
    this._set('mstage', this.el['mission-stage'], s.stage ? `STAGE ${s.stageIndex + 1}/${s.job.stages.length} — ${s.stage.label}` : '');
    this._setWidth('mbar', this.el['mission-bar'], s.stageProgress || 0);
    this._set('mnext', this.el['mission-next'], s.stage && s.stage.hint ? 'NEXT → ' + s.stage.hint : '');

    // top-right: status
    const hh = String(Math.floor(s.minutes / 60)).padStart(2, '0');
    const mm = String(s.minutes % 60).padStart(2, '0');
    this._set('clock', this.el.clock, `DAY ${s.day} · ${hh}:${mm}`);
    this._set('money', this.el.money, fmtMoney(s.money));
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
    this._set('stars', this.el.stars, stars);
    this._set('wanted', this.el['wanted-label'], s.wanted > 0 ? `WANTED ${stars}` : 'CLEAN');
    this._set('pursuit', this.el['pursuit-label'], s.pursuitActive ? 'PURSUIT ACTIVE' : '');
    if (this.el['pursuit-label']) {
      this.el['pursuit-label'].style.display = s.pursuitActive ? 'block' : 'none';
    }

    // bottom-left: district + respect
    this._set('district', this.el['district-label'], districtAt(s.playerPos.x, s.playerPos.z));
    this._set('respect', this.el['respect-label'], `RESPECT ${s.respectLevel} · ${s.respect} / 1000`);
    this._setWidth('rbar', this.el['respect-bar'], s.respect / 1000);

    // bottom-right: vehicle
    this._set('station', this.el['radio-station'], s.stationName || '—');
    this._set('song', this.el['radio-song'], s.songName || '');
    this._set('carname', this.el['car-name'], s.inCar ? s.carName : 'ON FOOT');
    this._setWidth('cond', this.el['condition-bar'], s.condition / 100);
    this._set('condtext', this.el['condition-text'], `CONDITION ${Math.round(s.condition)}%`);
    this._set('speed', this.el.speed, `${Math.round(Math.abs(s.speedKmh))} KM/H`);
    this._set('gear', this.el.gear, s.inCar ? `GEAR ${s.gear}` : 'WALK');

    // minimap every 2nd frame (perf)
    if (this.frame % 2 === 0) this._drawMinimap(s);

    // dialogue auto-hide (not in frozen shot mode)
    if (this._dialogueTimer > 0 && !s.frozen) {
      this._dialogueTimer -= 1 / 60;
      if (this._dialogueTimer <= 0) this.hideDialogue();
    }
  }

  _drawMinimap(s) {
    const cv = this.el.minimap;
    if (!cv) return;
    const g = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const cx = w / 2, cy = h / 2;
    const scale = 1.6; // px per metre
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    g.clip();
    // base: brightened land
    g.fillStyle = '#232a45';
    g.fillRect(0, 0, w, h);
    // water east
    g.fillStyle = '#123a5c';
    const bayX = cx + (64 - s.playerPos.x) * scale;
    g.fillRect(bayX, 0, w - bayX, h);
    // roads (rotated with heading so up = forward)
    g.save();
    g.translate(cx, cy);
    g.rotate(-(s.heading || 0) + Math.PI);
    g.translate(-cx, -cy);
    const toMap = (x, z) => [cx + (x - s.playerPos.x) * scale, cy + (z - s.playerPos.z) * scale];
    g.strokeStyle = 'rgba(230,236,255,0.8)';
    g.lineWidth = 7;
    g.beginPath();
    let [ax0, ay0] = toMap(0, s.playerPos.z - 120);
    let [ax1, ay1] = toMap(0, s.playerPos.z + 120);
    g.moveTo(ax0, ay0); g.lineTo(ax1, ay1);
    g.stroke();
    g.lineWidth = 4;
    for (const z of [30, -40, -90, -140, -190, -230]) {
      const [bx0, by0] = toMap(s.playerPos.x - 120, z);
      const [bx1, by1] = toMap(s.playerPos.x + 120, z);
      g.beginPath(); g.moveTo(bx0, by0); g.lineTo(bx1, by1); g.stroke();
    }
    // mission marker (yellow diamond)
    if (s.marker) {
      const [mx, my] = toMap(s.marker.x, s.marker.z);
      g.fillStyle = '#ffd23f';
      g.save();
      g.translate(mx, my);
      g.rotate(Math.PI / 4);
      g.fillRect(-6, -6, 12, 12);
      g.restore();
    }
    // police blips
    if (s.policePositions) {
      for (const p of s.policePositions) {
        const [px, py] = toMap(p.x, p.z);
        g.fillStyle = '#4d8dff';
        g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
      }
    }
    g.restore();
    // player arrow (centre, always up)
    g.fillStyle = '#ff2d55';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy - 11); g.lineTo(cx + 7, cy + 8); g.lineTo(cx, cy + 3); g.lineTo(cx - 7, cy + 8);
    g.closePath();
    g.fill(); g.stroke();
    // north tick
    g.fillStyle = '#fff';
    g.font = 'bold 11px Arial';
    g.textAlign = 'center';
    g.fillText('N', cx, 14);
    g.restore();
  }

  showDialogue(who, text, holdSeconds = 6) {
    if (!this.el.dialogue) return;
    const img = this.el['dialogue-portrait'];
    if (img && this._portraits[who]) img.src = this._portraits[who];
    this._set('dname', this.el['dialogue-name'], CREW[who] ? CREW[who].name : who);
    this._set('dtext', this.el['dialogue-text'], text);
    this.el.dialogue.style.display = 'flex';
    this._dialogueTimer = holdSeconds;
  }

  hideDialogue() {
    if (this.el.dialogue) this.el.dialogue.style.display = 'none';
    this._dialogueTimer = 0;
  }

  showFloat(text, color = '#ffd23f') {
    const el = this.el['float-text'];
    if (!el) return;
    el.textContent = text;
    el.style.color = color;
    el.classList.remove('float-anim');
    void el.offsetWidth; // restart animation
    el.classList.add('float-anim');
  }

  toast(text) {
    const el = this.el.toast;
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  showTitle(hasSave) {
    if (this.el['title-screen']) this.el['title-screen'].style.display = 'flex';
    if (this.el['title-resume']) this.el['title-resume'].style.display = hasSave ? 'block' : 'none';
  }

  hideTitle() {
    if (this.el['title-screen']) this.el['title-screen'].style.display = 'none';
  }

  openMap(state) {
    this.mapOpen = true;
    if (this.el['map-overlay']) this.el['map-overlay'].style.display = 'flex';
    if (this.el['map-canvas']) drawCityMap(this.el['map-canvas'], state);
  }

  closeMap() {
    this.mapOpen = false;
    if (this.el['map-overlay']) this.el['map-overlay'].style.display = 'none';
  }
}
