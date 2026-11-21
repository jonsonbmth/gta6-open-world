// AURELIA BAY — main entry. Builds the golden-hour world, runs the game
// loop (driving, walking, police pursuit, missions, traffic, pedestrians),
// wires the HUD and the staged shots (?shot=chase|title|map|marina).
// Playable with keyboard + mouse; progress saves to localStorage.

import { buildSky } from './sky.js';
import { buildCity } from './city.js';
import { makeCar, makeHelicopter, aimSpotlight } from './vehicles.js';
import { makePerson, makeMarinaCrew, makePedestrians } from './people.js';
import {
  initPortraits, drawMinimap, drawBigMap, showPopup, updateHud, setDialog,
} from './hud.js';
import { setupShot } from './shots.js';
import { clamp } from './util.js';

const SAVE_KEY = 'aurelia-bay-save-v1';

const JOBS = [
  { name: 'FIRST LIGHT', desc: 'Pick up the Dorado GT from the docks.' },
  { name: 'SALT AIR', desc: 'Outrun the harbour patrol on Ember Strand.' },
  { name: 'VELVET ROPE', desc: 'Drive Vera to the Coral Market meet.' },
  { name: 'HIGH TIDE', desc: 'Lose the ABPD after the warehouse job.' },
  { name: 'PALM READER', desc: 'Swap plates at the Neon Palm Motel.' },
  { name: 'GOLD RUSH', desc: 'Escort the convoy down Sunset Mile.' },
  { name: 'THE EMBER RUN', desc: 'Lose the heat, then bring the car to the garage on Ember Strand.' },
  { name: 'THE VELVET HANDOVER', desc: 'Deliver the car to Vera at the Gilded Quay.' },
];

// ---------- renderer / scene ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.classList.add('webgl');
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(-6, 3.4, 28);

buildSky(scene, renderer);
const city = buildCity(scene);

// ---------- actors ----------
const hero = { group: makeCar({ color: 0xe07b26, hero: true }), speed: 0, heading: 0 };
hero.group.position.set(-1.0, 0, 14);
scene.add(hero.group);

const cruisers = [];
for (let i = 0; i < 4; i++) {
  const c = { group: makeCar({ police: true }), speed: 0, heading: 0, phase: i * 1.7 };
  scene.add(c.group);
  cruisers.push(c);
}

const heli = { group: makeHelicopter(), angle: 0.6 };
heli.group.position.set(16, 36, -2);
scene.add(heli.group);

const crew = makeMarinaCrew();
const crewHome = [
  { x: -57, z: 82.5, ry: Math.PI + 0.2 }, { x: -54, z: 82.0, ry: Math.PI - 0.1 },
  { x: -52.5, z: 84.0, ry: Math.PI + 0.35 }, { x: -59, z: 84.0, ry: Math.PI - 0.35 },
  { x: -56.5, z: 85.0, ry: Math.PI + 0.35 }, { x: -55, z: 84.5, ry: Math.PI + 0.5 },
];
crew.forEach((p, i) => {
  p.position.set(crewHome[i].x, 0, crewHome[i].z);
  p.rotation.y = crewHome[i].ry;
  scene.add(p);
});

const walker = {
  group: makePerson({
    name: 'Dante', activity: 'idle', skin: '#c98d5f', shirt: '#14324a',
    hairStyle: 'swept', hair: '#1c1210',
  }),
  heading: 0,
};
walker.group.visible = false;
scene.add(walker.group);

// Traffic: ambient cars on the boulevard lanes, kept clear of the chase zone.
const traffic = [];
const trafficCols = [0x3fae6a, 0x4a7fd0, 0xd9d9d9, 0x8a4fd0, 0xe8b93b, 0x2c3a4a, 0xc0c0c8, 0x7a4a22];
const trafficSpots = [
  { lane: 0, z: -70 }, { lane: 1, z: -110 }, { lane: 2, z: -60 }, { lane: 3, z: -95 },
  { lane: 0, z: 70 }, { lane: 1, z: 110 }, { lane: 2, z: 65 }, { lane: 3, z: 130 },
];
for (let i = 0; i < trafficSpots.length; i++) {
  const s = trafficSpots[i];
  const lane = city.lanes[s.lane];
  const car = makeCar({ color: trafficCols[i] });
  car.position.set(lane.x, 0, s.z);
  car.rotation.y = lane.dir > 0 ? Math.PI : 0;
  scene.add(car);
  traffic.push({ group: car, lane, speed: 9 + (i % 3) * 2 });
}

