// In-page playtest for SOLMAR BAY: 20 checks run against the live game when
// the page loads with ?playtest=1. Results land on window.__playtest for the
// headless runner, and in #playtest-results as a fallback. Every check is
// independent (a throw fails just that check) and the game state is restored
// afterwards so the playtest URL still shows a clean title screen.
import { stageShot, SHOT_NAMES } from './shots.js';

function check(name, fn) {
  try {
    const detail = fn();
    return { name, pass: true, detail: detail || '' };
  } catch (e) {
    return { name, pass: false, detail: String(e && e.message ? e.message : e) };
  }
}

export function runPlaytest(game) {
  const results = [];
  const S = game.scene;

  results.push(check('renderer + canvas in DOM', () => {
    if (!game.renderer || !game.renderer.domElement.parentNode) throw new Error('no canvas');
    return game.renderer.domElement.width + 'x' + game.renderer.domElement.height;
  }));
  results.push(check('city built (>100 scene objects)', () => {
    let n = 0;
    S.traverse(() => n++);
    if (n < 100) throw new Error('only ' + n + ' objects');
    return n + ' objects';
  }));
  results.push(check('hero car in scene', () => {
    if (!game.heroCar || !game.heroCar.parent) throw new Error('hero missing');
    return game.heroCar.userData.name;
  }));
  results.push(check('hero taillight bar present', () => {
    if (!game.heroCar.userData.tailBar) throw new Error('no tail bar ref');
    return 'emissive bar + glow';
  }));
  results.push(check('police: wanted 3 spawns 2 units + heli', () => {
    game.police.setWanted(3);
    if (game.police.units.length < 2) throw new Error('units: ' + game.police.units.length);
    if (!game.police.heli) throw new Error('no heli');
    game.police.setWanted(0);
    return '2 units + AIR-1';
  }));
  results.push(check('traffic cars exist (>=4)', () => {
    if (game.traffic.length < 4) throw new Error('traffic: ' + game.traffic.length);
    return game.traffic.length + ' cars';
  }));
  results.push(check('pedestrians exist (>=6)', () => {
    if (game.pedestrians.length < 6) throw new Error('peds: ' + game.pedestrians.length);
    return game.pedestrians.length + ' people';
  }));
  results.push(check('Rico exists', () => {
    if (!game.rico || !game.rico.parent) throw new Error('rico missing');
    return 'yellow raincoat';
  }));
  results.push(check('HUD four corners present', () => {
    for (const id of ['hud-top-left', 'hud-top-right', 'hud-bottom-left', 'hud-bottom-right']) {
      if (!document.getElementById(id)) throw new Error('missing #' + id);
    }
    return '4 panels';
  }));
  results.push(check('minimap draws', () => {
    game.hud.drawMinimap(game.hudState());
    const cv = document.getElementById('minimap');
    const g = cv.getContext('2d');
    const px = g.getImageData(0, 0, cv.width, cv.height).data;
    let nz = 0;
    for (let i = 3; i < px.length; i += 97) if (px[i] > 0) nz++;
    if (nz === 0) throw new Error('minimap blank');
    return 'minimap painted';
  }));
  results.push(check('7 jobs defined, job 1 has 4 stages', () => {
    const { JOBS } = game.jobsModule;
    if (JOBS.length !== 7) throw new Error('jobs: ' + JOBS.length);
    if (JOBS[0].stages.length !== 4) throw new Error('job1 stages: ' + JOBS[0].stages.length);
    return '7 jobs';
  }));
  results.push(check('save/load round-trip', () => {
    const { saveGame, loadGame } = game.saveModule;
    saveGame({ money: 12345, respect: 320, jobIndex: 1, stageIndex: 2, wanted: 0, station: 1, pos: { x: 5, z: 6 }, onFoot: true });
    const back = loadGame();
    if (!back || back.money !== 12345 || back.jobIndex !== 1 || back.stageIndex !== 2) {
      throw new Error('round-trip mismatch');
    }
    return 'money 12345 restored';
  }));
  results.push(check('audio init does not throw', () => {
    game.audio.ensure();
    game.audio.setEngine(0.5, true);
    game.audio.setEngine(0, false);
    return 'audio ok';
  }));
  results.push(check('bloom composer renders', () => {
    if (!game.composer || typeof game.composer.render !== 'function') throw new Error('no composer');
    game.composer.render();
    return 'threshold ' + game.composer.threshold;
  }));
  results.push(check('rain points exist', () => {
    let found = false;
    S.traverse((o) => { if (o.isPoints) found = true; });
    if (!found) throw new Error('no rain points');
    return 'rain + stars';
  }));
  results.push(check('frame counter advances', () => {
    if (game.frame < 2) throw new Error('frame ' + game.frame);
    return 'frame ' + game.frame;
  }));
  results.push(check('camera snaps in frozen mode (k=1)', () => {
    game.frozen = true;
    game.cameraRig = { back: 6.8, side: 1.4, height: 2.6, lookAhead: 6 };
    game.setPlayerPos(0, 20, 0, true);
    game.snapCamera();
    const p = game.camera.position;
    const expect = { x: 1.4, y: 2.6, z: 13.2 };
    const d = Math.hypot(p.x - expect.x, p.y - expect.y, p.z - expect.z);
    game.frozen = false;
    if (d > 0.5) throw new Error('snap off by ' + d.toFixed(2));
    return 'snap exact';
  }));
  results.push(check('map canvas draws', () => {
    game.hud.showMap();
    game.hud.drawMapCanvas(game.hudState());
    game.hud.hideMap();
    return 'map painted';
  }));
  results.push(check('radio has 3 stations', () => {
    if (game.audio.stations.length !== 3) throw new Error('stations: ' + game.audio.stations.length);
    return game.audio.stations.map((s) => s.name).join(' / ');
  }));
  results.push(check('all 4 shots stage without error', () => {
    for (const name of SHOT_NAMES) {
      const r = stageShot(game, name);
      if (!r.ok) throw new Error(name + ': ' + r.detail);
    }
    return SHOT_NAMES.join(', ');
  }));

  const passed = results.filter((r) => r.pass).length;
  const out = { passed, total: results.length, results };

  // Restore a clean title screen after the playtest.
  try {
    game.frozen = false;
    game.displaySpeedKmh = null;
    game.police.setWanted(0);
    game.hud.clearDialogue();
    game.hud.clearActionText();
    game.hud.hideMap();
    game.setMode('title');
    game.showTitleScreen();
  } catch { /* restore is best-effort */ }

  window.__playtest = out;
  const box = document.getElementById('playtest-results');
  if (box) {
    box.textContent = `PLAYTEST ${passed}/${results.length} — ` +
      results.map((r) => (r.pass ? 'PASS ' : 'FAIL ') + r.name).join(' · ');
  }
  return out;
}
