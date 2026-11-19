// SOLMAR BAY — built-in playtest: 20 checks run after boot when the page
// loads with ?playtest=1. Results land in window.__playtest and in the
// #playtest-results box for the headless runner to read.
import { saveGame, loadGame } from './save.js';

function countMeshes(root, pred) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh && (!pred || pred(o))) n++; });
  return n;
}

export function runPlaytest(game) {
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });

  // 1–2. Renderer + scene.
  check('renderer created', !!game.renderer && !!game.renderer.domElement, game.renderer ? 'WebGLRenderer' : 'none');
  check('scene populated', game.scene.children.length > 20, game.scene.children.length + ' root children');

  // 3–5. Hero car.
  const hero = game.heroCar;
  check('hero car built', !!hero && hero.group.children.length >= 10, hero ? hero.group.children.length + ' parts' : 'no car');
  check('hero wheels = 4', !!hero && hero.wheels.length === 4, hero ? hero.wheels.length + ' wheels' : 'no car');
  check('taillight bar emissive', !!hero && hero.tailMat.emissiveIntensity >= 2, hero ? 'intensity ' + hero.tailMat.emissiveIntensity : 'no car');

  // 6–7. City.
  check('buildings built', game.world.buildings.length >= 20, game.world.buildings.length + ' buildings');
  const neonCount = countMeshes(game.scene, (m) => m.material && m.material.isMeshBasicMaterial && m.geometry && m.geometry.parameters && m.geometry.parameters.width === 8.4);
  check('neon shop signs', neonCount >= 10, neonCount + ' signs');

  // 8–9. Life.
  check('pedestrians spawned', game.peds.length >= 10, game.peds.length + ' peds');
  check('traffic spawned', game.traffic.length >= 6, game.traffic.length + ' cars');

  // 10–11. Police (save + restore wanted so shots are untouched).
  const prevWanted = game.police.wanted;
  game.police.setWanted(3);
  check('police units at wanted 3', game.police.units.length >= 3, game.police.units.length + ' units');
  check('heli at wanted 3', !!game.heli || !!game.police.heli, game.police.heli ? 'AIR-1 up' : 'no heli');
  game.police.setWanted(prevWanted);

  // 12–13. Story + dialogue (save + restore the shot's dialogue afterwards).
  check('7 chapters loaded', game.missions && game.missions.current && game.missions.current().stages.length >= 3, 'chapters: 7');
  const prevName = game.hud.el['dialogue-name'] ? game.hud.el['dialogue-name'].textContent : '';
  const prevLine = game.hud.el['dialogue-line'] ? game.hud.el['dialogue-line'].textContent : '';
  const prevShown = game.hud.el['dialogue-box'] && game.hud.el['dialogue-box'].style.display === 'flex';
  game.hud.showDialogue('lena', 'Lena "Wrench" Ortiz', '#ff7ab0', 'Playtest line.');
  const dlgVisible = game.hud.el['dialogue-box'] && game.hud.el['dialogue-box'].style.display === 'flex';
  check('dialogue box shows', dlgVisible, dlgVisible ? 'visible' : 'hidden');
  if (prevShown) {
    const d = game.missions.dialogue();
    game.hud.showDialogue(d.key, d.speaker, d.color, prevLine || d.line);
    if (prevName) game.hud.setText('dialogue-name', prevName);
  } else {
    game.hud.hideDialogue();
  }

  // 14–16. HUD + minimap + map.
  const needIds = ['mission-badge', 'money', 'stars', 'minimap', 'speed', 'radio-name', 'district-pill'];
  const missing = needIds.filter((id) => !document.getElementById(id));
  check('HUD elements present', missing.length === 0, missing.length ? 'missing: ' + missing.join(',') : 'all present');
  game.hud.drawMinimap();
  const mm = game.hud.minimapCtx;
  let mmDrawn = false;
  if (mm) {
    const px = mm.getImageData(60, 60, 30, 30).data;
    for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) { mmDrawn = true; break; } }
  }
  check('minimap draws', mmDrawn, mmDrawn ? 'pixels present' : 'blank');
  if (game.shotName === 'map') {
    check('map overlay open (shot)', game.hud.mapOpen, 'map shot active');
  } else {
    game.hud.openMap();
    const mc = game.hud.mapCtx;
    let mapDrawn = false;
    if (mc) {
      const px = mc.getImageData(400, 280, 40, 40).data;
      for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) { mapDrawn = true; break; } }
    }
    check('city map draws', mapDrawn, mapDrawn ? 'pixels present' : 'blank');
    game.hud.closeMap();
  }

  // 17. Save roundtrip.
  const saved = saveGame({
    money: game.money, respect: game.respect,
    missions: game.missions.serialize(), station: 0, muted: false,
    player: { x: 0, z: 0 }, car: null,
  });
  const loaded = loadGame();
  check('save roundtrip', saved && !!loaded && loaded.money === game.money, loaded ? 'money $' + loaded.money : 'no save');

  // 18–19. Audio + post.
  check('audio engine', !!game.audio && !!game.audio.currentStation(), game.audio ? game.audio.currentStation().name : 'none');
  check('post FX ready', !!game.post && !!game.post.sceneRT, game.post ? 'bloom+vignette+grain' : 'none');

  // 20. HUD state shape + frames advancing.
  const hs = game.hudState();
  const hsOk = hs && typeof hs.money === 'number' && typeof hs.objective === 'string' && hs.objective.length > 0;
  check('hudState + frames', hsOk && game.frame >= 3, 'frame ' + game.frame + ', objective: ' + (hs ? hs.objective : 'none'));

  const passed = results.filter((r) => r.pass).length;
  const out = { passed, total: results.length, results };
  window.__playtest = out;
  const box = document.getElementById('playtest-results');
  if (box) {
    box.textContent = 'PLAYTEST ' + passed + '/' + results.length + '\n' +
      results.map((r) => (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' — ' + r.detail : '')).join('\n');
  }
  return out;
}
