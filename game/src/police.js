// Wanted system: stars, named SBPD units that pursue, ram and roadblock,
// the AIR-1 helicopter with its searchlight cone, BUSTED / WASTED.
import * as THREE from 'three';
import { S, clamp, TAU } from './state.js';
import { makeCar, syncCarMesh, CAR_TYPES } from './vehicles.js';
import { glowTexture } from './util.js';

const GLOW = glowTexture();
export const units = []; // police cars on the road
export let heli = null;
let heliLight = null, spotCone = null, spotPool = null;
let roadblock = null;
let spawnT = 0;

const UNIT_NAMES = ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 4', 'UNIT 9', 'UNIT 15'];
const STATUSES = ['PURSUIT', 'CLOSING IN', 'RAMMING', 'ROADBLOCK', 'CUTTING OFF'];

export function wantedFor(stars) {
  // how many units the wanted level fields
  return [0, 1, 2, 3, 4, 5][clamp(stars, 0, 5)];
}

export function addWanted(n, reason) {
  const before = S.wanted;
  S.wanted = clamp(S.wanted + n, 0, 5);
  if (S.wanted > before) S.wantedTimer = 0;
  return reason;
}

export function clearWanted() { S.wanted = 0; S.wantedTimer = 0; }

export function spawnUnit(scene, name, x, z) {
  const car = makeCar(scene, 'police', x, z, 0);
  car.unitName = name;
  car.status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  car.statusT = 2 + Math.random() * 3;
  car.ramT = 0;
  units.push(car);
  return car;
}

function ensureUnits(scene, px, pz) {
  const want = wantedFor(S.wanted);
  while (units.length < want) {
    const name = UNIT_NAMES[units.length % UNIT_NAMES.length];
    const a = Math.random() * TAU, r = 45 + Math.random() * 40;
    spawnUnit(scene, name, px + Math.cos(a) * r, pz + Math.sin(a) * r);
  }
  while (units.length > want) {
    const u = units.pop();
    scene.remove(u.mesh);
  }
}

function buildHeli(scene) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 5.2), bodyMat);
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x0a1428, roughness: 0.1, metalness: 0.9 }));
  glass.position.set(0, 0.3, -2.0); g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.5), bodyMat);
  tail.position.set(0, 0.3, 4.4); g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.6 }));
  rotor.position.y = 1.1; rotor.name = 'rotor'; g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.3), rotor.material);
  tailRotor.position.set(0.35, 0.4, 6.4); g.add(tailRotor);
  const skids = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 3.4), bodyMat);
  skids.position.y = -1.0; g.add(skids);
  // searchlight cone (additive, fake volumetric)
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  spotCone = new THREE.Mesh(new THREE.ConeGeometry(6, 42, 20, 1, true), coneMat);
  spotCone.position.y = -21; spotCone.rotation.x = Math.PI; g.add(spotCone);
  heliLight = new THREE.SpotLight(0xfff2b0, 320, 70, 0.22, 0.6, 1.2);
  heliLight.position.set(0, -1, 0); g.add(heliLight);
  heliLight.target.position.set(0, -40, 0); g.add(heliLight.target);
  // light pool on the ground (positioned each frame under the heli)
  spotPool = new THREE.Mesh(new THREE.CircleGeometry(5, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }));
  spotPool.rotation.x = -Math.PI / 2; spotPool.position.y = 0.06;
  scene.add(spotPool);
  g.position.set(0, 42, 0);
  scene.add(g);
  heli = { mesh: g, x: 0, z: 0, hoverT: 0 };
  return heli;
}

