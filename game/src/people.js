// People for AURELIA BAY, built to the CJ references: realistic human
// proportions (head ~1/7 of height), shaped torso with shoulders, arms with
// elbows, shaped legs, natural poses — not blocky mannequins.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const SKIN = [0xc68e5e, 0x8a5a34, 0xe8b88a, 0x6b4423, 0xd9a066];
  const SHIRTS = [0xe74c3c, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1abc9c, 0x34495e, 0xd35400];
  const PANTS = [0x2c3e50, 0x3a5a8c, 0x5d4037, 0x7f8c8d, 0x1a1a1a, 0x6e5a3e];
  const HAIR = [0x1a1a1a, 0x3a2a1a, 0x6b4a2a, 0x8a8a8a, 0x2a1a0a];

  function capsule(r, len, mat) {
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 8), mat);
    cyl.position.y = -len / 2;
    cyl.castShadow = true;
    g.add(cyl);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
    g.add(cap);
    return g;
  }

  // Full articulated person, ~1.8 units tall. opts: skin, shirt, pants, hair,
  // cap (bool), backpack (bool), tank (bool, sleeveless), female (bool).
  function makePerson(opts) {
    const o = opts || {};
    const skinMat = new THREE.MeshLambertMaterial({ color: o.skin !== undefined ? o.skin : U.pick(SKIN) });
    const shirtMat = new THREE.MeshLambertMaterial({ color: o.shirt !== undefined ? o.shirt : U.pick(SHIRTS) });
    const pantsMat = new THREE.MeshLambertMaterial({ color: o.pants !== undefined ? o.pants : U.pick(PANTS) });
    const hairMat = new THREE.MeshLambertMaterial({ color: o.hair !== undefined ? o.hair : U.pick(HAIR) });
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x1f1f22 });

    const person = new THREE.Group();
    const H = 1.8; // total height; head ~0.26 = 1/7

    // Pelvis + tapered torso with shoulders.
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), pantsMat);
    pelvis.scale.set(1.25, 0.75, 0.85);
    pelvis.position.y = 0.98;
    pelvis.castShadow = true;
    person.add(pelvis);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.52, 10), shirtMat);
    torso.scale.z = 0.68;
    torso.position.y = 1.3;
    torso.castShadow = true;
    person.add(torso);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), shirtMat);
    shoulders.scale.set(1.35, 0.55, 0.75);
    shoulders.position.y = 1.56;
    shoulders.castShadow = true;
    person.add(shoulders);

    // Neck + head (r 0.13 => diameter 0.26, ~1/7 of height).
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), skinMat);
    neck.position.y = 1.62;
    person.add(neck);
    const head = new THREE.Group();
    head.position.y = 1.78;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat);
    skull.scale.set(0.92, 1.05, 0.98);
    skull.castShadow = true;
    head.add(skull);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, 1.35), hairMat);
    hair.position.y = 0.02;
    hair.scale.set(0.95, 1.0, 1.0);
    head.add(hair);
    if (o.cap) {
      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.145, 0.07, 10),
        new THREE.MeshLambertMaterial({ color: o.capColor || 0xc0392b }));
      capTop.position.y = 0.1;
      head.add(capTop);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.14),
        new THREE.MeshLambertMaterial({ color: o.capColor || 0xc0392b }));
      brim.position.set(0, 0.08, 0.16);
      head.add(brim);
    }
    person.add(head);

    // Arms: shoulder pivot -> upper arm -> elbow pivot -> forearm -> hand.
    function arm(side) {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.26 * side, 1.54, 0);
      const upper = capsule(0.055, 0.32, o.tank ? skinMat : shirtMat);
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.32;
      shoulder.add(elbow);
      const fore = capsule(0.048, 0.3, skinMat);
      elbow.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skinMat);
      hand.position.y = -0.34;
      hand.scale.set(0.85, 1.15, 0.85);
      elbow.add(hand);
      person.add(shoulder);
      return { shoulder: shoulder, elbow: elbow };
    }
    const armL = arm(-1), armR = arm(1);

    // Legs: hip pivot -> thigh -> knee pivot -> shin -> shoe.
    function leg(side) {
      const hip = new THREE.Group();
      hip.position.set(0.11 * side, 0.96, 0);
      const thigh = capsule(0.075, 0.44, pantsMat);
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.44;
      hip.add(knee);
      const shin = capsule(0.06, 0.4, pantsMat);
      knee.add(shin);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.28), shoeMat);
      shoe.position.set(0, -0.46, 0.05);
      shoe.castShadow = true;
      knee.add(shoe);
      person.add(hip);
      return { hip: hip, knee: knee };
    }
    const legL = leg(-1), legR = leg(1);

    if (o.backpack) {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.16),
        new THREE.MeshLambertMaterial({ color: o.packColor || 0xf1c40f }));
      pack.position.set(0, 1.32, -0.2);
      pack.castShadow = true;
      person.add(pack);
    }

    person.userData = {
      armL: armL, armR: armR, legL: legL, legR: legR, head: head,
      phase: U.rand(0, Math.PI * 2), height: H,
    };
    return person;
  }

  // Walk cycle: legs and arms swing in opposition, hips bob slightly.
  // The bob rides on the person's base ground height (sidewalk, street, sand).
  function walkCycle(person, dt, speed) {
    const u = person.userData;
    u.phase += dt * (4 + speed * 0.55);
    const s = Math.sin(u.phase);
    const amp = 0.5;
    u.legL.hip.rotation.x = s * amp;
    u.legR.hip.rotation.x = -s * amp;
    u.legL.knee.rotation.x = Math.max(0, -s) * 0.7;
    u.legR.knee.rotation.x = Math.max(0, s) * 0.7;
    u.armL.shoulder.rotation.x = -s * 0.42;
    u.armR.shoulder.rotation.x = s * 0.42;
    u.armL.elbow.rotation.x = -0.25;
    u.armR.elbow.rotation.x = -0.25;
    person.position.y = (u.baseY || 0) + Math.abs(Math.cos(u.phase)) * 0.035;
  }

  // Idle: gentle breathing sway + occasional arm gesture.
  function idleCycle(person, dt, t) {
    const u = person.userData;
    u.armL.shoulder.rotation.x = Math.sin(t * 0.8) * 0.05;
    u.armR.shoulder.rotation.x = -Math.sin(t * 0.8) * 0.05 + Math.sin(t * 0.35) * 0.12;
    u.armR.elbow.rotation.x = -0.4 - Math.sin(t * 0.5) * 0.15;
    u.armL.elbow.rotation.x = -0.3;
    u.legL.hip.rotation.x = 0.02; u.legR.hip.rotation.x = -0.02;
    u.head.rotation.y = Math.sin(t * 0.4) * 0.25;
    person.position.y = (u.baseY || 0) + Math.sin(t * 1.4) * 0.008;
  }

  // Dante, the player character: white tank top, blue jeans, dark hair.
  function makeDante() {
    const d = makePerson({ shirt: 0xf5f5f5, pants: 0x3a5a8c, hair: 0x1a1a1a, skin: 0xc68e5e, tank: true });
    return d;
  }

  // Sidewalk walker paths: loops along the main street sidewalks, plus a
  // beach stroll on the sand. Each path carries its ground height.
  const WALK_PATHS = [
    { pts: [[-11, -160], [-11, 160]], loop: false },
    { pts: [[11, 160], [11, -160]], loop: false },
    { pts: [[-74, -9], [160, -9]], loop: false },
    { pts: [[160, 9], [-74, 9]], loop: false },
    { pts: [[-82, -160], [-82, 160]], loop: false },
    { pts: [[-61.5, 160], [-61.5, -160]], loop: false },
    { pts: [[57, -160], [57, 160]], loop: false },
    { pts: [[-100, -160], [-100, 160]], loop: false, y: 0.02 },
  ];

  function makeCrowd(scene) {
    const walkers = [];
    for (let i = 0; i < 110; i++) {
      const path = WALK_PATHS[i % WALK_PATHS.length];
      const p = makePerson({
        cap: U.rng() < 0.25, backpack: U.rng() < 0.2, tank: U.rng() < 0.3,
      });
      const t = U.rand(0, 1);
      const a = path.pts[0], b = path.pts[1];
      p.position.set(U.lerp(a[0], b[0], t) + U.rand(-0.8, 0.8), path.y || 0.18, U.lerp(a[1], b[1], t));
      p.userData.baseY = path.y || 0.18;
      const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
      p.rotation.y = heading;
      p.userData.path = path;
      p.userData.t = t;
      p.userData.speed = U.rand(0.9, 1.7);
      p.userData.walkDir = 1;
      scene.add(p);
      walkers.push(p);
    }
    // Talker pairs standing on the sidewalks, facing each other.
    const talkers = [];
    const spots = [
      [-11, -30], [11, -55], [-11, 45], [11, 95], [-30, 9.5], [25, 9.5],
      [-82, -60], [-82, 30], [-61.5, -90], [11, -110], [-11, 130], [57, 40],
    ];
    spots.forEach(function (s) {
      const a = makePerson({}); a.position.set(s[0], 0.18, s[1]); a.rotation.y = U.rand(0, 6.28);
      a.userData.baseY = 0.18;
      const b = makePerson({}); b.position.set(s[0] + 0.9, 0.18, s[1] + 0.4); b.rotation.y = a.rotation.y + Math.PI;
      b.userData.baseY = 0.18;
      scene.add(a); scene.add(b);
      talkers.push(a); talkers.push(b);
    });
    // Beachgoers: standing + sunbathing on towels.
    const beach = [];
    for (let i = 0; i < 14; i++) {
      const p = makePerson({ tank: true, shirt: U.pick([0xe74c3c, 0x2e86c1, 0xf1c40f, 0x27ae60]) });
      const bx = U.rand(-135, -95), bz = U.rand(-150, 150);
      if (i % 3 === 0) {
        // Sunbather lying on the sand.
        p.rotation.x = -Math.PI / 2 + 0.08;
        p.position.set(bx, 0.3, bz);
        p.rotation.z = U.rand(0, 6.28);
      } else {
        p.position.set(bx, 0.02, bz);
        p.rotation.y = U.rand(0, 6.28);
        p.userData.baseY = 0.02;
      }
      scene.add(p);
      beach.push(p);
    }
    return { walkers: walkers, talkers: talkers, beach: beach };
  }

  function updateCrowd(crowd, dt, t) {
    crowd.walkers.forEach(function (p) {
      const u = p.userData;
      const path = u.path;
      const a = path.pts[0], b = path.pts[1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      u.t += (u.speed * dt / len) * u.walkDir;
      if (u.t >= 1) { u.t = 1; u.walkDir = -1; p.rotation.y += Math.PI; }
      if (u.t <= 0) { u.t = 0; u.walkDir = 1; p.rotation.y += Math.PI; }
      p.position.x = U.lerp(a[0], b[0], u.t);
      p.position.z = U.lerp(a[1], b[1], u.t);
      walkCycle(p, dt, u.speed);
    });
    crowd.talkers.forEach(function (p, i) { idleCycle(p, dt, t + i * 1.7); });
    crowd.beach.forEach(function (p, i) {
      if (Math.abs(p.rotation.x) < 0.1) idleCycle(p, dt, t + i * 2.3);
    });
  }

  AB.People = { makePerson, makeDante, walkCycle, idleCycle, makeCrowd, updateCrowd };
})();
