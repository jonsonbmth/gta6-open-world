// Police: named patrol units that chase the player when wanted, plus the
// AIR-1 helicopter with its narrow searchlight cone. In frozen shots the
// helicopter is parked at its spawn point, never at the origin.
import * as THREE from 'three';
import { buildCar, makeCarState } from './cars.js';
import { POLICE_UNITS } from './config.js';

const HELI_SPAWN = new THREE.Vector3(12, 26, 28);

function buildHeli() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3048, roughness: 0.5, metalness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 3.2), bodyMat);
  body.castShadow = true;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), bodyMat);
  nose.scale.set(1, 0.75, 1);
  nose.position.set(0, -0.1, 1.7);
  g.add(nose);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x16222e, metalness: 0.9, roughness: 0.15 }));
  glass.scale.set(1, 0.6, 0.8);
  glass.position.set(0, 0.15, 1.9);
  g.add(glass);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 3.6, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.2, -3.2);
  g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.8), whiteMat);
  fin.position.set(0, 0.7, -4.8);
  g.add(fin);
  // Skids.
  for (const sx of [-0.8, 0.8]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), whiteMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -0.95, 0.2);
    g.add(skid);
  }
  // Main rotor (spins in the loop).
  const rotor = new THREE.Group();
  rotor.position.y = 0.85;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6), whiteMat);
  mast.position.y = -0.15;
  rotor.add(mast);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.04, 0.28), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
    blade.rotation.y = a;
    rotor.add(blade);
  }
  g.add(rotor);
  g.userData.rotor = rotor;
  // Searchlight cone: narrow, faint, FrontSide so it never reads as a blob.
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c8,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 24, 16, 1, true), coneMat);
  cone.position.set(0, -12.5, 1.5);
  cone.rotation.x = Math.PI; // apex at the heli, opening downward
  g.add(cone);
  // Light pool where the beam lands.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, -25.2, 1.5);
  g.add(pool);
  g.userData.beamPool = pool;
  return g;
}

export function makePolice(scene) {
  const units = [];
  const spawnPoints = [
    { x: -3.5, z: -28, heading: Math.PI },
    { x: 3.5, z: -44, heading: Math.PI },
    { x: -3.5, z: 60, heading: 0 },
  ];
  for (let i = 0; i < 3; i += 1) {
    const car = buildCar({ color: 0x2a3048, police: true, detail: true });
    const state = makeCarState(scene, car, spawnPoints[i].x, spawnPoints[i].z, spawnPoints[i].heading);
    state.name = POLICE_UNITS[i];
    state.chasing = i < 2;
    units.push(state);
  }
  const heli = buildHeli();
  heli.position.copy(HELI_SPAWN);
  scene.add(heli);
  return {
    units,
    heli,
    heliSpawn: HELI_SPAWN.clone(),
    // Park the helicopter at its spawn (frozen shots) — never at the origin.
    parkHeli() {
      heli.position.copy(HELI_SPAWN);
      heli.rotation.set(0, 0.4, 0);
    },
    update(dt, playerPos, wanted, frozen) {
      heli.userData.rotor.rotation.y += dt * 22;
      if (frozen) return;
      // Helicopter follows the player at altitude when wanted, else holds.
      const target = wanted > 0
        ? new THREE.Vector3(playerPos.x + 10, 26, playerPos.z + 12)
        : HELI_SPAWN;
      heli.position.lerp(target, Math.min(1, dt * 0.7));
      heli.lookAt(playerPos.x, 0, playerPos.z);
      // Chase units steer toward the player; the patrol unit cruises.
      for (const u of units) {
        if (u.chasing && wanted > 0) {
          const dx = playerPos.x - u.group.position.x;
          const dz = playerPos.z - u.group.position.z;
          const dist = Math.hypot(dx, dz);
          const wantHeading = Math.atan2(dx, dz);
          let diff = wantHeading - u.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          u.heading += THREE.MathUtils.clamp(diff, -dt * 1.6, dt * 1.6);
          const speed = dist > 6 ? 16 : 8;
          u.group.position.x += Math.sin(u.heading) * speed * dt;
          u.group.position.z += Math.cos(u.heading) * speed * dt;
          u.group.rotation.y = u.heading;
          u.speed = speed;
        } else {
          // Patrol: slow cruise along the avenue, wrapping at the ends.
          const speed = 7;
          u.group.position.z += Math.cos(u.heading) * speed * dt;
          if (u.group.position.z > 115) u.group.position.z = -115;
          if (u.group.position.z < -115) u.group.position.z = 115;
          u.speed = speed;
        }
        for (const w of u.wheels) w.rotation.x += (u.speed * dt) / 0.34;
      }
    },
  };
}
