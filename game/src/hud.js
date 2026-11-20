// HUD: dense four-corner panels, circular minimap, full city map overlay,
// dialogue bar, floating score text, title + pause screens. All DOM + 2D canvas.
import { DISTRICTS, LANDMARKS, STREET_X, STREET_Z, STREET_NAMES_X, STREET_NAMES_Z, CHECKPOINTS, RADIO } from './config.js';
import { clamp } from './random.js';

const $ = (id) => document.getElementById(id);

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'SOLMAR BAY';
}

function money(n) { return '$' + n.toLocaleString('en-US'); }

export function createHUD(game) {
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  const bigmap = $('bigmap');
  const bctx = bigmap.getContext('2d');
  let dialogueTimer = 0;
  let floatTimer = 0;
  let radioIndex = 0;

  function drawMinimap() {
    const W = 150; const H = 150;
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = '#0e2438';
    mctx.fillRect(0, 0, W, H);
    const sx = (x) => ((x + 380) / 840) * W;
    const sz = (z) => ((z + 290) / 580) * H;
    // streets
    mctx.strokeStyle = 'rgba(200,220,240,0.35)';
    mctx.lineWidth = 1;
    for (const x of STREET_X) { mctx.beginPath(); mctx.moveTo(sx(x), 0); mctx.lineTo(sx(x), H); mctx.stroke(); }
    for (const z of STREET_Z) { mctx.beginPath(); mctx.moveTo(0, sz(z)); mctx.lineTo(W, sz(z)); mctx.stroke(); }
    // sea
    mctx.fillStyle = '#1a5a7a';
    mctx.fillRect(sx(380), 0, W - sx(380), H);
    // GPS route: Manhattan path player -> next checkpoint
    const cp = game.nextCheckpoint();
    if (cp) {
      mctx.strokeStyle = '#ff5a8a';
      mctx.lineWidth = 2;
      mctx.setLineDash([5, 4]);
      mctx.beginPath();
      const px = sx(game.player.x); const pz = sz(game.player.z);
      mctx.moveTo(px, pz);
      mctx.lineTo(sx(cp.x), pz);
      mctx.lineTo(sx(cp.x), sz(cp.z));
      mctx.stroke();
      mctx.setLineDash([]);
      mctx.fillStyle = '#ffa020';
      mctx.beginPath(); mctx.arc(sx(cp.x), sz(cp.z), 4, 0, Math.PI * 2); mctx.fill();
      mctx.strokeStyle = '#fff'; mctx.lineWidth = 1; mctx.stroke();
    }
    // police
    mctx.fillStyle = '#5a8aff';
    for (const p of game.policePositions()) {
      mctx.beginPath(); mctx.arc(sx(p.x), sz(p.z), 2.5, 0, Math.PI * 2); mctx.fill();
    }
    // player arrow (heading: forward = (-cos θ, sin θ))
    const px = sx(game.player.x); const pz = sz(game.player.z);
    const th = game.player.angle;
    const fx = -Math.cos(th); const fz = Math.sin(th);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(px + fx * 7, pz + fz * 7);
    mctx.lineTo(px - fz * 4 - fx * 4, pz + fx * 4 - fz * 4);
    mctx.lineTo(px + fz * 4 - fx * 4, pz - fx * 4 - fz * 4);
    mctx.closePath(); mctx.fill();
    mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.stroke();
  }

  function drawBigMap() {
    const W = 1100; const H = 640;
    bctx.clearRect(0, 0, W, H);
    bctx.fillStyle = '#0a1626';
    bctx.fillRect(0, 0, W, H);
    const sx = (x) => 70 + ((x + 380) / 840) * 940;
    const sz = (z) => 40 + ((z + 290) / 580) * 540;
    // grid labels
    bctx.fillStyle = '#8aa0b8';
    bctx.font = '12px Arial';
    bctx.textAlign = 'center';
    'ABCDEFGH'.split('').forEach((ch, i) => bctx.fillText(ch, 70 + (i + 0.5) * (940 / 8), 28));
    bctx.textAlign = 'right';
    for (let i = 1; i <= 6; i++) bctx.fillText(String(i), 58, 40 + (i - 0.5) * 90 + 4);
    // districts
    for (const d of DISTRICTS) {
      bctx.strokeStyle = d.color;
      bctx.setLineDash([6, 5]);
      bctx.lineWidth = 1.5;
      bctx.strokeRect(sx(d.x0), sz(d.z0), sx(d.x1) - sx(d.x0), sz(d.z1) - sz(d.z0));
      bctx.setLineDash([]);
      bctx.fillStyle = d.color;
      bctx.font = 'bold 14px Arial';
      bctx.textAlign = 'left';
      bctx.fillText(d.name, sx(d.x0) + 8, sz(d.z0) + 20);
    }
    // water
    bctx.fillStyle = '#144a66';
    bctx.fillRect(sx(380), 40, 940 - (sx(380) - 70), 540);
    bctx.fillStyle = '#7ab8d8';
    bctx.font = '12px Arial';
    bctx.save();
    bctx.translate(sx(410), 300);
    bctx.rotate(Math.PI / 2);
    bctx.textAlign = 'center';
    bctx.fillText('S O L M A R   B A Y', 0, 0);
    bctx.restore();
    // streets
    bctx.strokeStyle = 'rgba(200,220,240,0.55)';
    bctx.lineWidth = 1.5;
    for (const x of STREET_X) { bctx.beginPath(); bctx.moveTo(sx(x), 40); bctx.lineTo(sx(x), 580); bctx.stroke(); }
    for (const z of STREET_Z) { bctx.beginPath(); bctx.moveTo(70, sz(z)); bctx.lineTo(1010, sz(z)); bctx.stroke(); }
    // street names
    bctx.fillStyle = 'rgba(180,200,220,0.75)';
    bctx.font = '10px Arial';
    bctx.textAlign = 'left';
    STREET_X.forEach((x, i) => bctx.fillText(STREET_NAMES_X[i], sx(x) + 4, 56));
    bctx.textAlign = 'right';
    STREET_Z.forEach((z, i) => bctx.fillText(STREET_NAMES_Z[i], 1006, sz(z) - 4));
    // landmarks
    bctx.font = 'bold 11px Arial';
    for (const lm of LANDMARKS) {
      bctx.fillStyle = '#ffd25a';
      bctx.beginPath();
      bctx.moveTo(sx(lm.x), sz(lm.z) - 6);
      bctx.lineTo(sx(lm.x) + 5, sz(lm.z) + 4);
      bctx.lineTo(sx(lm.x) - 5, sz(lm.z) + 4);
      bctx.closePath(); bctx.fill();
      bctx.fillStyle = '#e8eef4';
      bctx.textAlign = 'left';
      bctx.fillText(lm.name, sx(lm.x) + 8, sz(lm.z) + 4);
    }
    // GPS route through all remaining checkpoints
    const cps = game.remainingCheckpoints();
    if (cps.length) {
      bctx.strokeStyle = '#2ad8c8';
      bctx.lineWidth = 2.5;
      bctx.setLineDash([8, 6]);
      bctx.beginPath();
      bctx.moveTo(sx(game.player.x), sz(game.player.z));
      for (const cp of cps) bctx.lineTo(sx(cp.x), sz(cp.z));
      bctx.stroke();
      bctx.setLineDash([]);
      cps.forEach((cp, i) => {
        bctx.fillStyle = '#ffa020';
        bctx.beginPath(); bctx.arc(sx(cp.x), sz(cp.z), 7, 0, Math.PI * 2); bctx.fill();
        bctx.fillStyle = '#fff';
        bctx.font = 'bold 10px Arial';
        bctx.textAlign = 'center';
        bctx.fillText(String(i + 1), sx(cp.x), sz(cp.z) + 3.5);
      });
      const cp = cps[0];
      const km = Math.hypot(cp.x - game.player.x, cp.z - game.player.z) / 1000;
      bctx.fillStyle = '#2ad8c8';
      bctx.font = 'bold 13px Arial';
      bctx.textAlign = 'center';
      bctx.fillText(`GPS ${km.toFixed(2)} KM · ETA ${Math.max(1, Math.round(km * 2.2))} MIN`, 540, 610);
    }
    // police
    bctx.fillStyle = '#5a8aff';
    for (const p of game.policePositions()) {
      bctx.beginPath(); bctx.arc(sx(p.x), sz(p.z), 4, 0, Math.PI * 2); bctx.fill();
    }
    // player
    const px = sx(game.player.x); const pz = sz(game.player.z);
    bctx.fillStyle = '#fff';
    bctx.beginPath(); bctx.arc(px, pz, 6, 0, Math.PI * 2); bctx.fill();
    bctx.strokeStyle = '#ff2020'; bctx.lineWidth = 2; bctx.stroke();
    // compass
    bctx.fillStyle = '#0e2438';
    bctx.beginPath(); bctx.arc(1010, 70, 22, 0, Math.PI * 2); bctx.fill();
    bctx.strokeStyle = '#e8eef4'; bctx.lineWidth = 1.5; bctx.stroke();
    bctx.fillStyle = '#ff5a5a';
    bctx.beginPath(); bctx.moveTo(1010, 52); bctx.lineTo(1016, 70); bctx.lineTo(1004, 70); bctx.closePath(); bctx.fill();
    bctx.fillStyle = '#e8eef4';
    bctx.font = 'bold 11px Arial'; bctx.textAlign = 'center';
    bctx.fillText('N', 1010, 48);
    // legend
    bctx.fillStyle = 'rgba(10,22,38,0.9)';
    bctx.fillRect(830, 440, 180, 110);
    bctx.strokeStyle = '#5a7a9a'; bctx.strokeRect(830, 440, 180, 110);
    bctx.fillStyle = '#ffd25a';
    bctx.font = 'bold 12px Arial'; bctx.textAlign = 'left';
    bctx.fillText('LEGEND', 844, 460);
    bctx.font = '11px Arial';
    const rows = [['#2ad8c8', 'GPS route'], ['#ff2020', 'Mission target'], ['#ffffff', 'Rico'], ['#5a8aff', 'Police'], ['#144a66', 'Water / bay']];
    rows.forEach((r, i) => {
      bctx.fillStyle = r[0];
      bctx.fillRect(844, 470 + i * 15, 12, 8);
      bctx.fillStyle = '#e8eef4';
      bctx.fillText(r[1], 862, 478 + i * 15);
    });
    // scale
    bctx.fillStyle = '#e8eef4';
    bctx.fillRect(70, 596, 94, 3);
    bctx.font = '11px Arial';
    bctx.fillText('100 m', 70, 590);
  }

  function showDialogue(who, text) {
    $('dlg-name').textContent = who;
    $('dlg-text').textContent = text;
    $('dlg-face').textContent = who.charAt(0);
    $('dialogue').style.opacity = '1';
    dialogueTimer = 6;
  }
  function showFloat(text) {
    const el = $('float-text');
    el.textContent = text;
    el.style.opacity = '1';
    floatTimer = 2.2;
  }
  // Pin a text on screen indefinitely (used by screenshot shots, where the
  // capture happens seconds after the setup runs).
  function pinFloat(text) { showFloat(text); floatTimer = 9999; }
  function pinDialogue(who, text) { showDialogue(who, text); dialogueTimer = 9999; }
  function update(dt, t) {
    const m = game.missions.state;
    // mission panel
    $('ms-chapter').textContent = `CH ${m.chapter}`;
    $('ms-title').textContent = m.chapterTitle;
    $('ms-objective').textContent = m.objective;
    $('ms-next').textContent = 'NEXT ... ' + m.next;
    $('ms-progress').style.width = `${(m.checkpointIndex / m.checkpointTotal) * 100}%`;
    // wanted
    const stars = '★'.repeat(m.wanted) + '☆'.repeat(5 - m.wanted);
    $('wanted-stars').textContent = stars;
    $('wanted').style.opacity = m.wanted > 0 ? '1' : '0.55';
    // cash panel
    $('cash-time').textContent = `DAY 1 · ${game.clock()}`;
    $('cash-amount').textContent = money(m.cash);
    $('cash-stars').textContent = stars;
    $('cash-state').textContent = m.wanted > 0 ? 'PURSUIT ACTIVE' : 'CLEAN';
    $('cash-state').style.color = m.wanted > 0 ? '#ff5a5a' : '#5aff8a';
    // minimap
    drawMinimap();
    $('mm-district').textContent = districtAt(game.player.x, game.player.z).toUpperCase();
    $('mm-respect').style.width = `${clamp(game.respect(), 0, 100)}%`;
    // radio + speed
    $('radio-station').textContent = RADIO[radioIndex].station;
    $('radio-song').textContent = RADIO[radioIndex].song;
    $('speed-num').textContent = String(Math.round(Math.abs(game.speedKmh())));
    $('speed-gear').textContent = 'GEAR ' + game.gear();
    $('speed-car').textContent = game.onFoot ? 'ON FOOT' : 'VULPINE S';
    // timers
    if (dialogueTimer > 0) { dialogueTimer -= dt; if (dialogueTimer <= 0) $('dialogue').style.opacity = '0'; }
    if (floatTimer > 0) { floatTimer -= dt; if (floatTimer <= 0) $('float-text').style.opacity = '0'; }
    // sprint timer
    const s = Math.max(0, Math.ceil(m.sprintTime));
    $('ms-timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  return {
    update, drawBigMap, showDialogue, showFloat, pinFloat, pinDialogue,
    setRadio(i) { radioIndex = i % RADIO.length; },
    showTitle() { $('title-screen').style.display = 'flex'; $('hud').style.display = 'none'; },
    hideTitle() { $('title-screen').style.display = 'none'; $('hud').style.display = 'block'; },
    showMap() { $('map-overlay').style.display = 'flex'; drawBigMap(); },
    hideMap() { $('map-overlay').style.display = 'none'; },
    showPause(v) { $('pause-overlay').style.display = v ? 'flex' : 'none'; },
  };
}
