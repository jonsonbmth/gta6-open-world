// SOLMAR BAY V5 — main entry: renderer, game loop, input, camera, driving,
// on-foot play, missions, wanted, garage, save. Bright neon night by design:
// exposure 1.5, strong hemisphere light, neon everywhere, wet reflective road.
import * as THREE from 'three';
import { buildCity, CITY } from './city.js';
import { makeHeroCar, makePoliceCar, randomTrafficCar, updatePoliceLights } from './vehicles.js';
import { makePedestrian, makeRico, animateWalker } from './people.js';
import { Police } from './police.js';
import { currentJob, advanceStage, nextObjective, CREW } from './missions.js';
import { showHud, updateHud, drawMinimap, drawBigMap, setDialogue, floatText, toast, districtAt, setDistrict } from './hud.js';
import { startRadio, stopRadio, startEngine, setEngine, startSiren, stopSiren, startRain, blip, gunshot, setMuted } from './audio.js';
import { freshState, loadSave, saveGame, RADIO, PAINTS } from './state.js';
import { autosave, garageItems, buyGarageItem, hasSave } from './save.js';
import { shotParam, STAGES } from './shots.js';
import { mulberry32, nightEnvTexture, clamp } from './util.js';

const $ = (id) => document.getElementById(id);

// Mission objective spots (world coords).
const SPOTS = {
  impound: { x: -42, z: -60, label: 'IMPOUND LOT' },
  marina: { x: -18, z: 172, label: 'OLD HARBOUR' },
  pawn: { x: 42, z: 20, label: 'GILDED PAWN' },
  rosa: { x: -38, z: -140, label: "ROSA'S" },
  avenue: { x: 0, z: -100, label: 'LUMEN AVENUE' },
  downtown: { x: -10, z: -170, label: 'DOWNTOWN' },
  mirage: { x: 44, z: -140, label: 'MIRAGE HOTEL' },
  bridge: { x: 0, z: -205, label: 'NORTH BRIDGE' },
  garage: { x: -30, z: 100, label: 'GARAGE' },
  safehouse: { x: 20, z: -120, label: 'SAFEHOUSE' },
  ferry: { x: 30, z: 178, label: 'FERRY DOCK' },
  westside: { x: -80, z: 20, label: 'WESTSIDE' },
};
const JOB_TARGETS = [
  ['impound', 'impound', 'loseHeat', 'garage'],
  ['marina', 'marina', 'safehouse'],
  ['pawn', 'pawn', 'rosa'],
  ['avenue', 'avenue', 'garage'],
  ['downtown', 'downtown', 'marina'],
  ['ferry', 'westside', 'rosa'],
  ['mirage', 'mirage', 'bridge', 'bridge'],
];

