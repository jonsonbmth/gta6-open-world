// Cars — the V12 hero fix lives here. The hero VULPINE S is a SCULPTED sports
// car: extruded side profile with bevel (curved panels, never a plain box),
// a separate tinted-glass cabin, and a rear assembly with real depth —
// bumper, diffuser with fins, dual exhausts, a FULL-WIDTH emissive taillight
// bar, and a spoiler. Car-local nose is +Z after the profile rotation.
import * as THREE from 'three';

function paint(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.45,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
  });
}
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x16222e, metalness: 0.9, roughness: 0.14 });
const darkTrim = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9, metalness: 0.1 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.95, roughness: 0.25 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.92 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.3 });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Side-profile extrusion: shape drawn in XY (x = length, nose +x), extruded
// across the width, then rotated so the nose points at car-local +Z.
function extrudeProfile(points, width, bevel, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2); // shape +x (nose) -> world +z
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function makeWheel() {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 16), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 0.05), rimMat);
    const a = (i / 5) * Math.PI * 2;
    spoke.position.set(0, Math.sin(a) * 0.1, Math.cos(a) * 0.1);
    spoke.rotation.x = -a;
    g.add(spoke);
  }
  // Dark well disc behind the wheel so the arch reads as a shadowed opening.
  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), darkTrim);
  well.rotation.z = Math.PI / 2;
  well.position.x = 0;
  g.add(well);
  return g;
}

// The sculpted rear: bumper, diffuser + fins, dual exhausts, full-width bar.
function buildRear(group, bodyMat, detail) {
  // Rear bumper — proud of the body, body color.
  group.add(box(1.88, 0.32, 0.2, bodyMat, 0, 0.44, -2.26));
  // Lower valance, dark, tucked under the bumper.
  group.add(box(1.7, 0.14, 0.16, darkTrim, 0, 0.26, -2.28));
  // Diffuser panel with vertical fins.
  group.add(box(1.5, 0.16, 0.14, darkTrim, 0, 0.17, -2.3));
  for (let i = 0; i < 4; i += 1) {
    group.add(box(0.035, 0.15, 0.16, darkTrim, -0.54 + i * 0.36, 0.17, -2.32));
  }
  // Dual exhausts poking out of the diffuser.
  for (const sx of [-0.55, 0.55]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), chromeMat);
    pipe.name = 'exhaust';
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx, 0.24, -2.36);
    pipe.castShadow = true;
    group.add(pipe);
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), darkTrim);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(sx, 0.24, -2.46);
    group.add(mouth);
  }
  // FULL-WIDTH taillight bar: one continuous glowing bar across the rear.
  const barMat = new THREE.MeshStandardMaterial({
    color: 0x550000,
    emissive: 0xff1a1a,
    emissiveIntensity: 3.2,
    roughness: 0.4,
  });
  const bar = box(1.62, 0.1, 0.06, barMat, 0, 0.62, -2.28);
  bar.name = 'taillight-bar';
  group.add(bar);
  // Soft glow plane behind the bar so the bloom pass picks it up.
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff2222,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.34), glowMat);
  glow.position.set(0, 0.62, -2.32);
  glow.rotation.y = Math.PI;
  group.add(glow);
  if (detail) {
    // Spoiler on two struts.
    group.add(box(0.06, 0.16, 0.06, darkTrim, -0.55, 0.86, -2.02));
    group.add(box(0.06, 0.16, 0.06, darkTrim, 0.55, 0.86, -2.02));
    const wing = box(1.52, 0.05, 0.34, bodyMat, 0, 0.96, -2.08);
    wing.name = 'spoiler';
    group.add(wing);
  }
}

