// VERANO BAY — main entrypoint: renderer, scene, game loop, camera modes,
// state machine (title / playing / paused), on-foot + driving, and the HUD
// wiring. Classic scripts, no modules, no network: everything is local.

(function () {
  'use strict';
  const U = VB.util;

  const Game = {
    renderer: null, scene: null, camera: null,
    clock: null, elapsed: 0, frame: 0,
    heroPed: null, onFoot: false, radioIdx: 0,
    camYaw: 0, camPitch: 0,
    ready: false, errors: [],

    init() {
      window.addEventListener('error', (e) => this.errors.push(String(e.message || e.error)));

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(innerWidth, innerHeight);
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      document.getElementById('game-root').appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
      this.camera.position.set(24, 7, 46);

      VB.world.build(this.scene);
      VB.cars.build(this.scene);
      VB.police.buildHeli(this.scene);
      VB.peds.build(this.scene);

      // On-foot hero figure (hidden while driving).
      this.heroPed = VB.makePerson(0x18b7d8, 0x223044, 0xc98a5a, { hair: 0x1a1a1a, face: true });
      this.heroPed.visible = false;
      this.scene.add(this.heroPed);

      VB.input.init();
      VB.hud.build();
      this.wireUi();

      // Save slot buttons + title buttons.
      const save = VB.missions.load();
      if (save) {
        const slot = document.getElementById('save-slot-1');
        if (slot) slot.textContent = 'SAVE 1 · JOB ' + (save.jobIndex + 1) + '/8 · ' + U.fmtMoney(save.money);
      }

      if (VB.shot) {
        VB.shots.stage(VB.shot, this);
      } else {
        VB.hud.showTitle(true);
        document.body.classList.add('on-title');
      }

      this.clock = new THREE.Clock();
      this.ready = true;
      this.loop();
      window.addEventListener('resize', () => this.onResize());
    },

    wireUi() {
      const start = () => {
        if (VB.missions.state.started) return;
        VB.audio.init();
        VB.audio.startEngine();
        VB.audio.startSiren();
        VB.missions.state.started = true;
        VB.hud.showTitle(false);
        document.body.classList.remove('on-title');
        VB.audio.blip(660, 0.15);
      };
      document.getElementById('btn-start').addEventListener('click', start);
      document.getElementById('btn-continue').addEventListener('click', start);
      document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));
      document.getElementById('btn-save').addEventListener('click', () => {
        if (VB.missions.save()) {
          VB.hud.setPopup('GAME SAVED', 'Progress stored in this browser');
          VB.audio.blip(880, 0.2);
        }
      });
      document.getElementById('btn-quit').addEventListener('click', () => {
        this.togglePause(false);
        VB.missions.state.started = false;
        VB.hud.showTitle(true);
        document.body.classList.add('on-title');
      });
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' && !VB.missions.state.started) start();
      });
      // Radio + mute + dialog advance.
      document.getElementById('radio').addEventListener('click', () => this.cycleRadio());
    },

    cycleRadio() {
      this.radioIdx = (this.radioIdx + 1) % VB.CONFIG.radios.length;
      const r = VB.CONFIG.radios[this.radioIdx];
      document.getElementById('radio').innerHTML =
        '♪ ' + r.station + ' — "' + r.song + '" · ' + r.artist;
      VB.audio.blip(520, 0.1);
    },

    togglePause(force) {
      const M = VB.missions.state;
      const want = typeof force === 'boolean' ? force : !M.paused;
      if (!M.started) return;
      M.paused = want;
      VB.hud.showPause(want);
      if (want) VB.audio.blip(440, 0.12);
    },

    onResize() {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    },

    // Chase camera: behind + above the hero, eased; mouse drag orbits.
    updateCamera(dt) {
      if (VB.shots.staged && VB.shot !== 'title') return; // staged shots hold the frame
      const hero = VB.cars.hero;
      const target = this.onFoot ? this.heroPed : hero;
      if (!VB.missions.state.started) {
        // Title orbit: slow cinematic sweep over the avenue.
        const a = this.elapsed * 0.05;
        this.camera.position.set(Math.sin(a) * 34, 8 + Math.sin(a * 0.7) * 2, Math.cos(a) * 34);
        this.camera.lookAt(0, 3, -6);
        return;
      }
      const heading = this.onFoot ? this.heroPed.rotation.y : VB.cars.heroState.heading;
      const yaw = heading + this.camYaw + (VB.input.dragX * 0.003);
      const dist = this.onFoot ? 7 : 11.5;
      const height = this.onFoot ? 3.4 : 4.8;
      const bx = target.position.x + Math.sin(yaw) * dist;
      const bz = target.position.z + Math.cos(yaw) * dist;
      this.camera.position.x = U.damp(this.camera.position.x, bx, 6, dt);
      this.camera.position.y = U.damp(this.camera.position.y, height, 6, dt);
      this.camera.position.z = U.damp(this.camera.position.z, bz, 6, dt);
      this.camera.lookAt(target.position.x, target.position.y + 2, target.position.z - 4);
    },

    updateOnFoot(dt) {
      const input = VB.input;
      const sp = input.down('ShiftLeft') || input.down('ShiftRight') ? 9 : 4.5;
      const f = input.throttle(), s = input.steer();
      if (f || s) {
        const yaw = Math.atan2(-s, -f) + this.camera.rotation.y;
        this.heroPed.rotation.y = yaw;
        this.heroPed.position.x += -Math.sin(yaw) * sp * dt * (f < 0 ? -0.6 : 1);
        this.heroPed.position.z += -Math.cos(yaw) * sp * dt * (f < 0 ? -0.6 : 1);
        this.heroPed.position.y = Math.abs(Math.sin(this.elapsed * 10)) * 0.08;
      } else {
        this.heroPed.position.y = 0;
      }
      const b = VB.world.bounds;
      this.heroPed.position.x = U.clamp(this.heroPed.position.x, b.minX, b.maxX);
      this.heroPed.position.z = U.clamp(this.heroPed.position.z, b.minZ, b.maxZ);
    },

    toggleCar() {
      const M = VB.missions.state;
      if (!M.started || M.paused) return;
      if (!this.onFoot) {
        // Exit: step out beside the car.
        this.onFoot = true;
        VB.cars.heroState.inCar = false;
        VB.cars.heroState.speed = 0;
        this.heroPed.position.set(
          VB.cars.hero.position.x + 2.2, 0, VB.cars.hero.position.z + 1
        );
        this.heroPed.visible = true;
        VB.hud.setPopup('ON FOOT', 'Press E near the car to get back in');
      } else {
        const d = this.heroPed.position.distanceTo(VB.cars.hero.position);
        if (d < 5) {
          this.onFoot = false;
          VB.cars.heroState.inCar = true;
          this.heroPed.visible = false;
          VB.hud.setPopup('TEMPEST GT', 'You are driving');
        }
      }
    },

    loop() {
      requestAnimationFrame(() => this.loop());
      const dt = Math.min(this.clock.getDelta(), 0.1); // clamped: stays stable on slow machines
      const t = this.elapsed += dt;
      this.frame++;
      const M = VB.missions.state;
      const input = VB.input;

      // Keys.
      if (input.hit('KeyM') || input.hit('KeyP') || input.hit('Escape')) this.togglePause();
      if (input.hit('KeyE')) this.toggleCar();
      if (input.hit('KeyR')) this.cycleRadio();
      if (input.hit('KeyN')) VB.audio.toggleMute();
      if (input.hit('KeyF')) {
        VB.missions.dialog.next();
        VB.hud.setDialog();
        VB.audio.blip(700, 0.1);
      }

      if (M.started && !M.paused && !VB.shots.staged) {
        VB.missions.tick(dt);
        if (!this.onFoot) VB.cars.drive(dt, input);
        else this.updateOnFoot(dt);
        VB.police.updateGround(dt, VB.cars.hero.position);
        VB.police.update(dt, t, VB.cars.hero.position, false);
        VB.audio.setEngine(U.clamp(Math.abs(VB.cars.heroState.speed) / 38, 0, 1));
        VB.audio.setSiren(M.wanted > 0);
        // Near-miss bonus while drifting at speed.
        if (VB.cars.heroState.drift > 0.6 && VB.cars.speedKmh() > 70 && this.frame % 240 === 0) {
          M.money += 250;
          VB.hud.setPopup('DRIFT x3', 'NEAR MISS +$250');
        }
      } else if (VB.shots.staged) {
        // Staged shots hold the frame: no driving, no timer, heli hovers.
        VB.police.update(dt, t, VB.cars.hero.position, true);
      }

      VB.cars.update(dt, t);
      VB.peds.update(dt, t);
      VB.world.update(t);
      this.updateCamera(dt);

      // HUD refresh.
      const player = {
        x: this.onFoot ? this.heroPed.position.x : VB.cars.hero.position.x,
        z: this.onFoot ? this.heroPed.position.z : VB.cars.hero.position.z,
        fx: -Math.sin(this.onFoot ? this.heroPed.rotation.y : VB.cars.heroState.heading),
        fz: -Math.cos(this.onFoot ? this.heroPed.rotation.y : VB.cars.heroState.heading),
      };
      VB.hud.update(M, player, VB.cars.cruisers, dt);
      if (VB.debug) {
        VB.hud.els.debug.textContent =
          'frame ' + this.frame + ' · fps ' + Math.round(1 / Math.max(dt, 0.001)) +
          ' · hero ' + player.x.toFixed(1) + ',' + player.z.toFixed(1) +
          ' · speed ' + VB.cars.speedKmh() + ' · errors ' + this.errors.length;
      }

      this.renderer.render(this.scene, this.camera);
      input.endFrame();
    },
  };

  VB.game = Game;
  window.addEventListener('DOMContentLoaded', () => Game.init());
})();
