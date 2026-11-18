// HUD: mission panel, police panel, status, weapons, vitals, minimap,
// dialogue with portraits, floating action text, big map, garage menu.
import { S, STATIONS, WEAPONS, CITY, districtAt, clamp } from './state.js';
import { currentJob, currentStage, CREW, jobDone } from './missions.js';
import { units } from './police.js';
import { drawPortrait } from './util.js';

const $ = (id) => document.getElementById(id);
let dlgTimer = 0, toastTimer = 0, mmCtx = null, bigCtx = null;

export function initHUD() {
  mmCtx = $('minimap').getContext('2d');
  bigCtx = $('bigmap').getContext('2d');
}

export function showHUD(on) { $('hud').classList.toggle('hidden', !on); }

export function setMode(mode) {
  S.mode = mode;
  $('title-screen').classList.toggle('hidden', mode !== 'title');
  $('pause-menu').classList.toggle('hidden', mode !== 'paused');
  $('map-screen').classList.toggle('hidden', mode !== 'map');
  $('garage-menu').classList.toggle('hidden', mode !== 'garage');
  $('end-screen').classList.toggle('hidden', mode !== 'busted' && mode !== 'wasted');
  showHUD(mode === 'playing' || mode === 'garage');
}

export function showDialogue(who, text, secs = 4) {
  const c = CREW[who] || CREW.rico;
  $('dlg-name').textContent = c.name;
  $('dlg-text').textContent = text;
  drawPortrait($('dlg-portrait'), who);
  $('dialogue').classList.remove('hidden');
  dlgTimer = secs;
}

