// SOLMAR BAY — main orchestration: game loop, camera, driving + on-foot
// play, car stealing, collisions, crimes, dust, and the save.

import { CFG } from './config.js';
import { makeRng } from './random.js';
import {
  initInput,
  driveInput,
  walkInput,
  wasHit,
  endFrameInput,
} from './input.js';
import { createRender } from './render.js';
import { buildWorld } from './world.js';
import { buildHeroCar, createCarPhysics } from './cars.js';
import { buildPedestrians, buildFigure } from './people.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { applyShot, runPlaytest } from './shots.js';

const rng = makeRng(CFG.seed);
const save = loadSave();
save.visits++;
storeSave(save);

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message || 'error'));
window.addEventListener('unhandledrejection', (e) =>
  errors.push(String((e.reason && e.reason.message) || e.reason)),
);

initInput();
const render = createRender(document.getElementById('game-container'));
const world = buildWorld(render.scene, rng);
const hud = createHUD();
const audio = createAudio();
const peds = buildPedestrians(render.scene, rng, 20);
const traffic = createTraffic(render.scene, rng);
const police = createPolice(render.scene);

let bank = save.cash;
let bestDrift = save.bestDrift;
let missionsWon = save.missionsWon;
let checkpointsHit = save.checkpointsHit;

function persist() {
  bank += missions.bank();
  bestDrift = Math.max(bestDrift, missions.bestDrift);
  storeSave({
    cash: bank,
    bestDrift,
    missionsWon,
    checkpointsHit,
    visits: save.visits,
  });
}

const missions = createMissions(render.scene, {
  onCheckpoint(index, total, name) {
    checkpointsHit++;
    hud.showMessage(`CHECKPOINT ${index}/${total} — ${name}`);
    hud.toast(`+$150  •  +${CFG.checkpointBonus}s`);
    audio.chime();
    persist();
  },
  onMissionComplete(won) {
    missionsWon = won;
    hud.showMessage('SUNSET SPRINT COMPLETE — $1,000!');
    hud.toast('Mission complete. The city is yours.');
    audio.fanfare();
    persist();
  },
  onMissionFailed() {
    hud.showMessage('OUT OF TIME');
    hud.toast('The sprint restarts — drive faster.');
  },
  onDriftBanked(pts, payout) {
    hud.toast(`DRIFT +${pts}  •  banked $${payout}`);
    persist();
  },
});

// --- Player: hero car, on-foot character, parked cars -----------------------
const heroBuild = buildHeroCar();
render.scene.add(heroBuild.group);
const heroPhysics = createCarPhysics(CFG.spawn.x, CFG.spawn.z, CFG.spawn.heading);

let driven = { kind: 'hero', build: heroBuild, physics: heroPhysics };
const parked = [];

const charFig = buildFigure(rng);
charFig.group.visible = false;
render.scene.add(charFig.group);
const charState = {
  pos: new THREE.Vector3(CFG.spawn.x, 0, CFG.spawn.z),
  heading: CFG.spawn.heading,
  speed: 0,
  phase: 0,
};

let onFoot = false;
let state = 'title'; // title | playing | paused | busted
let time = 0;
let frame = 0;
let lastCrimeAt = -10;
let autoDrive = false;
let cinematic = null;
let fovCur = 62;

// --- Dust: a small pool of tyre-smoke points --------------------------------
const DUST_N = 140;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST_N * 3);
const dustLife = new Float32Array(DUST_N);
const dustVel = new Float32Array(DUST_N * 3);
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
// Soft round sprite so puffs read as smoke, never as squares.
const dustCanvas = document.createElement('canvas');
dustCanvas.width = 64;
dustCanvas.height = 64;
{
  const g = dustCanvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.32)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
}
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0xd8c8a8,
    size: 1.5,
    map: new THREE.CanvasTexture(dustCanvas),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    sizeAttenuation: true,
  }),
);
dust.frustumCulled = false;
render.scene.add(dust);
let dustCursor = 0;

