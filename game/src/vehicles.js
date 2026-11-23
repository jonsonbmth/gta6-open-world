// Vehicles: sculpted cars with real proportions — a low-slung hero sports
// car with a glass cabin, spoiler and headlights; civilian traffic in varied
// colors and shapes; police cruisers with light bars. Traffic drives the
// avenue and street lanes and wraps around the city.

import { makeRng, clamp } from './util.js';
import { AVENUES, STREETS, ROAD_HALF, CROSS_HALF } from './city.js';

const BODY_COLORS = [
  0xc0392b, 0x2980b9, 0xe8e8e8, 0x2c3e50, 0xe8a020, 0x27ae60,
  0x8e44ad, 0xd7dbdd, 0xf39c12, 0x16a085, 0x7f8c8d, 0xb03a5a,
];

function wheelMesh(radius, width) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 14),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0xc9ced4 }),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

// A sculpted sports car: low body, sloped hood and trunk, glass cabin,
// spoiler, headlights and taillights. ~4.6 long, 2 wide, 1.3 tall.
export function buildSportsCar(color) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color, metalness: 0.25, roughness: 0.45 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x8fc4dd, transparent: true, opacity: 0.75 });

  // Lower body.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.6), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  car.add(body);
  // Sloped hood (front, -z is forward in our convention... we use +z forward
  // for the mesh and rotate the group to face travel direction).
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 1.5), bodyMat);
  hood.position.set(0, 0.86, 1.45);
  hood.rotation.x = 0.16;
  hood.castShadow = true;
  car.add(hood);
  // Sloped trunk.
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.26, 1.1), bodyMat);
  trunk.position.set(0, 0.85, -1.7);
  trunk.rotation.x = -0.14;
  car.add(trunk);
  // Glass cabin: windshield + roof + rear window as one tapered shape.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), glassMat);
  cabin.position.set(0, 1.18, -0.25);
  cabin.scale.set(1, 1, 1);
  car.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.3), bodyMat);
  roof.position.set(0, 1.48, -0.35);
  car.add(roof);
  // Side skirts + bumpers.
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.22, 4.2), darkMat);
  skirt.position.y = 0.32;
  car.add(skirt);
  // Spoiler on twin struts.
  for (const sx of [-0.7, 0.7]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), darkMat);
    strut.position.set(sx, 1.15, -2.1);
    car.add(strut);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.55), bodyMat);
  wing.position.set(0, 1.38, -2.12);
  wing.rotation.x = -0.12;
  wing.castShadow = true;
  car.add(wing);
  // Headlights (front) + taillights (rear).
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat);
    head.position.set(sx, 0.68, 2.32);
    car.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.08), tailMat);
    tail.position.set(sx, 0.7, -2.32);
    car.add(tail);
  }
  // Wheels.
  for (const [wx, wz] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
    const w = wheelMesh(0.38, 0.3);
    w.position.set(wx, 0.38, wz);
    car.add(w);
  }
  return car;
}

// A taller civilian sedan / hatchback / van, less sporty than the hero car.
export function buildCivilianCar(color, kind) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color, roughness: 0.6 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x7fb0c8, transparent: true, opacity: 0.7 });
  const tall = kind === 'van';
  const len = tall ? 4.9 : kind === 'hatch' ? 3.9 : 4.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, tall ? 1.1 : 0.7, len), bodyMat);
  body.position.y = tall ? 0.95 : 0.66;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, tall ? 0.6 : 0.55, len * 0.45), glassMat);
  cabin.position.set(0, tall ? 1.75 : 1.26, -0.2);
  car.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, len * 0.4), bodyMat);
  roof.position.set(0, tall ? 2.06 : 1.56, -0.2);
  car.add(roof);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.08), headMat);
    head.position.set(sx, 0.7, len / 2 + 0.02);
    car.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.13, 0.08), tailMat);
    tail.position.set(sx, 0.72, -len / 2 - 0.02);
    car.add(tail);
  }
  for (const [wx, wz] of [[-0.9, len / 2 - 0.9], [0.9, len / 2 - 0.9], [-0.9, -len / 2 + 0.9], [0.9, -len / 2 + 0.9]]) {
    const w = wheelMesh(0.36, 0.28);
    w.position.set(wx, 0.36, wz);
    car.add(w);
  }
  return car;
}

// Police cruiser: white body, black hood and doors band, light bar with
// red/blue beacons, push bar. Instantly readable as police.
export function buildPoliceCruiser() {
  const car = buildCivilianCar(0xf2f4f6, 'sedan');
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.4), blackMat);
  hood.position.set(0, 1.03, 1.3);
  car.add(hood);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.42, 2.6), blackMat);
  band.position.set(0, 0.66, -0.1);
  car.add(band);
  // Light bar.
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.4), blackMat);
  bar.position.set(0, 1.68, -0.2);
  car.add(bar);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.34), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  red.position.set(-0.4, 1.7, -0.2);
  car.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.34), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
  blue.position.set(0.4, 1.7, -0.2);
  car.add(blue);
  car.userData.beacons = { red, blue };
  // Push bar.
  const push = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.12), blackMat);
  push.position.set(0, 0.55, 2.28);
  car.add(push);
  return car;
}

