// AURELIA BAY — main entrypoint. Boots the renderer, builds the city, and
// runs the game loop: driving, walking, police, missions, camera and HUD.
// Controls: WASD drive/walk · E enter & exit car · SPACE handbrake · SHIFT
// run · M city map · R radio · F action · N mute · 1-4 weapons · CLICK shoot.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const game = {
    inCar: true, paused: false, started: false, elapsed: 0,
    speed: 0, heroSpeed: 0, heading: Math.PI / 2, topSpeed: 0,
    distance: 0, nearMisses: 0, health: 100, armour: 60,
    playerPos: new THREE.Vector3(4, 0, 42),
    driftScore: 0, nearMissCooldown: 0, keys: {},
  };

  function init() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    document.getElementById('game-root').appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
    camera.position.set(4, 7, 62);

    AB.Sky.buildSky(scene);
    const city = AB.City.buildCity(scene);
    const traffic = AB.Vehicles.makeTraffic(scene);
    const crowd = AB.People.makeCrowd(scene);
    const heli = AB.Heli.makeHeli();
    heli.position.set(2, 36, 8);
    scene.add(heli);
    const police = AB.Police.makePolice(scene, AB.City.BLOCKS);
    const mission = AB.Missions.makeMissionState(scene);
    const audio = AB.Audio.makeAudio();

    // Hero car: the red Aurelia GT coupe. Dante on foot beside it.
    const hero = AB.Vehicles.makeCar({ style: 'hero', color: 0xc0392b });
    hero.position.set(4, 0, 42);
    hero.rotation.y = Math.PI / 2;
    scene.add(hero);
    const dante = AB.People.makeDante();
    dante.position.set(6.5, 0, 42);
    dante.visible = false;
    scene.add(dante);

    game.scene = scene; game.camera = camera; game.renderer = renderer;
    game.city = city; game.traffic = traffic; game.crowd = crowd;
    game.heli = heli; game.police = police; game.mission = mission;
    game.audio = audio; game.hero = hero; game.dante = dante;
    game.hud = AB.HUD.createHUD(game);

    game.setDriving = function (inCar) {
      game.inCar = inCar;
      hero.visible = true;
      dante.visible = !inCar;
      if (!inCar) {
        dante.position.set(hero.position.x + 2.4, 0, hero.position.z);
        dante.rotation.y = hero.rotation.y;
        game.playerPos.copy(dante.position);
      } else {
        game.playerPos.copy(hero.position);
      }
    };

    bindInput();
    const shot = AB.Shots.stageShot(game);
    game.shotMode = shot > 0;
    if (shot) {
      game.started = true;
      game.hud.hideStart();
    }

    addEventListener('resize', function () {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    const clock = new THREE.Clock();
    let frames = 0;
    function loop() {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      frames++;
      if (!game.paused) update(dt, t);
      renderer.render(scene, camera);
      if (frames === 12) {
        window.AB_READY = true;
        window.AB_GAME = game;
      }
    }
    loop();
  }

  function bindInput() {
    addEventListener('keydown', function (e) {
      game.keys[e.code] = true;
      game.audio.resume();
      if (!game.started && (e.code === 'Enter' || e.code === 'Space')) {
        game.started = true;
        game.hud.hideStart();
        game.hud.showToast('THE EMBER RUN', 'JOB 8 / 8 — LOSE THE HELICOPTER');
        return;
      }
      if (e.code === 'KeyM') {
        game.paused = !game.paused;
        game.hud.setPaused(game.paused);
      }
      if (e.code === 'KeyN') {
        const m = game.audio.toggleMute();
        game.hud.showToast(m ? 'SOUND OFF' : 'SOUND ON', '');
      }
      if (e.code === 'KeyR') {
        const st = game.audio.cycleStation();
        game.hud.showToast(st, 'RADIO');
      }
      if (e.code === 'Digit1') game.hud.selectWeapon(0);
      if (e.code === 'Digit2') game.hud.selectWeapon(1);
      if (e.code === 'Digit3') game.hud.selectWeapon(2);
      if (e.code === 'Digit4') game.hud.selectWeapon(3);
      if (e.code === 'KeyE') {
        if (game.inCar) {
          game.setDriving(false);
        } else if (game.dante.position.distanceTo(game.hero.position) < 5) {
          game.setDriving(true);
          game.audio.blip(660, 0.12, 0.1);
        }
      }
      if (e.code === 'KeyF') {
        game.hud.showToast('ACTION', 'NOTHING TO DO HERE — KEEP MOVING');
      }
    });
    addEventListener('keyup', function (e) { game.keys[e.code] = false; });
    addEventListener('mousedown', function () {
      game.audio.resume();
      if (!game.started) {
        game.started = true;
        game.hud.hideStart();
        return;
      }
      if (!game.inCar && !game.paused) {
        game.audio.gunshot();
        AB.Police.addHeat(game.police, 6);
      }
    });
  }

  function update(dt, t) {
    const g = game;
    g.elapsed += dt;
    if (!g.started) {
      // Start screen: slow orbit around the hero car on Sunset Mile.
      const a = t * 0.07;
      g.camera.position.set(4 + Math.sin(a) * 16, 7, 42 + Math.cos(a) * 16);
      g.camera.lookAt(4, 1.5, 42);
      AB.Vehicles.updateTraffic(g.traffic, dt);
      AB.People.updateCrowd(g.crowd, dt, t);
      return;
    }

    if (g.shotMode) {
      // Staged screenshot: freeze the player, police and helicopter in their
      // staged poses; only ambient traffic, crowds and the rotor keep moving.
      const hu = g.heli.userData;
      hu.rotor.rotation.y += dt * 22;
      hu.tailRotor.rotation.z += dt * 34;
      hu.beacon.visible = Math.sin(t * 6) > 0;
      if (g.inCar) AB.Vehicles.driveWheels(g.hero, g.heroSpeed, 0, dt);
      g.speed = g.heroSpeed; // speedometer shows the staged speed
    } else {
      if (g.inCar) updateDriving(dt, t);
      else updateWalking(dt, t);
      AB.Police.updatePolice(g.police, g.playerPos, dt, performance.now());
      if (g.police.wanted >= 3) {
        AB.Heli.updateHeli(g.heli, g.playerPos, dt, t);
        g.heli.visible = true;
      } else {
        g.heli.visible = false;
      }
      g.audio.setSiren(g.police.wanted > 0, t);
    }

    AB.Vehicles.updateTraffic(g.traffic, dt);
    AB.People.updateCrowd(g.crowd, dt, t);

    // Mission progress.
    const res = AB.Missions.updateMission(g.mission, g.playerPos, g.police.wanted, dt, t);
    if (res === 'advance') {
      const out = AB.Missions.advanceMission(g.mission, g.scene);
      if (out === 'done') {
        g.mission.money += AB.Missions.JOBS[7].reward;
        g.mission.rep = Math.min(100, g.mission.rep + 15);
        g.hud.showToast('JOB COMPLETE', 'THE EMBER RUN — $8,500');
        g.audio.jingle();
      } else {
        g.hud.showToast('OBJECTIVE UPDATED', g.mission.stages[g.mission.stage].text);
        g.audio.blip(880, 0.2, 0.12);
      }
    }

    updateCamera(dt);
    g.hud.update(dt, t);
  }

  function updateDriving(dt, t) {
    const g = game, k = g.keys;
    const fwd = (k.KeyW || k.ArrowUp) ? 1 : 0;
    const back = (k.KeyS || k.ArrowDown) ? 1 : 0;
    const left = (k.KeyA || k.ArrowLeft) ? 1 : 0;
    const right = (k.KeyD || k.ArrowRight) ? 1 : 0;
    const handbrake = !!k.Space;
    const maxSpeed = 34;

    if (fwd) g.heroSpeed += dt * 14;
    if (back) g.heroSpeed -= dt * (g.heroSpeed > 0.5 ? 22 : 8);
    if (!fwd && !back) g.heroSpeed -= g.heroSpeed * dt * 0.5;
    g.heroSpeed = U.clamp(g.heroSpeed, -8, maxSpeed);
    if (handbrake) g.heroSpeed -= g.heroSpeed * dt * 1.2;

    // Steering: tighter at low speed, driftier with the handbrake.
    const steerInput = (left ? 1 : 0) - (right ? 1 : 0);
    const spdFactor = U.clamp(Math.abs(g.heroSpeed) / 12, 0, 1);
    const turnRate = handbrake ? 2.4 : 1.5;
    g.heading += steerInput * turnRate * spdFactor * dt * (g.heroSpeed < 0 ? -1 : 1);
    g.hero.rotation.y = g.heading;

    const fx = Math.cos(g.heading), fz = -Math.sin(g.heading);
    const prevX = g.hero.position.x, prevZ = g.hero.position.z;
    g.hero.position.x += fx * g.heroSpeed * dt;
    g.hero.position.z += fz * g.heroSpeed * dt;
    AB.Police.resolveBlocks(g.hero.position, 2.3, AB.City.BLOCKS);
    // World bounds.
    g.hero.position.x = U.clamp(g.hero.position.x, -185, 168);
    g.hero.position.z = U.clamp(g.hero.position.z, -168, 168);
    // A hard block hit kills speed and sparks a crash.
    const moved = Math.hypot(g.hero.position.x - prevX, g.hero.position.z - prevZ);
    const expected = Math.abs(g.heroSpeed) * dt;
    if (expected > 0.05 && moved < expected * 0.25 && Math.abs(g.heroSpeed) > 6) {
      g.heroSpeed *= 0.25;
      g.audio.crash();
      AB.Police.addHeat(g.police, 3);
      g.health = Math.max(0, g.health - 4);
    }
    g.distance += moved;
    g.topSpeed = Math.max(g.topSpeed, Math.abs(g.heroSpeed));
    g.speed = g.heroSpeed;
    g.playerPos.copy(g.hero.position);

    // Near-miss bonus: fast pass close to a traffic car.
    g.nearMissCooldown -= dt;
    if (Math.abs(g.heroSpeed) > 15 && g.nearMissCooldown <= 0) {
      for (let i = 0; i < g.traffic.length; i++) {
        const c = g.traffic[i];
        const d = Math.hypot(c.position.x - g.hero.position.x, c.position.z - g.hero.position.z);
        if (d > 2.6 && d < 4.2) {
          g.nearMisses++;
          g.mission.money += 150;
          g.hud.addScore('NEAR MISS  +150', '');
          g.audio.blip(990, 0.12, 0.1);
          g.nearMissCooldown = 2.5;
          break;
        }
      }
    }
    // Drift score while handbraking at speed.
    if (handbrake && Math.abs(g.heroSpeed) > 12) {
      g.driftScore += dt * 120;
      if (g.driftScore > 450) {
        g.mission.money += 450;
        g.hud.addScore('DRIFT x3  +450', 'gold');
        g.driftScore = 0;
      }
    } else {
      g.driftScore = Math.max(0, g.driftScore - dt * 200);
    }

    AB.Vehicles.driveWheels(g.hero, g.heroSpeed, steerInput, dt);
    g.audio.setEngine(Math.abs(g.heroSpeed), maxSpeed);
  }

  function updateWalking(dt, t) {
    const g = game, k = g.keys;
    const run = !!k.ShiftLeft || !!k.ShiftRight;
    const spd = run ? 6.5 : 3.4;
    let mx = 0, mz = 0;
    if (k.KeyW || k.ArrowUp) mz -= 1;
    if (k.KeyS || k.ArrowDown) mz += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      // Camera-relative movement: camera looks along -z of the heading.
      const sin = Math.sin(g.heading), cos = Math.cos(g.heading);
      const wx = mx * cos - mz * sin, wz = mx * sin + mz * cos;
      g.dante.position.x += wx * spd * dt;
      g.dante.position.z += wz * spd * dt;
      AB.Police.resolveBlocks(g.dante.position, 0.5, AB.City.BLOCKS);
      g.dante.position.x = U.clamp(g.dante.position.x, -185, 168);
      g.dante.position.z = U.clamp(g.dante.position.z, -168, 168);
      g.dante.rotation.y = Math.atan2(wx, wz);
      AB.People.walkCycle(g.dante, dt, spd);
      g.distance += spd * dt;
    } else {
      AB.People.idleCycle(g.dante, dt, t);
    }
    g.speed = moving ? spd : 0;
    g.playerPos.copy(g.dante.position);
    g.audio.setEngine(0, 1);
  }

  function updateCamera(dt) {
    const g = game;
    const cam = g.camera;
    if (g.inCar) {
      // Chase camera: behind and above the hero car, offset to one side so
      // the car's sculpted 3/4 profile reads, smoothed.
      const back = 11.5, up = 4.6;
      const rx = Math.sin(g.heading), rz = Math.cos(g.heading); // right vector
      const bx = g.hero.position.x - Math.cos(g.heading) * back + rx * 2.5;
      const bz = g.hero.position.z + Math.sin(g.heading) * back + rz * 2.5;
      const k = 1 - Math.exp(-dt * 4.5);
      cam.position.x += (bx - cam.position.x) * k;
      cam.position.y += ((g.hero.position.y + up) - cam.position.y) * k;
      cam.position.z += ((bz) - cam.position.z) * k;
      cam.lookAt(
        g.hero.position.x + Math.cos(g.heading) * 6,
        g.hero.position.y + 4.2,
        g.hero.position.z - Math.sin(g.heading) * 6
      );
    } else {
      // Third-person camera behind Dante.
      const back = 6.5, up = 3.2;
      const ry = g.dante.rotation.y;
      const bx = g.dante.position.x - Math.sin(ry) * back;
      const bz = g.dante.position.z - Math.cos(ry) * back;
      const k = 1 - Math.exp(-dt * 5);
      cam.position.x += (bx - cam.position.x) * k;
      cam.position.y += ((g.dante.position.y + up) - cam.position.y) * k;
      cam.position.z += ((bz) - cam.position.z) * k;
      cam.lookAt(g.dante.position.x, g.dante.position.y + 1.5, g.dante.position.z);
    }
  }

  // Boot once the DOM is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.AB_GAME_BOOT = true;
})();