function buildFront(group, bodyMat) {
  // Headlights: slim emissive bars, warm white.
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0x444422,
    emissive: 0xfff2c8,
    emissiveIntensity: 2.4,
    roughness: 0.4,
  });
  group.add(box(0.44, 0.09, 0.06, lightMat, -0.56, 0.5, 2.22));
  group.add(box(0.44, 0.09, 0.06, lightMat, 0.56, 0.5, 2.22));
  // Grille + front splitter.
  group.add(box(1.15, 0.16, 0.05, darkTrim, 0, 0.3, 2.23));
  group.add(box(1.7, 0.06, 0.26, darkTrim, 0, 0.14, 2.26));
}

export function buildCar({ color = 0xcc2222, police = false, detail = true } = {}) {
  const group = new THREE.Group();
  const bodyMat = paint(color);
  // Main body: sports-car side silhouette, bevelled for curved panels.
  const bodyProfile = [
    [-2.2, 0.16], [-2.2, 0.58], [-1.55, 0.66], [-0.55, 0.7], [0.55, 0.7],
    [1.35, 0.62], [1.95, 0.52], [2.2, 0.42], [2.2, 0.18], [1.45, 0.14],
    [-1.45, 0.14],
  ];
  group.add(extrudeProfile(bodyProfile, 1.7, 0.09, bodyMat));
  // Cabin: sloped tinted glass.
  const cabinProfile = [[-0.98, 0.68], [-0.58, 1.0], [0.32, 1.02], [0.88, 0.68]];
  group.add(extrudeProfile(cabinProfile, 1.46, 0.06, glassMat));
  // Roof panel (body color) so the cabin reads as glasshouse + roof.
  group.add(box(1.3, 0.05, 0.95, bodyMat, 0, 1.02, -0.12));
  // Side skirts.
  group.add(box(0.08, 0.12, 3.2, darkTrim, -0.9, 0.2, 0));
  group.add(box(0.08, 0.12, 3.2, darkTrim, 0.9, 0.2, 0));
  buildRear(group, bodyMat, detail);
  buildFront(group, bodyMat);
  // Wheels + arches.
  const wheels = [];
  for (const [wx, wz] of [[-0.84, 1.45], [0.84, 1.45], [-0.84, -1.45], [0.84, -1.45]]) {
    const wheel = makeWheel();
    wheel.position.set(wx, 0.34, wz);
    group.add(wheel);
    wheels.push(wheel);
    // Arch lip: dark half-torus over the wheel.
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 16, Math.PI), darkTrim);
    arch.position.set(wx, 0.34, wz);
    arch.rotation.y = Math.PI / 2;
    group.add(arch);
  }
  if (police) {
    // White roof panel + light bar.
    group.add(box(1.32, 0.06, 1.0, new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 }), 0, 1.06, -0.12));
    const redMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2020, emissiveIntensity: 4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x000033, emissive: 0x2244ff, emissiveIntensity: 4 });
    group.add(box(0.42, 0.12, 0.3, redMat, -0.24, 1.14, -0.12));
    group.add(box(0.42, 0.12, 0.3, blueMat, 0.24, 1.14, -0.12));
    group.add(box(0.96, 0.04, 0.34, darkTrim, 0, 1.1, -0.12));
    // Red/blue light pools on the road.
    for (const [poolColor, px] of [[0xff2222, -0.5], [0x2244ff, 0.5]]) {
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(1.1, 20),
        new THREE.MeshBasicMaterial({ color: poolColor, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(px, 0.03, -0.1);
      group.add(pool);
    }
  }
  group.userData.wheels = wheels;
  group.userData.isPolice = police;
  return group;
}

// Place a car in the world and return its driving state. The group is ALWAYS
// added to the scene here — a car state never floats at the origin.
export function makeCarState(scene, car, x, z, heading, { speed = 0 } = {}) {
  car.position.set(x, 0, z);
  car.rotation.y = heading;
  scene.add(car);
  return {
    group: car,
    wheels: car.userData.wheels,
    speed,
    heading,
    steer: 0,
    setPose(nx, nz, nheading) {
      car.position.set(nx, 0, nz);
      car.rotation.y = nheading;
      this.heading = nheading;
    },
  };
}
