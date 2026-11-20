// Traffic cars cruising the street grid + pedestrians on the sidewalks.
// They make the streets feel alive; pedestrians panic when the heat is on.
import { STREET_X, STREET_Z } from './config.js';
import { buildTrafficCar } from './cars.js';
import { buildPerson, animateWalk } from './people.js';
import { clamp } from './random.js';

const TRAFFIC_COLORS = [0x2a6a8a, 0xc8a020, 0x5a5a62, 0x8a2a2a, 0x2a7a4a, 0xd8d8d8, 0x3a3a4a, 0xe08a2a];
const SHIRTS = [0xff5a8a, 0x5a8aff, 0xffd25a, 0x2a7a4a, 0xe8e8e8, 0x8a5ad8, 0xff8a3a, 0x3a9a8a];

export function createTraffic(scene, rng, count = 14) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const car = buildTrafficCar(rng.pick(TRAFFIC_COLORS));
    const alongX = rng.chance(0.5);
    const lane = alongX ? rng.pick(STREET_Z) : rng.pick(STREET_X);
    const side = rng.chance(0.5) ? 1 : -1;
    // Car model faces -x, so forward = (-cos θ, sin θ) for rotation.y = θ.
    // +x travel needs θ = π, -x needs 0, +z needs π/2, -z needs -π/2.
    if (alongX) {
      car.position.set(rng.range(-320, 320), 0.3, lane + side * 3.2);
      car.rotation.y = side > 0 ? Math.PI : 0;
    } else {
      car.position.set(lane + side * 3.2, 0.3, rng.range(-240, 240));
      car.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    scene.add(car);
    cars.push({ mesh: car, alongX, side, speed: rng.range(7, 13), cur: 0 });
  }
  return {
    cars,
    update(dt, playerPos) {
      for (const c of cars) {
        let target = c.speed;
        const d = Math.hypot(c.mesh.position.x - playerPos.x, c.mesh.position.z - playerPos.z);
        if (d < 14) target = c.speed * 0.35; // ease off near the player
        c.cur += (target - c.cur) * Math.min(1, dt * 2);
        const v = c.cur * dt;
        if (c.alongX) {
          c.mesh.position.x += (c.side > 0 ? 1 : -1) * v;
          if (c.mesh.position.x > 340) c.mesh.position.x = -340;
          if (c.mesh.position.x < -340) c.mesh.position.x = 340;
        } else {
          c.mesh.position.z += (c.side > 0 ? 1 : -1) * v;
          if (c.mesh.position.z > 260) c.mesh.position.z = -260;
          if (c.mesh.position.z < -260) c.mesh.position.z = 260;
        }
        for (const w of c.mesh.userData.wheels) w.rotation.z += v * 2.8;
      }
    },
  };
}

export function createPedestrians(scene, rng, count = 20) {
  const walkers = [];
  for (let i = 0; i < count; i++) {
    const p = buildPerson(rng.pick(SHIRTS));
    const alongX = rng.chance(0.5);
    const street = alongX ? rng.pick(STREET_Z) : rng.pick(STREET_X);
    const side = rng.chance(0.5) ? 1 : -1;
    const off = 10.5 + rng.range(0, 3);
    if (alongX) {
      p.position.set(rng.range(-320, 320), 0.3, street + side * off);
      p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      p.position.set(street + side * off, 0.3, rng.range(-240, 240));
      p.rotation.y = side > 0 ? 0 : Math.PI;
    }
    scene.add(p);
    walkers.push({ mesh: p, alongX, side, speed: rng.range(1.1, 1.9), panic: 0 });
  }
  return {
    walkers,
    update(dt, playerPos, wanted) {
      for (const w of walkers) {
        // panic: run away from the player when the heat is on
        const dx = w.mesh.position.x - playerPos.x;
        const dz = w.mesh.position.z - playerPos.z;
        const d = Math.hypot(dx, dz);
        let speed = w.speed;
        if (wanted >= 2 && d < 26) {
          speed = w.speed * 3.2;
          w.mesh.rotation.y = Math.atan2(dx, dz);
          w.panic = 1;
        } else {
          w.panic = Math.max(0, w.panic - dt);
        }
        const v = speed * dt;
        if (w.alongX) {
          w.mesh.position.x += (w.side > 0 ? 1 : -1) * v;
          if (w.mesh.position.x > 345) w.mesh.position.x = -345;
          if (w.mesh.position.x < -345) w.mesh.position.x = 345;
        } else {
          w.mesh.position.z += (w.side > 0 ? 1 : -1) * v;
          if (w.mesh.position.z > 265) w.mesh.position.z = -265;
          if (w.mesh.position.z < -265) w.mesh.position.z = 265;
        }
        animateWalk(w.mesh, dt, speed);
      }
    },
  };
}
