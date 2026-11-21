// Ember Bay — main entrypoint: renderer, lights, world assembly, the game
// loop, chase camera, arcade driving, on-foot mode, saves, and the staged
// screenshot shots. Exposes window.SB for the playtest harness.
const THREE = window.THREE;
import { GAME, WORLD, SHOT_SPEED_KMH } from './config.js';
import { mulberry32 } from './random.js';
import { buildSky, buildGround, buildBuildings, buildPalms, buildMarina, buildTraffic, buildPeds } from './city.js';
import { buildCar } from './cars.js';
import { buildPerson } from './people.js';
import { buildCruisers, buildHeli, flashLights, spinRotors } from './police.js';
import { buildHUD, setSpeed, cycleRadio, drawMinimap, showPopup } from './hud.js';
import { initAudio, setEngine, setSiren, sirenWail, chime, toggleMute } from './audio.js';
import { createInput } from './input.js';
import { stageChase, stageTitle, stageMap, stageMarina } from './shots.js';

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const STAGED = !!SHOT;

// ---- renderer / scene / camera -------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('game-root').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(WORLD.fogColor, WORLD.fogNear, WORLD.fogFar);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 800);

// ---- lights ---------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
sun.position.set(-60, 55, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x9a7bd6, 0x8a5a3a, 0.85));
// warm east fill so backlit faces and car rears stay readable
const fill = new THREE.DirectionalLight(0xffb27a, 0.9);
fill.position.set(80, 25, -30);
scene.add(fill);
// marina frontal fill (turned up for the marina shot)
const marinaFill = new THREE.SpotLight(0xffd9a8, 0, 30, 0.7, 0.6, 1.0);
marinaFill.position.set(45, 3, -22);
marinaFill.target.position.set(45, 1.2, -31);
scene.add(marinaFill, marinaFill.target);

// ---- world ----------------------------------------------------------------
const rng = mulberry32(20261121);
buildSky(scene);
buildGround(scene);
buildBuildings(scene, rng);
buildPalms(scene, rng);
const marina = buildMarina(scene);
const traffic = buildTraffic(scene, rng);
const peds = buildPeds(scene);

// hero car
const hero = buildCar({ color: 0xc22a2a, spoiler: true });
hero.position.set(0, 0, 0);
scene.add(hero);

// police
const cruisers = buildCruisers(scene);
const { heli, beam, pool } = buildHeli(scene);

// dock crew: the four, close together, facing +Z (toward the marina camera)
const crewDefs = [
  { skin: 0xc68642, shirt: 0x2e8bc0, pants: 0x2b3a55, hair: 0x2b1a12, hairStyle: 'long', pose: 'hip', headYaw: 0.12 },
  { skin: 0xe8b88a, shirt: 'stripes', pants: 0x3a3a3a, hair: 0x1a1a1a, hairStyle: 'short', pose: 'crossed', headYaw: -0.1, shorts: true },
  { skin: 0x8d5524, shirt: 0xc94f7c, pants: 0x8a6a3a, hair: 0x3b2314, hairStyle: 'bun', pose: 'wave', headYaw: 0.05, lean: 0.04 },
  { skin: 0xf1c27d, shirt: 0x2e7d32, pants: 0x222222, hair: 0x6b4423, hairStyle: 'cap', pose: 'relaxed', headYaw: -0.14 },
];
const crew = crewDefs.map((def, i) => {
  const p = buildPerson(def);
  const [x, z] = marina.crewSpots[i];
  p.position.set(x, 0.52, z);
  p.rotation.y = 0;
  scene.add(p);
  return p;
});

// on-foot hero (hidden until the player exits the car)
const heroPed = buildPerson({
  skin: 0xc68642, shirt: 0xc22a2a, pants: 0x2b3a55,
  hair: 0x1a1a1a, hairStyle: 'short', pose: 'relaxed',
});
heroPed.visible = false;
scene.add(heroPed);

// ---- state -----------------------------------------------------------------
const state = {
  mode: 'title', // title | drive | foot | pause
  speed: 0, // m/s
  yaw: 0,
  steer: 0,
  onFoot: false,
  followCam: true,
  savedSlot: 1,
};
const game = {
  ready: false, errors, scene, renderer, onFoot: false, heroPed,
  followCam: true, marinaFill, state, hero, camera,
};
window.SB = {
  game,
  cars: { hero, cruisers, speedKmh: () => Math.round(state.speed * 3.6) },
  police: { heli, beam, pool },
  peds: { crew },
};

