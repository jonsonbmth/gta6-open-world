// SOLMAR BAY — main loop: bootstrap, input, camera, combat, car entry,
// missions, police, HUD, audio. Night-rain open-world crime game.
import * as THREE from 'three';
import { S, SHOT, CITY, clamp, lerp, TAU, WEAPONS, STATIONS } from './state.js';
import { buildCity, updateCity } from './city.js';
import { makeCar, driveCar, spawnTraffic, updateTraffic, spawnParked, trafficCars } from './vehicles.js';
import { spawnPlayer, movePlayer, spawnPeds, updatePeds, player, peds } from './people.js';
import { updatePolice, addWanted, checkBusted, units } from './police.js';
import { updateMission, currentJob, currentStage, stageSay, jobDone } from './missions.js';
import { initHUD, setMode, showDialogue, floatText, toast, updateHUD, drawBigMap, renderGarage, showEnd } from './hud.js';
import { initAudio, setEngine, setSiren, sfx, startRadio } from './audio.js';
import { hasSave, saveGame, loadGame, clearSave } from './save.js';
import { stageShot } from './shots.js';

// ---- renderer / scene / camera ----
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(-8, 4, 60);

buildCity(scene);
initHUD();
spawnTraffic(scene, 14);
const parkedCars = spawnParked(scene);
spawnPeds(scene, 26);
spawnPlayer(scene, S.player.x, S.player.z, S.player.heading);

// The hero car: red Vulpine S, parked beside Rico at the start.
const heroCar = makeCar(scene, 'sports', 2.5, 36.5, 0.15);
heroCar.isPlayer = true;
let currentCar = null; // the car Rico is driving (hero or stolen)
const shotTraffic = [];

// ---- input ----
const input = { up: false, down: false, left: false, right: false, handbrake: false, sprint: false };
const keys = {};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  initAudio();
  if (e.code === 'Enter' && S.mode === 'title') startGame();
  if (S.mode === 'playing') {
    if (e.code === 'KeyE') toggleCar();
    if (e.code === 'KeyM') openMap();
    if (e.code === 'KeyP' || e.code === 'Escape') setMode('paused');
    if (e.code === 'KeyR') cycleRadio();
    if (e.code === 'KeyG') tryGarage();
    if (e.code === 'KeyF') punch();
    if (e.code.startsWith('Digit')) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= 5) { S.weapon = n - 1; toast(WEAPONS[S.weapon].name + ' EQUIPPED', 1.2); }
    }
  } else if (S.mode === 'paused') {
    if (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Enter') setMode('playing');
    if (e.code === 'KeyM') openMap();
  } else if (S.mode === 'map') {
    if (e.code === 'KeyM' || e.code === 'Escape') setMode('playing');
  } else if (S.mode === 'garage') {
    if (e.code === 'KeyG' || e.code === 'Escape') setMode('playing');
  } else if ((S.mode === 'busted' || S.mode === 'wasted') && e.code === 'Enter') retry();
  updateInputFlags();
});
addEventListener('keyup', (e) => { keys[e.code] = false; updateInputFlags(); });
function updateInputFlags() {
  input.up = !!(keys.KeyW || keys.ArrowUp);
  input.down = !!(keys.KeyS || keys.ArrowDown);
  input.left = !!(keys.KeyA || keys.ArrowLeft);
  input.right = !!(keys.KeyD || keys.ArrowRight);
  input.handbrake = !!keys.Space;
  input.sprint = !!keys.ShiftLeft;
}
canvas.addEventListener('mousedown', () => { initAudio(); if (S.mode === 'playing' && !S.inCar) shoot(); });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- menu buttons ----
document.getElementById('pm-resume').addEventListener('click', () => setMode('playing'));
document.getElementById('pm-save').addEventListener('click', () => { saveGame(); toast('GAME SAVED'); setMode('playing'); });
document.getElementById('pm-map').addEventListener('click', openMap);
document.getElementById('pm-restart').addEventListener('click', () => { clearSave(); location.reload(); });
document.getElementById('end-retry').addEventListener('click', retry);

// ---- flow ----
function startGame() {
  initAudio(); startRadio();
  if (hasSave() && !SHOT) {
    loadGame();
    player.x = S.player.x; player.z = S.player.z;
    player.mesh.position.set(player.x, 0, player.z);
    toast('SAVE LOADED — WELCOME BACK, RICO');
  }
  setMode('playing');
  const say = stageSay();
  if (say) showDialogue(say[0], say[1], 5);
  document.getElementById('pm-stats').textContent =
    `DAY ${S.day} · $${S.money.toLocaleString('en-US')} · REP ${S.rep} · JOB ${Math.min(S.mission + 1, 7)}/7`;
}

