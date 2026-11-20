// SOLMAR BAY — HUD: dense four-corner HUD, circular minimap, and the full city
// map (M key) with districts, street names, GPS route, compass, legend, grid
// and scale. The map is the game's showpiece: never plain.

var SB = window.SB || (window.SB = {});

SB.hud = (function () {
  const cfg = SB.config;
  let minimap = null;
  let mapCanvas = null;
  let mapOpen = false;
  let clockEl = null;

  function el(id) { return document.getElementById(id); }

  function init() {
    minimap = el('minimap');
    mapCanvas = el('city-map');
    clockEl = el('clock');
    el('start-btn').addEventListener('click', function () {
      SB.audio.init();
      SB.game.start();
    });
    el('map-close').addEventListener('click', function () { setMap(false); });
  }

  // --- four-corner HUD ---------------------------------------------------------

  function updateHUD(game) {
    const m = SB.missions.state();
    // Top-left: wanted stars, cash, mission, timer.
    const stars = el('wanted-stars');
    let starHtml = '';
    for (let i = 0; i < 5; i++) {
      starHtml += '<span class="star' + (i < game.wanted ? ' on' : '') + '">&#9733;</span>';
    }
    stars.innerHTML = starHtml;
    el('cash').textContent = '$' + game.cash.toLocaleString('en-US');
    el('mission-name').textContent = cfg.mission.name + ' ' +
      (m ? Math.min(m.index + 1, 6) : 1) + '/6 — ' +
      (m && SB.missions.currentCheckpoint() ? SB.missions.currentCheckpoint().name : '');
    const t = m ? Math.max(0, m.timeLeft) : 0;
    el('mission-timer').textContent = Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    // Bottom-left: speed, gear, best drift.
    const kmh = Math.round(Math.abs(game.speed) * 3.6);
    el('speed-num').textContent = kmh;
    el('gear').textContent = game.speed > 0.5 ? (kmh > 100 ? '4' : kmh > 60 ? '3' : kmh > 25 ? '2' : '1') : (game.speed < -0.5 ? 'R' : 'N');
    el('best-drift').textContent = 'BEST DRIFT ' + game.bestDrift;
    el('drift-now').textContent = game.drifting ? 'DRIFT x' + game.driftCombo : '';
    // Top-right: district + clock.
    el('district').textContent = districtName(game.playerPos.x, game.playerPos.z);
    if (clockEl) {
      const mins = 17 * 60 + 42 + Math.floor(game.time / 10);
      clockEl.textContent = String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    }
    drawMinimap(game);
    if (mapOpen) drawCityMap(game);
  }

  function districtName(x, z) {
    for (const d of cfg.districts) {
      if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
    }
    return x > cfg.beachX ? 'SOLMAR BEACH' : 'SOLMAR BAY';
  }

  function showBanner(text, sub) {
    const b = el('banner');
    el('banner-main').textContent = text;
    el('banner-sub').textContent = sub || '';
    b.classList.add('show');
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.classList.remove('show'); }, 2600);
  }

  // --- minimap -------------------------------------------------------------------

  function drawMinimap(game) {
    if (!minimap) return;
    const g = minimap.getContext('2d');
    const S = 200;
    const scale = S / 760;
    const toPx = (v) => (v + 380) * scale;
    g.clearRect(0, 0, S, S);
    // Sea + sand.
    g.fillStyle = '#2f6f8f';
    g.fillRect(toPx(cfg.seaX), 0, S - toPx(cfg.seaX), S);
    g.fillStyle = '#e0c896';
    g.fillRect(toPx(cfg.beachX), 0, toPx(cfg.seaX) - toPx(cfg.beachX), S);
    // District tints.
    for (const d of cfg.districts) {
      g.fillStyle = d.color + '44';
      g.fillRect(toPx(d.x0), toPx(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
    // Streets.
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 1.4;
    for (const s of cfg.streets) {
      g.beginPath(); g.moveTo(toPx(s), 0); g.lineTo(toPx(s), S); g.stroke();
      g.beginPath(); g.moveTo(0, toPx(s)); g.lineTo(S, toPx(s)); g.stroke();
    }
    // GPS route.
    const path = SB.missions.gpsPath(game.playerPos);
    g.strokeStyle = '#ff5fa2';
    g.lineWidth = 2.5;
    g.setLineDash([6, 4]);
    g.beginPath();
    g.moveTo(toPx(path[0].x), toPx(path[0].z));
    for (let i = 1; i < path.length; i++) g.lineTo(toPx(path[i].x), toPx(path[i].z));
    g.stroke();
    g.setLineDash([]);
    // Checkpoints.
    for (let i = 0; i < cfg.mission.checkpoints.length; i++) {
      const cp = cfg.mission.checkpoints[i];
      const done = SB.missions.state() && i < SB.missions.state().index;
      g.beginPath();
      g.arc(toPx(cp.x), toPx(cp.z), 5, 0, Math.PI * 2);
      g.fillStyle = done ? '#5aa864' : '#ff8c2a';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = '#ffffff';
      g.stroke();
    }
    // Police dots.
    for (const c of SB.police.cars()) {
      g.beginPath();
      g.arc(toPx(c.mesh.position.x), toPx(c.mesh.position.z), 3.5, 0, Math.PI * 2);
      g.fillStyle = '#3a6cff';
      g.fill();
    }
    // Player arrow (rotates with heading).
    const px = toPx(game.playerPos.x);
    const pz = toPx(game.playerPos.z);
    g.save();
    g.translate(px, pz);
    g.rotate(game.heading);
    g.beginPath();
    g.moveTo(0, -8);
    g.lineTo(5.5, 6);
    g.lineTo(0, 3);
    g.lineTo(-5.5, 6);
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = '#222222';
    g.stroke();
    g.restore();
  }

  // --- full city map ---------------------------------------------------------------

  function setMap(open) {
    mapOpen = open;
    el('map-overlay').classList.toggle('show', open);
    if (open && SB.game) drawCityMap(SB.game.state);
  }

  function isMapOpen() { return mapOpen; }

  function drawCityMap(game) {
    if (!mapCanvas) return;
    const g = mapCanvas.getContext('2d');
    const W = 1000, H = 700;
    const scale = W / 760;
    const toX = (v) => (v + 380) * scale;
    const toY = (v) => (v + 380) * (H / 760);
    g.clearRect(0, 0, W, H);
    // Base: deep navy.
    g.fillStyle = '#101c2c';
    g.fillRect(0, 0, W, H);
    // Sea + beach.
    g.fillStyle = '#2a6a8a';
    g.fillRect(toX(cfg.seaX), 0, W - toX(cfg.seaX), H);
    g.fillStyle = '#e0c896';
    g.fillRect(toX(cfg.beachX), 0, toX(cfg.seaX) - toX(cfg.beachX), H);
    // District zones with names.
    g.textAlign = 'center';
    for (const d of cfg.districts) {
      g.fillStyle = d.color + '2e';
      g.fillRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * (H / 760));
      g.strokeStyle = d.color + '66';
      g.lineWidth = 1;
      g.strokeRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * (H / 760));
      g.fillStyle = '#ffffff';
      g.font = 'bold 17px sans-serif';
      g.fillText(d.name, (toX(d.x0) + toX(d.x1)) / 2, (toY(d.z0) + toY(d.z1)) / 2);
    }
    // Streets (white grid lines) + names (left-aligned so no label is clipped).
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.5;
    for (const s of cfg.streets) {
      g.beginPath(); g.moveTo(toX(s), 0); g.lineTo(toX(s), H); g.stroke();
      g.beginPath(); g.moveTo(0, toY(s)); g.lineTo(W, toY(s)); g.stroke();
    }
    g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.font = '11px sans-serif';
    for (const s of cfg.streets) {
      const name = cfg.streetNames[String(s)];
      if (!name) continue;
      g.save();
      g.translate(toX(s) + 4, 14);
      g.fillText(name, 0, 0);
      g.restore();
      g.save();
      g.translate(30, toY(s) - 4);
      g.fillText(name, 0, 0);
      g.restore();
    }
    g.textAlign = 'center';
    // Grid + coordinates.
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 1;
    for (let v = -320; v <= 320; v += 80) {
      g.beginPath(); g.moveTo(toX(v), 0); g.lineTo(toX(v), H); g.stroke();
      g.beginPath(); g.moveTo(0, toY(v)); g.lineTo(W, toY(v)); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = '10px sans-serif';
    for (let v = -320; v <= 320; v += 80) {
      g.fillText(String(v), toX(v) + 2, H - 6);
      g.fillText(String(v), 4, toY(v) - 2);
    }
    // GPS route to the next checkpoint.
    const path = SB.missions.gpsPath(game.playerPos);
    g.strokeStyle = '#ff5fa2';
    g.lineWidth = 4;
    g.setLineDash([12, 8]);
    g.beginPath();
    g.moveTo(toX(path[0].x), toY(path[0].z));
    for (let i = 1; i < path.length; i++) g.lineTo(toX(path[i].x), toY(path[i].z));
    g.stroke();
    g.setLineDash([]);
    // Checkpoints, numbered.
    for (let i = 0; i < cfg.mission.checkpoints.length; i++) {
      const cp = cfg.mission.checkpoints[i];
      const done = SB.missions.state() && i < SB.missions.state().index;
      g.beginPath();
      g.arc(toX(cp.x), toY(cp.z), 11, 0, Math.PI * 2);
      g.fillStyle = done ? '#5aa864' : '#ff8c2a';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.fillStyle = '#ffffff';
      g.font = 'bold 12px sans-serif';
      g.fillText(String(i + 1), toX(cp.x), toY(cp.z) + 4);
    }
    // Police.
    for (const c of SB.police.cars()) {
      g.beginPath();
      g.arc(toX(c.mesh.position.x), toY(c.mesh.position.z), 6, 0, Math.PI * 2);
      g.fillStyle = '#3a6cff';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = '#ffffff';
      g.stroke();
    }
    // Player arrow.
    const px = toX(game.playerPos.x);
    const py = toY(game.playerPos.z);
    g.save();
    g.translate(px, py);
    g.rotate(game.heading);
    g.beginPath();
    g.moveTo(0, -14);
    g.lineTo(10, 10);
    g.lineTo(0, 5);
    g.lineTo(-10, 10);
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#222222';
    g.stroke();
    g.restore();
    // Compass (below the top street-name row so it never covers a label).
    g.save();
    g.translate(W - 56, 130);
    g.beginPath();
    g.arc(0, 0, 34, 0, Math.PI * 2);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = '#ff5a4a';
    g.beginPath();
    g.moveTo(0, -24);
    g.lineTo(8, 6);
    g.lineTo(-8, 6);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = 'bold 14px sans-serif';
    g.fillText('N', 0, -38);
    g.restore();
    // Legend.
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(14, H - 118, 168, 104);
    g.textAlign = 'left';
    g.font = 'bold 13px sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText('LEGEND', 26, H - 96);
    g.font = '12px sans-serif';
    const items = [
      ['#ffffff', 'You'], ['#ff8c2a', 'Checkpoint'], ['#ff5fa2', 'GPS route'],
      ['#3a6cff', 'Police'], ['#5aa864', 'Cleared'],
    ];
    items.forEach(function (it, i) {
      g.fillStyle = it[0];
      g.fillRect(26, H - 84 + i * 16, 12, 8);
      g.fillStyle = '#ffffff';
      g.fillText(it[1], 44, H - 76 + i * 16);
    });
    // Scale bar (100 m).
    g.fillStyle = '#ffffff';
    g.fillRect(W - 150, H - 24, 100 * scale, 4);
    g.font = '12px sans-serif';
    g.fillText('100 m', W - 150, H - 30);
  }

  return {
    init: init,
    updateHUD: updateHUD,
    showBanner: showBanner,
    setMap: setMap,
    isMapOpen: isMapOpen,
    drawCityMap: drawCityMap,
    districtName: districtName,
  };
})();
