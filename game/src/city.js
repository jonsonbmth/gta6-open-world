// The city: streets, buildings with painted facades, curved palms, beach,
// a proper wooden marina dock (planks, posts, lamps, moored boats — not a
// bare disc), traffic and pedestrians.
const THREE = window.THREE;
import { facadeTexture, woodTexture, cloudTexture } from './textures.js';
import { buildCar } from './cars.js';
import { buildPerson, SKIN_TONES } from './people.js';
import { mulberry32, pick, range } from './random.js';
import { GAME } from './config.js';

const SHOPS = [
  ['TACO MARLIN', '#f2b705'], ['BOLT BURGER', '#e4572e'], ['MANGO & RYE', '#17a398'],
  ['CASINO AZUL', '#2e6da4'], ['SURF SHACK', '#f26430'], ['CORAL CAFE', '#c94f7c'],
  ['PIER PIZZA', '#d7263d'], ['NEON NAILS', '#7b2fbf'], ['BAIT & TACKLE', '#3a7d44'],
  ['HOTEL LUNA', '#e8a020'],
];
const WALLS = ['#c96f4a', '#d9a066', '#b8563f', '#8a6d8f', '#5d7a9e', '#c98a5a', '#a85f6e', '#7a8a5a'];

function std(color, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildSky(scene) {
  // gradient sky dome + sun glow + cloud billboards
  const skyGeo = new THREE.SphereGeometry(400, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x6b3f8f) },
      mid: { value: new THREE.Color(0xd96a7a) },
      bottom: { value: new THREE.Color(0xffb27a) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.7, h)) : mix(bottom, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  // sun glow disc low on the horizon
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.9, fog: false }),
  );
  sun.position.set(-180, 42, -260);
  sun.lookAt(0, 10, 0);
  scene.add(sun);
  // clouds
  const ct = cloudTexture();
  const rng = mulberry32(99);
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(range(rng, 60, 110), range(rng, 22, 36)),
      new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: 0.75, depthWrite: false, fog: false }),
    );
    p.position.set(range(rng, -260, 260), range(rng, 55, 110), range(rng, -280, -120));
    scene.add(p);
  }
}

export function buildGround(scene) {
  const ground = mesh(new THREE.PlaneGeometry(320, 320), std(0x9a7a52, 1), 0, -0.02, 0);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  // main street (along X) + cross streets
  const asphalt = std(0x23262c, 0.95);
  const main = mesh(new THREE.PlaneGeometry(280, 14), asphalt, 0, 0, 0);
  main.rotation.x = -Math.PI / 2;
  scene.add(main);
  [-90, -45, 0, 45, 90].forEach((x) => {
    const cross = mesh(new THREE.PlaneGeometry(10, 130), asphalt, x, 0.001, 10);
    cross.rotation.x = -Math.PI / 2;
    scene.add(cross);
  });
  // sidewalks
  const walk = std(0xb8a88a, 1);
  [9.5, -9.5].forEach((z) => {
    const s = mesh(new THREE.PlaneGeometry(280, 5), walk, 0, 0.01, z);
    s.rotation.x = -Math.PI / 2;
    scene.add(s);
  });
  // center dashes
  const dashMat = std(0xf2c230, 0.8);
  for (let x = -135; x < 135; x += 8) {
    scene.add(mesh(new THREE.BoxGeometry(3, 0.02, 0.25), dashMat, x, 0.02, 0));
  }
  // crosswalks at x = 0 and x = 45
  const white = std(0xe8e8e0, 0.8);
  [0, 45].forEach((x) => {
    for (let z = -6; z <= 6; z += 1.6) {
      scene.add(mesh(new THREE.BoxGeometry(2.4, 0.02, 0.8), white, x, 0.02, z));
    }
  });
  // beach + water on the south side (x > 20)
  const sand = mesh(new THREE.PlaneGeometry(120, 22), std(0xe8d3a0, 1), 75, 0.01, -26);
  sand.rotation.x = -Math.PI / 2;
  scene.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 140),
    new THREE.MeshStandardMaterial({ color: 0x1a6a8a, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(40, -0.05, -110);
  scene.add(water);
}

export function buildBuildings(scene, rng) {
  const group = new THREE.Group();
  const spots = [];
  for (let x = -120; x <= 120; x += 24) {
    if (Math.abs(x) < 8) continue;
    spots.push([x + range(rng, -3, 3), 17 + range(rng, 0, 10), 1]);
    if (x < 15) spots.push([x + range(rng, -3, 3), -17 - range(rng, 0, 10), -1]);
  }
  spots.forEach(([x, z, side]) => {
    const w = range(rng, 16, 22), d = range(rng, 12, 16), h = range(rng, 9, 30);
    const [sign, signColor] = pick(rng, SHOPS);
    const wall = pick(rng, WALLS);
    const tex = facadeTexture(wall, sign, signColor, Math.max(2, Math.floor(h / 4)), 0.45, rng);
    const mats = [std(0x8a7a68, 1), std(0x8a7a68, 1), std(0x6b5a48, 1),
      std(0x6b5a48, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })];
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
    // parapet cap
    group.add(mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), std(0x5a4a3a, 1), x, h + 0.25, z));
    // rooftop box (AC unit / water tank) on some
    if (rng() < 0.5) {
      group.add(mesh(new THREE.BoxGeometry(2.5, 1.6, 2.5), std(0x9aa0a6, 0.7), x + w * 0.2, h + 1.2, z));
    }
  });
  scene.add(group);
  return group;
}

