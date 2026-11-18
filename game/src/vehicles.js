// Vehicles: REAL car silhouettes, not boxes. Every body is an extruded side
// profile (low nose, sloped hood, raked windshield, fastback tail) with
// bevelled edges, plus a glass canopy, fender arches and rounded bumpers.
import * as THREE from 'three';
import { makeGlow, roadStreak, lightPool, extrudeProfile } from './util.js';

// Side profiles: [x = length, front = +x, y = height]. Read as a car outline.
const SPORT_BODY = [[-2.3, 0.36], [-2.3, 0.78], [-1.7, 0.84], [1.3, 0.8], [2.3, 0.6], [2.3, 0.36]];
const SPORT_CANOPY = [[-1.75, 0.78], [-1.05, 1.12], [0.25, 1.14], [1.25, 0.78]];
const SPORT_ROOF = [[-1.05, 1.1], [0.25, 1.12], [0.25, 1.18], [-1.05, 1.16]];
const SEDAN_BODY = [[-2.2, 0.36], [-2.2, 0.86], [-1.3, 0.9], [1.5, 0.88], [2.2, 0.66], [2.2, 0.36]];
const SEDAN_CANOPY = [[-1.45, 0.86], [-0.75, 1.28], [0.5, 1.28], [1.35, 0.86]];
const VAN_BODY = [[-2.2, 0.36], [-2.2, 1.68], [1.15, 1.68], [2.2, 0.95], [2.2, 0.36]];
const VAN_GLASS = [[1.1, 1.62], [2.12, 0.98], [2.12, 1.28], [1.1, 1.68]];
const CAB_BODY = [[-0.95, 0.36], [-0.95, 2.0], [0.3, 2.0], [0.95, 1.15], [0.95, 0.36]];

const WHEEL_GEO = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14);
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.85 });
const HUB_MAT = new THREE.MeshStandardMaterial({ color: 0xd8dce8, roughness: 0.25, metalness: 0.9 });
const ARCH_MAT = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.9 });
const GLASS_MAT = new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.05, metalness: 0.95, envMapIntensity: 2.0 });

// Wheels + fender arches: a half-torus over each wheel reads as a real arch.
function wheels(group, w, l) {
  const archGeo = new THREE.TorusGeometry(0.52, 0.09, 8, 14, Math.PI);
  for (const [x, z] of [[-w / 2, l / 3], [w / 2, l / 3], [-w / 2, -l / 3], [w / 2, -l / 3]]) {
    const wheel = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.36, 10), HUB_MAT);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, 0.42, z);
    group.add(hub);
    const arch = new THREE.Mesh(archGeo, ARCH_MAT);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(x + (x < 0 ? -0.02 : 0.02), 0.42, z);
    group.add(arch);
  }
}

// Rounded bumpers: horizontal cylinders, not slabs.
function bumpers(group, width, length, mat) {
  const geo = new THREE.CylinderGeometry(0.15, 0.15, width - 0.15, 10);
  for (const z of [length / 2 - 0.05, -length / 2 + 0.05]) {
    const b = new THREE.Mesh(geo, mat);
    b.rotation.z = Math.PI / 2;
    b.position.set(0, 0.44, z);
    group.add(b);
  }
}

// Full-width LED taillight bar: emissive + big red glow, the hero's signature.
function tailBar(group, width, y, z) {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.22, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a18, emissiveIntensity: 3.2 }),
  );
  bar.position.set(0, y, z);
  group.add(bar);
  const glow = makeGlow(0xff3020, 5.5, 0.85);
  glow.position.set(0, y, z - 0.4);
  group.add(glow);
}

function headlights(group, width, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff6d8, emissiveIntensity: 5 });
  for (const x of [-width / 2 + 0.35, width / 2 - 0.35]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.1), mat);
    h.position.set(x, y, z);
    group.add(h);
    const g = makeGlow(0xfff2c0, 3.2, 0.8);
    g.position.set(x, y, z + 0.4);
    group.add(g);
  }
}

