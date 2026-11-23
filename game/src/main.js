// AURELIA BAY — main entrypoint. Wires the whole open world together: the
// city, traffic, crowds, the police helicopter (a direct scene mesh), the
// wanted system, missions, HUD, audio and the screenshot staging. Playable
// with keyboard and mouse; the chase camera follows the hero car or Dante
// on foot, and pitches up when the helicopter is overhead so it stays in
// frame. No network request is ever made.

import { makeRng, clamp, damp, angleLerp, el } from './util.js';
import { buildSky, buildLights } from './sky.js';
import { buildCity, DISTRICTS, AVENUES, STREETS } from './city.js';
import { createTraffic, createHeroCar, buildCivilianCar, buildPoliceCruiser } from './vehicles.js';
import { buildPlayer, createCrowd, createWalker } from './people.js';
import { buildHelicopter } from './heli.js';
import { createPolice } from './police.js';
import { createMissions, CREW } from './missions.js';
import { buildPortraits } from './faces.js';
import { buildHUD } from './hud.js';
import { createAudio } from './audio.js';
import { getShotConfig } from './shots.js';

const AVENUE_NAMES = {
  '-120': 'Ember Strand Ave',
  '-60': 'Gilded Quay Blvd',
  0: 'Sunset Mile',
  60: 'Palma Row',
  120: 'Ember Heights Dr',
};
const STREET_NAMES = {
  '-120': 'Vidrio Way', '-80': 'Lantern Ave', '-40': 'Coral Market St',
  0: 'Aurelia Blvd', 40: 'Coral Market St', 80: 'Marina Way', 120: 'Ember Strand',
};

const shot = getShotConfig();
const rng = makeRng(shot ? shot.seed : 1);

// --- Renderer / scene / camera -------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9cc8ee, 140, 620);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 8, 30);

buildSky(scene);
buildLights(scene);
const city = buildCity(scene);
const traffic = createTraffic(scene, 26, 4242);
const crowd = createCrowd(scene, 777);
const police = createPolice(scene, 99);
const missions = createMissions();
const audio = createAudio();
const portraits = buildPortraits();
const hud = buildHUD(portraits);

// --- Player, hero car, helicopter ----------------------------------------
// The helicopter is a DIRECT scene mesh: built here, added straight to the
// scene, and only heli.update() ever moves it. No other module touches it.
const heli = buildHelicopter();
scene.add(heli.group);
scene.add(heli.coneGroup);
scene.add(heli.pool);
// Hidden until the wanted level calls it in — otherwise it would sit at the
// origin on the ground during the start screen.
heli.group.visible = false;
heli.coneGroup.visible = false;
heli.pool.visible = false;

const heroCar = createHeroCar(scene, 3.6, 30, Math.PI);
const player = buildPlayer();
scene.add(player.group);
const walker = createWalker(player, 3.6, 34, Math.PI);

const game = {
  mode: 'drive', // 'drive' | 'walk' | 'start' | 'pause'
  started: false,
  paused: false,
  health: 78,
  armour: 61,
  clockMinutes: 13 * 60 + 42,
  radioIndex: 0,
  heliAngle: Math.PI / 2 - Math.PI,
  heliFrozen: false,
  heliOpts: { radius: 55, altitude: 42 },
  camPos: new THREE.Vector3(0, 8, 42),
  camLook: new THREE.Vector3(0, 2, 30),
  nearMissCooldown: 0,
  driftCooldown: 0,
  shotTraffic: [],
};