export function buildPalm(x, z, rng) {
  const g = new THREE.Group();
  const h = range(rng, 5.5, 8);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(range(rng, -0.8, 0.8), h * 0.55, range(rng, -0.8, 0.8)),
    new THREE.Vector3(range(rng, -1.4, 1.4), h, range(rng, -1.4, 1.4)),
  );
  const trunk = mesh(new THREE.TubeGeometry(curve, 8, 0.16, 7), std(0x7a5230, 0.9), 0, 0, 0);
  g.add(trunk);
  const top = curve.getPoint(1);
  const frondMat = std(0x2e7d32, 0.8);
  for (let i = 0; i < 8; i++) {
    const frond = mesh(new THREE.ConeGeometry(0.32, 3.4, 5), frondMat, top.x, top.y, top.z);
    frond.scale.set(1, 1, 0.18);
    frond.rotation.z = Math.PI / 2 + 0.55;
    frond.rotation.y = (i / 8) * Math.PI * 2;
    frond.translateY(1.4);
    g.add(frond);
  }
  // coconuts
  g.add(mesh(new THREE.SphereGeometry(0.16, 8, 8), std(0x5a3a22, 0.8), top.x + 0.2, top.y - 0.25, top.z));
  g.add(mesh(new THREE.SphereGeometry(0.14, 8, 8), std(0x5a3a22, 0.8), top.x - 0.2, top.y - 0.3, top.z + 0.1));
  g.position.set(x, 0, z);
  return g;
}

export function buildPalms(scene, rng) {
  const group = new THREE.Group();
  for (let x = -120; x <= 120; x += 16) {
    if (Math.abs(x) < 10) continue;
    group.add(buildPalm(x + range(rng, -2, 2), 11.5, rng));
    if (x < 10) group.add(buildPalm(x + range(rng, -2, 2), -11.5, rng));
  }
  // beach palms
  for (let x = 30; x <= 120; x += 18) group.add(buildPalm(x, -22, rng));
  scene.add(group);
  return group;
}

