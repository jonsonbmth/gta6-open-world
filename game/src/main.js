// SOLMAR BAY — main: boot, game loop, driving + walking, traffic, pedestrians,
// near-miss, missions, camera rig, and shot staging. The entry point the page
// loads as a module.
import * as THREE from 'three';
import { CITY, CHASE, rng, pick } from './config.js';
import { buildWorld } from './world.js';
import { buildCar, placeCar } from './cars.js';
import { buildRico, buildPedestrian } from './people.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { AudioEngine } from './audio.js';
import { saveGame, loadGame } from './save.js';
import { HUD } from './hud.js';
import { PostFX } from './bloom.js';
import { Input } from './input.js';
import { applyShot } from './shots.js';
import { runPlaytest } from './playtest.js';

const params = new URLSearchParams(window.location.search);
const SEED = parseInt(params.get('seed') || '1', 10);
const SHOT = params.get('shot');
const PLAYTEST = params.get('playtest') === '1';
const PERF_LOW = params.get('perf') === 'low';

const TRAFFIC_COLORS = [0x2a6ab0, 0xd8d4c8, 0x3a3a40, 0x7a2a8a, 0xc8a03a, 0x2a8a6a, 0x8a2a2a, 0x4a6a8a];

export class Game {
  constructor() {
    this.THREE = THREE;
    this.frame = 0;
    this.mode = 'title'; // 'title' | 'play'
    this.driving = false;
    this.speedKmh = 0;
    this.displaySpeedKmh = null;
    this.speed = 0; // m/s, signed
    this.heading = 0;
    this.gear = 1;
    this.money = 42780;
    this.respect = 320;
    this.respectLevel = 2;
    this.carCondition = 95;
    this.shotFrozen = false;
    this.shotName = null;
    this.saveTimer = 0;
    this.nearMissCooldown = new Map();
    this.errors = [];

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(PERF_LOW ? 0.5 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(-6, 2.4, -18);
    this.camera.lookAt(0, 1, 10);

    this.clock = new THREE.Clock();
    this.input = new Input();
    this.audio = new AudioEngine();
    this.missions = new Missions();
    this.rand = rng(SEED);

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('error', (e) => this.errors.push(e.message));
  }

  boot() {
    // World + systems.
    this.world = buildWorld(this.scene, SEED);
    this.police = new Police(this.scene);

    // Hero car (parked at the start spot until a shot or start moves it).
    this.heroCar = buildCar({ kind: 'sport', color: 0xd81e28, spoiler: true });
    placeCar(this.heroCar, 1.6, -12, 0);
    this.scene.add(this.heroCar.group);
    this.drivenCar = this.heroCar;

    // Rico.
    this.rico = buildRico();
    this.rico.group.position.set(3.5, 0, -12);
    this.scene.add(this.rico.group);
    this.walkPhase = 0;

    this.spawnTraffic();
    this.spawnPeds();

    this.hud = new HUD(this);
    this.post = new PostFX(this.renderer, window.innerWidth, window.innerHeight);

    // Restore a save (never in shot mode — shots must be deterministic).
    if (!SHOT) {
      const save = loadGame();
      if (save) {
        this.money = save.money ?? this.money;
        this.respect = save.respect ?? this.respect;
        this.missions.restore(save.missions);
        this.audio.station = save.station ?? 0;
        this.audio.setMuted(!!save.muted);
      }
    }

    // Shot staging (synchronous, before the first frame).
    if (SHOT) applyShot(this, SHOT);

    // Title mode hides the HUD until START (cleaner title screen + shot).
    if (this.mode === 'title') this.setHudVisible(false);

    window.SB = { game: this };
    this.renderer.setAnimationLoop(() => this.loop());
  }

  spawnTraffic() {
    this.traffic = [];
    const rand = rng(SEED + 500);
    // Avenue traffic: both directions, seeded lanes.
    for (let i = 0; i < 8; i++) {
      const dir = i % 2 ? 1 : -1;
      const car = buildCar({
        kind: pick(rand, ['sedan', 'sedan', 'suv', 'sport']),
        color: pick(rand, TRAFFIC_COLORS),
        spoiler: false,
      });
      const x = dir > 0 ? 3.5 : -3.5;
      const z = -130 + rand() * 260;
      placeCar(car, x, z, dir > 0 ? 0 : Math.PI);
      this.scene.add(car.group);
      this.traffic.push({ car, kind: 'avenue', dir, speed: 9 + rand() * 4, x });
    }
    // Cross-street traffic.
    for (let i = 0; i < 4; i++) {
      const car = buildCar({ kind: pick(rand, ['sedan', 'suv']), color: pick(rand, TRAFFIC_COLORS), spoiler: false });
      const z = [-90, -45, 45, 90][i];
      const dir = i % 2 ? 1 : -1;
      const x = -120 + rand() * 240;
      placeCar(car, x, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      this.scene.add(car.group);
      this.traffic.push({ car, kind: 'cross', dir, speed: 8 + rand() * 4, z });
    }
  }

  spawnPeds() {
    this.peds = [];
    const rand = rng(SEED + 900);
    // Sidewalk walkers along the avenue.
    for (let i = 0; i < 14; i++) {
      const ped = buildPedestrian(1000 + i * 7);
      const side = i % 2 ? 1 : -1;
      const x = side * (CITY.avenueHalfWidth + 1.8);
      const z = -120 + rand() * 240;
      ped.group.position.set(x, 0.22, z);
      ped.group.rotation.y = rand() > 0.5 ? 0 : Math.PI;
      this.scene.add(ped.group);
      this.peds.push({
        ped, kind: 'walk', x, dir: ped.group.rotation.y === 0 ? 1 : -1,
        speed: 1.1 + rand() * 0.6, phase: rand() * 6, down: 0,
      });
    }
    // Marina strollers on the quay.
    for (let i = 0; i < 6; i++) {
      const ped = buildPedestrian(2000 + i * 11);
      const x = CITY.marinaX - 10 + rand() * 36;
      const z = -34 + rand() * 68;
      ped.group.position.set(x, 0.47, z);
      ped.group.rotation.y = rand() * Math.PI * 2;
      this.scene.add(ped.group);
      this.peds.push({
        ped, kind: 'marina', x, z, dir: 1,
        speed: 0.8 + rand() * 0.5, phase: rand() * 6, down: 0,
        wander: rand() * Math.PI * 2,
      });
    }
  }

  // --- Mode / car control ------------------------------------------------------
  setHudVisible(v) {
    const ids = ['mission-panel', 'status-panel', 'minimap-wrap', 'vehicle-panel',
      'dialogue-box', 'action-text', 'hint-bar', 'save-note'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.style.display = v ? '' : 'none';
    }
    // The dialogue box's CSS default is display:none; showDialogue sets flex.
  }

  startGame() {
    if (this.mode === 'play') return;
    this.mode = 'play';
    const title = document.getElementById('title-screen');
    if (title) title.style.display = 'none';
    this.setHudVisible(true);
    this.audio.init();
    this.audio.resume();
    // Resume shows the current objective dialogue.
    const d = this.missions.dialogue();
    this.hud.showDialogue(d.key, d.speaker, d.color, d.line);
  }

  enterCarAt(x, z, heading) {
    placeCar(this.heroCar, x, z, heading);
    this.drivenCar = this.heroCar;
    this.driving = true;
    this.heading = heading;
    this.rico.group.visible = false;
    this.speed = 0;
    this.speedKmh = 0;
  }

  exitCarAt(x, z, heading) {
    this.driving = false;
    this.rico.group.visible = true;
    this.rico.group.position.set(x, 0, z);
    this.rico.group.rotation.y = heading;
    this.heading = heading;
    this.speed = 0;
    this.speedKmh = 0;
    // Park the hero car out of the marina frame (behind the camera).
    placeCar(this.heroCar, 84, -16, Math.PI / 2);
  }

  setDrivingSpeed(mps) {
    this.speed = mps;
    this.speedKmh = Math.abs(mps) * 3.6;
  }

  playerPos() {
    if (this.driving) return this.drivenCar.group.position;
    return this.rico.group.position;
  }

  hudState() { return this.hud.hudState(); }

  // --- Camera --------------------------------------------------------------------
  chaseCamPos(out) {
    const car = this.drivenCar.group;
    const back = CHASE.camBack, side = CHASE.camSide, height = CHASE.camHeight;
    const h = car.rotation.y;
    const fx = Math.sin(h), fz = Math.cos(h); // forward
    const rx = Math.cos(h), rz = -Math.sin(h); // right
    out.set(
      car.position.x - fx * back + rx * side,
      height,
      car.position.z - fz * back + rz * side,
    );
    return out;
  }

  snapChaseCamera() {
    const pos = this.chaseCamPos(new THREE.Vector3());
    this.camera.position.copy(pos);
    const car = this.drivenCar.group;
    const h = car.rotation.y;
    this.camera.lookAt(
      car.position.x + Math.sin(h) * CHASE.camLookAhead,
      1.4,
      car.position.z + Math.cos(h) * CHASE.camLookAhead,
    );
  }

  updateCamera(dt) {
    if (this.shotName === 'title' && this.titleCamera) {
      this.camera.position.copy(this.titleCamera);
      this.camera.lookAt(this.titleLookAt);
      return;
    }
    if (this.shotName === 'marina' && this.marinaCamera) {
      this.camera.position.copy(this.marinaCamera);
      this.camera.lookAt(this.marinaLookAt);
      return;
    }
    if (this.driving) {
      const target = this.chaseCamPos(new THREE.Vector3());
      const k = this.shotFrozen ? 1 : 1 - Math.exp(-5 * dt);
      this.camera.position.lerp(target, k);
      const car = this.drivenCar.group;
      const h = car.rotation.y;
      this.camera.lookAt(
        car.position.x + Math.sin(h) * CHASE.camLookAhead,
        1.4,
        car.position.z + Math.cos(h) * CHASE.camLookAhead,
      );
    } else {
      // Third-person foot camera.
      const r = this.rico.group;
      const h = r.rotation.y;
      const target = new THREE.Vector3(
        r.position.x - Math.sin(h) * 5.5,
        2.9,
        r.position.z - Math.cos(h) * 5.5,
      );
      const k = this.shotFrozen ? 1 : 1 - Math.exp(-6 * dt);
      this.camera.position.lerp(target, k);
      this.camera.lookAt(r.position.x + Math.sin(h) * 4, 1.3, r.position.z + Math.cos(h) * 4);
    }
  }

  // --- Interaction ---------------------------------------------------------------
  tryEnterExitCar() {
    if (this.driving) {
      const car = this.drivenCar.group;
      const h = car.rotation.y;
      const x = car.position.x + Math.cos(h) * 2.2;
      const z = car.position.z - Math.sin(h) * 2.2;
      this.driving = false;
      this.rico.group.visible = true;
      this.rico.group.position.set(x, 0, z);
      this.rico.group.rotation.y = h;
      this.heading = h;
      this.speed = 0;
      this.speedKmh = 0;
      this.audio.blip(660, 0.1, 0.1);
      return;
    }
    // Find the nearest car within reach (steal any car).
    const rp = this.rico.group.position;
    let best = null, bestD = 4;
    const candidates = [this.heroCar, ...this.traffic.map((t) => t.car)];
    for (const c of candidates) {
      const d = c.group.position.distanceTo(rp);
      if (d < bestD) { best = c; bestD = d; }
    }
    if (best) {
      // Remove from traffic if it was a traffic car.
      this.traffic = this.traffic.filter((t) => t.car !== best);
      this.drivenCar = best;
      this.driving = true;
      this.heading = best.group.rotation.y;
      this.rico.group.visible = false;
      this.speed = 0;
      this.speedKmh = 0;
      this.police.addHeat(12); // stealing is noticed
      this.audio.blip(880, 0.12, 0.12);
    }
  }

  // --- Mission triggers ------------------------------------------------------------
  checkMissionTriggers() {
    const st = this.missions.currentStage();
    const pos = this.playerPos();
    // 'Lose the heat' / 'Outrun' stages: latch at wanted >= 2, complete at 0.
    if (/Lose the heat|Outrun the/.test(st.text)) {
      if (this.police.wanted >= 2) this.missions.stageLatched = true;
      if (this.missions.stageLatched && this.police.wanted === 0) {
        this.completeStage();
      }
      return;
    }
    if (st.target) {
      const d = Math.hypot(pos.x - st.target.x, pos.z - st.target.z);
      if (d < 9) this.completeStage();
    }
  }

  completeStage() {
    const res = this.missions.advance();
    if (res === 'chapter' || res === 'done') {
      this.money += 500;
      this.respect += 60;
      this.respectLevel = Math.min(5, 1 + Math.floor(this.respect / 300));
      this.hud.showAction(res === 'done' ? 'JOB COMPLETE — SOLMAR BAY IS YOURS' : 'CHAPTER COMPLETE +$500', 3200);
    }
    const d = this.missions.dialogue();
    this.hud.showDialogue(d.key, d.speaker, d.color, d.line);
    this.audio.blip(990, 0.15, 0.12);
    this.doSave();
  }

  doSave() {
    const pos = this.playerPos();
    saveGame({
      money: this.money, respect: this.respect,
      missions: this.missions.serialize(),
      station: this.audio.station, muted: this.audio.muted,
      player: { x: pos.x, z: pos.z },
      car: this.driving ? { x: pos.x, z: pos.z } : null,
    });
    const note = document.getElementById('save-note');
    if (note) {
      note.style.display = 'block';
      setTimeout(() => { note.style.display = 'none'; }, 1800);
    }
  }

  // --- Main loop --------------------------------------------------------------------
  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1); // dt clamp 0.1
    const t = this.clock.elapsedTime;
    this.frame++;

    if (!this.shotFrozen) {
      this.update(dt, t);
    }
    this.updateCamera(dt);
    this.hud.update(dt);
    this.post.render(this.scene, this.camera, t);

    if (PLAYTEST && this.frame === 6 && !this.playtestDone) {
      this.playtestDone = true;
      runPlaytest(this);
    }
  }

