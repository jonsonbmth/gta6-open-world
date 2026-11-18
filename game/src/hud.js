// SOLMAR BAY — HUD: dense four-corner DOM overlay, round minimap and the
// AAA city map (district zones, named streets, landmarks, GPS route, grid).
import { DISTRICTS, LANDMARKS, CITY, CREW } from './config.js';
import { makePortraitDataURL } from './textures.js';

const STREET_NAMES = [
  { z: -240, name: 'VISTA AVE' },
  { z: -160, name: 'MERIDIAN BLVD' },
  { z: -80, name: 'PALM ROW' },
  { z: 0, name: 'LUMEN CROSSING' },
  { z: 80, name: 'CORAL ST' },
  { z: 160, name: 'DOCKSIDE LN' },
  { z: 240, name: 'SUNSET WAY' },
];

const PORTRAITS = {};
for (const key of Object.keys(CREW)) PORTRAITS[key] = makePortraitDataURL(CREW[key]);

export function createHUD(doc) {
  const $ = (id) => doc.getElementById(id);
  const el = {
    missionChapter: $('mission-chapter'),
    missionTitle: $('mission-title'),
    missionText: $('mission-text'),
    missionStage: $('mission-stage'),
    missionProgress: $('mission-progress'),
    missionNext: $('mission-next'),
    clock: $('clock'),
    money: $('money'),
    stars: $('stars'),
    wantedLabel: $('wanted-label'),
    pursuitLabel: $('pursuit-label'),
    minimap: $('minimap'),
    districtLabel: $('district-label'),
    respectLabel: $('respect-label'),
    respectBar: $('respect-bar'),
    radioStation: $('radio-station'),
    radioTrack: $('radio-track'),
    carName: $('car-name'),
    conditionBar: $('condition-bar'),
    conditionPct: $('condition-pct'),
    speed: $('speed'),
    gear: $('gear'),
    dialogueBox: $('dialogue-box'),
    dialoguePortrait: $('dialogue-portrait'),
    dialogueName: $('dialogue-name'),
    dialogueText: $('dialogue-text'),
    floatingLayer: $('floating-layer'),
    wantedBanner: $('wanted-banner'),
    mapOverlay: $('map-overlay'),
    citymap: $('citymap'),
    mapRouteInfo: $('map-route-info'),
    hintLine: $('hint-line'),
    damage: $('damage-vignette'),
    hud: $('hud'),
  };
  const miniCtx = el.minimap.getContext('2d');
  const mapCtx = el.citymap.getContext('2d');
  let lastFloatAt = 0;
  // Cached DOM values: rewriting innerHTML/textContent every frame churns
  // layout, so each field is only written when its value actually changes.
  const cache = {};
  let miniFrame = 0;
  function setText(node, key, value) {
    if (cache[key] !== value) {
      cache[key] = value;
      node.textContent = value;
    }
  }
  function setHTML(node, key, value) {
    if (cache[key] !== value) {
      cache[key] = value;
      node.innerHTML = value;
    }
  }
  function setWidth(node, key, pct) {
    const v = pct.toFixed(1);
    if (cache[key] !== v) {
      cache[key] = v;
      node.style.width = `${pct}%`;
    }
  }

  function fmtMoney(n) {
    return '$' + Math.floor(n).toLocaleString('en-US');
  }

  function starsHTML(wanted) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      out += `<span class="star ${i < wanted ? 'lit' : ''}">★</span>`;
    }
    return out;
  }

  function update(s) {
    // Top-left: mission panel.
    setText(el.missionChapter, 'chapter', s.mission.chapter);
    setText(el.missionTitle, 'jobTitle', s.mission.jobTitle);
    setText(el.missionText, 'stageText', s.mission.stageText);
    setText(el.missionStage, 'stage', `STAGE ${s.mission.stageNum}/${s.mission.stageTotal}`);
    let segs = '';
    for (let i = 0; i < s.mission.stageTotal; i++) {
      segs += `<span class="seg ${i < s.mission.stageNum ? 'done' : ''}"></span>`;
    }
    setHTML(el.missionProgress, 'segs', segs);
    const next = s.mission.next || 'Free roam — explore Solmar Bay';
    setText(el.missionNext, 'next', 'NEXT → ' + next);
    // Top-right: status.
    setText(el.clock, 'clock', `DAY ${s.day}  ${s.timeStr}`);
    setText(el.money, 'money', fmtMoney(s.money));
    setHTML(el.stars, 'stars', starsHTML(s.wanted));
    el.wantedLabel.style.visibility = s.wanted > 0 ? 'visible' : 'hidden';
    el.pursuitLabel.style.visibility = s.wanted > 0 ? 'visible' : 'hidden';
    setText(el.pursuitLabel, 'pursuit', s.wanted >= 3 ? 'PURSUIT ACTIVE — AIR-1 OVERHEAD' : 'PURSUIT ACTIVE');
    // Bottom-left: district + respect.
    setText(el.districtLabel, 'district', s.district.name);
    if (cache.districtColor !== s.district.color) {
      cache.districtColor = s.district.color;
      el.districtLabel.style.background = s.district.color;
    }
    setText(el.respectLabel, 'respect', `RESPECT ${s.respectLevel}  ·  ${s.respect} / 1000`);
    setWidth(el.respectBar, 'respectBar', Math.min(100, (s.respect / 1000) * 100));
    // Bottom-right: radio + vehicle.
    setText(el.radioStation, 'radio', `♪ ${s.radioStation}`);
    setText(el.radioTrack, 'track', s.radioTrack);
    setText(el.carName, 'car', s.driving ? s.carName : 'ON FOOT');
    setWidth(el.conditionBar, 'cond', s.condition);
    const condColor = s.condition > 50 ? '#39ff88' : s.condition > 25 ? '#ffb020' : '#ff2222';
    if (cache.condColor !== condColor) {
      cache.condColor = condColor;
      el.conditionBar.style.background = condColor;
    }
    setText(el.conditionPct, 'condPct', `${Math.round(s.condition)}%`);
    setText(el.speed, 'speed', `${Math.round(s.speedKmh)}`);
    setText(el.gear, 'gear', s.driving ? `GEAR ${s.gear}` : 'WALK');
    const dmg = s.condition < 35 && s.driving ? String((35 - s.condition) / 60) : '0';
    if (cache.dmg !== dmg) {
      cache.dmg = dmg;
      el.damage.style.opacity = dmg;
    }
    // Minimap: every 2nd frame is plenty (it rotates with the player).
    if ((miniFrame++ & 1) === 0) drawMinimap(s);
  }

  // --- Round minimap (2D canvas, rotates with the player heading).
  function drawMinimap(s) {
    const c = miniCtx;
    const W = 190, H = 190, R = 95;
    const scale = 0.55; // px per metre
    c.clearRect(0, 0, W, H);
    c.save();
    c.beginPath();
    c.arc(R, R, R - 2, 0, Math.PI * 2);
    c.clip();
    // Land + water.
    c.fillStyle = '#10142a';
    c.fillRect(0, 0, W, H);
    c.save();
    c.translate(R, R);
    c.rotate(-s.heading);
    c.translate(-s.player.x * scale, -s.player.z * scale);
    // Bay (west of the coast).
    c.fillStyle = '#0a2a55';
    c.fillRect((CITY.coastX - 220) * scale, -400 * scale, 220 * scale, 800 * scale);
    // District tint.
    for (const d of DISTRICTS) {
      c.fillStyle = d.color + '22';
      c.fillRect(d.x0 * scale, d.z0 * scale, (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
    // Ring highway.
    c.strokeStyle = '#ffb020';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, CITY.ringRadius * scale, 0, Math.PI * 2);
    c.stroke();
    // Roads.
    c.strokeStyle = '#7a8ac0';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(0, -320 * scale); c.lineTo(0, 320 * scale);
    c.stroke();
    c.lineWidth = 4;
    for (const z of CITY.crossStreetsZ) {
      c.beginPath(); c.moveTo(-320 * scale, z * scale); c.lineTo(320 * scale, z * scale); c.stroke();
    }
    for (const x of CITY.sideStreetsX) {
      c.beginPath(); c.moveTo(x * scale, -320 * scale); c.lineTo(x * scale, 320 * scale); c.stroke();
    }
    // Objective blip (pulsing yellow diamond).
    if (s.objective) {
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.25;
      c.save();
      c.translate(s.objective.x * scale, s.objective.z * scale);
      c.rotate(Math.PI / 4);
      c.fillStyle = '#ffd60a';
      const sz = 7 * pulse;
      c.fillRect(-sz / 2, -sz / 2, sz, sz);
      c.restore();
    }
    // Police blips.
    for (const p of s.police) {
      c.fillStyle = Math.sin(performance.now() / 120) > 0 ? '#ff2222' : '#2266ff';
      c.beginPath();
      c.arc(p.x * scale, p.z * scale, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // North indicator.
    c.fillStyle = '#ffffff';
    c.font = 'bold 13px Arial';
    c.textAlign = 'center';
    c.fillText('N', R + Math.sin(-s.heading) * (R - 12), R - Math.cos(-s.heading) * (R - 12) + 5);
    // Player arrow (always up).
    c.fillStyle = '#ff2222';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(R, R - 11);
    c.lineTo(R - 7, R + 8);
    c.lineTo(R, R + 3);
    c.lineTo(R + 7, R + 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    // Rim.
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(R, R, R - 2, 0, Math.PI * 2);
    c.stroke();
  }

  // --- AAA city map (full overlay canvas, 1100 x 760).
  function drawCityMap(s) {
    const c = mapCtx;
    const W = 1100, H = 760;
    const mx = (x) => 60 + ((x + 320) / 640) * 980;
    const mz = (z) => 40 + ((z + 320) / 640) * 680;
    c.clearRect(0, 0, W, H);
    // Background.
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0e22');
    bg.addColorStop(1, '#12142e');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    // Grid A–H / 1–6.
    c.strokeStyle = 'rgba(255,255,255,0.07)';
    c.lineWidth = 1;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = 'bold 12px Arial';
    c.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      const x = 60 + (i + 0.5) * 122.5;
      c.fillText('ABCDEFGH'[i], x, 28);
      c.fillText('ABCDEFGH'[i], x, H - 12);
    }
    c.textAlign = 'left';
    for (let i = 0; i < 6; i++) {
      const y = 40 + (i + 0.5) * 113.3;
      c.fillText(String(i + 1), 18, y + 4);
      c.fillText(String(i + 1), W - 34, y + 4);
    }
    // Bay: gradient + wavy coastline.
    const bay = c.createLinearGradient(mx(-320), 0, mx(-200), 0);
    bay.addColorStop(0, '#04122e');
    bay.addColorStop(1, '#0a2a55');
    c.fillStyle = bay;
    c.beginPath();
    c.moveTo(mx(-320), mz(-320));
    c.lineTo(mx(-320), mz(320));
    for (let z = 320; z >= -320; z -= 20) {
      c.lineTo(mx(-200 + Math.sin(z / 47) * 7), mz(z));
    }
    c.closePath();
    c.fill();
    c.strokeStyle = '#39c6ff';
    c.lineWidth = 2;
    c.beginPath();
    for (let z = -320; z <= 320; z += 10) {
      const x = mx(-200 + Math.sin(z / 47) * 7);
      const y = mz(z);
      if (z === -320) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    c.fillStyle = '#39c6ff';
    c.font = 'bold 20px Arial';
    c.save();
    c.translate(mx(-292), mz(0));
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center';
    c.fillText('S O L M A R   B A Y', 0, 0);
    c.restore();
    // District zones: coloured fill + dashed border + label.
    for (const d of DISTRICTS) {
      c.fillStyle = d.color + '26';
      c.fillRect(mx(d.x0), mz(d.z0), mx(d.x1) - mx(d.x0), mz(d.z1) - mz(d.z0));
      c.strokeStyle = d.color;
      c.lineWidth = 1.6;
      c.setLineDash([8, 6]);
      c.strokeRect(mx(d.x0), mz(d.z0), mx(d.x1) - mx(d.x0), mz(d.z1) - mz(d.z0));
      c.setLineDash([]);
      c.fillStyle = d.color;
      c.font = 'bold 15px Arial';
      c.textAlign = 'center';
      // Lumen Strip's label sits right of the avenue so the GPS route
      // (which runs down x = 0) never strikes through the text.
      const labelX = (mx(d.x0) + mx(d.x1)) / 2 + (d.id === 'lumen' ? 56 : 0);
      c.fillText(d.name, labelX, mz(d.z0) + 22);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.font = '11px Arial';
      c.fillText(d.blurb, labelX, mz(d.z0) + 38);
    }
    // Ring highway (curved ellipse).
    c.strokeStyle = '#ffb020';
    c.lineWidth = 7;
    c.beginPath();
    c.ellipse(mx(0), mz(0), CITY.ringRadius * 1.53, CITY.ringRadius * 1.06, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#0b0e22';
    c.lineWidth = 1.5;
    c.setLineDash([10, 10]);
    c.beginPath();
    c.ellipse(mx(0), mz(0), CITY.ringRadius * 1.53, CITY.ringRadius * 1.06, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#ffb020';
    c.font = 'bold 12px Arial';
    c.textAlign = 'center';
    c.fillText('RING HIGHWAY', mx(150), 700);
    // Streets + names.
    c.strokeStyle = '#8d97c8';
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(mx(0), mz(-320)); c.lineTo(mx(0), mz(320)); c.stroke();
    c.lineWidth = 3.5;
    for (const st of STREET_NAMES) {
      c.beginPath(); c.moveTo(mx(-320), mz(st.z)); c.lineTo(mx(320), mz(st.z)); c.stroke();
    }
    for (const x of CITY.sideStreetsX) {
      c.beginPath(); c.moveTo(mx(x), mz(-320)); c.lineTo(mx(x), mz(320)); c.stroke();
    }
    c.fillStyle = '#ffffff';
    c.font = 'bold 13px Arial';
    c.save();
    c.translate(mx(0) - 10, mz(150));
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center';
    c.fillText('LUMEN AVENUE', 0, 0);
    c.restore();
    c.font = '11px Arial';
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.textAlign = 'left';
    for (const st of STREET_NAMES) {
      c.fillText(st.name, mx(170), mz(st.z) - 6);
    }
    // Bridge + Pelican Isle.
    c.strokeStyle = '#00e5ff';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(mx(-200), mz(-40)); c.lineTo(mx(-264), mz(-40)); c.stroke();
    c.fillStyle = '#2a2438';
    c.beginPath();
    c.ellipse(mx(-276), mz(-40), 22, 16, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#39c6ff';
    c.lineWidth = 1.5;
    c.stroke();
    // Landmark icons (8 distinct glyphs).
    for (const lm of LANDMARKS) {
      // Pelican Isle's label goes left of its icon so it never collides
      // with the lighthouse icon right beside it; the lighthouse label
      // goes above its icon so the bridge icon never covers it.
      const labelOpts = lm.icon === 'isle'
        ? { dy: 4, dx: -18, align: 'right' }
        : lm.icon === 'light'
          ? { dy: -20, dx: 0, align: 'center' }
          : { dy: 26, dx: 0, align: 'center' };
      drawLandmark(c, mx(lm.x), mz(lm.z), lm.icon, lm.name, labelOpts);
    }
    // GPS route: player -> Lumen Ave -> objective, glowing green.
    if (s.objective) {
      const p = s.player;
      const o = s.objective;
      const way = [];
      way.push([mx(p.x), mz(p.z)]);
      way.push([mx(0), mz(p.z)]);
      way.push([mx(0), mz(o.z)]);
      way.push([mx(o.x), mz(o.z)]);
      c.strokeStyle = '#39ff88';
      c.lineWidth = 9;
      c.globalAlpha = 0.3;
      c.beginPath();
      way.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
      c.stroke();
      c.globalAlpha = 1;
      c.lineWidth = 3.5;
      c.stroke();
      // Distance label.
      const distM = Math.abs(p.x) + Math.abs(o.z - p.z) + Math.abs(o.x);
      el.mapRouteInfo.textContent = `GPS ROUTE  ·  ${(distM / 1000).toFixed(2)} KM  ·  ETA ${Math.max(1, Math.round(distM / 280))} MIN`;
      // Objective flag.
      c.fillStyle = '#ffd60a';
      c.beginPath();
      c.arc(mx(o.x), mz(o.z), 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#0b0e22';
      c.font = 'bold 12px Arial';
      c.textAlign = 'center';
      c.fillText('!', mx(o.x), mz(o.z) + 4);
    } else {
      el.mapRouteInfo.textContent = 'NO ACTIVE OBJECTIVE — FREE ROAM';
    }
    // Player arrow.
    c.save();
    c.translate(mx(s.player.x), mz(s.player.z));
    c.rotate(s.heading);
    c.fillStyle = '#ff2222';
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -13);
    c.lineTo(-9, 10);
    c.lineTo(0, 4);
    c.lineTo(9, 10);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    // Compass.
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath();
    c.arc(W - 66, 66, 30, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#ff2222';
    c.beginPath();
    c.moveTo(W - 66, 44);
    c.lineTo(W - 74, 66);
    c.lineTo(W - 58, 66);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = 'bold 14px Arial';
    c.textAlign = 'center';
    c.fillText('N', W - 66, 40);
    // Legend.
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(70, H - 118, 330, 92);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.strokeRect(70, H - 118, 330, 92);
    c.font = '12px Arial';
    c.textAlign = 'left';
    const legend = [
      ['#39ff88', 'GPS route'],
      ['#ffd60a', 'Mission objective'],
      ['#ff2222', 'You'],
      ['#ffb020', 'Ring highway'],
    ];
    legend.forEach(([col, label], i) => {
      const y = H - 96 + i * 20;
      c.fillStyle = col;
      c.fillRect(84, y - 9, 14, 8);
      c.fillStyle = '#ffffff';
      c.fillText(label, 108, y);
    });
    // Title.
    c.fillStyle = '#ffffff';
    c.font = '900 26px "Arial Black", Arial, sans-serif';
    c.textAlign = 'left';
    c.fillText('SOLMAR BAY', 70, 66);
    c.fillStyle = '#00e5ff';
    c.font = 'bold 13px Arial';
    c.fillText('CITY MAP  ·  NIGHT RAIN  ·  22:47', 70, 86);
  }

  function drawLandmark(c, x, y, icon, name, label = { dy: 26, dx: 0, align: 'center' }) {
    c.save();
    c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.beginPath();
    c.arc(0, 0, 13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    if (icon === 'tower') {
      c.fillRect(-4, -8, 8, 14);
      c.fillRect(-1, -11, 2, 4);
    } else if (icon === 'hotel') {
      c.fillRect(-7, -5, 14, 11);
      c.fillRect(-7, -9, 5, 4);
      c.fillRect(2, -9, 5, 4);
    } else if (icon === 'anchor') {
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 8); c.stroke();
      c.beginPath(); c.arc(0, 4, 6, 0.3, Math.PI - 0.3); c.stroke();
      c.beginPath(); c.moveTo(-6, -6); c.lineTo(6, -6); c.stroke();
    } else if (icon === 'light') {
      c.beginPath(); c.moveTo(-4, 8); c.lineTo(-2, -8); c.lineTo(2, -8); c.lineTo(4, 8); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, -9, 3, 0, Math.PI * 2); c.fill();
    } else if (icon === 'star') {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const a2 = a + Math.PI / 5;
        c.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        c.lineTo(Math.cos(a2) * 3.5, Math.sin(a2) * 3.5);
      }
      c.closePath();
      c.fill();
    } else if (icon === 'shop') {
      c.fillRect(-8, -3, 16, 9);
      c.beginPath(); c.moveTo(-8, -3); c.lineTo(0, -9); c.lineTo(8, -3); c.closePath(); c.fill();
    } else if (icon === 'bridge') {
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(-9, 6); c.quadraticCurveTo(0, -8, 9, 6); c.stroke();
      c.beginPath(); c.moveTo(-9, 8); c.lineTo(9, 8); c.stroke();
    } else if (icon === 'isle') {
      c.beginPath(); c.ellipse(0, 3, 9, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(-1, -8, 2, 10);
      c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.lineTo(0, -3); c.closePath(); c.fill();
    }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.font = '11px Arial';
    c.textAlign = label.align;
    c.fillText(name, x + label.dx, y + label.dy);
  }

  // --- Dialogue box (portrait + name + line).
  function showDialogue(personKey, line) {
    const person = CREW[personKey];
    if (!person) return;
    // Lines are "Name: text" — strip the prefix for the box.
    const text = line.includes(':') ? line.split(':').slice(1).join(':').trim() : line;
    el.dialoguePortrait.src = PORTRAITS[personKey];
    el.dialogueName.textContent = `${person.name} — ${person.role}`;
    el.dialogueText.textContent = text;
    el.dialogueBox.style.display = 'flex';
  }
  function hideDialogue() { el.dialogueBox.style.display = 'none'; }

  // --- Floating action text (NEAR MISS, DRIFT, +$).
  function floatText(text, cls = '') {
    const now = performance.now();
    if (now - lastFloatAt < 500) return;
    lastFloatAt = now;
    const d = doc.createElement('div');
    d.className = `float-text ${cls}`;
    d.textContent = text;
    el.floatingLayer.appendChild(d);
    window.setTimeout(() => d.remove(), 1800);
  }

  /** Persistent action text for screenshot staging (never fades). */
  function stickyFloat(text, cls = '') {
    el.floatingLayer.querySelectorAll('.float-text.sticky').forEach((n) => n.remove());
    const d = doc.createElement('div');
    d.className = `float-text sticky ${cls}`;
    d.textContent = text;
    el.floatingLayer.appendChild(d);
  }

  function showWantedBanner(text) {
    el.wantedBanner.textContent = text;
    el.wantedBanner.style.display = 'block';
    window.setTimeout(() => { el.wantedBanner.style.display = 'none'; }, 2600);
  }

  function setHint(text) {
    el.hintLine.textContent = text || '';
    el.hintLine.style.display = text ? 'block' : 'none';
  }

  function showMap(s) {
    drawCityMap(s);
    el.mapOverlay.style.display = 'flex';
  }
  function hideMap() { el.mapOverlay.style.display = 'none'; }
  function mapVisible() { return el.mapOverlay.style.display === 'flex'; }

  return {
    update, showDialogue, hideDialogue, floatText, stickyFloat, showWantedBanner,
    setHint, showMap, hideMap, mapVisible, drawCityMap, drawMinimap,
  };
}
