// SOLMAR BAY — people. Realistic human proportions (about 7 heads tall):
// no capsules, no toy figures. A person is ~1.75 units tall with a proper
// head, tapered torso, arms and legs on pivots, and a walking swing.
// People stay at mid-distance in shots — never in close-up.
import * as THREE from 'three';
import { rng } from './config.js';

const SKIN_TONES = [0xc68a5e, 0xa06a42, 0x8a5a3a, 0xd9a37e, 0x6e4530, 0xb57a52];
const SHIRTS = [0xd84a5a, 0x3a7ad8, 0x3aa876, 0xe8b83a, 0x8a5ad0, 0xe8e4da, 0x2a9ab0, 0xd86a2a];
const PANTS = [0x2a3448, 0x3a3a3a, 0x5a4632, 0x2e4a3a, 0x4a4a5a, 0x6a2a2a];
const HAIR = [0x1a1210, 0x2e1c10, 0x4a2c14, 0x6e6e6e, 0x0e0e10, 0x8a5a20];

// Build one person. opts: { shirt, pants, skin, hair, jacket, height }
export function buildPerson(opts = {}) {
  const rand = rng(opts.seed ?? 5);
  const skin = opts.skin ?? SKIN_TONES[Math.floor(rand() * SKIN_TONES.length)];
  const shirt = opts.shirt ?? SHIRTS[Math.floor(rand() * SHIRTS.length)];
  const pants = opts.pants ?? PANTS[Math.floor(rand() * PANTS.length)];
  const hairC = opts.hair ?? HAIR[Math.floor(rand() * HAIR.length)];
  const H = opts.height ?? 1.75;
  const s = H / 1.75; // scale factor

  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.95 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.6 });

  // Legs: hip pivots at y=0.86, two segments each (thigh + shin + shoe).
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11 * s, 0.88 * s, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * s, 0.062 * s, 0.44 * s, 10), pantsMat);
    thigh.position.y = -0.22 * s;
    thigh.castShadow = true;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44 * s;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.4 * s, 10), pantsMat);
    shin.position.y = -0.2 * s;
    shin.castShadow = true;
    knee.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.07 * s, 0.26 * s), shoeMat);
    shoe.position.set(0, -0.42 * s, 0.05 * s);
    knee.add(shoe);
    hip.add(knee);
    g.add(hip);
    legs.push({ hip, knee });
  }

  // Torso: tapered (shoulders wider than waist), slightly rounded.
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19 * s, 0.15 * s, 0.52 * s, 12), shirtMat);
  torso.position.y = 1.14 * s;
  torso.castShadow = true;
  g.add(torso);
  // Shoulders: a soft horizontal capsule-ish bar across the top of the torso.
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.19 * s, 12, 8), shirtMat);
  shoulders.scale.set(1.15, 0.55, 0.8);
  shoulders.position.y = 1.38 * s;
  g.add(shoulders);
  // Jacket (Rico's yellow): a slightly larger open shell over the torso.
  if (opts.jacket) {
    const jacketMat = new THREE.MeshStandardMaterial({ color: opts.jacket, roughness: 0.55, metalness: 0.05 });
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.21 * s, 0.17 * s, 0.5 * s, 12), jacketMat);
    jacket.position.y = 1.14 * s;
    jacket.castShadow = true;
    g.add(jacket);
  }

  // Arms: shoulder pivots, upper + forearm + hand.
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.23 * s, 1.36 * s, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.045 * s, 0.34 * s, 8),
      opts.jacket ? new THREE.MeshStandardMaterial({ color: opts.jacket, roughness: 0.6 }) : shirtMat);
    upper.position.y = -0.17 * s;
    upper.castShadow = true;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.34 * s;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.042 * s, 0.038 * s, 0.3 * s, 8), skinMat);
    fore.position.y = -0.15 * s;
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), skinMat);
    hand.position.y = -0.33 * s;
    elbow.add(hand);
    shoulder.add(elbow);
    g.add(shoulder);
    arms.push({ shoulder, elbow });
  }

  // Neck + head: sphere with a hair cap and a simple face direction.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.055 * s, 0.1 * s, 8), skinMat);
  neck.position.y = 1.45 * s;
  g.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.6 * s;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 14, 12), skinMat);
  skull.scale.set(0.92, 1.05, 0.98);
  skull.castShadow = true;
  head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.scale.set(0.95, 1.0, 1.0);
  hair.position.y = 0.015 * s;
  head.add(hair);
  // Face: two small dark eyes + a nose bump, on the +Z side.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14100c });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016 * s, 6, 6), eyeMat);
    eye.position.set(side * 0.045 * s, 0.02 * s, 0.11 * s);
    head.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018 * s, 0.05 * s, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01 * s, 0.125 * s);
  head.add(nose);
  g.add(head);

  return {
    group: g, legs, arms, head,
    height: H,
    // Walk cycle: phase advances with distance walked.
    setWalk(phase, speed = 1) {
      const amp = 0.55 * Math.min(1, speed);
      legs[0].hip.rotation.x = Math.sin(phase) * amp;
      legs[1].hip.rotation.x = Math.sin(phase + Math.PI) * amp;
      legs[0].knee.rotation.x = Math.max(0, -Math.sin(phase)) * 0.7;
      legs[1].knee.rotation.x = Math.max(0, -Math.sin(phase + Math.PI)) * 0.7;
      arms[0].shoulder.rotation.x = Math.sin(phase + Math.PI) * amp * 0.7;
      arms[1].shoulder.rotation.x = Math.sin(phase) * amp * 0.7;
      arms[0].elbow.rotation.x = -0.35;
      arms[1].elbow.rotation.x = -0.35;
      g.position.y = Math.abs(Math.sin(phase)) * 0.03 * s;
    },
    setIdle(t) {
      legs[0].hip.rotation.x = 0; legs[1].hip.rotation.x = 0;
      legs[0].knee.rotation.x = 0; legs[1].knee.rotation.x = 0;
      arms[0].shoulder.rotation.x = Math.sin(t * 0.8) * 0.05;
      arms[1].shoulder.rotation.x = -Math.sin(t * 0.8) * 0.05;
      g.position.y = Math.sin(t * 1.4) * 0.008;
    },
  };
}

// Rico — yellow jacket, dark jeans, the player's character.
export function buildRico() {
  return buildPerson({
    seed: 99, jacket: 0xf2c200, shirt: 0x2a2a2e, pants: 0x2a3448,
    skin: 0xc68a5e, hair: 0x1a1210, height: 1.78,
  });
}

// A pedestrian with a seeded look.
export function buildPedestrian(seed) {
  return buildPerson({ seed, height: 1.62 + ((seed * 37) % 20) / 100 });
}
