// SOLMAR BAY — main loop: renderer, player (drive + on foot), traffic,
// camera, collisions, missions, police, HUD, save/load, shot presets.
// The game is fully offline: three.js is vendored, all textures procedural.
import * as THREE from 'three';
import { Rng } from './random.js';
import { CITY, DISTRICTS, TRAFFIC_MODELS, TUNE, districtAt, CREW } from './config.js';
import { buildWorld } from './world.js';
import { buildCar } from './cars.js';
import { createCrowd, makeRico, makePerson } from './people.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { createHUD } from './hud.js';
import { saveGame, loadGame } from './save.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const SEED = Number(params.get('seed')) || 1;
const SHOT = params.get('shot');
const rng = new Rng(SEED);

// --- Renderer / scene / camera.
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
// ?perf=low halves the render resolution for low-end devices (same game,
// same logic — just fewer pixels to shade). Default is full resolution.
const perfLow = new URLSearchParams(location.search).get('perf') === 'low';
renderer.setPixelRatio(perfLow ? 0.5 : Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18; // bright night
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141a3a);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(12, 6, 80);

// --- World, crowd, police, missions, HUD, audio, input.
const world = buildWorld(scene, rng);
const crowd = createCrowd(scene, rng, 26);
const police = createPolice(scene, rng, world.colliders);
const missions = createMissions(scene);
const hud = createHUD(document);
const audio = new AudioEngine();
const input = new Input();

// --- Hero car: the VULPINE S.
const heroCar = buildCar({ type: 'sport', color: 0xe62129, name: 'VULPINE S', spoiler: true, emissive: 0x451012 });
heroCar.position.set(2, 0, 40);
heroCar.rotation.y = Math.PI; // facing north (-Z)
scene.add(heroCar);
const heroHeadlight = new THREE.SpotLight(0xfff2cc, 180, 42, 0.5, 0.5, 1.4);
heroHeadlight.position.set(0, 0.7, 2.4);
heroCar.add(heroHeadlight);
heroHeadlight.target.position.set(0, 0, 30);
heroCar.add(heroHeadlight.target);

// --- Rico on foot.
const rico = makeRico();
rico.visible = false;
scene.add(rico);

// --- Traffic: cars looping the street network.
const traffic = [];
const TRAFFIC_LOOPS = [
  [[5, 260], [5, -260], [-5, -260], [-5, 260]],
  [[300, 5], [-180, 5], [-180, -5], [300, -5]],
  [[165, 245], [165, -245], [-165, -245], [-165, 245]],
  [[300, 165], [-180, 165], [-180, 155], [300, 155]],
  [[300, -165], [-180, -165], [-180, -155], [300, -155]],
  [[85, 260], [85, -260], [75, -260], [75, 260]],
];
function spawnTrafficCar(loop, t) {
  const model = rng.pick(TRAFFIC_MODELS);
  const car = buildCar({
    type: model.type, color: rng.pick(model.colors),
    name: model.name, taxi: model.type === 'taxi',
    spoiler: model.type === 'muscle' && rng.chance(0.5),
  });
  const [ax, az] = loop[0];
  const [bx, bz] = loop[1];
  car.position.set(ax + (bx - ax) * t, 0, az + (bz - az) * t);
  car.rotation.y = Math.atan2(bx - ax, bz - az);
  scene.add(car);
  const entry = { car, loop, wp: 1, speed: TUNE.trafficSpeed * rng.range(0.85, 1.1), nearMissAt: 0 };
  traffic.push(entry);
  return entry;
}
for (let i = 0; i < 14; i++) {
  const loop = TRAFFIC_LOOPS[i % TRAFFIC_LOOPS.length];
  spawnTrafficCar(loop, rng.f());
}

// --- Crew members standing by (used by the marina shot + garage).
const crewMembers = {};
for (const key of ['lena', 'dario', 'rosa']) {
  const p = CREW[key];
  const person = makePerson({
    name: p.name, coat: new THREE.Color(p.coat).getHex(), skin: p.skin, hair: p.hair,
    hood: key === 'lena', umbrella: key === 'rosa' ? 0xa06bff : null,
  });
  person.visible = false;
  scene.add(person);
  crewMembers[key] = person;
}

