// Cars: a sculpted glossy hero car, traffic cars and police cars.
// The hero car is built from an extruded side profile — low nose, trapezoid
// cabin, fastback tail — so it reads as a sports car, not a box.
import { glowTexture } from './textures.js';

const THREE = window.THREE;

function glossy(color, clearcoat = 1.0) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.55, roughness: 0.28, clearcoat, clearcoatRoughness: 0.12,
  });
}
function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, ...opts });
}

// Side profile of a sports car (x = length axis, y = height), extruded across
// the car's width with a small bevel — gives a sculpted, non-boxy silhouette.
function extrudedBody(shape, width, material) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

function heroProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.18); // front bumper bottom
  s.lineTo(-2.32, 0.52); // nose
  s.lineTo(-1.9, 0.66); // hood front
  s.lineTo(-0.7, 0.78); // hood
  s.lineTo(0.1, 1.06); // windshield base -> roof front
  s.lineTo(0.9, 1.08); // roof
  s.lineTo(1.5, 0.82); // fastback rear glass
  s.lineTo(2.28, 0.78); // tail top
  s.lineTo(2.32, 0.3); // tail
  s.lineTo(2.28, 0.18); // rear bumper bottom
  s.lineTo(-2.3, 0.18);
  return s;
}

function cabinProfile() {
  const s = new THREE.Shape();
  s.moveTo(-0.75, 0.72);
  s.lineTo(0.05, 1.04);
  s.lineTo(0.85, 1.05);
  s.lineTo(1.35, 0.8);
  s.lineTo(1.2, 0.72);
  s.lineTo(-0.75, 0.72);
  return s;
}

function makeWheel() {
  // Axle along Z (the car's sides): cylinder axis Y rotated about X by 90°.
  // Spinning the wheel group about its local Z turns the spokes around the axle.
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18),
    std('#141414', { roughness: 0.95 }));
  tire.rotation.x = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12),
    std('#c8c8cc', { metalness: 0.8, roughness: 0.3 }));
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  // 5 spokes in the XY plane (perpendicular to the axle)
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.29), std('#8a8a90', { metalness: 0.7, roughness: 0.35 }));
    const a = (i / 5) * Math.PI * 2;
    spoke.rotation.z = a;
    g.add(spoke);
  }
  return g;
}

export function buildHeroCar() {
  const car = new THREE.Group();
  const paint = glossy(0xd81e26);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x11141c, metalness: 0.9, roughness: 0.12, clearcoat: 1,
  });
  const darkTrim = std('#101014', { roughness: 0.5, metalness: 0.4 });

  const body = extrudedBody(heroProfile(), 1.78, paint);
  body.position.y = 0.12;
  car.add(body);

  const cabin = extrudedBody(cabinProfile(), 1.5, glassMat);
  cabin.position.y = 0.12;
  car.add(cabin);

  // side skirts
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.08), darkTrim);
    skirt.position.set(0, 0.22, side * 0.92);
    car.add(skirt);
  }
  // front splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 1.8), darkTrim);
  splitter.position.set(-2.32, 0.16, 0);
  car.add(splitter);
  // spoiler with struts
  for (const side of [-0.6, 0.6]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), darkTrim);
    strut.position.set(2.1, 0.95, side);
    car.add(strut);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 1.9), paint);
  wing.position.set(2.12, 1.08, 0);
  wing.castShadow = true;
  car.add(wing);
  // diffuser with fins
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 1.7), darkTrim);
  diffuser.position.set(2.28, 0.24, 0);
  car.add(diffuser);
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.05), darkTrim);
    fin.position.set(2.3, 0.2, i * 0.32);
    car.add(fin);
  }
  // dual exhausts
  for (const side of [-0.5, 0.5]) {
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10),
      std('#b8b8c0', { metalness: 0.9, roughness: 0.25 }));
    ex.rotation.z = Math.PI / 2;
    ex.position.set(2.36, 0.3, side);
    car.add(ex);
  }
  // FULL-WIDTH TAILLIGHT BAR — wide, bright, emissive; it must POP in daylight.
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1a1a, emissive: 0xff2020, emissiveIntensity: 5.0, roughness: 0.3,
  });
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 1.78), tailMat);
  tailBar.position.set(2.36, 0.62, 0);
  car.add(tailBar);
  const tailGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,40,40,0.9)', 'rgba(255,40,40,0)'),
    transparent: true, opacity: 0.85, depthWrite: false,
  }));
  tailGlow.scale.set(3.4, 1.1, 1);
  tailGlow.position.set(2.55, 0.62, 0);
  car.add(tailGlow);
  // headlights with glow
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dd, emissive: 0xfff2c0, emissiveIntensity: 3.5, roughness: 0.3,
  });
  for (const side of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.42), headMat);
    hl.position.set(-2.34, 0.55, side);
    car.add(hl);
    const hg = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,240,190,0.9)', 'rgba(255,240,190,0)'),
      transparent: true, opacity: 0.7, depthWrite: false,
    }));
    hg.scale.set(1.4, 1.4, 1);
    hg.position.set(-2.5, 0.55, side);
    car.add(hg);
  }
  // wheels
  const wheels = [];
  for (const [wx, wz] of [[-1.5, -0.92], [-1.5, 0.92], [1.45, -0.92], [1.45, 0.92]]) {
    const w = makeWheel();
    w.position.set(wx, 0.36, wz);
    car.add(w);
    wheels.push(w);
  }
  car.userData.wheels = wheels;
  car.userData.tailMat = tailMat;
  return car;
}