// Pedestrians on sidewalks and the beach; two panic near the chase road.
const peds = makePedestrians(16, 9917);
const pedSpots = [
  { x: -11.5, z: -40 }, { x: 11.5, z: -70 }, { x: -11.5, z: 60 }, { x: 11.5, z: 90 },
  { x: -11.5, z: -120 }, { x: 11.5, z: 130 }, { x: -36, z: -30 }, { x: -52, z: 20 },
  { x: -70, z: -90 }, { x: -44, z: 60 }, { x: -90, z: 40 }, { x: -30, z: 120 },
  { x: 11.5, z: -15 }, { x: -11.5, z: 45 }, { x: -60, z: -130 }, { x: -100, z: -40 },
];
peds.forEach((p, i) => {
  p.position.set(pedSpots[i].x, 0, pedSpots[i].z);
  p.rotation.y = (i % 2 === 0 ? 1 : -1) * (Math.PI / 2 + 0.3);
  p.userData.home = { x: pedSpots[i].x, z: pedSpots[i].z };
  p.userData.walkDir = i % 2 === 0 ? 1 : -1;
  scene.add(p);
});
const panickers = [];
for (const [px, pz, ry] of [[-10.5, 8, 0.8], [10.5, 30, -0.8]]) {
  const p = makePerson({ name: 'panic', activity: 'panic', shirt: '#e86a8a' });
  p.position.set(px, 0, pz);
  p.rotation.y = ry;
  scene.add(p);
  panickers.push(p);
}

// ---------- state ----------
const state = {
  money: 27850,
  wanted: 4,
  health: 78,
  armour: 61,
  rep: 2310,
  repMax: 2800,
  jobIndex: 6,
  stage: 3,
  stages: 4,
  timer: 192, // 03:12
  carCondition: 71,
  speedKmh: 0,
  clock: 'FRI 18:42',
  district: 'EMBER STRAND',
  street: 'Sunset Mile',
  driving: true,
  started: false,
  mapOpen: false,
  muted: false,
  mission: { x: -8, z: 130 },
  nearMissAt: 0,
  wantedQuiet: 0,
};

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money, wanted: state.wanted, health: state.health,
      armour: state.armour, rep: state.rep, jobIndex: state.jobIndex,
      x: hero.group.position.x, z: hero.group.position.z,
    }));
  } catch (e) { /* storage unavailable — play on */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    state.money = s.money;
    state.wanted = s.wanted;
    state.health = s.health;
    state.armour = s.armour;
    state.rep = s.rep;
    state.jobIndex = s.jobIndex;
    hero.group.position.set(s.x || -1, 0, s.z || 14);
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- HUD ----------
initPortraits();
const minimapEl = document.getElementById('minimap');
const bigMapEl = document.getElementById('big-map');

function hudState() {
  return {
    player: { x: hero.group.position.x, z: hero.group.position.z },
    heading: hero.heading,
    police: cruisers.map((c) => ({ x: c.group.position.x, z: c.group.position.z })),
    mission: state.mission,
    money: state.money,
    speedKmh: state.speedKmh,
    wanted: state.wanted,
    health: state.health,
    armour: state.armour,
    carCondition: state.carCondition,
    clock: state.clock,
    district: state.district,
    street: state.street,
  };
}

function refreshMaps() {
  drawMinimap(minimapEl, hudState());
  if (state.mapOpen) drawBigMap(bigMapEl, hudState());
}

// ---------- audio (synthesized, no files) ----------
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let radioOsc = null;
let radioGain = null;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain();
    master.gain.value = state.muted ? 0 : 0.5;
    master.connect(audioCtx.destination);
    audioCtx._master = master;
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(master);
    engineOsc.start();
    sirenOsc = audioCtx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 720;
    sirenGain = audioCtx.createGain();
    sirenGain.gain.value = 0.0;
    sirenOsc.connect(sirenGain).connect(master);
    sirenOsc.start();
    radioOsc = audioCtx.createOscillator();
    radioOsc.type = 'sine';
    radioOsc.frequency.value = 220;
    radioGain = audioCtx.createGain();
    radioGain.gain.value = 0.0;
    radioOsc.connect(radioGain).connect(master);
    radioOsc.start();
  } catch (e) { /* audio unavailable — play silent */ }
}