// Hero: VULPINE S — vivid red, clearcoat, strong rim light, big spoiler.
export function makeHeroCar(paintColor = 0xff2020) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: paintColor, roughness: 0.22, metalness: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.8,
  });
  g.add(extrudeProfile(SPORT_BODY, 2.1, paint, 0.07));
  g.add(extrudeProfile(SPORT_CANOPY, 1.72, GLASS_MAT, 0.04));
  g.add(extrudeProfile(SPORT_ROOF, 1.7, paint, 0.03));
  bumpers(g, 2.1, 4.6, paint);
  // big rear spoiler: thin sloped wing + struts
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.6), paint);
  wing.position.set(0, 1.34, -2.15);
  wing.rotation.x = -0.12;
  g.add(wing);
  const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6);
  for (const x of [-0.85, 0.85]) {
    const s = new THREE.Mesh(strutGeo, paint);
    s.position.set(x, 1.08, -2.15);
    g.add(s);
  }
  // side skirts: slim rounded rails along the sills
  const skirtGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8);
  for (const x of [-1.05, 1.05]) {
    const s = new THREE.Mesh(skirtGeo, ARCH_MAT);
    s.rotation.x = Math.PI / 2;
    s.position.set(x, 0.34, 0);
    g.add(s);
  }
  wheels(g, 2.1, 4.4);
  tailBar(g, 1.9, 0.82, -2.32);
  headlights(g, 2.0, 0.68, 2.62);
  // rim lights: magenta left, cyan right — the car edge GLOWS against the night
  const rimL = new THREE.PointLight(0xff2d95, 26, 14, 1.8);
  rimL.position.set(-3.2, 1.6, -1);
  g.add(rimL);
  const rimR = new THREE.PointLight(0x00e5ff, 26, 14, 1.8);
  rimR.position.set(3.2, 1.6, -1);
  g.add(rimR);
  // headlight beam: visible cone + bright pool ahead
  const beam = new THREE.SpotLight(0xfff2c0, 90, 34, 0.5, 0.5, 1.4);
  beam.position.set(0, 0.9, 2.4);
  beam.target.position.set(0, 0, 18);
  g.add(beam, beam.target);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 14, 12, 1, true), coneMat);
  cone.rotation.x = Math.PI / 2 + 0.06;
  cone.position.set(0, 0.7, 9);
  g.add(cone);
  // red glow pool under the taillights on the wet road
  const pool = lightPool(0xff3020, 4.5, 0.5);
  pool.position.set(0, 0.06, -3.2);
  g.add(pool);
  return g;
}

export function makePoliceCar() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x14141e, roughness: 0.3, metalness: 0.6, envMapIntensity: 1.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.3, metalness: 0.5, envMapIntensity: 1.4 });
  g.add(extrudeProfile(SEDAN_BODY, 2.0, black, 0.07));
  g.add(extrudeProfile(SEDAN_CANOPY, 1.62, GLASS_MAT, 0.04));
  // white doors band: a slim extruded stripe along the flanks
  const band = extrudeProfile([[-1.6, 0.62], [1.6, 0.62], [1.6, 0.9], [-1.6, 0.9]], 2.06, white, 0.02);
  g.add(band);
  bumpers(g, 2.0, 4.4, black);
  wheels(g, 2.0, 4.3);
  tailBar(g, 1.7, 0.8, -2.24);
  headlights(g, 1.9, 0.68, 2.52);
  // light bar: red + blue halves on a rounded base, with big alternating glows
  const barBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8), black);
  barBase.rotation.z = Math.PI / 2;
  barBase.position.set(0, 1.42, -0.2);
  g.add(barBase);
  const redHalf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 5 }));
  redHalf.position.set(-0.38, 1.54, -0.2);
  const blueHalf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2040ff, emissiveIntensity: 5 }));
  blueHalf.position.set(0.38, 1.54, -0.2);
  g.add(redHalf, blueHalf);
  const redGlow = makeGlow(0xff2020, 7, 0.9);
  redGlow.position.set(-0.4, 1.75, -0.2);
  const blueGlow = makeGlow(0x3050ff, 7, 0.9);
  blueGlow.position.set(0.4, 1.75, -0.2);
  g.add(redGlow, blueGlow);
  // ONE point light per cruiser (alternates red/blue) — keeps the light count low
  const barLight = new THREE.PointLight(0xff2020, 30, 18, 1.7);
  barLight.position.set(0, 2.0, -0.2);
  g.add(barLight);
  // coloured pools on the asphalt
  const poolR = lightPool(0xff2020, 6, 0.5);
  poolR.position.set(-1.2, 0.06, 0);
  const poolB = lightPool(0x3050ff, 6, 0.5);
  poolB.position.set(1.2, 0.06, 0);
  g.add(poolR, poolB);
  const streakR = roadStreak(0xff2020, 2.4, 16, 0.5);
  streakR.position.set(-1, 0.05, -6);
  const streakB = roadStreak(0x3050ff, 2.4, 16, 0.5);
  streakB.position.set(1, 0.05, -6);
  g.add(streakR, streakB);
  g.userData.lights = { barLight, redGlow, blueGlow, phase: Math.random() * 10 };
  return g;
}