// --- Game state.
const saved = loadGame();
const state = {
  mode: 'title', // title | playing
  driveMode: 'car', // car | foot
  money: saved?.money ?? TUNE.startMoney,
  respect: saved?.respect ?? TUNE.startRespect,
  jobIndex: saved?.jobIndex ?? 0,
  stageIndex: saved?.stageIndex ?? 0,
  completedJobs: saved?.completedJobs ?? 0,
  radioIndex: saved?.radioIndex ?? 0,
  condition: 100,
  day: 1,
  timeMin: 22 * 60 + 47,
  heading: Math.PI,
  speed: 0,
  driftTime: 0,
  drifting: false,
  lastSaveAt: 0,
  lastWanted: 0,
  shotFrozen: false,
  cameraMode: 'chase', // chase | foot | title | fixed
  fixedCam: null,
  mapOpen: false,
};
audio.setStation(state.radioIndex);
missions.setState(state.jobIndex, state.stageIndex, state.completedJobs);
if (saved && saved.playerX !== undefined) {
  heroCar.position.set(saved.playerX, 0, saved.playerZ);
  state.heading = saved.playerHeading ?? Math.PI;
  heroCar.rotation.y = state.heading;
}

const player = {
  get pos() { return state.driveMode === 'car' ? drivenCar.position : rico.position; },
  get heading() { return state.heading; },
};