function updateAudio(t) {
  if (!audioCtx) return;
  const speedN = clamp(Math.abs(hero.speed) / 55, 0, 1);
  engineOsc.frequency.value = 50 + speedN * 130;
  engineGain.gain.value = state.driving && state.started ? 0.05 + speedN * 0.06 : 0.0;
  sirenOsc.frequency.value = 660 + (Math.sin(t * 4.2) > 0 ? 160 : 0);
  sirenGain.gain.value = state.wanted > 0 && state.started ? 0.028 : 0.0;
  // A slow golden-hour chord drift for the radio.
  const notes = [220, 277.2, 329.6, 261.6];
  radioOsc.frequency.value = notes[Math.floor(t / 2.4) % 4];
  radioGain.gain.value = state.started && !state.muted ? 0.02 : 0.0;
}

// ---------- input ----------
const keys = {};
let dragYaw = 0;
let dragPitch = 0;
let dragging = false;
let lastMouse = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'Escape') {
    if (state.mapOpen) toggleMap();
    document.getElementById('how-overlay').style.display = 'none';
  }
  if (e.code === 'KeyE' && state.started) toggleEnterExit();
  if (e.code === 'KeyR' && state.started) cycleRadio();
  if (e.code === 'KeyN') toggleMute();
  if (e.code === 'Digit1') selectWeapon(0);
  if (e.code === 'Digit2') selectWeapon(1);
  if (e.code === 'Digit3') selectWeapon(2);
  if (e.code === 'Digit4') selectWeapon(3);
  if (e.code === 'KeyZ') callCrew('Lena swaps the plates — heat drops a star.');
  if (e.code === 'KeyX') callCrew('Hugo patches the Dorado — condition restored.');
  if (e.code === 'KeyC') callCrew('Nina marks every unit on your map.');
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  dragYaw -= (e.clientX - lastMouse.x) * 0.005;
  dragPitch = clamp(dragPitch + (e.clientY - lastMouse.y) * 0.003, -0.25, 0.45);
  lastMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => { dragging = false; });

const RADIOS = [
  '♪ SOL FM 101.3 — “Golden Hour” — The Marigolds',
  '♪ EMBER FM 96.7 — “Sunset Static” — Low Tide Club',
  '♪ PALMA 88.2 — “Café con Leche” — Rosa Delgado',
];
let radioIdx = 0;
function cycleRadio() {
  radioIdx = (radioIdx + 1) % RADIOS.length;
  const el = document.getElementById('hud-radio');
  if (el) el.textContent = RADIOS[radioIdx];
}

function toggleMute() {
  state.muted = !state.muted;
  if (audioCtx) audioCtx._master.gain.value = state.muted ? 0 : 0.5;
  showPopup(state.muted ? 'MUTED' : 'SOUND ON', 1200);
}

function selectWeapon(i) {
  document.querySelectorAll('.weapon-slot').forEach((el, j) => {
    el.classList.toggle('active', i === j && !el.classList.contains('locked'));
  });
}

function callCrew(line) {
  if (!state.started) return;
  setDialog('CREW', line, 'lena');
  if (line.includes('heat drops')) state.wanted = Math.max(0, state.wanted - 1);
  if (line.includes('condition restored')) state.carCondition = 100;
}

function toggleMap() {
  state.mapOpen = !state.mapOpen;
  document.getElementById('map-overlay').style.display = state.mapOpen ? 'flex' : 'none';
  if (state.mapOpen) drawBigMap(bigMapEl, hudState());
}

function toggleEnterExit() {
  if (state.driving) {
    state.driving = false;
    walker.group.visible = true;
    walker.group.position.set(hero.group.position.x + 1.8, 0, hero.group.position.z + 1);
    walker.heading = hero.heading;
    walker.group.rotation.y = walker.heading;
    setDialog('DANTE “DUSK” REYES', 'On foot. Keep it low — the ABPD is still out there.', 'dante');
  } else {
    // Enter the nearest car (hero or traffic).
    let best = hero.group;
    let bestD = best.position.distanceTo(walker.group.position);
    for (const t of traffic) {
      const d = t.group.position.distanceTo(walker.group.position);
      if (d < bestD) { best = t.group; bestD = d; }
    }
    if (bestD < 6) {
      if (best !== hero.group) {
        // Steal it: it becomes the player car.
        const old = hero.group;
        hero.group = best;
        const idx = traffic.findIndex((t) => t.group === best);
        if (idx >= 0) traffic.splice(idx, 1);
        traffic.push({ group: old, lane: city.lanes[1], speed: 0 });
      }
      state.driving = true;
      walker.group.visible = false;
      showPopup('CAR JACKED', 1400);
    }
  }
}

