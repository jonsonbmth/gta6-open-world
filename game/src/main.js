// SOLMAR BAY — main: renderer, game loop, cameras, on-foot + driving,
// entering cars, near-miss and drift bonuses, events, save/resume, and the
// 20-check playtest. The game is static files; this file ties them together.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;

  // --- tiny event hub (other modules emit; main reacts) ---
  var listeners = {};
  SB.events = {
    on: function (name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    },
    emit: function (name) {
      var args = Array.prototype.slice.call(arguments, 1);
      (listeners[name] || []).forEach(function (fn) { fn.apply(null, args); });
    },
  };

  var game = {
    mode: 'title', // title | playing | map | paused
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    heroState: null, // the VULPINE S (always exists)
    driven: null, // the car state currently driven (hero or a stolen car)
    rico: null, // on-foot player { group, x, z, heading, speed }
    inCar: true,
    cash: C.startCash,
    respect: C.startRespect,
    garage: ['VULPINE S'],
    missionIndex: 0,
    elapsed: 0,
    frame: 0,
    camMode: 'chase',
    camClose: false,
    shotFrozen: false,
    shake: 0,
    nearMissCooldown: 0,
    driftBanked: 0,
    errors: 0,
    station: 0,
    songIndex: 0,
    songTimer: 0,
    started: false,
  };
  SB.game = game;

  var SONGS = [
    ['Night Drive', 'Neon Coast FM'],
    ['Coral Heat', 'Los Marineros'],
    ['Static Bloom', 'The Voltages'],
  ];

  window.addEventListener('error', function () { game.errors++; });

  // --- Rico on foot: yellow raincoat, same build language as pedestrians ---
  function buildRico() {
    var g = new THREE.Group();
    var coat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4, metalness: 0.1 });
    var skin = new THREE.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.7 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.8 });
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.55, 4, 10), coat);
    torso.position.y = 1.05;
    g.add(torso);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
    head.position.y = 1.72;
    g.add(head);
    var cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0xc81e2b, roughness: 0.6 })
    );
    cap.position.y = 1.76;
    g.add(cap);
    var limbs = {};
    [['armL', -0.32], ['armR', 0.32]].forEach(function (a) {
      var pivot = new THREE.Group();
      pivot.position.set(a[1], 1.3, 0);
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 6), coat);
      arm.position.y = -0.31;
      pivot.add(arm);
      g.add(pivot);
      limbs[a[0]] = pivot;
    });
    [['legL', -0.13], ['legR', 0.13]].forEach(function (a) {
      var pivot = new THREE.Group();
      pivot.position.set(a[1], 0.78, 0);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 6), dark);
      leg.position.y = -0.36;
      pivot.add(leg);
      g.add(pivot);
      limbs[a[0]] = pivot;
    });
    return { group: g, limbs: limbs, x: 0, z: 0, heading: 0, speed: 0, phase: 0 };
  }

  // --- init ---
  function init() {
    var canvas = document.getElementById('game-canvas');
    var lowPerf = U.param('perf') === 'low';
    game.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !lowPerf });
    game.renderer.setPixelRatio(lowPerf ? 0.5 : Math.min(window.devicePixelRatio || 1, 2));
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    game.renderer.toneMappingExposure = 1.3;
    game.scene = new THREE.Scene();
    game.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    game.camera.position.set(18, 6, 70);
    game.clock = new THREE.Clock();

    var seed = parseInt(U.param('seed') || '1', 10) || 1;
    SB.world.build(game.scene, seed);

    // Hero car: the VULPINE S, parked by the marina at the start.
    var heroCar = SB.cars.makeCar({ color: C.heroRed, sporty: true, name: 'VULPINE S' });
    game.scene.add(heroCar.group);
    // Hero headlights: one real spotlight, no shadows. The nose points +Z
    // in car-local space, so the beam aims +Z.
    var head = new THREE.SpotLight(0xfff2cc, 80, 45, 0.5, 0.5, 1.2);
    head.position.set(0, 0.9, 2.2);
    heroCar.group.add(head);
    head.target.position.set(0, 0, 20);
    heroCar.group.add(head.target);
    // Red glow spilling off the taillight bar onto the wet road behind.
    var tailLight = new THREE.PointLight(0xff2a1a, 4, 10, 1.6);
    tailLight.position.set(0, 0.9, -2.6);
    heroCar.group.add(tailLight);
    game.heroState = SB.cars.makeCarState(heroCar, -138, 138, 2.4, C.heroCar);
    game.driven = game.heroState;

    SB.cars.spawnTraffic(game.scene, 12, U.mulberry32(seed + 5));
    SB.people.spawn(game.scene, 26, U.mulberry32(seed + 9));
    SB.police.init(game.scene);
    SB.missions.init(game.scene);
    SB.hud.init();
    SB.citymap.init();
    SB.input.init();

    game.rico = buildRico();
    game.rico.x = -140;
    game.rico.z = 142;
    game.rico.heading = 0.6;
    game.scene.add(game.rico.group);
    game.rico.group.visible = false; // starts in the car

    // Resume a save if one exists.
    var save = SB.save.load();
    if (save) {
      game.cash = save.cash;
      game.respect = save.respect;
      game.missionIndex = save.missionIndex;
      game.heroState.x = save.hero.x;
      game.heroState.z = save.hero.z;
      game.heroState.heading = save.hero.heading;
      game.heroState.car.group.position.set(save.hero.x, 0, save.hero.z);
      game.heroState.car.group.rotation.y = save.hero.heading;
      game.inCar = save.inCar;
      game.station = save.station || 0;
      var el = document.getElementById('title-save');
      if (el) el.textContent = 'SAVE FOUND — press ENTER to continue your run (N for a new game)';
    }

    wireEvents();
    wirePauseButtons();
    window.addEventListener('resize', onResize);

    // Screenshot mode or playtest?
    game.hudState = hudState; // shot setup builds the HUD/map state from it
    var shot = U.param('shot');
    if (shot) {
      game.started = true;
      SB.shots.apply(shot, game);
      window.__shotReady = true;
    }
    if (U.param('playtest') === '1') {
      game.started = true;
      game.mode = 'playing';
      document.getElementById('title-screen').style.display = 'none';
      document.getElementById('hud').style.display = 'block';
      SB.missions.start(0);
      setTimeout(runPlaytest, 4000);
    }
    game.clock.start();
    requestAnimationFrame(loop);
  }

  function onResize() {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function wirePauseButtons() {
    var resume = document.getElementById('btn-resume');
    if (resume) resume.addEventListener('click', function () { setPaused(false); });
    var saveBtn = document.getElementById('btn-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      doSave();
      var note = document.getElementById('pause-note');
      if (note) note.textContent = 'Saved.';
    });
    var restart = document.getElementById('btn-restart');
    if (restart) restart.addEventListener('click', function () {
      SB.save.clear();
      window.location.href = window.location.pathname;
    });
  }

  function wireEvents() {
    SB.events.on('crash', function (strength) {
      SB.audio.crash(strength);
      game.shake = Math.min(0.6, 0.15 + strength * 0.008);
      SB.police.addHeat(6, 'crash');
      SB.hud.flashObjective('CRASH!');
    });
    SB.events.on('rammed', function () {
      game.driven.speed *= 0.92;
      game.driven.heading += (Math.random() - 0.5) * 0.12;
      game.shake = Math.max(game.shake, 0.3);
    });
    SB.events.on('wanted', function (stars) {
      SB.audio.setSiren(stars > 0);
      if (stars >= 3) SB.hud.flashObjective('WANTED LEVEL ' + stars + ' — LOSE THEM!');
    });
    SB.events.on('dialogue', function (who, text, delay) {
      SB.hud.showDialogue(who, text, delay || 0);
    });
    SB.events.on('mission_start', function (m) {
      SB.hud.flashObjective(m.chapter + ' — ' + m.title);
      SB.audio.blip(660);
    });
    SB.events.on('stage', function (m, stage) {
      SB.hud.flashObjective('STAGE ' + (stage + 1) + '/' + m.stages.length);
      SB.audio.blip(880);
    });
    SB.events.on('mission_complete', function (m) {
      game.cash += m.pay;
      game.respect = Math.min(1000, game.respect + m.respect);
      SB.hud.flashObjective('JOB COMPLETE  +$' + m.pay.toLocaleString('en-US'));
      SB.hud.floatText('+$' + m.pay.toLocaleString('en-US'), '#39ff88');
      SB.audio.blip(990);
      doSave();
    });
    SB.events.on('mission_failed', function (m, reason) {
      SB.hud.flashObjective('FAILED — ' + reason + '. TRY AGAIN.');
    });
    SB.events.on('story_done', function () {
      SB.hud.flashObjective('SOLMAR BAY IS YOURS. LEGEND.');
      SB.hud.showDialogue('rosa', 'You did it, Rico. The city is yours now.');
    });
  }

  function doSave() {
    SB.save.save({
      cash: game.cash,
      respect: game.respect,
      missionIndex: SB.missions.current,
      missionStage: SB.missions.stage,
      completed: SB.missions.completed,
      garage: game.garage,
      x: game.heroState.x,
      z: game.heroState.z,
      heading: game.heroState.heading,
      inCar: game.inCar,
      station: SB.audio.station,
    });
  }

  function setPaused(paused) {
    var overlay = document.getElementById('pause-overlay');
    if (paused) {
      game.mode = 'paused';
      if (overlay) overlay.style.display = 'flex';
    } else {
      game.mode = 'playing';
      if (overlay) overlay.style.display = 'none';
    }
  }

  function startGame() {
    if (game.started) return;
    game.started = true;
    SB.audio.init();
    SB.audio.resume();
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    game.mode = 'playing';
    // Resume the saved mission at its exact stage, never restarted.
    var save = SB.save.load();
    if (save && save.missionIndex >= 0 && save.missionIndex < SB.missions.list.length) {
      SB.missions.start(save.missionIndex);
      SB.missions.stage = save.missionStage || 0;
      SB.missions.showBeacon();
    } else {
      SB.missions.start(0);
    }
  }

  // Enter the nearest car (hero or traffic — stealing adds heat).
  function tryEnterCar() {
    var best = null, bestD2 = 25;
    var candidates = [game.heroState].concat(SB.cars.traffic);
    candidates.forEach(function (c) {
      var d2 = U.dist2(game.rico.x, game.rico.z, c.x, c.z);
      if (d2 < bestD2) { bestD2 = d2; best = c; }
    });
    if (!best) return;
    if (best !== game.heroState) {
      // Steal it: out of traffic, into the garage, heat for the crime.
      var idx = SB.cars.traffic.indexOf(best);
      if (idx >= 0) SB.cars.traffic.splice(idx, 1);
      if (game.garage.indexOf(best.car.name) < 0) game.garage.push(best.car.name);
      SB.police.addHeat(12, 'stolen car');
      SB.hud.floatText('CAR STOLEN', '#ff4040');
    }
    game.driven = best;
    game.inCar = true;
    game.rico.group.visible = false;
    SB.audio.blip(520);
  }

  function exitCar() {
    game.inCar = false;
    var d = game.driven;
    d.speed = 0;
    game.rico.x = d.x + Math.cos(d.heading) * 2.4;
    game.rico.z = d.z - Math.sin(d.heading) * 2.4;
    game.rico.heading = d.heading;
    game.rico.group.visible = true;
    game.rico.group.position.set(game.rico.x, 0, game.rico.z);
  }

  // Punch: swing at the nearest pedestrian; a cop seeing it adds heat.
  function punch() {
    var best = null, bestD2 = 9;
    SB.people.list.forEach(function (p) {
      var d2 = U.dist2(game.rico.x, game.rico.z, p.x, p.z);
      if (d2 < bestD2) { bestD2 = d2; best = p; }
    });
    if (best) {
      best.panicked = true;
      best.panicTime = 5;
      SB.police.addHeat(14, 'assault');
      SB.hud.floatText('ASSAULT!', '#ff4040');
      SB.audio.blip(180);
    }
  }

  function hudState() {
    var m = SB.missions.mission();
    var s = SB.missions.stageDef();
    var px = game.inCar ? game.driven.x : game.rico.x;
    var pz = game.inCar ? game.driven.z : game.rico.z;
    var heading = game.inCar ? game.driven.heading : game.rico.heading;
    var speedKmh = game.inCar ? Math.abs(game.driven.speed) * 3.6 : 0;
    var gear = 1;
    if (speedKmh > 140) gear = 5;
    else if (speedKmh > 100) gear = 4;
    else if (speedKmh > 60) gear = 3;
    else if (speedKmh > 25) gear = 2;
    var mins = 22 * 60 + 47 + Math.floor(game.elapsed / 10);
    var clockStr = 'DAY 1  ' + String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' +
      String(mins % 60).padStart(2, '0');
    return {
      cash: game.cash,
      respect: game.respect,
      wanted: SB.police.wanted,
      speedKmh: speedKmh,
      gear: gear,
      condition: game.driven.condition,
      carName: game.driven.car.name,
      inCar: game.inCar,
      mission: m,
      stage: SB.missions.stage,
      stageIndex: SB.missions.stage,
      stageLabel: SB.missions.stageLabel(),
      next: SB.missions.objectiveText(),
      clock: clockStr,
      district: SB.hud.districtAt(px, pz),
      radio: SB.audio.stationName(),
      song: SONGS[SB.audio.station][0] + ' · ' + SONGS[SB.audio.station][1],
      playerX: px,
      playerZ: pz,
      heading: heading,
      target: s && s.type === 'reach' ? { x: s.x, z: s.z } : null,
      policeBlips: SB.police.units.map(function (u) { return { x: u.x, z: u.z }; }),
    };
  }

  // Near-miss + drift bonuses while driving.
  function checkBonuses(dt) {
    if (!game.inCar) return;
    game.nearMissCooldown -= dt;
    var d = game.driven;
    var speed = Math.abs(d.speed);
    if (speed > 20 && game.nearMissCooldown <= 0) {
      var near = SB.cars.traffic.some(function (t) {
        var d2 = U.dist2(d.x, d.z, t.x, t.z);
        return d2 > 9 && d2 < 26;
      });
      if (near) {
        game.nearMissCooldown = 3;
        game.cash += 250;
        game.respect = Math.min(1000, game.respect + 5);
        SB.hud.floatText('NEAR MISS  +$250', '#ffd23f');
        SB.audio.blip(1200);
      }
    }
    if (d.drifting) {
      game.driftBanked = Math.max(game.driftBanked, d.driftTime);
    } else if (game.driftBanked > 1) {
      var bonus = Math.round(game.driftBanked) * 100;
      game.cash += bonus;
      SB.hud.floatText('DRIFT x' + Math.round(game.driftBanked) + '  +$' + bonus, '#00e5ff');
      game.driftBanked = 0;
    }
  }

  function updateCamera(dt) {
    var cam = game.camera;
    var target = new THREE.Vector3();
    var look = new THREE.Vector3();
    if (game.camMode === 'title' || game.mode === 'title') {
      // Slow orbit around the parked hero with the skyline behind.
      var a = game.elapsed * 0.05;
      target.set(3 + Math.sin(a) * 14, 5.5, 40 + Math.cos(a) * 14);
      look.set(0, 2, -60);
    } else if (!game.inCar) {
      var r = game.rico;
      // Screenshot framing pulls back so Rico + the scene both read.
      var fback = game.camClose ? 7.5 : 5.5;
      var fheight = game.camClose ? 3.6 : 2.8;
      target.set(
        r.x - Math.sin(r.heading) * fback,
        fheight,
        r.z - Math.cos(r.heading) * fback
      );
      look.set(r.x + Math.sin(r.heading) * 4, 1.4, r.z + Math.cos(r.heading) * 4);
    } else {
      // Low close rear-3/4 chase cam: the hero fills ~30% of the frame.
      // Screenshot framing is closer than the gameplay framing.
      var d = game.driven;
      var back = game.camClose ? 6.8 : 9.5;
      var side = game.camClose ? 1.4 : 1.6;
      var height = game.camClose ? 2.6 : 3.4;
      var lookAhead = game.camClose ? 6 : 12;
      target.set(
        d.x - Math.sin(d.heading) * back + Math.cos(d.heading) * side,
        height,
        d.z - Math.cos(d.heading) * back - Math.sin(d.heading) * side
      );
      look.set(
        d.x + Math.sin(d.heading) * lookAhead,
        1.3,
        d.z + Math.cos(d.heading) * lookAhead
      );
    }
    // In screenshot mode the camera snaps to its target on the first frame:
    // headless capture may only render a handful of frames, and a slow lerp
    // would leave the framing half-way between the title orbit and the chase.
    var k = game.shotFrozen ? 1 : Math.min(1, dt * 5);
    cam.position.x = U.lerp(cam.position.x, target.x, k);
    cam.position.y = U.lerp(cam.position.y, target.y, k);
    cam.position.z = U.lerp(cam.position.z, target.z, k);
    // Crash shake.
    if (game.shake > 0) {
      game.shake -= dt * 1.4;
      cam.position.x += (Math.random() - 0.5) * game.shake;
      cam.position.y += (Math.random() - 0.5) * game.shake * 0.6;
    }
    cam.lookAt(look);
  }

  function updatePlaying(dt, time) {
    var input = SB.input;
    // Global keys.
    if (input.pressed('KeyM')) {
      if (SB.citymap.open) { SB.citymap.closeMap(); game.mode = 'playing'; }
      else { SB.citymap.openMap(hudState()); game.mode = 'map'; }
    }
    if (input.pressed('KeyP')) { setPaused(true); return; }
    if (input.pressed('KeyR')) {
      SB.audio.nextStation();
      SB.hud.flashObjective(SB.audio.stationName());
    }
    if (input.pressed('KeyH') && game.inCar) SB.audio.blip(340);

    if (game.mode === 'map') {
      // Map open: the world freezes, but the HUD still refreshes (stars,
      // cash, mission stage must match the map, not stale HTML defaults).
      SB.hud.update(dt, hudState());
      updateCamera(dt);
      return;
    }

    if (game.shotFrozen) {
      // Screenshot mode: hold the frame, keep the world alive.
      var d = game.driven;
      d.car.wheels.forEach(function (w) { w.rotation.x += (46 * dt) / 0.36; });
      SB.world.update(dt, d.x, d.z, time);
      SB.cars.updatePoliceLights(time);
      SB.hud.update(dt, hudState());
      updateCamera(dt);
      return;
    }

    if (game.inCar) {
      var drive = input.driveInput();
      SB.cars.drive(game.driven, drive.throttle, drive.steer, drive.handbrake, dt);
      if (input.pressed('KeyE')) exitCar();
      checkBonuses(dt);
    } else {
      var walk = input.walkInput();
      var r = game.rico;
      var moveSpeed = walk.run ? 7.5 : 4;
      if (walk.fwd !== 0 || walk.strafe !== 0) {
        var moveHeading = Math.atan2(
          Math.sin(r.heading) * walk.fwd + Math.cos(r.heading) * walk.strafe,
          Math.cos(r.heading) * walk.fwd - Math.sin(r.heading) * walk.strafe
        );
        r.heading = U.angleLerp(r.heading, moveHeading, Math.min(1, dt * 10));
        var nx = r.x + Math.sin(r.heading) * moveSpeed * dt;
        var nz = r.z + Math.cos(r.heading) * moveSpeed * dt;
        var hit = SB.world.collideCircle(nx, nz, 0.4);
        if (hit) { nx = hit.x; nz = hit.z; }
        r.x = U.clamp(nx, -168, 168);
        r.z = U.clamp(nz, -198, 198);
        r.speed = moveSpeed;
        r.phase += dt * (walk.run ? 11 : 7);
        var swing = Math.sin(r.phase) * 0.6;
        r.limbs.armL.rotation.x = swing;
        r.limbs.armR.rotation.x = -swing;
        r.limbs.legL.rotation.x = -swing;
        r.limbs.legR.rotation.x = swing;
      } else {
        r.speed = 0;
      }
      r.group.position.set(r.x, 0, r.z);
      r.group.rotation.y = r.heading;
      if (input.pressed('KeyE')) tryEnterCar();
      if (input.pressed('KeyF')) punch();
    }

    var px = game.inCar ? game.driven.x : game.rico.x;
    var pz = game.inCar ? game.driven.z : game.rico.z;
    var pspeed = game.inCar ? Math.abs(game.driven.speed) : game.rico.speed;

    SB.cars.updateTraffic(dt, px, pz);
    SB.people.update(dt, time, px, pz, pspeed, SB.police.wanted);
    SB.police.update(dt, time, px, pz, game.inCar ? game.driven.heading : game.rico.heading, pspeed);
    SB.missions.update(dt, { x: px, z: pz, inCar: game.inCar });
    SB.world.update(dt, px, pz, time);
    SB.hud.update(dt, hudState());
    SB.audio.setEngine(pspeed, game.inCar);
    SB.audio.updateSiren(time);
    updateCamera(dt);
  }

  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(game.clock.getDelta(), 0.1); // dt clamp 0.1
    var time = game.clock.elapsedTime;
    game.elapsed += dt;
    game.frame++;

    if (game.mode === 'title') {
      if (SB.input.pressed('Enter')) startGame();
      if (SB.input.pressed('KeyN') && SB.save.hasSave()) {
        SB.save.clear();
        window.location.href = window.location.pathname;
      }
      SB.world.update(dt, 0, 40, time);
      SB.cars.updatePoliceLights(time);
      updateCamera(dt);
    } else if (game.mode === 'playing' || game.mode === 'map') {
      if (game.mode === 'map' && SB.input.pressed('KeyM')) {
        SB.citymap.closeMap();
        game.mode = 'playing';
      }
      updatePlaying(dt, time);
    }
    // Paused: render the frozen frame.
    game.renderer.render(game.scene, game.camera);
  }

  // --- the 20-check playtest (?playtest=1) ---
  function runPlaytest() {
    var results = [];
    function check(name, ok) {
      results.push((ok ? 'PASS' : 'FAIL') + ' ' + name);
    }
    try {
      check('three.js loaded', typeof THREE !== 'undefined');
      check('renderer created', !!(game.renderer && game.renderer.domElement));
      check('city built (>100 scene objects)', game.scene.children.length > 100);
      check('hero car in scene', game.scene.children.indexOf(game.heroState.car.group) >= 0);
      check('traffic >= 8', SB.cars.traffic.length >= 8);
      check('pedestrians >= 10', SB.people.list.length >= 10);
      check('rain active', !!SB.world.rain);
      check('HUD initialized', !!document.getElementById('hud-cash'));
      check('minimap context', !!(document.getElementById('minimap') || {}).getContext);
      check('7 missions defined', SB.missions.list.length === 7);
      var before = game.cash;
      doSave();
      var loaded = SB.save.load();
      check('save round-trip', !!(loaded && loaded.cash === before));
      check('audio API present', typeof SB.audio.init === 'function');
      try {
        SB.citymap.draw(hudState());
        check('city map draws', true);
      } catch (e) { check('city map draws', false); }
      SB.police.setWanted(3);
      SB.police.update(0.5, 10, game.driven.x, game.driven.z, game.driven.heading, 0);
      check('police spawn at 3 stars', SB.police.units.length >= 2);
      SB.police.setWanted(0);
      check('enter/exit car', (function () {
        exitCar();
        var out = !game.inCar && game.rico.group.visible;
        game.rico.x = game.driven.x + 2;
        game.rico.z = game.driven.z + 2;
        tryEnterCar();
        return out && game.inCar;
      })());
      check('mission stage advances', (function () {
        SB.missions.start(0);
        var s0 = SB.missions.stage;
        // Stage 0 is enter_car and we are in the car: it must advance.
        SB.missions.update(0.1, { x: game.driven.x, z: game.driven.z, inCar: true });
        return SB.missions.stage === s0 + 1;
      })());
      check('no JS errors during play', game.errors === 0);
      check('camera aspect sane', game.camera.aspect > 1.2 && game.camera.aspect < 2.2);
      check('shot mode configures chase', (function () {
        SB.shots.apply('chase', game);
        return game.heroState.speed === 46 && SB.police.units.length === 2;
      })());
      var scripts = Array.prototype.slice.call(document.scripts);
      check('all scripts local', scripts.every(function (s) {
        return !s.src || s.src.indexOf('http') !== 0 || s.src.indexOf(window.location.origin) === 0;
      }));
    } catch (e) {
      results.push('FAIL playtest harness threw: ' + e.message);
    }
    var passed = results.filter(function (r) { return r.indexOf('PASS') === 0; }).length;
    var el = document.getElementById('playtest');
    var text = 'PLAYTEST ' + passed + '/' + results.length + (passed === results.length ? ' PASS' : ' FAIL') + '\n' + results.join('\n');
    if (el) {
      el.style.display = 'block';
      el.textContent = text;
    }
    document.title = 'PLAYTEST ' + passed + '/' + results.length;
    window.__playtestDone = { passed: passed, total: results.length, results: results };
  }

  // Boot once the DOM is ready (scripts load at the end of body, so now).
  init();
})();