class Game {
  constructor() {
    this.state = loadSave() || freshState();
    this.mode = 'title'; // title | play | pause | map | garage | over
    this.inCar = true;
    this.heroSpeed = 0; // m/s
    this.heroHeading = Math.PI;
    this.steer = 0;
    this.driftCombo = 0;
    this.driftTimer = 0;
    this.nearMissCooldown = 0;
    this.bustedTimer = 0;
    this.keys = {};
    this.camMode = 'title';
    this.camOffset = new THREE.Vector3(6.5, 3.4, 14);
    this.camPos = new THREE.Vector3(0, 8, 140);
    this.camLook = new THREE.Vector3(0, 1, 0);
    this.time = 0;
    this.shot = shotParam();
    this.frames = 0;
    this.traffic = [];
    this.peds = [];
    this.rnd = mulberry32(20261118);
    this.muzzleFlash = 0;
    this.initThree();
    this.initWorld();
    this.initInput();
    this.initHud();
    this.maybeStageShot();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    window.__game = this;
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.55; // BRIGHT: the V4 rejection was darkness
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    $('game-root').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.environment = nightEnvTexture();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 8, 140);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initWorld() {
    this.city = buildCity(this.scene);
    this.police = new Police(this.scene);
    // hero car + Rico
    this.hero = makeHeroCar(PAINTS[this.state.paint % PAINTS.length].color);
    this.hero.position.set(2.5, 0, 60);
    this.hero.rotation.y = Math.PI;
    this.scene.add(this.hero);
    this.rico = makeRico();
    this.rico.visible = false;
    this.scene.add(this.rico);
    // traffic
    for (let i = 0; i < 11; i++) {
      const car = randomTrafficCar(this.rnd);
      const lane = this.rnd() < 0.5 ? -5.5 : 5.5;
      const dir = lane < 0 ? 1 : -1;
      car.position.set(lane, 0, -190 + i * 32 + this.rnd() * 10);
      car.rotation.y = dir > 0 ? 0 : Math.PI;
      this.scene.add(car);
      this.traffic.push({ mesh: car, lane, dir, speed: 9 + this.rnd() * 6 });
    }
    // pedestrians on both sidewalks + marina
    for (let i = 0; i < 16; i++) {
      const ped = makePedestrian(100 + i * 7);
      const onMarina = i >= 13;
      ped.position.set(
        onMarina ? -30 + (i - 13) * 14 : (i % 2 === 0 ? -14.5 : 14.5),
        0,
        onMarina ? 168 + (i - 13) * 4 : -180 + i * 24,
      );
      ped.rotation.y = (i % 2 === 0 ? 0 : Math.PI) + (onMarina ? Math.PI / 2 : 0);
      this.scene.add(ped);
      this.peds.push(ped);
    }
    // parked cars on the quay, in the on-foot camera's view (frame centre at the quay is x≈0)
    for (const [px, pz] of [[7, 173], [-11, 175], [1, 179]]) {
      const car = randomTrafficCar(this.rnd);
      car.position.set(px, 0, pz);
      car.rotation.y = Math.PI / 2;
      this.scene.add(car);
    }
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Enter') this.onEnter();
      if (e.code === 'KeyP') this.togglePause();
      if (e.code === 'KeyM') this.toggleMap();
      if (e.code === 'KeyG') this.toggleGarage();
      if (e.code === 'KeyR') this.cycleRadio();
      if (e.code === 'Escape') this.closeOverlays();
      if (e.code === 'KeyE') this.onInteract();
      if (e.code === 'KeyF') this.onPunch();
      if (e.code.startsWith('Digit')) this.onDigit(Number(e.code.slice(5)));
      if (e.code === 'KeyX') { this.state.muted = !this.state.muted; setMuted(this.state.muted); }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('mousedown', (e) => {
      if (this.mode === 'play' && e.button === 0) this.onShoot();
    });
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  initHud() {
    const save = hasSave();
    $('title-save').textContent = save
      ? `SAVE FOUND — DAY ${this.state.day} · $${this.state.money.toLocaleString('en-US')} · JOB ${this.state.jobIndex + 1}/7 (ENTER TO CONTINUE)`
      : 'A NEW STORY — PRESS ENTER';
    setDialogue('lena', currentJob(this.state).lines[0]);
  }

  maybeStageShot() {
    if (!this.shot || !STAGES[this.shot]) return;
    // Staged shots start straight in play mode (except the title shot).
    if (this.shot !== 'title') {
      this.mode = 'play';
      showHud(true);
      this.state.started = true;
    }
    STAGES[this.shot](this);
    this.updateHudAll();
  }

  // --- mode transitions ---
  onEnter() {
    if (this.mode === 'title') {
      this.mode = 'play';
      this.state.started = true;
      showHud(true);
      this.camMode = this.inCar ? 'chase' : 'foot';
      this.camOffset.set(4.6, 2.1, 8.6);
      startRadio(this.state.radioStation);
      startEngine();
      startRain();
      if (this.state.wanted >= 3) startSiren();
      blip(880, 0.1);
    } else if (this.mode === 'over') {
      this.restartAfterOver();
    } else if (this.mode === 'pause') {
      this.togglePause();
    }
  }

  togglePause() {
    if (this.mode === 'play') {
      this.mode = 'pause';
      $('pause-screen').classList.remove('hidden');
      $('pause-stats').innerHTML = `DAY ${this.state.day} &nbsp;·&nbsp; $${this.state.money.toLocaleString('en-US')} &nbsp;·&nbsp; JOB ${this.state.jobIndex + 1}/7<br>RESPECT ${this.state.respectLevel} &nbsp;·&nbsp; WANTED ${'★'.repeat(this.state.wanted)}${'☆'.repeat(5 - this.state.wanted)}`;
    } else if (this.mode === 'pause') {
      this.mode = 'play';
      $('pause-screen').classList.add('hidden');
    }
  }

  toggleMap() {
    if (this.mode === 'play') this.openMap();
    else if (this.mode === 'map') this.closeOverlays();
  }

  openMap() {
    this.mode = 'map';
    $('map-screen').classList.remove('hidden');
    const t = this.missionTarget();
    const heading = this.inCar ? this.heroHeading : this.rico.rotation.y;
    drawBigMap(this.playerPos().x, this.playerPos().z, heading, this.state.wanted, t, SPOTS.garage, SPOTS.safehouse);
  }

  toggleGarage() {
    if (this.mode === 'garage') { this.closeOverlays(); return; }
    if (this.mode !== 'play') return;
    this.mode = 'garage';
    this.renderGarage();
    $('garage-screen').classList.remove('hidden');
  }

  renderGarage() {
    const items = garageItems(this.state);
    $('garage-list').innerHTML = items.map((it) =>
      `<div><b>[${it.key}]</b> ${it.name} — ${it.desc} — <b>$${it.price.toLocaleString('en-US')}</b> ${it.can ? '' : '(CAN\'T AFFORD)'}</div>`).join('')
      + `<div style="margin-top:10px">Your money: <b>$${this.state.money.toLocaleString('en-US')}</b></div>`;
  }

  closeOverlays() {
    $('map-screen').classList.add('hidden');
    $('garage-screen').classList.add('hidden');
    $('pause-screen').classList.add('hidden');
    if (this.mode === 'map' || this.mode === 'garage' || this.mode === 'pause') this.mode = 'play';
  }

  cycleRadio() {
    if (this.mode !== 'play') return;
    this.state.radioStation = (this.state.radioStation + 1) % RADIO.length;
    startRadio(this.state.radioStation);
    blip(660, 0.07);
  }

  onDigit(n) {
    if (this.mode === 'garage') {
      const item = buyGarageItem(this.state, String(n));
      if (item) {
        toast(`${item.name} — purchased!`);
        if (n === 3) this.repaintHero();
        if (n === 4) this.police.syncCount(0, this.hero.position);
        this.renderGarage();
        blip(990, 0.12);
      }
      return;
    }
    if (this.mode !== 'play') return;
    if (n >= 1 && n <= 5) {
      this.state.weapon = n - 1;
      blip(520, 0.05);
    }
  }

  repaintHero() {
    const color = PAINTS[this.state.paint % PAINTS.length].color;
    this.hero.traverse((o) => {
      if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial) o.material.color.setHex(color);
    });
  }

