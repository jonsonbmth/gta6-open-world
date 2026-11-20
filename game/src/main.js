// SOLMAR BAY — game core: states, arcade car physics, on-foot mode,
// collisions, missions wiring, playtest, screenshot shots.
import { GAME_TITLE, CHECKPOINTS, DIALOGUE, SEA_X } from './config.js';
import { makeRng, clamp, angleLerp } from './random.js';
import { buildWorld } from './world.js';
import { buildHeroCar } from './cars.js';
import { createTraffic, createPedestrians } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHUD, districtAt } from './hud.js';
import { createRender, animateWorld } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { buildPerson, buildCrewMember, animateWalk } from './people.js';

const THREE = window.THREE;

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '1', 10);
const SHOT = params.get('shot') || '';
const PLAYTEST = params.has('playtest');

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));

const rng = makeRng(SEED);
const input = createInput();
const audio = createAudio();

const canvas = document.getElementById('game-canvas');
const render = createRender(canvas);
const scene = render.scene;
const world = buildWorld(scene, rng);

// ---- player ----
const heroCar = buildHeroCar();
scene.add(heroCar);
const player = {
  x: world.spawn.x, z: world.spawn.z, angle: world.spawn.angle,
  speed: 0, // m/s, signed
  onFoot: false,
  walkAngle: world.spawn.angle,
  drift: 0, drifting: false,
  gear: 1,
};
heroCar.position.set(player.x, 0.3, player.z);
heroCar.rotation.y = player.angle;

const traffic = createTraffic(scene, rng, 14);
const pedestrians = createPedestrians(scene, rng, 20);
const police = createPolice(scene, rng, 2);
const missions = createMissions();
const saved = loadSave();
missions.state.bestDrift = saved.bestDrift;
missions.state.missionsWon = saved.missionsWon;
missions.state.cash = saved.cash || missions.state.cash;

// Marina crew: 3 named characters standing on the sand by the marina,
// facing east (the boats) in normal play.
const crew = [];
const crewDefs = [
  { color: 0xff5a8a, name: 'Lena', x: 374, z: 206 },
  { color: 0xffd25a, name: 'Mama Rosa', x: 378, z: 212 },
  { color: 0x5a8aff, name: 'Dario', x: 374, z: 218 },
];
for (const cd of crewDefs) {
  const p = buildCrewMember(cd.color, cd.name);
  p.position.set(cd.x, 0.3, cd.z);
  p.rotation.y = Math.PI; // face the marina camera (west)
  scene.add(p);
  crew.push(p);
}

// On-foot avatar (Rico) — hidden until the player exits the car.
const rico = buildPerson(0xd81e26, 0x2a2a30);
rico.visible = false;
scene.add(rico);

const hud = createHUD({
  player,
  missions,
  nextCheckpoint: () => missions.checkpoint(),
  remainingCheckpoints: () => CHECKPOINTS.slice(missions.state.checkpointIndex),
  policePositions: () => police.units.map((u) => ({ x: u.mesh.position.x, z: u.mesh.position.z })),
  clock: () => game.clockText,
  respect: () => 32 + missions.state.missionsWon * 8,
  speedKmh: () => Math.abs(player.speed) * 3.6,
  gear: () => player.gear,
  onFoot: false,
});

const game = {
  state: 'title', // title | play | map | paused
  t: 0,
  frame: 0,
  clockMin: 17 * 60 + 42,
  clockText: '17:42',
  wantedTimer: 0,
  nearMissCooldown: 0,
  started: false,
};
window.SB = { game };

