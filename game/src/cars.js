// SOLMAR BAY — vehicles built from extruded side profiles, never boxes.
// A sports car's silhouette comes from its profile curve: low nose, sloped
// hood, trapezoid glass cabin, fastback deck, wing spoiler, torus fender
// arches. Forward is +Z.
import * as THREE from 'three';
import { makeGlowTexture, makeTextPlateTexture } from './textures.js';

const glowRed = makeGlowTexture('#ff2a2a');
const glowWhite = makeGlowTexture('#fff6d8');
const glowBlue = makeGlowTexture('#3b82ff');

function glowSprite(tex, scale, opacity = 0.85) {
  const m = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}

/** Side profile of a car body. X = length (front at +X), Y = height. */
function bodyProfile(type) {
  const s = new THREE.Shape();
  if (type === 'sport') {
    s.moveTo(2.35, 0.28);            // front bumper, low nose
    s.lineTo(2.28, 0.52);
    s.quadraticCurveTo(1.55, 0.62, 0.95, 0.66);  // sloped hood
    s.quadraticCurveTo(0.45, 0.72, 0.15, 1.02);  // windshield base
    s.lineTo(-0.75, 1.06);                       // roof
    s.quadraticCurveTo(-1.55, 1.04, -2.05, 0.82); // fastback
    s.lineTo(-2.35, 0.78);                       // rear deck
    s.lineTo(-2.38, 0.34);
    s.lineTo(-2.1, 0.26);
    s.lineTo(2.05, 0.26);
    s.closePath();
  } else if (type === 'muscle') {
    s.moveTo(2.45, 0.30);
    s.lineTo(2.38, 0.60);
    s.quadraticCurveTo(1.2, 0.72, 0.55, 0.74);   // long flat hood
    s.quadraticCurveTo(0.2, 0.78, -0.05, 1.08);
    s.lineTo(-0.85, 1.10);
    s.quadraticCurveTo(-1.5, 1.08, -2.1, 0.86);
    s.lineTo(-2.42, 0.84);
    s.lineTo(-2.45, 0.36);
    s.lineTo(2.15, 0.28);
    s.closePath();
  } else if (type === 'van') {
    s.moveTo(2.3, 0.30);
    s.lineTo(2.3, 0.62);
    s.quadraticCurveTo(1.9, 0.72, 1.55, 1.05);
    s.quadraticCurveTo(1.2, 1.62, 0.6, 1.66);    // tall cabin
    s.lineTo(-1.9, 1.66);
    s.quadraticCurveTo(-2.3, 1.64, -2.32, 1.2);
    s.lineTo(-2.32, 0.34);
    s.lineTo(2.0, 0.28);
    s.closePath();
  } else if (type === 'suv') {
    s.moveTo(2.35, 0.34);
    s.lineTo(2.3, 0.72);
    s.quadraticCurveTo(1.6, 0.86, 1.1, 0.92);
    s.quadraticCurveTo(0.7, 1.0, 0.35, 1.5);
    s.lineTo(-1.5, 1.52);
    s.quadraticCurveTo(-2.2, 1.5, -2.32, 1.1);
    s.lineTo(-2.35, 0.38);
    s.lineTo(2.05, 0.32);
    s.closePath();
  } else {
    // sedan / coupe / taxi
    s.moveTo(2.3, 0.28);
    s.lineTo(2.24, 0.56);
    s.quadraticCurveTo(1.4, 0.66, 0.8, 0.70);
    s.quadraticCurveTo(0.35, 0.76, 0.05, 1.02);
    s.lineTo(-0.9, 1.04);
    s.quadraticCurveTo(-1.6, 1.02, -2.05, 0.78);
    s.lineTo(-2.32, 0.76);
    s.lineTo(-2.35, 0.32);
    s.lineTo(2.0, 0.26);
    s.closePath();
  }
  return s;
}

/** Trapezoid glass cabin profile, narrower than the body. */
function cabinProfile(type) {
  const s = new THREE.Shape();
  if (type === 'sport' || type === 'muscle') {
    s.moveTo(0.95, 0.62);
    s.lineTo(0.2, 1.0);
    s.lineTo(-0.7, 1.04);
    s.lineTo(-1.75, 0.78);
    s.lineTo(-1.85, 0.62);
    s.closePath();
  } else if (type === 'van' || type === 'suv') {
    s.moveTo(1.35, 0.85);
    s.lineTo(0.55, 1.48);
    s.lineTo(-1.45, 1.5);
    s.lineTo(-2.05, 1.05);
    s.lineTo(-2.1, 0.85);
    s.closePath();
  } else {
    s.moveTo(0.85, 0.66);
    s.lineTo(0.1, 1.0);
    s.lineTo(-0.85, 1.02);
    s.lineTo(-1.8, 0.74);
    s.lineTo(-1.9, 0.66);
    s.closePath();
  }
  return s;
}

const WIDTHS = { sport: 1.86, muscle: 1.92, van: 1.98, suv: 1.94, sedan: 1.82, coupe: 1.84, taxi: 1.82, police: 1.86 };

function extrudeCentered(shape, depth, material) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true,
    bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.y = -Math.PI / 2; // front (+X) -> +Z
  mesh.castShadow = false;
  return mesh;
}

/**
 * Build a car. opts: { type, color, name, spoiler, police, taxi, headlights }
 * Returns a THREE.Group with userData describing wheels and lights.
 */