function retry() {
  S.health = 100; S.armour = 0; S.wanted = 0;
  S.money = Math.max(0, S.money - 500);
  player.x = CITY.safehouse.x; player.z = CITY.safehouse.z;
  player.mesh.position.set(player.x, 0, player.z);
  if (currentCar) { currentCar = null; S.inCar = false; }
  setMode('playing');
  toast('BACK ON YOUR FEET — $500 BAIL PAID');
}

function openMap() { drawBigMap(S.inCar ? currentCar.x : player.x, S.inCar ? currentCar.z : player.z); setMode('map'); }
function cycleRadio() { S.radio = (S.radio + 1) % STATIONS.length; toast(STATIONS[S.radio].name + ' — ' + STATIONS[S.radio].song, 2); }

function tryGarage() {
  const px = S.inCar ? currentCar.x : player.x, pz = S.inCar ? currentCar.z : player.z;
  const d2 = (px - CITY.garage.x) ** 2 + (pz - CITY.garage.z) ** 2;
  if (d2 > 20 * 20) { toast('GET CLOSER TO LENA\'S GARAGE', 1.5); return; }
  if (!S.inCar) { toast('BRING A CAR INTO THE GARAGE', 1.5); return; }
  renderGarage(currentCar, buyUpgrade);
  setMode('garage');
}
function buyUpgrade(id) {
  const car = currentCar; if (!car) return;
  const prices = { engine: 1500, armour: 1200, repair: 400, paint: 600, clean: 800 };
  const price = prices[id];
  if (S.money < price) { toast('NOT ENOUGH CASH', 1.5); return; }
  S.money -= price; sfx('cash');
  if (id === 'engine') car.engine++;
  if (id === 'armour') car.armour++;
  if (id === 'repair') car.condition = 100;
  if (id === 'paint') { car.mesh.children[0].material.color.set(0x0d1b4c); toast('MIDNIGHT BLUE — NICE'); }
  if (id === 'clean') { S.wanted = 0; toast('FAKE PLATES FITTED — HEAT OFF'); }
  renderGarage(car, buyUpgrade);
}

// ---- cars: enter / exit / steal ----
function nearestCar(x, z, maxD) {
  let best = null, bd = maxD * maxD;
  const all = [heroCar, ...parkedCars, ...trafficCars];
  for (const c of all) {
    if (c === currentCar) continue;
    const d2 = (c.x - x) ** 2 + (c.z - z) ** 2;
    if (d2 < bd) { bd = d2; best = c; }
  }
  return best;
}
function enterCar(car) {
  currentCar = car; S.inCar = true; S.car = car;
  player.mesh.visible = false;
  sfx('enter');
  const ti = trafficCars.indexOf(car);
  if (ti >= 0) trafficCars.splice(ti, 1); // stolen from traffic
  if (car !== heroCar) {
    addWanted(1, 'theft');
    toast('CAR STOLEN — THE HEAT IS ON', 2);
  }
  if (!SHOT) toast(car.spec.name + ' — YOURS NOW', 1.2);
}
function exitCar() {
  if (!currentCar) return;
  const c = currentCar;
  player.x = c.x + 2.2; player.z = c.z + 1;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  currentCar = null; S.inCar = false; S.car = null;
  sfx('enter');
}
function toggleCar() {
  if (S.inCar) { if (Math.abs(currentCar.speed) < 2) exitCar(); }
  else {
    const car = nearestCar(player.x, player.z, 5.5);
    if (car) enterCar(car); else toast('NO CAR NEARBY', 1.2);
  }
}

// ---- combat ----
function shoot() {
  const w = WEAPONS[S.weapon];
  if (S.weapon === 0) { punch(); return; }
  if (S.ammo[S.weapon] <= 0) { toast('OUT OF AMMO', 1.2); return; }
  S.ammo[S.weapon]--;
  sfx('shot');
  // hitscan: nearest ped or car in front cone
  const fx = -Math.sin(player.heading), fz = -Math.cos(player.heading);
  let best = null, bd = w.range;
  for (const p of peds) {
    const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.86) { bd = d; best = { kind: 'ped', p }; }
  }
  for (const c of [heroCar, ...parkedCars, ...trafficCars, ...units]) {
    const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.9) { bd = d; best = { kind: 'car', c }; }
  }
  if (best) {
    if (best.kind === 'ped') {
      best.p.mesh.rotation.x = -Math.PI / 2; best.p.state = 'down';
      setTimeout(() => { const i = peds.indexOf(best.p); if (i >= 0) { scene.remove(best.p.mesh); peds.splice(i, 1); } }, 2500);
      addWanted(1, 'assault'); S.kills++;
      floatText('TARGET DOWN');
    } else {
      best.c.condition -= w.dmg;
      addWanted(1, 'shooting');
      if (best.c.condition <= 0) { best.c.speed = 0; toast('VEHICLE DISABLED'); }
    }
  }
}
function punch() {
  sfx('punch');
  let best = null, bd = 2.4;
  for (const p of peds) {
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d < bd) { bd = d; best = p; }
  }
  if (best) {
    best.mesh.rotation.x = -Math.PI / 2; best.state = 'down';
    setTimeout(() => { const i = peds.indexOf(best); if (i >= 0) { scene.remove(best.mesh); peds.splice(i, 1); } }, 2500);
    addWanted(1, 'assault');
    floatText('KNOCKED OUT');
  }
}

