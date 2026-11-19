// SOLMAR BAY — cars: extruded side profiles (never boxes), wheels, lights,
// arcade driving physics, traffic AI. The hero is the VULPINE S.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;

  var Cars = {
    hero: null,
    traffic: [],
    police: [],
  };

  // Side profile of a sports car: low nose, sloped hood, trapezoid glass
  // cabin, fastback rear. Extruded across the width, never a box.
  function bodyShape(sporty) {
    var s = new THREE.Shape();
    // x = length axis (-2.4 nose .. +2.4 tail), y = height.
    s.moveTo(-2.4, 0.35);
    s.lineTo(-2.35, 0.62); // low nose
    s.lineTo(-1.15, 0.86); // sloped hood
    s.lineTo(-0.45, 1.28); // windshield base
    s.lineTo(0.35, 1.42); // roof front
    s.lineTo(1.15, 1.38); // roof rear
    s.lineTo(1.95, 1.02); // fastback slope
    s.lineTo(2.4, 0.92); // tail
    s.lineTo(2.4, 0.4);
    s.lineTo(1.4, 0.32);
    s.lineTo(-1.4, 0.32);
    s.closePath();
    return s;
  }

  function glassShape() {
    var s = new THREE.Shape();
    s.moveTo(-0.55, 0.95);
    s.lineTo(-0.3, 1.3);
    s.lineTo(0.4, 1.36);
    s.lineTo(1.05, 1.34);
    s.lineTo(1.55, 1.0);
    s.lineTo(-0.55, 1.0);
    s.closePath();
    return s;
  }

  function makeWheel(r) {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.34, 14),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 })
    );
    tire.rotation.z = Math.PI / 2;
    g.add(tire);
    var rim = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.58, r * 0.58, 0.36, 8),
      new THREE.MeshStandardMaterial({ color: 0xb8bcc8, roughness: 0.3, metalness: 0.9 })
    );
    rim.rotation.z = Math.PI / 2;
    g.add(rim);
    return g;
  }

  // Build one car. opts: { color, police, taxi, sporty, name }
  function makeCar(opts) {
    var g = new THREE.Group();
    var paint = new THREE.MeshStandardMaterial({
      color: opts.color,
      roughness: 0.22,
      metalness: 0.65,
    });
    // Body: extruded profile.
    var bodyGeo = new THREE.ExtrudeGeometry(bodyShape(opts.sporty), {
      depth: 1.7,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelSegments: 2,
      steps: 1,
    });
    var body = new THREE.Mesh(bodyGeo, paint);
    body.rotation.y = Math.PI / 2; // length along Z
    body.position.x = -0.85;
    body.position.y = 0.28;
    g.add(body);
    // Glass cabin.
    var glass = new THREE.Mesh(
      new THREE.ExtrudeGeometry(glassShape(), {
        depth: 1.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1,
      }),
      new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.08, metalness: 0.9 })
    );
    glass.rotation.y = Math.PI / 2;
    glass.position.x = -0.75;
    glass.position.y = 0.28;
    g.add(glass);
    // Wheels + torus fender arches.
    var wheelPos = [[-0.85, -1.45], [0.85, -1.45], [-0.85, 1.45], [0.85, 1.45]];
    var wheels = [];
    var archMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    wheelPos.forEach(function (p) {
      var w = makeWheel(0.36);
      w.position.set(p[0], 0.36, p[1]);
      g.add(w);
      wheels.push(w);
      var arch = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 6, 12, Math.PI), archMat);
      arch.position.set(p[0] + (p[0] > 0 ? 0.06 : -0.06), 0.42, p[1]);
      arch.rotation.y = Math.PI / 2;
      g.add(arch);
    });
    // Spoiler (hero + sporty cars). NOTE: in car-local space the nose points
    // +Z and the tail -Z (the profile is rotated 90 deg), so the spoiler,
    // taillight bar and headlights sit on the -Z / +Z ends respectively.
    if (opts.sporty) {
      var wingMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.5 });
      var wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.5), wingMat);
      wing.position.set(0, 1.32, -2.15);
      wing.rotation.x = 0.12;
      g.add(wing);
      [-0.7, 0.7].forEach(function (x) {
        var strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.3), wingMat);
        strut.position.set(x, 1.12, -2.15);
        g.add(strut);
      });
    }
    // Full-width taillight bar at the tail (-Z local).
    var tail = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.18, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false })
    );
    tail.position.set(0, 0.8, -2.44);
    g.add(tail);
    var tailGlow = U.glowSprite(0xff2a1a, 1.2, 0.5);
    tailGlow.position.set(0, 0.8, -2.6);
    g.add(tailGlow);
    // Headlights at the nose (+Z local).
    [-0.55, 0.55].forEach(function (x) {
      var hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.14, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false })
      );
      hl.position.set(x, 0.72, 2.44);
      g.add(hl);
      var hg = U.glowSprite(0xfff6d8, 1.8, 0.6);
      hg.position.set(x, 0.72, 2.6);
      g.add(hg);
    });
    // Police livery: white doors + roof + light bar.
    var lightBar = null;
    if (opts.police) {
      var doorMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4, metalness: 0.3 });
      [-0.92, 0.92].forEach(function (x) {
        var door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.7), doorMat);
        door.position.set(x, 0.82, 0.1);
        g.add(door);
      });
      var roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.9), doorMat);
      roof.position.set(0, 1.46, 0.2);
      g.add(roof);
      var barBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.12, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })
      );
      barBase.position.set(0, 1.52, 0.3);
      g.add(barBase);
      lightBar = { left: null, right: null, leftGlow: null, rightGlow: null };
      var left = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.14, 0.3),
        new THREE.MeshBasicMaterial({ color: C.policeRed, toneMapped: false })
      );
      left.position.set(-0.34, 1.62, 0.3);
      g.add(left);
      var right = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.14, 0.3),
        new THREE.MeshBasicMaterial({ color: C.policeBlue, toneMapped: false })
      );
      right.position.set(0.34, 1.62, 0.3);
      g.add(right);
      var lg = U.glowSprite(C.policeRed, 3.1, 0.75);
      lg.position.set(-0.42, 1.7, 0.3);
      g.add(lg);
      var rg = U.glowSprite(C.policeBlue, 3.1, 0.75);
      rg.position.set(0.42, 1.7, 0.3);
      g.add(rg);
      lightBar.left = left; lightBar.right = right;
      lightBar.leftGlow = lg; lightBar.rightGlow = rg;
    }
    // Taxi sign.
    if (opts.taxi) {
      var sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.22, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffe27a, toneMapped: false })
      );
      sign.position.set(0, 1.56, 0.2);
      g.add(sign);
    }
    // Soft blob shadow.
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 5.6),
      new THREE.MeshBasicMaterial({
        map: U.glowTexture(), color: 0x000000,
        transparent: true, opacity: 0.55, depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    g.add(shadow);

    return { group: g, wheels: wheels, lightBar: lightBar, name: opts.name || 'CAR' };
  }

  // Arcade car state: position, heading, speed, steering. The group is
  // placed immediately — states that never get a drive() step (screenshot
  // police units) must still render at their spawn point.
  function makeCarState(car, x, z, heading, spec) {
    car.group.position.set(x, 0, z);
    car.group.rotation.y = heading;
    return {
      car: car, x: x, z: z, heading: heading,
      speed: 0, steer: 0, topSpeed: spec.topSpeed || 50,
      accel: spec.accel || 22, condition: 100,
      drifting: false, driftTime: 0,
    };
  }

  // Drive one step: throttle -1..1, steer -1..1, handbrake bool.
  function drive(state, throttle, steerInput, handbrake, dt) {
    var s = state;
    s.steer = U.lerp(s.steer, steerInput, Math.min(1, dt * 8));
    var forward = s.speed >= 0 ? 1 : -1;
    if (throttle > 0) s.speed += s.accel * throttle * dt;
    else if (throttle < 0) {
      if (s.speed > 0.5) s.speed -= 34 * dt; // brake
      else s.speed -= 10 * dt; // reverse
    } else {
      s.speed -= s.speed * 0.4 * dt; // drag
    }
    s.speed = U.clamp(s.speed, -12, s.topSpeed);
    // Steering only bites while moving; handbrake breaks traction.
    var grip = handbrake ? 0.35 : 1;
    var turnRate = s.steer * U.clamp(Math.abs(s.speed) / 12, 0, 1) * 1.9 * grip;
    s.heading += turnRate * dt * forward;
    s.drifting = handbrake && Math.abs(s.speed) > 14 && Math.abs(s.steer) > 0.4;
    if (s.drifting) s.driftTime += dt; else s.driftTime = 0;
    var nx = s.x + Math.sin(s.heading) * s.speed * dt;
    var nz = s.z + Math.cos(s.heading) * s.speed * dt;
    // Collide with buildings: slide along the wall, lose speed.
    var hit = SB.world.collideCircle(nx, nz, 1.6);
    if (hit) {
      nx = hit.x; nz = hit.z;
      if (Math.abs(s.speed) > 6) {
        s.condition = Math.max(0, s.condition - Math.abs(s.speed) * 0.35);
        SB.events && SB.events.emit('crash', Math.abs(s.speed));
      }
      s.speed *= 0.35;
    }
    // City bounds.
    nx = U.clamp(nx, -168, 168);
    nz = U.clamp(nz, -198, 198);
    s.x = nx; s.z = nz;
    s.car.group.position.set(s.x, 0, s.z);
    s.car.group.rotation.y = s.heading;
    // Spin the wheels; front wheels steer visually.
    var spin = (s.speed * dt) / 0.36;
    s.car.wheels.forEach(function (w, i) {
      w.rotation.x += spin;
      if (i < 2) w.rotation.y = s.steer * 0.4;
    });
    // Body roll + pitch for feel.
    s.car.group.rotation.z = -s.steer * U.clamp(Math.abs(s.speed) / 40, 0, 1) * 0.06;
    s.car.group.rotation.x = U.clamp(-throttle * 0.02, -0.03, 0.03);
    return s;
  }

  // Traffic: cars that follow the avenue and cross streets, stop at nothing,
  // and panic-brake near the player.
  function spawnTraffic(scene, count, rng) {
    var specs = C.trafficCars;
    for (var i = 0; i < count; i++) {
      var spec = U.pick(rng, specs);
      var car = makeCar({
        color: spec.color,
        taxi: spec.name === 'SOLMAR CAB',
        sporty: spec.name === 'MAMBA',
        name: spec.name,
      });
      scene.add(car.group);
      var onAvenue = rng() < 0.55;
      var x, z, heading;
      if (onAvenue) {
        x = (rng() < 0.5 ? -4 : 4);
        z = U.rand(rng, -180, 180);
        heading = x < 0 ? Math.PI : 0;
      } else {
        var streetZ = Math.floor(U.rand(rng, -4, 5)) * 40;
        x = U.rand(rng, -150, 150);
        z = streetZ + (rng() < 0.5 ? -3 : 3);
        heading = z > streetZ ? -Math.PI / 2 : Math.PI / 2;
      }
      var state = makeCarState(car, x, z, heading, { topSpeed: 16 + rng() * 6, accel: 14 });
      state.speed = state.topSpeed * 0.8;
      state.lane = onAvenue ? 'avenue' : 'street';
      state.routeZ = z;
      Cars.traffic.push(state);
    }
  }

  function updateTraffic(dt, playerX, playerZ) {
    Cars.traffic.forEach(function (t) {
      // Panic-brake if the player is close and fast.
      var d2 = U.dist2(t.x, t.z, playerX, playerZ);
      var throttle = 0.55;
      if (d2 < 400) throttle = -0.6; // brake
      if (d2 < 60) throttle = 0; // stopped, frozen
      drive(t, throttle, 0, false, dt);
      // Wrap around the city edge.
      if (t.z > 200) t.z = -200;
      if (t.z < -200) t.z = 200;
      if (t.x > 170) t.x = -170;
      if (t.x < -170) t.x = 170;
    });
  }

  // Police light bar strobe: alternate red/blue every 0.35s.
  function updatePoliceLights(time) {
    var phase = Math.floor(time / 0.35) % 2 === 0;
    Cars.police.forEach(function (p) {
      var lb = p.car.lightBar;
      if (!lb) return;
      lb.left.visible = phase;
      lb.leftGlow.visible = phase;
      lb.right.visible = !phase;
      lb.rightGlow.visible = !phase;
      if (p.sirenLight) {
        p.sirenLight.color.setHex(phase ? C.policeRed : C.policeBlue);
      }
    });
  }

  Cars.makeCar = makeCar;
  Cars.makeCarState = makeCarState;
  Cars.drive = drive;
  Cars.spawnTraffic = spawnTraffic;
  Cars.updateTraffic = updateTraffic;
  Cars.updatePoliceLights = updatePoliceLights;
  SB.cars = Cars;
})();