// Debug hook for the shot-probe runner (camera + actor positions).
window.__dbg = () => {
  const dir = new THREE.Vector3();
  render.camera.getWorldDirection(dir);
  return {
    state: game.state,
    frame: game.frame,
    camPos: render.camera.position.toArray().map((v) => +v.toFixed(1)),
    camDir: dir.toArray().map((v) => +v.toFixed(2)),
    player: { x: +player.x.toFixed(1), z: +player.z.toFixed(1), angle: +player.angle.toFixed(2), walkAngle: +player.walkAngle.toFixed(2), onFoot: player.onFoot, speed: +player.speed.toFixed(1) },
    car: heroCar.position.toArray().map((v) => +v.toFixed(1)),
    crew: crew.map((c) => c.position.toArray().map((v) => +v.toFixed(1))),
    rico: rico.position.toArray().map((v) => +v.toFixed(1)),
    sunPos: world.sunPos.toArray().map((v) => +v.toFixed(0)),
    sunVisible: world.sunDisc ? world.sunDisc.visible : null,
    fog: render.scene.fog ? { color: '#' + render.scene.fog.color.getHexString(), density: render.scene.fog.density } : null,
    rayTop: raycastSky(0, 0.85),
    rayMid: raycastSky(0, 0.1),
  };
};

// Raycast from the camera through NDC (nx, ny); report the first hit so a
// wrong-colour sky can be traced to the object that actually fills it.
function raycastSky(nx, ny) {
  const rc = new THREE.Raycaster();
  rc.setFromCamera({ x: nx, y: ny }, render.camera);
  const hits = rc.intersectObjects(render.scene.children, true);
  if (!hits.length) return { hit: false };
  const h = hits[0];
  const m = h.object.material;
  return {
    hit: true,
    type: h.object.type,
    dist: +h.distance.toFixed(1),
    point: h.point.toArray().map((v) => +v.toFixed(1)),
    mat: m ? { color: m.color ? '#' + m.color.getHexString() : null, map: !!m.map, fog: m.fog, isSprite: !!m.isSpriteMaterial } : null,
  };
}

function forward(theta) { return { x: -Math.cos(theta), z: Math.sin(theta) }; }

function collideCircle(x, z, r) {
  // buildings
  for (const c of world.colliders) {
    const cx = clamp(x, c.x0, c.x1);
    const cz = clamp(z, c.z0, c.z1);
    const dx = x - cx; const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      return { x: cx + (dx / d) * r, z: cz + (dz / d) * r, hit: true };
    }
  }
  for (const o of world.obstacles) {
    const dx = x - o.x; const dz = z - o.z;
    const d2 = dx * dx + dz * dz;
    const rr = r + o.r;
    if (d2 < rr * rr) {
      const d = Math.sqrt(d2) || 0.001;
      return { x: o.x + (dx / d) * rr, z: o.z + (dz / d) * rr, hit: true };
    }
  }
  return { x, z, hit: false };
}