function nearestDistrict(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(d.x - x, d.z - z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best;
}

function nearestStreetName(x, z) {
  let bestA = 0;
  let bestAd = Infinity;
  for (const ax of AVENUES) {
    const dd = Math.abs(ax - x);
    if (dd < bestAd) { bestAd = dd; bestA = ax; }
  }
  let bestS = 0;
  let bestSd = Infinity;
  for (const sz of STREETS) {
    const dd = Math.abs(sz - z);
    if (dd < bestSd) { bestSd = dd; bestS = sz; }
  }
  return bestAd < bestSd ? AVENUE_NAMES[String(bestA)] : STREET_NAMES[String(bestS)];
}

// --- Screenshot staging ---------------------------------------------------
function applyShot() {
  if (!shot) return;
  game.started = true;
  hud.hideStart();
  if (shot.mode === 'drive' || shot.mode === 'pause') {
    game.mode = 'drive';
    const c = shot.car;
    heroCar.state.x = c.x;
    heroCar.state.z = c.z;
    heroCar.state.heading = c.heading;
    heroCar.state.speed = 26;
    heroCar.mesh.position.set(c.x, 0, c.z);
    heroCar.mesh.rotation.y = c.heading;
  } else {
    game.mode = 'walk';
    const p = shot.player;
    walker.state.x = p.x;
    walker.state.z = p.z;
    walker.state.heading = p.heading;
    player.group.position.set(p.x, 0, p.z);
    player.group.rotation.y = p.heading;
    heroCar.mesh.visible = false;
  }
  police.setStars(shot.wanted);
  if (shot.heli) {
    game.heliOpts = { radius: shot.heli.radius, altitude: shot.heli.altitude };
    // Freeze the heli ahead of the car so it lands upper-center in frame,
    // offset ~0.25 rad to the side so the spotlight cone reads obliquely
    // (dead-center, the camera looks straight up the cone's axis and the
    // cone nearly vanishes).
    const heading = shot.mode === 'walk' ? shot.player.heading : shot.car.heading;
    game.heliAngle = Math.PI / 2 - heading + 0.25;
    game.heliFrozen = true;
    // Position the heli once now: shot mode freezes the simulation, so the
    // per-frame step never runs — the heli must already be in place.
    const tx = shot.mode === 'walk' ? shot.player.x : shot.car.x;
    const tz = shot.mode === 'walk' ? shot.player.z : shot.car.z;
    heli.group.visible = true;
    heli.coneGroup.visible = true;
    heli.pool.visible = true;
    heli.update(0, 0, { x: tx, z: tz }, game.heliAngle, game.heliOpts);
    // Scale the heli up for the shot so the rotor spans ~1/6 of the frame.
    heli.group.scale.setScalar(1.25);
  }
  // Densify: stage extra vehicles around the hero so the frame is full.
  for (const t of shot.extraTraffic || []) {
    const mesh = t.kind === 'police' ? buildPoliceCruiser() : buildCivilianCar(t.color ?? 0x2980b9, 'sedan');
    mesh.position.set(t.x, 0, t.z);
    mesh.rotation.y = t.heading;
    scene.add(mesh);
    game.shotTraffic.push({ mesh, x: t.x, z: t.z, heading: t.heading, kind: t.kind });
  }
  // Crowd boost: pull a dozen walkers onto the sidewalks flanking the hero
  // so the frame reads crowded at a glance. The sim is frozen in shot mode,
  // so they stay exactly where staged, mid-stride.
  if (shot.mode === 'drive' || shot.mode === 'pause') {
    const cx = shot.car.x;
    const cz = shot.car.z;
    let ax = AVENUES[0];
    for (const a of AVENUES) if (Math.abs(a - cx) < Math.abs(ax - cx)) ax = a;
    for (let i = 0; i < 14 && i < crowd.walkers.length; i++) {
      const w = crowd.walkers[i];
      const side = i % 2 === 0 ? -1 : 1;
      w.p.group.position.set(ax + side * 11.5, 0, cz - 28 + (i % 7) * 8);
      w.p.group.rotation.y = i % 4 < 2 ? Math.PI : 0;
      w.p.setWalkPhase(i * 0.9, 1);
    }
  }
  // The dialogue bar stays empty in frozen shot mode (no step runs to rotate
  // lines), so hide it rather than showing an empty panel.
  el('dialogue').classList.add('hidden');
  if (shot.popup && shot.popup[0]) {
    setTimeout(() => hud.popup(shot.popup[0], shot.popup[1] || ''), 600);
    // Pin the popup so it is still visible when the screenshot is taken.
    el('popup').classList.add('pinned');
  }
  if (shot.prompt) hud.setPrompt(shot.prompt);
  if (shot.mode === 'pause') {
    game.paused = true;
    hud.showPause();
    hud.drawPauseMap(hudState());
  }
  // Snap the camera to the staged frame at once (no slow drift-in).
  snapCamera();
}

// --- Input -----------------------------------------------------------------
const input = {
  forward: false, back: false, left: false, right: false,
  handbrake: false, run: false,
};

const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake', ShiftLeft: 'run', ShiftRight: 'run',
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  audio.ensure();
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = true;
  if (e.code === 'KeyM') togglePause();
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (e.code === 'KeyN') audio.toggleMute();
  if (e.code === 'KeyR') {
    game.radioIndex = (game.radioIndex + 1) % 4;
    hud.setRadio(game.radioIndex);
    audio.radioSting();
  }
  if (e.code === 'Enter' && !game.started) startGame();
  if (e.code === 'KeyE' && game.started && !game.paused) toggleCar();
  if (e.code === 'KeyF' && game.started && !game.paused) doAction();
  if ((e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'KeyC') && game.started && !game.paused) {
    useCrewAbility(e.code.slice(3));
  }
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false;
});
window.addEventListener('blur', () => {
  for (const k of Object.keys(input)) input[k] = false;
});
window.addEventListener('mousedown', (e) => {
  if (!game.started || game.paused) return;
  audio.ensure();
  if (game.mode === 'walk' && e.button === 0) {
    audio.shoot();
    police.addHeat(8);
    hud.popup('HIT', 'Target down');
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.started && !game.paused) togglePause();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start screen buttons.
document.querySelectorAll('#start-screen .menu-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.ensure();
    audio.click();
    startGame();
  });
});
el('resume-btn').addEventListener('click', () => {
  audio.click();
  togglePause();
});
document.querySelectorAll('#pause-menu .pause-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pause-menu .pause-tab').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    audio.click();
  });
});

