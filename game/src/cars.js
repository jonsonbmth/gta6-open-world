// SOLMAR BAY — vehicles: extruded-profile cars with bevelled bodies, glass
// cabins, spinning wheels, spoilers and light bars. Arcade driving physics
// with drift (velocity lags heading under the handbrake) and traffic AI.
// NOTE: car-local nose is +Z after the profile rotation (rotateY(-PI/2) maps
// the profile's +X to +Z), so headlights go on +Z and the taillight bar on -Z.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var U = SB.utils;

  var KINDS = {
    hero:    { name: 'VULPINE S', color: 0xe62129, maxSpeed: 52, accel: 17, len: 4.5, price: 0 },
    police:  { name: 'INTERCEPTOR', color: 0x232838, maxSpeed: 50, accel: 16, len: 4.5, price: 0 },
    sedan:   { name: 'MERIDIAN', color: 0x8a93a6, maxSpeed: 17, accel: 8, len: 4.4, price: 0 },
    coupe:   { name: 'STRATUS GT', color: 0x2a6f8e, maxSpeed: 19, accel: 9, len: 4.3, price: 0 },
    hatch:   { name: 'PIKA', color: 0xc8b060, maxSpeed: 15, accel: 7, len: 3.9, price: 0 },
    taxi:    { name: 'CABRIO TAXI', color: 0xf2b705, maxSpeed: 17, accel: 8, len: 4.4, price: 0 }
  };
  var TRAFFIC_COLORS = [0x8a93a6, 0x2a6f8e, 0xc8b060, 0x5a3a8a, 0x3a7a4a, 0xb0b8c8, 0x7a2a2a, 0x2a2a3a];

  var glowTex = null;
  function glowSprite(color, scale) {
    if (!glowTex) glowTex = U.glowTexture();
    var m = new THREE.SpriteMaterial({
      map: glowTex, color: color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    });
    var s = new THREE.Sprite(m);
    s.scale.set(scale, scale, 1);
    return s;
  }

  // Side silhouette of the lower body, X = length (nose +X), Y = height.
  function bodyProfile(kind) {
    var s = new THREE.Shape();
    if (kind === 'hatch') {
      s.moveTo(-1.95, 0.30); s.lineTo(-1.95, 0.78); s.lineTo(-1.2, 0.88);
      s.lineTo(0.4, 0.88); s.lineTo(1.5, 0.72); s.lineTo(1.95, 0.5);
      s.lineTo(1.95, 0.30); s.closePath();
    } else {
      s.moveTo(-2.25, 0.32); s.lineTo(-2.25, 0.72); s.lineTo(-1.6, 0.80);
      s.lineTo(-0.4, 0.82); s.lineTo(0.9, 0.78); s.lineTo(1.9, 0.62);
      s.lineTo(2.25, 0.45); s.lineTo(2.25, 0.30); s.closePath();
    }
    return s;
  }
  function cabinProfile(kind) {
    var s = new THREE.Shape();
    if (kind === 'hatch') {
      s.moveTo(-1.25, 0.82); s.lineTo(-0.85, 1.22); s.lineTo(0.45, 1.22);
      s.lineTo(0.95, 0.82); s.closePath();
    } else {
      s.moveTo(-1.35, 0.80); s.lineTo(-0.95, 1.26); s.lineTo(0.35, 1.26);
      s.lineTo(0.9, 0.80); s.closePath();
    }
    return s;
  }

  function extrudeCentered(shape, depth, bevel) {
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 2, steps: 1
    });
    g.translate(0, 0, -depth / 2);
    g.rotateY(-Math.PI / 2); // profile +X (nose) -> +Z
    return g;
  }

  function makeWheel(rimColor) {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.28, 18),
      new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 })
    );
    tire.rotation.z = Math.PI / 2;
    var rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.25, metalness: 0.9 })
    );
    rim.rotation.z = Math.PI / 2;
    var hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.6 })
    );
    hub.rotation.z = Math.PI / 2;
    g.add(tire); g.add(rim); g.add(hub);
    g.userData.spin = [tire, rim, hub];
    return g;
  }

  function makeCar(kind, opts) {
    opts = opts || {};
    var def = KINDS[kind] || KINDS.sedan;
    var color = opts.color !== undefined ? opts.color : def.color;
    var group = new THREE.Group();
    var body = new THREE.Group();
    group.add(body);

    var paintMat;
    if (kind === 'hero') {
      paintMat = new THREE.MeshPhysicalMaterial({
        color: color, roughness: 0.22, metalness: 0.85,
        clearcoat: 1.0, clearcoatRoughness: 0.08
      });
    } else {
      paintMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.32, metalness: 0.75 });
    }
    var bodyMesh = new THREE.Mesh(extrudeCentered(bodyProfile(kind), 1.66, 0.1), paintMat);
    bodyMesh.castShadow = true;
    body.add(bodyMesh);

    // Cabin: body colour shell + slightly wider dark glasshouse.
    var cabinMat = kind === 'police'
      ? new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.4 })
      : paintMat;
    var cabin = new THREE.Mesh(extrudeCentered(cabinProfile(kind), 1.34, 0.07), cabinMat);
    cabin.castShadow = true;
    body.add(cabin);
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.06, metalness: 1.0 });
    var glass = new THREE.Mesh(extrudeCentered(cabinProfile(kind), 1.4, 0.05), glassMat);
    glass.scale.set(0.99, 0.94, 0.94);
    glass.position.y = 0.03;
    body.add(glass);

    // Wheels.
    var wheelBase = kind === 'hatch' ? 1.15 : 1.35;
    var wheels = [];
    [[-0.82, wheelBase], [0.82, wheelBase], [-0.82, -wheelBase], [0.82, -wheelBase]].forEach(function (p, i) {
      var w = makeWheel(kind === 'hero' ? 0xd8dce8 : 0x9aa0b0);
      w.position.set(p[0], 0.37, p[1]);
      w.userData.front = i < 2;
      group.add(w);
      wheels.push(w);
    });

    // Spoiler (hero + coupe).
    if (kind === 'hero' || kind === 'coupe') {
      var strutMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5, metalness: 0.6 });
      [-0.6, 0.6].forEach(function (x) {
        var strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.1), strutMat);
        strut.position.set(x, 0.95, -2.0);
        body.add(strut);
      });
      var wing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.07, 0.46), paintMat);
      wing.position.set(0, 1.1, -2.05);
      wing.rotation.x = -0.1;
      wing.castShadow = true;
      body.add(wing);
    }

    // Full-width taillight bar (rear = -Z) + glow.
    var tailMat = new THREE.MeshStandardMaterial({
      color: 0x330000, emissive: 0xff1a1a, emissiveIntensity: 2.6, roughness: 0.3
    });
    var tail = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.13, 0.08), tailMat);
    tail.position.set(0, 0.68, -2.3);
    body.add(tail);
    var tailGlow = glowSprite(0xff2a2a, 3.4);
    tailGlow.position.set(0, 0.68, -2.55);
    body.add(tailGlow);

    // Headlights (nose = +Z) + glow.
    var headMat = new THREE.MeshStandardMaterial({
      color: 0x222222, emissive: 0xfff6cc, emissiveIntensity: 3.2, roughness: 0.3
    });
    [-0.58, 0.58].forEach(function (x) {
      var h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.13, 0.07), headMat);
      h.position.set(x, 0.56, 2.28);
      body.add(h);
      var hg = glowSprite(0xfff2b0, 1.7);
      hg.position.set(x, 0.56, 2.45);
      body.add(hg);
    });

    // Grille, mirrors, exhausts.
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.7, metalness: 0.3 });
    var grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.05), darkMat);
    grille.position.set(0, 0.4, 2.28);
    body.add(grille);
    [-0.92, 0.92].forEach(function (x) {
      var mir = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.24), paintMat);
      mir.position.set(x, 0.92, 0.75);
      body.add(mir);
    });
    [-0.5, 0.5].forEach(function (x) {
      var ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), darkMat);
      ex.rotation.x = Math.PI / 2;
      ex.position.set(x, 0.3, -2.3);
      body.add(ex);
    });

    // Taxi sign.
    if (kind === 'taxi') {
      var sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.22, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd21f, emissiveIntensity: 1.6 })
      );
      sign.position.set(0, 1.32, 0);
      body.add(sign);
    }

    // Police light bar: red left, blue right + glow sprites.
    var barRed = null, barBlue = null, barGlowR = null, barGlowB = null;
    if (kind === 'police') {
      barRed = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.15, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 3 }));
      barRed.position.set(-0.33, 1.36, -0.1);
      barBlue = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.15, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2040ff, emissiveIntensity: 3 }));
      barBlue.position.set(0.33, 1.36, -0.1);
      body.add(barRed); body.add(barBlue);
      barGlowR = glowSprite(0xff2020, 4.2); barGlowR.position.set(-0.33, 1.5, -0.1);
      barGlowB = glowSprite(0x2a55ff, 4.2); barGlowB.position.set(0.33, 1.5, -0.1);
      body.add(barGlowR); body.add(barGlowB);
    }

    // Underglow (hero: red neon; police: dim blue).
    if (kind === 'hero' || kind === 'police') {
      var ug = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 5.0),
        new THREE.MeshBasicMaterial({
          map: U.poolTexture(), color: kind === 'hero' ? 0xff2030 : 0x2040ff,
          transparent: true, opacity: 0.4, depthWrite: false,
          blending: THREE.AdditiveBlending, toneMapped: false
        })
      );
      ug.rotation.x = -Math.PI / 2;
      ug.position.y = 0.06;
      group.add(ug);
    }

    // Headlight beam for the hero (one spotlight) + fake cone.
    var spot = null;
    if (kind === 'hero') {
      spot = new THREE.SpotLight(0xfff2c0, 90, 34, 0.5, 0.55, 1.4);
      spot.position.set(0, 0.7, 2.2);
      spot.target.position.set(0, 0, 16);
      group.add(spot); group.add(spot.target);
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 12, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfff2c0, transparent: true, opacity: 0.05,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      );
      cone.rotation.x = Math.PI / 2 + 0.06;
      cone.position.set(0, 0.5, 8);
      group.add(cone);
    }

    // Damage smoke sprite (fades in as condition falls).
    var smoke = glowSprite(0x555560, 2.2);
    smoke.material.opacity = 0;
    smoke.material.blending = THREE.NormalBlending;
    smoke.position.set(0, 1.1, 1.2);
    group.add(smoke);

    var car = {
      kind: kind, name: opts.name || def.name, group: group, body: body,
      wheels: wheels, tailMat: tailMat, headMat: headMat,
      barRed: barRed, barBlue: barBlue, barGlowR: barGlowR, barGlowB: barGlowB,
      spot: spot, smoke: smoke,
      maxSpeed: def.maxSpeed, accelRate: def.accel,
      heading: 0, speed: 0, steer: 0, throttle: 0, brake: false, handbrake: false,
      vx: 0, vz: 0, condition: 100, isPlayer: false,
      route: null, routeIdx: 0, stopped: 0
    };
    group.traverse(function (o) { if (o.isMesh) o.castShadow = o.castShadow || false; });
    return car;
  }

  function placeCar(car, x, z, heading) {
    car.group.position.set(x, 0, z);
    car.heading = heading;
    car.group.rotation.y = heading;
    car.speed = 0; car.vx = 0; car.vz = 0; car.steer = 0;
  }

  function updateCar(car, dt, input) {
    var th = input.throttle || 0;       // -1..1
    var st = input.steer || 0;          // -1..1
    var hb = !!input.handbrake;
    car.throttle = th; car.handbrake = hb;
    // Longitudinal.
    if (th > 0) car.speed += car.accelRate * th * dt;
    else if (th < 0) {
      if (car.speed > 0.5) car.speed -= 34 * dt; // brake
      else car.speed = Math.max(car.speed + car.accelRate * 0.55 * th * dt, -11);
    }
    car.speed -= car.speed * 0.35 * dt;
    if (hb) car.speed -= car.speed * 2.2 * dt;
    if (Math.abs(car.speed) < 0.05 && th === 0) car.speed = 0;
    car.speed = U.clamp(car.speed, -11, car.maxSpeed);
    // Steering: less throw at speed, more with handbrake.
    var steerTarget = st * 0.55 * (1 - Math.min(0.62, Math.abs(car.speed) / car.maxSpeed * 0.62));
    car.steer = U.damp(car.steer, steerTarget, 8, dt);
    var turn = car.steer * (car.speed / 2.7) * (hb ? 1.5 : 1) * dt;
    car.heading += turn;
    // Velocity with grip: under the handbrake the car slides (drift).
    var fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    var grip = hb ? 2.4 : 9;
    car.vx = U.damp(car.vx, fx * car.speed, grip, dt);
    car.vz = U.damp(car.vz, fz * car.speed, grip, dt);
    car.group.position.x += car.vx * dt;
    car.group.position.z += car.vz * dt;
    car.group.rotation.y = car.heading;
    // Wheels: spin + front steer.
    var spin = (car.speed / 0.37) * dt;
    car.wheels.forEach(function (w) {
      w.userData.spin.forEach(function (m) { m.rotation.x += spin; });
      if (w.userData.front) w.rotation.y = car.steer * 0.85;
    });
    // Body roll / pitch.
    var lat = U.clamp(-car.steer * Math.abs(car.speed) * 0.012, -0.06, 0.06);
    car.body.rotation.z = U.damp(car.body.rotation.z, lat, 6, dt);
    car.body.rotation.x = U.damp(car.body.rotation.x, U.clamp(-th * 0.02, -0.03, 0.03), 6, dt);
    // Brake lights.
    car.tailMat.emissiveIntensity = (th < 0 || hb) ? 5.5 : 3.2;
    // Damage smoke.
    car.smoke.material.opacity = car.condition < 45 ? (45 - car.condition) / 45 * 0.55 : 0;
    if (car.smoke.material.opacity > 0) {
      car.smoke.position.y = 1.1 + Math.sin(performance.now() * 0.004) * 0.15;
    }
  }

  // --- Traffic AI ------------------------------------------------------------------
  function makeTrafficRoute(rng) {
    var pts = [];
    var useAve = rng.next() < 0.5;
    if (useAve) {
      var x = rng.pick([-80, -40, 40, 80]);
      pts = [{ x: x, z: -120 }, { x: x, z: 105 }, { x: x, z: -120 }];
    } else {
      var z = rng.pick([-80, -40, 0, 40, 80]);
      pts = [{ x: -110, z: z }, { x: 105, z: z }, { x: -110, z: z }];
    }
    return pts;
  }

  function updateTraffic(car, dt, playerPos, others) {
    if (!car.route) return;
    var target = car.route[car.routeIdx];
    var dx = target.x - car.group.position.x;
    var dz = target.z - car.group.position.z;
    var d2 = dx * dx + dz * dz;
    if (d2 < 49) { car.routeIdx = (car.routeIdx + 1) % car.route.length; return; }
    var want = Math.atan2(dx, dz);
    var diff = ((want - car.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    var steer = U.clamp(diff * 2.2, -1, 1);
    // Brake for the player or a car ahead.
    var brake = false;
    if (playerPos) {
      var pdx = playerPos.x - car.group.position.x;
      var pdz = playerPos.z - car.group.position.z;
      var pd = Math.sqrt(pdx * pdx + pdz * pdz);
      var ahead = (pdx * Math.sin(car.heading) + pdz * Math.cos(car.heading)) > 0;
      if (pd < 9 && ahead) brake = true;
    }
    var throttle = brake ? (car.speed > 0.5 ? -1 : 0) : 0.55;
    updateCar(car, dt, { throttle: throttle, steer: steer, handbrake: false });
    // Keep traffic inside the city.
    car.group.position.x = U.clamp(car.group.position.x, -112, 108);
    car.group.position.z = U.clamp(car.group.position.z, -126, 112);
  }

  function damage(car, amount) {
    car.condition = Math.max(0, car.condition - amount);
    return car.condition;
  }

  SB.cars = {
    KINDS: KINDS, TRAFFIC_COLORS: TRAFFIC_COLORS,
    makeCar: makeCar, placeCar: placeCar, updateCar: updateCar,
    makeTrafficRoute: makeTrafficRoute, updateTraffic: updateTraffic,
    damage: damage, glowSprite: glowSprite
  };
})();
