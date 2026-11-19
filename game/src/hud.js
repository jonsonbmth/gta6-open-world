// HUD: DOM panels + the minimap. DOM writes are cached (a value is only
// written when it changes) and the minimap redraws every 2nd frame. The
// minimap shows the street grid, the bay, the player, police and the GPS
// route — never an empty radar.
import { CHAPTERS, CREW, WORLD } from './config.js';

const el = {};
let last = {};
let mapCtx = null;
let frameCount = 0;

export function initHud() {
  const ids = ['obj-ch', 'obj-title', 'obj-text', 'obj-bar', 'obj-next', 'stat-day',
    'stat-money', 'stat-stars', 'stat-heat', 'map-street', 'map-respect', 'respect-bar',
    'dlg-portrait', 'dlg-name', 'dlg-line', 'car-radio', 'car-station', 'car-name',
    'car-cond', 'car-speed', 'car-gear', 'hud-nearmiss', 'hud-wanted', 'hud-dialogue'];
  for (const id of ids) el[id] = document.getElementById(id);
  const mm = document.getElementById('minimap');
  mapCtx = mm ? mm.getContext('2d') : null;
}

function set(id, value) {
  if (last[id] === value) return;
  last[id] = value;
  const node = el[id];
  if (node) node.textContent = value;
}

function setHtml(id, value) {
  if (last[id] === value) return;
  last[id] = value;
  const node = el[id];
  if (node) node.innerHTML = value;
}

function setStyle(id, prop, value) {
  const key = `${id}.${prop}`;
  if (last[key] === value) return;
  last[key] = value;
  const node = el[id];
  if (node) node.style[prop] = value;
}

export function setDialogue(speakerKey, line) {
  const c = CREW[speakerKey] || CREW.lena;
  set('dlg-name', c.name);
  set('dlg-line', line);
  setHtml('dlg-portrait', c.initial);
  setStyle('dlg-portrait', 'background', c.color);
}

let nearMissUntil = 0;
export function showNearMiss(pinned = false) {
  nearMissUntil = pinned ? Infinity : performance.now() + 2200;
  setStyle('hud-nearmiss', 'display', 'block');
}

export function hideNearMiss() {
  nearMissUntil = 0;
  setStyle('hud-nearmiss', 'display', 'none');
}

export function updateHud(state) {
  frameCount += 1;
  const ch = CHAPTERS[state.chapter - 1] || CHAPTERS[0];
  set('obj-ch', `CH ${ch.id}`);
  set('obj-title', ch.title);
  set('obj-text', ch.objective);
  set('obj-next', `NEXT → ${ch.next}`);
  setStyle('obj-bar', 'width', `${20 + state.stage * 25}%`);
  set('stat-day', `DAY 1 · ${state.clock}`);
  set('stat-money', `$${state.money.toLocaleString('en-US')}`);
  const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  set('stat-stars', stars);
  set('stat-heat', state.wanted > 0 ? 'PURSUIT ACTIVE' : 'CLEAN');
  setStyle('stat-heat', 'color', state.wanted > 0 ? '#ff5a5a' : '#3ddc84');
  set('map-street', state.street);
  set('map-respect', `RESPECT ${state.respectLevel} · ${state.respect} / 1000`);
  setStyle('respect-bar', 'width', `${Math.min(100, state.respect / 10)}%`);
  set('car-radio', state.radio.name);
  set('car-station', state.radio.track);
  set('car-name', state.inCar ? state.carName : 'ON FOOT');
  set('car-speed', String(state.displaySpeedKmh));
  set('car-gear', state.inCar ? `GEAR ${state.gear}` : 'ON FOOT');
  setStyle('car-cond', 'width', `${state.condition}%`);
  if (nearMissUntil !== Infinity && performance.now() > nearMissUntil) {
    setStyle('hud-nearmiss', 'display', 'none');
  }
  // WANTED blink: 0.75 opacity at capture.
  if (state.wanted > 0) {
    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    setStyle('hud-wanted', 'display', blink ? 'block' : 'none');
    setStyle('hud-wanted', 'opacity', '0.75');
  } else {
    setStyle('hud-wanted', 'display', 'none');
  }
  if (frameCount % 2 === 0) drawMinimap(state);
}

