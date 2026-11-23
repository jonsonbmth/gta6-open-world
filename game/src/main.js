// Aurelia Bay — the game itself: boot, the fixed-timestep loop, input,
// cameras, combat, carjacking, drift and near-miss scoring, explosions,
// and saves. The world runs behind the title screen; M opens the city map;
// E steals and exits cars; the wanted level answers everything the player
// does wrong.
(function () {
  'use strict';
  var U = window.AB.util;
  var V = window.AB.vehicles;

  var RANKS = ['ROOKIE', 'DRIVER', 'HUSTLER', 'WHEELMAN', 'SHOT CALLER', 'FIXER', 'SUNSET RUNNER', 'LEGEND'];

  function boot() {
    // Every overlay in this game hides with the .hidden class; normalise the
    // shared show helper to toggle that class so menus actually open.
    U.show = function (el, on) { if (el) el.classList.toggle('hidden', !on); };
    var rng = U.makeRng(U.CITY_SEED);
    var container = U.el('game-container');

    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

    var sky = window.AB.sky.buildSky(scene, rng);
    var lights = window.AB.sky.buildLights(scene);
    var city = window.AB.city.buildCity(scene, rng);
    var missions = window.AB.missions.makeMissions();
    var audio = window.AB.audio.makeAudio();
    var hud = window.AB.hud.makeHud(city, missions);
    var traffic = V.makeTraffic(scene, city, rng, 14);
    var peds = window.AB.people.makePedestrians(scene, city, rng, 42);
    var police = window.AB.police.makePolice(scene, city, rng);

    // hero car + player
    var heroModel = V.makeCarModel('sports', 0xc22e2e);
    scene.add(heroModel);
    var car = V.makeCarState(heroModel, 0, 46, Math.PI);
    car.name = 'DORADO GT';
    car.tune = 'SPORTS · TUNE 2';
    var player = window.AB.people.makePlayer(rng);
    scene.add(player.model);
    player.x = 3; player.z = 46;

    // game state
    var g = {
      renderer: renderer, scene: scene, camera: camera,
      city: city, missions: missions, audio: audio, hud: hud,
      traffic: traffic, peds: peds, police: police,
      car: car, player: player,
      mode: 'title', // title | playing | paused | wasted
      onFoot: false,
      money: 27850, health: 78, armour: 61, rep: 2310,
      clockMinutes: 13 * 60 + 42,
      time: 0,
      career: {
        carsStolen: 41, copsEscaped: 12, highestWanted: 4,
        distanceKm: 48.2, takenOut: 23, longestJump: 47,
        abilitiesUsed: 38, nearMisses: 0
      },
      camYaw: 0, camPitch: 0.32, camDist: 9.5,
      camPos: new THREE.Vector3(0, 4, 60),
      camLook: new THREE.Vector3(0, 1, 40),
      keys: {},
      mouseDown: false, lastMX: 0, lastMY: 0,
      explosions: [],
      tracers: [],
      driftScore: 0, driftChain: 0,
      nearMissCooldown: 0,
      eyesUntil: 0,
      muted: false
    };

    // ---- input ----
    var KEYMAP = {
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      ShiftLeft: 'run', ShiftRight: 'run',
      Space: 'handbrake'
    };
    window.addEventListener('keydown', function (e) {
      if (KEYMAP[e.code]) { g.keys[KEYMAP[e.code]] = true; e.preventDefault(); }
      if (e.code === 'KeyE') { if (g.mode === 'playing') toggleCar(); }
      if (e.code === 'KeyM' || e.code === 'Escape') {
        if (g.mode === 'playing') openPause();
        else if (g.mode === 'paused') closePause();
      }
      if (e.code === 'KeyR') {
        if (g.mode === 'playing') { audio.nextStation(); hud.toast('Radio: ' + audio.station.name); }
      }
      if (e.code === 'KeyN') { g.muted = audio.toggleMute(); hud.toast(g.muted ? 'Sound muted' : 'Sound on'); }
      if (e.code === 'KeyF') { if (g.mode === 'playing') missions.nextDialogue(); }
      if (e.code === 'KeyZ') useAbility('swap');
      if (e.code === 'KeyX') useAbility('fix');
      if (e.code === 'KeyC') useAbility('eyes');
      if (e.code >= 'Digit1' && e.code <= 'Digit6') {
        hud.selectWeapon(parseInt(e.code.slice(5), 10) - 1);
      }
      if (e.code === 'Enter' && g.mode === 'title') startGame();
      audio.ensure(); audio.resume();
    });
    window.addEventListener('keyup', function (e) {
      if (KEYMAP[e.code]) g.keys[KEYMAP[e.code]] = false;
    });
    window.addEventListener('blur', function () { g.keys = {}; });
    renderer.domElement.addEventListener('mousedown', function (e) {
      g.mouseDown = true; g.lastMX = e.clientX; g.lastMY = e.clientY;
      audio.ensure(); audio.resume();
      if (g.mode === 'playing' && g.onFoot && e.button === 0) shoot();
    });
    window.addEventListener('mouseup', function () { g.mouseDown = false; });
    window.addEventListener('mousemove', function (e) {
      if (!g.mouseDown) return;
      var dx = e.clientX - g.lastMX, dy = e.clientY - g.lastMY;
      g.lastMX = e.clientX; g.lastMY = e.clientY;
      g.camYaw -= dx * 0.004;
      g.camPitch = U.clamp(g.camPitch + dy * 0.003, 0.08, 1.1);
    });
    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ---- title / pause buttons ----
    U.el('btn-continue').addEventListener('click', function () { audio.ensure(); startGame(); });
    U.el('btn-new').addEventListener('click', function () {
      audio.ensure();
      try { localStorage.removeItem('ab-save-1'); } catch (e) { /* private mode */ }
      startGame(true);
    });
    U.el('btn-help').addEventListener('click', function () {
      U.show(U.el('help-screen'), true);
    });
    U.el('btn-help-close').addEventListener('click', function () {
      U.show(U.el('help-screen'), false);
    });
    U.el('btn-resume').addEventListener('click', closePause);
    ['map', 'story', 'stats', 'crew', 'save'].forEach(function (t) {
      U.el('tab-' + t).addEventListener('click', function () { hud.switchTab(t); });
    });
    U.el('pause-menu').addEventListener('click', function (e) {
      var saveBtn = e.target.closest('[data-slot]');
      var loadBtn = e.target.closest('[data-load]');
      if (saveBtn) { saveGame(parseInt(saveBtn.dataset.slot, 10)); hud.showPause(true, hudState()); }
      if (loadBtn) { loadGame(parseInt(loadBtn.dataset.load, 10)); closePause(); }
    });
    U.el('btn-wasted').addEventListener('click', function () {
      g.health = 100; g.armour = 50;
      police.setWanted(0, { x: car.x, z: car.z });
      U.show(U.el('wasted-screen'), false);
      g.mode = 'playing';
    });

    function startGame(fresh) {
      if (fresh) {
        g.money = 500; g.health = 100; g.armour = 0; g.rep = 0;
        missions.setStage(0); missions.setTimer(300);
        police.setWanted(0, { x: car.x, z: car.z });
      }
      g.mode = 'playing';
      U.show(U.el('title-screen'), false);
      U.show(U.el('hud'), true);
      hud.toast('JOB 7/8 · THE EMBER RUN — lose the heat, reach the garage');
      audio.blip(880);
    }

    function openPause() {
      g.mode = 'paused';
      hud.showPause(true, hudState());
    }
    function closePause() {
      g.mode = 'playing';
      hud.showPause(false, hudState());
    }
    g.openPause = openPause;

    // ---- car enter / exit / steal ----
    function toggleCar() {
      if (g.onFoot) {
        // nearest car within 4 units: the hero car or a traffic car
        var best = null, bd = 16;
        var heroD = U.dist2(player.x, player.z, car.x, car.z);
        if (heroD < bd) { best = car; bd = heroD; }
        traffic.cars.forEach(function (t) {
          var d = U.dist2(player.x, player.z, t.model.position.x, t.model.position.z);
          if (d < bd) { best = t; bd = d; }
        });
        if (!best) { hud.toast('No car nearby'); return; }
        if (best !== car) {
          // steal: the traffic car becomes the player's, heat rises
          var stolen = V.makeCarState(best.model, best.model.position.x, best.model.position.z, best.road.axis === 'x' ? (best.dir > 0 ? 0 : Math.PI) : (best.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
          stolen.name = best.type === 'taxi' ? 'TAXI CAB' : (best.type === 'van' ? 'CARGO VAN' : 'STREET SEDAN');
          stolen.tune = 'STOCK';
          stolen.condition = 82;
          scene.remove(car.model);
          car = stolen;
          g.car = car;
          traffic.cars = traffic.cars.filter(function (t) { return t !== best; });
          g.career.carsStolen++;
          police.addHeat(1, { x: player.x, z: player.z });
          hud.toast('Car stolen · +1 wanted star');
          hud.popup('CAR STOLEN', stolen.name);
        }
        g.onFoot = false;
        player.model.visible = false;
        audio.blip(660);
      } else {
        exitCar(car.x + Math.sin(car.heading + Math.PI / 2) * 2.4, car.z + Math.cos(car.heading + Math.PI / 2) * 2.4, car.heading);
      }
    }
    function enterCar() {
      g.onFoot = false;
      player.model.visible = false;
    }
    function exitCar(x, z, heading) {
      g.onFoot = true;
      player.x = x; player.z = z; player.heading = heading;
      player.model.visible = true;
      player.model.position.set(x, 0, z);
      player.model.rotation.y = heading;
      car.speed = 0;
    }
    g.enterCar = enterCar;
    g.exitCar = exitCar;

    function useAbility(id) {
      if (g.mode !== 'playing') return;
      var used = hud.useAbility(id, g.time);
      if (!used) return;
      g.career.abilitiesUsed++;
      if (id === 'swap') {
        police.setWanted(Math.max(0, police.wanted - 1), { x: car.x, z: car.z });
        hud.toast('Plates swapped · one star gone');
      } else if (id === 'fix') {
        car.condition = 100;
        hud.toast('Hugo patched the car · condition 100%');
      } else if (id === 'eyes') {
        g.eyesUntil = g.time + 20;
        hud.toast('Nina marks every unit for 20 s');
      }
      audio.blip(990);
    }

    // ---- combat: on-foot shooting ----
    var raycaster = new THREE.Raycaster();
    function shoot() {
      var w = hud.weapons[hud.selectedWeapon];
      if (w.locked || w.ammo === 0) { hud.toast('No ammo — switch weapon'); return; }
      if (w.ammo !== Infinity) w.ammo--;
      audio.gunshot();
      player.aiming = true;
      setTimeout(function () { player.aiming = false; }, 350);
      // tracer from the player toward the camera aim point
      var dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      var origin = new THREE.Vector3(player.x, 1.45, player.z);
      raycaster.set(origin, dir);
      raycaster.far = 80;
      var hits = raycaster.intersectObjects(scene.children, true);
      var end = origin.clone().add(dir.clone().multiplyScalar(60));
      if (hits.length) end = hits[0].point.clone();
      var geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
      var tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 }));
      scene.add(tracer);
      g.tracers.push({ line: tracer, life: 0.12 });
      // hit a cruiser? heat rises
      if (hits.length) {
        var obj = hits[0].object;
        while (obj && !obj.userData.isCruiser) obj = obj.parent;
        if (obj) {
          police.addHeat(1, { x: player.x, z: player.z });
          hud.toast('You shot a cruiser · +1 wanted star');
        }
      }
    }

    // ---- explosions (staging + crashes) ----
    function spawnExplosion(x, z) {
      var group = new THREE.Group();
      var fire = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.95 }));
      fire.position.y = 2.4;
      group.add(fire);
      var core = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.95 }));
      core.position.y = 2.6;
      group.add(core);
      for (var i = 0; i < 7; i++) {
        var smoke = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 1.4, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x55555c, transparent: true, opacity: 0.75 }));
        smoke.position.set((Math.random() - 0.5) * 3, 4 + Math.random() * 5, (Math.random() - 0.5) * 3);
        group.add(smoke);
      }
      var glow = new THREE.PointLight(0xff8c1a, 60, 30);
      glow.position.y = 3;
      group.add(glow);
      group.position.set(x, 0, z);
      scene.add(group);
      g.explosions.push({ group: group, life: 2.2 });
      peds.scatter(x, z, 26);
    }
    g.spawnExplosion = spawnExplosion;

    // ---- saves ----
    function saveGame(slot) {
      var data = {
        summary: U.formatMoney(g.money) + ' · Job ' + missions.activeId + '/8 · ' + city.districtAt(car.x, car.z).name,
        money: g.money, health: g.health, armour: g.armour, rep: g.rep,
        stage: missions.stage, timer: missions.timer,
        x: car.x, z: car.z, heading: car.heading,
        clock: g.clockMinutes, wanted: police.wanted
      };
      try {
        localStorage.setItem('ab-save-' + slot, JSON.stringify(data));
        hud.toast('Saved to slot ' + slot);
      } catch (e) { hud.toast('Save failed — storage unavailable'); }
    }
    function loadGame(slot) {
      try {
        var raw = localStorage.getItem('ab-save-' + slot);
        if (!raw) return;
        var d = JSON.parse(raw);
        g.money = d.money; g.health = d.health; g.armour = d.armour; g.rep = d.rep;
        missions.setStage(d.stage); missions.setTimer(d.timer);
        car.x = d.x; car.z = d.z; car.heading = d.heading; car.speed = 0;
        g.clockMinutes = d.clock;
        police.setWanted(d.wanted, { x: d.x, z: d.z });
        hud.toast('Loaded slot ' + slot);
      } catch (e) { hud.toast('Load failed'); }
    }

    // ---- HUD state assembly ----
    function hudState() {
      var px = g.onFoot ? player.x : car.x;
      var pz = g.onFoot ? player.z : car.z;
      var heading = g.onFoot ? player.heading : car.heading;
      var d = city.districtAt(px, pz);
      var speedKmh = Math.abs(car.speed) * 3.6;
      return {
        px: px, pz: pz, heading: heading,
        money: g.money, wanted: police.wanted, inSight: police.inSight,
        clockMinutes: g.clockMinutes,
        health: g.health, armour: g.armour, rep: g.rep,
        rank: Math.min(7, Math.floor(g.rep / 400) + 1),
        rankName: RANKS[Math.min(7, Math.floor(g.rep / 400))],
        speedKmh: g.onFoot ? player.speed * 3.6 : speedKmh,
        carName: g.onFoot ? 'ON FOOT' : car.name,
        carCondition: car.condition, carTune: car.tune,
        district: d.name, street: city.nearestStreet(px, pz),
        standing: 'NEUTRAL', standingValue: 58,
        stationName: audio.station.name, stationSong: audio.station.song,
        onFoot: g.onFoot,
        policeUnits: police.units,
        career: g.career
      };
    }
    g.hudState = hudState;

    // ---- camera ----
    function updateCamera(dt) {
      var px = g.onFoot ? player.x : car.x;
      var pz = g.onFoot ? player.z : car.z;
      var heading = g.onFoot ? player.heading : car.heading;
      var targetPos = new THREE.Vector3();
      var targetLook = new THREE.Vector3();
      if (g.mode === 'title') {
        // slow orbit around the boulevard for the title backdrop
        var t = g.time * 0.05;
        targetPos.set(Math.sin(t) * 26, 7, 46 + Math.cos(t) * 26);
        targetLook.set(0, 1.5, 30);
      } else if (g.onFoot) {
        var yaw = heading + g.camYaw;
        targetPos.set(
          px - Math.sin(yaw) * 6.5,
          3.1 + g.camPitch * 2,
          pz - Math.cos(yaw) * 6.5
        );
        targetLook.set(px + Math.sin(heading) * 4, 1.5, pz + Math.cos(heading) * 4);
      } else {
        var speedNorm = Math.abs(car.speed) / V.MAX_SPEED;
        var back = 10.5 + speedNorm * 2.5;
        var up = 3.8 + speedNorm * 0.6;
        // sit slightly to the side so the car reads in three-quarter rear —
        // dead-behind makes any car look like a flat slab.
        var rightX = -Math.cos(heading), rightZ = Math.sin(heading);
        targetPos.set(
          px - Math.sin(heading) * back + rightX * 3.6,
          up,
          pz - Math.cos(heading) * back + rightZ * 3.6
        );
        targetLook.set(px + Math.sin(heading) * 9, 1.3, pz + Math.cos(heading) * 9);
        camera.fov = U.damp(camera.fov, 62 + speedNorm * 10, 3, dt);
        camera.updateProjectionMatrix();
      }
      // keep the camera out of buildings: pull toward the subject if inside one
      for (var i = 0; i < city.colliders.length; i++) {
        var c = city.colliders[i];
        if (targetPos.x > c.minX && targetPos.x < c.maxX && targetPos.z > c.minZ && targetPos.z < c.maxZ && targetPos.y < 30) {
          targetPos.y = 32;
          break;
        }
      }
      if (targetPos.y < 0.7) targetPos.y = 0.7;
      var snap = g.mode === 'title' ? 0.6 : 5;
      g.camPos.x = U.damp(g.camPos.x, targetPos.x, snap, dt);
      g.camPos.y = U.damp(g.camPos.y, targetPos.y, snap, dt);
      g.camPos.z = U.damp(g.camPos.z, targetPos.z, snap, dt);
      g.camLook.x = U.damp(g.camLook.x, targetLook.x, 8, dt);
      g.camLook.y = U.damp(g.camLook.y, targetLook.y, 8, dt);
      g.camLook.z = U.damp(g.camLook.z, targetLook.z, 8, dt);
      camera.position.copy(g.camPos);
      camera.lookAt(g.camLook);
    }

    // snap the camera to its ideal spot (screenshot staging: no damp lag)
    function snapCamera() {
      var px = g.onFoot ? player.x : car.x;
      var pz = g.onFoot ? player.z : car.z;
      var heading = g.onFoot ? player.heading : car.heading;
      if (g.onFoot) {
        var yaw = heading + g.camYaw;
        g.camPos.set(px - Math.sin(yaw) * 6.5, 3.1 + g.camPitch * 2, pz - Math.cos(yaw) * 6.5);
        g.camLook.set(px + Math.sin(heading) * 4, 1.5, pz + Math.cos(heading) * 4);
      } else {
        var rightX = -Math.cos(heading), rightZ = Math.sin(heading);
        g.camPos.set(px - Math.sin(heading) * 10.5 + rightX * 3.6, 3.8, pz - Math.cos(heading) * 10.5 + rightZ * 3.6);
        g.camLook.set(px + Math.sin(heading) * 9, 1.3, pz + Math.cos(heading) * 9);
      }
      camera.position.copy(g.camPos);
      camera.lookAt(g.camLook);
    }
    g.snapCamera = snapCamera;

    // ---- near-miss + drift scoring ----
    function scoring(dt) {
      if (g.onFoot || g.mode !== 'playing') return;
      g.nearMissCooldown = Math.max(0, g.nearMissCooldown - dt);
      var spd = Math.abs(car.speed);
      traffic.cars.forEach(function (t) {
        var d2 = U.dist2(car.x, car.z, t.model.position.x, t.model.position.z);
        if (d2 < 9 && d2 > 2.5 && spd > 20 && g.nearMissCooldown <= 0) {
          g.nearMissCooldown = 1.5;
          g.money += 150;
          g.career.nearMisses++;
          hud.popup('NEAR MISS +$150', '');
          audio.blip(1200);
        }
      });
      if (car.drift > 0.6 && spd > 14) {
        g.driftChain += dt;
        if (g.driftChain > 1.2 && Math.floor(g.driftChain) > g.driftScore) {
          g.driftScore = Math.floor(g.driftChain);
          hud.popup('DRIFT x' + (g.driftScore + 2), '');
        }
      } else {
        if (g.driftChain > 1.2) {
          var bonus = 100 * g.driftScore;
          g.money += bonus;
        }
        g.driftChain = 0; g.driftScore = 0;
      }
    }

    // ---- main loop: fixed timestep for logic, render every frame ----
    var last = performance.now();
    var acc = 0;
    var STEP = 1 / 60;
    function frame(now) {
      requestAnimationFrame(frame);
      // clamp dt to [0, 0.1]: a rAF timestamp can arrive EARLIER than the
      // performance.now() taken at boot (long synchronous build), and one
      // negative dt would bury the accumulator and stall the game for seconds
      var dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      acc += dt;
      var steps = 0;
      while (acc >= STEP && steps < 4) {
        step(STEP);
        acc -= STEP;
        steps++;
      }
      renderer.render(scene, camera);
    }

    function step(dt) {
      g.time += dt;
      sky.update(dt);
      var px = g.onFoot ? player.x : car.x;
      var pz = g.onFoot ? player.z : car.z;
      lights.follow(px, pz);
      traffic.update(dt, { x: px, z: pz });
      peds.update(dt);

      if (g.mode === 'playing') {
        g.clockMinutes += dt * 0.5; // 1 real second = 30 game seconds
        missions.tickTimer(dt);
        if (g.onFoot) {
          window.AB.people.updatePlayerOnFoot(player, {
            forward: !!g.keys.forward, back: !!g.keys.back,
            left: !!g.keys.left, right: !!g.keys.right,
            run: !!g.keys.run
          }, dt, city.colliders, player.heading + g.camYaw);
        } else {
          var crashed = V.updatePlayerCar(car, {
            throttle: !!g.keys.forward, brake: !!g.keys.back,
            reverse: false,
            left: !!g.keys.left, right: !!g.keys.right,
            handbrake: !!g.keys.handbrake
          }, dt, city.colliders);
          if (crashed) {
            hud.popup('CRASH', 'Condition ' + Math.round(car.condition) + '%');
            police.addHeat(0, { x: car.x, z: car.z });
          }
          g.career.distanceKm += Math.abs(car.speed) * dt / 1000;
        }
        var pSpeed = g.onFoot ? player.speed : car.speed;
        police.update(dt, { x: px, z: pz, heading: g.onFoot ? player.heading : car.heading }, Math.abs(pSpeed), g.time);
        scoring(dt);
        // mission progress: reaching the target advances the stage
        var tgt = missions.target();
        var d2 = U.dist2(px, pz, tgt.x, tgt.z);
        if (missions.stage === 1 && police.wanted === 0) {
          var res = missions.advance();
          if (!res.completed) { g.money += 1500; hud.toast('Heat lost · stage clear +$1,500'); }
        } else if ((missions.stage === 2 || missions.stage === 3) && d2 < 100) {
          var res2 = missions.advance();
          if (res2.completed) {
            g.money += res2.reward;
            hud.popup('JOB COMPLETE', '+' + U.formatMoney(res2.reward));
            police.setWanted(0, { x: px, z: pz });
          } else {
            g.money += 1500;
            hud.toast('Stage clear +$1,500 · ' + missions.currentStageText());
          }
        }
        // cruisers touching the player car damage it
        police.cruisers.forEach(function (c) {
          var cd = U.dist2(c.x, c.z, car.x, car.z);
          if (!g.onFoot && cd < 7) {
            car.condition = Math.max(30, car.condition - 6 * dt);
            if (car.condition <= 30) {
              spawnExplosion(car.x, car.z);
              car.condition = 100;
              g.health = Math.max(10, g.health - 20);
              hud.popup('CAR WRECKED', 'Vera sends a replacement');
            }
          }
        });
        if (g.health <= 0 && g.mode === 'playing') {
          g.mode = 'wasted';
          U.show(U.el('wasted-screen'), true);
        }
        audio.setEngine(Math.abs(car.speed) / V.MAX_SPEED, !g.onFoot);
        audio.setSiren(police.wanted > 0);
        hud.update(hudState(), dt, g.time);
      }

      // explosions + tracers fade
      for (var i = g.explosions.length - 1; i >= 0; i--) {
        var ex = g.explosions[i];
        ex.life -= dt;
        ex.group.children.forEach(function (ch) {
          if (ch.material && ch.material.transparent) ch.material.opacity = Math.max(0, ex.life / 2.2) * 0.9;
          if (ch.isMesh) ch.position.y += dt * 1.5;
        });
        if (ex.life <= 0) {
          scene.remove(ex.group);
          g.explosions.splice(i, 1);
        }
      }
      for (var j = g.tracers.length - 1; j >= 0; j--) {
        var tr = g.tracers[j];
        tr.life -= dt;
        if (tr.life <= 0) {
          scene.remove(tr.line);
          g.tracers.splice(j, 1);
        }
      }
      updateCamera(dt);
    }

    // ---- boot sequence ----
    U.show(U.el('hud'), false);
    U.show(U.el('title-screen'), true);
    setText('title-job', 'Job 7 of 8 · The Ember Run · Lose the heat, reach the garage.');
    function setText(id, v) { var n = U.el(id); if (n) n.textContent = v; }
    camera.position.set(0, 7, 72);
    camera.lookAt(0, 1.5, 30);
    g.camPos.set(0, 7, 72);
    g.camLook.set(0, 1.5, 30);

    // screenshot staging via ?shot=N
    var shotNum = window.AB.shots.shotFromURL();
    if (shotNum > 0) {
      g.mode = 'playing';
      U.show(U.el('title-screen'), false);
      U.show(U.el('hud'), true);
      window.AB.shots.applyShot(g, shotNum);
      // let the world settle a moment before the first rendered frame
      for (var s = 0; s < 30; s++) step(STEP);
      g.snapCamera();
    }

    window.AB_GAME = g;
    requestAnimationFrame(frame);
    return g;
  }

  window.AB.main = { boot: boot };
})();
