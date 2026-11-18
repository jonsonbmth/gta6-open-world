// Cars: the mesh factory (sedan, sports, truck, taxi, police — all built from
// boxes, cylinders and shared materials), arcade driving physics, and the
// traffic that fills Solmar Bay's roads.

import * as THREE from 'three';
import { CAR, CITY } from './config.js';
import { collideCircle, nearestRoadPoint, onRoad } from './city.js';
import { range, pick } from './random.js';

export const CAR_TYPES = {
  sedan: { body: [4.4, 1.0, 2.0], cabin: [2.2, 0.75, 1.8], top: 1.35, speed: 1.0, name: 'Solmar Sedan' },
  sports: { body: [4.6, 0.8, 2.0], cabin: [2.0, 0.6, 1.7], top: 1.05, speed: 1.35, name: 'Cheetah GT' },
  truck: { body: [6.5, 1.4, 2.3], cabin: [1.8, 1.1, 2.2], top: 1.95, speed: 0.7, name: 'Harbor Hauler' },
  taxi: { body: [4.4, 1.0, 2.0], cabin: [2.2, 0.75, 1.8], top: 1.35, speed: 1.0, name: 'Bay Taxi' },
  police: { body: [4.5, 1.0, 2.0], cabin: [2.2, 0.75, 1.8], top: 1.35, speed: 1.45, name: 'SBPD Cruiser' },
  van: { body: [5.0, 1.7, 2.1], cabin: [1.6, 0.9, 2.0], top: 2.1, speed: 0.85, name: 'Bay Van' },
};

const PAINT = [0xc23b3b, 0x2b6cb0, 0xe8e8e8, 0x22262c, 0xd9a441, 0x3f7a5a, 0x7a4a9e, 0x9fb3c8, 0xc75b39, 0x4a7a8c];

// A visible driver: torso + head, so a stolen car never looks empty.
function driverFigure(r, shirt) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(r.geo.box, r.mat(shirt));
  torso.scale.set(0.55, 0.7, 0.35);
  torso.position.y = 0.75;
  g.add(torso);
  const head = new THREE.Mesh(r.geo.sph, r.mat(0xc9976b));
  head.scale.set(0.42, 0.42, 0.42);
  head.position.y = 1.35;
  g.add(head);
  const cap = new THREE.Mesh(r.geo.cyl, r.mat(0x22262c));
  cap.scale.set(0.46, 0.14, 0.46);
  cap.position.y = 1.56;
  g.add(cap);
  return g;
}