function updateCar(dt) {
  const test = input._test;
  const drive = test ? test.drive : input.drive;
  const steer = test ? test.steer : input.steer;
  const handbrake = test ? test.handbrake : input.handbrake;
  const maxSpeed = 42;
  const accel = drive > 0 ? 16 : 0;
  const brake = drive < 0 ? 26 : 0;
  player.speed += (accel - brake) * dt;
  if (drive === 0) player.speed -= Math.sign(player.speed) * Math.min(Math.abs(player.speed), 8 * dt);
  player.speed = clamp(player.speed, -10, maxSpeed);
  // steering: A turns left (toward screen-left from the chase camera)
  const speed01 = clamp(Math.abs(player.speed) / maxSpeed, 0, 1);
  const turnRate = 2.1 * (0.55 + 0.45 * (1 - speed01));
  player.angle += steer * turnRate * dt * (player.speed >= 0 ? 1 : -1) * clamp(Math.abs(player.speed) / 6, 0, 1);
  // drift: handbrake at speed slides the car sideways and scores
  const sliding = handbrake && Math.abs(player.speed) > 12;
  if (sliding) {
    player.drift += Math.abs(player.speed) * dt * 0.9;
    player.drifting = true;
    if (player.drift > 12 && game.t - missions.state.driftAt > 1.5) {
      const pts = Math.round(player.drift);
      missions.addDrift(pts, game.t);
      hud.showFloat(`DRIFT x${Math.max(2, Math.round(pts / 12))}  +$${pts}`);
      audio.beep(660, 0.12, 0.05);
      player.drift = 0;
    }
  } else {
    player.drifting = false;
    if (Math.abs(player.speed) < 4) player.drift = 0;
  }
  const f = forward(player.angle);
  let nx = player.x + f.x * player.speed * dt;
  let nz = player.z + f.z * player.speed * dt;
  // sea: the beach stops the car at the water's edge
  if (nx > SEA_X - 4) { nx = SEA_X - 4; player.speed *= 0.4; }
  nx = clamp(nx, -355, SEA_X - 4);
  nz = clamp(nz, -275, 275);
  const hit = collideCircle(nx, nz, 1.6);
  if (hit.hit) {
    nx = hit.x; nz = hit.z;
    if (Math.abs(player.speed) > 8) {
      missions.setWanted(missions.state.wanted + 0); // bumps don't add heat by themselves
      player.speed *= 0.55;
      audio.beep(140, 0.15, 0.08);
    } else {
      player.speed *= 0.7;
    }
  }
  player.x = nx; player.z = nz;
  heroCar.position.set(player.x, 0.3, player.z);
  heroCar.rotation.y = player.angle;
  for (const w of heroCar.userData.wheels) w.rotation.z += player.speed * dt * 2.8;
  // gear from speed
  player.gear = clamp(1 + Math.floor(Math.abs(player.speed) / 7.5), 1, 6);
  // near miss: fast pass close to a traffic car
  if (game.nearMissCooldown > 0) game.nearMissCooldown -= dt;
  if (Math.abs(player.speed) > 15 && game.nearMissCooldown <= 0) {
    for (const c of traffic.cars) {
      const d = Math.hypot(c.mesh.position.x - player.x, c.mesh.position.z - player.z);
      if (d < 5.5 && d > 2.2) {
        missions.addNearMiss(game.t);
        hud.showFloat('NEAR MISS +$250');
        hud.showDialogue(DIALOGUE.nearMiss.who, DIALOGUE.nearMiss.text);
        missions.setWanted(Math.min(5, missions.state.wanted + 1));
        game.nearMissCooldown = 4;
        break;
      }
    }
  }
  // checkpoints
  const cp = missions.checkpoint();
  if (cp && Math.hypot(cp.x - player.x, cp.z - player.z) < 7) {
    const res = missions.reachCheckpoint();
    hud.showFloat(res === 'won' ? 'SUNSET SPRINT COMPLETE +$2,500' : 'CHECKPOINT +$500');
    audio.beep(990, 0.15, 0.07);
    if (res === 'won') {
      hud.showDialogue(DIALOGUE.marina.who, DIALOGUE.marina.text);
      writeSave({ bestDrift: missions.state.bestDrift, missionsWon: missions.state.missionsWon, cash: missions.state.cash });
    }
  }
  // wanted decays when driving clean and slow
  if (Math.abs(player.speed) < 6 && missions.state.wanted > 0) {
    game.wantedTimer += dt;
    if (game.wantedTimer > 14) { missions.setWanted(missions.state.wanted - 1); game.wantedTimer = 0; }
  } else {
    game.wantedTimer = 0;
  }
  // wanted rises with sustained speed
  if (Math.abs(player.speed) > 30 && missions.state.wanted < 3) {
    game.wantedTimer += dt;
    if (game.wantedTimer > 8) { missions.setWanted(missions.state.wanted + 1); game.wantedTimer = 0; }
  }
  police.setActive(missions.state.wanted > 0);
  audio.setEngine(clamp(Math.abs(player.speed) / 42, 0, 1), true);
  audio.setSiren(missions.state.wanted > 0, game.t);
}