  update(dt, t) {
    const input = this.input;
    // Global keys (consume-on-read).
    if (input.pressedOnce('KeyM') || input.pressedOnce('Escape')) {
      if (this.mode === 'play') this.hud.toggleMap();
    }
    if (input.pressedOnce('KeyR')) {
      this.audio.nextStation();
      this.audio.blip(740, 0.08, 0.08);
    }
    if (input.pressedOnce('KeyN')) this.audio.setMuted(!this.audio.muted);
    if (input.pressedOnce('KeyE') && this.mode === 'play') this.tryEnterExitCar();
    if (input.pressedOnce('KeyF') && this.mode === 'play') this.doAction();
    if (input.pressedOnce('Enter') && this.mode === 'title') this.startGame();

    if (this.mode !== 'play') {
      this.world.update(dt, t);
      this.updateTraffic(dt);
      this.updatePeds(dt);
      return;
    }

    if (this.driving) this.updateDriving(dt);
    else this.updateWalking(dt);

    this.updateTraffic(dt);
    this.updatePeds(dt);
    this.police.update(dt, this.playerPos(), Math.abs(this.speed), t);
    this.world.update(dt, t);
    this.checkMissionTriggers();
    this.checkNearMiss();

    // Wanted decay when no police can see the player.
    if (this.police.units.length === 0 && this.police.heat > 0) {
      this.police.addHeat(-3 * dt);
    }
    this.audio.setEngine(this.speedKmh, this.driving);
    this.audio.siren(this.police.wanted > 0);

    // Periodic save.
    this.saveTimer += dt;
    if (this.saveTimer > 12) {
      this.saveTimer = 0;
      this.doSave();
    }
  }