// ---- camera ----
const camPos = new THREE.Vector3(-8, 4, 60);
const camLook = new THREE.Vector3(0, 2, 0);
let titleT = 0;
function updateCamera(dt, t) {
  if (S.mode === 'title' && !SHOT) {
    // slow cinematic pan down the avenue
    titleT += dt * 0.05;
    const z = 120 - (titleT % 1) * 220;
    camPos.set(-12 + Math.sin(titleT * 6) * 3, 3.4, z);
    camera.position.copy(camPos);
    camera.lookAt(0, 7, z - 90);
    return;
  }
  if (SHOT === 'title' || SHOT === 'map' || W.staticCam) return; // staged cameras stay put
  const px = S.inCar ? currentCar.x : player.x;
  const pz = S.inCar ? currentCar.z : player.z;
  const heading = S.inCar ? currentCar.heading : player.heading;
  const speedKmh = S.inCar ? Math.abs(currentCar.speed) * 3.6 : player.speed * 3.6;
  let dist, height, lookAhead;
  if (S.inCar) { dist = 4.6; height = 2.1; lookAhead = 7; } // LOW + CLOSE chase cam
  else { dist = 5.4; height = 3.1; lookAhead = 4; }
  const bx = px + Math.sin(heading) * dist + Math.cos(heading) * 0.9;
  const bz = pz + Math.cos(heading) * dist - Math.sin(heading) * 0.9;
  const k = W.snapCam ? 1 : 1 - Math.exp(-6 * dt);
  if (W.snapCam) W.snapCam = false;
  camPos.x = lerp(camPos.x, bx, k);
  camPos.y = lerp(camPos.y, height, k);
  camPos.z = lerp(camPos.z, bz, k);
  camera.position.copy(camPos);
  camLook.set(px - Math.sin(heading) * lookAhead, 1.4, pz - Math.cos(heading) * lookAhead);
  camera.lookAt(camLook);
  camera.fov = lerp(camera.fov, 62 + clamp(speedKmh / 220, 0, 1) * 5, 1 - Math.exp(-3 * dt));
  camera.updateProjectionMatrix();
}

// ---- near-miss + drift rewards (floating action text) ----
let nearMissCd = 0, driftShown = 0;
function checkNearMiss(car, dt) {
  nearMissCd = Math.max(0, nearMissCd - dt);
  const spd = Math.abs(car.speed) * 3.6;
  if (spd < 60 || nearMissCd > 0) return;
  for (const o of [...trafficCars, ...parkedCars]) {
    const d = Math.hypot(o.x - car.x, o.z - car.z);
    if (d < 3.4 && d > 2.2) {
      nearMissCd = 2.5;
      S.money += 250; S.rep += 5; S.nearMisses++;
      floatText('NEAR MISS  +$250');
      return;
    }
  }
  // sustained drift earns its own callout
  if (S.drifts > 1.2 && tNow() - driftShown > 6) {
    driftShown = tNow();
    S.money += 150; S.rep += 8;
    floatText('DRIFT x3  +$150', true);
    S.drifts = 0;
  }
}
function tNow() { return performance.now() / 1000; }

// ---- main loop ----
const clock = new THREE.Clock();
let shot = null;
const W = {
  scene, camera, renderer, heroCar, player,
  enterCar, exitCar, shotDrive: false, shotTraffic, snapCam: false, staticCam: false,
};
shot = stageShot(W);
if (SHOT === 'title') { /* title screen shows over the staged view */ }
if (hasSave() && !SHOT) {
  const el = document.getElementById('ts-save');
  if (el) el.textContent = 'SAVE FOUND — PRESS ENTER TO CONTINUE YOUR STORY';
}

// debug hook for the playtest harness (harmless in the shipped game)
window.__dbg = () => ({
  cam: camera.position.toArray().map((v) => +v.toFixed(1)),
  look: camLook.toArray().map((v) => +v.toFixed(1)),
  px: +player.x.toFixed(1), pz: +player.z.toFixed(1), heading: +player.heading.toFixed(2),
  mode: S.mode, inCar: S.inCar,
});

