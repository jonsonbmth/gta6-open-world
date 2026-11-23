// Aurelia Bay — vehicles. The hero car is the most-looked-at object in the
// game, so it is built with real proportions: a low sculpted body, a glass
// cabin with a sloped windshield, four visible wheels with hubs, headlights,
// taillights and a spoiler. Traffic and police share the same builder with
// different bodies. Arcade physics: acceleration, braking, steering that
// tightens with speed, handbrake drift, and simple collision.
(function () {
  'use strict';
  var U = window.AB.util;

  var CAR_COLORS = [
    0xc22e2e, 0x274b9f, 0xf5f2ea, 0x2e6b4f, 0xf5c542, 0x8a8fa3,
    0xe07856, 0x37505e, 0xd9d9d9, 0x6b4f9e, 0x2f8fa8, 0x1f1f26
  ];

  var glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2836, metalness: 0.9, roughness: 0.18
  });
  var tireMat = new THREE.MeshLambertMaterial({ color: 0x17181c });
  var hubMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 0.85, roughness: 0.3 });
  var chromeMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, metalness: 0.9, roughness: 0.25 });
  var lightFrontMat = new THREE.MeshStandardMaterial({
    color: 0xfff6c8, emissive: 0xfff2a8, emissiveIntensity: 1.6
  });
  var lightRearMat = new THREE.MeshStandardMaterial({
    color: 0xaa1414, emissive: 0xdd2222, emissiveIntensity: 1.2
  });

  var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  wheelGeo.rotateX(Math.PI / 2); // axle along the car's width (z)
  var hubGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.3, 10);
  hubGeo.rotateX(Math.PI / 2);

  function makeWheel() {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    g.add(tire);
    var hub = new THREE.Mesh(hubGeo, hubMat);
    g.add(hub);
    return g;
  }

  // bodyType: 'sports' | 'sedan' | 'taxi' | 'van' | 'pickup' | 'police'
  function makeCarModel(bodyType, color) {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({
      color: color, metalness: 0.55, roughness: 0.35
    });
    var isVan = bodyType === 'van';
    var isSports = bodyType === 'sports' || bodyType === 'police';
    var L = isVan ? 5.0 : 4.6, W = 2.0, bodyH = isVan ? 1.5 : 0.62, bodyY = isVan ? 1.05 : 0.62;

    // lower body: main slab + sculpted nose + tail wedges
    var body = new THREE.Mesh(new THREE.BoxGeometry(L, bodyH, W), bodyMat);
    body.position.y = bodyY;
    body.castShadow = true;
    g.add(body);
    if (!isVan) {
      var nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, W * 0.94), bodyMat);
      nose.position.set(L / 2 - 0.25, bodyY - 0.06, 0);
      nose.rotation.z = -0.16;
      nose.castShadow = true;
      g.add(nose);
      var tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, W * 0.94), bodyMat);
      tail.position.set(-L / 2 + 0.3, bodyY - 0.04, 0);
      tail.rotation.z = 0.12;
      tail.castShadow = true;
      g.add(tail);
      // side skirts + bumpers
      var skirt = new THREE.Mesh(new THREE.BoxGeometry(L * 0.7, 0.16, W + 0.06),
        new THREE.MeshLambertMaterial({ color: 0x1c1c22 }));
      skirt.position.y = 0.32;
      g.add(skirt);
      var bumpF = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, W + 0.04), chromeMat);
      bumpF.position.set(L / 2 + 0.05, 0.52, 0);
      g.add(bumpF);
      var bumpR = bumpF.clone();
      bumpR.position.x = -L / 2 - 0.05;
      g.add(bumpR);
    }

    // glass cabin with sloped windshield and rear glass
    var cabL = isVan ? 2.2 : 2.3, cabH = isVan ? 0.9 : 0.55, cabW = W * 0.86;
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(cabL, cabH, cabW), glassMat);
    cabin.position.set(isVan ? 0.9 : -0.15, bodyY + bodyH / 2 + cabH / 2 - 0.05, 0);
    cabin.castShadow = true;
    g.add(cabin);
    // roof panel over the glass
    var roof = new THREE.Mesh(new THREE.BoxGeometry(cabL * 0.82, 0.09, cabW * 0.96), bodyMat);
    roof.position.set(isVan ? 0.9 : -0.15, bodyY + bodyH / 2 + cabH + 0.02, 0);
    roof.castShadow = true;
    g.add(roof);
    // sloped windshield: a thin glass slab leaning back from the cabin front
    var shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, cabW * 0.94), glassMat);
    shield.position.set(isVan ? 2.0 : 1.02, bodyY + bodyH / 2 + cabH * 0.5, 0);
    shield.rotation.z = -0.42;
    g.add(shield);

    // wheels: four, visible, tucked under arches
    var wheelY = 0.36, wx = L / 2 - 0.85, wz = W / 2 - 0.08;
    var wheels = [];
    [[wx, wz], [wx, -wz], [-wx, wz], [-wx, -wz]].forEach(function (p) {
      var w = makeWheel();
      w.position.set(p[0], wheelY, p[1]);
      g.add(w);
      wheels.push(w);
    });

    // headlights + taillights
    var hlGeo = new THREE.BoxGeometry(0.12, 0.18, 0.42);
    [[L / 2 + 0.02, 0.62, 0.68], [L / 2 + 0.02, 0.62, -0.68]].forEach(function (p) {
      var hl = new THREE.Mesh(hlGeo, lightFrontMat);
      hl.position.set(p[0], p[1], p[2]);
      g.add(hl);
    });
    var tlGeo = new THREE.BoxGeometry(0.1, 0.16, 0.5);
    [[-L / 2 - 0.02, 0.66, 0.68], [-L / 2 - 0.02, 0.66, -0.68]].forEach(function (p) {
      var tl = new THREE.Mesh(tlGeo, lightRearMat);
      tl.position.set(p[0], p[1], p[2]);
      g.add(tl);
    });

    if (isSports) {
      // rear spoiler
      var wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.7), bodyMat);
      wing.position.set(-L / 2 + 0.25, bodyY + bodyH + 0.32, 0);
      wing.castShadow = true;
      g.add(wing);
      var strutGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
      [-0.6, 0.6].forEach(function (z) {
        var s = new THREE.Mesh(strutGeo, bodyMat);
        s.position.set(-L / 2 + 0.25, bodyY + bodyH + 0.15, z);
        g.add(s);
      });
    }
    if (bodyType === 'taxi') {
      var sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xaa8800, emissiveIntensity: 0.6 }));
      sign.position.set(-0.15, bodyY + bodyH + cabH + 0.2, 0);
      g.add(sign);
    }
    if (bodyType === 'pickup') {
      var bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, W * 0.9),
        new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
      bed.position.set(-1.5, bodyY + 0.35, 0);
      g.add(bed);
    }
    if (bodyType === 'police') {
      // light bar: red left, blue right, flashing handled by police.js
      var bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 1.5),
        new THREE.MeshLambertMaterial({ color: 0x22222a }));
      bar.position.set(-0.15, bodyY + bodyH + cabH + 0.16, 0);
      g.add(bar);
      var red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }));
      red.position.set(-0.15, bodyY + bodyH + cabH + 0.2, 0.42);
      red.name = 'sirenRed';
      g.add(red);
      var blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 2 }));
      blue.position.set(-0.15, bodyY + bodyH + cabH + 0.2, -0.42);
      blue.name = 'sirenBlue';
      g.add(blue);
      // door decal band
      var band = new THREE.Mesh(new THREE.BoxGeometry(L * 0.5, 0.3, W + 0.02),
        new THREE.MeshLambertMaterial({ color: 0x1a1a22 }));
      band.position.set(0, bodyY + 0.05, 0);
      g.add(band);
    }

    g.userData.wheels = wheels;
    g.userData.bodyType = bodyType;
    return g;
  }

  // ---- arcade car state ----
  function makeCarState(model, x, z, heading) {
    return {
      model: model, x: x, z: z, heading: heading,
      speed: 0, steer: 0, drift: 0, condition: 100,
      name: 'DORADO GT', tune: 'SPORTS · TUNE 2'
    };
  }

  var MAX_SPEED = 46;       // ~165 km/h
  var ACCEL = 22, BRAKE = 34, REVERSE_MAX = 12;

  // Arcade update: throttle/brake/steer inputs, handbrake drift, collisions
  // against building boxes. Returns true when a wall was hit hard.
  function updatePlayerCar(car, input, dt, colliders) {
    var crashed = false;
    if (input.throttle) car.speed += ACCEL * dt;
    else if (input.brake) car.speed -= BRAKE * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
    if (input.reverse) car.speed -= ACCEL * 0.6 * dt;
    car.speed = U.clamp(car.speed, -REVERSE_MAX, MAX_SPEED);

    var targetSteer = 0;
    if (input.left) targetSteer = 1;
    if (input.right) targetSteer = -1;
    car.steer = U.damp(car.steer, targetSteer, 8, dt);

    var spdFactor = U.clamp(Math.abs(car.speed) / 12, 0, 1);
    var turnRate = 1.9 * spdFactor * (input.handbrake ? 1.5 : 1);
    if (car.speed < 0) turnRate = -turnRate;
    car.heading += car.steer * turnRate * dt;

    if (input.handbrake && Math.abs(car.speed) > 14) {
      car.drift = U.clamp(car.drift + dt * 2.2, 0, 1);
      car.speed -= 4 * dt;
    } else {
      car.drift = U.clamp(car.drift - dt * 1.8, 0, 1);
    }

    var slide = car.drift * 0.55;
    var moveHeading = car.heading + car.steer * slide * 0.5;
    var nx = car.x + Math.sin(moveHeading) * car.speed * dt;
    var nz = car.z + Math.cos(moveHeading) * car.speed * dt;

    // building collision: circle vs AABB, slide along the wall
    var hit = false;
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var cx = U.clamp(nx, c.minX, c.maxX), cz = U.clamp(nz, c.minZ, c.maxZ);
      var dx = nx - cx, dz = nz - cz;
      if (dx * dx + dz * dz < 2.4 * 2.4) {
        hit = true;
        if (Math.abs(car.speed) > 18) {
          car.condition = Math.max(30, car.condition - Math.abs(car.speed) * 0.35);
          crashed = true;
        }
        car.speed *= 0.35;
        // push out along the smallest penetration axis
        if (Math.abs(dx) > Math.abs(dz)) nx = car.x; else nz = car.z;
        break;
      }
    }
    car.x = U.clamp(nx, -205, 148);
    car.z = U.clamp(nz, -148, 148);
    car.model.position.set(car.x, 0, car.z);
    // the model nose points +x; rotation.y = heading - PI/2 aims it along
    // the movement direction (sin h, cos h)
    car.model.rotation.y = car.heading - Math.PI / 2;
    var spin = car.speed * dt / 0.36;
    var wheels = car.model.userData.wheels;
    for (var w = 0; w < wheels.length; w++) wheels[w].rotation.z -= spin;
    // front wheels steer visually
    wheels[0].rotation.y = car.steer * 0.42;
    wheels[1].rotation.y = car.steer * 0.42;
    return crashed;
  }

  // ---- traffic: cars that follow road lanes and wrap around the city ----
  function makeTraffic(scene, city, rng, count) {
    var cars = [];
    var types = ['sedan', 'sedan', 'taxi', 'van', 'pickup', 'sedan'];
    for (var i = 0; i < count; i++) {
      var road = city.roads[Math.floor(rng.next() * city.roads.length)];
      var type = types[Math.floor(rng.next() * types.length)];
      var color = type === 'taxi' ? 0xf5c542 : CAR_COLORS[Math.floor(rng.next() * CAR_COLORS.length)];
      var model = makeCarModel(type, color);
      var lane = road.width / 4 * rng.pick([-1, 1]);
      var dir = rng.pick([-1, 1]);
      var along = rng.range(-140, 140);
      var car = {
        model: model, road: road, lane: lane, dir: dir, along: along,
        speed: rng.range(7, 12), type: type
      };
      placeTrafficCar(car);
      scene.add(model);
      cars.push(car);
    }
    return {
      cars: cars,
      update: function (dt, playerPos) {
        for (var i = 0; i < cars.length; i++) {
          var c = cars[i];
          c.along += c.dir * c.speed * dt;
          if (c.along > 150) c.along = -150;
          if (c.along < -150) c.along = 150;
          placeTrafficCar(c);
          // brake when the player is close ahead
          if (playerPos) {
            var dx = c.model.position.x - playerPos.x;
            var dz = c.model.position.z - playerPos.z;
            if (dx * dx + dz * dz < 49) {
              c.along -= c.dir * c.speed * dt * 0.8;
              placeTrafficCar(c);
            }
          }
          var spin = c.speed * dt / 0.36;
          var wheels = c.model.userData.wheels;
          for (var w = 0; w < wheels.length; w++) wheels[w].rotation.z -= spin * c.dir;
        }
      }
    };
  }

  function placeTrafficCar(c) {
    var x, z, heading;
    if (c.road.axis === 'x') {
      x = c.road.at + c.lane;
      z = c.along;
      heading = c.dir > 0 ? 0 : Math.PI;
    } else {
      x = c.along;
      z = c.road.at + c.lane;
      heading = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    c.model.position.set(x, 0, z);
    c.model.rotation.y = heading - Math.PI / 2;
  }

  window.AB.vehicles = {
    CAR_COLORS: CAR_COLORS,
    makeCarModel: makeCarModel,
    makeCarState: makeCarState,
    updatePlayerCar: updatePlayerCar,
    makeTraffic: makeTraffic,
    MAX_SPEED: MAX_SPEED
  };
})();
