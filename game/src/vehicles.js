// Vehicles: procedural low-poly cars, arcade driving, traffic AI.
import * as THREE from 'three';
import { rng, clamp, lerp, TAU, CITY } from './state.js';
import { glowTexture } from './util.js';
import { resolveCollision } from './city.js';

const GLOW = glowTexture();

export const CAR_TYPES = {
  sports: { name: 'VULPINE S', len: 4.6, wid: 2.0, top: 62, accel: 26, grip: 8.5, color: 0xe62129 },
  sedan: { name: 'MERIDIAN', len: 4.8, wid: 1.9, top: 42, accel: 16, grip: 7, color: 0x8a93b8 },
  taxi: { name: 'CABRIO TAXI', len: 4.7, wid: 1.9, top: 44, accel: 17, grip: 7, color: 0xffc61a },
  van: { name: 'HAULER VAN', len: 5.4, wid: 2.1, top: 36, accel: 12, grip: 6, color: 0x5a6e8a },
  truck: { name: 'DRAY TRUCK', len: 6.4, wid: 2.3, top: 33, accel: 10, grip: 5.5, color: 0x7a4a22 },
  police: { name: 'SBPD CRUISER', len: 4.9, wid: 2.0, top: 55, accel: 22, grip: 8, color: 0x14161e },
};

function glow(x, y, z, color, scale, opacity = 0.85) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.set(x, y, z); s.scale.setScalar(scale); return s;
}

// Build a car mesh. `hero` gets the full-width taillight bar + spoiler + clearcoat paint.
export function makeCarMesh(type, colorHex) {
  const t = CAR_TYPES[type];
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: colorHex ?? t.color, roughness: 0.25, metalness: 0.65,
    emissive: type === 'sports' ? 0x2a0505 : 0x000000, emissiveIntensity: 1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 0.05, metalness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.6, metalness: 0.4 });
  const L = t.len, W = t.wid;
  // body
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.72, L), paint);
  body.position.y = 0.62; g.add(body);
  // cabin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.62, L * 0.46), glass);
  cab.position.set(0, 1.26, -L * 0.06); g.add(cab);
  // hood + trunk hints
  const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.1, L * 0.24), paint);
  hood.position.set(0, 1.0, L * 0.36); hood.rotation.x = -0.1; g.add(hood);
  // wheels
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.3, metalness: 0.9 });
  for (const [wx, wz] of [[-W / 2 + 0.1, L * 0.32], [W / 2 - 0.1, L * 0.32], [-W / 2 + 0.1, -L * 0.32], [W / 2 - 0.1, -L * 0.32]]) {
    const wg = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, wheelMat); tyre.rotation.z = Math.PI / 2; wg.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 8), hubMat);
    hub.rotation.z = Math.PI / 2; wg.add(hub);
    wg.position.set(wx, 0.36, wz); g.add(wg); wheels.push(wg);
  }
  // headlights (front = +Z in local space? we drive nose-first: nose at -Z)
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const hx of [-W * 0.32, W * 0.32]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), headMat);
    h.position.set(hx, 0.72, -L / 2 - 0.02); g.add(h);
    g.add(glow(hx, 0.72, -L / 2 - 0.3, 0xffe9a8, 2.4, 0.6));
  }
  // taillights
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  if (type === 'sports') {
    // full-width LED bar — the hero car's signature
    const bar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.14, 0.08), tailMat);
    bar.position.set(0, 0.86, L / 2 + 0.02); g.add(bar);
    g.add(glow(0, 0.86, L / 2 + 0.35, 0xff2a1a, 4.5, 0.75));
    // spoiler
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.08, 0.55), paint);
    wing.position.set(0, 1.28, L / 2 - 0.35); wing.rotation.x = 0.12; g.add(wing);
    for (const sx of [-W * 0.4, W * 0.4]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.3), dark);
      strut.position.set(sx, 1.1, L / 2 - 0.35); g.add(strut);
    }
    // side skirts + front splitter
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.14, L * 0.8), dark);
    skirt.position.y = 0.32; g.add(skirt);
  } else {
    for (const hx of [-W * 0.32, W * 0.32]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), tailMat);
      tl.position.set(hx, 0.72, L / 2 + 0.02); g.add(tl);
    }
    g.add(glow(0, 0.72, L / 2 + 0.3, 0xff2a1a, 2.6, 0.5));
  }
  // taxi sign / police light bar
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    sign.position.set(0, 1.68, 0); g.add(sign);
  }
  let lightBar = null;
  if (type === 'police') {
    // white doors
    const door = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.5, L * 0.42),
      new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.4 }));
    door.position.set(0, 0.66, 0.1); g.add(door);
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.x = -0.32; lightBar.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.x = 0.32; lightBar.add(blue);
    const gR = glow(-0.32, 0.3, 0, 0xff2222, 3.4, 0.9); gR.name = 'glowR'; lightBar.add(gR);
    const gB = glow(0.32, 0.3, 0, 0x2266ff, 3.4, 0.9); gB.name = 'glowB'; lightBar.add(gB);
    // coloured pools on the asphalt
    const poolR = new THREE.Mesh(new THREE.CircleGeometry(3.4, 18),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    poolR.rotation.x = -Math.PI / 2; poolR.position.y = -0.55; poolR.name = 'poolR'; lightBar.add(poolR);
    const poolB = poolR.clone(); poolB.material = poolR.material.clone(); poolB.material.color.set(0x2266ff); poolB.name = 'poolB';
    lightBar.add(poolB);
    lightBar.position.set(0, 1.62, -0.1); g.add(lightBar);
  }
  g.userData = { type, wheels, lightBar, steer: 0, spin: 0 };
  return g;
}

