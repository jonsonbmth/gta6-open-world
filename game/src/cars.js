// SOLMAR BAY — sculpted cars. No boxes, no wedges: each car is an extruded
// side profile with bevelled edges (curved body panels), a separate tinted
// glass greenhouse, detailed wheels with rims + spokes, and a bright emissive
// taillight bar. Car-local nose is +Z after the profile rotation.
import * as THREE from 'three';
import { glowTexture } from './textures.js';

const glowRed = glowTexture('#ff2a1a');
const glowWhite = glowTexture('#fff6d8');

// Side profiles in shape space: x = longitudinal (front +x), y = up.
function sportBodyProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.2, 0.24);
  s.lineTo(-2.2, 0.72);
  s.quadraticCurveTo(-2.2, 0.86, -1.95, 0.88); // rear haunch
  s.lineTo(1.15, 0.88); // beltline
  s.quadraticCurveTo(1.85, 0.86, 2.1, 0.74); // hood slope
  s.quadraticCurveTo(2.24, 0.62, 2.22, 0.42); // nose
  s.quadraticCurveTo(2.2, 0.28, 2.0, 0.24);
  s.lineTo(-2.0, 0.24);
  s.quadraticCurveTo(-2.2, 0.24, -2.2, 0.24);
  return s;
}

function sedanBodyProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.25, 0.26);
  s.lineTo(-2.25, 0.78);
  s.quadraticCurveTo(-2.25, 0.9, -1.9, 0.92);
  s.lineTo(1.3, 0.92);
  s.quadraticCurveTo(1.95, 0.9, 2.15, 0.78);
  s.quadraticCurveTo(2.28, 0.6, 2.24, 0.4);
  s.lineTo(2.0, 0.26);
  s.lineTo(-2.0, 0.26);
  s.quadraticCurveTo(-2.25, 0.26, -2.25, 0.26);
  return s;
}

function suvBodyProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.2, 0.3);
  s.lineTo(-2.2, 1.0);
  s.quadraticCurveTo(-2.2, 1.12, -1.85, 1.12);
  s.lineTo(1.4, 1.12);
  s.quadraticCurveTo(1.95, 1.1, 2.15, 0.95);
  s.quadraticCurveTo(2.28, 0.75, 2.22, 0.5);
  s.lineTo(2.0, 0.3);
  s.lineTo(-2.0, 0.3);
  s.quadraticCurveTo(-2.2, 0.3, -2.2, 0.3);
  return s;
}

// Greenhouse (glass cabin) profile per body type.
function greenhouseProfile(kind) {
  const s = new THREE.Shape();
  if (kind === 'suv') {
    s.moveTo(-1.5, 1.1);
    s.quadraticCurveTo(-1.25, 1.62, -0.7, 1.64);
    s.lineTo(0.75, 1.64);
    s.quadraticCurveTo(1.25, 1.6, 1.45, 1.1);
    s.lineTo(-1.5, 1.1);
  } else if (kind === 'sedan') {
    s.moveTo(-1.35, 0.9);
    s.quadraticCurveTo(-0.95, 1.38, -0.35, 1.4);
    s.lineTo(0.45, 1.4);
    s.quadraticCurveTo(1.05, 1.36, 1.35, 0.9);
    s.lineTo(-1.35, 0.9);
  } else {
    s.moveTo(-1.15, 0.86);
    s.quadraticCurveTo(-0.8, 1.3, -0.3, 1.32);
    s.lineTo(0.4, 1.32);
    s.quadraticCurveTo(1.0, 1.28, 1.2, 0.86);
    s.lineTo(-1.15, 0.86);
  }
  return s;
}

