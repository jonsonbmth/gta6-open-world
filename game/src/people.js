// People — realistic human proportions (~7 heads tall), varied clothes,
// walking animation with leg/arm swing. Kept at mid-distance, never close-up.
import * as THREE from 'three';
import { mulberry32 } from './textures.js';

const SKIN = [0xc68e5e, 0x8d5524, 0xe8b98a, 0x6b4423, 0xd9a066];
const SHIRTS = [0x4a90d9, 0xd94a6a, 0x4ad68a, 0xe8c832, 0x8a5ad6, 0xe8e8e8, 0xef6c00, 0x37b8a8];
const PANTS = [0x2a2d34, 0x3a4a6a, 0x5a4632, 0x444444, 0x1e3a2e];

function limb(r, h, mat, x, y) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, h, 8), mat);
  m.position.set(x, y, 0);
  m.castShadow = true;
  return m;
}

export function buildPerson({ shirt = 0x4a90d9, pants = 0x2a2d34, skin = 0xc68e5e, jacket = null, cap = false } = {}) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const jacketMat = jacket ? new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.6 }) : null;
  // Legs (hip pivots at y 0.82 so the walk swing rotates from the hip).
  const legL = new THREE.Group();
  legL.position.set(-0.1, 0.82, 0);
  legL.add(limb(0.06, 0.8, pantsMat, 0, -0.4));
  const legR = new THREE.Group();
  legR.position.set(0.1, 0.82, 0);
  legR.add(limb(0.06, 0.8, pantsMat, 0, -0.4));
  g.add(legL, legR);
  // Shoes.
  for (const s of [-0.1, 0.1]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.24), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
    shoe.position.set(s, 0.035, 0.04);
    g.add(shoe);
  }
  // Torso: slightly tapered cylinder, not a box.
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.56, 10), jacketMat || shirtMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  g.add(torso);
  // Shoulders.
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), jacketMat || shirtMat);
  shoulders.scale.set(1.25, 0.55, 0.9);
  shoulders.position.y = 1.36;
  g.add(shoulders);
  // Arms (shoulder pivots).
  const armL = new THREE.Group();
  armL.position.set(-0.24, 1.34, 0);
  armL.add(limb(0.045, 0.6, jacketMat || shirtMat, 0, -0.3));
  const armR = new THREE.Group();
  armR.position.set(0.24, 1.34, 0);
  armR.add(limb(0.045, 0.6, jacketMat || shirtMat, 0, -0.3));
  g.add(armL, armR);
  // Head + hair.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), skinMat);
  head.position.y = 1.58;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x2a1e12, roughness: 0.95 }),
  );
  hair.position.y = 1.6;
  g.add(hair);
  if (cap) {
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 }));
    capTop.position.y = 1.7;
    g.add(capTop);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 }));
    brim.position.set(0, 1.68, 0.14);
    g.add(brim);
  }
  g.userData.parts = { legL, legR, armL, armR };
  g.userData.walkPhase = Math.random() * Math.PI * 2;
  return g;
}

export function buildRico() {
  return buildPerson({ shirt: 0xf5c518, pants: 0x2a2d34, skin: 0xc68e5e, jacket: 0xf5c518, cap: false });
}

// Walk-cycle update: legs and arms swing in opposition.
export function animateWalk(person, dt, moving) {
  const p = person.userData.parts;
  if (!p) return;
  if (!moving) {
    p.legL.rotation.x *= 0.8;
    p.legR.rotation.x *= 0.8;
    p.armL.rotation.x *= 0.8;
    p.armR.rotation.x *= 0.8;
    return;
  }
  person.userData.walkPhase += dt * 7;
  const s = Math.sin(person.userData.walkPhase) * 0.55;
  p.legL.rotation.x = s;
  p.legR.rotation.x = -s;
  p.armL.rotation.x = -s * 0.7;
  p.armR.rotation.x = s * 0.7;
}

// Sidewalk pedestrians: walk along the avenue sidewalks and side streets,
// wrapping at the ends. Returns the list for the main loop to update.
export function makePedestrians(scene, count = 20) {
  const rnd = mulberry32(99);
  const peds = [];
  const lanes = [
    { x: -9.5, z0: -110, z1: 110, dir: 1 },
    { x: 9.5, z0: -110, z1: 110, dir: -1 },
    { x: -50, z0: -110, z1: 110, dir: -1 },
    { x: 50, z0: -110, z1: 110, dir: 1 },
  ];
  for (let i = 0; i < count; i += 1) {
    const lane = lanes[i % lanes.length];
    const person = buildPerson({
      shirt: SHIRTS[Math.floor(rnd() * SHIRTS.length)],
      pants: PANTS[Math.floor(rnd() * PANTS.length)],
      skin: SKIN[Math.floor(rnd() * SKIN.length)],
      cap: rnd() < 0.25,
    });
    const z = lane.z0 + rnd() * (lane.z1 - lane.z0);
    person.position.set(lane.x + (rnd() - 0.5) * 1.5, 0, z);
    person.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    scene.add(person);
    peds.push({ person, lane, speed: 0.9 + rnd() * 0.9 });
  }
  return peds;
}

export function updatePedestrians(peds, dt) {
  for (const p of peds) {
    p.person.position.z += p.lane.dir * p.speed * dt;
    if (p.person.position.z > p.lane.z1) p.person.position.z = p.lane.z0;
    if (p.person.position.z < p.lane.z0) p.person.position.z = p.lane.z1;
    animateWalk(p.person, dt, true);
  }
}