function startGame() {
  if (game.started) return;
  game.started = true;
  hud.hideStart();
  hud.setRadio(0);
  const line = missions.nextDialogue();
  hud.setDialogue(line.from, line.text, portraits.vera);
}

function togglePause() {
  if (!game.started) return;
  game.paused = !game.paused;
  if (game.paused) {
    hud.showPause();
    hud.drawPauseMap(hudState());
  } else {
    hud.hidePause();
  }
}

function toggleCar() {
  if (game.mode === 'drive') {
    game.mode = 'walk';
    const s = heroCar.state;
    walker.state.x = s.x + Math.cos(s.heading) * 2.5;
    walker.state.z = s.z - Math.sin(s.heading) * 2.5;
    walker.state.heading = s.heading;
    player.group.position.set(walker.state.x, 0, walker.state.z);
    player.group.visible = true;
    heroCar.state.speed = 0;
  } else {
    // Find the nearest car to steal: the hero car or a traffic car.
    const p = walker.state;
    const heroDist = Math.hypot(heroCar.state.x - p.x, heroCar.state.z - p.z);
    let best = null;
    let bestD = heroDist;
    let bestIsHero = true;
    for (const c of traffic.cars) {
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < bestD) { bestD = d; best = c; bestIsHero = false; }
    }
    if (bestD > 6) return;
    if (!bestIsHero && best) {
      // Steal it: the hero car takes its place and color.
      scene.remove(best.mesh);
      traffic.cars.splice(traffic.cars.indexOf(best), 1);
      heroCar.state.x = best.x;
      heroCar.state.z = best.z;
      heroCar.state.heading = best.heading;
      police.addHeat(14);
      hud.popup('CAR STOLEN', '+$150 chop value');
      missions.state.money += 150;
    }
    game.mode = 'drive';
    heroCar.mesh.visible = true;
    player.group.visible = false;
    heroCar.state.speed = 0;
  }
}

function doAction() {
  // Context action: near the market cab, steal it; otherwise nothing.
  if (game.mode !== 'walk') return;
  hud.popup('ACTION', 'Nothing to do here');
}

function useCrewAbility(key) {
  const crew = missions.useAbility(key);
  if (!crew) return;
  if (key === 'Z') police.addHeat(-30);
  if (key === 'X') heroCar.state.condition = 100;
  hud.popup(crew.ability, crew.desc);
  audio.pickup();
}

