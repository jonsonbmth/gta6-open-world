// Boot and the one loop: the world advances in fixed 1/60 s steps, the
// camera follows, the HUD updates, and the renderer paints. Screens: title,
// play, paused, map, garage and game over.
// ?seed=N fixes the city. ?shot=chase|start|map|foot (with &seed=N) stages
// that scene instead of running the loop, paints it and sets
// window.__shotReady for a screenshot.

import { STEP, PLACES, GARAGE_UPGRADES, RADIO } from './config.js';
import { createRandom } from './random.js';
import { createRenderer, THREE } from './render.js';
import { createCity } from './city.js';
import { createTraffic, createVehicle } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createPlayer } from './player.js';
import { createMissions } from './missions.js';
import { createCamera } from './camera.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const random = createRandom(seed);

const canvas = document.getElementById('scene');
const status = document.getElementById('status');
const r = createRenderer(canvas, random);
const city = createCity(r, random);
const audio = createAudio();
const hud = createHud();
const camera = createCamera(r.camera);
const traffic = createTraffic(r, city, random, 20);
const peds = createPedestrians(r, city, random, 34);
const police = createPolice(r, city, random, audio);
const player = createPlayer(r, city, audio, { x: PLACES.safehouse.x, z: PLACES.safehouse.z + 8 });
const missions = createMissions(r, city, random, hud, audio);

// Parked cars the player can take: by the safehouse, the casino, the beach.
const parkedCars = [
  createVehicle(r, city, 'sedan', PLACES.safehouse.x + 10, PLACES.safehouse.z + 8, 0, 0x2b6cb0, random),
  createVehicle(r, city, 'sports', PLACES.casino.x - 10, PLACES.casino.z + 10, Math.PI / 2, 0xe8e8e8, random),
  createVehicle(r, city, 'van', PLACES.beach.x + 14, PLACES.beach.z - 4, 0, 0x3f7a5a, random),
  createVehicle(r, city, 'sedan', PLACES.downtown.x - 12, PLACES.downtown.z + 12, Math.PI, 0xd9a441, random),
];
const jobCars = [];

const world = {
  r, city, player, traffic, peds, police, missions, hud, audio, camera, random, jobCars,
  shotMode: !!shotName,
  get vehicles() {
    return [...traffic.cars, ...missions.jobVehicles, ...jobCars, ...parkedCars];
  },
};
// Debug/verification handle (used by the screenshot probe scripts).
window.__world = world;

let screen = 'title';
let input = null;
let recentShotTimer = 0;
let overReason = 'wasted';
let pauseIndex = 0;
let garageIndex = 0;
let nearMissCd = 0;
let driftTimer = 0;
let dustTimer = 0;