// ---------- title buttons ----------
document.getElementById('btn-new').addEventListener('click', () => startGame(false));
document.getElementById('btn-continue').addEventListener('click', () => startGame(true));
document.getElementById('btn-how').addEventListener('click', () => {
  document.getElementById('how-overlay').style.display = 'flex';
});
document.getElementById('btn-how-close').addEventListener('click', () => {
  document.getElementById('how-overlay').style.display = 'none';
});

function startGame(load) {
  if (load) loadGame();
  else {
    state.money = 27850; state.wanted = 4; state.health = 78; state.armour = 61;
    state.rep = 2310; state.jobIndex = 6; state.stage = 3; state.timer = 192;
    state.carCondition = 71;
    hero.group.position.set(-1.0, 0, 14);
  }
  state.started = true;
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  // The title vista hid the pursuit — bring it back around the hero.
  const hx = hero.group.position.x;
  const hz = hero.group.position.z;
  const spots = [[-4.2, 4], [3.2, 5], [-3.6, -10], [5.8, -20]];
  cruisers.forEach((c, i) => {
    c.group.visible = true;
    c.group.position.set(hx + spots[i][0], 0, hz + spots[i][1]);
    c.heading = 0;
    c.speed = 10;
  });
  heli.group.visible = state.wanted >= 3;
  heli.group.position.set(hx + 16, 36, hz - 16);
  hero.heading = 0;
  hero.group.rotation.y = 0;
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  updateHud(hudState());
  refreshMaps();
  setDialog('VERA “THE VELVET” CASTILLO · FIXER',
    'Six units and a chopper, Dante — lose the blue lights or lose the car. The garage on Ember Strand is waiting.', 'vera');
}

// ---------- driving / walking ----------
function updateDriving(dt) {
  const accel = keys.KeyW ? 18 : 0;
  const brake = keys.KeyS ? 26 : 0;
  const handbrake = !!keys.Space;
  hero.speed += (accel - brake) * dt;
  if (!keys.KeyW && !keys.KeyS) hero.speed -= Math.sign(hero.speed) * 4 * dt;
  if (handbrake) hero.speed -= Math.sign(hero.speed) * 10 * dt;
  hero.speed = clamp(hero.speed, -12, 55);
  if (Math.abs(hero.speed) < 0.05 && !keys.KeyW) hero.speed = 0;

  const steerInput = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
  const steer = steerInput * clamp(Math.abs(hero.speed) / 12, 0, 1) * (handbrake ? 1.6 : 1.0);
  hero.heading += steer * dt * 1.35 * Math.sign(hero.speed || 1);
  const dx = -Math.sin(hero.heading) * hero.speed * dt;
  const dz = -Math.cos(hero.heading) * hero.speed * dt;
  hero.group.position.x = clamp(hero.group.position.x + dx, -150, 150);
  hero.group.position.z = clamp(hero.group.position.z + dz, -175, 175);
  hero.group.rotation.y = hero.heading;
  // Body lean into steering + squat under acceleration.
  hero.group.rotation.z = steerInput * clamp(Math.abs(hero.speed) / 55, 0, 1) * 0.06;
  hero.group.rotation.x = clamp(-accel * 0.0012 + brake * 0.001, -0.03, 0.03);
  // Wheels spin.
  for (const w of hero.group.userData.wheels) w.rotation.x -= (hero.speed * dt) / 0.38;
  state.speedKmh = Math.abs(hero.speed) * 3.6;

  // Drift popup.
  if (handbrake && Math.abs(hero.speed) > 10 && Math.random() < dt * 0.8) {
    showPopup('DRIFT x3<small>NEAR MISS +$250</small>', 1600);
    state.money += 25;
  }
  // Near miss: passing a traffic car close at speed.
  for (const t of traffic) {
    const d = t.group.position.distanceTo(hero.group.position);
    if (d < 3.2 && Math.abs(hero.speed) > 15 && performance.now() - state.nearMissAt > 4000) {
      state.nearMissAt = performance.now();
      state.money += 250;
      showPopup('NEAR MISS<small>+$250</small>', 1500);
    }
  }
  // Bumping traffic slows the player and dents the car.
  for (const t of traffic) {
    const d = t.group.position.distanceTo(hero.group.position);
    if (d < 2.6) {
      hero.speed *= 0.55;
      state.carCondition = Math.max(0, state.carCondition - 0.4);
      state.health = Math.max(0, state.health - 0.2);
    }
  }
}

