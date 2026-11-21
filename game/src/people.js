// People: rounded figures only — sphere heads, capsule limbs, no boxy
// bodies. Every face carries BIG high-contrast features (white eyes with
// black pupils, brows, nose, mouth) so it reads at shot distance. Each
// person has an activity pose: carrying, waving, crouching at an engine,
// talking, walking with a bag, fishing, or panicking.

import { mulberry32, pick } from './util.js';

// Seeded fallback RNG so unspecified colours are deterministic per load.
const fallbackRng = mulberry32(777);

const SKINS = ['#c98d5f', '#8a5a34', '#e8b88a', '#a06a42', '#6e4423', '#d9a06a'];
const SHIRTS = ['#d94f30', '#39a8c0', '#e8b93b', '#7a4fd0', '#e86a8a', '#3fae6a', '#e87a2e', '#4a7fd0'];
const PANTS = ['#2c3a4a', '#3a2c22', '#4a4a55', '#22402e', '#5a3a4a'];
const HAIRS = ['#1c1210', '#2a1a10', '#4a2c14', '#6e4423', '#8a8a8a', '#3a1a0e'];

function limb(r, len, mat) {
  // A capsule pivoted at its top joint: the mesh hangs below the pivot so
  // rotating the group swings the limb naturally.
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  m.position.y = -(len / 2 + r * 0.4);
  m.castShadow = true;
  g.add(m);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(r * 1.15, 8, 8), mat);
  hand.position.y = -(len + r * 1.2);
  g.add(hand);
  return g;
}

function buildFace(head, skin, spec) {
  // Eyes: BIG white spheres with black pupils, set proud of the face.
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.25 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeWhite);
    eye.scale.set(1, 1.15, 0.55);
    eye.position.set(s * 0.085, 0.03, 0.185);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), pupilMat);
    pupil.position.set(s * 0.085, 0.03, 0.225);
    head.add(pupil);
    // Brows: thick dark capsules above each eye.
    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.016, 0.07, 3, 6),
      new THREE.MeshStandardMaterial({ color: spec.hair, roughness: 0.8 }),
    );
    brow.rotation.z = Math.PI / 2 + s * 0.12;
    brow.position.set(s * 0.085, 0.115, 0.195);
    head.add(brow);
  }
  // Nose: a small rounded wedge.
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshStandardMaterial({ color: spec.skinShade, roughness: 0.7 }),
  );
  nose.scale.set(0.8, 1.1, 0.8);
  nose.position.set(0, -0.03, 0.21);
  head.add(nose);
  // Mouth: a dark smile arc (torus segment) — reads as a mouth at distance.
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.014, 6, 14, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x6e2230, roughness: 0.6 }),
  );
  mouth.position.set(0, -0.085, 0.185);
  mouth.rotation.x = 0.15;
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  if (spec.panic) {
    mouth.scale.set(1.3, 1.6, 1);
    mouth.position.y = -0.1;
  }
}

function buildHair(head, spec) {
  const hairMat = new THREE.MeshStandardMaterial({ color: spec.hair, roughness: 0.9 });
  const style = spec.hairStyle || 'short';
  if (style === 'cap') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 10), new THREE.MeshStandardMaterial({ color: spec.capColor || '#1f6fb2', roughness: 0.7 }));
    cap.scale.set(1, 0.62, 1);
    cap.position.y = 0.085;
    head.add(cap);
    const brim = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), cap.material);
    brim.scale.set(1.4, 0.18, 1);
    brim.position.set(0, 0.1, 0.2);
    head.add(brim);
    return;
  }
  if (style === 'beanie') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshStandardMaterial({ color: spec.capColor || '#c23b4e', roughness: 0.95 }));
    b.scale.set(1, 0.7, 1);
    b.position.y = 0.075;
    head.add(b);
    return;
  }
  // Hair cap: a slightly larger sphere, offset up and back.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.232, 12, 10), hairMat);
  cap.scale.set(1, 0.95, 1);
  cap.position.set(0, 0.045, -0.03);
  head.add(cap);
  if (style === 'long') {
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hairMat);
    back.scale.set(0.9, 1.3, 0.55);
    back.position.set(0, -0.08, -0.16);
    head.add(back);
  } else if (style === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), hairMat);
    tail.scale.set(0.8, 1.9, 0.8);
    tail.position.set(0.1, -0.05, -0.22);
    tail.rotation.z = -0.2;
    head.add(tail);
  } else if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), hairMat);
    bun.position.set(0, 0.2, -0.08);
    head.add(bun);
  }
}