  onInteract() {
    if (this.mode !== 'play') return;
    if (this.inCar) {
      // exit the car
      this.inCar = false;
      this.state.onFoot = true;
      this.heroSpeed = 0;
      this.rico.position.copy(this.hero.position).add(new THREE.Vector3(2.2, 0, 0));
      this.rico.rotation.copy(this.hero.rotation);
      this.rico.visible = true;
      this.camMode = 'foot';
      blip(440, 0.08);
    } else {
      // enter the nearest car (hero or traffic) within range
      let best = null;
      let bestD = 4;
      const near = [this.hero, ...this.traffic.map((t) => t.mesh)];
      for (const m of near) {
        const d = m.position.distanceTo(this.rico.position);
        if (d < bestD) { bestD = d; best = m; }
      }
      if (best) {
        this.inCar = true;
        this.state.onFoot = false;
        this.rico.visible = false;
        if (best !== this.hero) {
          // steal it: it becomes the hero car
          this.hero.position.copy(best.position);
          this.hero.rotation.copy(best.rotation);
          best.visible = false;
          this.state.carName = 'STOLEN SEDAN';
          this.state.carCondition = 80;
          this.raiseWanted(1);
          toast('Car stolen — the city saw that.');
        }
        this.camMode = 'chase';
        blip(700, 0.08);
        this.checkStage('pressE');
      }
    }
  }

