// People: pedestrians and crew — simple articulated capsule figures with
// coloured clothes, walking on sidewalks and standing at the marina.
const THREE = window.THREE;

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...opts });
}

export function buildPerson(shirtColor, pantsColor = 0x2a2a30, skinColor = 0xd8a878) {
  const g = new THREE.Group();
  // legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), std(pantsColor));
  legL.position.set(-0.11, 0.28, 0);
  legL.geometry.translate(0, -0.27, 0); // pivot at hip
  legL.position.y = 0.55;
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.11;
  g.add(legR);
  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 4, 10), std(shirtColor));
  torso.position.y = 1.0;
  torso.castShadow = true;
  g.add(torso);
  // arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.11), std(shirtColor));
  armL.geometry.translate(0, -0.25, 0);
  armL.position.set(-0.3, 1.28, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.3;
  g.add(armR);
  // head + hair cap
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), std(skinColor));
  head.position.y = 1.52;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    std(0x2a1a12));
  hair.position.y = 1.55;
  g.add(hair);
  g.userData = { legL, legR, armL, armR, phase: Math.random() * Math.PI * 2, speed: 0 };
  return g;
}

// Walk cycle: swing legs/arms, bob the body.
export function animateWalk(person, dt, speed) {
  const u = person.userData;
  u.phase += dt * speed * 5.5;
  const s = Math.sin(u.phase);
  u.legL.rotation.x = s * 0.55;
  u.legR.rotation.x = -s * 0.55;
  u.armL.rotation.x = -s * 0.4;
  u.armR.rotation.x = s * 0.4;
  person.position.y = Math.abs(Math.cos(u.phase)) * 0.03;
}

// A crew member standing at the marina, facing the camera, with a name.
export function buildCrewMember(shirtColor, name) {
  const p = buildPerson(shirtColor);
  p.userData.name = name;
  return p;
}