export function buildCar(opts = {}) {
  const type = opts.type || 'sedan';
  const width = WIDTHS[type] || 1.86;
  const group = new THREE.Group();
  group.name = opts.name || 'car';

  const paint = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0x888888,
    metalness: 0.75, roughness: 0.28,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: 1,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0a101c, metalness: 0.9, roughness: 0.08,
  });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x0d0f14, metalness: 0.4, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dee8, metalness: 1, roughness: 0.18 });

  // Body + glass cabin, both extruded profiles.
  const body = extrudeCentered(bodyProfile(type), width, paint);
  group.add(body);
  const cabin = extrudeCentered(cabinProfile(type), width * 0.82, glass);
  group.add(cabin);

  // Wheels with torus fender arches.
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.32, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95 });
  const archGeo = new THREE.TorusGeometry(0.44, 0.085, 8, 14, Math.PI);
  const wheelZ = type === 'van' ? 1.45 : 1.35;
  const wheels = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    const hub = new THREE.Mesh(hubGeo, chrome);
    wheel.add(tire, hub);
    wheel.position.set(sx * (width / 2 - 0.06), 0.34, sz * wheelZ);
    group.add(wheel);
    wheels.push(wheel);
    const arch = new THREE.Mesh(archGeo, darkTrim);
    arch.position.set(sx * (width / 2 - 0.02), 0.36, sz * wheelZ);
    arch.rotation.y = Math.PI / 2;
    group.add(arch);
  }

  // Front grille + bumper strip.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.12, 0.06), darkTrim);
  grille.position.set(0, 0.42, 2.36);
  group.add(grille);

  // Full-width taillight bar (the hero's signature) + headlights.
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.86, 0.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }),
  );
  tailBar.position.set(0, 0.62, -2.4);
  group.add(tailBar);
  const tailGlow = glowSprite(glowRed, 2.6, 0.8);
  tailGlow.position.set(0, 0.62, -2.55);
  group.add(tailGlow);

  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.06), headMat);
    head.position.set(sx * width * 0.32, 0.52, 2.38);
    group.add(head);
    const hg = glowSprite(glowWhite, 1.6, 0.7);
    hg.position.set(sx * width * 0.32, 0.52, 2.55);
    group.add(hg);
  }

  // Wing spoiler (sports / muscle).
  if (opts.spoiler) {
    const wingMat = paint;
    for (const sx of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.3), darkTrim);
      strut.position.set(sx * 0.62, 0.9, -2.2);
      group.add(strut);
    }
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.06, 0.42), wingMat);
    wing.position.set(0, 1.04, -2.22);
    wing.rotation.x = -0.1;
    group.add(wing);
    for (const sx of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.4), wingMat);
      plate.position.set(sx * 0.9, 1.0, -2.22);
      group.add(plate);
    }
  }

  // Taxi roof sign.
  if (opts.taxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.2, 0.3),
      new THREE.MeshBasicMaterial({ map: makeTextPlateTexture('TAXI', '#111111', '#ffd60a') }),
    );
    sign.position.set(0, 1.18, -0.2);
    group.add(sign);
  }

  // Police livery + light bar.
  let lightBar = null;
  if (opts.police) {
    const plateTex = makeTextPlateTexture('POLICE', '#0d0f14', '#f2f4f8');
    for (const sx of [-1, 1]) {
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.42),
        new THREE.MeshBasicMaterial({ map: plateTex }),
      );
      door.position.set(sx * (width / 2 + 0.03), 0.52, 0.1);
      door.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(door);
    }
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.3), darkTrim);
    barBase.position.set(0, 1.12, -0.15);
    group.add(barBase);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x2266ff });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.28), redMat);
    red.position.set(-0.28, 1.2, -0.15);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.28), blueMat);
    blue.position.set(0.28, 1.2, -0.15);
    group.add(red, blue);
    const redGlow = glowSprite(glowRed, 3.2, 0.9);
    redGlow.position.set(-0.28, 1.25, -0.15);
    const blueGlow = glowSprite(glowBlue, 3.2, 0.9);
    blueGlow.position.set(0.28, 1.25, -0.15);
    group.add(redGlow, blueGlow);
    lightBar = { redMat, blueMat, redGlow, blueGlow, phase: Math.random() * Math.PI * 2 };
  }

  // Soft blob shadow so cars sit on the wet road.
  const shadowGeo = new THREE.PlaneGeometry(width + 0.3, 5.1);
  const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.userData = {
    type, name: opts.name || 'car', width, length: 4.8,
    wheels, lightBar, tailGlow, bodyMat: paint,
  };
  return group;
}

/** A marina boat: extruded hull profile + cabin + mast + running lights. */
export function buildBoat(rng, opts = {}) {
  const group = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(3.2, 0.0);
  hullShape.quadraticCurveTo(2.6, 0.5, 1.2, 0.62);
  hullShape.lineTo(-2.6, 0.62);
  hullShape.quadraticCurveTo(-3.1, 0.6, -3.2, 0.2);
  hullShape.lineTo(-2.9, -0.25);
  hullShape.lineTo(2.2, -0.25);
  hullShape.quadraticCurveTo(3.0, -0.2, 3.2, 0.0);
  const hullMat = new THREE.MeshStandardMaterial({
    color: opts.color ?? rng.pick([0xe8e8e8, 0x2b6cb0, 0x9b2c2c, 0x276749]),
    metalness: 0.4, roughness: 0.4,
  });
  const hull = extrudeCentered(hullShape, 1.7, hullMat);
  hull.position.y = 0.25;
  group.add(hull);
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ea, metalness: 0.2, roughness: 0.5 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.6), cabinMat);
  cabin.position.set(0, 1.0, -0.4);
  group.add(cabin);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 }),
  );
  mast.position.set(0, 2.2, 0.6);
  group.add(mast);
  const lampGlow = glowSprite(glowWhite, 2.6, 0.85);
  lampGlow.position.set(0, 3.5, 0.6);
  group.add(lampGlow);
  const deckLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffd489 }),
  );
  deckLight.position.set(0, 0.7, 1.4);
  group.add(deckLight);
  return group;
}
