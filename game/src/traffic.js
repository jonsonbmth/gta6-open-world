// Traffic: ordinary cars looping the city blocks on the road centrelines.
// They keep the streets alive and give the player cars to steal.

import { CFG } from './config.js';
import { buildTrafficCar } from './cars.js';

const PAINTS = [
  0x3b6ea5, 0xc9c9c9, 0x2e2e33, 0x7a9e7e, 0xb08968, 0x8e5572, 0x5b8a72,
  0xd9d9d9, 0x4a6fa5, 0x9e2b25, 0xe0a458, 0x6b7c93,
];

// A rectangular loop around one block, driven on the road centrelines.
function makeLoop(rng) {
  const ai = rng.int(0, CFG.avenues.length - 2);
  const si = rng.int(0, CFG.streets.length - 2);
  const x0 = CFG.avenues[ai].x;
  const x1 = CFG.avenues[ai + 1].x;
  const z0 = CFG.streets[si].z;
  const z1 = CFG.streets[si + 1].z;
  const pts = [
    { x: x0, z: z0 },
    { x: x1, z: z0 },
    { x: x1, z: z1 },
    { x: x0, z: z1 },
  ];
  if (rng.chance(0.5)) pts.reverse();
  return pts;
}

export function createTraffic(scene, rng, count = CFG.traffic.count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const built = buildTrafficCar(rng.pick(PAINTS));
    const loop = makeLoop(rng);
    const start = rng.int(0, loop.length - 1);
    const car = {
      ...built,
      loop,
      wp: (start + 1) % loop.length,
      heading: 0,
      speed: CFG.traffic.speed * rng.range(0.85, 1.1),
      stopped: 0,
      pos: new THREE.Vector3(loop[start].x, 0, loop[start].z),
    };
    car.heading = Math.atan2(
      loop[car.wp].x - car.pos.x,
      loop[car.wp].z - car.pos.z,
    );
    built.group.position.copy(car.pos);
    built.group.rotation.y = car.heading + Math.PI;
    scene.add(built.group);
    cars.push(car);
  }

  function update(dt) {
    for (const car of cars) {
      if (car.stopped > 0) {
        car.stopped -= dt;
        continue;
      }
      const target = car.loop[car.wp];
      const dx = target.x - car.pos.x;
      const dz = target.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4) {
        car.wp = (car.wp + 1) % car.loop.length;
        continue;
      }
      const desired = Math.atan2(dx, dz);
      let diff = desired - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading + Math.PI;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.33;
    }
  }

  // The player hit this car: it stops for a moment, startled.
  function bump(car) {
    car.stopped = 2.5;
  }

  return { cars, update, bump };
}