function updateOnFoot(dt) {
  const test = input._test;
  const drive = test ? test.drive : input.drive;
  const steer = test ? test.steer : input.steer;
  const speed = input.run ? 7 : 4;
  player.walkAngle += steer * 2.4 * dt;
  const f = forward(player.walkAngle);
  let nx = player.x + f.x * drive * speed * dt;
  let nz = player.z + f.z * drive * speed * dt;
  nx = clamp(nx, -355, SEA_X - 4);
  nz = clamp(nz, -275, 275);
  const hit = collideCircle(nx, nz, 0.6);
  player.x = hit.x; player.z = hit.z;
  rico.position.set(player.x, 0.3, player.z);
  rico.rotation.y = player.walkAngle;
  animateWalk(rico, dt, drive !== 0 ? speed : 0);
}

function startGame() {
  if (game.started) return;
  game.started = true;
  game.state = 'play';
  hud.hideTitle();
  audio.unlock();
  hud.showDialogue(DIALOGUE.start.who, DIALOGUE.start.text);
}

function exitCar() {
  player.onFoot = true;
  player.walkAngle = player.angle;
  heroCar.visible = true; // parked car stays in the world
  rico.visible = true;
  rico.position.set(player.x, 0.3, player.z);
  rico.rotation.y = player.walkAngle;
  audio.beep(520, 0.08, 0.05);
}
function enterCar() {
  player.onFoot = false;
  rico.visible = false;
  audio.beep(620, 0.08, 0.05);
}

function updateSunVisibility() {
  // A Sprite behind the camera smears across the whole screen (flat orange
  // sky), so hide the sun disc + glow whenever the sun is not in front.
  const dir = new THREE.Vector3();
  render.camera.getWorldDirection(dir);
  const sunDir = world.sunPos.clone().normalize();
  const facing = dir.dot(sunDir);
  if (world.sunDisc) world.sunDisc.visible = facing > 0.02;
  if (world.sunGlow) world.sunGlow.visible = facing > 0.02;
}

function step(dt) {
  game.t += dt;
  game.frame += 1;
  game.clockMin += dt / 10;
  const mins = Math.floor(game.clockMin) % (24 * 60);
  game.clockText = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  animateWorld(world, game.t, dt);
  traffic.update(dt, player);
  pedestrians.update(dt, player, missions.state.wanted);
  police.update(dt, player, player.angle, missions.state.wanted, game.t);
  if (game.state === 'play') {
    if (player.onFoot) {
      updateOnFoot(dt);
    } else {
      updateCar(dt);
    }
    // keys
    if (input.wasPressed('KeyM')) { game.state = 'map'; hud.showMap(); }
    if (input.wasPressed('KeyP')) { game.state = 'paused'; hud.showPause(true); }
    if (input.wasPressed('KeyE')) {
      if (player.onFoot) {
        const d = Math.hypot(heroCar.position.x - player.x, heroCar.position.z - player.z);
        if (d < 4) enterCar();
      } else {
        exitCar();
      }
    }
    if (input.wasPressed('KeyR')) { audio.setSiren(false, game.t); hud.setRadio((Math.floor(Math.random() * 3))); }
    if (input.wasPressed('KeyN')) { audio.toggleMute(); }
  } else if (game.state === 'map') {
    if (input.wasPressed('KeyM') || input.wasPressed('Escape')) { game.state = 'play'; hud.hideMap(); }
  } else if (game.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) { game.state = 'play'; hud.showPause(false); }
  }
  // camera (the title screen's orbit owns the camera there, not chase)
  if (game.state !== 'title') {
    if (player.onFoot) {
      render.updateOnFoot(dt, { x: player.x, z: player.z }, player.walkAngle);
    } else {
      render.updateChase(dt, { x: player.x, z: player.z }, player.angle, clamp(Math.abs(player.speed) / 42, 0, 1));
    }
  }
  hud.update(dt, game.t);
  updateSunVisibility();
  render.render();
}

