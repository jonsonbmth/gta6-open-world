// SOLMAR BAY — boot, game loop, cameras, driving/walking state machine,
// enter/exit cars, combat, near-miss bonuses, busted, saving and shots.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var U = SB.utils;

  var game = {
    frame: 0, clock: null, renderer: null, scene: null, camera: null, composer: null,
    worldState: null, hero: null, rico: null, peds: [], traffic: [], crew: [],
    playerCar: null, stealTarget: null, stoleTarget: false,
    state: null, started: false, shotMode: '', shotFrozen: false, freezeAtFrame: -1,
    displaySpeedKmh: null, titleCam: null, footCamShot: false,
    camLook: new THREE.Vector3(), elapsed: 0, saveTimer: 0, nearMissCd: {}
  };
  SB.game = game;

  var P = SB.shots.params;

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    var saved = SB.save.load();
    game.state = saved || SB.save.defaults();
    game.state.money = game.state.money || 42780;

    var canvas = U.$('gl');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(P.perfLow ? 0.5 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    game.renderer = renderer;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060f);
    game.scene = scene;
    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(0, 4, -8);
    game.camera = camera;

    // World, police, HUD.
    game.worldState = SB.world.build(scene, { seed: P.seed });
    SB.police.init(scene, { seed: 31 });
    SB.hud.init();
    game.composer = new SB.postfx.BloomComposer(renderer);
    game.composer.lowPerf = P.perfLow;

    // Hero car + Rico at the marina.
    game.hero = SB.cars.makeCar('hero');
    SB.cars.placeCar(game.hero, 100, 47, 0.9);
    scene.add(game.hero.group);
    game.rico = SB.people.makeRico();
    game.rico.group.position.set(104, 0.55, 55);
    game.rico.heading = Math.PI / 2;
    scene.add(game.rico.group);

    // Traffic.
    var rng = new U.RNG(P.seed + 77);
    var trafficKinds = ['sedan', 'coupe', 'hatch', 'taxi', 'sedan', 'coupe', 'sedan', 'hatch', 'taxi', 'coupe'];
    for (var i = 0; i < 10; i++) {
      var kind = trafficKinds[i];
      var car = SB.cars.makeCar(kind, { color: SB.cars.TRAFFIC_COLORS[i % SB.cars.TRAFFIC_COLORS.length] });
      car.route = SB.cars.makeTrafficRoute(rng);
      var start = car.route[0];
      SB.cars.placeCar(car, start.x + rng.range(-2, 2), start.z + rng.range(-30, 30), Math.atan2(car.route[1].x - start.x, car.route[1].z - start.z));
      car.routeIdx = 1;
      scene.add(car.group);
      game.traffic.push(car);
    }

    // Pedestrians on the sidewalks.
    for (var j = 0; j < 14; j++) {
      var coat = SB.people.COATS[j % SB.people.COATS.length];
      var ped = SB.people.makePerson({
        coat: coat, skin: [0xc98d5e, 0x8a5a3b, 0xe8b88a, 0x6e4630][j % 4],
        umbrella: (j % 3 === 0) ? [0xff2d95, 0x00e5ff, 0xffd21f][j % 3] : null
      });
      var side = j % 2 ? 1 : -1;
      ped.group.position.set(side * 10.2, 0, -110 + j * 16 + rng.range(-4, 4));
      ped.heading = rng.next() < 0.5 ? 0 : Math.PI;
      ped.waypoint = { x: side * 10.2, z: ped.group.position.z + (ped.heading === 0 ? 60 : -60) };
      ped.onArrive = (function (s) {
        return function (p) {
          p.heading += Math.PI;
          p.waypoint = { x: s * 10.2, z: p.group.position.z + (p.heading === 0 ? 60 : -60) };
        };
      })(side);
      scene.add(ped.group);
      game.peds.push(ped);
    }

    // Crew at their home spots (also used by the marina shot).
    placeCrew([
      { who: 'lena', x: 52, z: -18, heading: 0.6 },
      { who: 'dario', x: 108, z: 74, heading: -1.2 },
      { who: 'rosa', x: -70, z: 22, heading: 1.8 }
    ]);

    // Missions: resume the saved job/stage (never restart a job's stages).
    SB.missions.state.onStageStart = onStageStart;
    SB.missions.setJobStage(game.state.job, game.state.stage);

    // Title screen.
    var saveNote = U.$('save-note');
    if (saved && saveNote) {
      saveNote.textContent = 'Save found — Job ' + (saved.job + 1) + ', Stage ' + (saved.stage + 1) + ' · $' + saved.money;
      var cont = U.$('btn-continue');
      if (cont) {
        cont.classList.remove('hidden');
        U.$('continue-job').textContent = saved.job + 1;
      }
    }
    U.$('btn-start').addEventListener('click', function () { startGame(false); });
    var cb = U.$('btn-continue');
    if (cb) cb.addEventListener('click', function () { startGame(true); });

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) SB.save.save(game.state);
    });

    // Shot staging (deterministic) or playtest.
    if (P.shot) {
      SB.shots.stageShot(game);
      game.started = true;
      U.$('hud').classList.remove('hidden');
      if (P.shot === '2-title') U.$('hud').classList.add('hidden');
    }
    game.clock = new THREE.Clock();
    game.bootTime = performance.now();
    renderer.setAnimationLoop(tick);
  }

  function onStageStart(job, stageIdx, s) {
    // Job 3 stage 1: the steal target coupe appears on Crown Road.
    if (job === 2 && stageIdx === 0) {
      if (game.stealTarget) game.scene.remove(game.stealTarget.group);
      var coupe = SB.cars.makeCar('coupe', { color: 0x2a6f8e, name: 'STRATUS GT' });
      SB.cars.placeCar(coupe, -40, 30, 0.1);
      game.scene.add(coupe.group);
      game.stealTarget = coupe;
      game.stoleTarget = false;
    }
  }

  function startGame(continued) {
    SB.audio.ensure();
    SB.audio.setMuted(!!game.state.muted);
    if (!continued) {
      game.state = SB.save.defaults();
      SB.missions.setJobStage(0, 0);
    }
    game.started = true;
    hideTitle();
    U.$('hud').classList.remove('hidden');
    SB.hud.refreshMission();
    SB.audio.blip(880);
  }

  function hideTitle() { U.$('title-screen').classList.add('hidden'); }
  function showTitle() { U.$('title-screen').classList.remove('hidden'); }

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    game.camera.aspect = w / h;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(w, h);
    var size = game.renderer.getDrawingBufferSize(new THREE.Vector2());
    game.composer.setSize(size.x, size.y);
  }

  function playerPos() {
    if (game.playerCar) {
      var c = game.playerCar;
      return {
        x: c.group.position.x, z: c.group.position.z,
        speed: Math.abs(c.speed), inCar: true,
        onRam: function () { SB.cars.damage(c, 2); SB.police.addHeat(2); }
      };
    }
    return {
      x: game.rico.group.position.x, z: game.rico.group.position.z,
      speed: game.rico.speed, inCar: false, onRam: null
    };
  }

  function enterCar(car, silent) {
    game.playerCar = car;
    car.isPlayer = true;
    game.rico.group.visible = false;
    if (car === game.stealTarget) game.stoleTarget = true;
    if (!silent) {
      if (car !== game.hero && car.kind !== 'police') {
        SB.police.addHeat(14);
        SB.hud.toast('Car stolen — the heat is on!');
        if (game.state.garage.indexOf(car.name) < 0) game.state.garage.push(car.name);
      }
      SB.audio.blip(660);
    }
  }

  function exitCar(silent) {
    if (!game.playerCar) return;
    var c = game.playerCar;
    c.isPlayer = false;
    game.rico.group.position.set(c.group.position.x + 2.2, 0, c.group.position.z + 0.5);
    game.rico.group.visible = true;
    game.rico.heading = c.heading;
    game.playerCar = null;
    if (!silent) SB.audio.blip(520);
  }

  function nearestCar(x, z, maxD) {
    var best = null, bestD = maxD * maxD;
    var all = [game.hero].concat(game.traffic).concat(SB.police.units());
    if (game.stealTarget) all.push(game.stealTarget);
    all.forEach(function (c) {
      var d2 = U.dist2(c.group.position.x, c.group.position.z, x, z);
      if (d2 < bestD) { bestD = d2; best = c; }
    });
    return best;
  }

  function placeCrew(list) {
    // Remove old crew, place the named characters at fixed spots.
    game.crew.forEach(function (p) { game.scene.remove(p.group); });
    game.crew = [];
    var defs = {
      lena: { coat: 0xff7a3d, skin: 0x8a5a3b, umbrella: 0xff2d95, name: 'Lena' },
      dario: { coat: 0x2fae5f, skin: 0x6e4630, umbrella: 0x00e5ff, name: 'Dario' },
      rosa: { coat: 0xb06fd8, skin: 0xb07a4e, umbrella: 0xffd21f, name: 'Mama Rosa' }
    };
    list.forEach(function (spot) {
      var d = defs[spot.who];
      if (!d) return;
      var p = SB.people.makePerson({ coat: d.coat, skin: d.skin, umbrella: d.umbrella, name: d.name });
      p.group.position.set(spot.x, spot.y || 0, spot.z);
      p.heading = spot.heading || 0;
      p.group.rotation.y = p.heading;
      game.scene.add(p.group);
      game.crew.push(p);
    });
  }

  function shoot() {
    var px = game.rico.group.position.x, pz = game.rico.group.position.z;
    var heading = game.playerCar ? game.playerCar.heading : game.rico.heading;
    if (game.playerCar) { px = game.playerCar.group.position.x; pz = game.playerCar.group.position.z; }
    var fx = Math.sin(heading), fz = Math.cos(heading);
    SB.audio.blip(180);
    SB.police.addHeat(8);
    SB.people.panicNear(game.peds, px, pz, 26);
    // Hitscan: nearest car/ped in a forward cone takes damage.
    var best = null, bestD = 144;
    game.traffic.concat(SB.police.units()).forEach(function (c) {
      var dx = c.group.position.x - px, dz = c.group.position.z - pz;
      var d2 = dx * dx + dz * dz;
      var dot = (dx * fx + dz * fz) / (Math.sqrt(d2) || 1);
      if (d2 < bestD && dot > 0.7) { bestD = d2; best = c; }
    });
    if (best) {
      SB.cars.damage(best, 25);
      SB.hud.showAction('HIT -$0');
    }
  }

  function busted() {
    SB.police.setWanted(0);
    game.state.money = Math.max(0, game.state.money - 500);
    SB.hud.toast('BUSTED — the night takes $500');
    SB.save.save(game.state);
    if (game.playerCar) exitCar(true);
    game.rico.group.position.set(2, 0, 20);
    game.rico.heading = 0;
  }

  function hudState() {
    var pp = playerPos();
    var car = game.playerCar;
    var speedKmh = game.displaySpeedKmh !== null && game.displaySpeedKmh !== undefined
      ? game.displaySpeedKmh
      : Math.abs(car ? car.speed : game.rico.speed) * 3.6;
    // Gear follows the DISPLAYED speed (the chase shot overrides it to 167).
    var gear = Math.min(6, 1 + Math.floor(speedKmh / 30));
    var st = SB.audio.currentStation();
    var mins = 22 * 60 + 47 + Math.floor(game.elapsed / 6);
    var hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
    var mm = String(mins % 60).padStart(2, '0');
    return {
      x: pp.x, z: pp.z, heading: car ? car.heading : game.rico.heading,
      money: game.state.money, wanted: SB.police.wanted(),
      speedKmh: speedKmh, gear: gear,
      carName: car ? car.name : 'ON FOOT',
      condition: car ? car.condition : 95,
      station: st.name, song: st.song,
      district: SB.world.districtAt(pp.x, pp.z),
      respect: game.state.respect, respectLevel: game.state.respectLevel,
      clock: hh + ':' + mm, inCar: !!car
    };
  }

  // --- Cameras ----------------------------------------------------------------------
  var camPosSmooth = new THREE.Vector3(0, 4, -8);
  var camLookSmooth = new THREE.Vector3(0, 1, 0);

  function updateCamera(dt) {
    var cam = game.camera;
    var snap = game.shotFrozen || !!game.shotMode;
    var kPos = snap ? 1 : 1 - Math.exp(-6 * dt);
    var kLook = snap ? 1 : 1 - Math.exp(-10 * dt);
    var desired = new THREE.Vector3(), look = new THREE.Vector3();

    if (!game.started || U.$('title-screen').classList.contains('hidden') === false) {
      if (game.titleCam) {
        desired.copy(game.titleCam.pos);
        look.copy(game.titleCam.look);
      } else {
        // Slow pan down Solmar Avenue: neon both sides, skyline ahead.
        // (An orbit around the marina hero kept swinging past lamp poles.)
        var sway = Math.sin(game.elapsed * 0.05) * 1.5;
        desired.set(5.5 + sway, 3.4, 6);
        look.set(-0.5, 1.4, 55);
      }
    } else if (game.playerCar) {
      var c = game.playerCar, h = c.heading;
      var fx = Math.sin(h), fz = Math.cos(h);
      var rx = Math.cos(h), rz = -Math.sin(h);
      // LOW and CLOSE: hero fills ~35-40% of frame width. A wide side
      // offset (1.8 m) keeps the rear-3/4 read instead of a flat rear slab.
      desired.set(
        c.group.position.x - fx * 6.0 + rx * 1.8,
        2.2,
        c.group.position.z - fz * 6.0 + rz * 1.8
      );
      look.set(
        c.group.position.x + fx * 6,
        1.15,
        c.group.position.z + fz * 6
      );
    } else {
      var r = game.rico, rh = r.heading;
      var rfx = Math.sin(rh), rfz = Math.cos(rh);
      var back = game.footCamShot ? 7.5 : 6.0;
      var height = game.footCamShot ? 3.6 : 3.0;
      desired.set(
        r.group.position.x - rfx * back,
        height,
        r.group.position.z - rfz * back
      );
      look.set(
        r.group.position.x + rfx * 4,
        1.4,
        r.group.position.z + rfz * 4
      );
    }
    camPosSmooth.lerp(desired, kPos);
    camLookSmooth.lerp(look, kLook);
    cam.position.copy(camPosSmooth);
    cam.lookAt(camLookSmooth);
    // Speed FOV kick (not in shot mode).
    var targetFov = 62;
    if (game.playerCar && !game.shotMode) {
      targetFov = 62 + Math.min(8, Math.abs(game.playerCar.speed) / game.playerCar.maxSpeed * 8);
    }
    if (Math.abs(cam.fov - targetFov) > 0.1) {
      cam.fov = U.damp(cam.fov, targetFov, 4, dt);
      cam.updateProjectionMatrix();
    }
  }

  // --- Collisions ---------------------------------------------------------------------
  function collideBuildings(obj, radius) {
    var b = game.worldState && game.worldState.buildings;
    if (!b) return;
    var p = obj.group ? obj.group.position : obj.position;
    for (var i = 0; i < b.length; i++) {
      var bb = b[i];
      var cx = U.clamp(p.x, bb.x0, bb.x1);
      var cz = U.clamp(p.z, bb.z0, bb.z1);
      var dx = p.x - cx, dz = p.z - cz;
      var d2 = dx * dx + dz * dz;
      if (d2 < radius * radius && d2 > 0.0001) {
        var d = Math.sqrt(d2);
        p.x = cx + dx / d * radius;
        p.z = cz + dz / d * radius;
        if (obj.speed !== undefined) obj.speed *= 0.4;
      } else if (d2 <= 0.0001) {
        // Centre inside the box: push out along the smallest penetration.
        var pl = p.x - bb.x0, pr = bb.x1 - p.x, pt = p.z - bb.z0, pb = bb.z1 - p.z;
        var m = Math.min(pl, pr, pt, pb);
        if (m === pl) p.x = bb.x0 - radius;
        else if (m === pr) p.x = bb.x1 + radius;
        else if (m === pt) p.z = bb.z0 - radius;
        else p.z = bb.z1 + radius;
        if (obj.speed !== undefined) obj.speed *= 0.4;
      }
    }
  }

  function collideCars(a, b, radius) {
    var dx = b.group.position.x - a.group.position.x;
    var dz = b.group.position.z - a.group.position.z;
    var d2 = dx * dx + dz * dz;
    var min = radius * 2;
    if (d2 < min * min && d2 > 0.001) {
      var d = Math.sqrt(d2);
      var push = (min - d) / 2;
      var nx = dx / d, nz = dz / d;
      a.group.position.x -= nx * push; a.group.position.z -= nz * push;
      b.group.position.x += nx * push; b.group.position.z += nz * push;
      if (Math.abs(a.speed) > 3 || Math.abs(b.speed) > 3) {
        SB.cars.damage(a, 3); SB.cars.damage(b, 3);
        a.speed *= 0.6; b.speed *= 0.6;
      }
      return true;
    }
    return false;
  }

  // --- Input + per-frame logic -----------------------------------------------------------
  function handleInput(dt) {
    var I = SB.input;
    if (!game.started) {
      if (I.pressed('Enter')) startGame(false);
      return;
    }
    if (I.pressed('KeyM')) {
      if (SB.hud.mapOpen()) SB.hud.closeMap();
      else SB.hud.openMap(hudState());
      SB.audio.blip(740);
    }
    if (I.pressed('Escape') && SB.hud.mapOpen()) SB.hud.closeMap();
    if (I.pressed('KeyR')) {
      var st = SB.audio.nextStation();
      SB.hud.toast('RADIO — ' + st.name + ' · ' + st.song);
      game.state.station = SB.audio.station;
    }
    if (I.pressed('KeyN')) {
      game.state.muted = !game.state.muted;
      SB.audio.setMuted(game.state.muted);
      SB.hud.toast(game.state.muted ? 'Sound off' : 'Sound on');
    }
    if (I.pressed('KeyF')) shoot();
    if (I.pressed('KeyE')) {
      if (game.playerCar) exitCar(false);
      else {
        var c = nearestCar(game.rico.group.position.x, game.rico.group.position.z, 4.5);
        if (c) enterCar(c, false);
      }
    }
    if (SB.hud.mapOpen()) return; // no driving while the map is open

    if (game.playerCar) {
      var th = (I.isDown('KeyW') || I.isDown('ArrowUp') ? 1 : 0) - (I.isDown('KeyS') || I.isDown('ArrowDown') ? 1 : 0);
      var st2 = (I.isDown('KeyD') || I.isDown('ArrowRight') ? 1 : 0) - (I.isDown('KeyA') || I.isDown('ArrowLeft') ? 1 : 0);
      var hb = I.isDown('Space');
      SB.cars.updateCar(game.playerCar, dt, { throttle: th, steer: st2, handbrake: hb });
      if (hb && Math.abs(game.playerCar.speed) > 12 && Math.random() < dt * 2) SB.audio.skid();
      SB.audio.setEngine(Math.abs(game.playerCar.speed) / game.playerCar.maxSpeed, true);
      collideBuildings(game.playerCar, 2.3);
      // Near miss: passing a traffic car close and fast without touching.
      game.traffic.forEach(function (t, i) {
        var dx = t.group.position.x - game.playerCar.group.position.x;
        var dz = t.group.position.z - game.playerCar.group.position.z;
        var d2 = dx * dx + dz * dz;
        var h = game.playerCar.heading;
        var lon = dx * Math.sin(h) + dz * Math.cos(h);
        var lat = Math.abs(dx * Math.cos(h) - dz * Math.sin(h));
        var key = 't' + i;
        if (d2 < 64 && lat < 2.6 && Math.abs(game.playerCar.speed) > 15) {
          if (game.nearMissCd[key] === undefined) game.nearMissCd[key] = lon > 0 ? 1 : -1;
          else if ((lon > 0 ? 1 : -1) !== game.nearMissCd[key]) {
            game.nearMissCd[key] = 99; // consumed
            game.state.money += 250;
            game.state.nearMisses++;
            SB.hud.showAction('NEAR MISS +$250');
            SB.audio.blip(1200);
          }
        } else if (d2 > 400) {
          delete game.nearMissCd[key];
        }
        collideCars(game.playerCar, t, 2.3);
      });
      SB.police.units().forEach(function (u) { collideCars(game.playerCar, u, 2.3); });
      // Clamp to the city (and out of the bay).
      game.playerCar.group.position.x = U.clamp(game.playerCar.group.position.x, -112, 108);
      game.playerCar.group.position.z = U.clamp(game.playerCar.group.position.z, -126, 112);
    } else {
      var fwd = I.isDown('KeyW') || I.isDown('ArrowUp');
      var back = I.isDown('KeyS') || I.isDown('ArrowDown');
      var left = I.isDown('KeyA') || I.isDown('ArrowLeft');
      var right = I.isDown('KeyD') || I.isDown('ArrowRight');
      var camYaw = Math.atan2(
        game.camera.position.x - game.rico.group.position.x,
        game.camera.position.z - game.rico.group.position.z
      ) + Math.PI;
      SB.people.updateRico(game.rico, dt, {
        forward: fwd, back: back, left: left, right: right,
        run: I.isDown('ShiftLeft') || I.isDown('ShiftRight')
      }, camYaw);
      SB.audio.setEngine(0, false);
      collideBuildings(game.rico, 0.6);
    }
    I.endFrame();
  }

  function tick() {
    game.frame++;
    var rawDt = game.clock.getDelta();
    var dt = Math.min(rawDt, 0.1); // dt clamp
    var frozen = game.shotFrozen;

    if (game.shotMode && !frozen && (game.frame >= game.freezeAtFrame || performance.now() - game.bootTime > 6000)) {
      game.shotFrozen = true;
      frozen = true;
    }

    if (!frozen) {
      game.elapsed += dt;
      handleInput(dt);
      if (game.started) {
        SB.missions.update(dt, {
          x: playerPos().x, z: playerPos().z,
          inCar: !!game.playerCar,
          carName: game.playerCar ? game.playerCar.name : '',
          stoleTarget: game.stoleTarget
        });
        SB.police.update(dt, game.elapsed, playerPos());
        var pp = playerPos();
        game.traffic.forEach(function (c) { SB.cars.updateTraffic(c, dt, pp, null); });
        var danger = SB.police.wanted() >= 3 ? pp : null;
        game.peds.forEach(function (p) { SB.people.updatePed(p, dt, danger); });
        game.crew.forEach(function (p) { SB.people.animateWalk(p, dt, false); });
        SB.world.update(dt, game.elapsed, game.camera, false);
      } else {
        SB.world.update(dt, game.elapsed, game.camera, false);
      }
      // Periodic autosave.
      game.saveTimer += dt;
      if (game.saveTimer > 10) {
        game.saveTimer = 0;
        if (game.started) SB.save.save(game.state);
      }
    }

    updateCamera(frozen ? 0.016 : dt);
    // HUD also ticks in playtest mode (title up, game not started) so the
    // minimap is drawn and checkable there.
    if (game.started || P.playtest) SB.hud.update(frozen ? 0 : dt, hudState());

    // Render (bloom composer, or direct ACES fallback).
    try {
      if (game.composer && game.composer.enabled) game.composer.render(game.scene, game.camera);
      else game.renderer.render(game.scene, game.camera);
    } catch (e) {
      if (game.composer) game.composer.enabled = false;
      game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      game.renderer.render(game.scene, game.camera);
    }

    // Playtest: run once after warmup (wall-clock, so slow software
    // rendering still reaches it; frame count alone would take minutes).
    if (P.playtest && !game.playtestDone && performance.now() - game.bootTime > 8000) {
      game.playtestDone = true;
      SB.playtest.run(game);
    }
  }

  game.boot = boot;
  game.hideTitle = hideTitle;
  game.showTitle = showTitle;
  game.enterCar = enterCar;
  game.exitCar = exitCar;
  game.placeCrew = placeCrew;
  game.playerPos = playerPos;
  game.hudState = hudState;
  game.busted = busted;

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