// ---- HUD + menus ------------------------------------------------------------
buildHUD();
const minimapCtx = document.getElementById('minimap').getContext('2d');
const bigmapCtx = document.getElementById('bigmap').getContext('2d');
const ROUTE = [[0, 0], [45, 0], [95, 0]];

function showTitle(show) {
  document.getElementById('title-screen').style.display = show ? 'flex' : 'none';
}
function showPause(show) {
  document.getElementById('pause-menu').style.display = show ? 'flex' : 'none';
  if (show) drawBigMap();
}

function drawBigMap() {
  const c = bigmapCtx;
  const W = c.canvas.width, H = c.canvas.height;
  c.fillStyle = '#0e1a24';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#14506e';
  c.fillRect(0, H * 0.7, W, H * 0.3);
  c.fillStyle = '#1d2f3d';
  for (let x = 0; x < 10; x++) {
    for (let z = 0; z < 7; z++) {
      if (z === 3) continue;
      c.fillRect(20 + x * (W - 40) / 10 + 3, 20 + z * (H - 40) / 7 + 3, (W - 40) / 10 - 6, (H - 40) / 7 - 6);
    }
  }
  c.strokeStyle = '#3a4a58';
  c.lineWidth = 10;
  c.beginPath(); c.moveTo(0, H * 0.5); c.lineTo(W, H * 0.5); c.stroke();
  c.lineWidth = 6;
  [0.15, 0.32, 0.5, 0.68, 0.85].forEach((fx) => {
    c.beginPath(); c.moveTo(W * fx, 0); c.lineTo(W * fx, H); c.stroke();
  });
  // GPS route to the garage
  const toMap = (x, z) => [W / 2 + (x / 160) * W, H / 2 + (z / 160) * H];
  c.strokeStyle = '#37e08b';
  c.lineWidth = 5;
  c.setLineDash([12, 8]);
  c.beginPath();
  ROUTE.forEach(([x, z], i) => {
    const [mx, mz] = toMap(x, z);
    i ? c.lineTo(mx, mz) : c.moveTo(mx, mz);
  });
  c.stroke();
  c.setLineDash([]);
  const [gx, gz] = toMap(95, 0);
  c.fillStyle = '#37e08b';
  c.beginPath(); c.arc(gx, gz, 10, 0, 7); c.fill();
  c.fillStyle = '#ffffff';
  c.font = 'bold 20px Arial';
  c.fillText('GARAGE', gx - 34, gz - 16);
  // districts
  c.fillStyle = '#9fb6c6';
  c.font = 'bold 18px Arial';
  GAME.districts.forEach((d, i) => {
    c.fillText(d.toUpperCase(), 24 + (i % 3) * (W / 3), 44 + Math.floor(i / 3) * (H / 2.4));
  });
  // player
  const [px, pz] = toMap(hero.position.x, hero.position.z);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(px, pz, 9, 0, 7); c.fill();
  c.fillStyle = '#37e08b';
  c.beginPath(); c.arc(px, pz, 5, 0, 7); c.fill();
}

// saves (localStorage, 3 slots)
function saveSlot(n) {
  try {
    localStorage.setItem('emberbay-save-' + n, JSON.stringify({
      x: hero.position.x, z: hero.position.z, yaw: state.yaw,
      money: GAME.money, mission: GAME.mission.name, at: Date.now(),
    }));
    showPopup('<div class="pop-big">SAVED</div><div class="pop-sub">SLOT ' + n + ' · EMBER BAY</div>');
    setTimeout(() => document.getElementById('popup').classList.remove('show'), 1800);
    chime();
  } catch (e) { /* storage unavailable */ }
}
function loadSlot(n) {
  try {
    const raw = localStorage.getItem('emberbay-save-' + n);
    if (!raw) return false;
    const s = JSON.parse(raw);
    hero.position.set(s.x, 0, s.z);
    state.yaw = s.yaw;
    return true;
  } catch (e) { return false; }
}
function refreshSlotLabels() {
  [1, 2, 3].forEach((n) => {
    const el = document.getElementById('save-' + n);
    if (!el) return;
    let label = 'EMPTY SLOT';
    try {
      const raw = localStorage.getItem('emberbay-save-' + n);
      if (raw) {
        const s = JSON.parse(raw);
        label = 'SAVED · ' + new Date(s.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
    } catch (e) { /* ignore */ }
    el.querySelector('span').textContent = label;
  });
}

function startGame() {
  initAudio();
  showTitle(false);
  state.mode = 'drive';
  setSiren(true);
  chime();
}
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-continue').addEventListener('click', () => {
  if (loadSlot(1)) startGame();
  else startGame();
});
[1, 2, 3].forEach((n) => {
  const el = document.getElementById('save-' + n);
  if (el) el.addEventListener('click', () => saveSlot(n));
});
document.getElementById('btn-resume').addEventListener('click', () => {
  showPause(false);
  state.mode = state.onFoot ? 'foot' : 'drive';
});
refreshSlotLabels();