function timeStr() {
  const h = Math.floor(state.timeMin / 60) % 24;
  const m = Math.floor(state.timeMin % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function collideCircle(x, z, radius) {
  // Returns a corrected [x, z] pushed out of building colliders.
  for (const c of world.colliders) {
    const nx = Math.max(c.x0, Math.min(x, c.x1));
    const nz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - nx, dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      x = nx + (dx / d) * radius;
      z = nz + (dz / d) * radius;
    }
  }
  // World bounds + bay: cars cannot drive into the water (except the bridge).
  if (x < -196 && !(Math.abs(z + 40) < 6 && x > -268)) x = -196;
  x = Math.max(-268, Math.min(315, x));
  z = Math.max(-315, Math.min(315, z));
  return [x, z];
}

function damageCar(amount) {
  state.condition = Math.max(0, state.condition - amount);
  audio.crash();
  if (state.condition <= 0) {
    state.condition = 100;
    hud.floatText('WRECKED — VULPINE RESTORED', 'bad');
    hud.showWantedBanner('YOUR CAR WAS TOTALLED — RESTORED AT THE GARAGE');
  }
}

// --- Driving.
function updateDriving(dt) {
  const forward = input.isDown('KeyW') || input.isDown('ArrowUp');
  const back = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');
  const handbrake = input.isDown('Space');

  if (forward) state.speed += TUNE.heroAccel * dt;
  else if (back) state.speed -= (state.speed > 0.5 ? TUNE.heroBrake : TUNE.heroAccel * 0.5) * dt;
  else state.speed -= state.speed * 0.55 * dt;
  if (handbrake) state.speed -= state.speed * 1.6 * dt;
  state.speed = THREE.MathUtils.clamp(state.speed, -12, TUNE.heroTopSpeed);

  const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
  const speedFactor = Math.min(1, Math.abs(state.speed) / 14);
  const steerRate = 1.9 * speedFactor * (state.speed >= 0 ? 1 : -1);
  state.heading += steerInput * steerRate * dt;

  // Drift: handbrake + steer at speed.
  state.drifting = handbrake && Math.abs(steerInput) > 0 && Math.abs(state.speed) > 14;
  if (state.drifting) {
    state.driftTime += dt;
    state.heading += steerInput * 0.9 * dt;
    if (state.driftTime > 1.2) {
      hud.floatText(`DRIFT x${Math.min(5, 1 + Math.floor(state.driftTime))}`, 'drift');
      state.driftTime = 0;
      state.money += 150;
    }
  } else {
    state.driftTime = 0;
  }

  const dirX = Math.sin(state.heading), dirZ = Math.cos(state.heading);
  let nx = drivenCar.position.x + dirX * state.speed * dt;
  let nz = drivenCar.position.z + dirZ * state.speed * dt;
  const [cx, cz] = collideCircle(nx, nz, 1.5);
  if (cx !== nx || cz !== nz) {
    // Hit a wall: lose speed, take damage, raise wanted if fast.
    if (Math.abs(state.speed) > 8) {
      damageCar(6);
      police.raise(4);
      crowd.panicNear(drivenCar.position, 18, performance.now() / 1000);
    }
    state.speed *= 0.35;
  }
  drivenCar.position.x = cx;
  drivenCar.position.z = cz;
  drivenCar.rotation.y = state.heading;
  // Body roll + pitch for feel.
  drivenCar.rotation.z = THREE.MathUtils.lerp(drivenCar.rotation.z, -steerInput * 0.03 * speedFactor, 0.2);
  drivenCar.rotation.x = THREE.MathUtils.lerp(drivenCar.rotation.x, (forward ? -0.02 : back ? 0.03 : 0), 0.15);
  // Spin wheels.
  for (const w of drivenCar.userData.wheels) w.rotation.x += (state.speed * dt) / 0.34;
  // Front wheels steer visually.
  drivenCar.userData.wheels[0].rotation.y = steerInput * 0.35;
  drivenCar.userData.wheels[1].rotation.y = steerInput * 0.35;
}

// --- On foot.
function updateOnFoot(dt) {
  const forward = input.isDown('KeyW') || input.isDown('ArrowUp');
  const back = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');
  const sprint = input.isDown('Space');
  const speed = sprint ? 7.5 : 4.2;
  let mx = 0, mz = 0;
  if (forward) { mx += Math.sin(state.heading); mz += Math.cos(state.heading); }
  if (back) { mx -= Math.sin(state.heading); mz -= Math.cos(state.heading); }
  if (left) { mx -= Math.cos(state.heading); mz += Math.sin(state.heading); }
  if (right) { mx += Math.cos(state.heading); mz -= Math.sin(state.heading); }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    const targetHeading = Math.atan2(mx, mz);
    let dh = targetHeading - state.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    state.heading += THREE.MathUtils.clamp(dh, -8 * dt, 8 * dt);
    const nx = rico.position.x + mx * speed * dt;
    const nz = rico.position.z + mz * speed * dt;
    const [cx, cz] = collideCircle(nx, nz, 0.6);
    rico.position.x = cx;
    rico.position.z = cz;
    const phase = performance.now() / 1000 * (sprint ? 11 : 7);
    const { legL, legR, armL, armR } = rico.userData.limbs;
    const s = Math.sin(phase);
    legL.rotation.x = s * 0.7; legR.rotation.x = -s * 0.7;
    armL.rotation.x = -s * 0.55; armR.rotation.x = s * 0.55;
  } else {
    const { legL, legR, armL, armR } = rico.userData.limbs;
    legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
    armL.rotation.x *= 0.8; armR.rotation.x *= 0.8;
  }
  rico.rotation.y = state.heading;
}

