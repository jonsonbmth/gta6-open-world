// Sculpted cars. Every car is built from a beveled extruded side profile — never
// a plain box — with a separate tinted-glass cabin, detailed wheels, and depth on
// the rear face (bumper, diffuser, exhausts, light bar at different depths).
//
// CAR-LOCAL AXES: the nose is +Z, the tail is -Z. The side profile is drawn with
// the nose at +X and the group is rotated -90° about Y, which maps +X onto +Z.
// Headlights go on the +Z end, the taillight bar and spoiler on the -Z end.
import * as THREE from 'three';
import { paintTexture } from './textures.js';
import { pick } from './random.js';

// Side silhouette of the lower body (x = length, tail -2.3 to nose +2.3; y = height).
function bodyProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.28, 0.32);
  s.quadraticCurveTo(-2.42, 0.55, -2.36, 0.82); // tail, slightly rounded
  s.lineTo(-2.1, 0.98);
  s.quadraticCurveTo(-1.2, 1.04, -0.2, 0.98); // decklid / waist
  s.quadraticCurveTo(1.0, 0.94, 1.75, 0.82); // bonnet slope
  s.quadraticCurveTo(2.3, 0.72, 2.36, 0.48); // nose, rounded down
  s.quadraticCurveTo(2.38, 0.34, 2.2, 0.3);
  s.lineTo(-2.28, 0.32);
  return s;
}

function glasshouseProfile() {
  const s = new THREE.Shape();
  s.moveTo(-1.35, 0.95);
  s.quadraticCurveTo(-1.05, 1.42, -0.45, 1.48); // rear window rake
  s.lineTo(0.35, 1.48);
  s.quadraticCurveTo(0.85, 1.42, 1.15, 0.95); // windscreen rake
  s.lineTo(-1.35, 0.95);
  return s;
}

function extrudeCentered(shape, depth, bevel) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function makeWheel(random, radius = 0.36) {
  const wheel = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.9, metalness: 0.0 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.25, metalness: 0.9 });
  // The wheel axle runs along local Z (the car's width): rotate the cylinder's
  // Y axis onto Z with rotation.x.
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.28, 24), tireMat);
  tire.rotation.x = Math.PI / 2;
  wheel.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.3, 20), rimMat);
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);
  // Five spokes per face, radiating in the XY plane (rotation about the Z axle).
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, radius * 1.05, 0.03), rimMat);
      spoke.position.set(0, 0, side * 0.15);
      spoke.rotation.z = (i / 5) * Math.PI * 2;
      wheel.add(spoke);
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 12), tireMat);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

