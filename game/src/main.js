// SOLMAR BAY — main loop: boot, input, driving, on-foot play, camera,
// wanted level, missions, save/resume, HUD and the shot-freeze mode.
import * as THREE from 'three';
import { CHAPTERS, CREW, RADIO, START_MONEY, WORLD } from './config.js';
import { buildWorld } from './world.js';
import { buildCar, makeCarState } from './cars.js';
import { buildPerson, buildRico, makePedestrians, updatePedestrians, animateWalk } from './people.js';
import { makePolice } from './police.js';
import { initHud, updateHud, hudState, setDialogue as hudSetDialogue, showNearMiss, hideNearMiss } from './hud.js';
import { drawCityMap } from './map.js';
import { stageShot } from './shots.js';
import { PostFX } from './bloom.js';
import { runPlaytest } from './playtest.js';
import { loadSave, writeSave } from './save.js';
import * as audio from './audio.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const LOW_PERF = params.has('perf') && params.get('perf') === 'low';

const game = {
  THREE,
  state: {
    mode: 'title',
    chapter: 1,
    stage: 0,
    money: START_MONEY,
    wanted: 0,
    heat: 0,
    clock: '18:47',
    street: 'SOLMAR AVENUE',
    respect: 320,
    respectLevel: 2,
    inCar: true,
    carName: 'VULPINE S',
    displaySpeedKmh: 0,
    gear: 1,
    condition: 92,
  },
  radio: RADIO[0],
  shotFrozen: false,
  frame: 0,
  bootErrors: [],
  titleCamera: null,
  titleLookAt: null,
  footCamTarget: null,
};

window.addEventListener('error', (e) => {
  game.bootErrors.push(e.message || 'error');
});

// ---------- Renderer / scene ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(LOW_PERF ? 0.5 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
game.renderer = renderer;

const scene = new THREE.Scene();
game.scene = scene;
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-7, 3.4, 13);
game.camera = camera;

const postfx = new PostFX(renderer, window.innerWidth, window.innerHeight);
if (LOW_PERF) postfx.setLowRes(true);

// ---------- World / actors ----------
const { counts } = buildWorld(scene);
game.worldCounts = counts;

const heroGroup = buildCar({ color: 0xcc2222, detail: true });
const heroCar = makeCarState(scene, heroGroup, 0, 10, Math.PI);
game.heroCar = heroCar;

const rico = buildRico();
rico.position.set(2, 0, 10);
rico.visible = false;
scene.add(rico);
game.rico = rico;

// Traffic: 12 cars on the avenue and side streets.
const traffic = [];
const trafficColors = [0x2e6f8e, 0xd9d9d9, 0x3a3f45, 0x8a6a3a, 0x5a7d4a, 0x7a4a8a, 0xb0b8c0, 0xc0a040];
const lanes = [];
for (let i = 0; i < 8; i += 1) lanes.push({ x: i % 2 === 0 ? -3.5 : 3.5, heading: i % 2 === 0 ? Math.PI : 0, axis: 'z' });
for (let i = 0; i < 4; i += 1) lanes.push({ z: WORLD.streets[i], heading: i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, axis: 'x' });
lanes.forEach((lane, i) => {
  const car = buildCar({ color: trafficColors[i % trafficColors.length], detail: false });
  const x = lane.axis === 'z' ? lane.x : -100 + i * 45;
  const z = lane.axis === 'z' ? -110 + i * 28 : lane.z;
  const state = makeCarState(scene, car, x, z, lane.heading, { speed: 8 + (i % 4) * 2 });
  state.lane = lane;
  traffic.push(state);
});
game.traffic = traffic;

const peds = makePedestrians(scene, 20);
game.peds = peds;

// Marina crew: three people standing on the quay near Rico's meeting spot.
const marinaCrew = [];
for (const [cx, cz, rot, shirt, skin] of [[67, 5, 1.2, 0xd94a6a, 0xc68e5e], [71, 11, -0.6, 0x4a90d9, 0x8d5524], [70, 4, 0.4, 0x4ad68a, 0xe8b98a]]) {
  const member = buildPerson({ shirt, pants: 0x2a2d34, skin });
  member.position.set(cx, 0, cz);
  member.rotation.y = rot;
  scene.add(member);
  marinaCrew.push(member);
}
game.marinaCrew = marinaCrew;

const police = makePolice(scene);
game.police = police;

// ---------- Game methods used by shots / hud / map ----------
game.setMode = (mode) => {
  game.state.mode = mode;
  document.body.classList.toggle('title-mode', mode === 'title');
  const title = document.getElementById('title-screen');
  if (title) title.style.display = mode === 'title' ? 'flex' : 'none';
  const mapScreen = document.getElementById('map-screen');
  if (mapScreen && mode !== 'map') mapScreen.style.display = 'none';
};