// The marina: a wooden dock of planks on posts, lamps, crates, moored boats.
// The crew stands ON the dock facing the camera — close, lit, human.
export function buildMarina(scene) {
  const group = new THREE.Group();
  const wood = woodTexture();
  wood.repeat.set(3, 6);
  const deckMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 });
  // main deck: 10 wide, 16 long, reaching into the water
  const deck = mesh(new THREE.BoxGeometry(10, 0.35, 16), deckMat, 45, 0.35, -32);
  group.add(deck);
  // edge beams
  const beamMat = std(0x5a3a22, 0.9);
  group.add(mesh(new THREE.BoxGeometry(10.4, 0.22, 0.3), beamMat, 45, 0.42, -24.2));
  group.add(mesh(new THREE.BoxGeometry(10.4, 0.22, 0.3), beamMat, 45, 0.42, -39.8));
  // support posts
  [[40.5, -25], [49.5, -25], [40.5, -39], [49.5, -39]].forEach(([x, z]) => {
    group.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 8), beamMat, x, -0.3, z));
  });
  // lamp posts (warm light pools at dusk)
  [[41, -25.5], [49, -38.5]].forEach(([x, z]) => {
    group.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 8), std(0x222222, 0.5, 0.6), x, 1.8, z));
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffe6a0, emissive: 0xffc860, emissiveIntensity: 1.6, roughness: 0.4,
    });
    group.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), lampMat, x, 3.2, z));
  });
  // crates + barrels
  const crateMat = std(0xa67c3d, 0.9);
  group.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), crateMat, 41.2, 0.95, -30));
  group.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat, 41.3, 1.75, -30.2));
  group.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 12), std(0x3a6ea5, 0.7), 48.8, 0.9, -29));
  // moored boats: curved hulls from extruded profiles
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.2, 0);
  hullShape.quadraticCurveTo(-2.2, 0.9, -1.2, 1.0);
  hullShape.lineTo(1.2, 1.0);
  hullShape.quadraticCurveTo(2.2, 0.9, 2.2, 0);
  hullShape.quadraticCurveTo(0, -0.5, -2.2, 0);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.2, bevelEnabled: false });
  hullGeo.translate(0, 0, -0.6);
  [[36, -34, 0xffffff], [54, -36, 0xd94f30]].forEach(([x, z, color]) => {
    const boat = new THREE.Group();
    const hull = mesh(hullGeo, std(color, 0.5, 0.1), 0, 0.1, 0);
    hull.rotation.y = Math.PI / 2;
    boat.add(hull);
    boat.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), std(0x8a6a3a, 0.8), 0, 1.8, 0));
    boat.position.set(x, 0, z);
    group.add(boat);
  });
  scene.add(group);
  // crew anchor: where the four stand, facing +Z (toward the dock camera)
  return { deck, crewSpots: [[41.5, -31], [44, -31.5], [46.5, -31], [48.5, -31.8]] };
}

export function buildTraffic(scene, rng) {
  const colors = [0x3a6ea5, 0xd9d9d9, 0x2e7d32, 0xe8a020, 0x7b2fbf, 0x8a8a8a];
  const cars = [];
  const spots = [
    [18, -3.2, 0.06], [30, 3.2, Math.PI + 0.04], [-25, -3.2, -0.03],
    [-52, 3.2, Math.PI - 0.05], [62, -3.2, 0.02], [-80, -3.2, 0.0],
  ];
  spots.forEach(([x, z, yaw], i) => {
    const car = buildCar({ color: colors[i % colors.length] });
    car.position.set(x, 0, z);
    car.rotation.y = yaw;
    scene.add(car);
    cars.push(car);
  });
  return cars;
}

export function buildPeds(scene) {
  const peds = [];
  const defs = [
    { x: 6, z: 9.2, skin: SKIN_TONES[1], shirt: 0xe8e4da, pants: 0x3a3a3a, hair: 0x1a1a1a, hairStyle: 'short', pose: 'panic', yaw: -0.6 },
    { x: -4, z: -9.4, skin: SKIN_TONES[3], shirt: 'stripes', pants: 0x2b3a55, hair: 0x6b4423, hairStyle: 'long', pose: 'panic', yaw: 0.8 },
    { x: 14, z: 9.4, skin: SKIN_TONES[2], shirt: 0x2e7d32, pants: 0x8a6a3a, hair: 0x111111, hairStyle: 'cap', pose: 'relaxed', yaw: 2.6 },
    { x: -14, z: 9.2, skin: SKIN_TONES[0], shirt: 0xc94f7c, pants: 0x2b3a55, hair: 0x3b2314, hairStyle: 'bun', pose: 'relaxed', yaw: -2.2 },
    { x: 26, z: -9.4, skin: SKIN_TONES[4], shirt: 0xd97b29, pants: 0x222222, hair: 0x1a1a1a, hairStyle: 'short', pose: 'wave', yaw: 1.2 },
  ];
  defs.forEach((d) => {
    const p = buildPerson(d);
    p.position.set(d.x, 0, d.z);
    p.rotation.y = d.yaw;
    scene.add(p);
    peds.push(p);
  });
  return peds;
}