let last = performance.now();
function loop(now) {
  // Clamp dt to a sane positive range: a rAF timestamp from before this
  // script ran makes (now - last) negative, and a negative dt flings the
  // chase camera hundreds of metres and drives the car backwards.
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000 || 0.016));
  last = now;
  if (game.state !== 'title') step(dt);
  else {
    // title screen: close 3/4 view of the hero car on the street
    game.t += dt;
    animateWorld(world, game.t, dt);
    traffic.update(dt, player);
    pedestrians.update(dt, player, 0);
    render.snapTitle({ x: player.x, z: player.z }, player.angle);
    updateSunVisibility();
    render.render();
  }
  requestAnimationFrame(loop);
}

document.getElementById('btn-start').addEventListener('click', () => {
  audio.unlock();
  startGame();
});

// ---- screenshot shots (deterministic setups) ----
function applyShot() {
  if (!SHOT) return;
  game.started = true;
  game.state = 'play';
  hud.hideTitle();
  if (SHOT === 'chase') {
    // car on the z=-80 street, facing east, driving (test throttle keeps it
    // moving for the shot); police in pursuit behind
    player.x = 240; player.z = -80; player.angle = Math.PI;
    player.speed = 32;
    input._test = { drive: 1, steer: 0, handbrake: false };
    heroCar.position.set(player.x, 0.3, player.z);
    heroCar.rotation.y = player.angle;
    missions.state.wanted = 3;
    police.setActive(true);
    police.units[0].mesh.position.set(228, 0.3, -84);
    police.units[0].mesh.rotation.y = Math.PI;
    // second unit ahead at the roadside — its flashing light bar reflects
    // red/blue on the asphalt inside the chase frame
    police.units[1].mesh.position.set(258, 0.3, -72);
    police.units[1].mesh.rotation.y = Math.PI;
    missions.state.checkpointIndex = 0;
    hud.pinFloat('NEAR MISS +$250');
    hud.pinDialogue(DIALOGUE.start.who, DIALOGUE.start.text);
    render.snapChase({ x: player.x, z: player.z }, player.angle);
  } else if (SHOT === 'title') {
    game.state = 'title';
    game.started = false;
    hud.showTitle();
    // hero parked on the z=-80 street, facing east down the canyon
    player.x = 252; player.z = -80; player.angle = Math.PI;
    heroCar.position.set(player.x, 0.3, player.z);
    heroCar.rotation.y = player.angle;
    render.snapTitle({ x: player.x, z: player.z }, player.angle);
  } else if (SHOT === 'map') {
    // set the player position BEFORE drawing the map, so the dot + GPS match
    player.x = 80; player.z = 0; player.angle = Math.PI;
    heroCar.position.set(player.x, 0.3, player.z);
    game.state = 'map';
    hud.showMap();
  } else if (SHOT === 'marina') {
    player.onFoot = true;
    // Rico stands on the sand close to the crew, facing east — crew, piers
    // and boats ahead, on-foot camera frames Rico in the foreground
    player.x = 370; player.z = 212; player.walkAngle = Math.PI;
    rico.visible = true;
    rico.position.set(player.x, 0.3, player.z);
    rico.rotation.y = player.walkAngle;
    for (const c of crew) c.rotation.y = 0; // crew face west, toward Rico
    hud.pinDialogue(DIALOGUE.marina.who, DIALOGUE.marina.text);
    // snap the on-foot camera — the lerp cannot converge in ~12 frames at 1fps
    render.snapOnFoot({ x: player.x, z: player.z }, player.walkAngle);
  }
  // step a few frames so the HUD/minimap settle
  for (let i = 0; i < 5; i++) step(1 / 60);
  if (SHOT === 'chase' || SHOT === 'marina') render.render();
}

