// SOLMAR BAY — the wanted system: 0–5 stars, named police units that chase
// and ram, roadblocks at 3 stars, and the AIR-1 helicopter with a short,
// subtle searchlight cone at 4 stars.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;

  var Pol = {
    wanted: 0,
    heat: 0, // 0..100, builds with crimes, decays when hidden
    units: [], // active police car states
    heli: null,
    roadblocks: [],
    lastSeen: 0,
    sirenLights: [],
  };

  var sceneRef = null;

  function wantedFromHeat() {
    if (Pol.heat <= 0) return 0;
    if (Pol.heat < 18) return 1;
    if (Pol.heat < 38) return 2;
    if (Pol.heat < 60) return 3;
    if (Pol.heat < 84) return 4;
    return 5;
  }

  Pol.addHeat = function (amount, reason) {
    Pol.heat = U.clamp(Pol.heat + amount, 0, 100);
    var w = wantedFromHeat();
    if (w !== Pol.wanted) {
      Pol.wanted = w;
      SB.events && SB.events.emit('wanted', w, reason);
    }
  };

  Pol.setWanted = function (stars) {
    var targets = [0, 10, 28, 50, 72, 92];
    Pol.heat = targets[U.clamp(stars, 0, 5)];
    Pol.wanted = U.clamp(stars, 0, 5);
  };

  function spawnUnit(x, z, heading) {
    var car = SB.cars.makeCar({
      color: 0x2a3048, police: true, sporty: true, name: 'INTERCEPTOR',
    });
    sceneRef.add(car.group);
    // One small siren point light per unit (no shadows, cheap).
    var light = new THREE.PointLight(C.policeRed, 30, 26, 1.8);
    light.position.set(0, 2.2, 0);
    car.group.add(light);
    // Colored pool on the road under the unit.
    var pool = U.lightPool(C.policeRed, 5, 0.35);
    pool.position.y = 0.07;
    car.group.add(pool);
    var state = SB.cars.makeCarState(car, x, z, heading, C.policeCar);
    state.sirenLight = light;
    state.pool = pool;
    state.unitName = C.units[Pol.units.length % C.units.length];
    Pol.units.push(state);
    SB.cars.police.push(state);
    return state;
  }

  function desiredUnits() {
    return [0, 1, 2, 3, 4, 5][Pol.wanted];
  }

  // Roadblock: two parked police cars across the avenue ahead of the player.
  function buildRoadblock(scene, x, z) {
    var block = [];
    [-3.4, 3.4].forEach(function (off, i) {
      var car = SB.cars.makeCar({ color: 0x2a3048, police: true, sporty: true, name: 'INTERCEPTOR' });
      car.group.position.set(x + off, 0, z + (i === 0 ? 1.5 : -1.5));
      car.group.rotation.y = Math.PI / 2 + (i === 0 ? 0.25 : -0.2);
      scene.add(car.group);
      var light = new THREE.PointLight(i === 0 ? C.policeRed : C.policeBlue, 24, 22, 1.8);
      light.position.set(0, 2.2, 0);
      car.group.add(light);
      block.push(car);
    });
    Pol.roadblocks.push({ cars: block, x: x, z: z });
  }

  function clearRoadblocks(scene) {
    Pol.roadblocks.forEach(function (rb) {
      rb.cars.forEach(function (c) { scene.remove(c.group); });
    });
    Pol.roadblocks = [];
  }

  // AIR-1 helicopter: dark body, rotor, and a SHORT subtle searchlight cone
  // (24 m, radius 4, opacity 0.12) — a long bright cone ruins the shot.
  function buildHeli(scene) {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.4, metalness: 0.5 });
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.4, 4, 10), bodyMat);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    var glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.1, metalness: 0.8 })
    );
    glass.position.set(0, 0.25, -1.6);
    glass.scale.set(1, 0.8, 1);
    g.add(glass);
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6), bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.2, 2.8);
    g.add(tail);
    var rotor = new THREE.Group();
    var bladeMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 });
    [0, Math.PI / 2].forEach(function (a) {
      var blade = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.06, 0.3), bladeMat);
      blade.rotation.y = a;
      rotor.add(blade);
    });
    rotor.position.y = 1.15;
    g.add(rotor);
    // Short searchlight cone: 24 m long, radius 4, faint.
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(4, 24, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2b0, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    cone.position.set(0, -12.5, -0.5);
    cone.rotation.x = Math.PI; // apex up at the heli, opening down
    g.add(cone);
    // Spotlight pool on the ground below.
    var spot = new THREE.SpotLight(0xfff2b0, 60, 40, 0.32, 0.6, 1.4);
    spot.position.set(0, -0.5, 0);
    g.add(spot);
    spot.target.position.set(0, -24, 0);
    g.add(spot.target);
    var beacon = U.glowSprite(0xff2020, 2.2, 0.9);
    beacon.position.set(0, -0.9, 0);
    g.add(beacon);
    scene.add(g);
    Pol.heli = { group: g, rotor: rotor, cone: cone, spot: spot, beacon: beacon };
  }

  Pol.init = function (scene) {
    sceneRef = scene;
    buildHeli(scene);
    Pol.heli.group.visible = false;
  };

  Pol.update = function (dt, time, playerX, playerZ, playerHeading, playerSpeed) {
    // Heat decays when the player is slow and out of sight; grows on crimes.
    var seen = Pol.units.some(function (u) {
      return U.dist2(u.x, u.z, playerX, playerZ) < 3600;
    });
    if (seen) Pol.lastSeen = time;
    if (time - Pol.lastSeen > 6 && playerSpeed < 8) {
      Pol.addHeat(-dt * 7, 'hiding');
    } else if (time - Pol.lastSeen > 6) {
      Pol.addHeat(-dt * 2.5, 'cooling');
    }

    // Spawn / despawn chase units to match the wanted level.
    var want = desiredUnits();
    while (Pol.units.length < want) {
      // Spawn off-screen, ahead of the player.
      var a = Math.random() * Math.PI * 2;
      var r = 55 + Math.random() * 25;
      spawnUnit(
        U.clamp(playerX + Math.cos(a) * r, -160, 160),
        U.clamp(playerZ + Math.sin(a) * r, -190, 190),
        Math.random() * Math.PI * 2
      );
    }
    while (Pol.units.length > want) {
      var gone = Pol.units.pop();
      var idx = SB.cars.police.indexOf(gone);
      if (idx >= 0) SB.cars.police.splice(idx, 1);
      sceneRef.remove(gone.car.group);
    }

    // Chase: steer toward the player, ram on contact.
    Pol.units.forEach(function (u) {
      var targetHeading = Math.atan2(playerX - u.x, playerZ - u.z);
      var diff = targetHeading - u.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var steer = U.clamp(diff * 2.2, -1, 1);
      var d2 = U.dist2(u.x, u.z, playerX, playerZ);
      var throttle = d2 > 30 ? 1 : 0.4;
      SB.cars.drive(u, throttle, steer, false, dt);
      // Ram: if very close, shove the player (handled by main via event).
      if (d2 < 14) SB.events && SB.events.emit('rammed', u);
    });

    // Roadblocks at 3+ stars: one ahead on the avenue, rebuilt as the player moves.
    if (Pol.wanted >= 3 && Pol.roadblocks.length === 0) {
      var ahead = 70;
      var bx = U.clamp(playerX + Math.sin(playerHeading) * ahead, -8, 8);
      var bz = U.clamp(playerZ + Math.cos(playerHeading) * ahead, -185, 185);
      buildRoadblock(sceneRef, 0, bz);
    }
    if (Pol.wanted < 3 && Pol.roadblocks.length > 0) clearRoadblocks(sceneRef);

    // Heli at 4+ stars: hover above and ahead of the player, farther out.
    var heli = Pol.heli;
    if (Pol.wanted >= 4 && heli) {
      heli.group.visible = true;
      var hx = playerX + Math.sin(playerHeading) * 26;
      var hz = playerZ + Math.cos(playerHeading) * 26;
      heli.group.position.x = U.lerp(heli.group.position.x, hx, Math.min(1, dt * 1.2));
      heli.group.position.z = U.lerp(heli.group.position.z, hz, Math.min(1, dt * 1.2));
      heli.group.position.y = 30 + Math.sin(time * 0.7) * 1.5;
      heli.group.rotation.y = U.angleLerp(heli.group.rotation.y, playerHeading, Math.min(1, dt * 2));
      heli.rotor.rotation.y += dt * 28;
      heli.beacon.visible = Math.floor(time * 2) % 2 === 0;
    } else if (heli) {
      heli.group.visible = false;
    }

    SB.cars.updatePoliceLights(time);
  };

  // For screenshot mode: place two police cars in fixed chase positions.
  Pol.placeShotUnits = function (scene, specs) {
    Pol.units.forEach(function (u) { scene.remove(u.car.group); });
    Pol.units = [];
    SB.cars.police = [];
    specs.forEach(function (s) {
      var state = spawnUnit(s.x, s.z, s.heading);
      state.speed = s.speed || 0;
    });
  };

  SB.police = Pol;
})();
