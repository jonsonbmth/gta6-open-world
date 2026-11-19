// SOLMAR BAY: A Night in the Rain — game bootstrap + loop.
// An open-world crime game in the spirit of GTA 6: drive and walk a neon
// coastal city in a storm, run 7 story jobs, dodge the police, save progress.
// Rendering: three.js (vendored) + the custom bloom composer (bloom.js) with
// ACES tone mapping. Everything runs offline from static files.
import * as THREE from 'three';
import { buildWorld, makeGlowSprite } from './world.js';
import { makeHeroCar, makeTrafficCar, placeCar } from './cars.js';
import { makeRico, makeCrewMember, makePerson, animatePerson, updatePeople } from './people.js';
import { Police } from './police.js';
import { JOBS, JobRunner } from './jobs.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import * as saveModule from './save.js';
import { createBloom } from './bloom.js';
import { stageShot } from './shots.js';
import { runPlaytest } from './playtest.js';
import { mulberry32, clamp, rand } from './util.js';

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '1', 10);
const LOW_PERF = params.has('perf') && params.get('perf') === 'low';

function districtAt(x, z) {
  if (x > 75) return 'SOLMAR BAY';
  if (x < -20 && z < -30) return 'CROWN HEIGHTS';
  if (x > 10 && z < -30) return 'MIRAMAR';
  if (x < -40 && z < 50 && z >= -10) return 'VELA QUARTER';
  if (z > 60 && x < -20) return 'PALM ROW';
  if (x > 30 && z > 60) return 'THE DOCKS';
  if (x > -10 && z > 60) return 'HARBOUR LIGHTS';
  if (x > 10 && z > 10 && z <= 60) return 'DOCKSIDE';
  if (Math.abs(x) < 12) return 'SOLMAR AVENUE';
  return 'SOLMAR BAY';
}

export class Game {
  constructor() {
    this.frame = 0;
    this.mode = 'title'; // title | drive | foot | map | garage
    this.frozen = false;
    this.shotName = null;
    this.displaySpeedKmh = null;
    this.starBlink = 1;
    this.gear = 1;
    this.money = 42780;
    this.respect = 320;
    this.day = 1;
    this.minutes = 22 * 60 + 47; // 22:47
    this.condition = 100;
    this.cameraRig = { back: 6.8, side: 1.4, height: 2.6, lookAhead: 6 };
    this.target = null;
    this.jobsModule = { JOBS };
    this.saveModule = saveModule;

    this._setupRenderer();
    this._setupScene();
    this._setupActors();
    this._setupInput();
    this._setupUI();

    this.jobs = new JobRunner();
    this.hud = new HUD();
    this.audio = new AudioSys();
    this.clock = new THREE.Clock();
    this._lastSave = 0;
    this._nearMissCd = 0;
    this._heatTimer = 0;

    window.SB = { game: this };
    this._bootShotOrPlaytest();
    this._loop();
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(LOW_PERF ? 0.5 : Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // ACES lives in the composer
    document.getElementById('scene').appendChild(this.renderer.domElement);
    addEventListener('resize', () => this._onResize());
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070714);
    this.scene.fog = new THREE.FogExp2(0x0a0a18, 0.0038);
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 600);
    this.camera.position.set(-1, 2.8, 46);