let lastWantedPunch = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.08);
  const t = clock.elapsedTime;

  if (S.mode === 'playing') {
    S.time += dt * 0.004;
    if (S.time >= 24) { S.time -= 24; S.day++; }

    const effInput = { ...input };
    if (W.shotDrive) { effInput.up = true; }

    if (S.inCar && currentCar) {
      const r = driveCar(currentCar, effInput, dt);
      S.speedKmh = r.speedKmh;
      if (r.drifting) S.drifts += dt;
      // near miss + drift detection lives in the revision pass (see below)
      checkNearMiss(currentCar, dt);
      // crash into things raises heat
      if (currentCar.condition < 100 && t - lastWantedPunch > 8 && S.wanted < 5) {
        addWanted(1, 'reckless'); lastWantedPunch = t;
      }
      if (currentCar.condition <= 0) { exitCar(); toast('CAR WRECKED — FIND ANOTHER RIDE'); }
      // running over a ped
      for (const p of [...peds]) {
        if (p.state === 'down') continue;
        if (Math.hypot(p.x - currentCar.x, p.z - currentCar.z) < 2 && Math.abs(currentCar.speed) > 6) {
          p.mesh.rotation.x = -Math.PI / 2; p.state = 'down';
          setTimeout(() => { const i = peds.indexOf(p); if (i >= 0) { scene.remove(p.mesh); peds.splice(i, 1); } }, 2500);
          addWanted(1, 'hit-and-run'); sfx('crash');
        }
      }
      S.player.x = currentCar.x; S.player.z = currentCar.z;
    } else {
      movePlayer(effInput, dt, camera.rotation.y + Math.PI);
      S.speedKmh = player.speed * 3.6;
      S.player.x = player.x; S.player.z = player.z;
    }

    updateTraffic(dt, S.inCar ? currentCar : null);
    for (const c of shotTraffic) { c.z -= c.speed * dt; c.mesh.position.set(c.x, 0, c.z); }
    const danger = S.inCar && Math.abs(currentCar.speed) > 12
      ? { x: currentCar.x, z: currentCar.z, radius: 14 } : null;
    updatePeds(dt, danger);
    updatePolice(scene, dt, S.player.x, S.player.z, S.inCar ? Math.abs(currentCar.speed) : player.speed, S.inCar ? currentCar.heading : player.heading);

    // missions
    const ev = updateMission(S.player.x, S.player.z, S.inCar);
    if (ev) {
      if (ev.type === 'stage') { if (ev.say) showDialogue(ev.say[0], ev.say[1], 5); floatText('STAGE CLEAR', true); }
      if (ev.type === 'jobDone') {
        sfx('cash'); saveGame();
        floatText(`JOB DONE  +$${ev.pay.toLocaleString('en-US')}`, true);
        toast('NEXT JOB: ' + ev.next);
        const say = stageSay(); if (say) showDialogue(say[0], say[1], 5);
      }
      if (ev.type === 'allDone') { sfx('cash'); saveGame(); floatText('SOLMAR BAY COMPLETE', true); }
      if (ev.type === 'hint') toast(ev.text, 1.5);
    }

    // busted / wasted
    if (checkBusted(S.inCar ? Math.abs(currentCar.speed) : player.speed, S.inCar)) {
      setMode('busted'); showEnd('BUSTED', 'The SBPD caught up with Rico. Bail: $500. The Comet stays impounded — for now.');
    }
    if (S.health <= 0) { setMode('wasted'); showEnd('WASTED', 'Rico went down in the rain. The city keeps moving without him.'); }

    // audio
    setEngine(S.inCar ? clamp(Math.abs(currentCar.speed) / 60, 0, 1) : 0, S.inCar);
    const nearUnit = units.length ? Math.min(...units.map(u => u.dist || 999)) : 999;
    setSiren(S.wanted > 0 && units.length > 0, clamp(1 - nearUnit / 80, 0, 1));
  }

  updateCity(dt, t, camera.position.x, camera.position.z);
  updateCamera(dt, t);

  const px = S.inCar && currentCar ? currentCar.x : player.x;
  const pz = S.inCar && currentCar ? currentCar.z : player.z;
  const heading = S.inCar && currentCar ? currentCar.heading : player.heading;
  const carName = S.inCar && currentCar ? currentCar.spec.name : null;
  const cond = S.inCar && currentCar ? currentCar.condition : 100;
  if (S.mode === 'playing' || S.mode === 'garage') updateHUD(dt, px, pz, heading, S.speedKmh, carName, cond);

  renderer.render(scene, camera);
}
animate();
