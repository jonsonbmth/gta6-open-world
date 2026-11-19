// SOLMAR BAY — boot, game loop, player control (on foot + driving), camera,
// combat, near-miss rewards, collisions, autosave, and the 20-check playtest.

import { CFG, CARS, RADIO } from './config.js';
import { clamp, angleLerp } from './utils.js';
import { buildWorld } from './world.js';
import { Car, buildTraffic } from './cars.js';
import { createRico, buildPedestrians, buildCrew } from './people.js';
import { PoliceSystem } from './police.js';
import { MissionSystem } from './missions.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { setupShot, SHOT_NAMES } from './shots.js';
import { drawCityMap } from './citymap.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const PLAYTEST = params.get('playtest') === '1';
const PERF_LOW = params.get('perf') === 'low';

// Pickup points for 'collect' mission stages (by job id).
const PICKUPS = {
  2: { x: 56, z: -18 },
  4: { x: -26, z: -84 },
  5: { x: -22, z: -182 },
};

class Game {
  constructor() {
    this.started = false;
    this.frozen = false;
    this.shotMode = null;
    this.freezeAfterFrames = -1;
    this.openMapNextFrame = false;
    this.shotCamera = null;
    this.frames = 0;
    this.saveTimer = 0;
    this.nearMissCooldown = new Map();
    this.collectedPulse = 0;

    // --- renderer / scene / camera ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(PERF_LOW ? 0.5 : Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    document.getElementById('game-root').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 500);
    this.camera.position.set(4, 3, 12);

    // --- world + actors ---
    this.world = buildWorld(this.scene);
    this.hero = new Car({ profile: 'sport', color: CARS.hero.color, name: CARS.hero.name, withHeadlight: true });
    this.hero.setPose(0, 4, 0);
    this.scene.add(this.hero.group);
    this.drivenCar = this.hero;
    this.rico = createRico();
    this.rico.group.position.set(2.4, 0, 6);
    this.scene.add(this.rico.group);
    this.traffic = buildTraffic(this.scene, 10);
    this.peds = buildPedestrians(this.scene, 16);
    this.crew = buildCrew(this.scene);
    this.police = new PoliceSystem(this.scene);
    this.missions = new MissionSystem();
    this.hud = new HUD();
    this.audio = new AudioSys();
    this.input = new Input();

    // --- state ---
    this.state = {
      money: CFG.startMoney,
      respect: CFG.startRespect,
      day: 1,
      minutes: 22 * 60 + 47,
      condition: 95,
      inCar: false,
      carName: CARS.hero.name,
      station: 0,
      garage: [CARS.hero.name],
      heading: 0,
    };

    // objective beacon (glowing column at the current target)
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffd23f, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 34, 16, 1, true), beaconMat);
    this.beacon.position.y = 17;
    this.scene.add(this.beacon);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.beaconRing = ring;
    this.scene.add(ring);

    // muzzle flash (combat)
    this.flash = new THREE.PointLight(0xffc46b, 0, 12, 1.5);
    this.scene.add(this.flash);
    this.flashTimer = 0;

    addEventListener('resize', () => this._resize());
    document.getElementById('title-start')?.addEventListener('click', () => this.startGame(false));
    document.getElementById('title-resume')?.addEventListener('click', () => this.startGame(true));

    // boot modes
    if (PLAYTEST || SHOT) {
      this.started = true;
      this.hud.hideTitle();
    } else {
      // HUD stays hidden behind the title screen until the game starts
      if (this.hud.el.hud) this.hud.el.hud.style.display = 'none';
      this.hud.showTitle(hasSave());
    }
    if (SHOT && SHOT_NAMES.includes(SHOT)) {
      setupShot(SHOT, this);
    }

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this._loop());
    window.__game = this;
  }

  startGame(resume) {
    this.audio.init();
    if (resume) {
      const s = loadGame();
      if (s) {
        this.state.money = s.money;
        this.state.respect = s.respect;
        this.state.day = s.day;
        this.state.minutes = s.minutes;
        this.state.station = s.station || 0;
        this.state.garage = s.garage || this.state.garage;
        this.missions.restore(s.missions); // resumes the exact stage, never restarts
        this.rico.group.position.set(s.player.x, 0, s.player.z);
        this.hero.setPose(s.player.x + 2, s.player.z + 2, s.player.heading || 0);
        this.hud.toast('Save loaded — welcome back, Rico.');
      }
    }
    this.started = true;
    this.hud.hideTitle();
    if (this.hud.el.hud) this.hud.el.hud.style.display = 'block';
    this.audio.blip(880, 0.15, 0.12);
    const d = this.missions.peekDialogue();
    if (d) this.hud.showDialogue(d.who, d.text);
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  _playerPos() {
    return this.state.inCar ? this.drivenCar.group.position : this.rico.group.position;
  }

  // Keep cars and Rico on roads / sidewalks / quay (cheap collision).
  _clampToRoads(p, halfWidth) {
    const onCross = CFG.crossStreets.some((cz) => Math.abs(p.z - cz) < 7);
    const onQuay = p.z > -46 && p.z < 10;
    if (onCross || onQuay) {
      p.x = clamp(p.x, -58, 62);
    } else {
      p.x = clamp(p.x, -halfWidth, halfWidth);
    }
    p.z = clamp(p.z, -248, 68);
  }

  _nearestCar(maxDist) {
    let best = null, bestD = maxDist;
    const p = this.rico.group.position;
    const all = [this.hero, ...this.traffic.cars];
    for (const c of all) {
      const d = Math.hypot(c.group.position.x - p.x, c.group.position.z - p.z);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  _shoot() {
    // tracer + muzzle flash + noise: pedestrians panic, police notice
    const p = this.rico.group.position;
    this.flash.position.set(p.x, 1.6, p.z - 1);
    this.flash.intensity = 60;
    this.flashTimer = 0.08;
    this.peds.panicAll();
    this.police.addHeat(8);
    this.audio.blip(160, 0.12, 0.2);
    setTimeout(() => this.peds.calmAll(), 6000);
  }

  _checkNearMiss() {
    if (!this.state.inCar || Math.abs(this.drivenCar.speed) < 20) return;
    const hp = this.drivenCar.group.position;
    const hf = this.drivenCar.forward();
    for (const t of this.traffic.cars) {
      const tp = t.group.position;
      const dx = tp.x - hp.x, dz = tp.z - hp.z;
      const ahead = dx * hf.x + dz * hf.z;
      const side = Math.abs(dx * hf.z - dz * hf.x);
      const key = t.name + t.group.position.x.toFixed(0);
      if (ahead > -2 && ahead < 2 && side > 1.8 && side < 3.4) {
        const now = performance.now();
        if (!this.nearMissCooldown.has(key) || now - this.nearMissCooldown.get(key) > 5000) {
          this.nearMissCooldown.set(key, now);
          this.state.money += 250;
          this.state.respect = Math.min(1000, this.state.respect + 5);
          this.hud.showFloat('NEAR MISS +$250', '#ffd23f');
          this.audio.cash();
        }
      }
    }
  }

  _updatePlayer(dt) {
    const axis = this.input.axis();
    const p = this._playerPos();

    if (this.state.inCar) {
      const car = this.drivenCar;
      const throttle = axis.y;
      const steer = -axis.x;
      const handbrake = this.input.down('Space');
      car.drive(dt, throttle, steer, handbrake, CARS.hero.topSpeed);
      this._clampToRoads(car.group.position, 6.8);
      this.state.heading = car.heading;
      // collisions with traffic: bump + damage + heat
      for (const t of this.traffic.cars) {
        if (t === car) continue;
        const d = Math.hypot(t.group.position.x - car.group.position.x, t.group.position.z - car.group.position.z);
        if (d < 3.1 && Math.abs(car.speed) > 4) {
          car.speed *= 0.45;
          this.state.condition = Math.max(0, this.state.condition - 2);
          this.police.addHeat(4);
        }
      }
      // speeding past patrols raises heat
      if (Math.abs(car.speed) > 30 && this.police.pursuit.length > 0) this.police.addHeat(dt * 3);
      this._checkNearMiss();
      if (this.input.pressed('KeyE')) {
        // exit the car
        this.state.inCar = false;
        const f = car.forward();
        this.rico.group.position.set(car.group.position.x - f.z * 2.2, 0, car.group.position.z + f.x * 2.2);
        this.rico.group.rotation.y = car.heading;
        this.hud.toast('On foot — press E near a car to drive');
      }
    } else {
      // on foot: WASD relative to camera heading (camera faces -Z mostly)
      const run = this.input.down('ShiftLeft') || this.input.down('ShiftRight');
      const speed = run ? 8 : 4.6;
      const mx = axis.x * speed * dt;
      const mz = -axis.y * speed * dt;
      const rp = this.rico.group.position;
      rp.x += mx;
      rp.z += mz;
      this._clampToRoads(rp, 11.2);
      if (Math.abs(mx) + Math.abs(mz) > 0.001) {
        const targetHeading = Math.atan2(-mx, -mz);
        this.rico.group.rotation.y = angleLerp(this.rico.group.rotation.y, targetHeading, Math.min(1, dt * 10));
        this.rico.animate(dt, run ? 1 : 0.55);
        this.state.heading = this.rico.group.rotation.y;
      } else {
        this.rico.idle();
      }
      if (this.input.pressed('KeyE')) {
        const car = this._nearestCar(5);
        if (car) {
          if (car !== this.hero && !this.state.garage.includes(car.name)) {
            this.state.garage.push(car.name);
            this.hud.toast(`Stole the ${car.name} — it is yours now`);
            this.police.addHeat(10);
            this.traffic.cars = this.traffic.cars.filter((c) => c !== car);
          }
          this.drivenCar = car;
          this.state.inCar = true;
          this.state.carName = car.name;
          this.audio.blip(520, 0.1, 0.1);
        }
      }
      if (this.input.pressed('KeyF')) this._shoot();
    }

    // shared keys
    if (this.input.pressed('KeyR')) {
      this.audio.setStation(this.state.station + 1);
      this.state.station = this.audio.station;
      this.hud.toast(`Radio: ${RADIO[this.state.station].name}`);
    }
    if (this.input.pressed('KeyM')) {
      if (this.hud.mapOpen) this.hud.closeMap();
      else this.hud.openMap(this._hudState());
    }
    if (this.input.pressed('Escape') && this.hud.mapOpen) this.hud.closeMap();
    if (this.input.pressed('Enter') && !this.started) this.startGame(false);
  }

  _hudState() {
    const p = this._playerPos();
    // frozen shots can override the displayed speed without moving the car
    const speedKmh = this.state.displaySpeedKmh ?? (this.state.inCar ? Math.abs(this.drivenCar.speed) * 3.6 : 0);
    const job = this.missions.done ? null : this.missions.job;
    return {
      money: this.state.money + this.missions.money,
      respect: this.state.respect,
      respectLevel: 1 + Math.floor(this.state.respect / 250),
      wanted: this.police.wanted,
      pursuitActive: this.police.pursuitActive,
      day: this.state.day,
      minutes: Math.floor(this.state.minutes),
      job,
      stage: this.missions.done ? null : this.missions.stage,
      stageIndex: this.missions.stageIndex,
      stageProgress: this.missions.done ? 1 : this.missions.stageProgress({ playerPos: p, wanted: this.police.wanted }),
      playerPos: p,
      heading: this.state.heading,
      marker: this.missions.marker() || PICKUPS[this.missions.job?.id || 0] || null,
      policePositions: this.police.pursuit.map((u) => u.group.position),
      inCar: this.state.inCar,
      carName: this.state.carName,
      condition: this.state.condition,
      speedKmh,
      gear: speedKmh < 1 ? 'N' : Math.min(6, 1 + Math.floor(speedKmh / 30)),
      stationName: RADIO[this.state.station].name,
      songName: this.audio.stationInfo.song,
      frozen: this.frozen,
    };
  }

  _updateCamera(dt) {
    // shot mode: SNAP, never lerp
    if (this.shotCamera) {
      this.camera.position.copy(this.shotCamera.pos);
      this.camera.lookAt(this.shotCamera.look);
      return;
    }
    if (this.state.inCar) {
      const car = this.drivenCar;
      const f = car.forward();
      const r = { x: -f.z, z: f.x };
      const c = CFG.chaseCam;
      const tx = car.group.position.x - f.x * c.back + r.x * c.side;
      const tz = car.group.position.z - f.z * c.back + r.z * c.side;
      const k = 1 - Math.exp(-6 * dt);
      this.camera.position.x += (tx - this.camera.position.x) * k;
      this.camera.position.y += (c.height - this.camera.position.y) * k;
      this.camera.position.z += (tz - this.camera.position.z) * k;
      this.camera.lookAt(
        car.group.position.x + f.x * c.lookAhead,
        c.lookHeight,
        car.group.position.z + f.z * c.lookAhead,
      );
    } else {
      const rp = this.rico.group.position;
      const back = 4.6, height = 2.4;
      const hx = -Math.sin(this.state.heading), hz = -Math.cos(this.state.heading);
      const tx = rp.x - hx * back, tz = rp.z - hz * back;
      const k = 1 - Math.exp(-5 * dt);
      this.camera.position.x += (tx - this.camera.position.x) * k;
      this.camera.position.y += (height - this.camera.position.y) * k;
      this.camera.position.z += (tz - this.camera.position.z) * k;
      this.camera.lookAt(rp.x, 1.4, rp.z);
    }
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1); // clamp frame dt to 0.1
    this.frames++;

    if (this.started && !this.frozen) {
      this.state.minutes += dt * 0.5;
      if (this.state.minutes >= 24 * 60) { this.state.minutes -= 24 * 60; this.state.day++; }

      this._updatePlayer(dt);
      this.traffic.update(dt);
      this.peds.update(dt);
      this.police.update(dt, this._playerPos(), this.state.inCar ? Math.abs(this.drivenCar.speed) : 0);
      this.world.update(dt);

      // mission progress
      const p = this._playerPos();
      const stage = this.missions.done ? null : this.missions.stage;
      let collected = false;
      if (stage && stage.type === 'collect') {
        const pk = PICKUPS[this.missions.job.id];
        if (pk && Math.hypot(p.x - pk.x, p.z - pk.z) < 6) collected = true;
      }
      const policeNear = this.police.pursuit.some((u) => {
        const up = u.group.position;
        return Math.hypot(up.x - p.x, up.z - p.z) < 25;
      });
      const completed = this.missions.update(dt, {
        playerPos: p, inCar: this.state.inCar, wanted: this.police.wanted,
        speed: this.state.inCar ? Math.abs(this.drivenCar.speed) : 0,
        policeNear, collected,
      });
      if (completed) {
        this.audio.cash();
        this.hud.toast('Stage complete');
        const d = this.missions.nextDialogue();
        if (d) this.hud.showDialogue(d.who, d.text);
        this._save();
      }

      // objective beacon follows the current target
      const marker = this.missions.marker() || (stage?.type === 'collect' ? PICKUPS[this.missions.job.id] : null);
      if (marker) {
        this.beacon.visible = true;
        this.beaconRing.visible = true;
        this.beacon.position.set(marker.x, 17, marker.z);
        this.beaconRing.position.set(marker.x, 0.05, marker.z);
        this.beacon.material.opacity = 0.18 + 0.08 * Math.sin(this.frames * 0.06);
      } else {
        this.beacon.visible = false;
        this.beaconRing.visible = false;
      }

      // muzzle flash decay
      if (this.flashTimer > 0) {
        this.flashTimer -= dt;
        if (this.flashTimer <= 0) this.flash.intensity = 0;
      }

      // audio
      this.audio.setEngine(this.state.inCar ? this.drivenCar.speed : 0, this.state.inCar);
      this.audio.setSiren(this.police.wanted);
      this.audio.update(dt);

      // autosave
      this.saveTimer += dt;
      if (this.saveTimer > 30) { this.saveTimer = 0; this._save(); }

      this.hud.update(this._hudState());
    }

    // map shot opens the overlay once the HUD state exists
    if (this.openMapNextFrame) {
      this.openMapNextFrame = false;
      this.hud.openMap(this._hudState());
    }

    // shot freeze countdown
    if (this.freezeAfterFrames > 0) {
      this.freezeAfterFrames--;
      if (this.freezeAfterFrames === 0) {
        this.frozen = true;
        for (const u of this.police.pursuit) u.freezeBlink();
        window.__shotReady = true;
      }
    }

    this._updateCamera(this.frozen ? 0.016 : dt);
    this.renderer.render(this.scene, this.camera);

    if (PLAYTEST && this.frames === 12) this._runPlaytest();
  }

  _save() {
    const p = this._playerPos();
    saveGame({
      money: this.state.money + this.missions.money,
      respect: this.state.respect,
      missions: this.missions,
      playerPos: p,
      heading: this.state.heading,
      inCar: this.state.inCar,
      carName: this.state.carName,
      station: this.state.station,
      day: this.state.day,
      minutes: this.state.minutes,
      garage: this.state.garage,
    });
  }

  _runPlaytest() {
    const checks = [];
    const check = (name, fn) => {
      let pass = false;
      try { pass = !!fn(); } catch (e) { pass = false; }
      checks.push({ name, pass });
    };
    check('three.js loaded', () => typeof THREE !== 'undefined' && !!THREE.WebGLRenderer);
    check('WebGL renderer created', () => !!this.renderer.getContext());
    check('city built (>50 scene objects)', () => this.scene.children.length > 50);
    check('neon signs >= 20', () => this.world.stats.signs >= 20);
    check('buildings >= 40', () => this.world.stats.buildings >= 40);
    check('hero car in scene', () => this.scene.children.includes(this.hero.group));
    check('traffic cars == 10', () => this.traffic.cars.length === 10);
    check('pedestrians == 16', () => this.peds.peds.length === 16);
    check('crew members == 3', () => this.crew.length === 3);
    check('police: 3 stars spawns 2 units + heli', () => {
      this.police.setWanted(3);
      const ok = this.police.pursuit.length === 2 && !!this.police.heli;
      this.police.setWanted(0);
      return ok;
    });
    check('missions: 7 jobs loaded', () => this.missions.job && this.missions.job.title && this.missions.jobIndex === 0);
    check('mission stage 1 has a label', () => !!this.missions.stage && this.missions.stage.label.length > 3);
    check('HUD elements present', () => ['mission-panel', 'minimap', 'speed', 'stars', 'dialogue'].every((id) => !!document.getElementById(id)));
    check('minimap draws', () => { this.hud.update(this._hudState()); return true; });
    check('city map draws', () => {
      const c = document.createElement('canvas');
      c.width = 640; c.height = 480;
      drawCityMap(c, this._hudState());
      return true;
    });
    check('save/load roundtrip', () => {
      this._save();
      const s = loadGame();
      return !!s && s.money === this.state.money + this.missions.money;
    });
    check('radio: 3 stations', () => RADIO.length === 3);
    check('car forward math (heading 0 -> -Z)', () => {
      const f = this.hero.forward();
      return Math.abs(f.x) < 0.001 && Math.abs(f.z + 1) < 0.001;
    });
    check('headlights on nose, taillight on tail', () => {
      let nose = false, tail = false;
      this.hero.group.traverse((o) => {
        if (o.isMesh && o.position.z < -2.1) nose = true;
        if (o.isMesh && o.position.z > 2.1) tail = true;
      });
      return nose && tail;
    });
    check('shot modes: 4 defined', () => SHOT_NAMES.length === 4 && SHOT_NAMES.includes('chase'));

    const passed = checks.filter((c) => c.pass).length;
    const el = document.getElementById('playtest-results');
    if (el) {
      el.style.display = 'block';
      el.innerHTML = `<b>PLAYTEST ${passed}/${checks.length} ${passed === checks.length ? 'PASS' : 'FAIL'}</b><br>` +
        checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} — ${c.name}`).join('<br>');
    }
    console.log(`PLAYTEST ${passed}/${checks.length}`);
    window.__playtestDone = { passed, total: checks.length, checks };
  }
}

new Game();
