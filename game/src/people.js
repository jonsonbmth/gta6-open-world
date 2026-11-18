// Pedestrians: rounded people, not blocks. Capsule torso, sphere head,
// thin cylinder limbs on hip/shoulder pivots so the walk swing looks right.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const COAT_COLORS = [0xffd23e, 0xff5b8a, 0x00e5ff, 0x3dff7a, 0xff7a3c, 0xc86aff, 0xf2f4f8];
const SKIN_COLORS = [0xf2c89a, 0xc98a5a, 0x8a5a34, 0xffd9b0];

// A limb: cylinder hanging from a pivot group so rotation.x swings it naturally.
function limb(radius, length, mat, px, py, pz = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(px, py, pz);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, length, 8), mat);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  return pivot;
}

function buildPerson(coatMat, skinMat, darkMat, scale = 1) {
  const g = new THREE.Group();
  // capsule torso (raincoat), rounded shoulders built in
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.5, 4, 10), coatMat);
  torso.position.y = 1.14;
  g.add(torso);
  // sphere head + hood dome
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skinMat);
  head.position.y = 1.72;
  g.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), coatMat);
  hood.position.y = 1.74;
  g.add(hood);
  // legs + arms on pivots
  const legL = limb(0.07, 0.78, darkMat, -0.12, 0.8);
  const legR = limb(0.07, 0.78, darkMat, 0.12, 0.8);
  const armL = limb(0.055, 0.62, coatMat, -0.27, 1.36);
  const armR = limb(0.055, 0.62, coatMat, 0.27, 1.36);
  armL.rotation.z = 0.18;
  armR.rotation.z = -0.18;
  g.add(legL, legR, armL, armR);
  // round shoes
  const shoeGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (const leg of [legL, legR]) {
    const shoe = new THREE.Mesh(shoeGeo, darkMat);
    shoe.scale.set(1, 0.6, 1.5);
    shoe.position.set(0, -0.78, 0.04);
    leg.add(shoe);
  }
  g.scale.setScalar(scale);
  g.userData = { legL, legR, armL, armR, phase: 0 };
  return g;
}

export function makePedestrian(seed) {
  const rnd = mulberry32(seed);
  const coat = new THREE.MeshStandardMaterial({ color: COAT_COLORS[Math.floor(rnd() * COAT_COLORS.length)], roughness: 0.35, metalness: 0.1, emissive: 0x222222, emissiveIntensity: 0.4 });
  const skin = new THREE.MeshStandardMaterial({ color: SKIN_COLORS[Math.floor(rnd() * SKIN_COLORS.length)], roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c28, roughness: 0.8 });
  const g = buildPerson(coat, skin, dark, 0.95 + rnd() * 0.12);
  // umbrella for some: cone canopy + thin cylinder stick
  let umbrella = null;
  if (rnd() < 0.45) {
    umbrella = new THREE.Group();
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.35, 10), new THREE.MeshStandardMaterial({ color: COAT_COLORS[Math.floor(rnd() * COAT_COLORS.length)], roughness: 0.4, side: THREE.DoubleSide }));
    canopy.position.y = 0.5;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), dark);
    umbrella.add(canopy, stick);
    umbrella.position.set(0.25, 1.7, 0);
    g.add(umbrella);
  }
  Object.assign(g.userData, { umbrella, phase: rnd() * 10, speed: 1.1 + rnd() * 0.7, panic: false, dir: rnd() < 0.5 ? 1 : -1, lane: rnd() < 0.5 ? -14.5 : 14.5 });
  return g;
}

// Rico on foot: yellow raincoat, always readable.
export function makeRico() {
  const coat = new THREE.MeshStandardMaterial({ color: 0xffd23e, roughness: 0.3, metalness: 0.1, emissive: 0x554400, emissiveIntensity: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5a, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c28, roughness: 0.8 });
  return buildPerson(coat, skin, dark, 1.05);
}

export function animateWalker(g, dt, moving) {
  const u = g.userData;
  if (!moving) {
    u.legL.rotation.x = 0; u.legR.rotation.x = 0;
    u.armL.rotation.x = 0; u.armR.rotation.x = 0;
    return;
  }
  u.phase += dt * (u.panic ? 11 : 6);
  const s = Math.sin(u.phase) * (u.panic ? 0.85 : 0.55);
  u.legL.rotation.x = s;
  u.legR.rotation.x = -s;
  u.armL.rotation.x = -s * 0.7;
  u.armR.rotation.x = s * 0.7;
  if (u.panic) {
    // arms up, panicking
    u.armL.rotation.z = 2.6;
    u.armR.rotation.z = -2.6;
  } else {
    u.armL.rotation.z = 0.18;
    u.armR.rotation.z = -0.18;
  }
}
