// People: pedestrians on the sidewalks and beach (some panicking, arms up,
// when the chase rolls past), and the 3 crew members at the marina.
var CV = window.CV || (window.CV = {});

CV.people = (function () {
  var C = CV.config;
  var peds = [];
  var crew = [];

  var SHIRTS = [0xe84a5f, 0x2e86ab, 0xffc53d, 0x3d8b4f, 0xf2f2f2, 0x8b3d7a, 0xe07b39];
  var SKINS = [0xc68642, 0x8d5524, 0xe8b88a, 0x5c3a21, 0xf1c27d];
  var PANTS = [0x2b3a4a, 0x4a2b2b, 0x3a4a2b, 0x222222, 0x6a5a3a];

  function buildPerson(shirt, skin, pants, panic) {
    var g = new THREE.Group();
    var shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
    var skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
    var pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.95 });
    // legs
    [-0.13, 0.13].forEach(function (x) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.24), pantsMat);
      leg.position.set(x, 0.4, 0);
      leg.castShadow = true;
      g.add(leg);
    });
    // torso (capsule-ish: box + rounded top via cylinder)
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 3, 8), shirtMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    g.add(torso);
    // head + hair
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.78;
    head.castShadow = true;
    g.add(head);
    // Eyes on the front (+Z) so facing reads at a glance.
    var eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
    [-0.08, 0.08].forEach(function (x) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
      eye.position.set(x, 1.82, 0.19);
      g.add(eye);
    });
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 }));
    hair.position.y = 1.82;
    g.add(hair);
    // arms: down when walking, UP when panicking
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), shirtMat);
    var armR = armL.clone();
    if (panic) {
      armL.position.set(-0.36, 1.55, 0);
      armL.rotation.z = 2.6;
      armR.position.set(0.36, 1.55, 0);
      armR.rotation.z = -2.6;
    } else {
      armL.position.set(-0.34, 1.2, 0);
      armR.position.set(0.34, 1.2, 0);
    }
    armL.castShadow = true; armR.castShadow = true;
    g.add(armL); g.add(armR);
    g.userData.panic = panic;
    return g;
  }

  function spawn(scene, seed) {
    var rng = new CV.random.RNG(seed + 77);
    // Sidewalk pedestrians along the avenue + cross streets.
    for (var i = 0; i < 26; i++) {
      var side = rng.chance(0.5) ? -1 : 1;
      var x = C.AVENUE_X + side * rng.range(10.5, 13.5);
      var z = rng.range(-190, 150);
      var panic = rng.chance(0.25);
      var p = buildPerson(rng.pick(SHIRTS), rng.pick(SKINS), rng.pick(PANTS), panic);
      p.position.set(x, 0.06, z);
      p.rotation.y = rng.range(0, Math.PI * 2);
      scene.add(p);
      peds.push({ g: p, x0: x, z0: z, dir: rng.chance(0.5) ? 1 : -1, speed: rng.range(0.6, 1.4), panic: panic, phase: rng.range(0, 6) });
    }
    // Beach people: standing, sitting, walking near the water.
    for (var j = 0; j < 12; j++) {
      var bx = rng.range(118, 152), bz = rng.range(-180, 180);
      var bp = buildPerson(rng.pick(SHIRTS), rng.pick(SKINS), rng.pick(PANTS), false);
      bp.position.set(bx, 0, bz);
      bp.rotation.y = rng.range(0, Math.PI * 2);
      scene.add(bp);
      peds.push({ g: bp, x0: bx, z0: bz, dir: 0, speed: 0, panic: false, phase: rng.range(0, 6) });
    }
    // Chase-zone pedestrians: a guaranteed crowd on both sidewalks where the
    // chase shot is staged (z -85..-15), two of them panicking, arms up.
    [[79.5, -78, true], [100.5, -66, false], [79.5, -52, false], [100.5, -38, true], [79.5, -24, false], [100.5, -14, false]].forEach(function (s) {
      var p = buildPerson(rng.pick(SHIRTS), rng.pick(SKINS), rng.pick(PANTS), s[2]);
      p.position.set(s[0], 0.06, s[1]);
      p.rotation.y = s[0] < C.AVENUE_X ? Math.PI / 2 : -Math.PI / 2;
      scene.add(p);
      peds.push({ g: p, x0: s[0], z0: s[1], dir: 1, speed: 0.8, panic: s[2], phase: rng.range(0, 6) });
    });
    // Crew at the marina: 3 named members in a row by the dock, facing the
    // camera — spread so none is hidden behind Javi or the HUD panels.
    var crewSpots = [[76, 178], [81, 182], [84, 178]];
    C.CREW.forEach(function (member, i) {
      var cp = buildPerson(parseInt(member.shirt.slice(1), 16), parseInt(member.skin.slice(1), 16), 0x2b3a4a, false);
      cp.position.set(crewSpots[i][0], 0, crewSpots[i][1]);
      cp.rotation.y = Math.PI; // face north (toward the marina camera)
      cp.scale.setScalar(1.06);
      scene.add(cp);
      crew.push(cp);
    });
    return { peds: peds.length, crew: crew.length };
  }

  function update(dt, t, heroPos) {
    peds.forEach(function (p) {
      if (p.speed > 0) {
        // stroll along the sidewalk, turn at block ends
        p.g.position.z += p.dir * p.speed * dt;
        if (p.g.position.z > p.z0 + 14 || p.g.position.z < p.z0 - 14) p.dir *= -1;
        p.g.rotation.y = p.dir > 0 ? 0 : Math.PI;
        p.g.position.y = 0.06 + Math.abs(Math.sin(t * 5 + p.phase)) * 0.04;
      }
      // Panic: if the hero/police are close, arms stay up + face the road.
      if (p.panic && heroPos) {
        var dx = p.g.position.x - heroPos.x, dz = p.g.position.z - heroPos.z;
        if (dx * dx + dz * dz < 900) {
          p.g.rotation.y = Math.atan2(dx, dz);
          p.g.position.y = 0.06 + Math.abs(Math.sin(t * 9 + p.phase)) * 0.08;
        }
      }
    });
  }

  function heroOnFoot(scene, x, z) {
    // The player character (Javi) for the marina shot: red shirt, facing camera.
    var javi = buildPerson(0xd21f2b, 0xc68642, 0x2b3a4a, false);
    javi.position.set(x, 0, z);
    javi.rotation.y = Math.PI;
    javi.scale.setScalar(1.08);
    scene.add(javi);
    return javi;
  }

  return { spawn: spawn, update: update, heroOnFoot: heroOnFoot, crew: crew, peds: peds };
})();