  doAction() {
    // F: contextual action — honk while driving, wave on foot.
    if (this.driving) {
      this.audio.blip(392, 0.25, 0.14);
      setTimeout(() => this.audio.blip(330, 0.25, 0.12), 120);
    } else {
      this.audio.blip(520, 0.1, 0.08);
    }
  }

  updateDriving(dt) {
    const input = this.input;
    const car = this.drivenCar.group;
    const accel = input.driveAxis();
    const steer = input.steerAxis();
    const handbrake = input.isDown('Space');

    if (accel > 0) this.speed += 14 * dt;
    else if (accel < 0) this.speed -= this.speed > 0.5 ? 26 * dt : 8 * dt;
    else this.speed *= Math.pow(0.4, dt); // drag
    if (handbrake) this.speed *= Math.pow(0.08, dt);
    this.speed = Math.max(-12, Math.min(52, this.speed)); // ~187 km/h top
    this.speedKmh = Math.abs(this.speed) * 3.6;
    this.gear = Math.max(1, Math.min(6, 1 + Math.floor(this.speedKmh / 32)));

    const steerAmount = steer * Math.min(1, Math.abs(this.speed) / 8) * (this.speed < 0 ? -1 : 1);
    car.rotation.y += steerAmount * 1.35 * dt * (handbrake ? 1.6 : 1);
    this.heading = car.rotation.y;
    car.position.x += Math.sin(car.rotation.y) * this.speed * dt;
    car.position.z += Math.cos(car.rotation.y) * this.speed * dt;
    // Stay in the world.
    car.position.x = Math.max(-158, Math.min(158, car.position.x));
    car.position.z = Math.max(-150, Math.min(150, car.position.z));
    this.drivenCar.spinWheels(this.speed * dt);
    this.drivenCar.setBrake(accel < 0 || handbrake);

    // Collisions with traffic (simple circles).
    for (const tr of this.traffic) {
      const d = tr.car.group.position.distanceTo(car.position);
      if (d < 3.4) {
        this.speed *= 0.35;
        this.carCondition = Math.max(10, this.carCondition - 6);
        this.police.addHeat(10);
        this.audio.blip(180, 0.2, 0.16);
        // Push the traffic car aside a little.
        const push = 2.2;
        tr.car.group.position.x += (tr.car.group.position.x - car.position.x) * 0.1 * push;
        tr.car.group.position.z += (tr.car.group.position.z - car.position.z) * 0.1 * push;
      }
    }
  }