// Minimap: whole-city view, streets drawn, bay on the right.
function drawMinimap(state) {
  if (!mapCtx) return;
  const S = 150;
  const scale = S / 280;
  const mx = (x) => (x + 140) * scale;
  const my = (z) => (z + 140) * scale;
  mapCtx.clearRect(0, 0, S, S);
  // Base: brightened navy, circular clip.
  mapCtx.save();
  mapCtx.beginPath();
  mapCtx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  mapCtx.clip();
  mapCtx.fillStyle = '#16233f';
  mapCtx.fillRect(0, 0, S, S);
  // Bay water on the right.
  mapCtx.fillStyle = '#1d4a68';
  mapCtx.fillRect(mx(62), 0, S - mx(62), S);
  // Streets: avenue + cross streets + ring.
  mapCtx.strokeStyle = 'rgba(220,228,240,0.75)';
  mapCtx.lineWidth = 2;
  mapCtx.beginPath();
  mapCtx.moveTo(mx(0), my(-120));
  mapCtx.lineTo(mx(0), my(120));
  for (const sz of WORLD.streets) {
    mapCtx.moveTo(mx(-110), my(sz));
    mapCtx.lineTo(mx(60), my(sz));
  }
  mapCtx.stroke();
  mapCtx.strokeStyle = 'rgba(245,197,24,0.8)';
  mapCtx.lineWidth = 1.5;
  mapCtx.strokeRect(mx(-104), my(-104), (208) * scale, (208) * scale);
  // GPS route: dashed cyan from player to target.
  const t = state.target;
  if (t) {
    mapCtx.strokeStyle = '#37c8f5';
    mapCtx.lineWidth = 2;
    mapCtx.setLineDash([4, 3]);
    mapCtx.beginPath();
    mapCtx.moveTo(mx(state.player.x), my(state.player.z));
    mapCtx.lineTo(mx(t.x), my(t.z));
    mapCtx.stroke();
    mapCtx.setLineDash([]);
    mapCtx.fillStyle = '#ff4444';
    mapCtx.beginPath();
    mapCtx.arc(mx(t.x), my(t.z), 4, 0, Math.PI * 2);
    mapCtx.fill();
  }
  // Police dots.
  mapCtx.fillStyle = '#4a9ae8';
  for (const p of state.police) {
    mapCtx.beginPath();
    mapCtx.arc(mx(p.x), my(p.z), 3, 0, Math.PI * 2);
    mapCtx.fill();
  }
  // Player arrow, rotated by heading.
  mapCtx.save();
  mapCtx.translate(mx(state.player.x), my(state.player.z));
  mapCtx.rotate(Math.atan2(Math.sin(state.player.heading), Math.cos(state.player.heading)));
  mapCtx.fillStyle = '#ffffff';
  mapCtx.beginPath();
  mapCtx.moveTo(0, -7);
  mapCtx.lineTo(5, 5);
  mapCtx.lineTo(-5, 5);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.restore();
  mapCtx.restore();
}

export function hudState(game) {
  return {
    chapter: game.state.chapter,
    stage: game.state.stage,
    money: game.state.money,
    wanted: game.state.wanted,
    clock: game.state.clock,
    street: game.state.street,
    respect: game.state.respect,
    respectLevel: game.state.respectLevel,
    radio: game.radio,
    inCar: game.state.inCar,
    carName: game.state.carName,
    displaySpeedKmh: game.state.displaySpeedKmh,
    gear: game.state.gear,
    condition: game.state.condition,
    player: game.playerPos(),
    police: game.policePos(),
    target: game.missionTarget(),
  };
}
