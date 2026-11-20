// SOLMAR BAY — people: pedestrians with simple proportions (capsule body,
// head, arms, legs) who walk the sidewalks, plus the marina crew.

var SB = window.SB || (window.SB = {});

SB.people = (function () {
  // One person, ~1.75 m tall, facing +z. Returns a group with a bob hook.
  function buildPerson(shirtColor, pantsColor) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
    const pants = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 10), shirt);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
    head.position.y = 1.62;
    head.castShadow = true;
    g.add(head);
    // Hair cap.
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 })
    );
    hair.position.y = 1.65;
    g.add(hair);
    // Arms.
    for (const dx of [-0.28, 0.28]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 8), shirt);
      arm.position.set(dx, 1.08, 0);
      g.add(arm);
    }
    // Legs.
    for (const dx of [-0.11, 0.11]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.5, 4, 8), pants);
      leg.position.set(dx, 0.42, 0);
      g.add(leg);
    }
    g.userData.phase = Math.random() * Math.PI * 2;
    return g;
  }

  // Pedestrian state: a person, a sidewalk waypoint loop, a walking speed.
  function spawnPedestrians(scene) {
    const R = SB.random;
    const list = [];
    const streets = SB.config.streets;
    for (let i = 0; i < SB.config.pedestrians; i++) {
      const shirt = R.pick(SB.config.peopleColors);
      const pants = R.pick([0x2a2a33, 0x3a3a44, 0x5a4a3a, 0x2a3a4a]);
      const person = buildPerson(shirt, pants);
      // Pick a sidewalk: along a random street, offset 9.5 m from its centre.
      const along = R.pick(streets);
      const across = R.range(-320, 320);
      const onX = R.next() < 0.5;
      const x = onX ? along + R.pick([-9.5, 9.5]) : across;
      const z = onX ? across : along + R.pick([-9.5, 9.5]);
      person.position.set(x, 0, z);
      person.rotation.y = R.range(0, Math.PI * 2);
      scene.add(person);
      list.push({
        mesh: person,
        speed: R.range(0.9, 1.6),
        dir: R.next() < 0.5 ? 1 : -1,
        axis: onX ? 'z' : 'x',
        fixed: onX ? x : z,
      });
    }
    return list;
  }

  // Walk the pedestrians along their sidewalk; turn around at the ends.
  function updatePedestrians(list, dt, time) {
    for (const p of list) {
      const step = p.speed * p.dir * dt;
      if (p.axis === 'z') {
        p.mesh.position.z += step;
        if (p.mesh.position.z > 320 || p.mesh.position.z < -320) p.dir *= -1;
        p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
      } else {
        p.mesh.position.x += step;
        if (p.mesh.position.x > 320 || p.mesh.position.x < -320) p.dir *= -1;
        p.mesh.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      // Gentle walk bob.
      p.mesh.position.y = Math.abs(Math.sin(time * 6 + p.mesh.userData.phase)) * 0.05;
    }
  }

  return {
    buildPerson: buildPerson,
    spawnPedestrians: spawnPedestrians,
    updatePedestrians: updatePedestrians,
  };
})();
