// Cars: extruded curved bodies with real car detail — wheel arches, glass
// greenhouse, headlights/taillights, grille, bumpers, door lines, mirrors,
// spoked rims. Proportions of a real car, never a toy brick.
const THREE = window.THREE;
import { policeDecalTexture } from './textures.js';

function std(color, rough = 0.4, metal = 0.3) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Side-profile shape of a low sports car: long sloped nose, curved deck,
// short tail. Forward is +X. y is height above ground.
function bodyProfile() {
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.16);
  s.lineTo(2.28, 0.16);
  s.lineTo(2.3, 0.3);
  s.quadraticCurveTo(2.28, 0.44, 1.95, 0.5);   // nose
  s.quadraticCurveTo(1.2, 0.6, 0.55, 0.64);    // hood
  s.quadraticCurveTo(-0.6, 0.68, -1.5, 0.64);  // deck
  s.quadraticCurveTo(-2.15, 0.62, -2.3, 0.56); // tail
  s.lineTo(-2.3, 0.16);
  return s;
}

// The glasshouse: sloped windshield, roof, sloped rear glass.
function glassProfile() {
  const s = new THREE.Shape();
  s.moveTo(-1.35, 0.6);
  s.lineTo(1.02, 0.6);
  s.quadraticCurveTo(0.72, 0.92, 0.28, 0.99);  // windshield
  s.quadraticCurveTo(-0.3, 1.03, -0.75, 0.99); // roof
  s.quadraticCurveTo(-1.18, 0.94, -1.35, 0.6); // rear glass
  return s;
}

function makeWheel(rimColor = 0xe8ecf0) {
  const w = new THREE.Group();
  const tireMat = std(0x141414, 0.9, 0);
  const tire = mesh(new THREE.TorusGeometry(0.32, 0.115, 12, 24), tireMat, 0, 0, 0);
  w.add(tire);
  const rimMat = std(rimColor, 0.35, 0.4);
  const rim = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 20), rimMat, 0, 0, 0);
  rim.rotation.x = Math.PI / 2;
  w.add(rim);
  // five spokes on the outer face
  for (let i = 0; i < 5; i++) {
    const sp = mesh(new THREE.BoxGeometry(0.05, 0.36, 0.03), rimMat, 0, 0, 0.055);
    sp.rotation.z = (i * Math.PI * 2) / 5;
    w.add(sp);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 12), std(0x222222, 0.4, 0.6), 0, 0, 0);
  hub.rotation.x = Math.PI / 2;
  w.add(hub);
  // wheels don't cast shadows — saves ~700 draw calls in the shadow pass
  w.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return w;
}

