// SOLMAR BAY — the AAA city map overlay (M key): colored district zones with
// dashed borders, curved ring highway, named streets, gradient bay with a
// wavy coastline, Pelican Isle + bridge, 8 landmark icons, a glowing green
// GPS route with distance, compass, legend, grid A–H / 1–6, wanted stars.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;

  var Map = {
    open: false,
    canvas: null,
    ctx: null,
  };

  Map.init = function () {
    Map.canvas = document.getElementById('citymap-canvas');
    if (Map.canvas) Map.ctx = Map.canvas.getContext('2d');
  };

  function wx(x) { return ((x + 170) / 340) * 1000; }
  function wz(z) { return ((z + 200) / 400) * 720; }

  Map.draw = function (state) {
    var ctx = Map.ctx;
    if (!ctx) return;
    var W = 1000, Hh = 720;
    ctx.clearRect(0, 0, W, Hh);
    // Ocean background gradient.
    var ocean = ctx.createLinearGradient(0, 0, W, 0);
    ocean.addColorStop(0, '#0a2438');
    ocean.addColorStop(0.7, '#0d3550');
    ocean.addColorStop(1, '#0a2a44');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, W, Hh);
    // Land mass.
    ctx.fillStyle = '#12172e';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(760, 0);
    // Wavy coastline down the east edge.
    for (var y = 0; y <= Hh; y += 30) {
      ctx.lineTo(760 + Math.sin(y * 0.02) * 18 + Math.sin(y * 0.055) * 8, y);
    }
    ctx.lineTo(0, Hh);
    ctx.closePath();
    ctx.fill();
    // Marina inlet (southwest water).
    ctx.fillStyle = '#0d3550';
    ctx.beginPath();
    ctx.ellipse(wx(-165), wz(165), 55, 45, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // District zones.
    C.districts.forEach(function (d) {
      ctx.fillStyle = d.color + '30';
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      var x0 = wx(d.x - d.w / 2), y0 = wz(d.z - d.h / 2);
      var w = (d.w / 340) * 1000, h = (d.h / 400) * 720;
      U.roundRect(ctx, x0, y0, w, h, 14);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = d.color;
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(d.name, x0 + 10, y0 + 22);
    });
    // Ring highway (curved).
    ctx.strokeStyle = '#e8c85a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(500, 360, 430, 320, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#12172e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.ellipse(500, 360, 430, 320, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Streets grid.
    ctx.strokeStyle = '#4a5a8a';
    ctx.lineWidth = 3;
    for (var z = -160; z <= 160; z += 40) {
      ctx.beginPath();
      ctx.moveTo(10, wz(z));
      ctx.lineTo(750, wz(z));
      ctx.stroke();
    }
    for (var x = -120; x <= 120; x += 40) {
      ctx.beginPath();
      ctx.moveTo(wx(x), 10);
      ctx.lineTo(wx(x), 710);
      ctx.stroke();
    }
    // Lumen Avenue, highlighted.
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(wx(0), 10);
    ctx.lineTo(wx(0), 710);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 13px Arial';
    ctx.save();
    ctx.translate(wx(0) + 12, 360);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('L U M E N   A V E N U E', 0, 0);
    ctx.restore();
    // Named streets.
    ctx.fillStyle = '#8a9ac8';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Harbour Rd', wx(-140), wz(-120) - 6);
    ctx.fillText('Coral Way', wx(60), wz(120) - 6);
    ctx.fillText('Vista Blvd', wx(60), wz(-160) - 6);
    ctx.fillText('Marina Promenade', wx(-140), wz(140) - 6);
    // Pelican Isle + bridge.
    ctx.fillStyle = '#1a2432';
    ctx.beginPath();
    ctx.ellipse(wx(195), wz(-40), 34, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8c85a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(wx(150), wz(-40));
    ctx.lineTo(wx(195), wz(-40));
    ctx.stroke();
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PELICAN ISLE', wx(195), wz(-40) - 34);
    // Landmarks: 8 distinct icons.
    var icons = {
      tower: '▲', pier: '⚓', isle: '◉', garage: '⬡',
      cinema: '★', house: '⌂', anchor: '⚓', boat: '⛵',
    };
    C.landmarks.forEach(function (lm) {
      var lx = wx(lm.x), ly = wz(lm.z);
      ctx.fillStyle = '#0a0618';
      ctx.beginPath();
      ctx.arc(lx, ly, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[lm.icon] || '●', lx, ly + 1);
      ctx.font = 'bold 10px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lm.name, lx, ly + 24);
    });
    // GPS route: glowing green line from the player to the target.
    if (state.target) {
      var px = wx(state.playerX), py = wz(state.playerZ);
      var tx = wx(state.target.x), ty = wz(state.target.z);
      ctx.strokeStyle = '#2eff8f';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#2eff8f';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(px, py);
      // Route via the avenue (Manhattan-ish path).
      ctx.lineTo(wx(0), py);
      ctx.lineTo(wx(0), ty);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.shadowBlur = 0;
      var distKm = (Math.abs(state.playerX - state.target.x) + Math.abs(state.playerZ - state.target.z)) / 100;
      ctx.fillStyle = '#2eff8f';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('GPS  ' + distKm.toFixed(2) + ' KM  ·  ETA ' + Math.max(1, Math.round(distKm * 2)) + ' MIN', 20, 700);
    }
    // Player marker.
    ctx.fillStyle = '#ff2a1a';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    var px2 = wx(state.playerX), py2 = wz(state.playerZ);
    ctx.save();
    ctx.translate(px2, py2);
    ctx.rotate(state.heading);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Compass.
    ctx.fillStyle = 'rgba(10,6,24,0.85)';
    ctx.beginPath();
    ctx.arc(940, 60, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', 940, 52);
    ctx.fillStyle = '#ff2a1a';
    ctx.beginPath();
    ctx.moveTo(940, 62);
    ctx.lineTo(946, 78);
    ctx.lineTo(934, 78);
    ctx.closePath();
    ctx.fill();
    // Legend — top-right, below the compass, clear of the district labels.
    ctx.fillStyle = 'rgba(10,6,24,0.85)';
    U.roundRect(ctx, 774, 108, 210, 118, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SOLMAR BAY — CITY MAP', 786, 130);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('●  Mission target', 786, 154);
    ctx.fillStyle = '#2eff8f';
    ctx.fillText('—  GPS route', 786, 176);
    ctx.fillStyle = '#ff4040';
    ctx.fillText('●  Police', 786, 198);
    ctx.fillStyle = '#8a9ac8';
    ctx.fillText('M — close map', 786, 218);
    // Grid A–H / 1–6.
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    'ABCDEFGH'.split('').forEach(function (ch, i) {
      ctx.fillText(ch, 60 + i * 118, 14);
    });
    for (var r = 0; r < 6; r++) {
      ctx.fillText(String(r + 1), 12, 70 + r * 118);
    }
    // Wanted stars on the map.
    if (state.wanted > 0) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'right';
      var stars = '';
      for (var s = 0; s < 5; s++) stars += s < state.wanted ? '★' : '☆';
      ctx.fillText(stars, 984, 700);
    }
  };

  Map.openMap = function (state) {
    Map.open = true;
    var el = document.getElementById('citymap-overlay');
    if (el) el.style.display = 'flex';
    Map.draw(state);
  };

  Map.closeMap = function () {
    Map.open = false;
    var el = document.getElementById('citymap-overlay');
    if (el) el.style.display = 'none';
  };

  SB.citymap = Map;
})();
