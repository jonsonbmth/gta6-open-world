// hud.js — the HUD for AURELIA BAY: portraits (from faces.js), the
// minimap and the big city map (both drawn on canvas), and the runtime
// HUD updates (speed, wanted stars, popup, clock). The HUD's DOM lives
// in index.html; this module fills the dynamic parts and draws the maps.

(function () {
  'use strict';

  var DISTRICTS = [
    { name: 'SUNSET MILE', color: '#e8c832' },
    { name: 'PALMA ROW', color: '#7ac74f' },
    { name: 'EMBER HEIGHTS', color: '#d07a3a' },
    { name: 'CORAL MARKET', color: '#d04a7a' },
    { name: 'EMBER STRAND', color: '#e8e0c8' },
    { name: 'MARINA ROW', color: '#4aa8d8' },
    { name: 'GILDED QUAY', color: '#e8b04a' },
    { name: 'VIDRIO DUNES', color: '#c8b078' },
    { name: 'ABX AIRFIELD', color: '#9a9ab0' },
  ];

  // The minimap: a small canvas in the HUD's bottom-left corner. Water on
  // the left, the street grid, the player arrow and the cruiser blips.
  function drawMinimap(canvas, state) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // City background.
    ctx.fillStyle = '#232830';
    ctx.fillRect(0, 0, W, H);
    // Water strip (west).
    ctx.fillStyle = '#1d6fa8';
    ctx.fillRect(0, 0, W * 0.24, H);
    // Beach strip.
    ctx.fillStyle = '#e6d3a8';
    ctx.fillRect(W * 0.24, 0, W * 0.08, H);
    // Street grid.
    ctx.strokeStyle = '#4a5058';
    ctx.lineWidth = 3;
    for (var i = 0; i < 5; i++) {
      var y = (H / 5) * i + H / 10;
      ctx.beginPath();
      ctx.moveTo(W * 0.32, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (var j = 0; j < 4; j++) {
      var x = W * 0.32 + ((W * 0.68) / 4) * j + (W * 0.68) / 8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Sunset Mile (the main street, vertical).
    ctx.strokeStyle = '#8a9098';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(W * 0.62, 0);
    ctx.lineTo(W * 0.62, H);
    ctx.stroke();
    // Route to the garage (dashed yellow).
    ctx.strokeStyle = '#e8c832';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(W * 0.62, H * 0.78);
    ctx.lineTo(W * 0.62, H * 0.18);
    ctx.stroke();
    ctx.setLineDash([]);
    // Garage marker.
    ctx.fillStyle = '#e8c832';
    ctx.beginPath();
    ctx.arc(W * 0.62, H * 0.16, 5, 0, Math.PI * 2);
    ctx.fill();
    // Cruiser blips (red).
    var blips = [[0.55, 0.62], [0.68, 0.52], [0.58, 0.42], [0.7, 0.3]];
    ctx.fillStyle = '#ff3a3a';
    blips.forEach(function (b) {
      ctx.beginPath();
      ctx.arc(W * b[0], H * b[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    // Player arrow (white triangle, pointing up the street).
    var px = W * 0.62;
    var py = H * 0.78;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px, py - 9);
    ctx.lineTo(px - 6, py + 7);
    ctx.lineTo(px + 6, py + 7);
    ctx.closePath();
    ctx.fill();
    // North marker.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', W / 2, 12);
  }

  // The big city map: water, beach, the district blocks, the route and
  // the legend markers. Drawn on the #big-map canvas inside the map
  // overlay; the DISTRICTS and LEGEND lists beside it are DOM.
  function drawBigMap(canvas) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // Water (west, left third).
    ctx.fillStyle = '#1d6fa8';
    ctx.fillRect(0, 0, W * 0.34, H);
    // Beach strip.
    ctx.fillStyle = '#e6d3a8';
    ctx.fillRect(W * 0.34, 0, W * 0.1, H);
    // City ground.
    ctx.fillStyle = '#2a2f38';
    ctx.fillRect(W * 0.44, 0, W * 0.56, H);
    // District blocks (right side): colored fills + street gaps.
    var blocks = [
      { x: 0.46, y: 0.04, w: 0.24, h: 0.2, c: '#5a6a2a' }, // Palma Row
      { x: 0.72, y: 0.04, w: 0.24, h: 0.2, c: '#6a4a2a' }, // Ember Heights
      { x: 0.46, y: 0.27, w: 0.24, h: 0.2, c: '#7a2a4a' }, // Coral Market
      { x: 0.72, y: 0.27, w: 0.24, h: 0.2, c: '#8a8a7a' }, // Ember Strand
      { x: 0.46, y: 0.5, w: 0.24, h: 0.2, c: '#2a6a8a' }, // Marina Row
      { x: 0.72, y: 0.5, w: 0.24, h: 0.2, c: '#a08a3a' }, // Gilded Quay
      { x: 0.46, y: 0.73, w: 0.5, h: 0.22, c: '#6a6a8a' }, // ABX Airfield
    ];
    blocks.forEach(function (b) {
      ctx.fillStyle = b.c;
      ctx.fillRect(W * b.x, H * b.y, W * b.w, H * b.h);
    });
    // Streets between blocks.
    ctx.strokeStyle = '#4a5058';
    ctx.lineWidth = 4;
    [0.26, 0.49, 0.72].forEach(function (fy) {
      ctx.beginPath();
      ctx.moveTo(W * 0.44, H * fy);
      ctx.lineTo(W, H * fy);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(W * 0.71, 0);
    ctx.lineTo(W * 0.71, H);
    ctx.stroke();
    // Sunset Mile (the main north-south street).
    ctx.strokeStyle = '#9aa0a8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(W * 0.58, 0);
    ctx.lineTo(W * 0.58, H);
    ctx.stroke();
    // The pier (into the water).
    ctx.fillStyle = '#8a6b48';
    ctx.fillRect(W * 0.18, H * 0.52, W * 0.16, 8);
    // District labels.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    var labels = [
      ['VIDRIO DUNES', 0.39, 0.3], ['GILDED QUAY', 0.39, 0.52], ['MARINA ROW', 0.39, 0.62],
      ['EMBER STRAND', 0.39, 0.82], ['SUNSET MILE', 0.58, 0.46], ['CORAL MARKET', 0.58, 0.24],
      ['PALMA ROW', 0.84, 0.14], ['EMBER HEIGHTS', 0.84, 0.55], ['ABX AIRFIELD', 0.71, 0.86],
    ];
    labels.forEach(function (lb) {
      ctx.fillText(lb[0], W * lb[1], H * lb[2]);
    });
    // Route to the garage: dashed yellow line up Sunset Mile.
    ctx.strokeStyle = '#e8c832';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(W * 0.58, H * 0.8);
    ctx.lineTo(W * 0.58, H * 0.1);
    ctx.stroke();
    ctx.setLineDash([]);
    // Garage diamond.
    ctx.fillStyle = '#e8c832';
    ctx.save();
    ctx.translate(W * 0.58, H * 0.08);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('G', W * 0.58, H * 0.08 + 4);
    // Cruiser blips (red dots near the player).
    ctx.fillStyle = '#ff3a3a';
    [[0.54, 0.72], [0.63, 0.66], [0.55, 0.6], [0.65, 0.58]].forEach(function (b) {
      ctx.beginPath();
      ctx.arc(W * b[0], H * b[1], 5, 0, Math.PI * 2);
      ctx.fill();
    });
    // Player arrow (white triangle).
    var px = W * 0.58;
    var py = H * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px, py - 12);
    ctx.lineTo(px - 8, py + 9);
    ctx.lineTo(px + 8, py + 9);
    ctx.closePath();
    ctx.fill();
    // North arrow.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('N ↑', W - 10, 20);
  }

  // Fill the HUD's dynamic parts: portraits, minimap, big map, clock.
  function initHUD() {
    var faces = window.AB.faces;
    var dialogPortrait = document.getElementById('hud-dialog-portrait');
    if (dialogPortrait) dialogPortrait.src = faces.portrait('vera');
    var titlePortrait = document.getElementById('title-portrait');
    if (titlePortrait) titlePortrait.src = faces.portrait('dante');
    var crewPortraits = {
      'crew-portrait-lena': 'lena',
      'crew-portrait-hugo': 'hugo',
      'crew-portrait-nina': 'nina',
    };
    Object.keys(crewPortraits).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.src = faces.portrait(crewPortraits[id]);
    });
    var minimap = document.getElementById('minimap');
    if (minimap) drawMinimap(minimap, {});
    var bigMap = document.getElementById('big-map');
    if (bigMap) drawBigMap(bigMap);
  }

  function setSpeed(kmh) {
    var el = document.getElementById('hud-speed');
    if (el) el.textContent = Math.round(kmh) + ' KM/H';
  }

  function setPopup(html) {
    var el = document.getElementById('hud-popup');
    if (el) el.innerHTML = html;
  }

  function setClock(text) {
    var el = document.getElementById('hud-clock');
    if (el) el.textContent = text;
  }

  function showHUD() {
    var hud = document.getElementById('hud');
    if (hud) hud.style.display = 'block';
  }

  function hideHUD() {
    var hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  function showTitle() {
    var t = document.getElementById('title-screen');
    if (t) t.style.display = 'flex';
  }

  function hideTitle() {
    var t = document.getElementById('title-screen');
    if (t) t.style.display = 'none';
  }

  function openMap() {
    var m = document.getElementById('map-overlay');
    if (m) m.style.display = 'flex';
  }

  function closeMap() {
    var m = document.getElementById('map-overlay');
    if (m) m.style.display = 'none';
  }

  function isMapOpen() {
    var m = document.getElementById('map-overlay');
    return m && m.style.display === 'flex';
  }

  window.AB.hud = {
    initHUD: initHUD,
    drawMinimap: drawMinimap,
    drawBigMap: drawBigMap,
    setSpeed: setSpeed,
    setPopup: setPopup,
    setClock: setClock,
    showHUD: showHUD,
    hideHUD: hideHUD,
    showTitle: showTitle,
    hideTitle: hideTitle,
    openMap: openMap,
    closeMap: closeMap,
    isMapOpen: isMapOpen,
    DISTRICTS: DISTRICTS,
  };
})();