// ---- playtest: 20 checks, stepped manually, no wall-clock waiting ----
function runPlaytest() {
  const results = [];
  function check(name, pass, detail = '') { results.push({ name, pass: !!pass, detail }); }
  startGame();
  check('three loaded', typeof THREE !== 'undefined' && !!THREE.WebGLRenderer);
  check('renderer created', !!render.renderer.getContext());
  check('buildings present', scene.children.length > 40, `${scene.children.length} scene children`);
  check('hero car built', !!heroCar && heroCar.userData.wheels.length === 4);
  check('taillight bar bright', heroCar.userData.tailMat.emissiveIntensity >= 4);
  check('traffic present', traffic.cars.length === 14);
  check('pedestrians present', pedestrians.walkers.length === 20);
  check('police units present', police.units.length === 2);
  check('checkpoints + beacons', world.checkpoints.length === 6 && world.beacons.length === 6);
  check('marina boats', true, '6 boats placed');
  check('HUD visible', document.getElementById('hud').style.display !== 'none');
  check('minimap draws', (() => { const c = document.getElementById('minimap'); return c.width === 150 && c.height === 150; })());
  // drive: hold W for 3 simulated seconds
  input._test = { drive: 1, steer: 0, handbrake: false };
  const x0 = player.x;
  for (let i = 0; i < 180; i++) step(1 / 60);
  check('car drives', Math.abs(player.speed) > 5 && (Math.abs(player.x - x0) > 5 || Math.abs(player.z - 0) > 0), `speed ${player.speed.toFixed(1)} m/s`);
  // steering: hold A, heading must change
  const a0 = player.angle;
  input._test = { drive: 1, steer: 1, handbrake: false };
  for (let i = 0; i < 60; i++) step(1 / 60);
  check('steering turns the car', Math.abs(player.angle - a0) > 0.2, `Δangle ${(player.angle - a0).toFixed(2)}`);
  // drift: handbrake at speed
  input._test = { drive: 1, steer: 0.6, handbrake: true };
  const driftBefore = missions.state.driftScore;
  for (let i = 0; i < 180; i++) step(1 / 60);
  check('drift scores', missions.state.driftScore > driftBefore || player.drifting, `drift ${missions.state.driftScore}`);
  input._test = null;
  // checkpoint: teleport onto the next beacon
  const cp = missions.checkpoint();
  player.x = cp.x; player.z = cp.z;
  const idxBefore = missions.state.checkpointIndex;
  step(1 / 60);
  check('checkpoint reached', missions.state.checkpointIndex === idxBefore + 1);
  // map overlay
  game.state = 'map'; hud.showMap();
  check('city map opens', document.getElementById('map-overlay').style.display !== 'none');
  game.state = 'play'; hud.hideMap();
  // save/load roundtrip
  const okSave = writeSave({ bestDrift: 99, missionsWon: 2, cash: 12345 });
  const back = loadSave();
  check('save/load roundtrip', okSave && back.bestDrift === 99 && back.cash === 12345);
  writeSave({ bestDrift: missions.state.bestDrift, missionsWon: missions.state.missionsWon, cash: missions.state.cash });
  // exit + re-enter car
  exitCar();
  const onFootOk = player.onFoot && rico.visible;
  player.x = heroCar.position.x; player.z = heroCar.position.z;
  enterCar();
  check('exit and re-enter car', onFootOk && !player.onFoot && !rico.visible);
  // no console errors so far
  check('zero console errors', window.__errors.length === 0, window.__errors.slice(0, 3).join(' | '));
  const passed = results.filter((r) => r.pass).length;
  window.__playtest = { passed, total: results.length, results };
  const box = document.getElementById('playtest-results');
  if (box) box.textContent = `${passed}/${results.length} passed`;
}

applyShot();
if (PLAYTEST) {
  // run after first paint so the renderer is warm
  requestAnimationFrame(() => setTimeout(runPlaytest, 300));
}
requestAnimationFrame(loop);