  updateWalking(dt) {
    const input = this.input;
    const r = this.rico.group;
    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = run ? 7 : 4;
    let mx = 0, mz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    // Movement is camera-relative (camera looks along the player's heading).
    const h = this.heading;
    const fx = Math.sin(h), fz = Math.cos(h);
    const rx = Math.cos(h), rz = -Math.sin(h);
    const wx = fx * mz + rx * mx;
    const wz = fz * mz + rz * mx;
    const len = Math.hypot(wx, wz);
    if (len > 0.01) {
      const nx = wx / len, nz = wz / len;
      r.position.x += nx * speed * dt;
      r.position.z += nz * speed * dt;
      const targetH = Math.atan2(nx, nz);
      let dh = targetH - r.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      r.rotation.y += dh * Math.min(1, 10 * dt);
      this.heading = r.rotation.y;
      this.walkPhase += dt * speed * 1.6;
      this.rico.setWalk(this.walkPhase, run ? 1.4 : 1);
      this.speedKmh = speed * 3.6;
    } else {
      this.rico.setIdle(this.clock.elapsedTime);
      this.speedKmh = 0;
    }
    r.position.x = Math.max(-158, Math.min(158, r.position.x));
    r.position.z = Math.max(-150, Math.min(150, r.position.z));
  }