game.setWanted = (n) => {
  game.state.wanted = THREE.MathUtils.clamp(n, 0, 5);
  game.state.heat = game.state.wanted * 20;
  audio.setSirenLevel(game.state.wanted);
};

game.setDialogue = hudSetDialogue;

game.openMap = () => {
  game.state.mode = 'map';
  const mapScreen = document.getElementById('map-screen');
  if (mapScreen) mapScreen.style.display = 'flex';
  const canvasMap = document.getElementById('citymap');
  if (canvasMap) drawCityMap(canvasMap, game);
};

game.closeMap = () => {
  game.state.mode = 'play';
  const mapScreen = document.getElementById('map-screen');
  if (mapScreen) mapScreen.style.display = 'none';
};

game.playerPos = () => {
  const p = game.state.inCar ? heroCar.group.position : rico.position;
  const h = game.state.inCar ? heroCar.heading : rico.rotation.y;
  return { x: p.x, z: p.z, heading: h };
};

game.policePos = () => police.units.map((u) => ({ x: u.group.position.x, z: u.group.position.z }));

game.missionTarget = () => {
  const ch = CHAPTERS[game.state.chapter - 1] || CHAPTERS[0];
  return { x: ch.target.x, z: ch.target.z };
};

game.snapChaseCamera = () => {
  const h = heroCar.heading;
  const fwd = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
  const right = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
  const pos = heroCar.group.position.clone()
    .addScaledVector(fwd, -5.6)
    .addScaledVector(right, 1.6);
  pos.y = 2.2;
  camera.position.copy(pos);
  const look = heroCar.group.position.clone().addScaledVector(fwd, 6);
  look.y = 1.1;
  camera.lookAt(look);
};

// ---------- Input: held keys + consume-on-read press queue ----------
const keys = new Set();
const pressQueue = [];
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  pressQueue.push(e.code);
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
function pressed(code) {
  const i = pressQueue.indexOf(code);
  if (i === -1) return false;
  pressQueue.splice(i, 1);
  return true;
}

// ---------- HUD ----------
initHud();
hudSetDialogue('lena', CHAPTERS[0].line);

// ---------- Save / resume ----------
const saved = SHOT ? null : loadSave();
if (saved) {
  game.state.money = saved.money;
  game.state.chapter = saved.chapter;
  game.state.stage = saved.stage;
  game.state.respect = saved.respect;
  game.state.respectLevel = saved.respectLevel;
  game.state.inCar = saved.player.inCar;
  heroCar.setPose(saved.car.x, saved.car.z, saved.car.heading);
  rico.position.set(saved.player.x, 0, saved.player.z);
  rico.visible = !saved.player.inCar;
  const ch = CHAPTERS[saved.chapter - 1] || CHAPTERS[0];
  hudSetDialogue(ch.speaker, ch.line);
}

// ---------- Start button ----------
document.getElementById('btn-start').addEventListener('click', () => {
  audio.startAudio();
  audio.startEngine();
  audio.startSiren();
  audio.clickSound();
  game.setMode('play');
});