export function makePerson(spec) {
  const s = spec || {};
  const skin = s.skin || pick(fallbackRng, SKINS);
  const skinShade = new THREE.Color(skin).multiplyScalar(0.82).getHex();
  const shirt = s.shirt || pick(fallbackRng, SHIRTS);
  const pants = s.pants || pick(fallbackRng, PANTS);
  const hair = s.hair || pick(fallbackRng, HAIRS);
  const g = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1815, roughness: 0.9 });

  // Legs (pivots at the hips).
  const legL = limb(0.09, 0.62, pantsMat);
  legL.position.set(-0.13, 0.86, 0);
  const legR = limb(0.09, 0.62, pantsMat);
  legR.position.set(0.13, 0.86, 0);
  g.add(legL, legR);
  // Shoes.
  for (const leg of [legL, legR]) {
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), shoeMat);
    shoe.scale.set(0.9, 0.55, 1.5);
    shoe.position.set(0, -0.78, 0.05);
    leg.add(shoe);
  }

  // Torso: a capsule, slightly tapered by a second smaller capsule.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 6, 12), shirtMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  g.add(torso);

  // Arms (pivots at the shoulders).
  const armL = limb(0.07, 0.52, s.sleeves === false ? skinMat : shirtMat);
  armL.position.set(-0.32, 1.44, 0);
  const armR = limb(0.07, 0.52, s.sleeves === false ? skinMat : shirtMat);
  armR.position.set(0.32, 1.44, 0);
  g.add(armL, armR);

  // Head group (so the head can tilt/turn independently).
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.66;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), skinMat);
  head.castShadow = true;
  headGroup.add(head);
  buildFace(headGroup, skin, { hair, skinShade, panic: s.activity === 'panic' });
  buildHair(headGroup, { hair, hairStyle: s.hairStyle, capColor: s.capColor });
  g.add(headGroup);

  // Props + pose per activity.
  const activity = s.activity || 'idle';
  let prop = null;
  if (activity === 'carry') {
    armL.rotation.x = -1.15;
    armR.rotation.x = -1.15;
    armL.rotation.z = 0.25;
    armR.rotation.z = -0.25;
    legL.rotation.x = 0.35;
    legR.rotation.x = -0.3;
    prop = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xa8763e, roughness: 0.9 }),
    );
    prop.position.set(0, 1.12, 0.42);
    prop.castShadow = true;
    g.add(prop);
  } else if (activity === 'wave') {
    armR.rotation.z = Math.PI - 0.25; // arm straight up
    armR.rotation.x = -0.15;
    armL.rotation.x = 0.15;
    headGroup.rotation.z = 0.06;
  } else if (activity === 'crouch') {
    legL.rotation.x = -1.5;
    legR.rotation.x = -0.5;
    legL.position.y = 0.62;
    legR.position.y = 0.72;
    torso.position.y = 0.98;
    torso.rotation.x = 0.55;
    armL.position.y = 1.2;
    armR.position.y = 1.2;
    armL.rotation.x = -0.9;
    armR.rotation.x = -0.9;
    headGroup.position.y = 1.42;
    // Head glances UP from the work: with the torso leaning 0.55 forward,
    // a level head would hide the face from a camera above. -0.25 keeps
    // the "working" read while the eyes, nose and mouth stay visible.
    headGroup.rotation.x = -0.25;
    g.position.y = -0.12;
    // The engine block being worked on.
    prop = new THREE.Group();
    const block = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.6 }),
    );
    block.scale.set(1, 0.7, 1.2);
    block.position.y = 0.3;
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.4, metalness: 0.7 }),
    );
    pipe.position.set(0.2, 0.7, 0);
    prop.add(block, pipe);
    prop.position.set(0, 0, 0.85);
    g.add(prop);
  } else if (activity === 'talk') {
    armR.rotation.x = -1.0;
    armR.rotation.z = -0.3;
    armL.rotation.x = 0.2;
    headGroup.rotation.y = s.look || 0;
    headGroup.rotation.x = -0.05;
  } else if (activity === 'walk') {
    legL.rotation.x = 0.55;
    legR.rotation.x = -0.5;
    armL.rotation.x = -0.4;
    armR.rotation.x = 0.35;
    // Bag in the right hand.
    prop = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.85 }),
    );
    prop.scale.set(1, 1.25, 0.55);
    prop.position.set(0.38, 0.78, 0.18);
    prop.castShadow = true;
    g.add(prop);
  } else if (activity === 'fish') {
    armL.rotation.x = -0.9;
    armR.rotation.x = -0.9;
    armL.rotation.z = 0.2;
    armR.rotation.z = -0.2;
    prop = new THREE.Group();
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.035, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 }),
    );
    rod.rotation.x = -1.1;
    rod.position.set(0, 0.6, 0.9);
    prop.add(rod);
    g.add(prop);
  } else if (activity === 'panic') {
    armL.rotation.z = 2.6;
    armR.rotation.z = -2.6;
    legL.rotation.x = 0.7;
    legR.rotation.x = -0.6;
    torso.rotation.x = 0.12;
  } else {
    armL.rotation.x = 0.06;
    armR.rotation.x = -0.06;
  }

  g.userData = {
    head: headGroup, armL, armR, legL, legR, torso,
    activity, name: s.name || 'ped',
  };
  return g;
}