  onPunch() {
    if (this.mode !== 'play' || this.inCar) return;
    blip(180, 0.09, 0.12);
    // scare nearby pedestrians
    for (const p of this.peds) {
      if (p.position.distanceTo(this.rico.position) < 6) p.userData.panic = true;
    }
  }

  onShoot() {
    if (this.mode !== 'play') return;
    const w = this.state.weapon;
    if (w === 0) { this.onPunch(); return; }
    if (this.state.ammo[w] <= 0) { blip(220, 0.06); toast('Out of ammo — visit Lena.'); return; }
    this.state.ammo[w] -= 1;
    gunshot();
    this.muzzleFlash = 0.08;
    this.raiseWanted(1);
    // hit the nearest pedestrian or traffic car roughly ahead
    const from = this.inCar ? this.hero.position : this.rico.position;
    const heading = this.inCar ? this.hero.rotation.y : this.rico.rotation.y;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    for (const p of this.peds) {
      const dx = p.position.x - from.x, dz = p.position.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d < 30 && (dx * fx + dz * fz) / (d || 1) > 0.7) {
        p.userData.panic = true;
        toast('Careful — the city is watching.');
        break;
      }
    }
  }

  raiseWanted(n) {
    this.state.wanted = clamp(this.state.wanted + n, 0, 5);
    if (this.state.wanted >= 3) startSiren(); else stopSiren();
  }

  setDialogue(crew, text) { setDialogue(crew, text); }
  showFloater(text) { floatText(text); }

  // Static floater for staged shots: shown directly, never fades away.
  showFloaterStatic(text) {
    const el = document.getElementById('floater');
    el.textContent = text;
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -50%) scale(1.15)';
  }

  // Snap the camera to its target immediately (staged shots only) — no lerp,
  // so the framing is exact even at very low headless frame rates.
  snapCamera() {
    this.updateCamera(10);
    this.camPos.copy(this.camera.position);
    const look = new THREE.Vector3();
    this.camera.getWorldDirection(look);
    this.camLook.copy(this.camera.position).addScaledVector(look, 10);
  }

  playerPos() {
    return this.inCar ? this.hero.position : this.rico.position;
  }

  missionTarget() {
    const key = JOB_TARGETS[this.state.jobIndex][Math.min(this.state.jobStage, JOB_TARGETS[this.state.jobIndex].length - 1)];
    if (key === 'loseHeat') return null;
    return SPOTS[key] || null;
  }

  checkStage(trigger) {
    const key = JOB_TARGETS[this.state.jobIndex][Math.min(this.state.jobStage, JOB_TARGETS[this.state.jobIndex].length - 1)];
    if (key === 'loseHeat') {
      if (this.state.wanted === 0) this.completeStage();
      return;
    }
    const t = SPOTS[key];
    if (!t) return;
    const d = Math.hypot(this.playerPos().x - t.x, this.playerPos().z - t.z);
    if (trigger === 'pressE' && d < 14) this.completeStage();
    else if (trigger === 'reach' && d < 14) this.completeStage();
  }

  completeStage() {
    const res = advanceStage(this.state);
    blip(990, 0.14, 0.12);
    if (res.completedJob) {
      toast(`JOB DONE — +$${res.pay.toLocaleString('en-US')}`);
      const job = currentJob(this.state);
      this.setDialogue(job.crew, job.lines[0]);
      autosave(this.state);
      if (res.finishedStory) {
        toast('STORY COMPLETE — Solmar Bay is yours, Rico.');
      }
    } else {
      toast(`STAGE CLEAR — ${nextObjective(this.state)}`);
    }
    this.updateHudAll();
  }

  restartAfterOver() {
    this.state.health = 100;
    this.state.wanted = 0;
    this.state.busted = false;
    this.state.wasted = false;
    this.state.money = Math.max(0, this.state.money - 500);
    this.hero.position.set(2.5, 0, 60);
    this.hero.rotation.y = Math.PI;
    this.heroSpeed = 0;
    this.inCar = true;
    this.state.onFoot = false;
    this.rico.visible = false;
    this.police.syncCount(0, this.hero.position);
    $('gameover-screen').classList.add('hidden');
    this.mode = 'play';
    this.updateHudAll();
  }

  gameOver(kind) {
    if (this.mode === 'over') return;
    this.mode = 'over';
    if (kind === 'busted') {
      this.state.busted = true;
      $('gameover-title').textContent = 'BUSTED';
      $('gameover-text').textContent = 'Solmar Bay PD took you in. The Comet stays in the impound — and so does $500 of your money.';
    } else {
      this.state.wasted = true;
      $('gameover-title').textContent = 'WASTED';
      $('gameover-text').textContent = 'The rain keeps falling on Lumen Avenue. Rico will be back — the city always gives one more chance.';
    }
    $('gameover-screen').classList.remove('hidden');
    stopSiren();
  }

  updateHudAll() {
    updateHud(this.state, this.police.rowsForHud(), this.state.speedKmh);
    setDistrict(districtAt(this.playerPos().x, this.playerPos().z));
  }

  // --- per-frame updates ---
  updateDriving(dt) {
    const k = this.keys;
    const throttle = k['KeyW'] || k['ArrowUp'] ? 1 : 0;
    const brake = k['KeyS'] || k['ArrowDown'] ? 1 : 0;
    const left = k['KeyA'] || k['ArrowLeft'] ? 1 : 0;
    const right = k['KeyD'] || k['ArrowRight'] ? 1 : 0;
    const handbrake = k['Space'] ? 1 : 0;
    const topSpeed = 42 + this.state.upgrades.engine * 6; // m/s
    const accel = throttle ? 16 : brake ? -22 : -6;
    this.heroSpeed = clamp(this.heroSpeed + accel * dt, 0, topSpeed);
    if (handbrake) this.heroSpeed = Math.max(0, this.heroSpeed - 26 * dt);
    const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
    this.steer = THREE.MathUtils.lerp(this.steer, steerTarget, dt * 6);
    const spd = this.heroSpeed;
    const turnRate = this.steer * (0.9 + (handbrake ? 1.1 : 0)) * clamp(spd / 12, 0, 1);
    this.heroHeading += turnRate * dt * (spd > 0.5 ? 1 : 0);
    // drift: handbrake + steer at speed
    if (handbrake && Math.abs(this.steer) > 0.6 && spd > 14) {
      this.driftTimer += dt;
      if (this.driftTimer > 0.8 && this.driftCombo < 3) {
        this.driftCombo += 1;
        this.driftTimer = 0;
        floatText(`DRIFT x${this.driftCombo}`);
        this.state.money += 100 * this.driftCombo;
        blip(1200, 0.1);
      }
    } else {
      this.driftTimer = 0;
      this.driftCombo = 0;
    }
    const fx = Math.sin(this.heroHeading);
    const fz = Math.cos(this.heroHeading);
    this.hero.position.x += fx * spd * dt;
    this.hero.position.z += fz * spd * dt;
    // stay in the city: avenue + cross streets + marina
    const z = this.hero.position.z;
    const onCross = CITY.crossZ.some((cz) => Math.abs(z - cz) < 6);
    const maxX = z > 150 ? 55 : onCross ? 120 : 18.5;
    this.hero.position.x = clamp(this.hero.position.x, -maxX, maxX);
    this.hero.position.z = clamp(this.hero.position.z, -205, 195);
    this.hero.rotation.y = this.heroHeading;
    // body roll + pitch for feel
    this.hero.rotation.z = -this.steer * 0.06 * clamp(spd / 20, 0, 1);
    this.hero.rotation.x = throttle ? -0.02 : brake ? 0.03 : 0;
    this.state.speedKmh = spd * 3.6;
    setEngine(this.state.speedKmh, throttle);
    // near miss: fast pass close to traffic
    this.nearMissCooldown -= dt;
    if (spd > 20 && this.nearMissCooldown <= 0) {
      for (const t of this.traffic) {
        const d = t.mesh.position.distanceTo(this.hero.position);
        if (d < 4.5 && d > 2.6) {
          this.nearMissCooldown = 3;
          this.state.money += 250;
          floatText('NEAR MISS +$250');
          blip(1400, 0.12);
          break;
        }
      }
    }
    // ramming traffic damages the car + raises heat
    for (const t of this.traffic) {
      const d = t.mesh.position.distanceTo(this.hero.position);
      if (d < 2.6 && spd > 6) {
        this.state.carCondition = Math.max(0, this.state.carCondition - 4);
        this.heroSpeed *= 0.6;
        this.raiseWanted(1);
        blip(140, 0.15, 0.15);
        break;
      }
    }
    if (this.state.carCondition <= 0) this.gameOver('wasted');
  }

  updateWalking(dt) {
    const k = this.keys;
    const f = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const s = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
    const moving = f !== 0 || s !== 0;
    const speed = 6;
    const heading = this.rico.rotation.y;
    if (moving) {
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const rx = Math.cos(heading), rz = -Math.sin(heading);
      this.rico.position.x += (fx * f + rx * s) * speed * dt;
      this.rico.position.z += (fz * f + rz * s) * speed * dt;
      this.rico.position.x = clamp(this.rico.position.x, -60, 60);
      this.rico.position.z = clamp(this.rico.position.z, -205, 195);
    }
    if (k['KeyA'] || k['ArrowLeft']) this.rico.rotation.y += dt * 2.4;
    if (k['KeyD'] || k['ArrowRight']) this.rico.rotation.y -= dt * 2.4;
    animateWalker(this.rico, dt, moving);
    this.state.speedKmh = moving ? 12 : 0;
  }

  updateTraffic(dt) {
    for (const t of this.traffic) {
      if (!t.mesh.visible) continue;
      // slow down if the hero is right ahead
      let speed = t.speed;
      const ahead = new THREE.Vector3(t.mesh.position.x, 0, t.mesh.position.z + t.dir * 8);
      if (ahead.distanceTo(this.hero.position) < 7 && this.inCar) speed = 2;
      t.mesh.position.z += t.dir * speed * dt;
      if (t.mesh.position.z > 205) t.mesh.position.z = -205;
      if (t.mesh.position.z < -205) t.mesh.position.z = 205;
    }
  }

  updatePeds(dt) {
    const heroPos = this.playerPos();
    for (const p of this.peds) {
      const u = p.userData;
      const dHero = p.position.distanceTo(heroPos);
      if (this.state.wanted >= 3 && dHero < 14) u.panic = true;
      if (u.panic) {
        // run away from the hero
        const dx = p.position.x - heroPos.x;
        const dz = p.position.z - heroPos.z;
        const d = Math.hypot(dx, dz) || 1;
        p.position.x += (dx / d) * 5.5 * dt;
        p.position.z += (dz / d) * 5.5 * dt;
        p.rotation.y = Math.atan2(dx, dz);
        animateWalker(p, dt, true);
        if (dHero > 30) u.panic = false;
      } else {
        p.position.z += u.dir * u.speed * dt;
        if (p.position.z > 195) { p.position.z = 195; u.dir = -1; p.rotation.y = Math.PI; }
        if (p.position.z < -195) { p.position.z = -195; u.dir = 1; p.rotation.y = 0; }
        animateWalker(p, dt, true);
      }
    }
  }

  updateCamera(dt) {
    let targetPos, targetLook;
    if (this.camMode === 'title') {
      const t = this.time * 0.05;
      targetPos = new THREE.Vector3(Math.sin(t) * 8, 3.4, 130 + Math.cos(t * 0.7) * 8);
      targetLook = new THREE.Vector3(0, 4, 0);
    } else if (this.inCar || this.camMode === 'chase') {
      const back = new THREE.Vector3(-Math.sin(this.heroHeading), 0, -Math.cos(this.heroHeading));
      const right = new THREE.Vector3(-back.z, 0, back.x);
      targetPos = this.hero.position.clone()
        .addScaledVector(back, this.camOffset.z)
        .addScaledVector(right, this.camOffset.x);
      targetPos.y = this.camOffset.y;
      targetLook = this.hero.position.clone().add(new THREE.Vector3(0, 1.4, 0))
        .addScaledVector(back, -8);
    } else {
      const back = new THREE.Vector3(-Math.sin(this.rico.rotation.y), 0, -Math.cos(this.rico.rotation.y));
      const right = new THREE.Vector3(-back.z, 0, back.x);
      targetPos = this.rico.position.clone()
        .addScaledVector(back, this.camOffset.z)
        .addScaledVector(right, this.camOffset.x);
      targetPos.y = this.camOffset.y;
      targetLook = this.rico.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    }
    const k = 1 - Math.exp(-dt * (this.camMode === 'title' ? 1.2 : 5.5));
    this.camPos.lerp(targetPos, k);
    this.camLook.lerp(targetLook, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  updateWanted(dt) {
    if (this.state.wanted > 0 && this.mode === 'play') {
      // heat decays slowly when driving clean; busted if stopped near police
      const nearest = this.police.update(dt, this.hero.position, this.heroSpeed, this.state.wanted);
      if (this.inCar && this.heroSpeed < 1 && nearest < 8) {
        this.bustedTimer += dt;
        if (this.bustedTimer > 3) this.gameOver('busted');
      } else {
        this.bustedTimer = 0;
      }
      if (this.state.wanted > 0 && this.heroSpeed > 25) {
        // outrunning: slow decay
        this._decay = (this._decay || 0) + dt;
        if (this._decay > 25) {
          this._decay = 0;
          this.state.wanted = Math.max(0, this.state.wanted - 1);
          if (this.state.wanted < 3) stopSiren();
          this.checkStage('loseHeat');
        }
      }
    } else {
      this.police.update(dt, this.hero.position, this.heroSpeed, this.state.wanted);
    }
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock ? this.clock.getDelta() : 0.016);
    if (!this.clock) this.clock = new THREE.Clock();
    this.time += dt;
    this.frames += 1;
    const playing = this.mode === 'play';
    if (playing && !this.frozen) {
      this.state.clockMinutes += dt * 0.35;
      if (this.state.clockMinutes >= 24 * 60) {
        this.state.clockMinutes -= 24 * 60;
        this.state.day += 1;
      }
      if (this.inCar) this.updateDriving(dt);
      else this.updateWalking(dt);
      this.updateTraffic(dt);
      this.updatePeds(dt);
      this.updateWanted(dt);
      this.checkStage('reach');
      this.updateHudAll();
      const policeBlips = this.police.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }));
      drawMinimap(this.playerPos().x, this.playerPos().z, this.inCar ? this.heroHeading : this.rico.rotation.y, policeBlips, this.missionTarget());
    } else if (playing && this.frozen) {
      // staged shot: world frozen, but police lights still blink and the HUD
      // + minimap refresh so the frame is alive.
      for (const c of this.police.cars) updatePoliceLights(c.mesh, this.time);
      this.updateHudAll();
      const policeBlips = this.police.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }));
      drawMinimap(this.playerPos().x, this.playerPos().z, this.inCar ? this.heroHeading : this.rico.rotation.y, policeBlips, this.missionTarget());
    } else if (this.mode === 'title') {
      this.updateTraffic(dt * 0.5);
      this.updatePeds(dt * 0.5);
    }
    this.city.update(dt);
    this.updateCamera(dt);
    // muzzle flash light
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    this.renderer.render(this.scene, this.camera);
    // screenshot readiness: staged + rendered a few frames
    if (this.shot && this.frames > 8 && !window.__shotReady) {
      window.__shotReady = true;
    }
    if (!this.shot && this.frames > 10 && !window.__ready) window.__ready = true;
  }
}

new Game();