// Traffic: cars cruise the lanes in both directions and wrap at the city edge.
// Lanes: avenues run north-south (x fixed, z varies), streets east-west.
export function createTraffic(scene, count, seed) {
  const rng = makeRng(seed);
  const cars = [];
  const kinds = ['sedan', 'hatch', 'van', 'sedan', 'hatch'];
  for (let i = 0; i < count; i++) {
    const alongAvenue = rng.chance(0.55);
    const color = rng.pick(BODY_COLORS);
    const mesh = buildCivilianCar(color, rng.pick(kinds));
    scene.add(mesh);
    const speed = rng.range(7, 13);
    let car;
    if (alongAvenue) {
      const ax = rng.pick(AVENUES);
      const dir = rng.chance(0.5) ? 1 : -1;
      const lane = dir > 0 ? 3.6 : -3.6;
      car = {
        mesh, speed, dir, axis: 'z',
        x: ax + lane,
        z: rng.range(-165, 165),
        heading: dir > 0 ? 0 : Math.PI,
      };
    } else {
      // z = 40 is Coral Market, a pedestrian street — no traffic through it.
      const driveable = STREETS.filter((sz) => sz !== 40);
      const sz = rng.pick(driveable);
      const dir = rng.chance(0.5) ? 1 : -1;
      const lane = dir > 0 ? 3 : -3;
      car = {
        mesh, speed, dir, axis: 'x',
        x: rng.range(-165, 165),
        z: sz + lane,
        heading: dir > 0 ? Math.PI / 2 : -Math.PI / 2,
      };
    }
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    cars.push(car);
  }
  return {
    cars,
    update(dt) {
      for (const c of cars) {
        if (c.axis === 'z') {
          c.z += c.dir * c.speed * dt;
          if (c.z > 170) c.z = -170;
          if (c.z < -170) c.z = 170;
        } else {
          c.x += c.dir * c.speed * dt;
          if (c.x > 170) c.x = -170;
          if (c.x < -170) c.x = 170;
        }
        c.mesh.position.set(c.x, 0, c.z);
      }
    },
  };
}

// The hero car the player drives: physics-light arcade handling —
// accelerate, brake/reverse, steering that tightens with speed, handbrake
// drift, and simple collision with the city bounds and building blocks.
export function createHeroCar(scene, startX, startZ, startHeading) {
  const mesh = buildSportsCar(0xc0392b);
  scene.add(mesh);
  const state = {
    mesh,
    x: startX,
    z: startZ,
    heading: startHeading,
    speed: 0,
    drift: 0,
    condition: 100,
  };
  mesh.position.set(state.x, 0, state.z);
  mesh.rotation.y = state.heading;

  function isBlocked(nx, nz) {
    if (Math.abs(nx) > 168 || Math.abs(nz) > 168) return true;
    // Building blocks: centers midway between avenues (x = -90 + 60k) and
    // between streets (z = -100 + 40k), half-size ~14 x ~8. Keeps the car on
    // roads and sidewalks, out of the buildings.
    const bx = Math.round((nx + 90) / 60);
    const bz = Math.round((nz + 100) / 40);
    const cx = -90 + bx * 60;
    const cz = -100 + bz * 40;
    if (Math.abs(nx - cx) < 14 && Math.abs(nz - cz) < 8) return true;
    return false;
  }

  return {
    state,
    mesh,
    update(dt, input) {
      const accel = input.forward ? 16 : input.back ? -10 : 0;
      state.speed += accel * dt;
      if (!input.forward && !input.back) state.speed *= Math.pow(0.4, dt);
      if (input.handbrake) {
        state.speed *= Math.pow(0.15, dt);
        state.drift = clamp(state.drift + dt * 2, 0, 1);
      } else {
        state.drift = Math.max(0, state.drift - dt * 3);
      }
      state.speed = clamp(state.speed, -9, 34);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      const steerRate = 1.9 * clamp(Math.abs(state.speed) / 8, 0.25, 1) * (state.drift > 0.4 ? 1.5 : 1);
      state.heading += steer * steerRate * dt * Math.sign(state.speed || 1);
      const nx = state.x + Math.sin(state.heading) * state.speed * dt;
      const nz = state.z + Math.cos(state.heading) * state.speed * dt;
      if (!isBlocked(nx, state.z)) state.x = nx;
      if (!isBlocked(state.x, nz)) state.z = nz;
      if (isBlocked(nx, nz)) state.speed *= 0.4;
      mesh.position.set(state.x, 0, state.z);
      mesh.rotation.y = state.heading;
      // Slight body roll into corners and a drift yaw offset.
      mesh.rotation.z = -steer * clamp(Math.abs(state.speed) / 34, 0, 1) * 0.06;
      mesh.rotation.x = clamp(-accel * 0.004, -0.03, 0.03);
      return state;
    },
  };
}
