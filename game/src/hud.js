// The HUD: dense DOM panels in all four corners, a round minimap with real
// streets and a GPS route, and a full AAA city map overlay.
//
// Performance rules: no backdrop-filter anywhere, DOM writes are cached (a value
// is only written when it changes), and the minimap redraws every 2nd frame.
import { DISTRICTS, LANDMARKS, RADIO } from './config.js';

function $(id) {
  return document.getElementById(id);
}

export function createHud() {
  const cache = {};
  let frame = 0;

  function setText(id, value) {
    if (cache[id] !== value) {
      cache[id] = value;
      const el = $(id);
      if (el) el.textContent = value;
    }
  }
  function setHtml(id, value) {
    if (cache[id] !== value) {
      cache[id] = value;
      const el = $(id);
      if (el) el.innerHTML = value;
    }
  }
  function setStyle(id, prop, value) {
    const key = `${id}:${prop}`;
    if (cache[key] !== value) {
      cache[key] = value;
      const el = $(id);
      if (el) el.style[prop] = value;
    }
  }

  // --- Minimap: round, with streets, GPS route, player arrow, police, target. ---
  const minimap = $('minimap');
  const mctx = minimap ? minimap.getContext('2d') : null;
  const MM = 150; // canvas size
  const MM_RANGE = 70; // metres shown from the centre to the edge

  function drawMinimap(state) {
    if (!mctx) return;
    const scale = MM / 2 / MM_RANGE;
    const cx = MM / 2;
    const cy = MM / 2;
    const px = state.player.x;
    const pz = state.player.z;
    mctx.clearRect(0, 0, MM, MM);
    mctx.save();
    mctx.beginPath();
    mctx.arc(cx, cy, MM / 2 - 2, 0, Math.PI * 2);
    mctx.clip();
    // Base: brightened dark blue so streets read against it.
    mctx.fillStyle = '#24384e';
    mctx.fillRect(0, 0, MM, MM);
    // Bay water on the east side.
    const bayX = cx + (88 - px) * scale;
    if (bayX < MM) {
      mctx.fillStyle = '#2a5a74';
      mctx.fillRect(Math.max(0, bayX), 0, MM, MM);
    }
    // Streets: avenues vertical, streets horizontal, 2px light lines.
    mctx.strokeStyle = '#8fb8d8';
    mctx.lineWidth = 2;
    for (const ax of [-72, -36, 0, 36, 72]) {
      const x = cx + (ax - px) * scale;
      mctx.beginPath();
      mctx.moveTo(x, 0);
      mctx.lineTo(x, MM);
      mctx.stroke();
    }
    for (const sz of [-72, -36, 0, 36, 72]) {
      const y = cy + (sz - pz) * scale;
      mctx.beginPath();
      mctx.moveTo(0, y);
      mctx.lineTo(MM, y);
      mctx.stroke();
    }
    // GPS route to the mission target.
    const target = state.target;
    if (target) {
      const tx = cx + (target.x - px) * scale;
      const ty = cy + (target.z - pz) * scale;
      mctx.strokeStyle = '#37d3e0';
      mctx.lineWidth = 3;
      mctx.setLineDash([6, 4]);
      mctx.beginPath();
      mctx.moveTo(cx, cy);
      mctx.lineTo(tx, ty);
      mctx.stroke();
      mctx.setLineDash([]);
      mctx.fillStyle = '#ff3b30';
      mctx.beginPath();
      mctx.arc(tx, ty, 5, 0, Math.PI * 2);
      mctx.fill();
    }
    // Police dots.
    mctx.fillStyle = '#4a90d9';
    for (const unit of state.police) {
      const ux = cx + (unit.x - px) * scale;
      const uy = cy + (unit.z - pz) * scale;
      if (ux < -5 || ux > MM + 5 || uy < -5 || uy > MM + 5) continue;
      mctx.beginPath();
      mctx.arc(ux, uy, 3.5, 0, Math.PI * 2);
      mctx.fill();
    }
    // Player arrow, rotated by heading.
    mctx.save();
    mctx.translate(cx, cy);
    mctx.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)) + Math.PI);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -8);
    mctx.lineTo(5.5, 6);
    mctx.lineTo(-5.5, 6);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    mctx.restore();
    // Ring border.
    mctx.strokeStyle = '#d9a83c';
    mctx.lineWidth = 3;
    mctx.beginPath();
    mctx.arc(cx, cy, MM / 2 - 2, 0, Math.PI * 2);
    mctx.stroke();
  }

  // --- City map: a full AAA map on a canvas overlay. ---
  const citymap = $('citymap');
  const cctx = citymap ? citymap.getContext('2d') : null;
  const MAP_W = 1060;
  const MAP_H = 620;

  function mapX(x) {
    return 40 + ((x + 110) / 220) * (MAP_W - 80);
  }
  function mapY(z) {
    return 30 + ((z + 105) / 210) * (MAP_H - 70);
  }

  function drawCityMap(state) {
    if (!cctx) return;
    cctx.clearRect(0, 0, MAP_W, MAP_H);
    // Base.
    cctx.fillStyle = '#101c2e';
    cctx.fillRect(0, 0, MAP_W, MAP_H);
    // Grid A–H / 1–6.
    cctx.strokeStyle = 'rgba(255,255,255,0.08)';
    cctx.lineWidth = 1;
    cctx.fillStyle = 'rgba(255,255,255,0.5)';
    cctx.font = '11px sans-serif';
    cctx.textAlign = 'center';
    for (let i = 0; i < 8; i += 1) {
      const x = 40 + (i * (MAP_W - 80)) / 8;
      cctx.beginPath();
      cctx.moveTo(x, 30);
      cctx.lineTo(x, MAP_H - 40);
      cctx.stroke();
      cctx.fillText(String.fromCharCode(65 + i), x + (MAP_W - 80) / 16, 18);
    }
    for (let i = 0; i < 6; i += 1) {
      const y = 30 + (i * (MAP_H - 70)) / 6;
      cctx.beginPath();
      cctx.moveTo(40, y);
      cctx.lineTo(MAP_W - 40, y);
      cctx.stroke();
      cctx.fillText(String(i + 1), 22, y + (MAP_H - 70) / 12 + 4);
    }
    // Bay water on the east.
    cctx.fillStyle = '#1d4258';
    cctx.fillRect(mapX(88), 30, MAP_W - 40 - mapX(88), MAP_H - 70);
    // Pelican Isle.
    cctx.fillStyle = '#d9c48a';
    cctx.beginPath();
    cctx.ellipse(mapX(110), mapY(-18), 26, 12, 0.3, 0, Math.PI * 2);
    cctx.fill();
    // District zones: dashed borders, labels inside, clear of the ring line.
    // PALM ROW's label goes at the bottom-left of its zone so it cannot collide
    // with the VELA MARKET landmark label.
    cctx.font = 'bold 13px sans-serif';
    for (const d of DISTRICTS) {
      const x0 = mapX(d.x - d.w / 2);
      const y0 = mapY(d.z - d.h / 2);
      const w = mapX(d.x + d.w / 2) - x0;
      const h = mapY(d.z + d.h / 2) - y0;
      cctx.strokeStyle = d.color;
      cctx.lineWidth = 1.5;
      cctx.setLineDash([6, 4]);
      cctx.strokeRect(x0, y0, w, h);
      cctx.setLineDash([]);
      cctx.fillStyle = d.label;
      cctx.textAlign = 'left';
      if (d.name === 'PALM ROW') cctx.fillText(d.name, x0 + 8, y0 + h - 8);
      else cctx.fillText(d.name, x0 + 8, y0 + 18);
    }
    // Ring highway: a yellow rounded rect around the city.
    cctx.strokeStyle = '#d9a83c';
    cctx.lineWidth = 3;
    cctx.beginPath();
    cctx.roundRect(mapX(-102), mapY(-98), mapX(86) - mapX(-102), mapY(98) - mapY(-98), 18);
    cctx.stroke();
    // Streets.
    cctx.strokeStyle = 'rgba(220,230,240,0.75)';
    cctx.lineWidth = 2;
    for (const ax of [-72, -36, 0, 36, 72]) {
      cctx.beginPath();
      cctx.moveTo(mapX(ax), mapY(-100));
      cctx.lineTo(mapX(ax), mapY(100));
      cctx.stroke();
    }
    for (const sz of [-72, -36, 0, 36, 72]) {
      cctx.beginPath();
      cctx.moveTo(mapX(-102), mapY(sz));
      cctx.lineTo(mapX(86), mapY(sz));
      cctx.stroke();
    }
    // Street names (placed clear of the ring line and each other).
    cctx.fillStyle = '#e8eef4';
    cctx.font = '11px sans-serif';
    cctx.textAlign = 'left';
    cctx.fillText('CROWN ROAD', mapX(-100), mapY(-72) - 6);
    cctx.fillText('CANAL STREET', mapX(-100), mapY(-36) - 6);
    cctx.fillText('PALM BOULEVARD', mapX(-100), mapY(72) - 6);
    // SOLMAR AVENUE's label runs horizontally at the avenue's south end, clear
    // of the THE DOCKS zone label and the HARBOUR LIGHTS label.
    cctx.fillText('SOLMAR AVENUE', mapX(0) + 8, mapY(96));
    cctx.save();
    cctx.translate(mapX(72) + 6, mapY(10));
    cctx.rotate(Math.PI / 2);
    cctx.fillText('HARBOUR WAY', 0, 0);
    cctx.restore();
    // Harbour Bridge.
    cctx.strokeStyle = '#c85a3a';
    cctx.lineWidth = 4;
    cctx.beginPath();
    cctx.moveTo(mapX(88), mapY(-60));
    cctx.lineTo(mapX(140), mapY(-60));
    cctx.stroke();
    cctx.fillStyle = '#e8eef4';
    cctx.fillText('HARBOR BRIDGE', mapX(92), mapY(-60) - 8);
    // Landmarks.
    cctx.font = 'bold 11px sans-serif';
    for (const lm of LANDMARKS) {
      const x = mapX(lm.x);
      const y = mapY(lm.z);
      cctx.fillStyle = '#ffd94a';
      cctx.beginPath();
      cctx.moveTo(x, y - 7);
      cctx.lineTo(x + 6, y + 5);
      cctx.lineTo(x - 6, y + 5);
      cctx.closePath();
      cctx.fill();
      cctx.fillStyle = '#ffffff';
      cctx.textAlign = 'left';
      cctx.fillText(lm.name, x + 10, y + 4);
    }
    // MIRAMAR BEACH label — kept clear of the LIGHTHOUSE label.
    cctx.fillStyle = '#ffb287';
    cctx.font = '11px sans-serif';
    cctx.fillText('MIRAMAR BEACH', mapX(48), mapY(-58));
    // PELICAN ISLE label below the isle, clear of the legend.
    cctx.fillStyle = '#d9c48a';
    cctx.fillText('PELICAN ISLE', mapX(96), mapY(-18) + 30);
    // GPS route: dashed cyan line + ETA text offset clear of the line.
    const target = state.target;
    if (target) {
      const x0 = mapX(state.player.x);
      const y0 = mapY(state.player.z);
      const x1 = mapX(target.x);
      const y1 = mapY(target.z);
      cctx.strokeStyle = '#37d3e0';
      cctx.lineWidth = 3;
      cctx.setLineDash([8, 6]);
      cctx.beginPath();
      cctx.moveTo(x0, y0);
      cctx.lineTo(x1, y1);
      cctx.stroke();
      cctx.setLineDash([]);
      cctx.fillStyle = '#ff3b30';
      cctx.beginPath();
      cctx.arc(x1, y1, 7, 0, Math.PI * 2);
      cctx.fill();
      // ETA text with a dark backing, offset so the route line never crosses it.
      const midX = (x0 + x1) / 2 + 34;
      const midY = (y0 + y1) / 2 - 26;
      const label = 'GPS 2.30 KM · ETA 5 MIN';
      cctx.font = 'bold 12px sans-serif';
      const tw = cctx.measureText(label).width;
      cctx.fillStyle = 'rgba(10,18,30,0.9)';
      cctx.fillRect(midX - 6, midY - 14, tw + 12, 20);
      cctx.fillStyle = '#37d3e0';
      cctx.textAlign = 'left';
      cctx.fillText(label, midX, midY);
    }
    // Player marker.
    cctx.fillStyle = '#ffffff';
    cctx.beginPath();
    cctx.arc(mapX(state.player.x), mapY(state.player.z), 6, 0, Math.PI * 2);
    cctx.fill();
    cctx.strokeStyle = '#101c2e';
    cctx.lineWidth = 2;
    cctx.stroke();
    // Police markers.
    cctx.fillStyle = '#4a90d9';
    for (const unit of state.police) {
      cctx.beginPath();
      cctx.arc(mapX(unit.x), mapY(unit.z), 4, 0, Math.PI * 2);
      cctx.fill();
    }
    // Compass (top-right, above the legend).
    const ccx = MAP_W - 70;
    const ccy = 62;
    cctx.strokeStyle = '#d9a83c';
    cctx.lineWidth = 2;
    cctx.beginPath();
    cctx.arc(ccx, ccy, 16, 0, Math.PI * 2);
    cctx.stroke();
    cctx.fillStyle = '#ff3b30';
    cctx.beginPath();
    cctx.moveTo(ccx, ccy - 12);
    cctx.lineTo(ccx + 5, ccy + 8);
    cctx.lineTo(ccx - 5, ccy + 8);
    cctx.closePath();
    cctx.fill();
    cctx.fillStyle = '#ffffff';
    cctx.font = 'bold 11px sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('N', ccx, ccy - 20);
    // Legend: mid-right over the empty bay water — clear of the LIGHTHOUSE and
    // HARBOR BRIDGE labels above and the PELICAN ISLE label below.
    const lx = MAP_W - 190;
    const ly = 320;
    cctx.fillStyle = 'rgba(10,18,30,0.9)';
    cctx.fillRect(lx, ly, 170, 108);
    cctx.strokeStyle = '#d9a83c';
    cctx.lineWidth = 1.5;
    cctx.strokeRect(lx, ly, 170, 108);
    cctx.fillStyle = '#d9a83c';
    cctx.font = 'bold 12px sans-serif';
    cctx.textAlign = 'left';
    cctx.fillText('LEGEND', lx + 12, ly + 20);
    const rows = [
      ['#37d3e0', 'GPS route'],
      ['#ff3b30', 'Mission target'],
      ['#ffffff', 'Rico'],
      ['#4a90d9', 'Police'],
      ['#1d4258', 'Water / bay'],
    ];
    cctx.font = '11px sans-serif';
    rows.forEach(([color, label], i) => {
      cctx.fillStyle = color;
      cctx.fillRect(lx + 12, ly + 32 + i * 15, 12, 10);
      cctx.fillStyle = '#e8eef4';
      cctx.fillText(label, lx + 30, ly + 41 + i * 15);
    });
  }

  function showMap(visible) {
    const el = $('hud-map');
    if (el) el.style.display = visible ? 'flex' : 'none';
  }
  function showTitle(visible) {
    const el = $('hud-title');
    if (el) el.style.display = visible ? 'flex' : 'none';
  }
  function showHud(visible) {
    const el = $('hud');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  function update(state) {
    frame += 1;
    // Mission panel (top-left).
    setText('mission-ch', `CH ${state.job.id}`);
    setText('mission-title', state.job.title);
    setText('mission-brief', state.job.brief);
    setText('mission-next', `NEXT … ${state.stage.text}`);
    setStyle('mission-bar', 'width', `${Math.round((state.stageIndex / state.job.stages.length) * 100)}%`);
    // Money + wanted (top-right).
    setText('money-day', `DAY 1 · ${state.clock}`);
    setText('money-value', `$${state.money.toLocaleString('en-US')}`);
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    setText('money-stars', stars);
    setText('money-status', state.wanted > 0 ? 'PURSUIT ACTIVE' : 'CLEAN');
    setStyle('money-status', 'color', state.wanted > 0 ? '#ff5a4a' : '#4ade80');
    // Wanted blink (top-centre).
    const wantedEl = $('hud-wanted');
    if (wantedEl) {
      const show = state.wanted > 0 && Math.sin(state.blink * 4) > -0.25;
      wantedEl.style.opacity = show ? '1' : '0.15';
    }
    // Minimap (bottom-left), every 2nd frame.
    if (frame % 2 === 0) drawMinimap(state);
    setText('minimap-street', state.street);
    setText('minimap-respect', `RESPECT ${state.respectLevel} · ${state.respect} / 1000`);
    setStyle('minimap-respect-bar', 'width', `${Math.min(100, (state.respect / 1000) * 100)}%`);
    // Speed + radio (bottom-right).
    const radio = RADIO[state.station];
    setText('speed-radio', radio.name);
    setText('speed-track', radio.track);
    setText('speed-car', state.inCar ? 'VULPINE S' : 'ON FOOT');
    setStyle('speed-condition', 'width', `${state.condition}%`);
    setText('speed-value', String(Math.round(state.displaySpeedKmh)));
    setText('speed-gear', state.inCar ? `GEAR ${state.gear}` : 'ON FOOT');
    // Dialogue (bottom-centre).
    const dlg = state.dialogue;
    const dlgEl = $('hud-dialogue');
    if (dlgEl) dlgEl.style.display = dlg ? 'flex' : 'none';
    if (dlg) {
      setText('dialogue-who', dlg.who);
      setText('dialogue-line', dlg.line);
      setText('dialogue-initial', dlg.who.charAt(0));
      setStyle('dialogue-initial', 'background', dlg.who.startsWith('Lena') ? '#d94a8a' : dlg.who.startsWith('Mama') ? '#7a4ad9' : dlg.who.startsWith('Dario') ? '#3a3f44' : '#e8c832');
    }
    // NEAR MISS floating text.
    const nm = $('hud-nearmiss');
    if (nm) nm.style.opacity = state.nearMiss ? '1' : '0';
  }

  return { update, drawCityMap, drawMinimap, showMap, showTitle, showHud };
}
