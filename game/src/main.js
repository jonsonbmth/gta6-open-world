// SOLMAR BAY — boot and the one loop. The world advances in fixed 1/60 s steps,
// the renderer paints through the custom post pipeline, and the HUD updates from
// the assembled state. Modes: title, play, map, paused.
//
// ?seed=N fixes the city. ?shot=chase|title|map|marina stages that scene, freezes
// the sim, paints it and sets window.__shotReady. ?playtest=1 runs the 20-check
// playtest. ?perf=low renders the scene at half resolution.
import * as THREE from 'three';
import { JOBS, RADIO, STEP, WORLD } from './config.js';
import { createRandom, pick, range } from './random.js';
import { ACTION_CONFIRM, ACTION_DO, ACTION_ENTER_CAR, ACTION_MAP, ACTION_MUTE, ACTION_PAUSE, ACTION_RADIO, createInput } from './input.js';
import { createAudio } from './audio.js';
import { readSave, writeSave, resumeDialogue } from './save.js';
import { createWorld } from './world.js';
import { makeHeroCar, makeTrafficCar } from './cars.js';
import { animateWalk, makeCrew, makePerson } from './people.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { createRender } from './render.js';
import { createPost } from './post.js';
import { stageShot } from './shots.js';
import { runPlaytest } from './playtest.js';

window.__sbErrors = [];
window.addEventListener('error', (event) => window.__sbErrors.push(event.message));
window.addEventListener('unhandledrejection', (event) => window.__sbErrors.push(String(event.reason)));

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const playtestParam = params.get('playtest') === '1';
const perfLow = params.get('perf') === 'low';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createRandom(seed);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const render = createRender(canvas);
const { renderer, scene, camera } = render;
const postScale = perfLow ? 0.5 : 1;
const post = createPost(renderer, Math.floor(window.innerWidth * postScale), Math.floor(window.innerHeight * postScale));
const world = createWorld(scene, random);
const hud = createHud();
const audio = createAudio();
const police = createPolice(scene, random, world.textures);
const missions = createMissions();
const input = createInput(canvas);
const crew = makeCrew(random);

// --- Dynamic actors ---
const heroCar = makeHeroCar(random, world.textures);
scene.add(heroCar);
const rico = crew.rico;
scene.add(rico);
const traffic = [];
const peds = [];
let crewPlaced = false;

function spawnTraffic() {
  for (let i = 0; i < 12; i += 1) {
    const car = makeTrafficCar(random, world.textures);
    const onAvenue = i % 2 === 0;
    const lane = pick(random, onAvenue ? WORLD.avenueX : WORLD.streetZ);
    const dir = random() < 0.5 ? 1 : -1;
    const t = { car, onAvenue, lane, dir, speed: range(random, 8, 13), offset: range(random, -3.4, 3.4) };
    if (onAvenue) car.position.set(lane + (dir > 0 ? 2.6 : -2.6), 0, range(random, -100, 100));
    else car.position.set(range(random, -100, 86), 0, lane + (dir > 0 ? 2.6 : -2.6));
    car.rotation.y = onAvenue ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(car);
    traffic.push(t);
  }
}

function spawnPeds() {
  for (let i = 0; i < 14; i += 1) {
    const person = makePerson(random);
    const onAvenue = i % 2 === 0;
    const lane = pick(random, onAvenue ? WORLD.avenueX : WORLD.streetZ);
    const side = random() < 0.5 ? -7.6 : 7.6;
    const along = range(random, -100, 100);
    if (onAvenue) person.position.set(lane + side, 0, along);
    else person.position.set(along, 0, lane + side);
    person.rotation.y = random() * Math.PI * 2;
    scene.add(person);
    peds.push({ person, onAvenue, lane, side, speed: range(random, 1.1, 1.8), panic: false });
  }
}

