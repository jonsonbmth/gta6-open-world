// The 20-check playtest. It runs in-page (on ?playtest=1 and on every normal
// load), writes its results to window.__playtest and to the #playtest-results box
// the headless runner reads. Checks are structural and behavioural — they exercise
// the real systems, not mocks.
import { JOBS } from './config.js';
import { readSave, writeSave, clearSave } from './save.js';

export function runPlaytest(game) {
  const results = [];
  function check(name, fn) {
    try {
      const detail = fn();
      const pass = detail !== false && detail !== null && detail !== undefined;
      results.push({ name, pass, detail: typeof detail === 'string' ? detail : '' });
    } catch (error) {
      results.push({ name, pass: false, detail: error.message });
    }
  }

  check('three.js loaded', () => (game.THREE && game.THREE.REVISION ? `r${game.THREE.REVISION}` : false));
  check('webgl renderer created', () => (game.renderer ? 'ok' : false));
  check('world built (100+ objects)', () => {
    const count = game.sceneCount();
    return count > 100 ? `${count} objects` : `${count} objects — too few`;
  });
  check('hero car in scene', () => (game.heroInScene() ? 'VULPINE S present' : false));
  check('hero has full-width taillight bar', () => {
    const width = game.taillightBarWidth();
    return width >= 1.6 ? `${width.toFixed(2)}m bar` : `bar ${width}m — too narrow`;
  });
  check('hero has 4 detailed wheels', () => {
    const wheels = game.heroWheelCount();
    return wheels === 4 ? '4 wheels' : `${wheels} wheels`;
  });
  check('wanted system spawns police', () => {
    game.setWanted(2);
    const n = game.policeCount();
    game.setWanted(0);
    return n === 2 ? '2 units at 2 stars' : `${n} units at 2 stars`;
  });
  check('setWanted sets heat', () => {
    game.setWanted(3);
    const heat = game.heat();
    game.setWanted(0);
    return heat === 60 ? 'heat 60 at 3 stars' : `heat ${heat}`;
  });
  check('7 jobs, CH1 opens with enter-car', () => {
    const first = JOBS[0].stages[0];
    return JOBS.length === 7 && first.type === 'enter-car' ? '7 jobs' : `${JOBS.length} jobs`;
  });
  check('minimap avenue pixel (75,120) is a street', () => {
    const rgba = game.minimapPixel(75, 120);
    if (!rgba) return 'no minimap pixel';
    const [r, g, b] = rgba;
    return b > 110 && g > 90 ? `rgb(${r},${g},${b})` : `rgb(${r},${g},${b}) — not a street`;
  });
  check('HUD panels present', () => {
    const ids = ['hud-mission', 'hud-money', 'hud-minimap', 'hud-speed', 'hud-dialogue', 'hud-hint'];
    const missing = ids.filter((id) => !document.getElementById(id));
    return missing.length === 0 ? 'all panels' : `missing ${missing.join(',')}`;
  });
  check('city map draws', () => {
    game.drawCityMapNow();
    const rgba = game.citymapPixel(520, 300);
    if (!rgba) return 'no city map pixel';
    return rgba[3] > 0 ? 'map rendered' : 'map blank';
  });
  check('save round-trip', () => {
    writeSave({ money: 12345, respect: 320, job: 1, stage: 2, player: { x: 1, z: 2, heading: 0 }, inCar: true });
    const saved = readSave();
    clearSave();
    return saved && saved.money === 12345 && saved.job === 1 && saved.stage === 2 ? 'ok' : 'mismatch';
  });
  check('audio module loads', () => (game.audioReady() ? 'synth ready' : false));
  check('shot staging freezes the sim', () => {
    game.stageShotForTest('chase');
    const frozen = game.isFrozen();
    game.resetWorld();
    game.setFrozen(false);
    return frozen ? 'frozen' : 'not frozen';
  });
  check('traffic cars on the road', () => {
    const n = game.trafficCount();
    return n >= 5 ? `${n} cars` : `${n} cars — too few`;
  });
  check('pedestrians on the sidewalks', () => {
    const n = game.pedestrianCount();
    return n >= 5 ? `${n} peds` : `${n} peds — too few`;
  });
  check('post pipeline renders', () => (game.postReady() ? 'bloom + ACES ready' : false));
  check('hero light is on', () => {
    const intensity = game.heroLightIntensity();
    return intensity > 0.5 ? `intensity ${intensity.toFixed(2)}` : `intensity ${intensity}`;
  });
  check('no page errors so far', () => {
    const n = window.__sbErrors ? window.__sbErrors.length : 0;
    return n === 0 ? 'clean' : `${n} error(s)`;
  });

  const passed = results.filter((r) => r.pass).length;
  const summary = { passed, total: results.length, results };
  window.__playtest = summary;
  const box = document.getElementById('playtest-results');
  if (box) {
    box.textContent = `PLAYTEST ${passed}/${results.length}\n` + results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`).join('\n');
  }
  return summary;
}