export function buildCarMesh(r, type, color, random) {
  const rnd = random ?? Math.random;
  const spec = CAR_TYPES[type];
  const g = new THREE.Group();
  const bodyMat = r.mat(color);
  const glassMat = r.mat(0x1a2733);
  const darkMat = r.mat(0x14171c);

  const body = new THREE.Mesh(r.geo.box, bodyMat);
  body.scale.set(spec.body[0], spec.body[1], spec.body[2]);
  body.position.y = 0.75;
  body.castShadow = true;
  g.add(body);

  const cabin = new THREE.Mesh(r.geo.box, glassMat);
  cabin.scale.set(spec.cabin[0], spec.cabin[1], spec.cabin[2]);
  cabin.position.set(type === 'truck' ? 2.2 : -0.2, spec.top, 0);
  cabin.castShadow = true;
  g.add(cabin);

  if (type === 'sports') {
    const spoiler = new THREE.Mesh(r.geo.box, darkMat);
    spoiler.scale.set(0.25, 0.12, 1.9);
    spoiler.position.set(-2.2, 1.35, 0);
    g.add(spoiler);
    const strut = new THREE.Mesh(r.geo.box, darkMat);
    strut.scale.set(0.15, 0.3, 0.15);
    strut.position.set(-2.2, 1.15, 0);
    g.add(strut);
  }
  if (type === 'truck') {
    const cargo = new THREE.Mesh(r.geo.box, r.mat(0xe8e4da));
    cargo.scale.set(3.6, 1.9, 2.2);
    cargo.position.set(-1.3, 1.7, 0);
    cargo.castShadow = true;
    g.add(cargo);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(r.geo.box, r.mat(0xffd166, { emissive: 0x8a5a00 }));
    sign.scale.set(0.7, 0.3, 0.4);
    sign.position.set(-0.2, 1.85, 0);
    g.add(sign);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(r.geo.box, darkMat);
    bar.scale.set(0.5, 0.22, 1.5);
    bar.position.set(-0.2, 1.8, 0);
    g.add(bar);
    const red = new THREE.Mesh(r.geo.box, r.mat(0xff2222, { emissive: 0xff2222, emissiveIntensity: 2 }));
    red.scale.set(0.5, 0.2, 0.6);
    red.position.set(-0.2, 1.95, -0.45);
    g.add(red);
    const blue = new THREE.Mesh(r.geo.box, r.mat(0x2266ff, { emissive: 0x2266ff, emissiveIntensity: 2 }));
    blue.scale.set(0.5, 0.2, 0.6);
    blue.position.set(-0.2, 1.95, 0.45);
    g.add(blue);
    g.userData.lights = { red, blue };
    const stripe = new THREE.Mesh(r.geo.box, r.mat(0x14171c));
    stripe.scale.set(4.5, 0.35, 2.02);
    stripe.position.y = 0.8;
    g.add(stripe);
  }

  // Headlights and taillights.
  const hl = r.mat(0xfff2b0, { emissive: 0xffedb0, emissiveIntensity: 1.4 });
  const tl = r.mat(0xff2a2a, { emissive: 0xff2a2a, emissiveIntensity: 1.2 });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(r.geo.box, hl);
    h.scale.set(0.15, 0.25, 0.4);
    h.position.set(spec.body[0] / 2, 0.75, s * 0.65);
    g.add(h);
    const t = new THREE.Mesh(r.geo.box, tl);
    t.scale.set(0.15, 0.25, 0.4);
    t.position.set(-spec.body[0] / 2, 0.75, s * 0.65);
    g.add(t);
  }

  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = r.mat(0x111214);
  for (const [wx, wz] of [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.38, wz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.driver = driverFigure(r, pick(rnd, [0x2b6cb0, 0xc23b3b, 0x3f7a5a, 0xd9a441]));
  g.userData.driver.scale.setScalar(0.8);
  g.userData.driver.position.set(type === 'truck' ? 2.2 : 0.1, 0.25, -0.4);
  g.add(g.userData.driver);
  return g;
}

export function createVehicle(r, city, type, x, z, angle, color, random) {
  const rnd = random ?? Math.random;
  const mesh = buildCarMesh(r, type, color ?? pick(rnd, PAINT), rnd);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  r.scene.add(mesh);
  const spec = CAR_TYPES[type];
  return {
    mesh, type, spec,
    x, z, angle, speed: 0,
    color,
    radius: 2.4,
    health: 100,
    update(dt) {
      const forward = { x: Math.cos(this.angle), z: -Math.sin(this.angle) };
      this.x += forward.x * this.speed * dt;
      this.z += forward.z * this.speed * dt;
      const p = { x: this.x, z: this.z };
      collideCircle(city.colliders, p, this.radius);
      if (p.x !== this.x || p.z !== this.z) {
        this.x = p.x;
        this.z = p.z;
        this.speed *= 0.55;
      }
      this.mesh.position.set(this.x, 0, this.z);
      this.mesh.rotation.y = this.angle;
      const spin = (this.speed * dt) / 0.38;
      for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
    },
    destroy() { r.scene.remove(this.mesh); },
  };
}

// Arcade driving: throttle, brake/reverse, steering that tightens at speed,
// handbrake for slides. `drive` in [-1,1], `steer` in [-1,1].
export function driveVehicle(v, drive, steer, handbrake, dt, upgrades = {}) {
  const maxSpeed = CAR.maxSpeed * v.spec.speed * (upgrades.engine ? 1.25 : 1);
  const accel = CAR.accel * (upgrades.engine ? 1.3 : 1);
  if (drive > 0) v.speed += accel * drive * dt;
  else if (drive < 0) {
    if (v.speed > 0.5) v.speed -= CAR.brake * dt;
    else v.speed = Math.max(v.speed + accel * 0.6 * drive * dt, -CAR.reverseMax);
  } else {
    v.speed -= v.speed * 0.6 * dt;
  }
  if (v.speed > maxSpeed) v.speed = maxSpeed;
  const grip = upgrades.tires ? CAR.grip * 1.3 : CAR.grip;
  const turnRate = (handbrake ? CAR.handbrakeTurn : CAR.turnRate) * (upgrades.tires ? 1.15 : 1);
  const speedFactor = Math.min(1, Math.abs(v.speed) / 12);
  v.angle += steer * turnRate * speedFactor * dt * (v.speed < 0 ? -1 : 1);
  if (handbrake) v.speed -= v.speed * 1.4 * dt;
  v.speed -= v.speed * (1 - grip / 10) * 0.12 * dt;
}

// Traffic: cars that cruise the road grid, turn at intersections, and brake
// for the car ahead. They respawn far from the player so the city always
// feels alive.
export function createTraffic(r, city, random, count = 16) {
  const cars = [];
  function spawnCar(farFrom) {
    const line = pick(random, city.roadLines);
    const along = range(random, -CITY.half + 20, CITY.half - 20);
    const horizontal = random() < 0.5;
    const x = horizontal ? along : line;
    const z = horizontal ? line : along;
    if (farFrom && Math.hypot(x - farFrom.x, z - farFrom.z) < 60) return null;
    const type = pick(random, ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'sports']);
    const angle = horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const v = createVehicle(r, city, type, x, z, angle, undefined, random);
    v.cruise = range(random, 10, 16);
    v.horizontal = horizontal;
    return v;
  }
  for (let i = 0; i < count; i += 1) {
    const v = spawnCar(null);
    if (v) cars.push(v);
  }

  return {
    cars,
    update(dt, playerPos, others = []) {
      for (const v of cars) {
        // At an intersection, sometimes turn onto the crossing road.
        const nearX = nearestRoadPoint(v.x, v.z);
        const atIntersection = Math.abs(v.x - Math.round(v.x / CITY.roadGap) * CITY.roadGap) < 3
          && Math.abs(v.z - Math.round(v.z / CITY.roadGap) * CITY.roadGap) < 3;
        if (atIntersection && random() < 0.006) {
          v.horizontal = !v.horizontal;
          v.angle = v.horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        }
        // Stay on the road: steer back toward the nearest road line.
        const target = v.horizontal ? nearX.z : nearX.x;
        const current = v.horizontal ? v.z : v.x;
        const off = target - current;
        const wantAngle = v.horizontal ? (Math.cos(v.angle) > 0 ? 0 : Math.PI) : (Math.sin(v.angle) > 0 ? -Math.PI / 2 : Math.PI / 2);
        let diff = wantAngle - v.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.angle += (diff * 2 + Math.max(-0.4, Math.min(0.4, off * 0.05)) * (v.horizontal ? Math.sign(Math.cos(v.angle)) || 1 : Math.sign(-Math.sin(v.angle)) || 1)) * dt;
        // Brake for the car ahead.
        let blocked = false;
        const fx = Math.cos(v.angle);
        const fz = -Math.sin(v.angle);
        for (const o of [...cars, ...others]) {
          if (o === v) continue;
          const dx = o.x - v.x;
          const dz = o.z - v.z;
          const ahead = dx * fx + dz * fz;
          const side = Math.abs(dx * -fz + dz * fx);
          if (ahead > 0 && ahead < 9 && side < 2.4) { blocked = true; break; }
        }
        v.speed += ((blocked ? 0 : v.cruise) - v.speed) * Math.min(1, 2 * dt);
        v.update(dt);
        // Respawn far away if it drifted off or got stuck.
        if (Math.hypot(v.x - playerPos.x, v.z - playerPos.z) > 260 || (!onRoad(v.x, v.z) && Math.hypot(v.x - playerPos.x, v.z - playerPos.z) > 80)) {
          const nv = spawnCar(playerPos);
          if (nv) {
            v.destroy();
            Object.assign(v, nv);
          }
        }
      }
    },
  };
}
