// Pedestrians: simple low-poly people on the sidewalks and the beach. Some
// stroll, some PANIC (arms raised, running) when the chase passes. The marina
// crew stand facing the camera so their faces show.

(function () {
  'use strict';
  const U = VB.util;

  function makePerson(shirt, pants, skin, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const legMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
    for (const x of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), legMat);
      leg.position.set(x, 0.4, 0);
      g.add(leg);
    }
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.75, 0.36),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 })
    );
    torso.position.y = 1.18;
    g.add(torso);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 10, 8),
      new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 })
    );
    head.position.y = 1.82;
    g.add(head);
    // Hair cap.
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, 1.25),
      new THREE.MeshStandardMaterial({ color: opts.hair || 0x2a1a10, roughness: 1 })
    );
    hair.position.y = 1.86;
    g.add(hair);
    // Arms: down, or RAISED for panicking peds.
    const armMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), armMat);
    const armR = armL.clone();
    if (opts.panic) {
      armL.position.set(-0.48, 1.62, 0); armL.rotation.z = 2.6;
      armR.position.set(0.48, 1.62, 0); armR.rotation.z = -2.6;
    } else {
      armL.position.set(-0.42, 1.15, 0);
      armR.position.set(0.42, 1.15, 0);
    }
    g.add(armL); g.add(armR);
    // Face: simple eyes so the marina crew read as people facing you.
    if (opts.face) {
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      for (const x of [-0.09, 0.09]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
        eye.position.set(x, 1.86, 0.23);
        g.add(eye);
      }
      const smile = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.03, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x5a2a2a })
      );
      smile.position.set(0, 1.72, 0.24);
      g.add(smile);
    }
    return g;
  }

  const Peds = {
    walkers: [], crew: [], heroPed: null,

    build(scene) {
      const rnd = U.mulberry32(777);
      const shirts = [0xd84a5a, 0x2a9a8a, 0xe8a33d, 0x5a7ad8, 0xf2f2f2, 0x8a5ad8, 0x3aa84a];
      const skins = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0, 0x6a4a2a];
      // Sidewalk strollers along the chase avenue.
      for (let i = 0; i < 14; i++) {
        const side = i % 2 ? -16 : 18;
        const p = makePerson(shirts[i % shirts.length], 0x2a3348, skins[i % skins.length], {});
        p.position.set(side + (rnd() - 0.5) * 3, 0, -120 + i * 18 + rnd() * 8);
        p.rotation.y = (rnd() - 0.5) * 1.2;
        scene.add(p);
        this.walkers.push({ mesh: p, speed: 0.8 + rnd() * 0.9, dir: rnd() < 0.5 ? 1 : -1, phase: rnd() * 6 });
      }
      // Panicking peds near the chase (arms raised).
      const panicSpots = [[-14.5, -8, 1], [-15.5, 22, 0], [16.5, -2, 1], [17.5, 30, 0]];
      for (const [x, z, face] of panicSpots) {
        const p = makePerson(0xd84a5a, 0x2a3348, skins[Math.floor(rnd() * skins.length)], { panic: true, face: !!face });
        p.position.set(x, 0, z);
        p.rotation.y = face ? Math.PI : 0.4;
        scene.add(p);
        this.walkers.push({ mesh: p, speed: 2.2, dir: 1, phase: rnd() * 6, panic: true });
      }
      // Beach crowd.
      for (let i = 0; i < 6; i++) {
        const p = makePerson(shirts[(i + 3) % shirts.length], 0xd8c9a0, skins[i % skins.length], {});
        p.position.set(-90 + i * 34, 0, -176 + rnd() * 8);
        p.rotation.y = rnd() * 6.28;
        scene.add(p);
        this.walkers.push({ mesh: p, speed: 0.5, dir: 1, phase: rnd() * 6 });
      }
    },

    // Marina crew: hero + 3 crew standing in a row FACING the camera.
    buildMarinaCrew(scene) {
      const defs = [
        { shirt: 0x18b7d8, pants: 0x223044, skin: 0xc98a5a, hair: 0x1a1a1a, x: -2.6, label: 'DAZ' },
        { shirt: 0xe8a33d, pants: 0x2a2a2a, skin: 0xe8b88a, hair: 0x6a3a1a, x: -0.9, label: 'SOF' },
        { shirt: 0x3aa84a, pants: 0x333a44, skin: 0x8a5a3a, hair: 0x111111, x: 0.9, label: 'MARSH' },
        { shirt: 0xd84a9a, pants: 0x2a3348, skin: 0xf2c9a0, hair: 0x2a1a10, x: 2.6, label: 'NOVA' },
      ];
      for (const d of defs) {
        const p = makePerson(d.shirt, d.pants, d.skin, { hair: d.hair, face: true });
        p.position.set(d.x, 0, -165);
        p.rotation.y = 0; // facing +Z, toward the marina camera
        scene.add(p);
        this.crew.push(p);
      }
      this.heroPed = this.crew[0];
    },

    update(dt, t) {
      for (const w of this.walkers) {
        if (w.panic) {
          // Run away from the road, arms up.
          w.mesh.position.x += (w.mesh.position.x < 0 ? -1 : 1) * w.speed * dt * 0.6;
          w.mesh.position.z += w.dir * w.speed * dt * 0.5;
          w.mesh.position.y = Math.abs(Math.sin(t * 9 + w.phase)) * 0.12;
          if (Math.abs(w.mesh.position.x) > 26) w.mesh.position.x = w.mesh.position.x < 0 ? -14 : 16;
          continue;
        }
        w.mesh.position.z += w.dir * w.speed * dt;
        w.mesh.position.y = Math.abs(Math.sin(t * 3 + w.phase)) * 0.04;
        if (w.mesh.position.z > 150) w.dir = -1;
        if (w.mesh.position.z < -150) w.dir = 1;
      }
      // Marina crew idle sway + one waving arm (Nova waves at the camera).
      for (let i = 0; i < this.crew.length; i++) {
        this.crew[i].position.y = Math.sin(t * 1.4 + i * 1.3) * 0.03;
        this.crew[i].rotation.y = Math.sin(t * 0.5 + i) * 0.06;
      }
    },
  };

  VB.peds = Peds;
  VB.makePerson = makePerson;
})();