// ---------- Camera ----------
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
function updateCamera(dt) {
  if (game.state.mode === 'title' && game.titleCamera) {
    camera.position.copy(game.titleCamera);
    camera.lookAt(game.titleLookAt);
    return;
  }
  if (game.state.mode === 'map') return;
  let desired;
  let look;
  if (game.state.inCar) {
    const h = heroCar.heading;
    const fwd = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
    const right = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
    desired = heroCar.group.position.clone().addScaledVector(fwd, -5.6).addScaledVector(right, 1.6);
    desired.y = 2.2;
    look = heroCar.group.position.clone().addScaledVector(fwd, 6);
    look.y = 1.1;
  } else {
    const target = game.footCamTarget || rico.position;
    const back = new THREE.Vector3(-Math.sin(rico.rotation.y), 0, -Math.cos(rico.rotation.y));
    desired = target.clone().addScaledVector(back, 4.5);
    desired.y = 2.8;
    look = target.clone();
    look.y = 1.4;
  }
  // Snap (k=1) in shotFrozen mode; smooth follow otherwise.
  const k = game.shotFrozen ? 1 : 1 - Math.exp(-dt * 4.5);
  if (game.frame <= 1) {
    camPos.copy(desired);
    camLook.copy(look);
  } else {
    camPos.lerp(desired, k);
    camLook.lerp(look, k);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

// ---------- Driving / walking ----------
const MAX_SPEED = 46;
let nearMissCooldown = 0;
function updateDriving(dt) {
  const s = game.state;
  let accel = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) accel = 15;
  if (keys.has('KeyS') || keys.has('ArrowDown')) accel = heroCar.speed > 0.5 ? -30 : -8;
  const handbrake = keys.has('Space');
  heroCar.speed += accel * dt;
  heroCar.speed -= heroCar.speed * (handbrake ? 1.4 : 0.35) * dt;
  heroCar.speed = THREE.MathUtils.clamp(heroCar.speed, -8, MAX_SPEED);
  let steer = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) steer += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) steer -= 1;
  const steerRate = (handbrake ? 2.4 : 1.5) * Math.min(1, Math.abs(heroCar.speed) / 12 + 0.15);
  heroCar.heading += steer * steerRate * dt * Math.sign(heroCar.speed || 1);
  heroCar.group.position.x += Math.sin(heroCar.heading) * heroCar.speed * dt;
  heroCar.group.position.z += Math.cos(heroCar.heading) * heroCar.speed * dt;
  heroCar.group.position.x = THREE.MathUtils.clamp(heroCar.group.position.x, -112, 112);
  heroCar.group.position.z = THREE.MathUtils.clamp(heroCar.group.position.z, -116, 116);
  heroCar.group.rotation.y = heroCar.heading;
  for (const w of heroCar.wheels) w.rotation.x += (heroCar.speed * dt) / 0.34;
  // Front wheels yaw with steering.
  heroCar.wheels[0].rotation.y = steer * 0.35;
  heroCar.wheels[1].rotation.y = steer * 0.35;
  if (!game.shotFrozen) {
    s.displaySpeedKmh = Math.round(Math.abs(heroCar.speed) * 3.6);
    s.gear = Math.max(1, Math.min(6, 1 + Math.floor(Math.abs(heroCar.speed) / MAX_SPEED * 5)));
  }
  // Near miss: fast pass within 2.4 units of a traffic car.
  nearMissCooldown -= dt;
  if (Math.abs(heroCar.speed) > 17 && nearMissCooldown <= 0) {
    for (const t of traffic) {
      const d = heroCar.group.position.distanceTo(t.group.position);
      if (d < 4.2 && d > 1.8) {
        game.state.money += 250;
        showNearMiss(false);
        audio.nearMissChime();
        nearMissCooldown = 5;
        break;
      }
    }
  }
  audio.setEngineSpeed(Math.abs(heroCar.speed) * 3.6, true);
}

const walkDir = new THREE.Vector3();
function updateWalking(dt) {
  const camYaw = Math.atan2(camera.position.x - rico.position.x, camera.position.z - rico.position.z);
  let f = 0;
  let r = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) r -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) r += 1;
  const moving = f !== 0 || r !== 0;
  if (moving) {
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = run ? 8 : 4;
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    walkDir.set(f * sin + r * cos, 0, f * cos - r * sin).normalize();
    rico.position.addScaledVector(walkDir, speed * dt);
    rico.position.x = THREE.MathUtils.clamp(rico.position.x, -112, 112);
    rico.position.z = THREE.MathUtils.clamp(rico.position.z, -116, 116);
    rico.rotation.y = Math.atan2(walkDir.x, walkDir.z);
  }
  animateWalk(rico, dt, moving);
  audio.setEngineSpeed(0, false);
}

// ---------- Missions / wanted ----------
let saveTimer = 0;
function updateMissions(dt) {
  const s = game.state;
  const p = game.playerPos();
  const t = game.missionTarget();
  const dist = Math.hypot(t.x - p.x, t.z - p.z);
  if (dist < 9 && s.stage === 0) {
    s.stage = 1;
    s.money += 500;
    hudSetDialogue((CHAPTERS[s.chapter - 1] || CHAPTERS[0]).speaker, 'You made it. Press F to get to work.');
  }
  if (pressed('KeyF') && s.stage === 1 && dist < 12) {
    s.money += 1500;
    s.respect += 120;
    if (s.respect >= 1000) {
      s.respect -= 1000;
      s.respectLevel += 1;
    }
    s.chapter = Math.min(7, s.chapter + 1);
    s.stage = 0;
    const ch = CHAPTERS[s.chapter - 1];
    hudSetDialogue(ch.speaker, ch.line);
    writeSave({ ...s, player: p, car: { x: heroCar.group.position.x, z: heroCar.group.position.z, heading: heroCar.heading } });
  }
  // Wanted: heat rises near police while speeding; decays when clear.
  // Stages never auto-complete from wanted changes (latch).
  const nearestPolice = Math.min(...police.units.map((u) => u.group.position.distanceTo(heroCar.group.position)));
  if (Math.abs(heroCar.speed) > 28 && nearestPolice < 30) s.heat += dt * 3;
  else if (nearestPolice > 60) s.heat -= dt * 2;
  s.heat = THREE.MathUtils.clamp(s.heat, 0, 100);
  const stars = s.heat < 8 ? 0 : s.heat < 30 ? 1 : s.heat < 50 ? 2 : s.heat < 70 ? 3 : s.heat < 88 ? 4 : 5;
  if (stars !== s.wanted) game.setWanted(stars);
  saveTimer += dt;
  if (saveTimer > 10) {
    saveTimer = 0;
    writeSave({ ...s, player: p, car: { x: heroCar.group.position.x, z: heroCar.group.position.z, heading: heroCar.heading } });
  }
}