export function makeCar(scene, type, x, z, heading, colorHex) {
  const t = CAR_TYPES[type];
  const mesh = makeCarMesh(type, colorHex);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  scene.add(mesh);
  const car = {
    mesh, type, spec: t, heading, speed: 0,
    x, z, condition: 100, engine: 0, armour: 0, paint: colorHex ?? t.color,
    sirenPhase: rng() * 10, isPlayer: false,
  };
  return car;
}

export function syncCarMesh(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const u = car.mesh.userData;
  u.spin += car.speed * 0.06;
  for (const w of u.wheels) w.rotation.x = u.spin;
  // front wheels steer
  u.wheels[0].rotation.y = u.steer; u.wheels[1].rotation.y = u.steer;
}

// Arcade driving: throttle, brake, steering that tightens with grip, handbrake drift.
export function driveCar(car, input, dt) {
  const s = car.spec;
  const top = s.top * (1 + car.engine * 0.15);
  if (input.up) car.speed += s.accel * dt * (car.speed < 0 ? 2.2 : 1);
  else if (input.down) car.speed -= (car.speed > 0.5 ? 30 : 12) * dt;
  else car.speed -= car.speed * 0.55 * dt; // drag
  if (input.handbrake) car.speed -= car.speed * 1.4 * dt;
  car.speed = clamp(car.speed, -12, top);
  const spd = Math.abs(car.speed);
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const u = car.mesh.userData;
  u.steer = lerp(u.steer, steerTarget * 0.42, 1 - Math.exp(-8 * dt));
  const grip = input.handbrake ? s.grip * 0.42 : s.grip;
  const turnRate = u.steer * clamp(spd / 14, 0, 1) * 1.9;
  car.heading += turnRate * dt * Math.sign(car.speed || 1);
  // drift: velocity lags heading when handbraking at speed
  const drift = input.handbrake && spd > 18 ? 0.35 : 0;
  const moveHeading = car.heading + (u.steer * drift * Math.sign(car.speed || 1));
  car.x += -Math.sin(moveHeading) * car.speed * dt;
  car.z += -Math.cos(moveHeading) * car.speed * dt;
  const p = resolveCollision(car.x, car.z, 1.4);
  if (p.x !== car.x || p.z !== car.z) {
    car.x = p.x; car.z = p.z;
    if (spd > 8) { car.speed *= -0.25; car.condition = Math.max(0, car.condition - spd * 0.35); }
    else car.speed *= 0.4;
  }
  car.x = clamp(car.x, CITY.west + 4, CITY.east - 4);
  car.z = clamp(car.z, CITY.north + 4, CITY.south + 24);
  syncCarMesh(car);
  return { drifting: drift > 0 && spd > 18, speedKmh: Math.abs(car.speed) * 3.6 };
}