function nearestCar(maxDist) {
  let best = null, bestD = maxDist;
  const p = rico.position;
  const candidates = [heroCar, ...traffic.map((t) => t.car)];
  for (const car of candidates) {
    const d = car.position.distanceTo(p);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function enterCar(car) {
  if (!car) return;
  // Stealing a traffic car removes it from traffic.
  const ti = traffic.findIndex((t) => t.car === car);
  if (ti !== -1) {
    traffic.splice(ti, 1);
    police.raise(6);
    hud.floatText('CAR STOLEN', 'bad');
  }
  // Swap the hero car reference: the stolen car becomes the driven car.
  if (car !== heroCar) {
    // Park the old hero car where it stands; drive the new one.
    heroCar.visible = true;
    drivenCar = car;
  } else {
    drivenCar = heroCar;
  }
  state.driveMode = 'car';
  rico.visible = false;
  state.heading = car.rotation.y;
  state.speed = 0;
  hud.setHint('');
}

let drivenCar = heroCar;

function exitCar() {
  state.driveMode = 'foot';
  const side = new THREE.Vector3(Math.cos(state.heading), 0, -Math.sin(state.heading));
  rico.position.copy(drivenCar.position).addScaledVector(side, 2.4);
  rico.position.y = 0;
  rico.visible = true;
  state.speed = 0;
  hud.setHint('WASD walk  ·  E enter car  ·  M map  ·  R radio');
}

// --- Traffic update.
function updateTraffic(dt, now) {
  for (const t of traffic) {
    const [wx, wz] = t.loop[t.wp];
    const dx = wx - t.car.position.x, dz = wz - t.car.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4) {
      t.wp = (t.wp + 1) % t.loop.length;
      continue;
    }
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - t.car.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    t.car.rotation.y += THREE.MathUtils.clamp(dh, -1.6 * dt, 1.6 * dt);
    // Slow down for the player ahead.
    const toPlayer = t.car.position.distanceTo(player.pos);
    const speed = toPlayer < 8 && state.driveMode === 'car' ? t.speed * 0.25 : t.speed;
    t.car.position.x += Math.sin(t.car.rotation.y) * speed * dt;
    t.car.position.z += Math.cos(t.car.rotation.y) * speed * dt;
    for (const w of t.car.userData.wheels) w.rotation.x += (speed * dt) / 0.34;
    // Near miss: player screams past a traffic car without touching it.
    if (state.driveMode === 'car' && Math.abs(state.speed) * 3.6 > 80) {
      const d = t.car.position.distanceTo(player.pos);
      if (d < TUNE.nearMissDist && d > 2.6 && now - t.nearMissAt > 6) {
        t.nearMissAt = now;
        state.money += TUNE.nearMissReward;
        hud.floatText(`NEAR MISS +$${TUNE.nearMissReward}`, 'good');
        audio.nearMiss();
      }
    }
    // Collision with the player car.
    if (state.driveMode === 'car') {
      const d = t.car.position.distanceTo(player.pos);
      if (d < 2.7) {
        const push = new THREE.Vector3().subVectors(t.car.position, player.pos).normalize();
        t.car.position.addScaledVector(push, 1.2);
        state.speed *= 0.55;
        damageCar(8);
        police.raise(8);
        crowd.panicNear(player.pos, 20, now);
      }
    }
  }
}

// --- Camera.
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(12, 6, 80);
function updateCamera(dt, t) {
  if (state.cameraMode === 'fixed' && state.fixedCam) {
    camera.position.lerp(state.fixedCam.pos, 1 - Math.pow(0.001, dt));
    camera.lookAt(state.fixedCam.look);
    return;
  }
  if (state.mode === 'title') {
    // Slow cinematic dolly across the Strip.
    const a = t * 0.03;
    camera.position.set(Math.sin(a) * 40, 9 + Math.sin(t * 0.11) * 2, 110 + Math.cos(a) * 20);
    camera.lookAt(0, 6, -40);
    return;
  }
  if (state.driveMode === 'car') {
    // LOW close chase cam: behind and slightly right of the car.
    const back = new THREE.Vector3(-Math.sin(state.heading), 0, -Math.cos(state.heading));
    const right = new THREE.Vector3(Math.cos(state.heading), 0, -Math.sin(state.heading));
    const speedBoost = Math.min(2.5, Math.abs(state.speed) * 0.03);
    camTarget.copy(drivenCar.position)
      .addScaledVector(back, 9.5 + speedBoost)
      .addScaledVector(right, 1.8);
    camTarget.y = 3.4 + Math.abs(state.speed) * 0.008;
    camPos.lerp(camTarget, 1 - Math.pow(0.0001, dt));
    camera.position.copy(camPos);
    const look = new THREE.Vector3().copy(drivenCar.position);
    look.y = 1.6;
    look.addScaledVector(new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading)), 6);
    camera.lookAt(look);
  } else {
    const back = new THREE.Vector3(-Math.sin(state.heading), 0, -Math.cos(state.heading));
    camTarget.copy(rico.position).addScaledVector(back, 5.5);
    camTarget.y = 2.9;
    camPos.lerp(camTarget, 1 - Math.pow(0.0001, dt));
    camera.position.copy(camPos);
    const look = new THREE.Vector3().copy(rico.position);
    look.y = 1.5;
    camera.lookAt(look);
  }
}

