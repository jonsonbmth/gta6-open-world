// People: capsule-built humans with correct proportions (head = 1/7 of
// height), geometry faces (eyes, brows, nose, mouth), varied hair styles,
// varied clothing, and natural poses. No boxes, no stick figures.
const THREE = window.THREE;
import { stripeTexture } from './textures.js';

const SKIN_TONES = [0xc68642, 0xe8b88a, 0x8d5524, 0xf1c27d, 0x6b4423];

function std(color, rough = 0.7, metal = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// A face built from small geometry on the front (+Z) of the head sphere.
// Reads clearly at screenshot size and catches the light — never a flat
// painted blob, never a dark silhouette.
function buildFace(head, skinMat, hairColor, style) {
  const dark = std(0x1a1512, 0.4);
  const eyeGeo = new THREE.SphereGeometry(0.017, 10, 8);
  const eyeL = mesh(eyeGeo, dark, -0.046, 0.028, 0.108);
  const eyeR = mesh(eyeGeo, dark, 0.046, 0.028, 0.108);
  head.add(eyeL, eyeR);
  // eye shine
  const shineGeo = new THREE.SphereGeometry(0.006, 6, 6);
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  head.add(mesh(shineGeo, shineMat, -0.041, 0.034, 0.122));
  head.add(mesh(shineGeo, shineMat, 0.051, 0.034, 0.122));
  // eyebrows
  const browGeo = new THREE.BoxGeometry(0.05, 0.009, 0.012);
  const browMat = std(hairColor, 0.8);
  const browL = mesh(browGeo, browMat, -0.046, 0.062, 0.108);
  browL.rotation.z = 0.12;
  const browR = mesh(browGeo, browMat, 0.046, 0.062, 0.108);
  browR.rotation.z = -0.12;
  head.add(browL, browR);
  // nose
  const nose = mesh(new THREE.ConeGeometry(0.013, 0.035, 8), skinMat, 0, -0.005, 0.122);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  // smiling mouth: a torus arc opening upward
  const mouth = mesh(
    new THREE.TorusGeometry(0.03, 0.0075, 8, 16, Math.PI * 0.7),
    std(0x7a3b2e, 0.5),
    0, -0.048, 0.104,
  );
  mouth.rotation.z = Math.PI * 1.15;
  head.add(mouth);
  // ears
  const earGeo = new THREE.SphereGeometry(0.022, 8, 8);
  head.add(mesh(earGeo, skinMat, -0.12, 0, 0));
  head.add(mesh(earGeo, skinMat, 0.12, 0, 0));
  // hair
  const hairMat = std(hairColor, 0.85);
  const cap = mesh(
    new THREE.SphereGeometry(0.136, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat, 0, 0.012, -0.012,
  );
  head.add(cap);
  if (style === 'long') {
    const back = mesh(new THREE.SphereGeometry(0.11, 12, 10), hairMat, 0, -0.1, -0.085);
    back.scale.set(1, 1.5, 0.55);
    head.add(back);
  } else if (style === 'bun') {
    head.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), hairMat, 0, 0.135, -0.03));
  } else if (style === 'cap') {
    const crown = mesh(new THREE.CylinderGeometry(0.125, 0.132, 0.055, 16), std(0x27408b, 0.7), 0, 0.1, 0);
    const brim = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 16), std(0x27408b, 0.7), 0, 0.078, 0.07);
    brim.scale.set(1, 1, 1.4);
    head.add(crown, brim);
  }
}

// Build one person. opts: skin, shirt (color or 'stripes'), pants, hair,
// hairStyle, pose ('relaxed'|'hip'|'crossed'|'wave'|'panic'), shorts (bool).
// Forward is +Z. Total height 1.75, head diameter 0.25 (1/7).
export function buildPerson(opts = {}) {
  const skin = opts.skin ?? SKIN_TONES[0];
  const skinMat = std(skin, 0.6);
  const shirtMat = opts.shirt === 'stripes'
    ? new THREE.MeshStandardMaterial({ map: stripeTexture('#e8e4da', '#2e6da4'), roughness: 0.8 })
    : std(opts.shirt ?? 0x2e8bc0, 0.8);
  const pantsMat = std(opts.pants ?? 0x2b3a55, 0.85);
  const shoeMat = std(0x1c1a18, 0.5);

  const g = new THREE.Group();

  // legs (hip pivots at y 0.92)
  const legGeo = new THREE.CapsuleGeometry(0.075, 0.68, 6, 12);
  const shortGeo = new THREE.CapsuleGeometry(0.078, 0.3, 6, 12);
  const shinGeo = new THREE.CapsuleGeometry(0.062, 0.3, 6, 12);
  const shoeGeo = new THREE.SphereGeometry(0.085, 10, 8);
  [-0.11, 0.11].forEach((x, i) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.92, 0);
    if (opts.shorts) {
      const thigh = mesh(shortGeo, pantsMat, 0, -0.2, 0);
      const shin = mesh(shinGeo, skinMat, 0, -0.6, 0);
      leg.add(thigh, shin);
    } else {
      leg.add(mesh(legGeo, pantsMat, 0, -0.42, 0));
    }
    const shoe = mesh(shoeGeo, shoeMat, 0, -0.86, 0.03);
    shoe.scale.set(1, 0.55, 1.5);
    leg.add(shoe);
    leg.rotation.z = i === 0 ? 0.06 : -0.06;
    leg.rotation.x = i === 0 ? 0.07 : -0.05;
    g.add(leg);
  });

  // torso
  const torso = mesh(new THREE.CapsuleGeometry(0.17, 0.42, 8, 14), shirtMat, 0, 1.18, 0);
  torso.scale.set(1.15, 1, 0.82);
  g.add(torso);
  // belt
  const belt = mesh(new THREE.TorusGeometry(0.175, 0.02, 8, 20), std(0x201812, 0.6), 0, 0.94, 0);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.12, 0.85, 1);
  g.add(belt);

  // arms (shoulder pivots at y 1.38)
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.5, 6, 10);
  const handGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const poses = {
    relaxed: [{ x: 0.08, z: 0.1 }, { x: 0.08, z: -0.1 }],
    hip: [{ x: -0.25, z: 0.75 }, { x: 0.08, z: -0.1 }],
    crossed: [{ x: -0.85, z: 0.45 }, { x: -0.85, z: -0.45 }],
    wave: [{ x: 0.08, z: 0.1 }, { x: 0.2, z: -2.5 }],
    panic: [{ x: 0.15, z: 2.4 }, { x: 0.15, z: -2.4 }],
  };
  const pose = poses[opts.pose || 'relaxed'];
  [-0.23, 0.23].forEach((x, i) => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.38, 0);
    arm.add(mesh(armGeo, shirtMat, 0, -0.3, 0));
    arm.add(mesh(handGeo, skinMat, 0, -0.62, 0));
    arm.rotation.x = pose[i].x;
    arm.rotation.z = pose[i].z;
    g.add(arm);
  });

  // neck + head
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.09, 10), skinMat, 0, 1.47, 0));
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0);
  const skull = mesh(new THREE.SphereGeometry(0.125, 20, 16), skinMat, 0, 0, 0);
  skull.scale.set(0.94, 1.06, 0.98);
  head.add(skull);
  buildFace(head, skinMat, opts.hair ?? 0x2b1a12, opts.hairStyle || 'short');
  head.rotation.y = opts.headYaw || 0;
  head.rotation.z = opts.headTilt || 0;
  g.add(head);

  // subtle stance lean
  g.rotation.x = opts.lean || 0;
  g.userData.head = head;
  return g;
}

export { SKIN_TONES };
