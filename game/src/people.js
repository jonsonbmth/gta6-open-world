// Aurelia Bay — people. Proportional figures (~1.75 units tall) with a real
// walk cycle, varied skin tones, clothes and hair, doing visible things on
// the sidewalks: walking in pairs, chatting, waiting at crossings, sitting.
// People stay at mid-distance in the staged shots — no giant mannequin
// close-ups. The player character shares the same builder.
(function () {
  'use strict';
  var U = window.AB.util;

  var SKINS = [0xf2c89b, 0xd9a066, 0xa06a3b, 0x7a4a26, 0xf7d7b0, 0xc98a5e];
  var SHIRTS = [0xc22e2e, 0x274b9f, 0x2e6b4f, 0xf5c542, 0x7fb069, 0xe07856,
    0x6b4f9e, 0x2f8fa8, 0xf5f2ea, 0xd98a8a, 0x37505e, 0xff8c42];
  var PANTS = [0x2a2a30, 0x37505e, 0x5a4a3a, 0x3a3f45, 0x6b4f3a, 0x1f1f26];
  var HAIRS = [0x1a1a1a, 0x4a2e18, 0x8a6b45, 0xc9a227, 0x6e6e6e, 0xa63a2e];

  var headGeo = new THREE.SphereGeometry(0.21, 12, 10);
  var hairGeo = new THREE.SphereGeometry(0.225, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  var torsoGeo = new THREE.BoxGeometry(0.52, 0.62, 0.3);
  var armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.62, 6);
  armGeo.translate(0, -0.31, 0);
  var legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.72, 6);
  legGeo.translate(0, -0.36, 0);
  var hatGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.1, 10);

  // A proportional person: head + hair, torso, swinging arms, walking legs.
  // Returns a group with userData joints for animation.
  function makePersonModel(opts) {
    opts = opts || {};
    var rng = opts.rng || U.makeRng(1);
    var skin = new THREE.MeshLambertMaterial({ color: opts.skin || rng.pick(SKINS) });
    var shirt = new THREE.MeshLambertMaterial({ color: opts.shirt || rng.pick(SHIRTS) });
    var pants = new THREE.MeshLambertMaterial({ color: opts.pants || rng.pick(PANTS) });
    var hair = new THREE.MeshLambertMaterial({ color: opts.hair || rng.pick(HAIRS) });

    var g = new THREE.Group();

    var legL = new THREE.Group(); legL.position.set(0.13, 0.78, 0);
    var legR = new THREE.Group(); legR.position.set(-0.13, 0.78, 0);
    var ll = new THREE.Mesh(legGeo, pants); ll.castShadow = true;
    var lr = new THREE.Mesh(legGeo, pants); lr.castShadow = true;
    legL.add(ll); legR.add(lr);
    g.add(legL); g.add(legR);

    var torso = new THREE.Mesh(torsoGeo, shirt);
    torso.position.y = 1.12;
    torso.castShadow = true;
    g.add(torso);

    var armL = new THREE.Group(); armL.position.set(0.32, 1.38, 0);
    var armR = new THREE.Group(); armR.position.set(-0.32, 1.38, 0);
    var al = new THREE.Mesh(armGeo, shirt); al.castShadow = true;
    var ar = new THREE.Mesh(armGeo, shirt); ar.castShadow = true;
    armL.add(al); armR.add(ar);
    g.add(armL); g.add(armR);

    var head = new THREE.Group();
    head.position.y = 1.62;
    var skull = new THREE.Mesh(headGeo, skin);
    skull.castShadow = true;
    head.add(skull);
    var hairM = new THREE.Mesh(hairGeo, hair);
    hairM.position.y = 0.02;
    head.add(hairM);
    // simple face: two eyes
    var eyeGeo = new THREE.SphereGeometry(0.028, 6, 5);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    var eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(0.07, 0.03, 0.19);
    var eR = new THREE.Mesh(eyeGeo, eyeMat); eR.position.set(-0.07, 0.03, 0.19);
    head.add(eL); head.add(eR);
    g.add(head);

    if (opts.hat || rng.chance(0.22)) {
      var hat = new THREE.Mesh(hatGeo, new THREE.MeshLambertMaterial({
        color: opts.hatColor || rng.pick(SHIRTS)
      }));
      hat.position.y = 1.8;
      g.add(hat);
    }
    if (opts.bag) {
      var bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.14),
        new THREE.MeshLambertMaterial({ color: opts.bag }));
      bag.position.set(0, 1.1, -0.24);
      g.add(bag);
    }

    g.userData.joints = { legL: legL, legR: legR, armL: armL, armR: armR, head: head, torso: torso };
    g.userData.phase = rng.next() * Math.PI * 2;
    return g;
  }

  function animateWalk(model, dt, speed) {
    var j = model.userData.joints;
    model.userData.phase += dt * (4 + speed * 1.6);
    var p = model.userData.phase;
    var amp = 0.25 + Math.min(speed * 0.09, 0.5);
    j.legL.rotation.x = Math.sin(p) * amp;
    j.legR.rotation.x = Math.sin(p + Math.PI) * amp;
    j.armL.rotation.x = Math.sin(p + Math.PI) * amp * 0.8;
    j.armR.rotation.x = Math.sin(p) * amp * 0.8;
    j.torso.position.y = 1.12 + Math.abs(Math.sin(p)) * 0.03;
  }

  function animateIdle(model, dt, style) {
    var j = model.userData.joints;
    model.userData.phase += dt * 1.4;
    var p = model.userData.phase;
    if (style === 'talk') {
      // one arm gestures while talking
      j.armR.rotation.x = -0.9 + Math.sin(p * 1.7) * 0.35;
      j.armR.rotation.z = 0.3;
      j.armL.rotation.x = -0.15;
      j.head.rotation.y = Math.sin(p * 0.6) * 0.3;
    } else if (style === 'wait') {
      j.armL.rotation.x = -0.1; j.armR.rotation.x = -0.1;
      j.head.rotation.y = Math.sin(p * 0.4) * 0.5; // looking around
    } else if (style === 'wave') {
      j.armR.rotation.z = 2.4 + Math.sin(p * 3) * 0.4;
      j.armR.rotation.x = -0.4;
    } else {
      j.armL.rotation.x = Math.sin(p) * 0.05;
      j.armR.rotation.x = Math.sin(p + 1) * 0.05;
    }
    j.legL.rotation.x = 0; j.legR.rotation.x = 0;
  }

  // ---- pedestrians: walkers on sidewalks, talkers, waiters ----
  function makePedestrians(scene, city, rng, count) {
    var peds = [];
    var sidewalks = [];
    city.ROAD_X.forEach(function (x) {
      sidewalks.push({ axis: 'x', at: x + 9.5 }, { axis: 'x', at: x - 9.5 });
    });
    city.ROAD_Z.forEach(function (z) {
      sidewalks.push({ axis: 'z', at: z + 9.5 }, { axis: 'z', at: z - 9.5 });
    });

    for (var i = 0; i < count; i++) {
      var role = rng.next();
      var model = makePersonModel({ rng: rng });
      var ped = { model: model, role: 'walk', speed: 0, phase: rng.next() * 6 };
      if (role < 0.62) {
        // walker along a sidewalk
        var sw = sidewalks[Math.floor(rng.next() * sidewalks.length)];
        ped.sidewalk = sw;
        ped.along = rng.range(-140, 140);
        ped.dir = rng.pick([-1, 1]);
        ped.speed = rng.range(1.1, 2.0);
        ped.role = 'walk';
      } else if (role < 0.84) {
        // talker: stands in a pair spot; the pair partner is placed beside
        var bx = rng.pick(city.ROAD_X) + rng.pick([-9.5, 9.5]);
        var bz = rng.range(-130, 130);
        ped.x = bx; ped.z = bz;
        ped.heading = rng.next() * Math.PI * 2;
        ped.role = 'talk';
        ped.model.position.set(bx, 0, bz);
        ped.model.rotation.y = ped.heading;
        // partner, facing them
        var partner = makePersonModel({ rng: rng });
        partner.position.set(bx + Math.sin(ped.heading + 0.4) * 1.1, 0, bz + Math.cos(ped.heading + 0.4) * 1.1);
        partner.rotation.y = ped.heading + Math.PI;
        scene.add(partner);
        peds.push({ model: partner, role: 'talk', speed: 0, phase: rng.next() * 6 });
      } else {
        // waiter at a crossing
        var cx = rng.pick(city.ROAD_X) + rng.pick([-9.5, 9.5]);
        var cz = rng.pick(city.ROAD_Z) + rng.pick([-9.5, 9.5]);
        ped.x = cx; ped.z = cz;
        ped.heading = rng.next() * Math.PI * 2;
        ped.role = 'wait';
        ped.model.position.set(cx, 0, cz);
        ped.model.rotation.y = ped.heading;
      }
      scene.add(model);
      peds.push(ped);
    }

    // a few beachgoers on the sand
    for (var b = 0; b < 8; b++) {
      var bm = makePersonModel({ rng: rng });
      var bx3 = rng.range(-205, -165), bz3 = rng.range(-120, 120);
      bm.position.set(bx3, 0, bz3);
      bm.rotation.y = rng.next() * Math.PI * 2;
      scene.add(bm);
      peds.push({
        model: bm, role: rng.chance(0.5) ? 'talk' : 'wait', speed: 0,
        x: bx3, z: bz3, phase: rng.next() * 6
      });
    }

    return {
      peds: peds,
      update: function (dt) {
        for (var i = 0; i < peds.length; i++) {
          var p = peds[i];
          if (p.role === 'walk') {
            p.along += p.dir * p.speed * dt;
            if (p.along > 145) { p.along = 145; p.dir = -1; }
            if (p.along < -145) { p.along = -145; p.dir = 1; }
            var x, z, heading;
            if (p.sidewalk.axis === 'x') {
              x = p.sidewalk.at; z = p.along;
              heading = p.dir > 0 ? 0 : Math.PI;
            } else {
              x = p.along; z = p.sidewalk.at;
              heading = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
            p.model.position.set(x, 0, z);
            p.model.rotation.y = heading;
            animateWalk(p.model, dt, p.speed);
          } else {
            animateIdle(p.model, dt, p.role);
          }
        }
      },
      // scatter: nearby pedestrians flee from a point (panic cue)
      scatter: function (x, z, radius) {
        for (var i = 0; i < peds.length; i++) {
          var p = peds[i];
          var dx = p.model.position.x - x, dz = p.model.position.z - z;
          var d2 = dx * dx + dz * dz;
          if (d2 < radius * radius && p.role !== 'walk') {
            p.role = 'walk';
            p.sidewalk = { axis: 'x', at: p.model.position.x };
            p.along = p.model.position.z;
            p.dir = dz > 0 ? 1 : -1;
            p.speed = 3.4;
          }
        }
      }
    };
  }

  // ---- the player on foot ----
  function makePlayer(rng) {
    var model = makePersonModel({
      rng: rng,
      skin: 0xd9a066, shirt: 0xc22e2e, pants: 0x2a2a30, hair: 0x1a1a1a, hat: false
    });
    // red jacket + white shirt: Dante "Dusk" Reyes
    var jacket = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.4, 0.34),
      new THREE.MeshLambertMaterial({ color: 0x8f1d1d }));
    jacket.position.y = 1.28;
    model.add(jacket);
    return {
      model: model, x: 0, z: 0, heading: 0,
      speed: 0, aiming: false, onFoot: true
    };
  }

  var WALK_SPEED = 5, RUN_SPEED = 9.5;

  function updatePlayerOnFoot(player, input, dt, colliders, camHeading) {
    var mx = 0, mz = 0;
    if (input.forward) mz += 1;
    if (input.back) mz -= 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    var moving = (mx !== 0 || mz !== 0);
    var targetSpeed = 0;
    if (moving) {
      var len = Math.sqrt(mx * mx + mz * mz);
      mx /= len; mz /= len;
      // movement relative to camera heading
      var sin = Math.sin(camHeading), cos = Math.cos(camHeading);
      var wx = mx * cos - mz * sin;
      var wz = mx * sin + mz * cos;
      targetSpeed = input.run ? RUN_SPEED : WALK_SPEED;
      player.heading = Math.atan2(wx, wz);
      var nx = player.x + wx * targetSpeed * dt;
      var nz = player.z + wz * targetSpeed * dt;
      // building collision
      var blocked = false;
      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        if (nx > c.minX - 0.6 && nx < c.maxX + 0.6 && nz > c.minZ - 0.6 && nz < c.maxZ + 0.6) {
          blocked = true; break;
        }
      }
      if (!blocked) {
        player.x = U.clamp(nx, -208, 148);
        player.z = U.clamp(nz, -148, 148);
      }
    }
    player.speed = U.damp(player.speed, targetSpeed, 10, dt);
    player.model.position.set(player.x, 0, player.z);
    player.model.rotation.y = player.heading;
    if (player.speed > 0.4) animateWalk(player.model, dt, player.speed);
    else animateIdle(player.model, dt, player.aiming ? 'talk' : 'idle');
    return moving;
  }

  window.AB.people = {
    makePersonModel: makePersonModel,
    animateWalk: animateWalk,
    animateIdle: animateIdle,
    makePedestrians: makePedestrians,
    makePlayer: makePlayer,
    updatePlayerOnFoot: updatePlayerOnFoot
  };
})();