// --- Title screen + start.
const titleScreen = document.getElementById('title-screen');
const hudRoot = document.getElementById('hud');
hudRoot.style.display = 'none'; // HUD stays hidden until the game starts
function startGame() {
  state.mode = 'playing';
  titleScreen.style.display = 'none';
  hudRoot.style.display = 'block';
  input.clearPressed();
  audio.init();
  if (saved) {
    // Resume exactly where the save left off — never restart the job's stages.
    missions.setState(state.jobIndex, state.stageIndex, state.completedJobs);
    const j = missions.job();
    hud.showDialogue(j.giver, `${CREW[j.giver].name}: ${missions.stage().text}`);
    hud.setHint(`Welcome back — ${missions.job().title}, stage ${state.stageIndex + 1}`);
  } else {
    missions.startJob(state.jobIndex);
    if (missions.currentDialogue) {
      hud.showDialogue(missions.job().giver, missions.currentDialogue);
    }
  }
  hud.setHint('WASD drive  ·  E exit car  ·  M map  ·  R radio  ·  J dialogue');
  window.setTimeout(() => hud.setHint(''), 9000);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- HUD snapshot.
function hudSnapshot(wanted) {
  const p = missions.progress();
  const nextJob = missions.JOBS[state.jobIndex + 1];
  return {
    money: state.money,
    respect: state.respect,
    respectLevel: 1 + Math.floor(state.respect / 250),
    wanted,
    day: state.day,
    timeStr: timeStr(),
    district: districtAt(player.pos.x, player.pos.z),
    mission: {
      chapter: p.chapter, jobTitle: p.jobTitle, stageText: p.stageText,
      stageNum: p.stageNum, stageTotal: p.stageTotal,
      next: nextJob ? `${nextJob.chapter} ${nextJob.title}` : 'Free roam',
    },
    radioStation: audio.currentStation().name,
    radioTrack: audio.currentTrack(),
    carName: drivenCar.userData.name || 'VULPINE S',
    condition: state.condition,
    speedKmh: Math.abs(state.speed) * 3.6,
    gear: state.driveMode === 'car'
      ? Math.min(6, 1 + Math.floor(Math.abs(state.speed) * 3.6 / 32)) : 0,
    driving: state.driveMode === 'car',
    player: { x: player.pos.x, z: player.pos.z },
    heading: state.heading,
    objective: p.target ? { x: p.target.x, z: p.target.z } : null,
    police: police.cars.map((c) => ({ x: c.car.position.x, z: c.car.position.z })),
  };
}

// --- Main loop.
const clock = new THREE.Clock();
let frame = 0;
let shotReadySent = false;

function animate() {
  requestAnimationFrame(animate);
  // dt clamp 0.1 s: at 60 fps this never binds; on a slow machine the game
  // still advances at a playable rate instead of crawling.
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const now = performance.now() / 1000;

  // Title screen: Enter starts.
  if (state.mode === 'title') {
    if (input.pressed('Enter') || input.pressed('Space')) startGame();
    world.update(dt, t, camera.position);
    updateCamera(dt, t);
    renderer.render(scene, camera);
    input.endFrame();
    frame += 1;
    maybeShotReady();
    return;
  }

  // Keys that work while playing.
  if (input.pressed('KeyM')) {
    state.mapOpen = !state.mapOpen;
    if (state.mapOpen) {
      hud.showMap(hudSnapshot(police.wantedLevel()));
      hudRoot.style.display = 'none';
    } else {
      hud.hideMap();
      hudRoot.style.display = 'block';
    }
  }
  if (input.pressed('KeyR')) {
    audio.setStation(state.radioIndex + 1);
    state.radioIndex = audio.radioIndex;
    hud.floatText(`♪ ${audio.currentStation().name}`, 'radio');
  }
  if (input.pressed('KeyJ')) {
    const line = missions.nextDialogue();
    if (line) hud.showDialogue(missions.job().giver, line);
    else hud.hideDialogue();
  }
  if (input.pressed('KeyE') && !state.mapOpen) {
    if (state.driveMode === 'car') exitCar();
    else {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
      else hud.setHint('No car nearby');
    }
  }
  if (input.pressed('Escape') && state.mapOpen) {
    state.mapOpen = false;
    hud.hideMap();
    hudRoot.style.display = 'block';
  }

  if (!state.mapOpen && !state.shotFrozen) {
    // Advance the clock: 1 game minute per 2 real seconds.
    state.timeMin += dt * 0.5;
    if (state.timeMin >= 24 * 60) { state.timeMin -= 24 * 60; state.day += 1; }

    if (state.driveMode === 'car') updateDriving(dt);
    else updateOnFoot(dt);
    updateTraffic(dt, now);

    // Pedestrian collisions.
    if (state.driveMode === 'car' && Math.abs(state.speed) > 3) {
      for (const ped of crowd.peds) {
        if (ped.userData.state === 'down') continue;
        if (ped.position.distanceTo(player.pos) < 1.9) {
          crowd.knock(ped, now);
          police.raise(12);
          damageCar(2);
          crowd.panicNear(player.pos, 24, now);
          hud.floatText('PEDESTRIAN DOWN', 'bad');
        }
      }
    }
    // Panic: speeding car near peds.
    if (state.driveMode === 'car' && Math.abs(state.speed) * 3.6 > 70) {
      crowd.panicNear(player.pos, 12, now);
    }

    // Police + wanted.
    const wanted = police.update(dt, t, player, () => {
      state.speed *= 0.7;
      damageCar(5);
      hud.floatText('RAMMED BY POLICE', 'bad');
    });
    if (wanted !== state.lastWanted) {
      if (wanted > state.lastWanted) {
        hud.showWantedBanner(wanted >= 3 ? `WANTED ★${wanted} — ${'AIR-1'} OVERHEAD` : `WANTED ★${wanted}`);
        police.raise(0);
      } else if (wanted === 0 && state.lastWanted > 0) {
        hud.showWantedBanner('YOU LOST THEM — HEAT OFF');
        state.money += 200;
      }
      state.lastWanted = wanted;
    }

    // Missions.
    const event = missions.update({
      playerPos: player.pos, wanted, onFoot: state.driveMode === 'foot', dt,
    });
    if (event) {
      if (event.jobComplete) {
        state.money += event.reward;
        state.respect = Math.min(1000, state.respect + 120);
        audio.missionDone();
        hud.floatText(`JOB DONE  +$${event.reward}`, 'good');
        hud.showWantedBanner(`JOB COMPLETE — ${missions.job().title}`);
        state.jobIndex += 1;
        state.stageIndex = 0;
        if (state.jobIndex < missions.JOBS.length) {
          missions.startJob(state.jobIndex);
          if (missions.currentDialogue) hud.showDialogue(missions.job().giver, missions.currentDialogue);
        } else {
          hud.showWantedBanner('ALL JOBS DONE — YOU OWN SOLMAR BAY');
        }
        saveGame(snapshotForSave());
      } else if (event.stageComplete) {
        state.stageIndex = missions.progress().stageIndex;
        state.money += 150;
        hud.floatText('OBJECTIVE CLEAR  +$150', 'good');
        audio.blip(990, 0.15, 0.2);
      } else if (event.hint) {
        hud.setHint(event.hint);
      } else if (event.failed) {
        hud.floatText(event.failed, 'bad');
      }
    }

    // Garage repair near the Midnight Garage.
    if (state.driveMode === 'car' && state.condition < 100) {
      const d = Math.hypot(player.pos.x - 20, player.pos.z - 96);
      if (d < 12) {
        state.condition = Math.min(100, state.condition + 25 * dt);
        if (state.condition >= 100) hud.floatText('CAR REPAIRED', 'good');
      }
    }

    // Autosave every 20 s.
    if (now - state.lastSaveAt > 20) {
      state.lastSaveAt = now;
      saveGame(snapshotForSave());
    }

    // Audio follows speed + wanted.
    audio.update(Math.abs(state.speed) * 3.6, police.wantedLevel(), state.driveMode === 'car');
  } else if (state.shotFrozen) {
    // Shot mode: the world breathes (rain, strobes, heli) but nothing drives.
    police.update(dt, t, player, null, true);
  }

  world.update(dt, t, player.pos);
  crowd.update(dt, now);
  updateCamera(dt, t);
  hud.update(hudSnapshot(police.wantedLevel()));
  renderer.render(scene, camera);
  input.endFrame();
  frame += 1;
  maybeShotReady();
}

function snapshotForSave() {
  return {
    money: state.money, respect: state.respect,
    jobIndex: state.jobIndex, stageIndex: missions.progress().stageIndex,
    radioIndex: state.radioIndex, garage: ['VULPINE S'],
    playerX: player.pos.x, playerZ: player.pos.z, playerHeading: state.heading,
    completedJobs: state.completedJobs,
  };
}

function maybeShotReady() {
  if (SHOT && !shotReadySent && frame >= 10) {
    shotReadySent = true;
    window.__SHOT_READY__ = true;
  }
}

// --- Shot presets (deterministic scenes for the dossier screenshots).
const gameAPI = {
  state, player, police, missions, hud, audio, heroCar, traffic, crowd,
  crewMembers, scene, camera, drivenCar: () => drivenCar,
  startPlaying() {
    if (state.mode === 'title') {
      state.mode = 'playing';
      titleScreen.style.display = 'none';
      hudRoot.style.display = 'block';
      input.clearPressed();
      missions.startJob(state.jobIndex);
    }
  },
  setHero(x, z, heading, speedKmh) {
    heroCar.position.set(x, 0, z);
    heroCar.rotation.y = heading;
    state.heading = heading;
    state.speed = speedKmh / 3.6;
    state.driveMode = 'car';
    drivenCar = heroCar;
  },
  setFixedCamera(x, y, z, lx, ly, lz) {
    state.cameraMode = 'fixed';
    state.fixedCam = { pos: new THREE.Vector3(x, y, z), look: new THREE.Vector3(lx, ly, lz) };
    camera.position.set(x, y, z);
    camera.lookAt(lx, ly, lz);
  },
  setMoney(n) { state.money = n; },
  setTime(day, minutes) { state.day = day; state.timeMin = minutes; },
  setMission(job, stage) {
    state.jobIndex = job;
    missions.setState(job, stage, state.completedJobs);
  },
  freezeShot() { state.shotFrozen = true; },
  placeOnFoot(x, z, heading) {
    state.driveMode = 'foot';
    rico.position.set(x, 0, z);
    rico.rotation.y = heading;
    rico.visible = true;
    state.heading = heading;
  },
  placeCrew(spots) {
    for (const [key, x, z, heading] of spots) {
      const p = crewMembers[key];
      if (!p) continue;
      p.position.set(x, 0, z);
      p.rotation.y = heading;
      p.visible = true;
    }
  },
  openMap() {
    state.mapOpen = true;
    hud.showMap(hudSnapshot(police.wantedLevel()));
    hudRoot.style.display = 'none';
  },
};

if (SHOT) {
  applyShot(SHOT, gameAPI);
}

// --- Playtest / debug API (used by the automated playtest, harmless in play).
window.__GAME = {
  get state() { return state.mode; },
  get driveMode() { return state.driveMode; },
  get speedKmh() { return Math.abs(state.speed) * 3.6; },
  get wanted() { return police.wantedLevel(); },
  get money() { return state.money; },
  get condition() { return state.condition; },
  get policeCount() { return police.cars.length; },
  get trafficCount() { return traffic.length; },
  get pedCount() { return crowd.peds.length; },
  get mission() { return missions.progress(); },
  get playerPos() { return { x: player.pos.x, z: player.pos.z }; },
  get carPos() { return { x: drivenCar.position.x, z: drivenCar.position.z }; },
  get heading() { return state.heading; },
  get frames() { return frame; },
  get mapOpen() { return state.mapOpen; },
  get radio() { return audio.currentStation().name; },
  get heliVisible() { return police.heli.visible; },
  get shotReady() { return !!window.__SHOT_READY__; },
  setWanted: (n) => police.setWanted(n),
  advanceMission: () => missions.advanceStage(),
  teleport: (x, z) => {
    if (state.driveMode === 'car') drivenCar.position.set(x, 0, z);
    else rico.position.set(x, 0, z);
  },
  save: () => saveGame(snapshotForSave()),
  start: () => { if (state.mode === 'title') startGame(); },
};

animate();