function updateWalking(dt) {
  const run = keys.ShiftLeft || keys.ShiftRight;
  const speed = run ? 7 : 3.4;
  let mx = 0;
  let mz = 0;
  if (keys.KeyW) mz -= 1;
  if (keys.KeyS) mz += 1;
  if (keys.KeyA) mx -= 1;
  if (keys.KeyD) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;
    walker.heading = Math.atan2(-mx, -mz);
    walker.group.rotation.y = walker.heading;
    walker.group.position.x = clamp(walker.group.position.x + mx * speed * dt, -150, 150);
    walker.group.position.z = clamp(walker.group.position.z + mz * speed * dt, -175, 175);
    // Walk-cycle swing.
    const t = performance.now() / 90;
    walker.group.userData.legL.rotation.x = Math.sin(t) * 0.55;
    walker.group.userData.legR.rotation.x = -Math.sin(t) * 0.55;
    walker.group.userData.armL.rotation.x = -Math.sin(t) * 0.4;
    walker.group.userData.armR.rotation.x = Math.sin(t) * 0.4;
    state.speedKmh = speed * 3.6;
  } else {
    walker.group.userData.legL.rotation.x *= 0.8;
    walker.group.userData.legR.rotation.x *= 0.8;
    state.speedKmh = 0;
  }
}

// ---------- police / heli ----------
function updatePolice(dt, t) {
  const playerPos = hero.group.position;
  const wanted = state.wanted;
  cruisers.forEach((c, i) => {
    const g = c.group;
    if (wanted === 0) {
      // Patrol: cruise down the boulevard and leave.
      g.position.z -= 8 * dt;
      if (g.position.z < -170) g.position.z = 170;
      g.rotation.y = 0;
      return;
    }
    // Pursue: steer toward a point offset from the player.
    const offsets = [[-4, 8], [4, 10], [-5, -6], [5, -4]];
    const [ox, oz] = offsets[i];
    const tx = playerPos.x + ox;
    const tz = playerPos.z + oz;
    const dx = tx - g.position.x;
    const dz = tz - g.position.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(-dx, -dz);
    let dh = targetHeading - c.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
    const targetSpeed = dist > 30 ? 46 : dist > 8 ? 34 : 20;
    c.speed += clamp(targetSpeed - c.speed, -20 * dt, 12 * dt);
    g.position.x += -Math.sin(c.heading) * c.speed * dt;
    g.position.z += -Math.cos(c.heading) * c.speed * dt;
    g.position.x = clamp(g.position.x, -150, 150);
    g.position.z = clamp(g.position.z, -175, 175);
    g.rotation.y = c.heading;
    for (const w of g.userData.wheels) w.rotation.x -= (c.speed * dt) / 0.38;
    // Ramming nudge when close.
    if (dist < 4 && Math.abs(hero.speed) > 5) {
      state.carCondition = Math.max(0, state.carCondition - 0.15);
    }
    // Light bar strobe (alternate red/blue).
    const lb = g.userData.lightBar;
    if (lb) {
      const on = Math.sin(t * 9 + c.phase) > 0;
      lb.redMat.emissiveIntensity = on ? 3.2 : 0.4;
      lb.blueMat.emissiveIntensity = on ? 0.4 : 3.2;
      lb.redGlow.material.opacity = on ? 0.9 : 0.15;
      lb.blueGlow.material.opacity = on ? 0.15 : 0.9;
    }
  });

  // Helicopter orbits the player; spotlight tracks the hero car.
  // In shot mode (dt === 0) the heli keeps its staged position — only the
  // aim and the rotors keep running.
  if (wanted >= 3) {
    heli.group.visible = true;
    if (dt > 0) {
      heli.angle += dt * 0.14;
      const hx = playerPos.x + Math.cos(heli.angle) * 20;
      const hz = playerPos.z + Math.sin(heli.angle) * 20 - 8;
      heli.group.position.x += (hx - heli.group.position.x) * Math.min(1, dt * 1.2);
      heli.group.position.z += (hz - heli.group.position.z) * Math.min(1, dt * 1.2);
      heli.group.position.y = 36 + Math.sin(t * 0.5) * 1.5;
    }
    heli.group.rotation.y = Math.atan2(
      playerPos.x - heli.group.position.x,
      playerPos.z - heli.group.position.z,
    ) + Math.PI;
    heli.group.rotation.z = 0.06;
    aimSpotlight(heli.group, new THREE.Vector3(playerPos.x, 0, playerPos.z));
  } else {
    heli.group.visible = false;
  }
  heli.group.userData.rotor.rotation.y += dt * 22;
  heli.group.userData.tailRotor.rotation.z += dt * 30;
}