export function buildTrafficCar(color) {
  const car = new THREE.Group();
  const paint = glossy(color, 0.7);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.62, 1.8), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 1.6),
    new THREE.MeshPhysicalMaterial({ color: 0x1a2028, metalness: 0.8, roughness: 0.2, clearcoat: 0.6 }));
  cabin.position.set(0.2, 1.1, 0);
  cabin.castShadow = true;
  car.add(cabin);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xcc1414, emissive: 0xcc1414, emissiveIntensity: 1.6 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.7), tailMat);
  tail.position.set(2.06, 0.6, 0);
  car.add(tail);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff8dd, emissive: 0xffe9a0, emissiveIntensity: 1.8 });
  for (const side of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34), headMat);
    hl.position.set(-2.06, 0.55, side);
    car.add(hl);
  }
  const wheels = [];
  for (const [wx, wz] of [[-1.35, -0.85], [-1.35, 0.85], [1.35, -0.85], [1.35, 0.85]]) {
    const w = makeWheel();
    w.scale.setScalar(0.9);
    w.position.set(wx, 0.33, wz);
    car.add(w);
    wheels.push(w);
  }
  car.userData.wheels = wheels;
  return car;
}

export function buildPoliceCar() {
  const car = buildTrafficCar(0x14161c);
  // white doors band
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.84), std('#e8e8e8', { roughness: 0.5 }));
  band.position.set(0.1, 0.6, 0);
  car.add(band);
  // light bar: red left, blue right, flashing via userData
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 1.3), std('#181818'));
  barBase.position.set(0.2, 1.45, 0);
  car.add(barBase);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 4 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x2040ff, emissiveIntensity: 4 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.55), redMat);
  red.position.set(0.2, 1.55, -0.32);
  car.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.55), blueMat);
  blue.position.set(0.2, 1.55, 0.32);
  car.add(blue);
  // red/blue glow pools on the asphalt (fake reflections, animated in police.js)
  const redPool = new THREE.Mesh(new THREE.PlaneGeometry(7, 5),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,40,40,0.8)', 'rgba(255,40,40,0)'), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  redPool.rotation.x = -Math.PI / 2;
  redPool.position.set(0, 0.05, -0.8);
  car.add(redPool);
  const bluePool = redPool.clone();
  bluePool.material = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(60,80,255,0.8)', 'rgba(60,80,255,0)'), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  bluePool.position.set(0, 0.05, 0.8);
  car.add(bluePool);
  car.userData.redMat = redMat;
  car.userData.blueMat = blueMat;
  car.userData.redPool = redPool;
  car.userData.bluePool = bluePool;
  return car;
}