export function updatePoliceLights(car, t) {
  const L = car.userData.lights;
  if (!L) return;
  const on = Math.sin((t + L.phase) * 9) > 0;
  L.barLight.color.setHex(on ? 0xff2020 : 0x3050ff);
  L.barLight.intensity = 34;
  L.redGlow.material.opacity = on ? 0.95 : 0.25;
  L.blueGlow.material.opacity = on ? 0.25 : 0.95;
}

const TRAFFIC_COLORS = [0x2a6aff, 0xffd23e, 0x9a9ab0, 0x2aa876, 0xc86a2a, 0x8a5cff, 0xe8e8f0];
export function makeTrafficCar(kind, color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6, envMapIntensity: 1.3 });
  if (kind === 'truck') {
    // cargo box with soft bevelled edges + sloped-front cab
    const cargo = extrudeProfile([[-1.6, 0.5], [1.6, 0.5], [1.6, 2.3], [-1.6, 2.3]], 2.2, paint, 0.1);
    cargo.position.z = -1.2;
    g.add(cargo);
    const cab = extrudeProfile(CAB_BODY, 2.1, paint, 0.08);
    cab.position.z = 1.5;
    g.add(cab);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.08), GLASS_MAT);
    shield.position.set(0, 1.58, 2.13);
    shield.rotation.x = -0.65;
    g.add(shield);
    wheels(g, 2.1, 4.6);
    tailBar(g, 1.6, 0.8, -2.85);
    headlights(g, 1.9, 0.7, 2.5);
    return g;
  }
  if (kind === 'van') {
    g.add(extrudeProfile(VAN_BODY, 2.1, paint, 0.08));
    g.add(extrudeProfile(VAN_GLASS, 1.9, GLASS_MAT, 0.02));
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 2.6), GLASS_MAT);
    sideGlass.position.set(1.14, 1.35, -0.4);
    const sideGlass2 = sideGlass.clone();
    sideGlass2.position.x = -1.14;
    g.add(sideGlass, sideGlass2);
    bumpers(g, 2.1, 4.4, paint);
    wheels(g, 2.1, 4.2);
    tailBar(g, 1.6, 0.8, -2.25);
    headlights(g, 1.9, 0.68, 2.55);
    return g;
  }
  g.add(extrudeProfile(SEDAN_BODY, 2.0, paint, 0.07));
  g.add(extrudeProfile(SEDAN_CANOPY, 1.62, GLASS_MAT, 0.04));
  bumpers(g, 2.0, 4.4, paint);
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd23e, emissiveIntensity: 2.5 }));
    sign.position.set(0, 1.42, -0.2);
    g.add(sign);
  }
  wheels(g, 2.0, 4.2);
  tailBar(g, 1.6, 0.8, -2.25);
  headlights(g, 1.9, 0.68, 2.55);
  return g;
}

export function randomTrafficCar(rnd) {
  const kinds = ['sedan', 'sedan', 'taxi', 'van', 'truck'];
  const kind = kinds[Math.floor(rnd() * kinds.length)];
  const color = kind === 'taxi' ? 0xffd23e : TRAFFIC_COLORS[Math.floor(rnd() * TRAFFIC_COLORS.length)];
  return makeTrafficCar(kind, color);
}
