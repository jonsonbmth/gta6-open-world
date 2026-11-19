// Cars for SOLMAR BAY, built from extruded side profiles — never boxes.
// The side silhouette is drawn in the XY plane (nose at +X), extruded across
// the width with a bevel, then rotated so the car's nose points along +Z.
// Headlights/taillights/spoiler go on the CORRECT ends: nose +Z, tail -Z.
//
// The hero VULPINE S is built to READ as a real sports car at a glance: a
// BRIGHT emissive taillight bar across the whole rear, a rear face that is
// never dark, a visible spoiler, and real wheels in arched cutouts. Police
// cars get lightened paint, white roofs, and alternating red/blue light bars
// with matching road pools, so they never read as plain red blobs.
import * as THREE from 'three';
import { pick } from './util.js';
import { makeGlowSprite } from './world.js';

// Side silhouette of a low sports coupe. x: -2.3 (tail) .. +2.3 (nose).
function sportsProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.28);
  s.lineTo(-2.3, 0.78); // tail face
  s.lineTo(-1.7, 0.84); // decklid
  s.lineTo(-1.0, 1.12); // rear glass
  s.lineTo(-0.1, 1.16); // roof
  s.lineTo(0.75, 1.06); // windshield
  s.lineTo(1.55, 0.74); // hood
  s.lineTo(2.3, 0.6); // nose
  s.lineTo(2.3, 0.28); // nose bottom
  s.lineTo(1.5, 0.22);
  s.lineTo(-1.5, 0.22);
  s.lineTo(-2.3, 0.28);
  // Wheel-arch holes.
  for (const wx of [-1.45, 1.45]) {
    const hole = new THREE.Path();
    hole.absarc(wx, 0.42, 0.46, 0, Math.PI * 2, true);
    s.holes.push(hole);
  }
  return s;
}

// Taller sedan silhouette (police + traffic).
function sedanProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.3);
  s.lineTo(-2.3, 0.92);
  s.lineTo(-1.5, 0.98);
  s.lineTo(-0.9, 1.32);
  s.lineTo(0.3, 1.36);
  s.lineTo(1.0, 1.28);
  s.lineTo(1.6, 0.9);
  s.lineTo(2.3, 0.82);
  s.lineTo(2.3, 0.3);
  s.lineTo(1.5, 0.24);
  s.lineTo(-1.5, 0.24);
  s.lineTo(-2.3, 0.3);
  for (const wx of [-1.45, 1.45]) {
    const hole = new THREE.Path();
    hole.absarc(wx, 0.44, 0.46, 0, Math.PI * 2, true);
    s.holes.push(hole);
  }
  return s;
}

function extrudeBody(profile, width, bodyMat) {
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.09,
    bevelSegments: 3,
    steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2); // nose (+X) -> +Z
  const mesh = new THREE.Mesh(geo, bodyMat);
  mesh.castShadow = true;
  return mesh;
}

function makeWheel() {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.3, 18),
    new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.9 }),
  );
  tyre.rotation.z = Math.PI / 2; // axle along X (car width)
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.25, metalness: 0.9 }),
  );
  rim.rotation.z = Math.PI / 2;
  group.add(tyre, rim);
  return group;
}

function glasshouse(profile, width) {
  // Tinted glass cabin sitting on the body, inset from the silhouette.
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width * 0.82,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -width * 0.41);
  geo.rotateY(-Math.PI / 2);
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x0a1626, roughness: 0.08, metalness: 0.9,
  }));
}

function cabinProfile() {
  const s = new THREE.Shape();
  s.moveTo(-1.05, 0.8);
  s.lineTo(-0.75, 1.1);
  s.lineTo(0.0, 1.14);
  s.lineTo(0.7, 1.02);
  s.lineTo(0.95, 0.8);
  s.lineTo(-1.05, 0.8);
  return s;
}

function lightBarStrip(w, h, d, color, intensity) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity }),
  );
}

export function makeHeroCar() {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xc01825, roughness: 0.22, metalness: 0.85 });
  const body = extrudeBody(sportsProfile(), 1.7, paint);
  group.add(body);
  group.add(glasshouse(cabinProfile(), 1.7));

  // Spoiler: thin blade on two struts at the TAIL (-Z).
  const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.7 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4), spoilerMat);
  blade.position.set(0, 1.12, -2.15);
  const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), spoilerMat);
  strutL.position.set(-0.6, 0.95, -2.15);
  const strutR = strutL.clone();
  strutR.position.x = 0.6;
  group.add(blade, strutL, strutR);

  // BRIGHT taillight bar across the whole rear face (-Z) + a lit rear panel
  // so the rear is never a dark slab.
  const rearPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x30060a, emissive: 0x881111, emissiveIntensity: 0.7, roughness: 0.4 }),
  );
  rearPanel.position.set(0, 0.55, -2.32);
  group.add(rearPanel);
  const tailBar = lightBarStrip(1.62, 0.13, 0.08, 0xff2222, 5);
  tailBar.position.set(0, 0.72, -2.36);
  group.add(tailBar);
  const tailGlow = makeGlowSprite(0xff2a2a, 2.6, 0.65);
  tailGlow.position.set(0, 0.72, -2.6);
  group.add(tailGlow);

  // Headlights at the NOSE (+Z).
  for (const sx of [-0.6, 0.6]) {
    const hl = lightBarStrip(0.5, 0.12, 0.08, 0xfff6d8, 4);
    hl.position.set(sx, 0.6, 2.36);
    group.add(hl);
    const hg = makeGlowSprite(0xfff2c0, 1.6, 0.5);
    hg.position.set(sx, 0.6, 2.55);
    group.add(hg);
  }

  // Wheels in the arches.
  for (const [wx, wz] of [[-0.88, 1.45], [0.88, 1.45], [-0.88, -1.45], [0.88, -1.45]]) {
    const wheel = makeWheel();
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }

  group.userData = { type: 'hero', name: 'VULPINE S', speed: 0, heading: 0, tailBar };
  return group;
}