function buildRoadblock(scene, px, pz, heading) {
  clearRoadblock(scene);
  const g = new THREE.Group();
  for (const off of [-4, 0, 4]) {
    const car = makeCar(scene, 'police', 0, 0, heading + Math.PI / 2);
    car.mesh.position.set(off, 0, 0);
    car.mesh.rotation.y = heading + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    g.add(car.mesh);
    car.mesh.userData.rb = true;
  }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(14, 0.15, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  strip.position.y = 0.1; g.add(strip);
  g.position.set(px, 0, pz);
  scene.add(g);
  roadblock = g;
}
function clearRoadblock(scene) {
  if (roadblock) { scene.remove(roadblock); roadblock = null; }
}

// Pursuit steering: chase the player, ram when close, back off and re-approach.
export function updatePolice(scene, dt, px, pz, playerSpeed, playerHeading) {
  ensureUnits(scene, px, pz);
  spawnT += dt;
  const t = performance.now() / 1000;

  for (const u of units) {
    u.statusT -= dt;
    if (u.statusT <= 0) {
      u.status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      u.statusT = 2 + Math.random() * 3;
    }
    const dx = px - u.x, dz = pz - u.z;
    const dist = Math.hypot(dx, dz) || 1;
    u.dist = Math.round(dist);
    const targetHeading = Math.atan2(-dx, -dz);
    let d = targetHeading - u.heading;
    while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    // ram: when close and roughly aligned, surge forward
    const ramming = dist < 14 && Math.abs(d) < 0.5;
    if (ramming) { u.status = 'RAMMING'; u.ramT = 0.8; }
    if (u.ramT > 0) u.ramT -= dt;
    const top = CAR_TYPES.police.top * (u.ramT > 0 ? 1.15 : 1);
    const want = dist > 6 ? top : top * 0.4;
    u.speed += (want - u.speed) * Math.min(1, dt * 1.6);
    u.heading += clamp(d, -1, 1) * Math.min(1, dt * 2.2) * (u.speed > 1 ? 1 : 0);
    u.x += -Math.sin(u.heading) * u.speed * dt;
    u.z += -Math.cos(u.heading) * u.speed * dt;
    syncCarMesh(u);
    // light bar strobe: red / blue alternate
    const uData = u.mesh.userData;
    if (uData.lightBar) {
      const phase = Math.sin(t * 9 + u.sirenPhase) > 0;
      const gR = uData.lightBar.getObjectByName('glowR');
      const gB = uData.lightBar.getObjectByName('glowB');
      const pR = uData.lightBar.getObjectByName('poolR');
      const pB = uData.lightBar.getObjectByName('poolB');
      if (gR) gR.material.opacity = phase ? 0.95 : 0.08;
      if (gB) gB.material.opacity = phase ? 0.08 : 0.95;
      if (pR) pR.material.opacity = phase ? 0.3 : 0.03;
      if (pB) pB.material.opacity = phase ? 0.03 : 0.3;
    }
    // contact with the player car: shove + damage
    if (dist < 4.5 && playerSpeed !== undefined) {
      const push = 3.2;
      u.x += (dx / dist) * -push * dt * 8; u.z += (dz / dist) * -push * dt * 8;
    }
  }

  // helicopter at 3+ stars
  if (S.wanted >= 3) {
    if (!heli) buildHeli(scene);
    heli.hoverT += dt;
    const hx = px + Math.sin(heli.hoverT * 0.25) * 14;
    const hz = pz + Math.cos(heli.hoverT * 0.2) * 14 - 10;
    heli.x += (hx - heli.x) * Math.min(1, dt * 0.7);
    heli.z += (hz - heli.z) * Math.min(1, dt * 0.7);
    heli.mesh.position.set(heli.x, 42 + Math.sin(heli.hoverT * 0.8) * 2, heli.z);
    heli.mesh.rotation.y = Math.atan2(-(px - heli.x), -(pz - heli.z));
    const rotor = heli.mesh.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += dt * 28;
    // searchlight sweeps around the player
    const sweep = Math.sin(heli.hoverT * 0.6) * 8;
    heliLight.target.position.set(px - heli.x + sweep, -40, pz - heli.z);
    heliLight.target.updateMatrixWorld();
    spotPool.position.set(px + sweep, 0.06, pz);
    spotPool.material.opacity = 0.1 + Math.sin(t * 3) * 0.04;
    spotCone.lookAt(px + sweep, 0, pz);
  } else if (heli) {
    scene.remove(heli.mesh); scene.remove(spotPool);
    heli = null; heliLight = null; spotCone = null; spotPool = null;
  }

  // roadblock at 4+ stars, ahead of the player
  if (S.wanted >= 4 && !roadblock && spawnT > 6) {
    const ahead = 55;
    buildRoadblock(scene, px - Math.sin(playerHeading) * ahead, pz - Math.cos(playerHeading) * ahead, playerHeading);
    spawnT = 0;
  }
  if (S.wanted < 4 && roadblock) clearRoadblock(scene);

  // wanted decays when hidden (slow, off-road, no line of sight approximation)
  if (S.wanted > 0) {
    const nearest = units.length ? Math.min(...units.map(u => u.dist || 999)) : 999;
    if (nearest > 70 && playerSpeed < 2) {
      S.wantedTimer += dt;
      if (S.wantedTimer > 14) { S.wanted--; S.wantedTimer = 0; }
    } else S.wantedTimer = 0;
  }
}

// Busted: stopped, surrounded, on foot or slow in a car.
export function checkBusted(playerSpeed, inCar) {
  if (S.wanted === 0) return false;
  const near = units.filter(u => (u.dist || 999) < 9).length;
  if (inCar) return playerSpeed < 1.5 && near >= 2 && S.wanted >= 2;
  return near >= 1 && playerSpeed < 1;
}