function puffDust(x, y, z) {
  const i = dustCursor;
  dustCursor = (dustCursor + 1) % DUST_N;
  dustPos[i * 3] = x;
  dustPos[i * 3 + 1] = y;
  dustPos[i * 3 + 2] = z;
  dustVel[i * 3] = (Math.random() - 0.5) * 1.2;
  dustVel[i * 3 + 1] = Math.random() * 1.4 + 0.5;
  dustVel[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
  dustLife[i] = 0.7;
}

function updateDust(dt) {
  for (let i = 0; i < DUST_N; i++) {
    if (dustLife[i] <= 0) continue;
    dustLife[i] -= dt;
    dustPos[i * 3] += dustVel[i * 3] * dt;
    dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
    dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
    if (dustLife[i] <= 0) dustPos[i * 3 + 1] = -50;
  }
  dustGeo.attributes.position.needsUpdate = true;
}

// --- Camera -----------------------------------------------------------------
const camTarget = new THREE.Vector3();
const desiredCam = new THREE.Vector3();

function updateCamera(dt) {
  const cam = render.camera;
  // Snap on the first frames so screenshots frame correctly even when the
  // renderer is slow; ease in afterwards.
  const snap = frame < 3;
  if (cinematic) {
    if (snap) cam.position.copy(cinematic.pos);
    else cam.position.lerp(cinematic.pos, 1 - Math.exp(-2 * dt));
    cam.lookAt(cinematic.lookAt);
    return;
  }
  if (state === 'title') {
    const a = time * 0.03;
    desiredCam.set(235 + Math.sin(a) * 120, 42, -40 + Math.cos(a) * 120);
    if (snap) cam.position.copy(desiredCam);
    else cam.position.lerp(desiredCam, 1 - Math.exp(-1.2 * dt));
    cam.lookAt(235, 2, -40);
    return;
  }
  if (onFoot) {
    const f = {
      x: Math.sin(charState.heading),
      z: Math.cos(charState.heading),
    };
    desiredCam.set(
      charState.pos.x - f.x * 5.5,
      3.1,
      charState.pos.z - f.z * 5.5,
    );
    if (snap) cam.position.copy(desiredCam);
    else cam.position.lerp(desiredCam, 1 - Math.exp(-6 * dt));
    camTarget.set(
      charState.pos.x + f.x * 3,
      1.5,
      charState.pos.z + f.z * 3,
    );
    cam.lookAt(camTarget);
    return;
  }
  // Chase cam: low, close, 3/4 from the lit side (offset toward the sun side).
  const p = driven.physics.state;
  const f = { x: Math.sin(p.heading), z: Math.cos(p.heading) };
  const r = { x: Math.cos(p.heading), z: -Math.sin(p.heading) };
  desiredCam.set(
    p.pos.x - f.x * 5.5 + r.x * 3.2,
    2.1,
    p.pos.z - f.z * 5.5 + r.z * 3.2,
  );
  if (snap) cam.position.copy(desiredCam);
  else cam.position.lerp(desiredCam, 1 - Math.exp(-5.5 * dt));
  camTarget.set(p.pos.x + f.x * 4, 1.3, p.pos.z + f.z * 4);
  cam.lookAt(camTarget);
  const speedF = Math.min(Math.abs(p.speed) / 56, 1);
  const fovWant = 62 + speedF * 6;
  if (Math.abs(fovWant - fovCur) > 0.05) {
    fovCur += (fovWant - fovCur) * Math.min(1, 3 * dt);
    cam.fov = fovCur;
    cam.updateProjectionMatrix();
  }
}

// --- Car pose helpers ---------------------------------------------------------
function syncDrivenGroup() {
  const p = driven.physics.state;
  driven.build.group.position.copy(p.pos);
  driven.build.group.rotation.y = p.heading + Math.PI;
}

function setCarPose(x, z, heading) {
  const p = driven.physics.state;
  p.pos.set(x, 0, z);
  p.heading = heading;
  p.speed = 0;
  p.vel.set(0, 0, 0);
  p.steer = 0;
  syncDrivenGroup();
}

function nearestDrivable(from) {
  let best = null;
  let bestD = 4.5;
  for (const entry of parked) {
    const d = Math.hypot(entry.pos.x - from.x, entry.pos.z - from.z);
    if (d < bestD) {
      bestD = d;
      best = { type: 'parked', entry };
    }
  }
  for (const car of traffic.cars) {
    const d = Math.hypot(car.pos.x - from.x, car.pos.z - from.z);
    if (d < bestD) {
      bestD = d;
      best = { type: 'traffic', car };
    }
  }
  return best;
}

function exitCar() {
  const p = driven.physics.state;
  parked.push({
    build: driven.build,
    pos: p.pos.clone(),
    heading: p.heading,
    kind: driven.kind,
  });
  onFoot = true;
  charState.pos.set(p.pos.x + 2.4, 0, p.pos.z + 1.5);
  charState.heading = p.heading;
  charFig.group.visible = true;
  charFig.group.position.copy(charState.pos);
  hud.toast('E — get back in a car');
}

function enterCar() {
  const found = nearestDrivable(charState.pos);
  if (!found) {
    hud.toast('No car nearby — walk to one and press E');
    return;
  }
  let build;
  let pos;
  let heading;
  if (found.type === 'parked') {
    parked.splice(parked.indexOf(found.entry), 1);
    build = found.entry.build;
    pos = found.entry.pos;
    heading = found.entry.heading;
  } else {
    traffic.cars.splice(traffic.cars.indexOf(found.car), 1);
    build = { group: found.car.group, wheels: found.car.wheels };
    pos = found.car.pos;
    heading = found.car.heading;
    police.addWanted(1, time);
    hud.toast('STOLEN — the cops noticed!  +★');
    audio.thud();
  }
  const physics = createCarPhysics(pos.x, pos.z, heading);
  driven = { kind: found.type === 'parked' ? found.entry.kind : 'stolen', build, physics };
  onFoot = false;
  charFig.group.visible = false;
  syncDrivenGroup();
}

function commitCrime() {
  if (time - lastCrimeAt < 3) return;
  lastCrimeAt = time;
  police.addWanted(1, time);
}

// --- Game object (exposed to the playtest + shots) ---------------------------
const game = {
  get frame() {
    return frame;
  },
  get state() {
    return state;
  },
  render,
  world,
  hero: heroBuild,
  traffic,
  peds,
  police,
  missions,
  hud,
  errors,
  get physics() {
    return driven.physics;
  },
  updateCamera,
  setCarPose,
  get autoDrive() {
    return autoDrive;
  },
  set autoDrive(v) {
    autoDrive = v;
  },
  get cinematic() {
    return cinematic;
  },
  set cinematic(v) {
    cinematic = v;
  },
  saveRoundtrip() {
    const s = loadSave();
    storeSave({ ...s, visits: s.visits });
    return loadSave().visits === s.visits;
  },
  startGame,
};
window.SB = { game };

// --- Start / pause / busted ---------------------------------------------------
function startGame() {
  if (state === 'playing') return;
  state = 'playing';
  hud.showTitle(false);
  document.getElementById('hud').classList.add('show');
  document.getElementById('title-save').textContent = '';
  audio.start();
  audio.click();
  hud.toast('SUNSET SPRINT — follow the orange rings!');
}

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', () => {
  state = 'playing';
  hud.showPause(false);
  audio.click();
});
document.getElementById('btn-busted').addEventListener('click', () => {
  bank = Math.max(0, bank - 200);
  police.clearWanted();
  setCarPose(CFG.spawn.x, CFG.spawn.z, CFG.spawn.heading);
  hud.hideBusted();
  state = 'playing';
  persist();
  hud.toast('Fine paid. Drive careful.');
});