// ---------- traffic / peds ----------
function updateTraffic(dt) {
  for (const t of traffic) {
    t.group.position.z += t.lane.dir * t.speed * dt;
    if (t.group.position.z > t.lane.max) t.group.position.z = t.lane.min;
    if (t.group.position.z < t.lane.min) t.group.position.z = t.lane.max;
    for (const w of t.group.userData.wheels) w.rotation.x -= (t.speed * dt) / 0.38;
  }
}

function updatePeds(dt, t) {
  for (const p of peds) {
    const home = p.userData.home;
    const range = 14;
    p.position.z += p.userData.walkDir * 1.1 * dt;
    if (p.position.z > home.z + range) p.userData.walkDir = -1;
    if (p.position.z < home.z - range) p.userData.walkDir = 1;
    p.rotation.y = p.userData.walkDir > 0 ? Math.PI : 0;
    const s = Math.sin(t * 4 + home.x);
    p.userData.legL.rotation.x = s * 0.4;
    p.userData.legR.rotation.x = -s * 0.4;
    // Flee the hero car when it bears down.
    const d = p.position.distanceTo(hero.group.position);
    if (d < 7 && Math.abs(hero.speed) > 8) {
      p.position.x += Math.sign(p.position.x - hero.group.position.x) * 4 * dt;
      p.userData.armL.rotation.z = 2.4;
      p.userData.armR.rotation.z = -2.4;
    }
  }
  // The waving crewman waves; the talkers gesture.
  const tomas = crew[1];
  tomas.userData.armR.rotation.x = -0.15 + Math.sin(t * 5) * 0.25;
  const dario = crew[3];
  dario.userData.armR.rotation.x = -1.0 + Math.sin(t * 1.8) * 0.25;
}

// ---------- missions / timer ----------
function updateMission(dt) {
  if (!state.started) return;
  state.timer = Math.max(0, state.timer - dt);
  const mm = String(Math.floor(state.timer / 60)).padStart(2, '0');
  const ss = String(Math.floor(state.timer % 60)).padStart(2, '0');
  const timerEl = document.getElementById('hud-mission-timer');
  if (timerEl) {
    timerEl.innerHTML = `&#9202; ${mm}:${ss} — reach the garage in time`;
  }
  if (state.timer === 0 && state.wanted < 5) {
    state.wanted = 5;
    setDialog('ABPD DISPATCH', 'All units: roadblocks are up. Box him in on Sunset Mile.', 'vera');
    state.timer = 120;
  }
  // Wanted decays when no unit is near.
  const nearest = Math.min(...cruisers.map((c) => c.group.position.distanceTo(hero.group.position)));
  if (nearest > 30 && state.wanted > 0) {
    state.wantedQuiet += dt;
    if (state.wantedQuiet > 10) {
      state.wantedQuiet = 0;
      state.wanted -= 1;
      setDialog('ABPD DISPATCH', 'Lost visual. Dropping a star — keep it quiet, Dante.', 'vera');
    }
  } else {
    state.wantedQuiet = 0;
  }
  // Garage arrival completes the job.
  const gd = Math.hypot(
    hero.group.position.x - state.mission.x,
    hero.group.position.z - state.mission.z,
  );
  if (gd < 9 && state.wanted === 0 && state.jobIndex < JOBS.length - 1) {
    state.jobIndex += 1;
    state.stage = 1;
    state.money += 5000;
    state.rep = Math.min(state.repMax, state.rep + 320);
    state.timer = 240;
    const job = JOBS[state.jobIndex];
    document.querySelector('#hud-mission .job').textContent = `JOB ${state.jobIndex + 1}/8 · ${job.name}`;
    document.getElementById('hud-mission-title').textContent = job.name;
    document.getElementById('hud-mission-sub').textContent = job.desc;
    showPopup('JOB COMPLETE<small>+$5,000 &middot; REP +320</small>', 2600);
    setDialog('VERA “THE VELVET” CASTILLO · FIXER',
      'Beautiful work. Next job is on the board — the night is still young.', 'vera');
    saveGame();
  }
  // District by position.
  const { x, z } = hero.group.position;
  if (x < -30) { state.district = 'EMBER STRAND'; state.street = 'Shoreline Walk'; }
  else if (z > 70 && x < 0) { state.district = 'GILDED QUAY'; state.street = 'Harbour Road'; }
  else if (x > 90) { state.district = 'EMBER HEIGHTS'; state.street = 'Palma Row'; }
  else { state.district = 'EMBER STRAND'; state.street = 'Sunset Mile'; }
}

