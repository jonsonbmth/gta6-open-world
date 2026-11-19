// SOLMAR BAY — people: Rico on foot plus pedestrians with umbrellas.
// Bodies are capsule torsos, sphere heads and cylinder limbs with visible
// joints, in distinct clothing colours, so they read as people, not toys.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var U = SB.utils;

  var COATS = [0xff7a3d, 0x2fae5f, 0x3d7aff, 0xb06fd8, 0xe8e4da, 0x8a2a3a, 0x2a8a7a, 0xc8b060];
  var SKINS = [0xc98d5e, 0x8a5a3b, 0xe8b88a, 0x6e4630, 0xb07a4e];
  var PANTS = [0x1c2233, 0x2a2a3a, 0x3a2a1c, 0x14181f];

  function limb(r, len, mat) {
    var g = new THREE.Group();
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 8), mat);
    m.position.y = -len / 2;
    m.castShadow = true;
    g.add(m);
    return g;
  }

  function makePerson(opts) {
    opts = opts || {};
    var coat = opts.coat !== undefined ? opts.coat : COATS[0];
    var skin = opts.skin !== undefined ? opts.skin : SKINS[0];
    var pants = opts.pants !== undefined ? opts.pants : PANTS[0];
    var g = new THREE.Group();

    var coatMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.55, metalness: 0.05 });
    var skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
    var pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.85 });

    // Torso: capsule (raincoat) + hood bump.
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 4, 10), coatMat);
    torso.position.y = 1.12;
    torso.castShadow = true;
    g.add(torso);
    // Belt + coat skirt.
    var belt = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.1, 10), pantsMat);
    belt.position.y = 0.86;
    g.add(belt);
    var skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.3, 10), coatMat);
    skirt.position.y = 0.72;
    g.add(skirt);
    // Head + cap / hair.
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), skinMat);
    head.position.y = 1.78;
    head.castShadow = true;
    g.add(head);
    if (opts.cap) {
      var capMat = new THREE.MeshStandardMaterial({ color: opts.cap, roughness: 0.6 });
      var dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      dome.position.y = 1.82;
      g.add(dome);
      var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12, 1, false, -0.7, 1.4), capMat);
      brim.position.set(0, 1.86, 0.2);
      brim.rotation.x = 0.15;
      g.add(brim);
    } else {
      var hairMat = new THREE.MeshStandardMaterial({ color: opts.hair || 0x1c1410, roughness: 0.9 });
      var hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
      hair.position.y = 1.8;
      g.add(hair);
    }
    // Arms + legs with visible joints (shoulder/hip pivots).
    var armL = limb(0.09, 0.62, coatMat); armL.position.set(-0.42, 1.42, 0);
    var armR = limb(0.09, 0.62, coatMat); armR.position.set(0.42, 1.42, 0);
    var legL = limb(0.11, 0.68, pantsMat); legL.position.set(-0.17, 0.68, 0);
    var legR = limb(0.11, 0.68, pantsMat); legR.position.set(0.17, 0.68, 0);
    g.add(armL); g.add(armR); g.add(legL); g.add(legR);
    // Shoes.
    [legL, legR].forEach(function (leg) {
      var shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.6 }));
      shoe.position.set(0, -0.68, 0.06);
      leg.add(shoe);
    });

    // Umbrella (optional): tilted canopy + stick, held in the right hand.
    var umbrella = null;
    if (opts.umbrella) {
      umbrella = new THREE.Group();
      var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 }));
      stick.position.y = 0.4;
      var canopy = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.42, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: opts.umbrella, roughness: 0.5, side: THREE.DoubleSide }));
      canopy.position.y = 0.95;
      umbrella.add(stick); umbrella.add(canopy);
      umbrella.position.set(0.45, 1.15, 0.1);
      umbrella.rotation.z = -0.18;
      g.add(umbrella);
      armR.rotation.x = -0.7; // raised hand holds the umbrella
    }

    var p = {
      group: g, torso: torso, head: head,
      armL: armL, armR: armR, legL: legL, legR: legR,
      heading: 0, speed: 0, phase: Math.random() * 6,
      mode: 'walk', waypoint: null, panicT: 0, umbrella: umbrella,
      name: opts.name || 'Pedestrian'
    };
    return p;
  }

  function makeRico() {
    var rico = makePerson({ coat: 0xffd21f, skin: 0xc98d5e, pants: 0x1c2233, cap: 0xe62129, name: 'Rico Marín' });
    rico.isRico = true;
    return rico;
  }

  // Walk-cycle: swing limbs, bob the torso.
  function animateWalk(p, dt, moving) {
    if (moving) p.phase += dt * (p.speed > 4 ? 11 : 7.5);
    var s = moving ? Math.sin(p.phase) : 0;
    var amp = p.speed > 4 ? 0.85 : 0.55;
    p.legL.rotation.x = s * amp;
    p.legR.rotation.x = -s * amp;
    if (!p.umbrella) {
      p.armL.rotation.x = -s * amp * 0.8;
      p.armR.rotation.x = s * amp * 0.8;
    }
    p.torso.position.y = 1.12 + (moving ? Math.abs(Math.cos(p.phase)) * 0.05 : 0);
    p.group.rotation.y = p.heading;
  }

  // On-foot Rico controller: WASD relative to the camera yaw.
  function updateRico(rico, dt, input, camYaw) {
    var f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    var r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var moving = f !== 0 || r !== 0;
    var run = !!input.run;
    var targetSpeed = moving ? (run ? 6.4 : 3.4) : 0;
    rico.speed = U.damp(rico.speed, targetSpeed, 8, dt);
    if (moving) {
      var mx = Math.sin(camYaw) * f + Math.cos(camYaw) * r;
      var mz = Math.cos(camYaw) * f - Math.sin(camYaw) * r;
      var want = Math.atan2(mx, mz);
      rico.heading = U.angleLerp(rico.heading, want, 1 - Math.exp(-10 * dt));
      rico.group.position.x += Math.sin(rico.heading) * rico.speed * dt;
      rico.group.position.z += Math.cos(rico.heading) * rico.speed * dt;
    }
    animateWalk(rico, dt, moving && rico.speed > 0.3);
    // Keep Rico inside the city (and out of the bay).
    rico.group.position.x = U.clamp(rico.group.position.x, -112, 126);
    rico.group.position.z = U.clamp(rico.group.position.z, -126, 112);
  }

  // Pedestrian waypoint walking along sidewalks; panics run away from danger.
  function updatePed(ped, dt, danger) {
    if (ped.mode === 'panic') {
      ped.panicT -= dt;
      if (ped.panicT <= 0) ped.mode = 'walk';
      ped.speed = U.damp(ped.speed, 5.6, 6, dt);
      ped.group.position.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.group.position.z += Math.cos(ped.heading) * ped.speed * dt;
      animateWalk(ped, dt, true);
      return;
    }
    if (danger) {
      var dx = ped.group.position.x - danger.x;
      var dz = ped.group.position.z - danger.z;
      var d2 = dx * dx + dz * dz;
      if (d2 < 100) {
        ped.mode = 'panic';
        ped.panicT = 2.5 + Math.random() * 2;
        ped.heading = Math.atan2(dx, dz);
        return;
      }
    }
    if (!ped.waypoint) return;
    var tx = ped.waypoint.x - ped.group.position.x;
    var tz = ped.waypoint.z - ped.group.position.z;
    var d2w = tx * tx + tz * tz;
    if (d2w < 4) {
      if (ped.onArrive) ped.onArrive(ped);
      return;
    }
    var want = Math.atan2(tx, tz);
    ped.heading = U.angleLerp(ped.heading, want, 1 - Math.exp(-6 * dt));
    ped.speed = U.damp(ped.speed, 1.5, 4, dt);
    ped.group.position.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.group.position.z += Math.cos(ped.heading) * ped.speed * dt;
    animateWalk(ped, dt, true);
  }

  function panicNear(peds, x, z, radius) {
    peds.forEach(function (p) {
      var dx = p.group.position.x - x, dz = p.group.position.z - z;
      if (dx * dx + dz * dz < radius * radius) {
        p.mode = 'panic';
        p.panicT = 2.5 + Math.random() * 2;
        p.heading = Math.atan2(dx, dz);
      }
    });
  }

  SB.people = {
    COATS: COATS, makePerson: makePerson, makeRico: makeRico,
    updateRico: updateRico, updatePed: updatePed, panicNear: panicNear,
    animateWalk: animateWalk
  };
})();
