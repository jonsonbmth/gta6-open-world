// SOLMAR BAY — pedestrians: capsule torsos, sphere heads, cylinder limbs,
// raincoats and umbrellas. They stroll the sidewalks and panic-run when a
// chase comes through.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var U = SB.utils;

  var P = { list: [] };
  var COATS = [0xffd23f, 0xff2d55, 0x00e5ff, 0x2eff8f, 0xb26bff, 0xff7a1a, 0xe8e8e8];

  function makePerson(rng, coatColor) {
    var g = new THREE.Group();
    var skin = new THREE.MeshStandardMaterial({
      color: U.pick(rng, [0xc98a5e, 0x8a5a34, 0xd9a06f, 0x6b4226, 0xe8b48a]),
      roughness: 0.7,
    });
    var coat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.45, metalness: 0.15 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.8 });
    // Torso: capsule.
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.55, 4, 10), coat);
    torso.position.y = 1.05;
    g.add(torso);
    // Head: sphere + hair cap.
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
    head.position.y = 1.72;
    g.add(head);
    var hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: U.pick(rng, [0x1a1210, 0x3a2410, 0x0d0d0d, 0x7a2d12]), roughness: 0.9 })
    );
    hair.position.y = 1.74;
    g.add(hair);
    // Arms + legs: cylinders, pivoted for the walk swing.
    var limbs = {};
    [['armL', -0.32, 1.3], ['armR', 0.32, 1.3]].forEach(function (a) {
      var pivot = new THREE.Group();
      pivot.position.set(a[1], a[2], 0);
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 6), coat);
      arm.position.y = -0.31;
      pivot.add(arm);
      g.add(pivot);
      limbs[a[0]] = pivot;
    });
    [['legL', -0.13, 0.78], ['legR', 0.13, 0.78]].forEach(function (a) {
      var pivot = new THREE.Group();
      pivot.position.set(a[1], a[2], 0);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 6), dark);
      leg.position.y = -0.36;
      pivot.add(leg);
      g.add(pivot);
      limbs[a[0]] = pivot;
    });
    // Umbrella for some.
    if (rng() < 0.45) {
      var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5), dark);
      stick.position.set(0.25, 1.85, 0);
      g.add(stick);
      var canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.3, 8),
        new THREE.MeshStandardMaterial({
          color: U.pick(rng, [0xff2d95, 0x00e5ff, 0xffd23f, 0xe62129]),
          roughness: 0.5, side: THREE.DoubleSide,
        })
      );
      canopy.position.set(0.25, 2.22, 0);
      g.add(canopy);
    }
    return { group: g, limbs: limbs };
  }

  function spawn(scene, count, rng) {
    for (var i = 0; i < count; i++) {
      var coat = U.pick(rng, COATS);
      var person = makePerson(rng, coat);
      scene.add(person.group);
      // Stroll along a sidewalk or the marina.
      var onMarina = rng() < 0.25;
      var x, z;
      if (onMarina) {
        x = -160 + rng() * 50;
        z = 125 + rng() * 45;
      } else {
        x = (rng() < 0.5 ? -12 : 12) + U.rand(rng, -1.5, 1.5);
        z = U.rand(rng, -170, 170);
      }
      P.list.push({
        person: person,
        x: x, z: z,
        heading: rng() * Math.PI * 2,
        speed: 1.1 + rng() * 0.8,
        phase: rng() * Math.PI * 2,
        panicked: false,
        panicTime: 0,
        walkTarget: { x: x, z: z },
        home: { x: x, z: z },
      });
      person.group.position.set(x, 0, z);
    }
  }

  function update(dt, time, playerX, playerZ, playerSpeed, wanted) {
    P.list.forEach(function (p) {
      var d2 = U.dist2(p.x, p.z, playerX, playerZ);
      // Panic when a fast car or a chase is near.
      if (!p.panicked && wanted >= 2 && d2 < 900) {
        p.panicked = true;
        p.panicTime = 4 + Math.random() * 3;
      }
      if (!p.panicked && playerSpeed > 25 && d2 < 200) {
        p.panicked = true;
        p.panicTime = 2.5 + Math.random() * 2;
      }
      var speed = p.speed;
      if (p.panicked) {
        p.panicTime -= dt;
        speed = 4.6; // run!
        // Flee directly away from the player.
        var dx = p.x - playerX, dz = p.z - playerZ;
        var d = Math.sqrt(dx * dx + dz * dz) || 1;
        p.heading = Math.atan2(dx / d, dz / d);
        if (p.panicTime <= 0) p.panicked = false;
      } else {
        // Wander: pick a new nearby target when reached.
        var td2 = U.dist2(p.x, p.z, p.walkTarget.x, p.walkTarget.z);
        if (td2 < 4) {
          p.walkTarget = {
            x: U.clamp(p.home.x + U.rand(Math.random, -25, 25), -165, 165),
            z: U.clamp(p.home.z + U.rand(Math.random, -25, 25), -190, 190),
          };
        }
        var tx = p.walkTarget.x - p.x, tz = p.walkTarget.z - p.z;
        p.heading = U.angleLerp(p.heading, Math.atan2(tx, tz), Math.min(1, dt * 3));
      }
      p.x += Math.sin(p.heading) * speed * dt;
      p.z += Math.cos(p.heading) * speed * dt;
      p.x = U.clamp(p.x, -165, 165);
      p.z = U.clamp(p.z, -195, 195);
      // Keep out of buildings.
      var hit = SB.world.collideCircle(p.x, p.z, 0.4);
      if (hit) { p.x = hit.x; p.z = hit.z; }
      p.person.group.position.set(p.x, 0, p.z);
      p.person.group.rotation.y = p.heading;
      // Walk swing.
      p.phase += dt * (p.panicked ? 11 : 5.5);
      var swing = Math.sin(p.phase) * (p.panicked ? 0.9 : 0.55);
      p.person.limbs.armL.rotation.x = swing;
      p.person.limbs.armR.rotation.x = -swing;
      p.person.limbs.legL.rotation.x = -swing;
      p.person.limbs.legR.rotation.x = swing;
    });
  }

  P.spawn = spawn;
  P.update = update;
  SB.people = P;
})();