export function floatText(text, green = false) {
  // one live floater per text: re-firing restarts it instead of stacking
  document.querySelectorAll('#floaters .floater').forEach((el) => { if (el.textContent === text) el.remove(); });
  const d = document.createElement('div');
  d.className = 'floater' + (green ? ' green' : '');
  d.textContent = text;
  $('floaters').appendChild(d);
  // JS-driven rise + fade (CSS animations freeze at time 0 in headless captures)
  const t0 = performance.now();
  const tick = () => {
    const age = performance.now() - t0;
    if (age > 1600 || !d.isConnected) { d.remove(); return; }
    const p = age / 1600;
    d.style.opacity = String(p < 0.12 ? p / 0.12 : 1 - Math.max(0, p - 0.55) / 0.45);
    d.style.transform = `translateY(${14 - p * 60}px) scale(${p < 0.12 ? 0.85 + p : 1})`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function toast(text, secs = 2.5) {
  const t = $('toast');
  t.textContent = text; t.classList.remove('hidden');
  toastTimer = secs;
}

export function updateHUD(dt, px, pz, heading, speedKmh, carName, condition) {
  if (dlgTimer > 0) { dlgTimer -= dt; if (dlgTimer <= 0) $('dialogue').classList.add('hidden'); }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.add('hidden'); }

  // mission panel
  if (!jobDone()) {
    const job = currentJob(), st = currentStage();
    $('mp-chapter').textContent = job.chapter;
    $('mp-title').textContent = job.title;
    $('mp-desc').innerHTML = job.desc.replace(/\n/g, '<br>');
    $('mp-stage').textContent = `STAGE ${S.stage + 1}/${job.stages.length}`;
    const segs = $('mp-bar').children;
    for (let i = 0; i < segs.length; i++) segs[i].classList.toggle('on', i < S.stage + 1);
    $('mp-next').textContent = 'NEXT → ' + st.text;
  } else {
    $('mp-title').textContent = 'SOLMAR BAY — COMPLETE';
    $('mp-desc').innerHTML = 'All seven jobs done. The city is yours now.<br>Free roam: explore, race the rain, stay free.';
    $('mp-next').textContent = 'NEXT → Free roam';
  }

  // police panel
  const pp = $('police-panel');
  if (S.wanted > 0 && units.length) {
    pp.classList.remove('hidden');
    $('pp-units').innerHTML = units.map(u => {
      const cls = u.status === 'RAMMING' || u.status === 'PURSUIT' ? 'hot' : (u.status === 'CLOSING IN' ? 'warn' : 'cool');
      return `<div class="pp-unit"><span>${u.unitName}</span><span class="st ${cls}">${u.status}</span><span>${u.dist ?? '--'}m</span></div>`;
    }).join('') + (S.wanted >= 3 ? `<div class="pp-unit"><span>AIR-1</span><span class="st hot">OVERHEAD SPOTLIGHT</span><span>—</span></div>` : '');
  } else pp.classList.add('hidden');

  // status
  const hh = Math.floor(S.time), mm = Math.floor((S.time - hh) * 60);
  $('sp-day').innerHTML = `DAY ${S.day} &nbsp;|&nbsp; ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('sp-money').textContent = '$' + S.money.toLocaleString('en-US');
  $('sp-stars').textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
  $('sp-wanted').style.visibility = S.wanted > 0 ? 'visible' : 'hidden';
  $('sp-pursuit').style.visibility = S.wanted > 0 && units.length ? 'visible' : 'hidden';

  // weapons
  document.querySelectorAll('.wp-slot').forEach((el, i) => el.classList.toggle('active', i === S.weapon));
  $('wp-ammo').textContent = S.ammo[1];

  // vitals
  $('vit-hp').style.width = S.health + '%'; $('vit-hp-n').textContent = S.health;
  $('vit-ar').style.width = S.armour + '%'; $('vit-ar-n').textContent = S.armour;
  $('vit-rp').style.width = clamp(S.rep % 1000 / 10, 0, 100) + '%'; $('vit-rp-n').textContent = S.rep;

  // minimap + district + respect
  $('mm-district').textContent = districtAt(px, pz);
  $('mm-respect').innerHTML = `RESPECT ${S.respect} <div class="rbar"><i style="width:${clamp(S.rep % 1000 / 10, 0, 100)}%"></i></div> ${S.rep % 1000} / 1000`;
  drawMinimap(px, pz, heading);

  // vehicle panel
  const stn = STATIONS[S.radio];
  $('vp-station').textContent = S.radioOn ? stn.name : 'RADIO OFF';
  $('vp-station').style.color = stn.hue;
  $('vp-song').textContent = S.radioOn ? stn.song : '—';
  $('vp-car').textContent = carName || 'ON FOOT';
  $('vp-condbar').style.width = condition + '%';
  $('vp-cond-n').textContent = Math.round(condition) + '%';
  $('vp-speed-n').textContent = Math.round(speedKmh);
  $('crosshair').classList.toggle('hidden', S.inCar || S.mode !== 'playing');
}

// ---- minimap: rotating 2D canvas, coastline + streets + blips ----
function drawMinimap(px, pz, heading) {
  if (!mmCtx) return;
  const g = mmCtx, W = 220, R = W / 2;
  g.clearRect(0, 0, W, W);
  g.save();
  g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#0a1030'; g.fillRect(0, 0, W, W);
  const scale = 0.55; // px per metre
  g.translate(R, R); g.rotate(-heading);
  g.translate(-px * scale, -pz * scale);
  // water (south bay)
  g.fillStyle = '#0d2a55'; g.fillRect(-260 * scale, 280 * scale, 520 * scale, 160 * scale);
  // city ground
  g.fillStyle = '#131a38'; g.fillRect(-220 * scale, -330 * scale, 440 * scale, 610 * scale);
  // blocks
  g.fillStyle = '#1b2450';
  for (const zc of [-280, -150, -50, 50, 150, 230]) for (const xc of [-160, -95, -45, 45, 95, 160]) {
    g.fillRect((xc - 15) * scale, (zc - 14) * scale, 30 * scale, 28 * scale);
  }
  // roads
  g.fillStyle = '#3a4470';
  g.fillRect(-9 * scale, -330 * scale, 18 * scale, 610 * scale);
  for (const z of CITY.crossZ) g.fillRect(-220 * scale, (z - 7) * scale, 440 * scale, 14 * scale);
  // marina docks
  g.fillStyle = '#6e4a22';
  for (const dx of [-60, -20, 20, 60]) g.fillRect((dx - 2) * scale, 268 * scale, 4 * scale, 30 * scale);
  // objective blip
  if (!jobDone()) {
    const st = currentStage();
    if (st && st.spot) {
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(st.spot.x * scale, st.spot.z * scale, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    }
  }
  // garage + safehouse
  g.fillStyle = '#3dff7a'; g.fillRect((CITY.garage.x - 4) * scale, (CITY.garage.z - 4) * scale, 8 * scale, 8 * scale);
  g.fillStyle = '#ff2d95';
  g.beginPath(); g.arc(CITY.safehouse.x * scale, CITY.safehouse.z * scale, 5, 0, Math.PI * 2); g.fill();
  // police blips
  g.fillStyle = '#ff5a64';
  for (const u of units) { g.beginPath(); g.arc(u.x * scale, u.z * scale, 4, 0, Math.PI * 2); g.fill(); }
  g.restore();
  // player arrow (centre, pointing up)
  g.fillStyle = '#ff2a1a';
  g.beginPath(); g.moveTo(R, R - 12); g.lineTo(R - 7, R + 9); g.lineTo(R + 7, R + 9); g.closePath(); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
}

// ---- big map (M key) ----
export function drawBigMap(px, pz) {
  if (!bigCtx) return;
  const g = bigCtx, W = 760, H = 520;
  g.fillStyle = '#070b22'; g.fillRect(0, 0, W, H);
  const sx = (x) => (x + 230) / 460 * W, sz = (z) => (z + 340) / 680 * H;
  g.fillStyle = '#0d2a55'; g.fillRect(0, sz(280), W, H - sz(280)); // bay
  g.fillStyle = '#131a38'; g.fillRect(sx(-220), sz(-330), sx(220) - sx(-220), sz(280) - sz(-330));
  g.fillStyle = '#1b2450';
  for (const zc of [-280, -150, -50, 50, 150, 230]) for (const xc of [-160, -95, -45, 45, 95, 160]) {
    g.fillRect(sx(xc - 15), sz(zc - 14), sx(xc + 15) - sx(xc - 15), sz(zc + 14) - sz(zc - 14));
  }
  g.fillStyle = '#3a4470';
  g.fillRect(sx(-9), sz(-330), sx(9) - sx(-9), sz(280) - sz(-330));
  for (const z of CITY.crossZ) g.fillRect(sx(-220), sz(z - 7), sx(220) - sx(-220), sz(z + 7) - sz(z - 7));
  g.fillStyle = '#6e4a22';
  for (const dx of [-60, -20, 20, 60]) g.fillRect(sx(dx - 2), sz(268), sx(dx + 2) - sx(dx - 2), sz(298) - sz(268));
  g.font = '700 13px Arial'; g.textAlign = 'center';
  const label = (t, x, z, c = '#8fa0e8') => { g.fillStyle = c; g.fillText(t, sx(x), sz(z)); };
  label('DOWNTOWN', 0, -300); label('WESTSIDE', -130, 0); label('EASTSIDE', 130, 0);
  label('LUMEN AVENUE', 0, 120, '#ffd23f'); label('OLD HARBOUR', 0, 300, '#7ee2ff');
  // markers
  const mark = (x, z, c, txt) => {
    g.fillStyle = c; g.beginPath(); g.arc(sx(x), sz(z), 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#fff'; g.font = '700 11px Arial'; g.fillText(txt, sx(x), sz(z) - 13);
  };
  mark(CITY.garage.x, CITY.garage.z, '#3dff7a', 'GARAGE');
  mark(CITY.safehouse.x, CITY.safehouse.z, '#ff2d95', 'SAFEHOUSE');
  const mSpot = (!jobDone() && currentStage() && currentStage().spot) ? currentStage().spot : null;
  const impIsTarget = mSpot && Math.hypot(mSpot.x - CITY.impound.x, mSpot.z - CITY.impound.z) < 5;
  if (!impIsTarget) mark(CITY.impound.x, CITY.impound.z, '#ff9d2e', 'IMPOUND');
  if (mSpot) mark(mSpot.x, mSpot.z, '#ffd23f', '◆ MISSION');
  // player
  g.fillStyle = '#ff2a1a';
  g.beginPath(); g.moveTo(sx(px), sz(pz) - 10); g.lineTo(sx(px) - 7, sz(pz) + 8); g.lineTo(sx(px) + 7, sz(pz) + 8); g.closePath(); g.fill();
}

// ---- garage menu ----
export function renderGarage(car, onBuy) {
  const items = [
    { id: 'engine', name: 'Engine tune +15% top speed', price: 1500, have: car.engine },
    { id: 'armour', name: 'Armour plating (less damage)', price: 1200, have: car.armour },
    { id: 'repair', name: 'Full repair to 100% condition', price: 400, have: 0 },
    { id: 'paint', name: 'Repaint — midnight blue', price: 600, have: 0 },
    { id: 'clean', name: 'Lose the cops (fake plates)', price: 800, have: 0 },
  ];
  $('gm-car').textContent = `${car.spec.name} · CONDITION ${Math.round(car.condition)}% · ENGINE Lv${car.engine} · ARMOUR Lv${car.armour}`;
  $('gm-items').innerHTML = items.map(it => `
    <div class="gm-row"><span>${it.name}${it.have ? ` <b>(Lv${it.have})</b>` : ''}</span>
    <button data-buy="${it.id}">$${it.price.toLocaleString('en-US')}</button></div>`).join('');
  $('gm-items').querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => onBuy(b.dataset.buy)));
}

export function showEnd(kind, text) {
  $('end-title').textContent = kind;
  $('end-text').textContent = text;
}