// --- Game state ---
let mode = 'title'; // title | play | map | paused
let cameraMode = 'chase'; // chase | foot | title
let frozen = false;
let frame = 0;
let elapsed = 0;
let money = 42780;
let respect = 320;
let respectLevel = 2;
let condition = 100;
let inCar = true;
let heroSpeed = 0;
let heroHeading = Math.PI;
let ricoHeading = Math.PI / 2;
let displaySpeedOverride = null;
let nearMissUntil = 0;
let dialogueUntil = 0;
let dialogue = null;
let saveTimer = 0;
let gameComplete = false;
const heroPos = new THREE.Vector3(0, 0, 30);
const ricoPos = new THREE.Vector3(2.5, 0, 30);

function playerPos() {
  return inCar ? heroPos : ricoPos;
}

function streetName(x, z) {
  if (x > 86) return 'THE DOCKS';
  let best = null;
  let bestDist = Infinity;
  for (const ax of WORLD.avenueX) {
    const d = Math.abs(x - ax);
    if (d < bestDist) { bestDist = d; best = ax === 0 ? 'SOLMAR AVENUE' : ax === 72 ? 'HARBOUR WAY' : ax === -72 ? 'VELA STREET' : ax === 36 ? 'PALM ROW' : 'CROWN ROAD'; }
  }
  for (const sz of WORLD.streetZ) {
    const d = Math.abs(z - sz);
    if (d < bestDist) { bestDist = d; best = sz === -72 ? 'CROWN ROAD' : sz === -36 ? 'CANAL STREET' : sz === 72 ? 'PALM BOULEVARD' : sz === 0 ? 'SOLMAR AVENUE' : 'HARBOUR WAY'; }
  }
  return best || 'SOLMAR AVENUE';
}

function hudState() {
  const job = missions.job();
  const stage = missions.stage();
  const speedKmh = displaySpeedOverride !== null ? displaySpeedOverride : Math.abs(heroSpeed) * 3.6;
  const gear = !inCar ? 0 : speedKmh < 1 ? 1 : Math.min(6, 1 + Math.floor(speedKmh / 32));
  return {
    job, stage, stageIndex: missions.stageIndex,
    clock: '18:47', money, wanted: police.wanted, blink: police.blink,
    street: streetName(playerPos().x, playerPos().z),
    respect, respectLevel, station: audio.station,
    inCar, condition, displaySpeedKmh: speedKmh, gear,
    dialogue: dialogue && (frozen || elapsed < dialogueUntil) ? dialogue : null,
    nearMiss: frozen ? nearMissUntil > 0 : elapsed < nearMissUntil,
    player: { x: playerPos().x, z: playerPos().z },
    heading: inCar ? heroHeading : ricoHeading,
    target: stage.target,
    police: police.units.map((u) => ({ x: u.car.position.x, z: u.car.position.z })),
  };
}

function resetWorld() {
  for (const t of traffic) scene.remove(t.car);
  traffic.length = 0;
  for (const p of peds) scene.remove(p.person);
  peds.length = 0;
  for (const name of ['lena', 'rosa', 'dario']) {
    if (crew[name].parent) scene.remove(crew[name]);
  }
  crewPlaced = false;
  police.setWanted(0);
  missions.startJob(0);
  spawnTraffic();
  spawnPeds();
  heroPos.set(0, 0, 30);
  heroHeading = Math.PI;
  heroSpeed = 0;
  heroCar.position.copy(heroPos);
  heroCar.rotation.y = heroHeading;
  ricoPos.set(2.5, 0, 30);
  ricoHeading = Math.PI / 2;
  rico.position.copy(ricoPos);
  rico.rotation.y = ricoHeading;
  rico.visible = false;
  inCar = true;
  money = 42780;
  respect = 320;
  condition = 100;
  displaySpeedOverride = null;
  nearMissUntil = 0;
  dialogueUntil = 0;
  dialogue = null;
  gameComplete = false;
  mode = 'title';
  cameraMode = 'chase';
  frozen = false;
  world.lightPool.position.set(heroPos.x, 0.08, heroPos.z);
  hud.showTitle(true);
  hud.showHud(false);
  hud.showMap(false);
}