function extrude(profile, depth, bevelThickness, bevelSize) {
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 10,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function policeDoorTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8ecf2';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#141a28';
  ctx.font = 'bold 34px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POLICE', 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let policeTex = null;

// Build one wheel: tire + rim + spokes. Returns a Group whose +X is the axle.
function buildWheel(radius = 0.34, width = 0.26) {
  const g = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.9 });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 22), tireMat);
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.02, 14), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  // spokes on both faces
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, radius * 0.95, 0.03), rimMat);
      spoke.position.x = side * (width / 2 + 0.005);
      spoke.rotation.x = (i / 5) * Math.PI * 2;
      // rotate spoke around the axle (x) — spokes lie in the YZ plane
      const holder = new THREE.Group();
      holder.rotation.x = (i / 5) * Math.PI * 2;
      spoke.position.set(side * (width / 2 + 0.005), radius * 0.42, 0);
      spoke.rotation.set(0, 0, 0);
      spoke.geometry = new THREE.BoxGeometry(0.03, radius * 0.8, 0.07);
      holder.add(spoke);
      g.add(holder);
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width + 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.8 }));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

function addGlowSprite(parent, texture, color, scale, x, y, z) {
  const mat = new THREE.SpriteMaterial({
    map: texture, color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(scale, scale * 0.6, 1);
  spr.position.set(x, y, z);
  parent.add(spr);
  return spr;
}

// opts: { kind: 'sport'|'sedan'|'suv', color, police: bool, spoiler: bool }
export function buildCar(opts = {}) {
  const kind = opts.kind || 'sport';
  const color = opts.color ?? 0xd81e28;
  const isPolice = !!opts.police;
  const group = new THREE.Group();

  const paint = new THREE.MeshPhysicalMaterial({
    color: isPolice ? 0x1c2230 : color,
    roughness: 0.45,
    metalness: 0.15,
    clearcoat: 0.35,
    clearcoatRoughness: 0.5,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x101c2a, roughness: 0.25, metalness: 0.3, clearcoat: 0.4,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.7, metalness: 0.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.25, metalness: 0.95 });

  const profile = kind === 'sedan' ? sedanBodyProfile() : kind === 'suv' ? suvBodyProfile() : sportBodyProfile();
  const width = kind === 'suv' ? 1.85 : 1.72;
  const body = new THREE.Mesh(extrude(profile, width, 0.12, 0.1), paint);
  body.rotation.y = -Math.PI / 2; // shape +x (nose) -> world +Z
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(extrude(greenhouseProfile(kind), width - 0.28, 0.07, 0.06), glass);
  cabin.rotation.y = -Math.PI / 2;
  cabin.castShadow = true;
  group.add(cabin);

  // Roof panel: ONLY for police (white roof, matte so it never blows out).
  // Other cars show their curved glass greenhouse as the roof — a flat slab
  // on top catches the sun and blows out white.
  const roofY = kind === 'suv' ? 1.62 : kind === 'sedan' ? 1.38 : 1.3;
  if (isPolice) {
    const roofMatte = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.6, metalness: 0.2 });
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(width - 0.45, 0.06, 1.5), roofMatte);
    roofPanel.position.set(0, roofY + 0.05, -0.1);
    group.add(roofPanel);
  }

  // Wheel arches: dark discs behind each wheel so the wheels sit in wells.
  const wheelR = kind === 'suv' ? 0.4 : 0.34;
  const axleZ = kind === 'suv' ? 1.5 : 1.45;
  const archMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c });
  const wheels = [];
  for (const [wz, wx] of [[axleZ, 1], [axleZ, -1], [-axleZ, 1], [-axleZ, -1]]) {
    const arch = new THREE.Mesh(new THREE.CircleGeometry(wheelR + 0.1, 20), archMat);
    arch.position.set(wx * (width / 2 + 0.02), wheelR + 0.02, wz);
    arch.rotation.y = wx > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(arch);
    const wheel = buildWheel(wheelR, 0.26);
    wheel.position.set(wx * (width / 2 - 0.06), wheelR, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  // Taillight bar: BRIGHT full-width emissive strip on the rear face.
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x330000, emissive: 0xff1a08, emissiveIntensity: 3.2, roughness: 0.3,
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(width - 0.35, 0.1, 0.07), tailMat);
  tail.position.set(0, kind === 'suv' ? 0.92 : 0.68, -2.24);
  group.add(tail);
  addGlowSprite(group, glowRed, 0xff3020, 1.4, 0, tail.position.y, -2.35);

  // Headlights: two emissive lenses + glow.
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x222222, emissive: 0xfff2c0, emissiveIntensity: 2.6, roughness: 0.2,
  });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), headMat);
    head.position.set(sx * 0.56, kind === 'suv' ? 0.82 : 0.62, 2.24);
    head.rotation.y = sx * -0.12;
    group.add(head);
    addGlowSprite(group, glowWhite, 0xffeeb0, 1.1, sx * 0.56, head.position.y, 2.34);
  }

  // Grille, bumpers, side skirts, mirrors, exhausts.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.05), trim);
  grille.position.set(0, 0.42, 2.24);
  group.add(grille);
  const skirtMat = trim;
  for (const sx of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 3.1), skirtMat);
    skirt.position.set(sx * (width / 2 + 0.03), 0.2, 0);
    group.add(skirt);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.2), paint);
    mirror.position.set(sx * (width / 2 + 0.1), 0.98, 0.95);
    group.add(mirror);
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), trim);
    stalk.position.set(sx * (width / 2 + 0.04), 0.98, 0.95);
    group.add(stalk);
  }
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), chrome);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx * 0.6, 0.28, -2.26);
    group.add(pipe);
  }
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.11),
    new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.5 }),
  );
  plate.position.set(0, 0.5, -2.26);
  plate.rotation.y = Math.PI;
  group.add(plate);

  // Spoiler (sport + police).
  if (opts.spoiler !== false && kind === 'sport') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.38), paint);
    wing.position.set(0, 1.06, -2.05);
    wing.rotation.x = -0.1;
    wing.castShadow = true;
    group.add(wing);
    for (const sx of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.12), trim);
      strut.position.set(sx * 0.55, 0.95, -2.05);
      group.add(strut);
    }
  }

  let lightBar = null;
  if (isPolice) {
    // White doors.
    const white = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.35, metalness: 0.4 });
    if (!policeTex) policeTex = policeDoorTexture();
    for (const sx of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5),
        new THREE.MeshBasicMaterial({ map: policeTex }));
      door.position.set(sx * (width / 2 + 0.06), 0.62, 0.1);
      door.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(door);
    }
    // Light bar: red left, blue right, emissive + glow sprites.
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.3), trim);
    barBase.position.set(0, roofY + 0.14, -0.15);
    group.add(barBase);
    const redMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff1020, emissiveIntensity: 4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2040ff, emissiveIntensity: 4 });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.26), redMat);
    red.position.set(-0.28, roofY + 0.2, -0.15);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.26), blueMat);
    blue.position.set(0.28, roofY + 0.2, -0.15);
    group.add(blue);
    lightBar = { redMat, blueMat, red, blue };
    addGlowSprite(group, glowRed, 0xff2030, 2.4, -0.28, roofY + 0.25, -0.15);
    addGlowSprite(group, glowTexture('#4080ff'), 0x3050ff, 2.4, 0.28, roofY + 0.25, -0.15);
    // Push bar on the nose.
    const push = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.08), trim);
    push.position.set(0, 0.45, 2.28);
    group.add(push);
  }

  return {
    group, wheels, tailMat, lightBar, kind,
    setBrake(on) { tailMat.emissiveIntensity = on ? 5.5 : 3.2; },
    spinWheels(dist) {
      const a = dist / wheelR;
      for (const w of wheels) w.rotation.x += a;
    },
  };
}

// Place a car in the world: position + heading (0 = facing +Z).
export function placeCar(car, x, z, heading = 0) {
  car.group.position.set(x, 0, z);
  car.group.rotation.y = heading;
  return car;
}