// ---------- camera ----------
function updateCamera(dt) {
  if (state.mapOpen) return;
  const target = state.driving ? hero.group.position : walker.group.position;
  const heading = state.driving ? hero.heading : walker.heading;
  const back = state.driving ? 8.5 : 5.5;
  const up = state.driving ? 3.4 : 2.6;
  const yaw = heading + dragYaw;
  const cx = target.x + Math.sin(yaw) * back;
  const cz = target.z + Math.cos(yaw) * back;
  const cy = up + dragPitch * 4;
  camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 5);
  camera.position.y += (cy - camera.position.y) * Math.min(1, dt * 5);
  camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 5);
  camera.lookAt(target.x - Math.sin(heading) * 6, 1.2, target.z - Math.cos(heading) * 6);
}

// ---------- shot routing ----------
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const world = { camera, hero, cruisers, heli, crew, traffic, city };

window.__game = {
  get playerCar() { return hero; },
  get walker() { return walker; },
  get driving() { return state.driving; },
  get time() { return gameTime; },
  get playerSpeed() { return hero.speed; },
  state,
  world,
};
let gameTime = 0;

if (shot) {
  // Staged screenshot mode. The title shot keeps the title screen over
  // the vista (HUD hidden); every other shot hides the menu and shows HUD.
  if (shot === 'title') {
    document.getElementById('title-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
  } else {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
  }
  state.started = true;
  // The marina shot is on foot at the quay — no driving speed.
  state.speedKmh = shot === 'marina' ? 0 : 118;
  updateHud(hudState());
  setupShot(shot, world);
  if (shot === 'chase' || shot === 'map') {
    // Heli spotlight on the hero for the cover frame.
    aimSpotlight(heli.group, new THREE.Vector3(hero.group.position.x, 0, hero.group.position.z));
  }
  if (shot === 'chase') {
    showPopup('DRIFT x3<small>NEAR MISS +$250</small>', 60000);
  }
  if (shot === 'map') {
    state.mapOpen = true;
    document.getElementById('map-overlay').style.display = 'flex';
    drawBigMap(bigMapEl, hudState());
  }
  refreshMaps();
} else {
  // Play mode: title vista behind the menu.
  setupShot('title', world);
}

// ---------- main loop ----------
const clock = new THREE.Clock();
let mapTick = 0;
let firstFrame = true;

function animate() {
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.1); // SwiftShader-proof: time-based motion
  gameTime += dt;
  const t = gameTime;

  city.update(t);
  if (state.started && !shot) {
    if (state.driving) updateDriving(dt);
    else updateWalking(dt);
    updatePolice(dt, t);
    updateMission(dt);
    updateCamera(dt);
    mapTick += dt;
    if (mapTick > 0.25) {
      mapTick = 0;
      updateHud(hudState());
      refreshMaps();
      saveGame();
    }
  } else if (shot === 'chase' || shot === 'map') {
    // Keep the chase alive behind the screenshot: rotors, strobes, flicker.
    updatePolice(0, t);
  }
  if (!shot) updateTraffic(dt);
  updatePeds(dt, t);
  updateAudio(t);

  renderer.render(scene, camera);
  // Renderer diagnostics for the scorecard: draw calls + triangles from
  // the frame just rendered, so the playtest can cite measured evidence.
  if (window.__shotInfo) {
    const ri = renderer.info;
    window.__shotInfo.renderer = {
      calls: ri.render.calls,
      triangles: ri.render.triangles,
      geometries: ri.memory.geometries,
      textures: ri.memory.textures,
    };
  }
  if (firstFrame) {
    firstFrame = false;
    window.__ready = true;
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