function updateStreet() {
  const p = game.playerPos();
  if (Math.abs(p.x) < 9) game.state.street = 'SOLMAR AVENUE';
  else {
    const streets = [[-80, 'CROWN ROAD'], [-40, 'CANAL STREET'], [40, 'VELA STREET'], [80, 'PALM BOULEVARD']];
    let best = 'SOLMAR AVENUE';
    let bd = 1e9;
    for (const [z, name] of streets) {
      const d = Math.abs(p.z - z);
      if (d < bd) {
        bd = d;
        best = name;
      }
    }
    game.state.street = p.x > 62 ? 'DOCKSIDE' : best;
  }
}

// ---------- Actions (consume-on-read) ----------
function updateActions() {
  if (pressed('KeyM') || pressed('Escape')) {
    if (game.state.mode === 'map') game.closeMap();
    else if (game.state.mode === 'play') game.openMap();
  }
  if (pressed('KeyR')) {
    game.radio = audio.setStation(RADIO.indexOf(game.radio) + 1);
  }
  if (pressed('KeyN')) audio.setMuted(!audio.isMuted());
  if (pressed('KeyE') && game.state.mode === 'play' && !game.shotFrozen) {
    if (game.state.inCar) {
      game.state.inCar = false;
      rico.position.set(heroCar.group.position.x + 2.2, 0, heroCar.group.position.z);
      rico.rotation.y = heroCar.heading;
      rico.visible = true;
      heroCar.speed = 0;
    } else {
      const d = rico.position.distanceTo(heroCar.group.position);
      if (d < 4) {
        game.state.inCar = true;
        rico.visible = false;
        audio.clickSound();
      }
    }
  }
}

// ---------- Traffic update ----------
function updateTraffic(dt) {
  for (const t of traffic) {
    const speed = t.speed;
    t.group.position.x += Math.sin(t.heading) * speed * dt;
    t.group.position.z += Math.cos(t.heading) * speed * dt;
    if (t.lane.axis === 'z') {
      if (t.group.position.z > 118) t.group.position.z = -118;
      if (t.group.position.z < -118) t.group.position.z = 118;
    } else {
      if (t.group.position.x > 118) t.group.position.x = -118;
      if (t.group.position.x < -118) t.group.position.x = 118;
    }
    for (const w of t.wheels) w.rotation.x += (speed * dt) / 0.34;
  }
}

// ---------- Shot staging ----------
if (SHOT) {
  stageShot(SHOT, game);
} else {
  game.setMode('title');
}

// ---------- Loop ----------
const clock = new THREE.Clock();
let playtestDone = false;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1);
  game.frame += 1;
  if (!game.shotFrozen) {
    updateActions();
    if (game.state.mode === 'play') {
      if (game.state.inCar) updateDriving(dt);
      else updateWalking(dt);
      updateMissions(dt);
      updateTraffic(dt);
      updatePedestrians(peds, dt);
      police.update(dt, game.playerPos(), game.state.wanted, false);
      updateStreet();
    } else if (game.state.mode === 'map') {
      updateTraffic(dt);
      updatePedestrians(peds, dt);
      police.update(dt, game.playerPos(), game.state.wanted, false);
    }
  } else {
    police.update(0, game.playerPos(), game.state.wanted, true);
  }
  updateCamera(dt);
  updateHud(hudState(game));
  postfx.render(scene, camera, dt);
  if (!playtestDone && game.frame >= 3) {
    playtestDone = true;
    try {
      runPlaytest(game);
    } catch (e) {
      game.bootErrors.push(`playtest: ${e.message}`);
      window.__playtest = { passed: 0, total: 20, results: [{ name: 'playtest crashed', pass: false, detail: e.message }] };
    }
  }
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize(window.innerWidth, window.innerHeight);
});

window.SB = { game };