document.getElementById('title-save').textContent =
  `BEST DRIFT ${bestDrift}  •  MISSIONS WON ${missionsWon}  •  CASH $${bank.toLocaleString('en-US')}`;

// --- Per-frame updates --------------------------------------------------------
const clock = new THREE.Clock();
let firstFrame = true;

function playerPos() {
  return onFoot ? charState.pos : driven.physics.state.pos;
}
function playerSpeed() {
  return onFoot ? charState.speed : driven.physics.state.speed;
}
function playerHeading() {
  return onFoot ? charState.heading : driven.physics.state.heading;
}

function updateDriving(dt) {
  const input = autoDrive
    ? { throttle: 1, steer: 0, handbrake: false }
    : driveInput();
  const p = driven.physics.update(dt, input, world.colliders);
  syncDrivenGroup();
  // Wheels: spin + front steer.
  for (const w of driven.build.wheels) {
    if (w.pivot) {
      w.wheel.rotation.x += (p.speed * dt) / 0.36;
      if (w.front) w.pivot.rotation.y = p.steer;
    } else {
      w.rotation.x += (p.speed * dt) / 0.33;
    }
  }
  if (p.crashed) {
    audio.thud();
    hud.toast('Crash!');
  }
  // Dust when drifting or launching hard.
  if (p.drifting || (Math.abs(p.speed) > 30 && input.throttle > 0)) {
    const back = { x: -Math.sin(p.heading), z: -Math.cos(p.heading) };
    puffDust(p.pos.x + back.x * 1.6, 0.25, p.pos.z + back.z * 1.6);
    if (Math.random() < 0.6) puffDust(p.pos.x + back.x * 1.2, 0.3, p.pos.z + back.z * 1.2);
  }
  // Hit a pedestrian?
  for (const ped of peds.peds) {
    if (ped.fallen) continue;
    const d = Math.hypot(ped.group.position.x - p.pos.x, ped.group.position.z - p.pos.z);
    if (d < 2.3 && Math.abs(p.speed) > 6) {
      peds.knockDown(ped);
      commitCrime();
      audio.thud();
      p.speed *= 0.85;
      hud.toast('Pedestrian down!  +★');
    }
  }
  // Hit a traffic car?
  for (const car of traffic.cars) {
    const d = Math.hypot(car.pos.x - p.pos.x, car.pos.z - p.pos.z);
    if (d < 3.4) {
      traffic.bump(car);
      if (Math.abs(p.speed) > 12) {
        commitCrime();
        audio.thud();
        p.speed *= 0.7;
      }
    }
  }
  // Police contact.
  for (const car of police.cars) {
    const d = Math.hypot(car.pos.x - p.pos.x, car.pos.z - p.pos.z);
    if (d < 3.6) {
      const push = (3.6 - d) / 3.6;
      p.pos.x += ((p.pos.x - car.pos.x) / (d || 1)) * push * 1.2;
      p.pos.z += ((p.pos.z - car.pos.z) / (d || 1)) * push * 1.2;
      p.speed *= 0.88;
      if (Math.abs(p.speed) > 18) commitCrime();
    }
  }
}

