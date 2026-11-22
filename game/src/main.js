// main.js — the boot and game loop for AURELIA BAY. Builds the renderer,
// the sky, the city, the cars, the helicopter and the walker; runs the
// driving and on-foot gameplay (WASD, E to enter/exit, M for the map,
// Esc to close it); and exposes window.__game for the playtest and
// window.__ready when the first frame is up.
//
// Two modes: ?shot=chase|title|map|marina stages one composed frame and
// renders it ONCE (no loop — SwiftShader is slow and a screenshot needs
// one frame); without a shot parameter the game runs interactively from
// the title screen.

(function () {
  'use strict';

  var SAVE_KEY = 'aurelia-bay-save-v1';

  // ---- Sound: a tiny WebAudio synth (engine hum + UI blips). Everything
  // is guarded: no sound, no problem — the game never depends on audio.
  var sound = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    init: function () {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      } catch (e) { /* no audio in this browser */ }
    },
    blip: function (freq) {
      if (!this.ctx || this.muted) return;
      try {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.frequency.value = freq || 660;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
      } catch (e) { /* ignore */ }
    },
    startEngine: function () {
      if (!this.ctx || this.muted || this.engineOsc) return;
      try {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineGain.gain.value = 0.03;
        var filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      } catch (e) { /* ignore */ }
    },
    setEngine: function (speedFrac) {
      if (!this.engineOsc || this.muted) return;
      try {
        this.engineOsc.frequency.value = 55 + speedFrac * 110;
        this.engineGain.gain.value = 0.02 + speedFrac * 0.03;
      } catch (e) { /* ignore */ }
    },
    toggleMute: function () {
      this.muted = !this.muted;
      if (this.engineGain) this.engineGain.gain.value = this.muted ? 0 : 0.03;
      return this.muted;
    },
  };

  // ---- Save: money / rep / stage in localStorage. ----
  function saveGame(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: state.money,
        rep: state.rep,
        stage: state.stage,
        savedAt: Date.now(),
      }));
    } catch (e) { /* storage unavailable */ }
  }

  function loadGame() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // ---- Boot. ----
  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.getElementById('game-container').appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 900);

  // World: sky, city, hero, cruisers, helicopter, walker.
  var skyBuilt = window.AB.sky.buildSky(scene, window.AB.util.mulberry32(7));
  var city = window.AB.city.buildCity(scene);

  var heroGroup = window.AB.vehicles.createHeroCar();
  heroGroup.position.set(0, 0, 0.5);
  heroGroup.rotation.y = Math.PI / 2;
  scene.add(heroGroup);

  var cruiserNames = ['FALCON-2', 'OSPREY-7', 'HERON-4', 'KITE-9'];
  var cruisers = cruiserNames.map(function (name) {
    var g = window.AB.vehicles.createCruiser(name);
    scene.add(g);
    return { name: name, group: g };
  });

  var heli = window.AB.vehicles.createHelicopter();
  heli.group.position.set(0.5, 19, -38);
  scene.add(heli.group);

  // Dante on foot (the walker): hidden until the player exits the car.
  var walker = window.AB.people.createPerson({
    skin: 0xc68e5e, shirt: 0xeeeeee, pants: 0x2a4a6a,
    hairStyle: 'crop', hair: 0x1c1410, activity: 'idle', seed: 99, name: 'Dante',
  });
  walker.group.visible = false;
  scene.add(walker.group);

  // ---- Game state. ----
  var game = {
    scene: scene,
    camera: camera,
    renderer: renderer,
    hero: { group: heroGroup },
    cruisers: cruisers,
    heli: heli,
    city: city,
    crew: city.crew,
    skyInfo: skyBuilt.info,
    walker: walker,
    time: 0,
    driving: true,
    playerSpeed: 0, // m/s
    heading: -Math.PI / 2, // facing -Z
    money: 27850,
    rep: 2310,
    stage: 3,
    wanted: 4,
    started: false,
    camYaw: 0, // mouse-drag orbit offset
    keys: {},
  };
  game.world = { heli: heli, city: city };
  game.playerCar = { group: heroGroup };
  window.__game = game;

  window.AB.hud.initHUD();

  // ---- Input. ----
  var keys = game.keys;
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'KeyM') {
      if (window.AB.hud.isMapOpen()) window.AB.hud.closeMap();
      else if (game.started) { window.AB.hud.openMap(); sound.blip(520); }
    }
    if (e.code === 'Escape') {
      window.AB.hud.closeMap();
      var how = document.getElementById('how-panel');
      if (how) how.style.display = 'none';
    }
    if (e.code === 'KeyE' && game.started) {
      if (game.driving) exitCar();
      else enterCar();
    }
    if (e.code === 'KeyN') sound.toggleMute();
    if (e.code === 'KeyR') cycleRadio();
  });
  window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
  });

  // Mouse drag orbits the follow camera around the car/walker.
  var dragging = false;
  var lastX = 0;
  renderer.domElement.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    game.camYaw += (e.clientX - lastX) * 0.005;
    lastX = e.clientX;
  });
  window.addEventListener('pointerup', function () { dragging = false; });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var RADIO = [
    'SOL FM 101.3 — "Blue Skies" — The Marigolds',
    'SOL FM 101.3 — "Sunset Mile" — The Velvets',
    'EMBER FM 88.5 — "Heat Wave" — DJ Lumen',
  ];
  var radioIndex = 0;

  function cycleRadio() {
    radioIndex = (radioIndex + 1) % RADIO.length;
    var el = document.getElementById('hud-radio');
    if (el) el.textContent = '♪ ' + RADIO[radioIndex];
    sound.blip(740);
  }

  function exitCar() {
    game.driving = false;
    game.playerSpeed = 0;
    var p = heroGroup.position;
    walker.group.position.set(p.x + 1.6, 0, p.z + 0.5);
    walker.group.rotation.y = Math.PI / 2 - game.heading;
    walker.group.visible = true;
    window.AB.hud.setPopup(
      '<span class="popup-big">ON FOOT</span><br>' +
      '<span class="popup-small">Press E near the car to drive again</span>',
    );
    sound.blip(440);
    saveGame(game);
  }

  function enterCar() {
    // Only when Dante is near the car.
    var d = walker.group.position.distanceTo(heroGroup.position);
    if (d > 4) return;
    game.driving = true;
    walker.group.visible = false;
    window.AB.hud.setPopup(
      '<span class="popup-big">DRIFT x3</span><br>' +
      '<span class="popup-small">NEAR MISS +$250</span>',
    );
    sound.blip(880);
  }

  // ---- Starting the game from the title screen. ----
  function startGame(fromSave) {
    if (fromSave) {
      var saved = loadGame();
      if (saved) {
        game.money = saved.money;
        game.rep = saved.rep;
        game.stage = saved.stage;
      }
    }
    game.started = true;
    sound.init();
    sound.startEngine();
    sound.blip(660);
    window.AB.hud.hideTitle();
    window.AB.hud.showHUD();
    window.AB.hud.setSpeed(0);
    window.AB.hud.setPopup(
      '<span class="popup-big">LOSE THE HEAT</span><br>' +
      '<span class="popup-small">Shake the ABPD, then reach the garage</span>',
    );
    // The hero starts at the crosswalk, cruisers in pursuit behind.
    heroGroup.position.set(0, 0, 0.5);
    game.heading = -Math.PI / 2;
    heroGroup.rotation.y = Math.PI / 2;
    game.playerSpeed = 0;
    var spots = window.AB.shots.CRUISER_SPOTS;
    cruisers.forEach(function (c, i) {
      c.group.position.set(spots[i].x, 0, spots[i].z);
      c.group.rotation.y = Math.PI / 2;
    });
  }

  var btnNew = document.getElementById('btn-new');
  if (btnNew) btnNew.addEventListener('click', function () { startGame(false); });
  var btnContinue = document.getElementById('btn-continue');
  if (btnContinue) btnContinue.addEventListener('click', function () { startGame(true); });
  var btnHow = document.getElementById('btn-how');
  if (btnHow) btnHow.addEventListener('click', function () {
    var how = document.getElementById('how-panel');
    if (how) how.style.display = how.style.display === 'block' ? 'none' : 'block';
    sound.init();
    sound.blip(520);
  });

  // ---- The loop. ----
  var clock = new THREE.Clock();
  var heliAngle = 0;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    game.time += dt;

    // Rotor spin + a slow heli drift over the street.
    heliAngle += dt * 0.05;
    heli.rotor.rotation.y += dt * 18;
    heli.tailRotor.rotation.x += dt * 30;
    heli.group.position.x = 0.5 + Math.sin(heliAngle) * 3;
    heli.group.position.z = -38 + Math.cos(heliAngle * 0.7) * 4;

    // Pedestrian walk cycles + slow strolls along the sidewalks.
    city.pedestrians.forEach(function (p, i) {
      if (p.activity === 'walk') {
        window.AB.people.updateWalk(p, game.time);
        var dir = p.group.rotation.y === 0 ? 1 : -1;
        p.group.position.z += dir * dt * 0.9;
        if (p.group.position.z > 60) p.group.position.z = -150;
        if (p.group.position.z < -150) p.group.position.z = 60;
      }
    });

    if (game.started) {
      if (game.driving) {
        // Arcade driving: W/S accelerate/brake, A/D steer, SPACE brake.
        var accel = 16;
        if (keys['KeyW']) game.playerSpeed += accel * dt;
        if (keys['KeyS']) game.playerSpeed -= accel * 1.4 * dt;
        if (keys['Space']) game.playerSpeed -= 30 * dt;
        // Drag + rolling resistance.
        game.playerSpeed -= game.playerSpeed * 0.4 * dt;
        game.playerSpeed = Math.max(0, Math.min(game.playerSpeed, 42));
        var steer = 0;
        if (keys['KeyA']) steer += 1;
        if (keys['KeyD']) steer -= 1;
        var speedFrac = game.playerSpeed / 42;
        game.heading -= steer * (0.9 + speedFrac * 0.9) * dt * Math.min(1, game.playerSpeed / 4 + 0.2);
        heroGroup.position.x += Math.cos(game.heading) * game.playerSpeed * dt;
        heroGroup.position.z += Math.sin(game.heading) * game.playerSpeed * dt;
        // Keep the car inside the world.
        heroGroup.position.x = Math.max(-58, Math.min(28, heroGroup.position.x));
        heroGroup.position.z = Math.max(-158, Math.min(58, heroGroup.position.z));
        heroGroup.rotation.y = -game.heading;
        // Body lean into corners + a little pitch on acceleration.
        heroGroup.rotation.z = steer * speedFrac * 0.04;
        window.AB.hud.setSpeed(game.playerSpeed * 3.6);
        sound.setEngine(speedFrac);
        // Cruisers give chase: they close on the hero's tail.
        cruisers.forEach(function (c, i) {
          var target = heroGroup.position;
          var cp = c.group.position;
          var dx = target.x - cp.x;
          var dz = target.z - cp.z;
          var dist = Math.hypot(dx, dz);
          if (dist > 14 + i * 3) {
            var cs = 26 + i * 2;
            cp.x += (dx / dist) * cs * dt;
            cp.z += (dz / dist) * cs * dt;
            c.group.rotation.y = Math.atan2(-dz, dx);
          }
        });
      } else {
        // On foot: WASD moves Dante, SHIFT runs.
        var run = keys['ShiftLeft'] || keys['ShiftRight'] ? 2.1 : 1;
        var mx = 0;
        var mz = 0;
        if (keys['KeyW']) mz -= 1;
        if (keys['KeyS']) mz += 1;
        if (keys['KeyA']) mx -= 1;
        if (keys['KeyD']) mx += 1;
        if (mx !== 0 || mz !== 0) {
          var len = Math.hypot(mx, mz);
          var sp = 4.2 * run;
          walker.group.position.x += (mx / len) * sp * dt;
          walker.group.position.z += (mz / len) * sp * dt;
          walker.group.rotation.y = Math.atan2(mx / len, mz / len);
          window.AB.people.updateWalk(walker, game.time);
        }
        walker.group.position.x = Math.max(-58, Math.min(28, walker.group.position.x));
        walker.group.position.z = Math.max(-158, Math.min(58, walker.group.position.z));
        window.AB.hud.setSpeed(0);
      }

      // Follow camera: behind the car (or the walker), with mouse orbit.
      var focus = game.driving ? heroGroup.position : walker.group.position;
      var back = game.driving ? 8.6 : 5.5;
      var height = game.driving ? 3.1 : 2.6;
      var yaw = (game.driving ? game.heading : Math.PI / 2 - walker.group.rotation.y) + game.camYaw;
      var cx = focus.x - Math.cos(yaw) * back;
      var cz = focus.z - Math.sin(yaw) * back;
      camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 5);
      camera.position.y += (height - camera.position.y) * Math.min(1, dt * 5);
      camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 5);
      camera.lookAt(focus.x, focus.y + 1.2, focus.z);
    }

    renderer.render(scene, camera);
  }

  // ---- Mode select: a staged shot, or the interactive game. ----
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  if (shot) {
    window.AB.shots.runShot(game, shot);
  } else {
    // Interactive mode: the title screen over the street.
    window.AB.shots.stageTitle(game);
    renderer.render(scene, camera);
    window.__ready = true;
    animate();
  }
})();
