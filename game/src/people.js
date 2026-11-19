// Human-proportion people: ~7 heads tall, jointed limbs that swing when they
// walk. No capsule toys — a torso, a head with hair, two-segment arms and legs,
// and clothes in distinct colours so each character reads at a glance.
import * as THREE from 'three';
import { pick } from './random.js';

const SKIN_TONES = ['#c68642', '#8d5524', '#e0ac69', '#f1c27d', '#6b4423'];
const SHIRTS = ['#d94a4a', '#4a7ad9', '#4ad97a', '#d9b84a', '#9a4ad9', '#e8e8e8', '#3a3f44', '#e87a4a'];
const PANTS = ['#2e3440', '#3d3d3d', '#4a3a2e', '#26324a', '#5a5a5a'];
const HAIR = ['#1a1a1a', '#3d2b1f', '#6b4a2a', '#8a8a8a', '#2a1a0a'];

function limbSegment(radiusTop, radiusBottom, length, material) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 10);
  geo.translate(0, -length / 2, 0); // pivot at the top (shoulder / hip)
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

// Build one person. Options: skin, shirt, pants, hair colours, coat (raincoat),
// height scale, and a name tag for the crew.
export function makePerson(random, options = {}) {
  const skin = options.skin || pick(random, SKIN_TONES);
  const shirt = options.shirt || pick(random, SHIRTS);
  const pants = options.pants || pick(random, PANTS);
  const hair = options.hair || pick(random, HAIR);
  const scale = options.scale || 1;

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65, metalness: 0 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8, metalness: 0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.85, metalness: 0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9, metalness: 0 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.7, metalness: 0.1 });

  const person = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(scale);
  person.add(inner);

  // Legs: hip pivots at y 0.86, thigh 0.42 + shin 0.42 + shoe.
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.11, 0.86, 0);
  legR.position.set(0.11, 0.86, 0);
  for (const leg of [legL, legR]) {
    const thigh = limbSegment(0.075, 0.062, 0.42, pantsMat);
    leg.add(thigh);
    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    const shin = limbSegment(0.06, 0.05, 0.4, pantsMat);
    knee.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), shoeMat);
    shoe.position.set(0, -0.44, 0.04);
    knee.add(shoe);
    leg.add(knee);
    leg.userData.knee = knee;
    inner.add(leg);
  }
  // Hips + torso: a tapered capsule-ish torso (cylinder + chest box).
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), pantsMat);
  hips.position.y = 0.92;
  hips.castShadow = true;
  inner.add(hips);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.52, 12), shirtMat);
  torso.position.y = 1.24;
  torso.castShadow = true;
  inner.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.2), shirtMat);
  chest.position.y = 1.32;
  chest.castShadow = true;
  inner.add(chest);
  if (options.coat) {
    // Raincoat: a slightly larger shell over the torso + a hood bump.
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.62, 12), new THREE.MeshStandardMaterial({ color: options.coat, roughness: 0.35, metalness: 0.05 }));
    coat.position.y = 1.22;
    coat.castShadow = true;
    inner.add(coat);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: options.coat, roughness: 0.35 }));
    hood.position.y = 1.62;
    hood.rotation.x = -0.5;
    inner.add(hood);
  }
  // Arms: shoulder pivots at y 1.46, upper 0.32 + forearm 0.3 + hand.
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.21, 1.46, 0);
  armR.position.set(0.21, 1.46, 0);
  for (const arm of [armL, armR]) {
    const upper = limbSegment(0.055, 0.048, 0.32, shirtMat);
    arm.add(upper);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.32, 0);
    const fore = limbSegment(0.046, 0.04, 0.28, options.coat ? new THREE.MeshStandardMaterial({ color: options.coat, roughness: 0.35 }) : shirtMat);
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skinMat);
    hand.position.set(0, -0.32, 0);
    elbow.add(hand);
    arm.add(elbow);
    arm.userData.elbow = elbow;
    inner.add(arm);
  }
  // Neck + head + hair cap.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skinMat);
  neck.position.y = 1.56;
  inner.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skinMat);
  head.position.y = 1.7;
  head.castShadow = true;
  inner.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hairCap.position.y = 1.715;
  hairCap.rotation.x = -0.25;
  inner.add(hairCap);
  // Simple face: two dark eyes so the head reads as a person, not a ball.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14100c });
  for (const side of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), eyeMat);
    eye.position.set(side, 1.72, 0.105);
    inner.add(eye);
  }

  person.userData.limbs = { armL, armR, legL, legR };
  person.userData.walkPhase = random() * Math.PI * 2;
  return person;
}

// Swing the limbs for a walk cycle; `speed` 0 = standing still.
export function animateWalk(person, dt, speed) {
  const limbs = person.userData.limbs;
  if (!limbs) return;
  person.userData.walkPhase += dt * (4 + speed * 1.6);
  const phase = person.userData.walkPhase;
  const swing = Math.min(speed, 1) * 0.55;
  limbs.legL.rotation.x = Math.sin(phase) * swing;
  limbs.legR.rotation.x = Math.sin(phase + Math.PI) * swing;
  limbs.armL.rotation.x = Math.sin(phase + Math.PI) * swing * 0.8;
  limbs.armR.rotation.x = Math.sin(phase) * swing * 0.8;
  limbs.legL.userData.knee.rotation.x = Math.max(0, -Math.sin(phase)) * swing * 0.9;
  limbs.legR.userData.knee.rotation.x = Math.max(0, -Math.sin(phase + Math.PI)) * swing * 0.9;
}

// The named crew, with fixed looks so the player recognises them.
export function makeCrew(random) {
  const rico = makePerson(random, { shirt: '#e8c832', pants: '#2e3440', hair: '#1a1a1a', coat: '#e8c832', skin: '#c68642' });
  rico.userData.name = 'Rico Marín';
  const lena = makePerson(random, { shirt: '#d94a8a', pants: '#26324a', hair: '#6b4a2a', skin: '#e0ac69', scale: 0.96 });
  lena.userData.name = 'Lena "Wrench" Ortiz';
  const rosa = makePerson(random, { shirt: '#7a4ad9', pants: '#3d2b4a', hair: '#8a8a8a', skin: '#8d5524', scale: 0.94 });
  rosa.userData.name = 'Mama Rosa';
  const dario = makePerson(random, { shirt: '#3a3f44', pants: '#2e3440', hair: '#1a1a1a', skin: '#6b4423', scale: 1.03 });
  dario.userData.name = 'Dario "Fuze" Kane';
  return { rico, lena, rosa, dario };
}