// --- The game API (used by shots.js and playtest.js) ---
const game = {
  THREE, renderer,
  sceneCount() { let n = 0; scene.traverse(() => { n += 1; }); return n; },
  heroInScene() { return heroCar.parent === scene; },
  taillightBarWidth() {
    let width = 0;
    heroCar.traverse((node) => { if (node.userData && node.userData.taillightBar) width = node.userData.barWidth; });
    return width;
  },
  heroWheelCount() { return heroCar.userData.wheels ? heroCar.userData.wheels.length : 0; },
  policeCount() { return police.units.length; },
  heat() { return police.heat; },
  trafficCount() { return traffic.length; },
  pedestrianCount() { return peds.length; },
  postReady() { return typeof post.render === 'function'; },
  audioReady() { return typeof audio.unlock === 'function'; },
  heroLightIntensity() { return render.heroLight.intensity; },
  isFrozen() { return frozen; },
  minimapPixel(x, y) {
    const el = document.getElementById('minimap');
    if (!el) return null;
    hud.drawMinimap(hudState());
    const ctx = el.getContext('2d');
    return Array.from(ctx.getImageData(x, y, 1, 1).data);
  },
  drawCityMapNow() { hud.drawCityMap(hudState()); },
  citymapPixel(x, y) {
    const el = document.getElementById('citymap');
    if (!el) return null;
    const ctx = el.getContext('2d');
    return Array.from(ctx.getImageData(x, y, 1, 1).data);
  },
  stageShotForTest(name) { stageShot(name, game); },
  resetWorld,
  setFrozen(value) { frozen = !!value; },
  setHero(x, z, heading) {
    heroPos.set(x, 0, z);
    heroHeading = heading;
    heroSpeed = 0;
    heroCar.position.copy(heroPos);
    heroCar.rotation.y = heading;
    inCar = true;
    rico.visible = false;
    world.lightPool.position.set(x, 0.08, z);
  },
  setPlayerOnFoot(x, z, heading) {
    ricoPos.set(x, 0, z);
    ricoHeading = heading;
    rico.position.copy(ricoPos);
    rico.rotation.y = heading;
    rico.visible = true;
    inCar = false;
    heroCar.position.set(x - 6, 0, z + 8);
    heroCar.rotation.y = heading;
    heroPos.copy(heroCar.position);
  },
  setDisplaySpeed(kmh) { displaySpeedOverride = kmh; },
  setWanted(level) { police.setWanted(level); },
  setBlink(value) { police.setBlink(value); },
  placePolice(placements) {
    placements.forEach((p, i) => police.placeUnit(i, p.x, p.z, p.heading));
    for (let i = placements.length; i < police.units.length; i += 1) police.placeUnit(i, 300, 300, 0);
  },
  placeTrafficSpot(x, z, heading) {
    const t = traffic.find((item) => !item.placed);
    if (!t) return;
    t.placed = true;
    t.car.position.set(x, 0, z);
    t.car.rotation.y = heading;
  },
  clearTrafficNear(x, z, r) {
    for (let i = traffic.length - 1; i >= 0; i -= 1) {
      const t = traffic[i];
      if (Math.hypot(t.car.position.x - x, t.car.position.z - z) < r) {
        scene.remove(t.car);
        traffic.splice(i, 1);
      }
    }
  },
  setMission(jobIndex, stageIndex) { missions.resume(jobIndex, stageIndex); },
  setDialogue(who, line) {
    dialogue = { who, line };
    dialogueUntil = elapsed + 60;
  },
  clearDialogue() {
    missions.clearDialogue();
    dialogue = null;
    dialogueUntil = 0;
  },
  setNearMiss(value) { nearMissUntil = value ? elapsed + 60 : 0; },
  setMode(next) {
    mode = next;
    hud.showTitle(next === 'title');
    hud.showHud(next !== 'title');
    hud.showMap(next === 'map');
  },
  setCameraMode(next) { cameraMode = next; },
  parkHeli() {
    const heli = police.heli;
    if (!heli) return;
    const p = playerPos();
    heli.position.set(p.x + 34, 32, p.z - 46);
    heli.lookAt(p.x, 0, p.z);
  },
  placeCrew(placements) {
    for (const p of placements) {
      const person = crew[p.who];
      if (!person) continue;
      person.position.set(p.x, 0, p.z);
      person.rotation.y = p.heading;
      if (!person.parent) scene.add(person);
    }
    crewPlaced = true;
  },
};