// ---- traffic ----
export const trafficCars = [];
const TRAFFIC_COLORS = [0x8a93b8, 0x5a6e8a, 0xb8b0a0, 0x3a5a3a, 0x7a3a4a, 0x2a4a7a, 0xc8c8d8];

export function spawnTraffic(scene, n = 14) {
  const types = ['sedan', 'sedan', 'taxi', 'van', 'sedan', 'truck'];
  for (let i = 0; i < n; i++) {
    const onAvenue = rng() < 0.6;
    let x, z, heading;
    if (onAvenue) {
      const lane = rng() < 0.5 ? -4.5 : 4.5;
      x = lane; z = -280 + rng() * 560; heading = lane < 0 ? Math.PI : 0;
    } else {
      const cz = CITY.crossZ[Math.floor(rng() * CITY.crossZ.length)];
      x = -190 + rng() * 380; z = cz + (rng() < 0.5 ? -3.5 : 3.5);
      heading = z > cz ? Math.PI / 2 : -Math.PI / 2;
    }
    const type = types[Math.floor(rng() * types.length)];
    const car = makeCar(scene, type, x, z, heading, TRAFFIC_COLORS[Math.floor(rng() * TRAFFIC_COLORS.length)]);
    car.speed = 9 + rng() * 6; car.cruise = car.speed; car.lane = { onAvenue, fixed: onAvenue ? x : z };
    trafficCars.push(car);
  }
}

export function updateTraffic(dt, playerCar) {
  for (const c of trafficCars) {
    // slow down if something is close ahead
    let target = c.cruise;
    const aheadX = c.x - Math.sin(c.heading) * 10, aheadZ = c.z - Math.cos(c.heading) * 10;
    for (const o of trafficCars) {
      if (o === c) continue;
      const d2 = (o.x - aheadX) ** 2 + (o.z - aheadZ) ** 2;
      if (d2 < 36) { target = 0; break; }
    }
    if (playerCar) {
      const d2 = (playerCar.x - aheadX) ** 2 + (playerCar.z - aheadZ) ** 2;
      if (d2 < 30) target = 0;
    }
    c.speed = lerp(c.speed, target, 1 - Math.exp(-2 * dt));
    c.x += -Math.sin(c.heading) * c.speed * dt;
    c.z += -Math.cos(c.heading) * c.speed * dt;
    // wrap around at the map edges, rejoining a lane
    if (c.z < -300 || c.z > 300 || c.x < -200 || c.x > 200) {
      if (c.lane.onAvenue) { c.z = c.z < 0 ? 290 : -290; c.x = c.lane.fixed; }
      else { c.x = c.x < 0 ? 195 : -195; c.z = c.lane.fixed; }
    }
    syncCarMesh(c);
  }
}

// Parked cars along side streets and the impound lot.
export function spawnParked(scene) {
  const spots = [
    [18, -60, 0.1], [18, 30, 0], [-18, -130, 0.05], [-18, 150, -0.05], [30, 210, 1.57],
    [120, -52, 0.3], [126, -44, -0.2], [114, -36, 0.1], [128, -28, 0.4], [-40, 210, 1.5],
    [52, -148, 0.2], [-52, 108, 1.57], [18, -190, 0], [-18, 60, 0],
  ];
  const cars = [];
  for (const [x, z, h] of spots) {
    const type = rng() < 0.5 ? 'sedan' : (rng() < 0.5 ? 'van' : 'taxi');
    cars.push(makeCar(scene, type, x, z, h, TRAFFIC_COLORS[Math.floor(rng() * TRAFFIC_COLORS.length)]));
  }
  return cars;
}
