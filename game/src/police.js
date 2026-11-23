// Aurelia Bay — the ABPD. A wanted level (0-5 stars) with police who
// respond: cruisers that pursue, ram and flank, a helicopter with a visible
// spotlight cone that tracks the player, and roadblocks at high heat. The
// dispatch board names every unit, its tactic and its distance — the same
// information the HUD shows, so the chase reads as a system, not a prop.
// The helicopter flies at 55 units: above every rooftop, never through one.
(function () {
  'use strict';
  var U = window.AB.util;
  var V = window.AB.vehicles;

  var UNIT_NAMES = ['FALCON-2', 'OSPREY-7', 'HERON-4', 'KITE-9', 'CONDOR-1', 'GULL-5', 'TERN-3', 'PELICAN-8'];
  var TACTICS = ['RAMMING', 'PURSUE', 'FLANKING', 'BOX IN', 'PIT MOVE'];
  var HELI_ALT = 55;

  function makeHelicopter() {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2c3a, metalness: 0.6, roughness: 0.4 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd4e8, metalness: 0.9, roughness: 0.12 });

    var body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 1.8), bodyMat);
    body.castShadow = true;
    g.add(body);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), glassMat);
    nose.scale.set(1.1, 0.85, 0.95);
    nose.position.set(1.8, -0.1, 0);
    g.add(nose);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.4), bodyMat);
    tail.position.set(-3.1, 0.3, 0);
    g.add(tail);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.9), bodyMat);
    fin.position.set(-4.5, 0.7, 0);
    g.add(fin);
    // tail rotor
    var tailRotor = new THREE.Group();
    var tr1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    var tr2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    tailRotor.add(tr1); tailRotor.add(tr2);
    tailRotor.position.set(-4.6, 0.5, 0.3);
    g.add(tailRotor);
    // main rotor: two long blades + hub
    var rotor = new THREE.Group();
    var bladeGeo = new THREE.BoxGeometry(8.4, 0.07, 0.34);
    var bladeMat = new THREE.MeshLambertMaterial({ color: 0x18181c });
    var b1 = new THREE.Mesh(bladeGeo, bladeMat);
    var b2 = new THREE.Mesh(bladeGeo, bladeMat);
    b2.rotation.y = Math.PI / 2;
    rotor.add(b1); rotor.add(b2);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    rotor.add(hub);
    rotor.position.y = 1.15;
    g.add(rotor);
    // skids
    [-0.8, 0.8].forEach(function (z) {
      var skid = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x333333 }));
      skid.position.set(0, -1.15, z);
      g.add(skid);
    });
    // searchlight: visible cone + a bright pool on the ground
    var coneGeo = new THREE.ConeGeometry(7, HELI_ALT, 20, 1, true);
    var coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff6c0, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = -HELI_ALT / 2;
    cone.rotation.x = Math.PI; // apex up at the heli, wide end down
    g.add(cone);
    var pool = new THREE.Mesh(new THREE.CircleGeometry(7, 20),
      new THREE.MeshBasicMaterial({
        color: 0xfff2a8, transparent: true, opacity: 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending
      }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -HELI_ALT + 0.15;
    g.add(pool);

    g.userData.rotor = rotor;
    g.userData.tailRotor = tailRotor;
    g.userData.cone = cone;
    g.userData.pool = pool;
    return g;
  }

  // ---- police system ----
  function makePolice(scene, city, rng) {
    var cruisers = [];
    var heli = null;
    var wanted = 0;
    var inSight = false;
    var sightTimer = 0;
    var roadblocks = [];
    var units = []; // dispatch board rows

    function spawnCruiser(x, z, name) {
      var model = V.makeCarModel('police', 0xf5f2ea);
      var car = V.makeCarState(model, x, z, 0);
      car.name = name;
      car.tactic = 'PURSUE';
      car.sirenPhase = rng.next() * 6;
      scene.add(model);
      cruisers.push(car);
      return car;
    }

    function spawnHeli(x, z) {
      if (heli) return;
      heli = makeHelicopter();
      heli.position.set(x + 24, HELI_ALT, z - 18);
      scene.add(heli);
    }

    function despawnHeli() {
      if (!heli) return;
      scene.remove(heli);
      heli = null;
    }

    function spawnRoadblock(x, z, heading) {
      var group = new THREE.Group();
      for (var i = -1; i <= 1; i++) {
        var car = V.makeCarModel('police', 0xf5f2ea);
        car.position.set(i * 4.4, 0, 0);
        car.rotation.y = Math.PI / 2;
        group.add(car);
      }
      group.position.set(x, 0, z);
      group.rotation.y = heading;
      scene.add(group);
      roadblocks.push(group);
    }

    function clearRoadblocks() {
      roadblocks.forEach(function (g) { scene.remove(g); });
      roadblocks = [];
    }

    function setWanted(stars, playerPos) {
      stars = U.clamp(Math.round(stars), 0, 5);
      if (stars === wanted) return;
      var rising = stars > wanted;
      wanted = stars;
      if (wanted === 0) {
        cruisers.forEach(function (c) { scene.remove(c.model); });
        cruisers = [];
        despawnHeli();
        clearRoadblocks();
        return;
      }
      // cruiser count grows with heat: 2 at 1 star, up to 6 at 5
      var want = Math.min(2 + wanted, 6);
      while (cruisers.length < want) {
        var a = rng.next() * Math.PI * 2;
        var d = 40 + rng.next() * 30;
        spawnCruiser(
          playerPos.x + Math.sin(a) * d,
          playerPos.z + Math.cos(a) * d,
          UNIT_NAMES[cruisers.length % UNIT_NAMES.length]
        );
      }
      while (cruisers.length > want) {
        var c = cruisers.pop();
        scene.remove(c.model);
      }
      if (wanted >= 3) spawnHeli(playerPos.x, playerPos.z);
      else despawnHeli();
      if (wanted >= 4 && roadblocks.length === 0 && rising) {
        spawnRoadblock(playerPos.x + 60, playerPos.z, 0);
      }
      if (wanted < 4) clearRoadblocks();
    }

    function update(dt, playerPos, playerSpeed, time) {
      // line of sight: the police see the player unless far away and slow
      var nearest = 1e9;
      cruisers.forEach(function (c) {
        var d2 = U.dist2(c.x, c.z, playerPos.x, playerPos.z);
        if (d2 < nearest) nearest = d2;
      });
      var dist = Math.sqrt(nearest);
      if (wanted > 0) {
        if (dist < 70 || playerSpeed > 20) { inSight = true; sightTimer = 0; }
        else {
          sightTimer += dt;
          if (sightTimer > 6) { inSight = false; }
          if (sightTimer > 14) setWanted(wanted - 1, playerPos);
        }
      } else inSight = false;

      // cruiser chase AI: steer at the player, ram when close, flank at heat
      cruisers.forEach(function (c, idx) {
        var dx = playerPos.x - c.x, dz = playerPos.z - c.z;
        var d = Math.sqrt(dx * dx + dz * dz) || 1;
        var targetHeading = Math.atan2(dx, dz);
        // flankers aim ahead of the player
        if (c.tactic === 'FLANKING') {
          targetHeading = Math.atan2(dx + Math.sin(playerPos.heading || 0) * 14, dz + Math.cos(playerPos.heading || 0) * 14);
        }
        var diff = ((targetHeading - c.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        c.heading += U.clamp(diff, -2.4 * dt, 2.4 * dt);
        var targetSpeed = d > 26 ? 34 : (d > 10 ? 30 : 24);
        if (c.tactic === 'RAMMING' && d < 14) targetSpeed = 38;
        c.speed = U.damp(c.speed, targetSpeed, 1.6, dt);
        c.x += Math.sin(c.heading) * c.speed * dt;
        c.z += Math.cos(c.heading) * c.speed * dt;
        c.x = U.clamp(c.x, -150, 150);
        c.z = U.clamp(c.z, -150, 150);
        c.model.position.set(c.x, 0, c.z);
        c.model.rotation.y = c.heading - Math.PI / 2;
        var spin = c.speed * dt / 0.36;
        c.model.userData.wheels.forEach(function (w) { w.rotation.z -= spin; });
        // siren flash: alternate red/blue
        c.sirenPhase += dt * 9;
        var red = c.model.getObjectByName('sirenRed');
        var blue = c.model.getObjectByName('sirenBlue');
        if (red && blue) {
          var on = Math.sin(c.sirenPhase) > 0;
          red.material.emissiveIntensity = on ? 2.4 : 0.15;
          blue.material.emissiveIntensity = on ? 0.15 : 2.4;
        }
        // retask tactics by distance
        if (d < 12) c.tactic = 'RAMMING';
        else if (d < 30) c.tactic = idx % 3 === 0 ? 'FLANKING' : 'PURSUE';
        else c.tactic = 'PURSUE';
      });

      // helicopter: orbit above the player, spotlight locked on
      if (heli) {
        var t = time * 0.12;
        var hx = playerPos.x + Math.sin(t) * 26;
        var hz = playerPos.z + Math.cos(t * 0.8) * 22 - 10;
        heli.position.x = U.damp(heli.position.x, hx, 1.2, dt);
        heli.position.z = U.damp(heli.position.z, hz, 1.2, dt);
        heli.position.y = HELI_ALT + Math.sin(time * 0.5) * 1.5;
        heli.rotation.y = Math.atan2(playerPos.x - heli.position.x, playerPos.z - heli.position.z) - Math.PI / 2;
        heli.rotation.z = Math.sin(time * 0.4) * 0.04;
        heli.userData.rotor.rotation.y += dt * 22;
        heli.userData.tailRotor.rotation.x += dt * 30;
        // spotlight pool follows the player on the ground
        heli.userData.pool.position.x = playerPos.x - heli.position.x;
        heli.userData.pool.position.z = playerPos.z - heli.position.z;
      }

      // dispatch board rows (x/z included so the minimap can plot blips)
      units = cruisers.map(function (c) {
        var d = Math.round(Math.sqrt(U.dist2(c.x, c.z, playerPos.x, playerPos.z)));
        return { name: c.name, tactic: c.tactic, dist: d, kind: 'CRUISER', x: c.x, z: c.z };
      });
      if (heli) {
        units.push({ name: 'AIR-3', tactic: 'SPOTLIGHT', dist: Math.round(heli.position.distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z))), kind: 'AIR', x: heli.position.x, z: heli.position.z });
      }
      if (roadblocks.length) {
        units.push({ name: 'BARRICADE-1', tactic: 'ROADBLOCK', dist: 98, kind: 'BLOCK', x: playerPos.x + 60, z: playerPos.z });
      }
    }

    return {
      get wanted() { return wanted; },
      get inSight() { return inSight; },
      get units() { return units; },
      get cruisers() { return cruisers; },
      get heli() { return heli; },
      setWanted: setWanted,
      update: update,
      addHeat: function (n, playerPos) { setWanted(wanted + n, playerPos); }
    };
  }

  window.AB.police = { makePolice: makePolice, makeHelicopter: makeHelicopter, HELI_ALT: HELI_ALT };
})();