function glowSprite(texture, color, scaleX, scaleY, opacity = 0.85) {
  const mat = new THREE.SpriteMaterial({
    map: texture, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  return sprite;
}

// The hero: VULPINE S — vivid bright red, full-width taillight bar, sculpted rear.
export function makeHeroCar(random, textures) {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    map: paintTexture(random, '#e8232a'),
    color: 0xffffff, roughness: 0.45, metalness: 0.35,
  });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.7, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x3a4f61, roughness: 0.22, metalness: 0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.2, metalness: 1.0 });

  const body = new THREE.Group();
  const shell = new THREE.Mesh(extrudeCentered(bodyProfile(), 1.66, 0.14), paint);
  shell.castShadow = true;
  shell.receiveShadow = true;
  body.add(shell);
  const cabin = new THREE.Mesh(extrudeCentered(glasshouseProfile(), 1.38, 0.08), glassMat);
  cabin.position.y = 0.02;
  cabin.castShadow = true;
  body.add(cabin);
  // Roof panel in paint, so the cabin reads as a car roof, not a glass box.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.32), paint);
  roof.position.set(-0.1, 1.5, 0);
  roof.castShadow = true;
  body.add(roof);
  // Rear window: a dark glass slab behind the roof line.
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.3), glassMat);
  rearGlass.position.set(-1.18, 1.24, 0);
  rearGlass.rotation.z = -0.5;
  body.add(rearGlass);

  // Wheels + arches (local X is length here; the group is rotated below).
  const wheelPositions = [
    [-1.45, 0.36, 0.82], [-1.45, 0.36, -0.82],
    [1.45, 0.36, 0.82], [1.45, 0.36, -0.82],
  ];
  const wheels = [];
  for (const [wx, wy, wz] of wheelPositions) {
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.3, 20), darkTrim);
    arch.rotation.x = Math.PI / 2;
    arch.position.set(wx, wy, wz);
    body.add(arch);
    const wheel = makeWheel(random);
    wheel.position.set(wx, wy, wz);
    body.add(wheel);
    wheels.push(wheel);
  }

  // Spoiler on struts at the tail (-X local, becomes -Z after rotation).
  const strutGeo = new THREE.BoxGeometry(0.08, 0.22, 0.08);
  for (const side of [-0.6, 0.6]) {
    const strut = new THREE.Mesh(strutGeo, darkTrim);
    strut.position.set(-2.12, 1.08, side);
    body.add(strut);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 1.78), paint);
  wing.position.set(-2.18, 1.22, 0);
  wing.castShadow = true;
  body.add(wing);

  // Sculpted rear: bumper, diffuser with fins, dual exhausts, light bar.
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 1.82), paint);
  rearBumper.position.set(-2.38, 0.52, 0);
  rearBumper.castShadow = true;
  body.add(rearBumper);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 1.5), darkTrim);
  diffuser.position.set(-2.44, 0.3, 0);
  body.add(diffuser);
  for (let i = 0; i < 4; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.04), darkTrim);
    fin.position.set(-2.48, 0.28, -0.55 + i * 0.37);
    body.add(fin);
  }
  const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 12);
  for (const side of [-0.62, 0.62]) {
    const pipe = new THREE.Mesh(exhaustGeo, chromeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(-2.5, 0.34, side);
    body.add(pipe);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), darkTrim);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(-2.66, 0.34, side);
    body.add(tip);
  }
  // FULL-WIDTH taillight bar: one continuous emissive bar across the whole rear.
  const barMat = new THREE.MeshStandardMaterial({
    color: 0x330000, emissive: 0xff2418, emissiveIntensity: 3.2, roughness: 0.4,
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 1.68), barMat);
  bar.position.set(-2.5, 0.86, 0);
  bar.userData.taillightBar = true;
  bar.userData.barWidth = 1.68;
  body.add(bar);
  const barGlow = glowSprite(textures.glow, 0xff3020, 2.4, 0.55, 0.7);
  barGlow.position.set(-2.62, 0.86, 0);
  body.add(barGlow);

  // Headlights at the nose (+X local).
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x222222, emissive: 0xfff2c0, emissiveIntensity: 2.4, roughness: 0.4,
  });
  for (const side of [-0.58, 0.58]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.42), headMat);
    head.position.set(2.4, 0.72, side);
    body.add(head);
    const hg = glowSprite(textures.glow, 0xfff0b0, 0.9, 0.4, 0.55);
    hg.position.set(2.52, 0.72, side);
    body.add(hg);
  }
  // Front bumper + grille.
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 1.8), paint);
  frontBumper.position.set(2.36, 0.48, 0);
  body.add(frontBumper);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.1), darkTrim);
  grille.position.set(2.47, 0.62, 0);
  body.add(grille);
  // Side skirts + mirrors.
  for (const side of [-0.92, 0.92]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.08), darkTrim);
    skirt.position.set(0, 0.3, side);
    body.add(skirt);
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.14), darkTrim);
    stalk.position.set(0.85, 1.05, side * 1.02);
    body.add(stalk);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), paint);
    mirror.position.set(0.85, 1.08, side * 1.12);
    body.add(mirror);
  }

  // Rotate: profile +X (nose) onto +Z. After this, nose = +Z, tail = -Z.
  body.rotation.y = -Math.PI / 2;
  car.add(body);
  car.userData.wheels = wheels;
  car.userData.isHero = true;
  return car;
}