window.SB = { game: { get frame() { return frame; }, hudState } };

// --- Driving / walking ---
function collideCircle(pos, radius) {
  for (const c of world.colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
      return true;
    }
  }
  return false;
}

function stepDriving(dt) {
  const drive = input.drive();
  const accel = 15;
  if (drive.throttle > 0) heroSpeed += accel * dt;
  else if (drive.throttle < 0) heroSpeed -= (heroSpeed > 0 ? 22 : 9) * dt;
  else heroSpeed -= heroSpeed * 0.5 * dt;
  if (drive.brake) heroSpeed -= heroSpeed * 2.2 * dt;
  heroSpeed = THREE.MathUtils.clamp(heroSpeed, -9, 55);
  const steerAuthority = THREE.MathUtils.clamp(heroSpeed / 12, -1, 1);
  heroHeading += drive.steer * 1.9 * dt * steerAuthority * (drive.brake ? 1.6 : 1);
  heroPos.x += Math.sin(heroHeading) * heroSpeed * dt;
  heroPos.z += Math.cos(heroHeading) * heroSpeed * dt;
  heroPos.x = THREE.MathUtils.clamp(heroPos.x, -106, 86);
  heroPos.z = THREE.MathUtils.clamp(heroPos.z, -106, 106);
  if (collideCircle(heroPos, 1.7)) {
    if (Math.abs(heroSpeed) > 6) {
      condition = Math.max(0, condition - 2);
      police.addHeat(2);
      audio.blip(180);
    }
    heroSpeed *= 0.35;
  }
  heroCar.position.copy(heroPos);
  heroCar.rotation.y = heroHeading;
  const wheels = heroCar.userData.wheels || [];
  for (const wheel of wheels) wheel.rotation.z += (heroSpeed * dt) / 0.36;
  world.lightPool.position.set(heroPos.x, 0.08, heroPos.z);
  // Near miss: passing a traffic car closely at speed.
  if (Math.abs(heroSpeed) > 15) {
    for (const t of traffic) {
      const d = Math.hypot(t.car.position.x - heroPos.x, t.car.position.z - heroPos.z);
      if (d < 3.6 && d > 2.2) {
        nearMissUntil = elapsed + 2.5;
        money += 250;
        respect = Math.min(1000, respect + 5);
        audio.blip(1200);
        break;
      }
    }
  }
  // Speeding through the city draws heat.
  if (Math.abs(heroSpeed) > 30) police.addHeat(dt * 0.5);
}

function stepWalking(dt) {
  const drive = input.drive();
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  camDir.y = 0;
  camDir.normalize();
  const right = new THREE.Vector3(-camDir.z, 0, camDir.x);
  const move = new THREE.Vector3()
    .addScaledVector(camDir, drive.throttle)
    .addScaledVector(right, drive.steer);
  if (move.lengthSq() > 0.01) {
    move.normalize();
    const speed = drive.run ? 7 : 4;
    ricoPos.addScaledVector(move, speed * dt);
    ricoPos.x = THREE.MathUtils.clamp(ricoPos.x, -106, 100);
    ricoPos.z = THREE.MathUtils.clamp(ricoPos.z, -106, 106);
    collideCircle(ricoPos, 0.6);
    const targetHeading = Math.atan2(move.x, move.z);
    let diff = targetHeading - ricoHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ricoHeading += THREE.MathUtils.clamp(diff, -6 * dt, 6 * dt);
    animateWalk(rico, dt, drive.run ? 1 : 0.6);
  } else {
    animateWalk(rico, dt, 0);
  }
  rico.position.copy(ricoPos);
  rico.rotation.y = ricoHeading;
}

function stepTraffic(dt) {
  for (const t of traffic) {
    const step = t.dir * t.speed * dt;
    if (t.onAvenue) {
      t.car.position.z += step;
      if (t.car.position.z > 108) t.car.position.z = -108;
      if (t.car.position.z < -108) t.car.position.z = 108;
    } else {
      t.car.position.x += step;
      // Street traffic turns at the quay (x = 86), never into the bay.
      if (t.car.position.x > 86) t.car.position.x = -108;
      if (t.car.position.x < -108) t.car.position.x = 86;
    }
  }
}