// Build one car. opts: color, police (bool), spoiler (bool), rimColor.
// Forward is +X, wheels at x ±1.45, y 0.34.
export function buildCar(opts = {}) {
  const g = new THREE.Group();
  const bodyMat = std(opts.color ?? 0xc22a2a, 0.32, 0.35);
  const darkMat = std(0x101014, 0.6, 0.2);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0d1622, roughness: 0.12, metalness: 0.9,
  });

  // body shell
  const bodyGeo = new THREE.ExtrudeGeometry(bodyProfile(), {
    depth: 1.7, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07,
    bevelSegments: 3, steps: 1,
  });
  bodyGeo.translate(0, 0, -0.85);
  g.add(mesh(bodyGeo, bodyMat, 0, 0, 0));

  // glass greenhouse + painted roof strip
  const glassGeo = new THREE.ExtrudeGeometry(glassProfile(), {
    depth: 1.46, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04,
    bevelSegments: 2, steps: 1,
  });
  glassGeo.translate(0, 0, -0.73);
  g.add(mesh(glassGeo, glassMat, 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(1.05, 0.045, 1.3), bodyMat, -0.2, 1.02, 0));

  // wheel arches: dark discs behind each wheel, peeking out as a ring
  const archGeo = new THREE.CircleGeometry(0.44, 24);
  const archMat = new THREE.MeshBasicMaterial({ color: 0x070708 });
  [[1.45, 0.93], [1.45, -0.93], [-1.45, 0.93], [-1.45, -0.93]].forEach(([x, z]) => {
    const a = new THREE.Mesh(archGeo, archMat);
    a.position.set(x, 0.36, z);
    if (z < 0) a.rotation.y = Math.PI;
    g.add(a);
  });

  // wheels with spoked rims, each on a steering pivot — spun in main.js.
  // Set slightly outboard so the rim and spokes sit proud of the body side
  // and read in front of the dark arch discs.
  g.userData.wheels = [];
  [[1.45, 0.9], [1.45, -0.9], [-1.45, 0.9], [-1.45, -0.9]].forEach(([x, z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.34, z);
    const w = makeWheel(opts.rimColor);
    pivot.add(w);
    g.add(pivot);
    g.userData.wheels.push({ pivot, spin: w });
  });

  // headlights (emissive) + grille + bumpers
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff6c9, emissive: 0xffedb0, emissiveIntensity: 1.4, roughness: 0.2,
  });
  [-0.55, 0.55].forEach((z) => {
    const h = mesh(new THREE.SphereGeometry(0.09, 12, 10), headMat, 2.27, 0.46, z);
    h.scale.set(0.7, 0.7, 1.6);
    g.add(h);
  });
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.13, 1.0), darkMat, 2.29, 0.3, 0));
  const bumperMat = std(opts.color ?? 0xc22a2a, 0.5, 0.2);
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.15, 1.84), bumperMat, 2.26, 0.19, 0));
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.15, 1.84), bumperMat, -2.26, 0.19, 0));
  // full-width rear light bar
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xaa1111, emissive: 0xff2222, emissiveIntensity: 1.1, roughness: 0.3,
  });
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.08, 1.3), tailMat, -2.31, 0.52, 0));

  // door shut lines (thin, subtle)
  [0.15, -0.95].forEach((x) => {
    g.add(mesh(new THREE.BoxGeometry(0.015, 0.42, 0.012), darkMat, x, 0.42, 0.925));
    g.add(mesh(new THREE.BoxGeometry(0.015, 0.42, 0.012), darkMat, x, 0.42, -0.925));
  });
  // side mirrors
  [-1, 1].forEach((s) => {
    g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), darkMat, 0.78, 0.72, s * 0.94));
    const m = mesh(new THREE.BoxGeometry(0.07, 0.1, 0.15), bodyMat, 0.78, 0.74, s * 1.0);
    g.add(m);
  });

  if (opts.spoiler) {
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), darkMat, -2.05, 0.7, 0.5));
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), darkMat, -2.05, 0.7, -0.5));
    g.add(mesh(new THREE.BoxGeometry(0.34, 0.04, 1.5), bodyMat, -2.08, 0.79, 0));
  }

  if (opts.police) {
    // black hood + trunk panels
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.02, 1.5), darkMat, 1.55, 0.6, 0));
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.02, 1.5), darkMat, -1.9, 0.62, 0));
    // light bar: red + blue halves, emissive (flashed in the loop)
    const barBase = mesh(new THREE.BoxGeometry(0.28, 0.07, 1.15), darkMat, -0.15, 1.08, 0);
    g.add(barBase);
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000, emissive: 0xff0000, emissiveIntensity: 2.2, roughness: 0.3,
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x0033cc, emissive: 0x2266ff, emissiveIntensity: 2.2, roughness: 0.3,
    });
    const red = mesh(new THREE.BoxGeometry(0.26, 0.08, 0.5), redMat, -0.15, 1.1, 0.3);
    const blue = mesh(new THREE.BoxGeometry(0.26, 0.08, 0.5), blueMat, -0.15, 1.1, -0.3);
    g.add(red, blue);
    g.userData.lightRed = red;
    g.userData.lightBlue = blue;
    // door decals
    const decal = new THREE.MeshBasicMaterial({
      map: policeDecalTexture(), transparent: true,
    });
    const dg = new THREE.PlaneGeometry(1.15, 0.58);
    const d1 = new THREE.Mesh(dg, decal);
    d1.position.set(0, 0.44, 0.935);
    const d2 = new THREE.Mesh(dg, decal);
    d2.position.set(0, 0.44, -0.935);
    d2.rotation.y = Math.PI;
    g.add(d1, d2);
  }

  return g;
}
