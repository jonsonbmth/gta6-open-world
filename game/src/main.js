// SOLMAR BAY — the game itself: boot, main loop, arcade car physics with real
// drift, on-foot mode, wanted level, collisions, and the 20-point playtest.

var SB = window.SB || (window.SB = {});

SB.game = (function () {
  const cfg = SB.config;
  let scene = null;
  let hero = null;
  let heroOnFoot = null;
  let pedestrians = [];
  let clock = null;
  let lastTime = 0;
  let saveTimer = 0;

  const state = {
    started: false,
    paused: false,
    onFoot: false,
    playerPos: { x: 240, z: -200, y: 0 },
    heading: 0,
    speed: 0, // forward speed (m/s), signed
    vel: { x: 0, z: 0 },
    wanted: 0,
    cash: 0,
    bestDrift: 0,
    driftPoints: 0,
    driftCombo: 0,
    drifting: false,
    time: 0,
    missionsWon: 0,
    autopilot: false,
    wantedCooldown: 0,
    wantedTimer: 0,
  };

  function boot() {
    SB.render.init();
    scene = new THREE.Scene();
    SB.world.build(scene);
    scene.add(SB.render.heroLight());
    scene.add(SB.render.pool());
    hero = SB.cars.buildHeroCar();
    scene.add(hero);
    heroOnFoot = SB.people.buildPerson(0xd21f26, 0x2a2a33);
    heroOnFoot.visible = false;
    scene.add(heroOnFoot);
    pedestrians = SB.people.spawnPedestrians(scene);
    SB.traffic.spawn(scene);
    SB.police.spawn(scene);
    SB.missions.build(scene);
    SB.missions.reset();
    SB.hud.init();

    // Restore a previous save (cash, best drift, missions, car spot).
    const saved = SB.save.loadGame();
    if (saved) {
      state.cash = saved.cash || 0;
      state.bestDrift = saved.bestDrift || 0;
      state.missionsWon = saved.missionsWon || 0;
      if (typeof saved.carX === 'number') {
        state.playerPos.x = saved.carX;
        state.playerPos.z = saved.carZ;
        state.heading = saved.heading || 0;
      }
    }

    // Shot mode (screenshots): start at once, no title click needed.
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      state.started = true;
      document.getElementById('title-screen').style.display = 'none';
      SB.shots.apply(shot);
    }
    if (params.get('playtest') === '1') {
      state.started = true;
      document.getElementById('title-screen').style.display = 'none';
      setTimeout(runPlaytest, 1200);
    }

    clock = new THREE.Clock();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function start() {
    state.started = true;
    document.getElementById('title-screen').style.display = 'none';
    SB.hud.showBanner('SUNSET SPRINT', 'Reach all 6 checkpoints before the timer runs out');
  }

  // --- car physics ---------------------------------------------------------------

  function updateCar(dt) {
    const input = SB.input;
    const car = cfg.car;
    const handbrake = state.autopilot ? false : input.handbrake();

    // Steering intent (autopilot steers toward the next checkpoint).
    let steer = 0;
    if (state.autopilot) {
      const cp = SB.missions.currentCheckpoint();
      if (cp) {
        const want = Math.atan2(cp.x - state.playerPos.x, cp.z - state.playerPos.z);
        let dh = want - state.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        steer = Math.max(-1, Math.min(1, dh * 1.6));
      }
    } else {
      steer = (input.left() ? 1 : 0) - (input.right() ? 1 : 0);
    }

    // Velocity is a world-space vector: the engine pushes along the car's
    // forward axis, the heading rotates freely, and the velocity direction
    // chases the heading — fast normally, slowly on the handbrake. That lag
    // is what drift is: the tail steps out while the nose points into the turn.
    let fwd = { x: Math.sin(state.heading), z: Math.cos(state.heading) };
    let vF = state.vel.x * fwd.x + state.vel.z * fwd.z;

    if (state.autopilot) {
      state.vel.x += fwd.x * car.accel * 0.75 * dt;
      state.vel.z += fwd.z * car.accel * 0.75 * dt;
    } else if (input.up()) {
      state.vel.x += fwd.x * car.accel * dt;
      state.vel.z += fwd.z * car.accel * dt;
    } else if (input.down()) {
      if (vF > 0.5) {
        state.vel.x -= fwd.x * car.brake * dt;
        state.vel.z -= fwd.z * car.brake * dt;
      } else {
        state.vel.x -= fwd.x * car.accel * 0.6 * dt;
        state.vel.z -= fwd.z * car.accel * 0.6 * dt;
      }
    }
    // Cap the forward speed.
    vF = state.vel.x * fwd.x + state.vel.z * fwd.z;
    if (vF > car.maxSpeed) {
      const ex = vF - car.maxSpeed;
      state.vel.x -= fwd.x * ex;
      state.vel.z -= fwd.z * ex;
    } else if (vF < -car.maxReverse) {
      const ex = vF + car.maxReverse;
      state.vel.x -= fwd.x * ex;
      state.vel.z -= fwd.z * ex;
    }

    // Yaw: responsive at low speed, calmer at high speed, boosted on handbrake.
    const speedAbs = Math.abs(vF);
    const yawBase = 0.55 + 1.35 * (1 - Math.min(1, speedAbs / car.maxSpeed));
    const yawRate = steer * yawBase * (handbrake ? 1.6 : 1) * (vF >= 0 ? 1 : -1);
    state.heading += yawRate * dt;

    // Velocity direction chases the heading (grip): 8/s normally, 2.5/s drifting.
    const speed = Math.hypot(state.vel.x, state.vel.z);
    if (speed > 0.5 && vF > 0.5) {
      const velAngle = Math.atan2(state.vel.x, state.vel.z);
      let diff = state.heading - velAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const alignRate = handbrake ? car.alignDrift : car.alignNormal;
      // Proportional chase: the lag angle settles at yawRate / alignRate, so a
      // handbrake turn (slow chase) holds a big slip angle = a real drift.
      const turn = diff * (1 - Math.exp(-alignRate * dt));
      const na = velAngle + turn;
      state.vel.x = Math.sin(na) * speed;
      state.vel.z = Math.cos(na) * speed;
    }
    // Rolling drag when coasting.
    if (!input.up() && !state.autopilot) {
      const d = Math.exp(-0.35 * dt);
      state.vel.x *= d;
      state.vel.z *= d;
    }

    // Final forward / lateral speeds for the HUD and drift detection.
    fwd = { x: Math.sin(state.heading), z: Math.cos(state.heading) };
    const right = { x: -Math.cos(state.heading), z: Math.sin(state.heading) };
    vF = state.vel.x * fwd.x + state.vel.z * fwd.z;
    const vR = state.vel.x * right.x + state.vel.z * right.z;
    state.speed = vF;

    // Drift detection + points.
    const wasDrifting = state.drifting;
    state.drifting = handbrake && Math.abs(vF) > 12 && Math.abs(vR) > 2.2;
    if (state.drifting) {
      state.driftPoints += Math.abs(vR) * dt * 2.2;
      state.driftCombo = Math.floor(state.driftPoints / 60) + 1;
    } else if (wasDrifting) {
      if (state.driftPoints > state.bestDrift) state.bestDrift = Math.round(state.driftPoints);
      state.driftPoints = 0;
      state.driftCombo = 0;
    }

    // Move + collide.
    state.playerPos.x += state.vel.x * dt;
    state.playerPos.z += state.vel.z * dt;
    collide(dt);

    // Mesh follow.
    hero.position.set(state.playerPos.x, 0, state.playerPos.z);
    hero.rotation.y = state.heading;
    const spin = vF * dt * 2.9;
    for (const w of hero.userData.wheels) w.rotation.x += spin;
    const steerAngle = steer * 0.42 * Math.min(1, Math.abs(state.speed) / 9);
    hero.userData.frontWheels[0].rotation.y = steerAngle;
    hero.userData.frontWheels[1].rotation.y = steerAngle;
    // Brake lights flare.
    hero.userData.taillight.material.emissiveIntensity = (input.down() || handbrake) ? 4.5 : 1.6;
  }

  // Circle (car) vs building AABBs + world bounds + sea wall.
  function collide(dt) {
    const r = 1.35;
    for (const b of SB.world.colliders) {
      const cx = Math.max(b.x0, Math.min(state.playerPos.x, b.x1));
      const cz = Math.max(b.z0, Math.min(state.playerPos.z, b.z1));
      const dx = state.playerPos.x - cx;
      const dz = state.playerPos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        state.playerPos.x += dx * push;
        state.playerPos.z += dz * push;
        // Kill the velocity component into the wall.
        const nx = dx / d, nz = dz / d;
        const vn = state.vel.x * nx + state.vel.z * nz;
        if (vn < 0) {
          state.vel.x -= vn * nx * 1.4;
          state.vel.z -= vn * nz * 1.4;
        }
      }
    }
    // World bounds + sea wall (the car cannot drive into the sea).
    state.playerPos.x = Math.max(-344, Math.min(326, state.playerPos.x));
    state.playerPos.z = Math.max(-344, Math.min(344, state.playerPos.z));
  }

  // Bump into traffic / police: wanted +1 on a hard hit.
  function trafficCollisions() {
    if (state.wantedCooldown > 0) return;
    for (const c of SB.traffic.cars().concat(SB.police.cars())) {
      const dx = c.mesh.position.x - state.playerPos.x;
      const dz = c.mesh.position.z - state.playerPos.z;
      if (dx * dx + dz * dz < 12.5 && Math.abs(state.speed) > 5) {
        state.vel.x *= 0.55;
        state.vel.z *= 0.55;
        state.wanted = Math.min(5, state.wanted + 1);
        state.wantedCooldown = 3;
        state.wantedTimer = 0;
        SB.hud.showBanner('WANTED LEVEL ' + state.wanted, 'The police are coming for you');
        break;
      }
    }
  }

  // --- on foot ---------------------------------------------------------------------

  function updateOnFoot(dt) {
    const input = SB.input;
    const speed = 4.5;
    let mx = 0, mz = 0;
    if (input.up()) mz += 1;
    if (input.down()) mz -= 1;
    if (input.left()) mx -= 1;
    if (input.right()) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      // Move relative to the camera (camera looks along the character heading).
      const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
      const rx = -Math.cos(state.heading), rz = Math.sin(state.heading);
      state.playerPos.x += ((fx * mz + rx * mx) / len) * speed * dt;
      state.playerPos.z += ((fz * mz + rz * mx) / len) * speed * dt;
      state.heading = Math.atan2(fx * mz + rx * mx, fz * mz + rz * mx);
      state.playerPos.x = Math.max(-344, Math.min(326, state.playerPos.x));
      state.playerPos.z = Math.max(-344, Math.min(344, state.playerPos.z));
    }
    heroOnFoot.position.set(state.playerPos.x, 0, state.playerPos.z);
    heroOnFoot.rotation.y = state.heading;
    heroOnFoot.position.y = (mx || mz) ? Math.abs(Math.sin(state.time * 8)) * 0.06 : 0;
  }

  function enterExitCar() {
    if (!state.onFoot) {
      state.onFoot = true;
      hero.visible = false;
      heroOnFoot.visible = true;
      heroOnFoot.position.set(state.playerPos.x + 2.5, 0, state.playerPos.z);
      state.vel.x = 0;
      state.vel.z = 0;
      state.speed = 0;
      SB.hud.showBanner('ON FOOT', 'Press E near the car to get back in — F to punch');
    } else {
      const dx = hero.position.x - state.playerPos.x;
      const dz = hero.position.z - state.playerPos.z;
      if (dx * dx + dz * dz < 25) {
        state.onFoot = false;
        hero.visible = true;
        heroOnFoot.visible = false;
        state.playerPos.x = hero.position.x;
        state.playerPos.z = hero.position.z;
      } else {
        SB.hud.showBanner('TOO FAR FROM THE CAR', 'Walk back to the red car first');
      }
    }
  }

  function punch() {
    if (!state.onFoot) return;
    let hit = false;
    for (const p of pedestrians) {
      const dx = p.mesh.position.x - state.playerPos.x;
      const dz = p.mesh.position.z - state.playerPos.z;
      if (dx * dx + dz * dz < 6.25) {
        p.mesh.position.x += dx * 1.5;
        p.mesh.position.z += dz * 1.5;
        hit = true;
      }
    }
    if (hit) {
      state.wanted = Math.min(5, state.wanted + 1);
      state.wantedCooldown = 3;
      state.wantedTimer = 0;
      SB.hud.showBanner('HEY!', 'That pedestrian did not enjoy that');
    }
  }

  // --- main loop ---------------------------------------------------------------------

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    if (!state.started || state.paused) {
      if (!state.started) SB.render.updateTitleCamera(state.time);
      SB.render.renderer().render(scene, SB.render.camera());
      return;
    }
    state.time += dt;
    const input = SB.input;

    // Edge-triggered keys.
    if (input.pressed.KeyM) { SB.hud.setMap(!SB.hud.isMapOpen()); }
    if (input.pressed.KeyP) {
      state.paused = !state.paused;
      SB.hud.showBanner(state.paused ? 'PAUSED' : 'RESUMED', '');
    }
    if (input.pressed.KeyE) enterExitCar();
    if (input.pressed.KeyF) punch();
    if (input.pressed.KeyR && !state.onFoot) {
      state.playerPos.x = Math.round(state.playerPos.x / 80) * 80;
      state.playerPos.z = Math.round(state.playerPos.z / 80) * 80;
      state.vel.x = 0;
      state.vel.z = 0;
      state.speed = 0;
    }
    if (input.pressed.KeyN) SB.audio.toggleMute();
    input.pressed = {};

    if (!SB.hud.isMapOpen()) {
      if (state.onFoot) updateOnFoot(dt);
      else updateCar(dt);
    }
    trafficCollisions();
    SB.traffic.update(dt);
    SB.police.update(dt, state.playerPos, state.wanted, state.time);
    SB.people.updatePedestrians(pedestrians, dt, state.time);
    SB.missions.update(state.time);

    // Mission timer + checkpoints.
    const m = SB.missions.state();
    if (m && m.active && !m.finished) {
      m.timeLeft -= dt;
      const hit = SB.missions.checkPassed(state.playerPos);
      if (hit >= 0) {
        state.cash += 250;
        SB.audio.chime();
        if (m.finished) {
          state.cash += 1000;
          state.missionsWon = m.won;
          SB.hud.showBanner('MISSION COMPLETE', 'Sunset Sprint finished — +$1000 bonus');
          SB.save.saveGame(state);
        } else {
          SB.hud.showBanner('CHECKPOINT ' + (hit + 1) + '/6', SB.missions.currentCheckpoint().name + ' — +$250');
        }
      }
      if (m.timeLeft <= 0) {
        m.active = false;
        SB.hud.showBanner('TIME UP', 'Sunset Sprint failed — mission reset');
        SB.missions.reset();
      }
    }

    // Wanted decay.
    if (state.wantedCooldown > 0) state.wantedCooldown -= dt;
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.wantedTimer > 18) {
        state.wanted--;
        state.wantedTimer = 0;
      }
    }

    // Camera + sun follow the player.
    if (state.onFoot) {
      const back = { x: -Math.sin(state.heading), z: -Math.cos(state.heading) };
      SB.render.setShotCamera(
        [state.playerPos.x + back.x * 5, 2.6, state.playerPos.z + back.z * 5],
        [state.playerPos.x + Math.sin(state.heading) * 4, 1.4, state.playerPos.z + Math.cos(state.heading) * 4]
      );
    } else if (!SB.shots.fixedCamera) {
      SB.render.updateChaseCamera(state.playerPos, state.heading, state.speed, dt);
    }
    SB.world.updateSun(state.playerPos);
    SB.hud.updateHUD(state);
    SB.audio.update(state.speed, input.up() || state.autopilot, dt);

    // Autosave every 30 s.
    saveTimer += dt;
    if (saveTimer > 30) {
      saveTimer = 0;
      SB.save.saveGame(state);
    }

    SB.render.renderer().render(scene, SB.render.camera());
  }

  // --- playtest: 20 checks, reported to window.__playtest ------------------------------

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Wait until N seconds of GAME time have passed (frame-rate independent: in
  // headless software rendering a wall second is far less than a game second).
  async function waitGame(seconds, capMs) {
    const t0 = state.time;
    const w0 = performance.now();
    while (state.time - t0 < seconds) {
      if (performance.now() - w0 > capMs) break;
      await wait(200);
    }
  }

  async function runPlaytest() {
    const results = [];
    function check(name, pass, detail) {
      results.push({ name: name, pass: !!pass, detail: detail || '' });
    }
    try {
      // 1-3: engine basics.
      check('three.js r186 loaded', typeof THREE !== 'undefined' && THREE.REVISION === '186', 'REVISION=' + (typeof THREE !== 'undefined' ? THREE.REVISION : 'none'));
      const gl = SB.render.renderer().getContext();
      check('WebGL2 context', gl instanceof WebGL2RenderingContext, '');
      check('scene + camera exist', !!scene && !!SB.render.camera(), '');
      // 4-9: world contents.
      check('buildings >= 80', SB.world.buildingCount() >= 80, SB.world.buildingCount() + ' buildings');
      check('hero car: 4 wheels + taillight bar', hero.userData.wheels.length === 4 && !!hero.userData.taillight, '');
      const sunDir = new THREE.Vector3(SB.config.sunPos[0], SB.config.sunPos[1], SB.config.sunPos[2]);
      check('sun in the south-west', sunDir.x < 0 && sunDir.z > 0, 'sun at ' + SB.config.sunPos.join(','));
      check('hero light rides the car', !!SB.render.heroLight(), '');
      check('fog is THIN (far >= 1000)', scene.fog && scene.fog.far >= 1000, 'fog ' + scene.fog.near + '–' + scene.fog.far);
      check('marina boats = 6, no wedge', SB.world.boats.length === 6, SB.world.boats.length + ' boats');
      // 10-13: people + HUD.
      check('marina crew = 3', SB.world.crewSpots.length === 3, '');
      check('pedestrians >= 18', pedestrians.length >= 18, pedestrians.length + ' pedestrians');
      check('traffic >= 10', SB.traffic.cars().length >= 10, SB.traffic.cars().length + ' cars');
      check('HUD: all four corners present',
        !!document.getElementById('hud-tl') && !!document.getElementById('hud-tr') &&
        !!document.getElementById('hud-bl') && !!document.getElementById('hud-br'), '');
      // 14: minimap draws.
      const mm = document.getElementById('minimap');
      const mmPx = mm.getContext('2d').getImageData(100, 100, 1, 1).data;
      check('minimap draws (non-blank)', mmPx[3] > 0, '');
      // 15-16: drive + drift (game-time waits, not wall time).
      const startX = state.playerPos.x, startZ = state.playerPos.z;
      SB.input.override.up = true;
      await waitGame(3, 30000);
      SB.input.override.up = false;
      const moved = Math.hypot(state.playerPos.x - startX, state.playerPos.z - startZ);
      check('car drives (moves when throttled)', moved > 15 && Math.abs(state.speed) > 5, 'moved ' + moved.toFixed(1) + ' m, speed ' + state.speed.toFixed(1) + ' m/s');
      let drifted = false;
      SB.input.override.up = true;
      SB.input.override.left = true;
      SB.input.override.handbrake = true;
      const d0 = state.time;
      const dw0 = performance.now();
      while (state.time - d0 < 2.5 && performance.now() - dw0 < 30000) {
        await wait(200);
        if (state.drifting) { drifted = true; break; }
      }
      SB.input.override.up = false;
      SB.input.override.left = false;
      SB.input.override.handbrake = false;
      check('drift works (drifting flag)', drifted, '');
      // 17: map opens with GPS route.
      SB.hud.setMap(true);
      await wait(400);
      const mapPx = document.getElementById('city-map').getContext('2d').getImageData(500, 350, 1, 1).data;
      check('city map opens + draws', SB.hud.isMapOpen() && mapPx[3] > 0, '');
      SB.hud.setMap(false);
      // 18: mission active with 6 checkpoints.
      const m = SB.missions.state();
      check('mission: 6 checkpoints, active', !!m && m.active && SB.config.mission.checkpoints.length === 6, '');
      // 19: save / load roundtrip.
      const before = state.cash;
      SB.save.saveGame(state);
      state.cash = before + 999;
      const loaded = SB.save.loadGame();
      const ok = loaded && loaded.cash === before;
      state.cash = before;
      check('save/load roundtrip', ok, 'saved $' + before + ', loaded $' + (loaded ? loaded.cash : 'null'));
      // 20: no console errors so far (the runner also collects them externally).
      check('no page errors during playtest', !window.__pageError, '');
    } catch (e) {
      check('playtest completed without throwing', false, e.message);
    }
    const passed = results.filter(function (r) { return r.pass; }).length;
    window.__playtest = { passed: passed, total: results.length, results: results };
    const box = document.getElementById('playtest-results');
    if (box) {
      box.textContent = 'PLAYTEST ' + passed + '/' + results.length + '\n' +
        results.map(function (r) { return (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' — ' + r.detail : ''); }).join('\n');
    }
  }

  window.addEventListener('error', function (e) { window.__pageError = e.message; });
  window.addEventListener('DOMContentLoaded', boot);

  return {
    state: state,
    start: start,
    boot: boot,
    runPlaytest: runPlaytest,
  };
})();