function stepPeds(dt) {
  const p = playerPos();
  const wanted = police.wanted;
  for (const ped of peds) {
    const person = ped.person;
    const distToPlayer = Math.hypot(person.position.x - p.x, person.position.z - p.z);
    ped.panic = wanted >= 3 && distToPlayer < 25;
    if (ped.panic) {
      const away = new THREE.Vector3(person.position.x - p.x, 0, person.position.z - p.z).normalize();
      person.position.addScaledVector(away, 6 * dt);
      person.rotation.y = Math.atan2(away.x, away.z);
      animateWalk(person, dt, 1);
    } else {
      const step = ped.speed * dt * (ped.onAvenue ? 1 : 1);
      if (ped.onAvenue) {
        person.position.z += step;
        if (person.position.z > 105) person.position.z = -105;
        person.rotation.y = 0;
      } else {
        person.position.x += step;
        if (person.position.x > 105) person.position.x = -105;
        person.rotation.y = Math.PI / 2;
      }
      animateWalk(person, dt, 0.5);
    }
  }
}

function stepMissions() {
  const state = {
    player: { x: playerPos().x, z: playerPos().z },
    inCar, wanted: police.wanted,
  };
  const events = missions.update(state);
  for (const event of events) {
    if (event.type === 'stage') {
      money += 500;
      respect = Math.min(1000, respect + 40);
      const next = missions.nextDialogue();
      if (next) {
        dialogue = next;
        dialogueUntil = elapsed + 8;
      }
      if (event.result && event.result.gameComplete) {
        gameComplete = true;
        dialogue = { who: 'Lena "Wrench" Ortiz', line: 'You did it, Rico. Solmar Bay is yours.' };
        dialogueUntil = elapsed + 30;
        status.textContent = 'All seven jobs complete. Solmar Bay is yours.';
      }
      writeSave({ money, respect, job: missions.jobIndex, stage: missions.stageIndex, player: { x: playerPos().x, z: playerPos().z, heading: inCar ? heroHeading : ricoHeading }, inCar });
      audio.blip(980);
    }
  }
  // Job stages that need heat set it when they start.
  const stage = missions.stage();
  if (stage.type === 'wanted' && police.wanted < 3) police.setWanted(3);
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_CONFIRM && mode === 'title') startGame();
  else if (actions & ACTION_PAUSE && mode === 'play') {
    mode = 'paused';
    status.textContent = 'Paused.';
  } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && mode === 'paused') {
    mode = 'play';
    status.textContent = 'Playing.';
  }
  if (actions & ACTION_MAP && (mode === 'play' || mode === 'map')) {
    mode = mode === 'map' ? 'play' : 'map';
    hud.showMap(mode === 'map');
    audio.blip(700);
  }
  if (actions & ACTION_RADIO && mode === 'play') {
    const station = audio.nextStation();
    dialogue = { who: station.name, line: station.track };
    dialogueUntil = elapsed + 4;
  }
  if (actions & ACTION_MUTE) audio.setMuted(!audio.muted);
  if (actions & ACTION_ENTER_CAR && mode === 'play') {
    if (inCar && Math.abs(heroSpeed) < 1) {
      inCar = false;
      ricoPos.set(heroPos.x + 2.6, 0, heroPos.z);
      rico.position.copy(ricoPos);
      rico.visible = true;
      cameraMode = 'foot';
      audio.blip(520);
    } else if (!inCar) {
      const d = Math.hypot(heroPos.x - ricoPos.x, heroPos.z - ricoPos.z);
      if (d < 4.5) {
        inCar = true;
        rico.visible = false;
        cameraMode = 'chase';
        audio.blip(620);
      }
    }
  }
  if (actions & ACTION_DO && mode === 'play' && !inCar) {
    // F: interact — honk the horn when near the car, wave otherwise.
    audio.blip(440);
  }
}