export function makePoliceCar() {
  const group = new THREE.Group();
  // Lightened paint (V7 fix) so the car reads at night.
  const paint = new THREE.MeshStandardMaterial({ color: 0x39415f, roughness: 0.3, metalness: 0.7 });
  const body = extrudeBody(sedanProfile(), 1.75, paint);
  group.add(body);
  group.add(glasshouse(cabinProfile(), 1.75));

  // White roof panel.
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.06, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.4, metalness: 0.2 }),
  );
  roof.position.set(0, 1.38, -0.1);
  group.add(roof);

  // Light bar: red left, blue right, high emissive + glow sprites.
  const redBar = lightBarStrip(0.55, 0.14, 0.3, 0xff1a1a, 5);
  redBar.position.set(-0.35, 1.52, -0.1);
  const blueBar = lightBarStrip(0.55, 0.14, 0.3, 0x2255ff, 5);
  blueBar.position.set(0.35, 1.52, -0.1);
  group.add(redBar, blueBar);
  const redGlow = makeGlowSprite(0xff2222, 2.4, 0.9);
  redGlow.position.set(-0.35, 1.6, -0.1);
  const blueGlow = makeGlowSprite(0x3355ff, 2.4, 0.9);
  blueGlow.position.set(0.35, 1.6, -0.1);
  group.add(redGlow, blueGlow);
  // Red/blue pools on the road under the car.
  const redPool = makeGlowSprite(0xff2222, 5, 0.28);
  redPool.position.set(-0.9, 0.15, 0);
  const bluePool = makeGlowSprite(0x3355ff, 5, 0.28);
  bluePool.position.set(0.9, 0.15, 0);
  group.add(redPool, bluePool);

  // Headlights + taillights.
  for (const sx of [-0.6, 0.6]) {
    const hl = lightBarStrip(0.5, 0.12, 0.08, 0xfff6d8, 3.5);
    hl.position.set(sx, 0.62, 2.36);
    group.add(hl);
    const tl = lightBarStrip(0.5, 0.12, 0.08, 0xff2222, 3);
    tl.position.set(sx, 0.7, -2.36);
    group.add(tl);
  }
  for (const [wx, wz] of [[-0.9, 1.45], [0.9, 1.45], [-0.9, -1.45], [0.9, -1.45]]) {
    const wheel = makeWheel();
    wheel.position.set(wx, 0.44, wz);
    group.add(wheel);
  }

  group.userData = {
    type: 'police', name: 'UNIT', speed: 0, heading: 0,
    redGlow, blueGlow, redPool, bluePool, redBar, blueBar, phase: Math.random() * 6,
  };
  return group;
}

const TRAFFIC_COLORS = [0x2e6db4, 0xd8d8de, 0x3a3f4a, 0x8a6d2f, 0x274d33, 0x6b2d5e, 0xb4502a, 0x1f4e5f];

export function makeTrafficCar(rng) {
  const group = new THREE.Group();
  const color = pick(rng, TRAFFIC_COLORS);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.7 });
  const body = extrudeBody(sedanProfile(), 1.7, paint);
  group.add(body);
  group.add(glasshouse(cabinProfile(), 1.7));
  for (const sx of [-0.6, 0.6]) {
    const hl = lightBarStrip(0.45, 0.11, 0.07, 0xfff2c8, 3);
    hl.position.set(sx, 0.62, 2.36);
    group.add(hl);
    const tl = lightBarStrip(0.45, 0.11, 0.07, 0xff3030, 2.5);
    tl.position.set(sx, 0.7, -2.36);
    group.add(tl);
  }
  for (const [wx, wz] of [[-0.88, 1.45], [0.88, 1.45], [-0.88, -1.45], [0.88, -1.45]]) {
    const wheel = makeWheel();
    wheel.position.set(wx, 0.44, wz);
    group.add(wheel);
  }
  group.userData = { type: 'traffic', speed: 0, heading: 0, color };
  return group;
}

// Place a car group at its position (V7 fix: never leave a car at origin).
export function placeCar(group, x, z, heading) {
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  group.userData.heading = heading;
  return group;
}