function updateOnFoot(dt) {
  const w = walkInput();
  const camYaw = Math.atan2(
    render.camera.position.x - charState.pos.x,
    render.camera.position.z - charState.pos.z,
  );
  // Camera-relative movement: W walks away from the camera.
  const fwd = { x: -Math.sin(camYaw), z: -Math.cos(camYaw) };
  const right = { x: -fwd.z, z: fwd.x };
  let mx = fwd.x * w.fwd + right.x * w.strafe;
  let mz = fwd.z * w.fwd + right.z * w.strafe;
  const len = Math.hypot(mx, mz);
  const speed = w.run ? CFG.onFoot.runSpeed : CFG.onFoot.walkSpeed;
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    charState.heading = Math.atan2(mx, mz);
    charState.pos.x += mx * speed * dt;
    charState.pos.z += mz * speed * dt;
    charState.speed = speed;
    charState.phase += dt * speed * 1.6;
    const swing = Math.sin(charState.phase) * 0.6;
    charFig.hipL.rotation.x = swing;
    charFig.hipR.rotation.x = -swing;
    charFig.shoulderL.rotation.x = -swing * 0.7;
    charFig.shoulderR.rotation.x = swing * 0.7;
  } else {
    charState.speed = 0;
    charFig.hipL.rotation.x *= 0.8;
    charFig.hipR.rotation.x *= 0.8;
  }
  // Keep out of buildings + inside the world.
  const r = 0.6;
  for (const c of world.colliders) {
    const cx = Math.max(c.minX, Math.min(charState.pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(charState.pos.z, c.maxZ));
    const dx = charState.pos.x - cx;
    const dz = charState.pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      charState.pos.x += (dx / d) * (r - d);
      charState.pos.z += (dz / d) * (r - d);
    }
  }
  const B = CFG.world;
  charState.pos.x = Math.max(B.minX + 2, Math.min(B.maxX - 2, charState.pos.x));
  charState.pos.z = Math.max(B.minZ + 2, Math.min(B.maxZ - 2, charState.pos.z));
  charFig.group.position.copy(charState.pos);
  charFig.group.rotation.y = charState.heading;
  // Punch.
  if (wasHit('KeyF')) {
    let nearest = null;
    let nearestD = 2.6;
    for (const ped of peds.peds) {
      if (ped.fallen) continue;
      const d = Math.hypot(ped.group.position.x - charState.pos.x, ped.group.position.z - charState.pos.z);
      if (d < nearestD) {
        nearestD = d;
        nearest = ped;
      }
    }
    if (nearest) {
      peds.knockDown(nearest);
      commitCrime();
      audio.thud();
      hud.toast('That was uncalled for.  +★');
    }
    charFig.shoulderR.rotation.x = -1.4;
    setTimeout(() => {
      charFig.shoulderR.rotation.x = 0;
    }, 220);
  }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  frame++;

  if (state === 'playing') {
    if (wasHit('KeyM')) {
      if (hud.isMapOpen()) hud.closeMap();
      else hud.openMap();
      audio.click();
    }
    if (wasHit('KeyP') || wasHit('Escape')) {
      state = 'paused';
      hud.showPause(true);
    }
    if (wasHit('KeyN')) {
      audio.setMuted(!audio.isMuted());
      hud.toast(audio.isMuted() ? 'Sound off' : 'Sound on');
    }
    if (wasHit('KeyR')) {
      if (!onFoot) setCarPose(CFG.spawn.x, CFG.spawn.z, CFG.spawn.heading);
      hud.toast('Back to Ocean Drive');
    }
    if (wasHit('KeyE')) {
      if (onFoot) enterCar();
      else exitCar();
    }

    if (onFoot) updateOnFoot(dt);
    else updateDriving(dt);

    const p = driven.physics.state;
    missions.update(
      dt,
      playerPos(),
      playerSpeed(),
      onFoot ? false : p.drifting,
      onFoot ? 0 : p.driftAngle,
      time,
    );
    const pres = police.update(
      dt,
      { pos: playerPos(), speed: playerSpeed() },
      world.colliders,
      rng,
      time,
    );
    if (pres.busted) {
      state = 'busted';
      hud.showBusted();
      audio.busted();
    }
    traffic.update(dt);
    peds.update(dt);
    audio.update(
      playerSpeed(),
      onFoot ? false : p.drifting,
      pres.nearest < 60 && police.wanted > 0,
      dt,
    );

    // Hero light + dust + crew idle.
    render.followHero(playerPos(), playerHeading());
    updateDust(dt);
    for (const c of world.marina.crew) {
      c.group.position.y = c.baseY + Math.sin(time * 1.1 + c.phase) * 0.04;
    }

    hud.update(
      {
        speed: playerSpeed(),
        onFoot,
        drifting: onFoot ? false : p.drifting,
        driftPoints: missions.driftPoints,
        cash: bank + missions.cash,
        wanted: police.wanted,
        checkpointIndex: missions.index,
        checkpoints: missions.checkpoints,
        timeLeft: missions.timeLeft,
        missionActive: missions.active,
        bestDrift: Math.max(bestDrift, missions.bestDrift),
        player: playerPos(),
        heading: playerHeading(),
        police: police.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      },
      time,
    );
  } else if (state === 'title') {
    // Attract mode: the city idles behind the title.
    traffic.update(dt);
    peds.update(dt);
    render.followHero(
      driven.physics.state.pos,
      driven.physics.state.heading,
    );
    if (wasHit('Enter')) startGame();
  }

  updateCamera(dt);
  render.render();
  if (firstFrame) {
    firstFrame = false;
    hud.setLoadingDone();
  }
  endFrameInput();
}

// Initial camera + hero light placement, then go.
syncDrivenGroup();
render.followHero(driven.physics.state.pos, driven.physics.state.heading);
updateCamera(0.1);
loop();

// Screenshot setups, then the optional playtest.
applyShot(game);
const params = new URLSearchParams(window.location.search);
if (params.get('playtest') === '1') {
  runPlaytest(game).then((r) => {
    // eslint-disable-next-line no-console
    console.log(`PLAYTEST ${r.passed}/${r.total}`);
  });
}
