// People for SOLMAR BAY: jointed figures (capsule torso, sphere head,
// cylinder limbs) with distinct clothing, some carrying umbrellas. Rico wears
// a bright yellow raincoat and red cap so he reads instantly at night.
// Pedestrians stroll the sidewalks; near a pursuit some panic and run.
import * as THREE from 'three';
import { mulberry32, rand, pick } from './util.js';

const SKIN = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0xffdbac, 0x6b4423];
const SHIRTS = [0xd64040, 0x3f6fd6, 0x3fae6a, 0xe0a53f, 0x9b4fd8, 0xe06aa8, 0x40c8d8, 0xd8d8d8];
const PANTS = [0x23232e, 0x2e3a5c, 0x3a2e26, 0x24382a];

function limb(r, len, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 8), mat);
  m.geometry.translate(0, -len / 2, 0); // pivot at the top (shoulder/hip)
  return m;
}

export function makePerson(rng, opts = {}) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pick(rng, SKIN), roughness: 0.7 });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt ?? pick(rng, SHIRTS), roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants ?? pick(rng, PANTS), roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 6, 12), shirt);
  torso.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skin);
  head.position.y = 1.62;
  // Hair cap.
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: pick(rng, [0x1a1a1a, 0x3a2410, 0x6b4a1f, 0x888888]), roughness: 1 }),
  );
  hair.position.y = 1.66;
  group.add(torso, head, hair);

  const armL = limb(0.07, 0.55, shirt);
  armL.position.set(-0.3, 1.32, 0);
  const armR = limb(0.07, 0.55, shirt);
  armR.position.set(0.3, 1.32, 0);
  const legL = limb(0.08, 0.62, pants);
  legL.position.set(-0.12, 0.78, 0);
  const legR = limb(0.08, 0.62, pants);
  legR.position.set(0.12, 0.78, 0);
  group.add(armL, armR, legL, legR);

  if (opts.umbrella || rng() < 0.4) {
    const umb = new THREE.Group();
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: pick(rng, [0xd64040, 0x2e6db4, 0x222222, 0xe0a53f]), roughness: 0.6, side: THREE.DoubleSide }),
    );
    canopy.position.y = 0.75;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.6 }));
    stick.position.y = 0.4;
    umb.add(canopy, stick);
    umb.position.set(0.28, 1.35, 0.1);
    umb.rotation.z = -0.15;
    group.add(umb);
  }

  group.userData = {
    type: 'person',
    armL, armR, legL, legR,
    walkPhase: rng() * 6,
    walkSpeed: rand(rng, 0.8, 1.4),
    panic: false,
    heading: rand(rng, 0, Math.PI * 2),
    speed: rand(rng, 0.9, 1.5),
  };
  return group;
}

export function makeRico() {
  const rng = mulberry32(99);
  const group = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.7 });

  // Raincoat: bright yellow capsule + hood.
  const coat = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.55, 6, 12), yellow);
  coat.position.y = 1.02;
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
    yellow,
  );
  hood.position.y = 1.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skin);
  head.position.y = 1.58;
  // Red cap under the hood brim.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshStandardMaterial({ color: 0xc01825, roughness: 0.7 }),
  );
  cap.position.y = 1.64;
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.03, 14, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xc01825, roughness: 0.7 }),
  );
  brim.position.set(0, 1.62, 0.14);
  brim.rotation.x = 0.15;
  group.add(coat, hood, head, cap, brim);

  const armL = limb(0.07, 0.55, yellow);
  armL.position.set(-0.32, 1.3, 0);
  const armR = limb(0.07, 0.55, yellow);
  armR.position.set(0.32, 1.3, 0);
  const legL = limb(0.08, 0.62, dark);
  legL.position.set(-0.12, 0.76, 0);
  const legR = limb(0.08, 0.62, dark);
  legR.position.set(0.12, 0.76, 0);
  group.add(armL, armR, legL, legR);

  group.userData = { type: 'rico', armL, armR, legL, legR, walkPhase: 0, heading: 0, speed: 0 };
  return group;
}

// Crew members with signature colors: Mama Rosa (purple shawl), Lena (pink
// jacket + cap), Dario (green jacket + beanie).
export function makeCrewMember(name) {
  const rng = mulberry32(name.length * 7919 + 13);
  const styles = {
    'Mama Rosa': { shirt: 0x7a4fa3, pants: 0x2e2a33, umbrella: true },
    'Lena "Wrench" Ortiz': { shirt: 0xe06aa8, pants: 0x23232e, umbrella: false },
    'Dario "Fuze" Kane': { shirt: 0x3fae6a, pants: 0x2e3a5c, umbrella: false },
  };
  const p = makePerson(rng, styles[name] || {});
  p.userData.name = name;
  return p;
}

// Animate limbs: walk swing, or arms-up flailing when panicking.
export function animatePerson(person, dt, t, moving) {
  const u = person.userData;
  if (!u.armL) return;
  if (u.panic) {
    u.armL.rotation.x = 0;
    u.armR.rotation.x = 0;
    u.armL.rotation.z = 2.6 + Math.sin(t * 9) * 0.3;
    u.armR.rotation.z = -2.6 - Math.sin(t * 9) * 0.3;
    const s = Math.sin(t * 11) * 0.7;
    u.legL.rotation.x = s;
    u.legR.rotation.x = -s;
    return;
  }
  u.armL.rotation.z = 0;
  u.armR.rotation.z = 0;
  if (!moving) {
    u.armL.rotation.x *= 0.8;
    u.armR.rotation.x *= 0.8;
    u.legL.rotation.x *= 0.8;
    u.legR.rotation.x *= 0.8;
    return;
  }
  const s = Math.sin(t * 7 * u.walkSpeed + u.walkPhase) * 0.55;
  u.armL.rotation.x = s;
  u.armR.rotation.x = -s;
  u.legL.rotation.x = -s;
  u.legR.rotation.x = s;
}

export function updatePeople(list, dt, t, dangerPos) {
  for (const p of list) {
    const u = p.userData;
    // Panic when danger (a fast car / pursuit) is close.
    if (dangerPos) {
      const d = p.position.distanceTo(dangerPos);
      if (d < 12) u.panic = true;
      else if (d > 30) u.panic = false;
    }
    const speed = u.panic ? u.speed * 2.6 : u.speed;
    p.position.x += Math.sin(u.heading) * speed * dt;
    p.position.z += Math.cos(u.heading) * speed * dt;
    p.rotation.y = u.heading;
    // Keep pedestrians on the sidewalks / quay: bounce off bounds.
    if (p.position.x < -11.5 || p.position.x > 11.5) {
      if (Math.abs(p.position.z) < 110 && p.position.x < 30) u.heading = Math.PI - u.heading;
    }
    if (p.position.z < -110 || p.position.z > 100) u.heading = -u.heading;
    if (p.position.x > 70) u.heading = Math.PI - u.heading;
    animatePerson(p, dt, t, true);
  }
}