// Dust puffs behind the rear wheels at speed — the motion cue.
const dustTex = (() => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const dustPool = [];
function spawnDust(x, z, dx, dz) {
  if (dustPool.length >= 36) return;
  const mat = new THREE.SpriteMaterial({ map: dustTex, color: 0xe8d9b8, transparent: true, opacity: 0.85, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.position.set(x, 0.9, z);
  s.scale.set(3.5, 3.5, 1);
  s.userData.life = 0.6;
  s.userData.dx = dx; // drift sideways as it ages, so the wake spreads out
  s.userData.dz = dz; // from behind the car instead of hiding under it
  r.scene.add(s);
  dustPool.push(s);
}
function updateDust(dt) {
  for (let i = dustPool.length - 1; i >= 0; i -= 1) {
    const s = dustPool[i];
    s.userData.life -= dt;
    if (s.userData.life <= 0) {
      r.scene.remove(s);
      s.material.dispose();
      dustPool.splice(i, 1);
      continue;
    }
    const k = 1 - s.userData.life / 0.6;
    s.material.opacity = 0.85 * (1 - k);
    const sc = 3.5 + k * 5;
    s.scale.set(sc, sc, 1);
    s.position.y = 0.9 + k * 2.4;
    s.position.x += s.userData.dx * 2.2 * dt;
    s.position.z += s.userData.dz * 2.2 * dt;
  }
}

const screens = {
  title: document.getElementById('title-screen'),
  pause: document.getElementById('pause-screen'),
  map: document.getElementById('map-screen'),
  over: document.getElementById('over-screen'),
  garage: document.getElementById('garage-screen'),
};

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    if (el) el.classList.toggle('show', key === name);
  }
  // The HUD belongs to gameplay only — the title and game-over screens
  // carry their own layout and the HUD would bleed through them.
  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.style.display = (name === 'title' || name === 'over') ? 'none' : 'block';
  // The overlay key is 'pause' but the game state is 'paused' — the frame
  // loop and the menu handler both check 'paused'.
  screen = name === 'pause' ? 'paused' : name;
}

function announce(message) {
  status.textContent = message;
}

function doSave() {
  const ok = saveGame({ player, missions, station: audio.station() });
  hud.say('SOLMAR BAY', ok ? 'Game saved.' : 'Save failed — storage unavailable.', 3);
}

function startNewGame() {
  audio.unlock();
  audio.radio(true);
  missions.startJob(0);
  showScreen(null);
  screen = 'play';
  announce('Playing. Job 1: Harbor Lights.');
}

function continueGame() {
  const data = loadGame();
  audio.unlock();
  audio.radio(true);
  if (data) {
    player.addMoney(data.money - player.money);
    player.addRep(data.rep - player.rep);
    for (const [id, on] of Object.entries(data.upgrades ?? {})) if (on) player.applyUpgrade(id);
    player.heal(data.health - player.health);
    player.teleport(data.x, data.z, 0);
    missions.setProgress(data.jobIndex, data.completed);
    if (data.jobIndex < 7) missions.startJob(data.jobIndex);
  } else {
    missions.startJob(0);
  }
  showScreen(null);
  screen = 'play';
  announce('Playing. Welcome back to Solmar Bay.');
}

function gameOver(reason) {
  overReason = reason;
  const title = document.getElementById('over-title');
  const text = document.getElementById('over-text');
  if (reason === 'busted') {
    title.textContent = 'BUSTED';
    text.textContent = 'The SBPD caught up with Rico. $500 bail, and the heat is off — for now.';
  } else {
    title.textContent = 'WASTED';
    text.textContent = 'Rico was taken down. The city keeps moving without you.';
  }
  audio.radio(false);
  showScreen('over');
}

function respawn() {
  player.addMoney(-500);
  player.revive({ x: PLACES.safehouse.x, z: PLACES.safehouse.z + 8 });
  police.clearWanted();
  police.resetBusted();
  audio.radio(true);
  showScreen(null);
  screen = 'play';
  announce('Back on the street.');
}

function openGarage() {
  garageIndex = 0;
  renderGarage();
  showScreen('garage');
}

function renderGarage() {
  const list = document.getElementById('garage-list');
  const rows = GARAGE_UPGRADES.map((u, i) => {
    const owned = player.upgrades[u.id];
    const cls = i === garageIndex ? 'sel' : '';
    const price = owned ? 'OWNED' : `$${u.cost.toLocaleString()}`;
    return `<div class="${cls}" data-i="${i}">${u.name} — ${u.desc} · ${price}</div>`;
  });
  rows.push(`<div class="${garageIndex === GARAGE_UPGRADES.length ? 'sel' : ''}" data-i="${GARAGE_UPGRADES.length}">Full Service — repair + clear wanted · $200</div>`);
  list.innerHTML = rows.join('');
  document.getElementById('garage-money').textContent = `Cash: $${player.money.toLocaleString()}`;
}

function buyGarageItem() {
  if (garageIndex < GARAGE_UPGRADES.length) {
    const u = GARAGE_UPGRADES[garageIndex];
    if (player.upgrades[u.id]) return;
    if (player.money < u.cost) {
      hud.say('LENA', 'Not enough cash, Rico. Jobs pay. Go earn it.', 3);
      return;
    }
    player.addMoney(-u.cost);
    player.applyUpgrade(u.id);
    if (u.id === 'paint') police.clearWanted();
    audio.pickup();
    hud.say('LENA', `${u.name} installed. She purrs now.`, 3);
  } else {
    if (player.money < 200) {
      hud.say('LENA', 'Not enough cash for a service.', 3);
      return;
    }
    player.addMoney(-200);
    player.heal(100);
    police.clearWanted();
    audio.pickup();
    hud.say('LENA', 'Good as new. Even the cops forgot your plates.', 3);
  }
  renderGarage();
}

function stepWorld(dt, inp, doRender = true) {
  recentShotTimer = Math.max(0, recentShotTimer - dt);
  const mouse = inp.consumeMouse();
  camera.addMouse(mouse.dx, mouse.dy);
  player.update(dt, inp, world, camera.yaw);
  if (player.inCar) {
    const others = [...police.cops.map((c) => c.vehicle), player.vehicle].filter(Boolean);
    traffic.update(dt, player.pos, others);
  } else {
    traffic.update(dt, player.pos, police.cops.map((c) => c.vehicle));
  }
  const danger = player.inCar && Math.abs(player.speed) > 10
    ? { x: player.x, z: player.z, radius: 14 }
    : recentShotTimer > 0 ? { x: player.x, z: player.z, radius: 26 } : null;
  peds.update(dt, player.pos, danger);
  police.update(dt, player, player.inCar);
  missions.update(dt, player, police, () => doSave());

  // Motion cues: dust behind the rear wheels, a NEAR MISS bonus for flashing
  // past traffic at speed, and DRIFT for a handbrake slide.
  if (player.inCar && Math.abs(player.speed) > 20) {
    dustTimer -= dt;
    if (dustTimer <= 0) {
      dustTimer = 0.06;
      const bx = player.x - Math.cos(player.angle) * 2.2;
      const bz = player.z + Math.sin(player.angle) * 2.2;
      // Two puffs, offset sideways (perpendicular to the heading) so they
      // peek out from behind the car body, drifting further out as they age.
      const px = Math.sin(player.angle) * 1.6;
      const pz = Math.cos(player.angle) * 1.6;
      spawnDust(bx + px + (Math.random() - 0.5), bz + pz, px, pz);
      spawnDust(bx - px + (Math.random() - 0.5), bz - pz, -px, -pz);
    }
  }
  updateDust(dt);
  nearMissCd = Math.max(0, nearMissCd - dt);
  if (player.inCar && Math.abs(player.speed) > 25 && nearMissCd <= 0) {
    const fx = Math.cos(player.angle);
    const fz = -Math.sin(player.angle);
    for (const v of world.vehicles) {
      if (v === player.vehicle) continue;
      const dx = v.x - player.x;
      const dz = v.z - player.z;
      const along = dx * fx + dz * fz;
      const lat = Math.abs(dx * -fz + dz * fx);
      if (along > -2 && along < 9 && lat < 3.4) {
        player.addMoney(250);
        hud.actionText('NEAR MISS +$250');
        nearMissCd = 3;
        break;
      }
    }
  }
  if (player.inCar && inp.isDown('handbrake') && Math.abs(player.speed) > 18) {
    driftTimer += dt;
    if (driftTimer > 0.8) {
      driftTimer = 0;
      player.addMoney(150);
      hud.actionText('DRIFT x3');
    }
  } else {
    driftTimer = 0;
  }
  if (player.dead && screen === 'play') gameOver('wasted');
  else if (police.busted && screen === 'play') gameOver('busted');

  // Contextual hint: entering cars, the garage, the safehouse save.
  let hint = null;
  if (!player.inCar) {
    const near = world.vehicles.find((v) => Math.hypot(v.x - player.x, v.z - player.z) < 4.5);
    if (near) hint = `E — ENTER ${near.spec.name.toUpperCase()}`;
  } else if (Math.hypot(player.x - PLACES.garage.x, player.z - PLACES.garage.z) < 14) {
    hint = 'G — LENA\u2019S GARAGE (upgrades · repaint · clear wanted)';
  } else if (Math.hypot(player.x - PLACES.safehouse.x, player.z - PLACES.safehouse.z) < 12) {
    hint = 'P — PAUSE · SAVE YOUR GAME';
  }
  hud.hint(hint);

  // Radio switching and the map / pause keys are handled in the frame loop.
  camera.update(dt, player, screen === 'title' ? 'title' : player.inCar ? 'car' : 'foot', 0);
  r.followShadows(player.x, player.z);
  hud.update(dt, world);
  if (doRender) r.render();
  inp.endFrame();
}

function frameLoop() {
  if (!input) input = createInput(canvas);
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let frameDt = (now - last) / 1000;
    last = now;
    if (frameDt > MAX_FRAME) frameDt = MAX_FRAME;

    if (screen === 'title') {
      // The city lives behind the title: traffic and pedestrians move.
      traffic.update(frameDt, { x: 0, z: 0 }, []);
      peds.update(frameDt, { x: 0, z: 0 }, null);
      camera.update(frameDt, { x: 0, z: 0 }, 'title', now / 1000);
      r.render();
      if (input.wasPressed('confirm')) {
        if (hasSave()) continueGame();
        else startNewGame();
      }
      input.endFrame();
      return;
    }
    if (screen === 'paused') {
      if (input.wasPressed('pause')) {
        showScreen(null);
        screen = 'play';
      }
      input.endFrame();
      return;
    }
    if (screen === 'map') {
      if (input.wasPressed('map') || input.wasPressed('pause')) {
        showScreen(null);
        screen = 'play';
      }
      input.endFrame();
      return;
    }
    if (screen === 'garage') {
      if (input.wasPressed('garage') || input.wasPressed('pause')) {
        showScreen(null);
        screen = 'play';
      }
      input.endFrame();
      return;
    }
    if (screen === 'over') {
      if (input.wasPressed('confirm')) respawn();
      input.endFrame();
      return;
    }

    // Play: fixed steps. Capture the one-shot keys BEFORE stepping, because
    // stepWorld ends the input frame — checks after the loop would never
    // see the press. Render exactly once per animation frame, not once
    // per step, or a slow GPU spirals: more steps, more renders, slower.
    const pausePressed = input.wasPressed('pause');
    const mapPressed = input.wasPressed('map');
    const radioPressed = input.wasPressed('radio');
    const garagePressed = input.wasPressed('garage');
    const weapon1Pressed = input.wasPressed('weapon1');
    const weapon2Pressed = input.wasPressed('weapon2');
    accumulator += frameDt;
    while (accumulator >= STEP) {
      stepWorld(STEP, input, false);
      accumulator -= STEP;
      if (screen !== 'play') { accumulator = 0; break; }
    }
    if (screen === 'play') r.render();

    if (pausePressed) showScreen('pause');
    if (weapon1Pressed) player.selectWeapon('fists');
    if (weapon2Pressed) player.selectWeapon('pistol');
    if (mapPressed) {
      showScreen('map');
      hud.drawBigMap(world);
    }
    if (radioPressed && player.inCar) {
      const st = audio.setStation(RADIO.indexOf(audio.station()) + 1);
      hud.say(st.name, st.track, 3);
    }
    if (garagePressed && player.inCar
      && Math.hypot(player.x - PLACES.garage.x, player.z - PLACES.garage.z) < 14) {
      openGarage();
    }
  }
  requestAnimationFrame(frame);
}