// ---- input ------------------------------------------------------------------
const input = createInput();
input.on('KeyM', () => {
  if (state.mode === 'pause') {
    showPause(false);
    state.mode = state.onFoot ? 'foot' : 'drive';
  } else if (state.mode === 'drive' || state.mode === 'foot') {
    state.mode = 'pause';
    showPause(true);
  }
});
input.on('KeyR', () => { cycleRadio(); chime(); });
input.on('KeyN', () => toggleMute());
input.on('KeyF', () => {
  showPopup('<div class="pop-big">TALK</div><div class="pop-sub">DOC REYES: "MAKE IT QUICK, ROOK."</div>');
  setTimeout(() => document.getElementById('popup').classList.remove('show'), 2000);
});
input.on('KeyE', () => {
  if (state.mode === 'drive') {
    state.mode = 'foot';
    state.onFoot = true;
    game.onFoot = true;
    heroPed.visible = true;
    heroPed.position.set(hero.position.x + 1.5, 0, hero.position.z + 1.5);
    heroPed.rotation.y = state.yaw;
  } else if (state.mode === 'foot') {
    const d = heroPed.position.distanceTo(hero.position);
    if (d < 5) {
      state.mode = 'drive';
      state.onFoot = false;
      game.onFoot = false;
      heroPed.visible = false;
    }
  }
});

// ---- staged shots ------------------------------------------------------------
if (SHOT === 'chase') stageChase(game);
else if (SHOT === 'title') stageTitle(game);
else if (SHOT === 'map') stageMap(game);
else if (SHOT === 'marina') stageMarina(game);
else showTitle(true);

// ---- driving ------------------------------------------------------------------
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
let driftTimer = 0;

function updateDrive(dt) {
  const fwd = input.pressed('KeyW');
  const back = input.pressed('KeyS');
  const left = input.pressed('KeyA');
  const right = input.pressed('KeyD');
  const brake = input.pressed('Space');
  if (fwd) state.speed += 9 * dt;
  if (back) state.speed -= state.speed > 0.5 ? 14 * dt : 4 * dt;
  if (!fwd && !back) state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 4 * dt);
  if (brake) state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 22 * dt);
  state.speed = Math.max(-8, Math.min(46, state.speed));
  // off-road drag
  if (Math.abs(hero.position.z) > 8 && hero.position.x < 20) state.speed *= 1 - 0.6 * dt;
  const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
  state.steer += (steerTarget - state.steer) * Math.min(1, dt * 8);
  const spd = Math.abs(state.speed);
  const yawRate = state.steer * (0.35 + Math.min(spd / 30, 1) * 0.9) * (brake ? 1.7 : 1);
  state.yaw += yawRate * dt * Math.sign(state.speed || 1) * Math.min(1, spd / 4 + 0.15);
  hero.rotation.y = state.yaw;
  const fx = Math.cos(state.yaw), fz = -Math.sin(state.yaw);
  hero.position.x += fx * state.speed * dt;
  hero.position.z += fz * state.speed * dt;
  hero.position.x = Math.max(-135, Math.min(135, hero.position.x));
  hero.position.z = Math.max(-55, Math.min(60, hero.position.z));
  // wheels spin + front steer
  (hero.userData.wheels || []).forEach((w, i) => {
    w.spin.rotation.z -= (state.speed / 0.34) * dt;
    if (i < 2) w.pivot.rotation.y = state.steer * 0.38;
  });
  // body lean + drift popup
  hero.rotation.z = -state.steer * Math.min(spd / 40, 1) * 0.05;
  hero.rotation.x = Math.min(spd / 46, 1) * 0.012;
  if (brake && spd > 12) {
    driftTimer += dt;
    if (driftTimer > 0.6) {
      showPopup('<div class="pop-big">DRIFT x3</div><div class="pop-sub">NEAR MISS +$250</div>');
    }
  } else {
    driftTimer = 0;
    if (!STAGED) document.getElementById('popup').classList.remove('show');
  }
  setSpeed(state.speed * 3.6);
  setEngine(state.speed * 3.6, true);
}