// --- Camera -----------------------------------------------------------------
function snapCamera() {
  updateCamera(1, true);
}

function updateCamera(dt, snap = false) {
  const inCar = game.mode === 'drive';
  const px = inCar ? heroCar.state.x : walker.state.x;
  const pz = inCar ? heroCar.state.z : walker.state.z;
  const heading = inCar ? heroCar.state.heading : walker.state.heading;
  const back = inCar ? 7.5 : 7.5;
  const height = inCar ? 3.6 : 3.4;
  const lookAhead = inCar ? 20 : 10;
  // Drive camera sits slightly right of the car's line so the hero car reads
  // as a 3/4 rear view (roof, glass cabin, spoiler, side profile) instead of
  // a flat slab dead behind it.
  const side = inCar ? -3 : 0;
  // Pitch the camera up when the helicopter is active so it stays in frame.
  // Shot framing is tuned so BOTH the hero car (big, bottom-center) and the
  // heli (upper-center) fit: lookUp 5 puts the view center ~4 deg up, which
  // leaves the heli at ~15% from the top and the car roof at ~85%.
  const lookUp = shot && shot.mode !== 'walk' ? 5 : police.state.heliActive ? 7 : inCar ? 2.5 : 1.6;
  const tx = px - Math.sin(heading) * back + Math.cos(heading) * side;
  const tz = pz - Math.cos(heading) * back - Math.sin(heading) * side;
  const lx = px + Math.sin(heading) * lookAhead;
  const lz = pz + Math.cos(heading) * lookAhead;
  const rate = snap ? 1000 : 3.2;
  game.camPos.x = damp(game.camPos.x, tx, rate, dt);
  game.camPos.y = damp(game.camPos.y, height, rate, dt);
  game.camPos.z = damp(game.camPos.z, tz, rate, dt);
  game.camLook.x = damp(game.camLook.x, lx, rate, dt);
  game.camLook.y = damp(game.camLook.y, lookUp, rate, dt);
  game.camLook.z = damp(game.camLook.z, lz, rate, dt);
  camera.position.copy(game.camPos);
  camera.lookAt(game.camLook);
}

// --- HUD state ---------------------------------------------------------------
function hudState() {
  const inCar = game.mode === 'drive';
  const px = inCar ? heroCar.state.x : walker.state.x;
  const pz = inCar ? heroCar.state.z : walker.state.z;
  const district = nearestDistrict(px, pz);
  return {
    job: missions.currentJob(),
    stage: missions.currentStage(),
    stageTitle: missions.currentJob().stages[missions.state.stageIndex].toUpperCase(),
    stageIndex: missions.state.stageIndex,
    timer: missions.state.timer,
    money: missions.state.money,
    stars: police.state.stars,
    heliActive: police.state.heliActive,
    units: police.state.units,
    clockMinutes: game.clockMinutes,
    cooldowns: missions.state.crewCooldowns,
    district: district.name,
    street: nearestStreetName(px, pz),
    districtStanding: 'NEUTRAL',
    districtRep: 58,
    health: game.health,
    armour: game.armour,
    rep: missions.state.rep,
    repLevel: missions.state.repLevel,
    speed: inCar ? heroCar.state.speed : 0,
    inCar,
    condition: heroCar.state.condition,
    player: { x: px, z: pz },
    heading: inCar ? heroCar.state.heading : walker.state.heading,
    police: police.state.cruisers,
    heli: police.state.heliActive ? { x: heli.group.position.x, z: heli.group.position.z } : null,
  };
}

// --- Main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
let accumulator = 0;
const STEP = 1 / 60;
let hudTimer = 0;
let dialogueTimer = 0;