// Menu navigation (pause + garage) listens for keys directly.
window.addEventListener('keydown', (event) => {
  if (screen === 'title' && event.code === 'KeyN') {
    startNewGame();
    return;
  }
  if (screen === 'paused') {
    const items = [...document.querySelectorAll('#pause-menu > div')];
    if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
      event.preventDefault();
      pauseIndex = (pauseIndex + (event.code === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('sel', i === pauseIndex));
    } else if (event.code === 'Enter') {
      const act = items[pauseIndex]?.dataset.act;
      if (act === 'resume') { showScreen(null); screen = 'play'; }
      else if (act === 'map') { showScreen('map'); hud.drawBigMap(world); }
      else if (act === 'save') { doSave(); }
      else if (act === 'restart') {
        missions.startJob(missions.jobIndex);
        showScreen(null);
        screen = 'play';
      } else if (act === 'title') { showScreen('title'); }
    }
  } else if (screen === 'garage') {
    const count = GARAGE_UPGRADES.length + 1;
    if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
      event.preventDefault();
      garageIndex = (garageIndex + (event.code === 'ArrowDown' ? 1 : -1) + count) % count;
      renderGarage();
    } else if (event.code === 'Enter') {
      buyGarageItem();
    }
  }
});

// Shot mode: stage the scene, then play it forward a few fixed steps per
// animation frame (never blocking the page), paint, signal readiness.
function runShot(name) {
  audio.radio(false);
  const scene = stageShot(name, world);
  if (scene.screen === 'title') showScreen('title');
  else if (scene.screen === 'map') { showScreen('map'); }
  else { showScreen(null); screen = 'play'; }
  const totalSteps = Math.round(scene.runSeconds / STEP);
  let done = 0;
  let painted = 0;
  window.__shotProgress = 0;
  function advance() {
    const batch = Math.min(12, totalSteps - done);
    for (let i = 0; i < batch; i += 1) {
      stepWorld(STEP, scene.input, false);
      if (scene.screen === 'map') hud.drawBigMap(world);
    }
    done += batch;
    window.__shotProgress = done / totalSteps;
    r.render();
    if (done >= totalSteps && scene.finish && !scene.finished) {
      scene.finished = true;
      scene.finish();
      // Let the world settle one step so the HUD reflects the finish.
      stepWorld(STEP, scene.input, false);
      hud.update(0, world);
    }
    if (done < totalSteps) {
      requestAnimationFrame(advance);
      return;
    }
    if (scene.screen === 'map') hud.drawBigMap(world);
    r.render();
    painted += 1;
    if (painted < 3) requestAnimationFrame(advance);
    else window.__shotReady = true;
  }
  requestAnimationFrame(advance);
}

if (shotName) {
  // No audio, no input listeners: the scene plays itself.
  runShot(shotName);
} else {
  const prompt = document.getElementById('title-prompt');
  if (hasSave()) prompt.textContent = 'PRESS ENTER — CONTINUE  ·  N — NEW GAME';
  frameLoop();
}
