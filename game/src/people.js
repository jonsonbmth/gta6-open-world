// People: Rico on foot (visible character) and pedestrians who walk, chat,
// carry umbrellas — and run screaming when a chase passes.
import * as THREE from 'three';
import { rng, clamp, TAU, CITY } from './state.js';
import { resolveCollision } from './city.js';

const SKINS = [0xc98d5f, 0xe8b48a, 0x8a5a34, 0xb97a4e, 0xe0aa7e, 0x6e4423];
const COATS = [0xd8b13a, 0x2e8f6e, 0xa02c2c, 0x2c5aa0, 0x6e3fa0, 0xd86a2c, 0x3a7a8a, 0xc0c0c8];

function limbMat(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.8 }); }

// A simple articulated humanoid: torso, head, arms, legs; walkPhase animates the gait.
export function makePerson(skinHex, coatHex, withUmbrella = false) {
  const g = new THREE.Group();
  const skin = limbMat(skinHex), coat = limbMat(coatHex);
  const dark = limbMat(0x14161e);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), coat);
  torso.position.y = 1.08; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.68; g.add(head);
  // rain hood / cap
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI * 2, 0, 1.1), coat);
  hood.position.y = 1.72; g.add(hood);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), dark);
    leg.geometry.translate(0, -0.36, 0);
    leg.position.set(s * 0.14, 0.74, 0); g.add(leg); legs.push(leg);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.18), coat);
    arm.geometry.translate(0, -0.31, 0);
    arm.position.set(s * 0.34, 1.38, 0); g.add(arm); arms.push(arm);
  }
  if (withUmbrella) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), dark);
    stick.position.set(0.34, 1.75, 0); g.add(stick);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0xff2d95, roughness: 0.5, side: THREE.DoubleSide }));
    canopy.position.set(0.34, 2.24, 0); g.add(canopy);
  }
  g.userData = { legs, arms, walkPhase: rng() * TAU };
  return g;
}

export function animateWalk(person, dt, speed) {
  const u = person.userData;
  u.walkPhase += dt * (4 + speed * 1.6);
  const s = Math.sin(u.walkPhase) * clamp(speed * 0.5, 0.15, 0.75);
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
  u.arms[0].rotation.x = -s * 0.7; u.arms[1].rotation.x = s * 0.7;
}

// ---- player on foot ----
export const player = {
  mesh: null, x: 0, z: 40, heading: Math.PI, speed: 0,
  punchT: 0, shootT: 0,
};
export function spawnPlayer(scene, x, z, heading) {
  player.mesh = makePerson(0xc98d5f, 0xd8b13a, false);
  // Rico: yellow raincoat + red cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0xc22, roughness: 0.6 }));
  cap.position.y = 1.86; player.mesh.add(cap);
  player.x = x; player.z = z; player.heading = heading;
  player.mesh.position.set(x, 0, z); player.mesh.rotation.y = heading;
  scene.add(player.mesh);
  return player;
}

export function movePlayer(input, dt, camHeading) {
  const run = input.sprint ? 7.5 : 4.2;
  let mx = 0, mz = 0;
  if (input.up) { mx += -Math.sin(camHeading); mz += -Math.cos(camHeading); }
  if (input.down) { mx -= -Math.sin(camHeading); mz -= -Math.cos(camHeading); }
  if (input.left) { mx += -Math.cos(camHeading); mz += Math.sin(camHeading); }
  if (input.right) { mx -= -Math.cos(camHeading); mz -= Math.sin(camHeading); }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    player.x += mx * run * dt; player.z += mz * run * dt;
    const target = Math.atan2(-mx, -mz);
    let d = target - player.heading;
    while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    player.heading += d * Math.min(1, dt * 12);
    player.speed = run;
  } else player.speed = 0;
  const p = resolveCollision(player.x, player.z, 0.5);
  player.x = p.x; player.z = p.z;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  animateWalk(player.mesh, dt, player.speed);
}

// ---- pedestrians ----
export const peds = [];
export function spawnPeds(scene, n = 26) {
  for (let i = 0; i < n; i++) {
    const onAvenue = rng() < 0.55;
    let x, z;
    if (onAvenue) { x = (rng() < 0.5 ? -1 : 1) * (10.5 + rng() * 2.5); z = -240 + rng() * 480; }
    else { x = -190 + rng() * 380; z = CITY.crossZ[Math.floor(rng() * CITY.crossZ.length)] + (rng() < 0.5 ? -9 : 9); }
    const mesh = makePerson(SKINS[Math.floor(rng() * SKINS.length)], COATS[Math.floor(rng() * COATS.length)], rng() < 0.3);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z, heading: rng() * TAU, speed: 1 + rng() * 0.9,
      state: 'walk', panicT: 0, target: null, waitT: rng() * 4,
    });
  }
}

export function updatePeds(dt, danger) {
  for (const p of peds) {
    // danger = {x, z, radius} — a speeding car or gunfire nearby
    if (danger) {
      const d2 = (p.x - danger.x) ** 2 + (p.z - danger.z) ** 2;
      if (d2 < danger.radius * danger.radius && p.state !== 'panic') {
        p.state = 'panic'; p.panicT = 2.5 + rng() * 2;
        p.heading = Math.atan2(-(p.x - danger.x), -(p.z - danger.z)) + (rng() - 0.5);
      }
    }
    if (p.state === 'panic') {
      p.panicT -= dt;
      p.speed = 6.5;
      // arms up while running
      p.mesh.userData.arms[0].rotation.z = 2.4; p.mesh.userData.arms[1].rotation.z = -2.4;
      if (p.panicT <= 0) {
        p.state = 'walk'; p.speed = 1 + rng() * 0.9;
        p.mesh.userData.arms[0].rotation.z = 0; p.mesh.userData.arms[1].rotation.z = 0;
      }
    } else if (p.waitT > 0) {
      p.waitT -= dt; p.speed = 0;
    } else {
      p.speed = 1 + (p.mesh.userData.legs ? 0.4 : 0);
      if (rng() < dt * 0.05) p.heading += (rng() - 0.5) * 1.2;
      if (rng() < dt * 0.02) p.waitT = 2 + rng() * 5; // pause, look at a shop
    }
    if (p.speed > 0.1) {
      p.x += -Math.sin(p.heading) * p.speed * dt;
      p.z += -Math.cos(p.heading) * p.speed * dt;
      // stay on sidewalks / in the city: bounce off the world edge and buildings
      const before = { x: p.x, z: p.z };
      const q = resolveCollision(p.x, p.z, 0.5);
      if (q.x !== before.x || q.z !== before.z) { p.heading += Math.PI * 0.7; p.x = q.x; p.z = q.z; }
      p.x = clamp(p.x, CITY.west + 2, CITY.east - 2);
      p.z = clamp(p.z, CITY.north + 2, CITY.south + 26);
    }
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    animateWalk(p.mesh, dt, p.speed);
  }
}