// Police car: same sculpted body, dark blue paint, white roof, red/blue light bar.
export function makePoliceCar(random, textures) {
  const car = makeHeroCar(random, textures);
  // Repaint: find the hero paint material instance (the shell's, which carries
  // the paint texture) and swap every mesh that uses it to police blue. The
  // glass cabin has no map, so it keeps its glass material.
  const body = car.children[0];
  let heroPaint = null;
  body.traverse((node) => {
    if (node.isMesh && node.geometry && node.geometry.type === 'ExtrudeGeometry' && node.material && node.material.map) {
      heroPaint = node.material;
    }
  });
  const policePaint = new THREE.MeshStandardMaterial({
    map: paintTexture(random, '#2a3048'),
    color: 0xffffff, roughness: 0.4, metalness: 0.4,
  });
  if (heroPaint) {
    body.traverse((node) => {
      if (node.isMesh && node.material === heroPaint) node.material = policePaint;
    });
  }
  const whitePaint = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.4, metalness: 0.2 });
  // White roof panel + white doors band.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.07, 1.32), whitePaint);
  roof.position.set(-0.1, 1.52, 0);
  body.add(roof);
  // Light bar on the roof: red left, blue right, both emissive + glow.
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 1.1), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6 }));
  barBase.position.set(-0.1, 1.62, 0);
  body.add(barBase);
  const redMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff1a1a, emissiveIntensity: 3.5 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2255ff, emissiveIntensity: 3.5 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.5), redMat);
  red.position.set(-0.1, 1.7, -0.28);
  body.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.5), blueMat);
  blue.position.set(-0.1, 1.7, 0.28);
  body.add(blue);
  const redGlow = glowSprite(textures.glow, 0xff2222, 1.4, 0.8, 0.8);
  redGlow.position.set(-0.1, 1.75, -0.3);
  body.add(redGlow);
  const blueGlow = glowSprite(textures.glow, 0x3355ff, 1.4, 0.8, 0.8);
  blueGlow.position.set(-0.1, 1.75, 0.3);
  body.add(blueGlow);
  car.userData.isHero = false;
  car.userData.isPolice = true;
  return car;
}

// Traffic: a simpler sculpted body in varied colours and shapes.
const TRAFFIC_COLORS = ['#c8cdd4', '#7a8894', '#3d5a73', '#8a6f3c', '#5d7a4a', '#6e4a5e', '#b8b0a0', '#4a4a52'];
const TRAFFIC_SHAPES = ['sedan', 'hatch', 'coupe'];

export function makeTrafficCar(random, textures) {
  const color = pick(random, TRAFFIC_COLORS);
  const shape = pick(random, TRAFFIC_SHAPES);
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    map: paintTexture(random, color), color: 0xffffff, roughness: 0.5, metalness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.15, metalness: 0.85 });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.7, metalness: 0.3 });
  const body = new THREE.Group();
  const profile = bodyProfile();
  const depth = shape === 'hatch' ? 1.6 : 1.66;
  const shell = new THREE.Mesh(extrudeCentered(profile, depth, 0.1), paint);
  shell.castShadow = true;
  body.add(shell);
  const cabin = new THREE.Mesh(extrudeCentered(glasshouseProfile(), 1.3, 0.06), glassMat);
  body.add(cabin);
  if (shape === 'hatch') {
    const roofBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.4), paint);
    roofBox.position.set(-0.4, 1.2, 0);
    body.add(roofBox);
  }
  for (const [wx, wz] of [[-1.45, 0.82], [-1.45, -0.82], [1.45, 0.82], [1.45, -0.82]]) {
    const wheel = makeWheel(random, 0.34);
    wheel.position.set(wx, 0.34, wz);
    body.add(wheel);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xcc1810, emissiveIntensity: 1.6 });
  for (const side of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), tailMat);
    tail.position.set(-2.42, 0.78, side);
    body.add(tail);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2c0, emissiveIntensity: 1.6 });
  for (const side of [-0.58, 0.58]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.4), headMat);
    head.position.set(2.4, 0.7, side);
    body.add(head);
  }
  body.rotation.y = -Math.PI / 2;
  car.add(body);
  car.userData.isTraffic = true;
  return car;
}