    const hemi = new THREE.HemisphereLight(0x8a7fd8, 0x1a1426, 0.95);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xbfd0ff, 0.9);
    moon.position.set(-60, 90, -40);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -120;
    moon.shadow.camera.right = 120;
    moon.shadow.camera.top = 120;
    moon.shadow.camera.bottom = -120;
    moon.shadow.camera.far = 300;
    this.scene.add(moon);

    this.world = buildWorld(this.scene, SEED);
    this.composer = createBloom(this.renderer, this.scene, this.camera, {
      threshold: 0.85,
      strength: 0.85,
      exposure: 1.28,
    });
    this.composer.setSize(innerWidth, innerHeight);
  }

  _setupActors() {
    const rng = mulberry32(SEED * 31 + 7);
    // Hero car parked near the marina spawn; Rico on the quay.
    this.heroCar = makeHeroCar();
    placeCar(this.heroCar, 38, 40, Math.PI / 2);
    this.scene.add(this.heroCar);
    this.heroSpeed = 0;
    this.heroHeading = Math.PI / 2;

    this.rico = makeRico();
    this.rico.position.set(45, 0, 40);
    this.rico.rotation.y = Math.PI / 2;
    this.scene.add(this.rico);
    this.onFoot = true;
    this.ricoHeading = Math.PI / 2;
    this.ricoSpeed = 0;

    // Crew at the marina.
    this.crew = {};
    const mama = makeCrewMember('Mama Rosa');
    mama.position.set(42, 0, 36);
    const lena = makeCrewMember('Lena "Wrench" Ortiz');
    lena.position.set(48, 0, 44);
    const dario = makeCrewMember('Dario "Fuze" Kane');
    dario.position.set(44, 0, 46);
    this.scene.add(mama, lena, dario);
    this.crew = { mama, lena, dario };

    // Traffic on the avenue lanes.
    this.traffic = [];
    for (let i = 0; i < 8; i++) {
      const car = makeTrafficCar(rng);
      const lane = i % 2 === 0 ? -3.5 : 3.5;
      const heading = lane < 0 ? 0 : Math.PI;
      placeCar(car, lane, -100 + i * 26, heading);
      car.userData.speed = rand(rng, 8, 12);
      car.userData.lane = lane;
      this.scene.add(car);
      this.traffic.push(car);
    }

    // Pedestrians on sidewalks + quay.
    this.pedestrians = [];
    for (let i = 0; i < 14; i++) {
      const p = makePerson(rng);
      if (i < 4) {
        p.position.set(rand(rng, 34, 62), 0.6, rand(rng, 24, 56));
      } else {
        p.position.set((i % 2 === 0 ? -1 : 1) * rand(rng, 8.5, 10.5), 0, rand(rng, -100, 95));
      }
      this.scene.add(p);
      this.pedestrians.push(p);
    }

    this.police = new Police(this.scene);
  }

  _setupInput() {
    this.keys = {};
    this.pressed = new Set(); // consume-on-read queue for single-press actions
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _consume(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  _setupUI() {
    const start = document.getElementById('btn-start');
    if (start) start.addEventListener('click', () => this.startGame(false));
    const cont = document.getElementById('btn-continue');
    if (cont) {
      if (saveModule.hasSave()) cont.style.display = 'inline-block';
      cont.addEventListener('click', () => this.startGame(true));
    }
    const garageBtn = document.getElementById('btn-garage-close');
    if (garageBtn) garageBtn.addEventListener('click', () => this._toggleGarage(false));
  }

  startGame(resume) {
    this.audio.ensure();
    this.hideTitleScreen();
    if (resume) {
      const s = saveModule.loadGame();
      if (s) {
        this.money = s.money;
        this.respect = s.respect;
        this.jobs.setJob(s.jobIndex, s.stageIndex);
        this.police.setWanted(s.wanted);
        this.audio.setStation(s.station);
        if (s.pos) this.setPlayerPos(s.pos[0], s.pos[1], this.ricoHeading, !s.onFoot);
        const d = this.jobs.job.intro;
        this.hud.showDialogue(d.speaker, d.text);
      }
    } else {
      this.setPlayerPos(45, 40, Math.PI / 2, false);
      const d = this.jobs.job.intro;
      this.hud.showDialogue(d.speaker, d.text);
    }
    this.setMode(this.onFoot ? 'foot' : 'drive');
  }

  setMode(m) {
    this.mode = m;
    if (m === 'map') this.hud.showMap();
    else this.hud.hideMap();
  }

  showTitleScreen() {
    const el = document.getElementById('title-screen');
    if (el) el.classList.add('visible');
  }

  hideTitleScreen() {
    const el = document.getElementById('title-screen');
    if (el) el.classList.remove('visible');
  }

  setPlayerPos(x, z, heading, inCar) {
    if (inCar) {
      this.onFoot = false;
      placeCar(this.heroCar, x, z, heading);
      this.heroHeading = heading;
      this.heroSpeed = 0;
      this.rico.visible = false;
    } else {
      this.onFoot = true;
      this.rico.position.set(x, 0, z);
      this.rico.rotation.y = heading;
      this.ricoHeading = heading;
      this.rico.visible = true;
    }
  }

  setTarget(t) {
    this.target = t;
  }

  placeCrew(x1, z1, x2, z2) {
    this.crew.mama.position.set(x1, 0.6, z1);
    this.crew.lena.position.set(x2, 0.6, z2);
    this.crew.mama.lookAt(this.rico.position.x, 0.6, this.rico.position.z);
    this.crew.lena.lookAt(this.rico.position.x, 0.6, this.rico.position.z);
  }

  playerPos() {
    return this.onFoot ? this.rico.position : this.heroCar.position;
  }

  snapCamera() {
    // k=1 snap: place the camera exactly at the rig position (frozen shots).
    const p = this.playerPos();
    const h = this.onFoot ? this.ricoHeading : this.heroHeading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const rx = Math.cos(h);
    const rz = -Math.sin(h);
    const r = this.cameraRig;
    this.camera.position.set(
      p.x - fx * r.back + rx * r.side,
      r.height,
      p.z - fz * r.back + rz * r.side,
    );
    this.camera.lookAt(p.x + fx * r.lookAhead, 1.1, p.z + fz * r.lookAhead);
  }

  _updateCamera(dt) {
    if (this.mode === 'title' || this.mode === 'map' || this.mode === 'garage') return;
    const p = this.playerPos();
    const h = this.onFoot ? this.ricoHeading : this.heroHeading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const rx = Math.cos(h);
    const rz = -Math.sin(h);
    const r = this.cameraRig;
    const tx = p.x - fx * r.back + rx * r.side;
    const ty = r.height;
    const tz = p.z - fz * r.back + rz * r.side;
    const k = this.frozen ? 1 : 1 - Math.exp(-6 * dt);
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (ty - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;
    this.camera.lookAt(p.x + fx * r.lookAhead, 1.1, p.z + fz * r.lookAhead);
  }

  hudState() {
    const p = this.playerPos();
    const st = this.audio.stationInfo();
    const speedKmh = this.displaySpeedKmh ?? Math.round(Math.abs(this.heroSpeed) * 3.6);
    return {
      chapter: this.jobs.job.chapter,
      jobTitle: this.jobs.job.title,
      objective: this.jobs.currentObjective(),
      next: this.jobs.currentNext(),
      stageIndex: this.jobs.stageIndex + 1,
      stageCount: this.jobs.stageCount,
      day: this.day,
      timeStr: `${String(Math.floor(this.minutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(this.minutes % 60)).padStart(2, '0')}`,
      money: this.money,
      district: districtAt(p.x, p.z),
      respect: this.respect,
      respectLevel: 2 + Math.floor(this.respect / 500),
      radioStation: st.name,
      radioSong: st.song,
      carName: this.onFoot ? 'ON FOOT' : 'VULPINE S',
      condition: this.condition,
      speedKmh,
      gear: this.onFoot ? 0 : Math.max(1, Math.min(6, Math.floor(speedKmh / 30) + 1)),
      onFoot: this.onFoot,
      wanted: this.police.wanted,
      starBlink: this.starBlink,
      pos: { x: p.x, z: p.z },
      heading: this.onFoot ? this.ricoHeading : this.heroHeading,
      target: this.target,
      police: this.police.units.map((u) => ({ x: u.group.position.x, z: u.group.position.z })),
    };
  }

  _targetForCurrentStage() {
    const j = this.jobs.jobIndex;
    const s = this.jobs.stageIndex;
    if (j === 0 && s === 0) return { x: this.heroCar.position.x, z: this.heroCar.position.z, r: 4 };
    if (j === 0 && s === 1) return { x: -60, z: 95, r: 8 };
    if (j === 0 && s === 3) return { x: -60, z: 95, r: 8 };
    if (j === 1 && s === 0) return { x: 35, z: 25, r: 8 };
    if (j === 1 && s === 2) return { x: 60, z: 85, r: 8 };
    if (j === 2 && s === 0) return { x: 45, z: 40, r: 8 };
    if (j === 3 && s === 0) return { x: -60, z: 10, r: 8 };
    if (j === 4 && s === 0) return { x: -60, z: -80, r: 8 };
    if (j === 5 && s === 0) return { x: 60, z: 85, r: 8 };
    if (j === 6) return { x: [-30, 0, -60][s] ?? -30, z: [20, -40, -80][s] ?? 20, r: 8 };
    return null;
  }

  _onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }

  _toggleGarage(open) {
    const el = document.getElementById('garage-screen');
    if (!el) return;
    if (open) {
      el.classList.add('visible');
      this.setMode('garage');
    } else {
      el.classList.remove('visible');
      this.setMode(this.onFoot ? 'foot' : 'drive');
    }
  }

  _bootShotOrPlaytest() {
    const shot = params.get('shot');
    const playtest = params.has('playtest');
    const debugCam = params.get('debug') === 'cam';
    // Let a few frames render first so everything exists. Headless capture
    // renders slowly, so only wait 3 frames — staging needs no more.
    let waited = 0;
    const tick = () => {
      if (++waited < 3) {
        requestAnimationFrame(tick);
        return;
      }
      if (debugCam) {
        this.camera.position.set(45, 60, 40);
        this.camera.lookAt(45, 0, 40);
        this.frozen = true;
      } else if (shot) {
        this.audio.ensure();
        stageShot(this, shot);
      } else if (playtest) {
        runPlaytest(this);
      }
    };
    requestAnimationFrame(tick);
  }

  _loop() {
    const step = () => {
      requestAnimationFrame(step);
      const dt = Math.min(this.clock.getDelta(), 0.1); // dt clamp 0.1
      if (!this.frozen) this._update(dt);
      this.composer.render();
      this.frame++;
    };
    requestAnimationFrame(step);
  }

  _update(dt) {
    const t = this.clock.elapsedTime;
    this.minutes += dt * 0.5;
    if (this.minutes >= 24 * 60) {
      this.minutes -= 24 * 60;
      this.day++;
    }
    this._nearMissCd = Math.max(0, this._nearMissCd - dt);

    // Single-press actions (consume-on-read).
    if (this._consume('KeyM')) {
      if (this.mode === 'map') this.setMode(this.onFoot ? 'foot' : 'drive');
      else if (this.mode === 'drive' || this.mode === 'foot') this.setMode('map');
    }
    if (this._consume('KeyR')) {
      const st = this.audio.setStation(this.audio.station + 1);
      this.hud.showDialogue('RADIO', st.name + ' — ' + st.song, 2500);
    }
    if (this._consume('KeyN')) this.audio.toggleMute();
    if (this._consume('KeyE')) this._tryEnterExit();
    if (this._consume('KeyF')) this._tryAction();
    if (this._consume('KeyG')) {
      const p = this.playerPos();
      if (Math.hypot(p.x + 60, p.z - 95) < 12) this._toggleGarage(this.mode !== 'garage');
    }

    if (this.mode === 'drive') this._updateDriving(dt);
    else if (this.mode === 'foot') this._updateOnFoot(dt, t);

    this._updateTraffic(dt);
    updatePeople(this.pedestrians, dt, t, this.mode === 'drive' && Math.abs(this.heroSpeed) > 15 ? this.heroCar.position : null);
    this.police.update(dt, t, this.playerPos(), this.onFoot ? this.ricoHeading : this.heroHeading, this.heroSpeed);
    this.audio.siren(this.police.wanted > 0);
    this.audio.setEngine(this.onFoot ? 0 : Math.abs(this.heroSpeed) / 42, this.mode === 'drive');
    this.world.update(dt, t);
    this._updateCamera(dt);

    // Job progress: reach-target + wanted latch.
    this.jobs.observeWanted(this.police.wanted);
    const tgt = this._targetForCurrentStage();
    this.target = tgt ? { x: tgt.x, z: tgt.z } : null;
    if (tgt && this.jobs.stage.event === 'reach-target') {
      const p = this.playerPos();
      if (Math.hypot(p.x - tgt.x, p.z - tgt.z) < tgt.r) this._fireEvent('reach-target');
    }
    if (this.jobs.stage.event === 'lose-heat') {
      const r = this.jobs.onEvent('lose-heat', this.police.wanted);
      if (r) this._onStageAdvanced(r);
    }

    // Wanted decay: no police near for a while -> heat bleeds off.
    if (this.police.wanted > 0) {
      const p = this.playerPos();
      const near = this.police.units.some((u) => u.group.position.distanceTo(p) < 40);
      if (!near) {
        this._heatTimer += dt;
        if (this._heatTimer > 8) {
          this._heatTimer = 0;
          this.police.setWanted(this.police.wanted - 1);
        }
      } else {
        this._heatTimer = 0;
      }
    }

    // Wanted star blink (pulse while pursued).
    this.starBlink = this.police.wanted > 0 ? 0.65 + 0.35 * Math.sin(t * 6) : 1;

    this.hud.update(this.hudState());

    // Autosave every 30 s.
    if (t - this._lastSave > 30) {
      this._lastSave = t;
      this._saveNow();
    }
  }

  _saveNow() {
    const p = this.playerPos();
    saveModule.saveGame({
      money: this.money,
      respect: this.respect,
      jobIndex: this.jobs.jobIndex,
      stageIndex: this.jobs.stageIndex,
      wanted: this.police.wanted,
      station: this.audio.station,
      pos: { x: p.x, z: p.z },
      onFoot: this.onFoot,
    });
  }

  _fireEvent(event) {
    const r = this.jobs.onEvent(event, this.police.wanted);
    if (r) this._onStageAdvanced(r);
  }

  _onStageAdvanced(r) {
    if (r.dialogue) this.hud.showDialogue(r.dialogue.speaker, r.dialogue.text);
    if (r.jobComplete) {
      this.money += 1500;
      this.respect += 80;
      this.hud.actionText('JOB COMPLETE +$1,500');
    }
    this._saveNow();
  }

  _tryEnterExit() {
    if (this.mode === 'drive') {
      // Exit the car: Rico steps out beside it.
      const p = this.heroCar.position;
      this.setPlayerPos(p.x + 2.2, p.z, this.heroHeading, false);
      this.setMode('foot');
      return;
    }
    if (this.mode !== 'foot') return;
    const p = this.rico.position;
    // Nearest car within 4 units.
    let best = null;
    let bestD = 4;
    const candidates = [this.heroCar, ...this.traffic];
    for (const c of candidates) {
      const d = Math.hypot(c.position.x - p.x, c.position.z - p.z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best) return;
    if (best !== this.heroCar) {
      // Stealing a car draws heat.
      this.police.addWanted(1);
      this.hud.actionText('CAR STOLEN — HEAT +1');
    }
    this.heroCar = best;
    this.heroHeading = best.rotation.y;
    this.setPlayerPos(best.position.x, best.position.z, this.heroHeading, true);
    this.setMode('drive');
    this._fireEvent('enter-car');
  }

  _tryAction() {
    const st = this.jobs.stage;
    if (st.event === 'pickup' || st.event === 'talk' || st.event === 'deliver') {
      const tgt = this._targetForCurrentStage();
      const p = this.playerPos();
      if (!tgt || Math.hypot(p.x - tgt.x, p.z - tgt.z) < 12) this._fireEvent(st.event);
    }
  }

  _updateDriving(dt) {
    const k = this.keys;
    const accel = k.KeyW || k.ArrowUp ? 1 : 0;
    const brake = k.KeyS || k.ArrowDown ? 1 : 0;
    const left = k.KeyA || k.ArrowLeft ? 1 : 0;
    const right = k.KeyD || k.ArrowRight ? 1 : 0;
    const handbrake = !!k.Space;

    if (accel) this.heroSpeed += 15 * dt;
    else if (brake) this.heroSpeed -= 26 * dt;
    else this.heroSpeed -= this.heroSpeed * 0.4 * dt;
    if (handbrake) this.heroSpeed -= this.heroSpeed * 2.2 * dt;
    this.heroSpeed = clamp(this.heroSpeed, -12, 42);

    const steer = (right - left) * clamp(Math.abs(this.heroSpeed) / 10, 0, 1) * (this.heroSpeed < 0 ? -1 : 1);
    this.heroHeading += steer * 1.5 * dt;
    this.heroCar.position.x += Math.sin(this.heroHeading) * this.heroSpeed * dt;
    this.heroCar.position.z += Math.cos(this.heroHeading) * this.heroSpeed * dt;
    this.heroCar.rotation.y = this.heroHeading;
    // City bounds.
    this.heroCar.position.x = clamp(this.heroCar.position.x, -112, 112);
    this.heroCar.position.z = clamp(this.heroCar.position.z, -116, 106);
    // Wheels spin.
    this.heroCar.children.forEach((c) => {
      if (c.children && c.children.length === 2 && c.position.y > 0.3 && c.position.y < 0.6) {
        c.rotation.x += (this.heroSpeed / 0.4) * dt;
      }
    });

    // Near miss: fast pass close beside a traffic car.
    if (Math.abs(this.heroSpeed) > 20 && this._nearMissCd <= 0) {
      for (const car of this.traffic) {
        const dx = car.position.x - this.heroCar.position.x;
        const dz = car.position.z - this.heroCar.position.z;
        if (Math.abs(dx) < 3.2 && Math.abs(dx) > 1.6 && Math.abs(dz) < 5) {
          this.money += 250;
          this.hud.actionText('NEAR MISS +$250');
          this._nearMissCd = 5;
          break;
        }
      }
    }
    // Hitting a pedestrian draws heat.
    for (const p of this.pedestrians) {
      if (Math.abs(this.heroSpeed) > 8 && p.position.distanceTo(this.heroCar.position) < 2) {
        p.userData.panic = true;
        if (this.police.wanted < 5) this.police.addWanted(1);
        this.condition = Math.max(20, this.condition - 4);
        p.position.x += (p.position.x > this.heroCar.position.x ? 3 : -3);
      }
    }
  }

  _updateOnFoot(dt, t) {
    const k = this.keys;
    let mx = 0;
    let mz = 0;
    if (k.KeyW || k.ArrowUp) mz += 1;
    if (k.KeyS || k.ArrowDown) mz -= 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    const moving = mx !== 0 || mz !== 0;
    const run = !!k.ShiftLeft || !!k.ShiftRight;
    const speed = run ? 7 : 4;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      // Movement is camera-relative-ish: forward is -Z of the camera yaw.
      // Keep it simple: world-aligned (W = -Z on the avenue).
      const wx = mx;
      const wz = -mz;
      this.ricoHeading = Math.atan2(wx, wz);
      this.rico.position.x += wx * speed * dt;
      this.rico.position.z += wz * speed * dt;
      this.rico.position.x = clamp(this.rico.position.x, -112, 112);
      this.rico.position.z = clamp(this.rico.position.z, -116, 106);
      this.ricoSpeed = speed;
    } else {
      this.ricoSpeed = 0;
    }
    this.rico.rotation.y = this.ricoHeading;
    animatePerson(this.rico, dt, t, moving);
  }

  _updateTraffic(dt) {
    for (const car of this.traffic) {
      const u = car.userData;
      // Slow down if the hero is ahead in the same lane.
      let target = u.speed;
      if (!this.onFoot) {
        const dx = this.heroCar.position.x - car.position.x;
        const dz = this.heroCar.position.z - car.position.z;
        const ahead = car.rotation.y === 0 ? dz > 0 && dz < 10 : dz < 0 && dz > -10;
        if (ahead && Math.abs(dx) < 3) target = 0;
      }
      u.speed += (target - u.speed) * Math.min(1, dt * 2);
      car.position.z += Math.cos(car.rotation.y) * u.speed * dt;
      if (car.position.z > 108) car.position.z = -108;
      if (car.position.z < -108) car.position.z = 108;
    }
  }
}

new Game();