  updateTraffic(dt) {
    for (const tr of this.traffic) {
      const g = tr.car.group;
      let speed = tr.speed;
      // Slow down if the player is right ahead.
      const pp = this.playerPos();
      const ahead = tr.kind === 'avenue'
        ? (tr.dir > 0 ? pp.z - g.position.z : g.position.z - pp.z)
        : (tr.dir > 0 ? pp.x - g.position.x : g.position.x - pp.x);
      const lateral = tr.kind === 'avenue' ? Math.abs(pp.x - g.position.x) : Math.abs(pp.z - g.position.z);
      if (ahead > 0 && ahead < 12 && lateral < 3.5) speed = Math.min(speed, 3);
      if (tr.kind === 'avenue') {
        g.position.z += tr.dir * speed * dt;
        if (g.position.z > 145) g.position.z = -145;
        if (g.position.z < -145) g.position.z = 145;
      } else {
        g.position.x += tr.dir * speed * dt;
        if (g.position.x > 145) g.position.x = -145;
        if (g.position.x < -145) g.position.x = 145;
      }
      tr.car.spinWheels(speed * dt);
    }
  }

  updatePeds(dt) {
    for (const p of this.peds) {
      if (p.down > 0) {
        p.down -= dt;
        if (p.down <= 0) {
          // Respawn on a sidewalk.
          p.ped.group.rotation.x = 0;
          p.ped.group.position.set(p.x ?? -9, 0.22, -120 + Math.random() * 240);
          p.ped.group.visible = true;
        }
        continue;
      }
      p.phase += dt * p.speed * 1.8;
      p.ped.setWalk(p.phase, 1);
      if (p.kind === 'walk') {
        p.ped.group.position.z += p.dir * p.speed * dt;
        if (p.ped.group.position.z > 130) { p.dir = -1; p.ped.group.rotation.y = Math.PI; }
        if (p.ped.group.position.z < -130) { p.dir = 1; p.ped.group.rotation.y = 0; }
      } else {
        // Marina wander.
        p.wander += (Math.random() - 0.5) * 0.4 * dt;
        p.ped.group.position.x += Math.cos(p.wander) * p.speed * dt;
        p.ped.group.position.z += Math.sin(p.wander) * p.speed * dt;
        p.ped.group.rotation.y = Math.atan2(Math.cos(p.wander), Math.sin(p.wander));
        const qx = p.ped.group.position.x, qz = p.ped.group.position.z;
        if (qx < CITY.marinaX - 22 || qx > CITY.marinaX + 30) p.wander += Math.PI;
        if (qz < -38 || qz > 38) p.wander += Math.PI;
      }
      // Hit by the player's car: knock down, add heat.
      if (this.driving && Math.abs(this.speed) > 3) {
        const d = p.ped.group.position.distanceTo(this.playerPos());
        if (d < 2.4) {
          p.down = 4;
          p.ped.group.rotation.x = -Math.PI / 2;
          p.ped.group.position.y = 0.35;
          this.police.addHeat(18);
          this.speed *= 0.6;
          this.audio.blip(140, 0.25, 0.18);
        }
      }
    }
  }

  checkNearMiss() {
    if (!this.driving || this.speedKmh < 60) return;
    const pp = this.playerPos();
    const now = performance.now();
    for (const tr of this.traffic) {
      const tp = tr.car.group.position;
      const dx = tp.x - pp.x, dz = tp.z - pp.z;
      const lat = Math.abs(dx * Math.cos(this.heading) - dz * Math.sin(this.heading));
      const lon = dx * Math.sin(this.heading) + dz * Math.cos(this.heading);
      if (lat < 2.6 && lon > -6 && lon < 6) {
        const last = this.nearMissCooldown.get(tr.car) || 0;
        if (now - last > 5000) {
          this.nearMissCooldown.set(tr.car, now);
          this.money += 250;
          this.respect += 5;
          this.hud.showAction('NEAR MISS +$250');
          this.audio.nearMiss();
        }
      }
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.post.setSize(window.innerWidth, window.innerHeight);
  }
}

const game = new Game();
game.boot();
export { game };