function updateFoot(dt) {
  const run = input.pressed('ShiftLeft') || input.pressed('ShiftRight');
  const spd = run ? 8 : 4;
  let mx = 0, mz = 0;
  if (input.pressed('KeyW')) mz -= 1;
  if (input.pressed('KeyS')) mz += 1;
  if (input.pressed('KeyA')) mx -= 1;
  if (input.pressed('KeyD')) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    mx /= len; mz /= len;
    heroPed.position.x += mx * spd * dt;
    heroPed.position.z += mz * spd * dt;
    heroPed.rotation.y = Math.atan2(mx, mz);
    // walk bob
    heroPed.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.05;
  } else {
    heroPed.position.y = 0;
  }
  setSpeed(0);
  setEngine(0, false);
}

function updateCamera(dt) {
  if (!game.followCam) return;
  const target = state.onFoot ? heroPed.position : hero.position;
  const yaw = state.onFoot ? heroPed.rotation.y : state.yaw;
  const orbit = input.lookX;
  const dist = state.onFoot ? 5.5 : 8.2;
  const height = state.onFoot ? 2.6 : 3.4;
  const a = yaw + Math.PI + orbit;
  camPos.set(
    target.x + Math.cos(a) * dist,
    height + input.lookY * 2,
    target.z - Math.sin(a) * dist,
  );
  camera.position.lerp(camPos, Math.min(1, dt * 5));
  camTarget.set(target.x, 1.2, target.z);
  camera.lookAt(camTarget);
}

function updatePolice(dt, t) {
  flashLights(cruisers, t);
  spinRotors(heli, dt);
  heli.position.y = 26 + Math.sin(t * 0.7) * 0.8;
  if (STAGED) return;
  // cruisers ease toward flanking offsets around the hero
  const offsets = [[-7.5, 4.6], [6.5, -5.2], [16, 3.4], [24, -3.0]];
  cruisers.forEach((c, i) => {
    const [ox, oz] = offsets[i];
    const tx = hero.position.x + ox * Math.cos(state.yaw) - oz * Math.sin(state.yaw);
    const tz = hero.position.z + ox * Math.sin(state.yaw) + oz * Math.cos(state.yaw);
    c.position.x += (tx - c.position.x) * Math.min(1, dt * 0.7);
    c.position.z += (tz - c.position.z) * Math.min(1, dt * 0.7);
    c.rotation.y += (state.yaw - c.rotation.y) * Math.min(1, dt * 0.8);
  });
  // heli follows the hero from above
  heli.position.x += (hero.position.x + 8 - heli.position.x) * Math.min(1, dt * 0.5);
  heli.position.z += (hero.position.z - 6 - heli.position.z) * Math.min(1, dt * 0.5);
  beam.position.set(heli.position.x - 3, 13, heli.position.z + 3);
  pool.position.set(hero.position.x + 3, 0.03, hero.position.z - 1);
}

// ---- loop ----------------------------------------------------------------------
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (!STAGED) {
    if (state.mode === 'drive') updateDrive(dt);
    else if (state.mode === 'foot') updateFoot(dt);
    else if (state.mode === 'title') {
      // slow cinematic drift on the title screen
      camera.position.x += Math.sin(t * 0.1) * 0.004;
    }
  }
  updateCamera(dt);
  updatePolice(dt, t);
  sirenWail(t);
  // minimap (live)
  drawMinimap(minimapCtx, {
    x: hero.position.x, z: hero.position.z, yaw: state.yaw,
  }, cruisers, ROUTE);
  renderer.render(scene, camera);
  if (!game.ready && ++frames >= 2) game.ready = true;
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