function step(dt, time) {
  game.clockMinutes += dt * 0.5;
  traffic.update(dt);
  crowd.update(dt);
  missions.update(dt);
  const inCar = game.mode === 'drive';
  const px = inCar ? heroCar.state.x : walker.state.x;
  const pz = inCar ? heroCar.state.z : walker.state.z;
  const speed = inCar ? heroCar.state.speed : walker.state.moving ? 4 : 0;

  if (!game.paused) {
    if (inCar) {
      heroCar.update(dt, input);
      player.group.visible = false;
    } else {
      walker.update(dt, input, camera.rotation.y);
      player.group.visible = true;
    }
    police.update(dt, { x: px, z: pz }, Math.abs(speed));
    // Near-miss + drift juice.
    game.nearMissCooldown = Math.max(0, game.nearMissCooldown - dt);
    game.driftCooldown = Math.max(0, game.driftCooldown - dt);
    if (inCar && Math.abs(heroCar.state.speed) > 18) {
      for (const c of traffic.cars) {
        const d = Math.hypot(c.x - px, c.z - pz);
        if (d < 4.5 && game.nearMissCooldown <= 0) {
          game.nearMissCooldown = 4;
          missions.state.money += 150;
          hud.popup('NEAR MISS +$150', '');
          audio.pickup();
        }
      }
      if (heroCar.state.drift > 0.6 && game.driftCooldown <= 0) {
        game.driftCooldown = 4;
        missions.state.money += 250;
        hud.popup('DRIFT x3', 'NEAR MISS +$250');
      }
    }
    // Rotating fixer dialogue.
    dialogueTimer += dt;
    if (dialogueTimer > 24) {
      dialogueTimer = 0;
      const line = missions.nextDialogue();
      hud.setDialogue(line.from, line.text, portraits.vera);
    }
  }

  // Helicopter: orbits above the player whenever wanted at 3+ stars.
  // Shots override the orbit (radius/altitude) so the heli frames
  // upper-center; normal play keeps it high and wide.
  if (police.state.heliActive) {
    if (!game.heliFrozen) game.heliAngle += dt * 0.05;
    heli.group.visible = true;
    heli.coneGroup.visible = true;
    heli.pool.visible = true;
    heli.update(dt, time, { x: px, z: pz }, game.heliAngle, game.heliOpts);
  } else {
    heli.group.visible = false;
    heli.coneGroup.visible = false;
    heli.pool.visible = false;
  }
  audio.update(inCar ? heroCar.state.speed : 0, police.state.stars, time);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  // Shot mode freezes the simulation so the staged frame is deterministic:
  // the camera, HUD and renderer still run, but nothing moves after staging.
  if (game.started && !shot) {
    accumulator += dt;
    let n = 0;
    while (accumulator >= STEP && n < 5) {
      step(STEP, time);
      accumulator -= STEP;
      n += 1;
    }
  }
  updateCamera(game.started ? dt : 0.016);
  hudTimer += dt;
  if (hudTimer > 0.12 && game.started) {
    hudTimer = 0;
    hud.update(hudState());
  }
  renderer.render(scene, camera);
}

// --- Boot --------------------------------------------------------------------
if (shot) {
  applyShot();
} else {
  hud.showStart();
  police.setStars(0);
}
// Radio + an opening dialogue line in both modes (shot mode never runs the
// step that would set them later).
hud.setRadio(0);
{
  const line = missions.nextDialogue();
  hud.setDialogue(line.from, line.text, portraits.vera);
}
snapCamera();
hud.update(hudState());
frame();

// Test hooks for the headless playtest (not part of gameplay).
window.__game = {
  status() {
    return {
      started: game.started,
      mode: game.mode,
      paused: game.paused,
      stars: police.state.stars,
      heliVisible: heli.group.visible,
      heliPos: heli.group.visible
        ? { x: heli.group.position.x, y: heli.group.position.y, z: heli.group.position.z }
        : null,
      carPos: { x: heroCar.state.x, z: heroCar.state.z, speed: heroCar.state.speed },
      playerPos: { x: walker.state.x, z: walker.state.z },
      cruisers: police.state.cruisers.length,
      traffic: traffic.cars.length,
      walkers: crowd.walkers.length,
      shops: city.shops.length,
      money: missions.state.money,
    };
  },
  driveForward(seconds) {
    input.forward = true;
    setTimeout(() => { input.forward = false; }, seconds * 1000);
  },
};
