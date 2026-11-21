// Police: four EBPD cruisers staged around the hero for the chase, and the
// AIR-3 helicopter with its spotlight beam and ground pool.
const THREE = window.THREE;
import { buildCar } from './cars.js';

function std(color, rough = 0.5, metal = 0.3) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Four cruisers staged around the staged hero position (hx, hz): two
// flanking close, two ahead. All in the chase frame.
export function buildCruisers(scene, hx = -20, hz = 0) {
  const spots = [
    { x: hx - 7.5, z: hz + 4.6, yaw: 0.35 },   // left rear, closing in
    { x: hx + 6.5, z: hz - 5.2, yaw: -0.3 },   // right front, cutting across
    { x: hx + 16, z: hz + 3.4, yaw: 0.12 },    // ahead right
    { x: hx + 24, z: hz - 3.0, yaw: -0.08 },   // ahead left
  ];
  const cruisers = spots.map((s) => {
    const c = buildCar({ color: 0xf2f2ee, police: true, rimColor: 0x30343a });
    c.position.set(s.x, 0, s.z);
    c.rotation.y = s.yaw;
    scene.add(c);
    return c;
  });
  return cruisers;
}

// Flash the light bars: red and blue alternate.
export function flashLights(cruisers, t) {
  const phase = Math.sin(t * 9) > 0;
  cruisers.forEach((c, i) => {
    const on = (i % 2 === 0) === phase;
    if (c.userData.lightRed) {
      c.userData.lightRed.material.emissiveIntensity = on ? 2.6 : 0.15;
      c.userData.lightBlue.material.emissiveIntensity = on ? 0.15 : 2.6;
    }
  });
}

// Helicopter: rounded body, tail, spinning rotor, skids, searchlight.
// Scaled 1.9 so it reads BIG in the chase frame.
export function buildHeli(scene) {
  const heli = new THREE.Group();
  const bodyMat = std(0x35506b, 0.45, 0.25);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0d1622, roughness: 0.1, metalness: 0.9,
  });
  // body: squashed sphere
  const body = mesh(new THREE.SphereGeometry(1.15, 20, 14), bodyMat, 0, 0, 0);
  body.scale.set(1.6, 1, 1.05);
  heli.add(body);
  // glass nose
  const nose = mesh(new THREE.SphereGeometry(0.95, 16, 12), glassMat, 0.85, 0.12, 0);
  nose.scale.set(0.9, 0.75, 0.85);
  heli.add(nose);
  // tail boom + fin
  const tail = mesh(new THREE.CylinderGeometry(0.16, 0.09, 2.6, 8), bodyMat, -2.4, 0.25, 0);
  tail.rotation.z = Math.PI / 2 - 0.12;
  heli.add(tail);
  const fin = mesh(new THREE.BoxGeometry(0.08, 0.7, 0.5), bodyMat, -3.5, 0.55, 0);
  heli.add(fin);
  // tail rotor
  const tr = new THREE.Group();
  tr.position.set(-3.55, 0.4, 0.12);
  const trBlade = mesh(new THREE.BoxGeometry(0.04, 0.9, 0.06), std(0x111111, 0.5), 0, 0, 0);
  tr.add(trBlade);
  heli.add(tr);
  heli.userData.tailRotor = tr;
  // main rotor: mast + two long blades
  heli.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), bodyMat, 0, 1.2, 0));
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.45, 0);
  const bladeMat = std(0x14181d, 0.5);
  [-1, 1].forEach((s) => {
    const blade = mesh(new THREE.BoxGeometry(3.4, 0.04, 0.28), bladeMat, s * 1.7, 0, 0);
    rotor.add(blade);
  });
  heli.add(rotor);
  heli.userData.rotor = rotor;
  // skids
  [-0.85, 0.85].forEach((z) => {
    heli.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), std(0x333333, 0.5, 0.6), 0, -1.05, z));
  });
  // belly searchlight housing
  heli.add(mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xffe9a0, emissiveIntensity: 1.8 }), 0.4, -1.05, 0));

  heli.scale.setScalar(1.9);
  heli.position.set(-1, 17, -12);
  heli.rotation.y = -0.5;
  scene.add(heli);

  // spotlight beam: a cone from the heli's belly down to the road pool.
  // Oriented with a quaternion so the apex sits at the heli and the base
  // lands on the pool — no floating or mis-aimed cone.
  const heliPos = new THREE.Vector3(-1, 17, -12);
  const poolPos = new THREE.Vector3(-16, 0, -1);
  const beamLen = heliPos.distanceTo(poolPos);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.08,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.4, beamLen, 24, 1, true), beamMat);
  beam.position.copy(heliPos).add(poolPos).multiplyScalar(0.5);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = heliPos.clone().sub(poolPos).normalize();
  beam.quaternion.setFromUnitVectors(up, dir);
  scene.add(beam);

  // light pool on the asphalt where the beam lands
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a0, transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-16, 0.03, -1);
  scene.add(pool);

  // a real spotlight so the hero and road are lit where the beam lands
  const spot = new THREE.SpotLight(0xffe9a0, 400, 60, 0.32, 0.5, 1.2);
  spot.position.set(-1, 17, -12);
  spot.target.position.set(-16, 0, -1);
  scene.add(spot, spot.target);

  return { heli, beam, pool, spot };
}

export function spinRotors(heli, dt) {
  if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 22;
  if (heli.userData.tailRotor) heli.userData.tailRotor.rotation.x += dt * 30;
}
