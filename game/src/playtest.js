// Playtest: 20 checks run after boot. Results go to window.__playtest and
// the #playtest-results div, which the headless runner reads.
import { CHAPTERS } from './config.js';
import { SHOT_NAMES } from './shots.js';
import { drawCityMap } from './map.js';
import { loadSave, writeSave, defaultSave } from './save.js';
import { updateHud, hudState } from './hud.js';
import * as audio from './audio.js';

export function runPlaytest(game) {
  const results = [];
  const check = (name, pass, detail = '') => {
    results.push({ name, pass: !!pass, detail: String(detail || '') });
  };

  // 1–2. Renderer + camera.
  check('renderer created', !!game.renderer && !!game.renderer.getContext(), game.renderer ? 'webgl' : 'none');
  check('camera active', !!game.camera && game.camera.isPerspectiveCamera, `fov ${game.camera ? game.camera.fov : '-'}`);

  // 3–6. Hero car: wheels, full-width taillight bar, dual exhausts, spoiler.
  const hero = game.heroCar.group;
  let wheels = 0;
  let barWidth = 0;
  let exhausts = 0;
  let spoiler = false;
  hero.traverse((o) => {
    if (o.name === 'taillight-bar') barWidth = o.geometry.parameters.width;
    if (o.name === 'exhaust') exhausts += 1;
    if (o.name === 'spoiler') spoiler = true;
  });
  wheels = game.heroCar.wheels.length;
  check('hero has 4 wheels', wheels === 4, `${wheels} wheels`);
  check('taillight bar is full-width', barWidth >= 1.5, `bar ${barWidth.toFixed(2)}m`);
  check('dual exhausts', exhausts === 2, `${exhausts} pipes`);
  check('spoiler fitted', spoiler, spoiler ? 'yes' : 'missing');

  // 7–11. World counts.
  const c = game.worldCounts;
  check('buildings >= 30', c.buildings >= 30, `${c.buildings} buildings`);
  check('neon signs >= 15', c.signs >= 15, `${c.signs} signs`);
  check('pedestrians >= 15', game.peds.length >= 15, `${game.peds.length} peds`);
  check('traffic >= 8', game.traffic.length >= 8, `${game.traffic.length} cars`);
  check('police 3 units + heli', game.police.units.length === 3 && !!game.police.heli, `${game.police.units.length} units`);

  // 12. Helicopter exists and is not at the origin.
  const hp = game.police.heli.position;
  check('heli parked away from origin', Math.hypot(hp.x, hp.z) > 5, `heli at ${hp.x.toFixed(0)},${hp.z.toFixed(0)}`);

  // 13. Chapters.
  check('7 story chapters', CHAPTERS.length === 7, `${CHAPTERS.length} chapters`);

  // 14. Save roundtrip (restores the previous save afterwards).
  let saveOk = false;
  try {
    const before = loadSave();
    const test = defaultSave();
    test.money = 12345;
    test.chapter = 4;
    writeSave(test);
    const back = loadSave();
    saveOk = back && back.money === 12345 && back.chapter === 4;
    if (before) writeSave(before);
    else window.localStorage.removeItem('solmar-bay-save-v12');
  } catch (e) {
    saveOk = false;
  }
  check('save roundtrip', saveOk, saveOk ? '12345 / ch4' : 'failed');

  // 15. HUD elements present.
  const hudIds = ['hud-objective', 'hud-stats', 'hud-minimap', 'hud-dialogue', 'hud-car', 'minimap'];
  const missing = hudIds.filter((id) => !document.getElementById(id));
  check('HUD panels present', missing.length === 0, missing.length ? `missing ${missing.join(',')}` : 'all present');

  // 16. Minimap draws streets: sample the avenue (2px line) at (75,120) —
  // south of the player, clear of the GPS route, police dots and arrow.
  let streetsDrawn = false;
  try {
    updateHud(hudState(game));
    updateHud(hudState(game));
    const mm = document.getElementById('minimap');
    const g = mm.getContext('2d');
    const px = g.getImageData(75, 120, 1, 1).data;
    streetsDrawn = px[0] > 120;
  } catch (e) {
    streetsDrawn = false;
  }
  check('minimap shows streets', streetsDrawn, streetsDrawn ? 'avenue pixel lit' : 'avenue pixel dark');

  // 17. City map draws without error.
  let mapOk = false;
  try {
    const off = document.createElement('canvas');
    off.width = 1000;
    off.height = 640;
    drawCityMap(off, game);
    mapOk = true;
  } catch (e) {
    mapOk = false;
  }
  check('city map draws', mapOk, mapOk ? '1000x640' : 'threw');

  // 18. Four shots staged.
  check('4 shots defined', SHOT_NAMES.length === 4, SHOT_NAMES.join(','));

  // 19. Audio module loads.
  check('audio module loads', typeof audio.startAudio === 'function' && typeof audio.setStation === 'function', 'radio + sfx');

  // 20. No boot errors.
  check('no boot errors', game.bootErrors.length === 0, game.bootErrors.length ? game.bootErrors[0] : 'clean');

  const passed = results.filter((r) => r.pass).length;
  const out = { passed, total: results.length, results };
  window.__playtest = out;
  const box = document.getElementById('playtest-results');
  if (box) box.textContent = `PLAYTEST ${passed}/${results.length}\n` + results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`).join('\n');
  return out;
}