// The six marina crew, each with a distinct look and activity.
export function makeMarinaCrew() {
  return [
    makePerson({ name: 'Mara', activity: 'carry', skin: '#c98d5f', shirt: '#d94f30', hairStyle: 'ponytail', hair: '#1c1210' }),
    makePerson({ name: 'Tomas', activity: 'wave', skin: '#8a5a34', shirt: '#39a8c0', hairStyle: 'cap', capColor: '#e8b93b' }),
    makePerson({ name: 'Rosa', activity: 'crouch', skin: '#e8b88a', shirt: '#e8b93b', hairStyle: 'bun', hair: '#6e4423' }),
    makePerson({ name: 'Dario', activity: 'talk', skin: '#a06a42', shirt: '#f2f0ea', hairStyle: 'short', hair: '#2a1a10', look: 0.5 }),
    makePerson({ name: 'Luz', activity: 'talk', skin: '#c98d5f', shirt: '#7a4fd0', hairStyle: 'long', hair: '#241016', look: -0.5 }),
    makePerson({ name: 'Paco', activity: 'walk', skin: '#6e4423', shirt: '#e87a2e', hairStyle: 'beanie', capColor: '#39a8c0' }),
  ];
}

// Background pedestrians for streets and beach (varied, deterministic).
export function makePedestrians(count, seed) {
  let a = seed >>> 0;
  const rnd = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [];
  const acts = ['walk', 'walk', 'idle', 'walk', 'talk'];
  for (let i = 0; i < count; i++) {
    out.push(makePerson({
      name: 'ped' + i,
      activity: acts[Math.floor(rnd() * acts.length)],
      skin: SKINS[Math.floor(rnd() * SKINS.length)],
      shirt: SHIRTS[Math.floor(rnd() * SHIRTS.length)],
      pants: PANTS[Math.floor(rnd() * PANTS.length)],
      hair: HAIRS[Math.floor(rnd() * HAIRS.length)],
      hairStyle: ['short', 'long', 'ponytail', 'cap', 'beanie'][Math.floor(rnd() * 5)],
    }));
  }
  return out;
}