function startGame() {
  mode = 'play';
  cameraMode = inCar ? 'chase' : 'foot';
  hud.showTitle(false);
  hud.showHud(true);
  audio.unlock();
  const saved = readSave();
  if (saved && typeof saved.job === 'number') {
    missions.resume(saved.job, saved.stage || 0);
    money = saved.money || money;
    respect = saved.respect || respect;
    if (saved.player) {
      heroPos.set(saved.player.x, 0, saved.player.z);
      heroHeading = saved.player.heading || Math.PI;
      heroCar.position.copy(heroPos);
      heroCar.rotation.y = heroHeading;
    }
    const resumed = resumeDialogue(missions.job(), missions.stageIndex);
    if (resumed) {
      dialogue = resumed;
      dialogueUntil = elapsed + 8;
    }
    status.textContent = `Resumed: ${missions.job().title}. ${missions.stage().text}.`;
  } else {
    missions.startJob(0);
    const first = missions.nextDialogue();
    if (first) {
      dialogue = first;
      dialogueUntil = elapsed + 8;
    }
    status.textContent = 'Playing. Drive to the garage on Crown Road.';
  }
}

// --- Boot ---
resetWorld();
const startButton = document.getElementById('btn-start');
if (startButton) startButton.addEventListener('click', () => { if (mode === 'title') startGame(); });

let accumulator = 0;
let last = performance.now();

function step(dt) {
  if (mode === 'title') {
    stepTraffic(dt * 0.5);
    stepPeds(dt);
    return;
  }
  if (mode !== 'play' && mode !== 'map') return;
  if (inCar) stepDriving(dt);
  else stepWalking(dt);
  stepTraffic(dt);
  stepPeds(dt);
  police.update(dt, { position: playerPos() }, frozen);
  stepMissions();
  saveTimer += dt;
  if (saveTimer > 30) {
    saveTimer = 0;
    writeSave({ money, respect, job: missions.jobIndex, stage: missions.stageIndex, player: { x: playerPos().x, z: playerPos().z, heading: inCar ? heroHeading : ricoHeading }, inCar });
  }
  audio.update(dt, Math.abs(heroSpeed) * 3.6, police.wanted);
}

function frameLoop(now) {
  requestAnimationFrame(frameLoop);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  elapsed += dt;
  frame += 1;
  handleActions();
  if (!frozen) {
    accumulator += dt;
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
    }
  }
  // Camera.
  if (cameraMode === 'chase') render.chaseCam(heroPos, heroHeading, dt, frozen);
  else if (cameraMode === 'foot') render.footCam(ricoPos, ricoHeading, dt, frozen);
  else render.titleCam(heroPos);
  render.updateLights(inCar ? heroPos : ricoPos, camera.position, !!shot);
  // HUD (keeps running in map mode so the map shot shows live state).
  if (mode !== 'title') {
    hud.update(hudState());
    if (mode === 'map' && frame % 2 === 0) hud.drawCityMap(hudState());
  }
  post.render(scene, camera, elapsed);
}

window.addEventListener('resize', () => {
  render.setSize(window.innerWidth, window.innerHeight);
  post.setSize(Math.floor(window.innerWidth * postScale), Math.floor(window.innerHeight * postScale));
});

if (shot) {
  stageShot(shot, game);
  // Paint several frames so the camera snaps, the post pipeline settles, and the
  // frozen frame is the staged one — then signal the screenshot.
  let painted = 0;
  function paintShot() {
    if (cameraMode === 'chase') render.chaseCam(heroPos, heroHeading, 0.016, true);
    else if (cameraMode === 'foot') render.footCam(ricoPos, ricoHeading, 0.016, true);
    else render.titleCam(heroPos);
    render.updateLights(inCar ? heroPos : ricoPos, camera.position, true);
    if (mode !== 'title') {
      hud.update(hudState());
      if (mode === 'map') hud.drawCityMap(hudState());
    }
    post.render(scene, camera, 1.0);
    painted += 1;
    if (painted < 8) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
  // The frozen frame keeps rendering (identical each time) while the browser waits.
  requestAnimationFrame(frameLoop);
} else {
  status.textContent = 'SOLMAR BAY. Press Space or click START ENGINE.';
  requestAnimationFrame(frameLoop);
  if (playtestParam) {
    setTimeout(() => runPlaytest(game), 1500);
  }
}
