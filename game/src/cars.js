// Cars: the sculpted hero sports car, traffic cars and police cars, plus the
// arcade driving physics shared by the player car.
//
// The hero car is built from an extruded side profile (a real sports-car
// silhouette, not a box), with spoked wheels, a full-width taillight bar, a
// rear diffuser and dual exhausts.

import { CFG } from './config.js';

function std(color, roughness = 0.5, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// One spoked wheel: dark tyre, metallic rim, five spokes. Spins around X.
export function makeWheel(radius = 0.36, width = 0.3) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 20),
    std(0x141414, 0.95),
  );
  tyre.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width + 0.02, 16),
    std(0xd8d8dc, 0.25, 0.9),
  );
  rim.rotation.z = Math.PI / 2;
  g.add(tyre, rim);
  const spokeGeo = new THREE.BoxGeometry(0.07, radius * 1.05, 0.06);
  const spokeMat = std(0x303034, 0.35, 0.8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    // Spokes fan across the wheel face (the YZ plane; the axle runs along X).
    for (const face of [1, -1]) {
      const s = new THREE.Mesh(spokeGeo, spokeMat);
      s.position.set(
        (face * width) / 2,
        Math.cos(a) * radius * 0.32,
        Math.sin(a) * radius * 0.32,
      );
      s.rotation.x = a;
      g.add(s);
    }
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, width + 0.06, 10),
    std(0x8a8a90, 0.3, 0.9),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

// Side-profile shape of a low sports car, in metres: x = length (nose +x),
// y = height. Extruded across the width with a bevel for sculpted edges.
function heroBodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.15, 0.28); // rear bumper bottom
  s.lineTo(-2.2, 0.62); // rear face
  s.quadraticCurveTo(-2.18, 0.86, -1.85, 0.92); // decklid
  s.quadraticCurveTo(-1.35, 1.02, -0.85, 1.18); // rear window base
  s.quadraticCurveTo(-0.35, 1.32, 0.15, 1.3); // roof
  s.quadraticCurveTo(0.75, 1.26, 1.15, 1.02); // windshield
  s.quadraticCurveTo(1.7, 0.86, 2.05, 0.78); // hood
  s.quadraticCurveTo(2.25, 0.72, 2.22, 0.5); // nose
  s.lineTo(2.2, 0.28); // front bumper bottom
  s.quadraticCurveTo(1.4, 0.18, 0.6, 0.2); // underbody
  s.quadraticCurveTo(-0.9, 0.18, -2.15, 0.28);
  return s;
}

export function buildHeroCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color: CFG.palette.heroRed,
    metalness: 0.55,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x101820,
    metalness: 0.9,
    roughness: 0.08,
  });
  const darkMat = std(0x18181c, 0.7, 0.2);
  const chromeMat = std(0xd9d9de, 0.2, 1);

  // Main body: extruded profile, bevelled so the flanks catch the sun.
  const bodyGeo = new THREE.ExtrudeGeometry(heroBodyShape(), {
    depth: 1.78,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.1,
    bevelSegments: 3,
    steps: 1,
  });
  bodyGeo.translate(0, 0, -0.89);
  bodyGeo.rotateY(Math.PI / 2); // length axis -> z (nose faces -z? see below)
  // After rotateY(PI/2): shape +x (nose) maps to -z. Nose forward = -z when
  // heading = PI, matching the physics forward vector.
  const body = new THREE.Mesh(bodyGeo, paint);
  body.position.y = 0.12;
  g.add(body);

  // Glasshouse: low dark canopy with a roof panel.
  const canopy = new THREE.Mesh(
    new THREE.RoundedBoxGeometry(1.5, 0.42, 1.7, 3, 0.16),
    glassMat,
  );
  canopy.position.set(0, 1.28, 0.25);
  canopy.scale.set(1, 1, 1);
  const roof = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.35, 0.1, 1.1, 2, 0.05), paint);
  roof.position.set(0, 1.5, 0.3);
  g.add(canopy, roof);

  // Full-width taillight bar: emissive red, blooms at golden hour.
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.12, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0xff1a1a,
      emissiveIntensity: 2.4,
    }),
  );
  tailBar.position.set(0, 0.82, 2.24);
  g.add(tailBar);

  // Headlights: slim emissive blades.
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xfff6d8,
    emissiveIntensity: 2.0,
  });
  for (const side of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.08), headMat);
    h.position.set(side * 0.58, 0.72, -2.26);
    g.add(h);
  }

  // Rear diffuser with vertical fins.
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.3), darkMat);
  diffuser.position.set(0, 0.22, 2.2);
  g.add(diffuser);
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.28), darkMat);
    fin.position.set(i * 0.3, 0.2, 2.28);
    g.add(fin);
  }

  // Dual exhausts.
  for (const side of [-1, 1]) {
    const ex = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.3, 12),
      chromeMat,
    );
    ex.rotation.x = Math.PI / 2;
    ex.position.set(side * 0.45, 0.3, 2.32);
    g.add(ex);
  }

  // Rear wing on twin struts.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.42), paint);
  wing.position.set(0, 1.12, 2.05);
  wing.rotation.x = -0.1;
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.3), darkMat);
    strut.position.set(side * 0.6, 0.98, 2.05);
    g.add(strut);
  }
  g.add(wing);

  // Side skirts + mirrors.
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 2.6), darkMat);
    skirt.position.set(side * 0.95, 0.24, 0);
    g.add(skirt);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.12), paint);
    mirror.position.set(side * 1.02, 1.02, -0.85);
    g.add(mirror);
  }

  // Wheels: front axle steers (pivot groups), all four spin.
  const wheels = [];
  const wheelPos = [
    { x: -0.88, z: -1.42, front: true },
    { x: 0.88, z: -1.42, front: true },
    { x: -0.88, z: 1.42, front: false },
    { x: 0.88, z: 1.42, front: false },
  ];
  for (const wp of wheelPos) {
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, 0.36, wp.z);
    const wheel = makeWheel();
    pivot.add(wheel);
    g.add(pivot);
    wheels.push({ pivot, wheel, front: wp.front });
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return { group: g, wheels, paint };
}

// Simpler traffic car: rounded body + cabin, plain wheels.
export function buildTrafficCar(color) {
  const g = new THREE.Group();
  const paint = std(color, 0.4, 0.4);
  const glassMat = std(0x18242e, 0.15, 0.7);
  const body = new THREE.Mesh(new THREE.RoundedBoxGeometry(1.8, 0.62, 4.1, 3, 0.18), paint);
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(
    new THREE.RoundedBoxGeometry(1.6, 0.55, 2.1, 3, 0.2),
    glassMat,
  );
  cabin.position.set(0, 1.08, 0.15);
  g.add(body, cabin);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xfff2c0,
    emissiveIntensity: 1.4,
  });
  for (const side of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.06), headMat);
    h.position.set(side * 0.6, 0.62, -2.06);
    g.add(h);
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xcc1111, emissiveIntensity: 1.2 }),
    );
    t.position.set(side * 0.6, 0.62, 2.06);
    g.add(t);
  }
  const wheels = [];
  for (const [x, z] of [[-0.82, -1.35], [0.82, -1.35], [-0.82, 1.35], [0.82, 1.35]]) {
    const w = makeWheel(0.33, 0.26);
    w.position.set(x, 0.33, z);
    g.add(w);
    wheels.push(w);
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { group: g, wheels };
}

// Police interceptor: black-and-white livery with a flashing light bar.
export function buildPoliceCar() {
  const { group, wheels } = buildTrafficCar(0x14161c);
  const white = std(0xf2f2f2, 0.4, 0.3);
  const doorBand = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.3, 2.2), white);
  doorBand.position.set(0, 0.6, 0.1);
  group.add(doorBand);
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 0.3), std(0x222222, 0.5, 0.5));
  barBase.position.set(0, 1.42, 0.1);
  const redLens = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2222, emissiveIntensity: 3 }),
  );
  redLens.position.set(-0.28, 1.5, 0.1);
  const blueLens = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2244ff, emissiveIntensity: 3 }),
  );
  blueLens.position.set(0.28, 1.5, 0.1);
  group.add(barBase, redLens, blueLens);
  return { group, wheels, redLens, blueLens };
}

// --- Arcade car physics -------------------------------------------------
// A velocity model with lateral grip: grip bleeds off sideways slide, the
// handbrake cuts grip so the car drifts, and drift angle is measured from
// the gap between heading and velocity direction.

export function createCarPhysics(startX, startZ, heading) {
  const P = CFG.car;
  const state = {
    pos: new THREE.Vector3(startX, 0, startZ),
    vel: new THREE.Vector3(0, 0, 0),
    heading,
    speed: 0,
    steer: 0,
    drifting: false,
    driftAngle: 0,
    crashed: false,
    crashCooldown: 0,
  };

  function forward() {
    return { x: Math.sin(state.heading), z: Math.cos(state.heading) };
  }

  function update(dt, input, colliders) {
    const f = forward();
    state.crashed = false;
    state.crashCooldown = Math.max(0, state.crashCooldown - dt);

    // Longitudinal: throttle / brake / drag.
    let accel = 0;
    if (input.throttle > 0) accel = P.accel;
    else if (input.throttle < 0) accel = state.speed > 0.5 ? -P.brake : -P.accel * 0.55;
    state.speed += accel * dt;
    state.speed -= state.speed * P.drag * dt;
    if (Math.abs(state.speed) < 0.05 && input.throttle === 0) state.speed = 0;
    if (input.handbrake) {
      state.speed -= Math.sign(state.speed) * P.handbrakeDecel * dt;
      if (Math.abs(state.speed) < 0.4) state.speed = 0;
    }
    state.speed = Math.max(-P.maxReverse, Math.min(P.maxSpeed, state.speed));

    // Steering: much less lock at speed, and a capped yaw rate so the car
    // carves instead of spinning.
    const speedFactor = 1 / (1 + Math.abs(state.speed) * 0.045);
    const steerTarget = input.steer * P.steerMax * speedFactor;
    state.steer += (steerTarget - state.steer) * Math.min(1, P.steerSpeed * dt);
    const yawCap = state.drifting ? 2.1 : 1.6;
    const yawRate = Math.max(
      -yawCap,
      Math.min(yawCap, (state.speed / 2.9) * Math.tan(state.steer)),
    );
    state.heading += yawRate * dt;

    // Velocity: forward speed plus a lateral slide that grip bleeds away.
    const f2 = forward();
    const lat = {
      x: state.vel.x - f2.x * state.speed,
      z: state.vel.z - f2.z * state.speed,
    };
    const grip = input.handbrake || Math.abs(state.speed) > 34 ? P.driftGrip : P.grip;
    const bleed = Math.exp(-grip * dt);
    lat.x *= bleed;
    lat.z *= bleed;
    state.vel.set(f2.x * state.speed + lat.x, 0, f2.z * state.speed + lat.z);

    const latSpeed = Math.hypot(lat.x, lat.z);
    state.driftAngle = Math.atan2(latSpeed, Math.abs(state.speed) + 0.001);
    // Drifting = fast, sideways, and sliding: the handbrake is what lets the
    // slide build up (low grip), steering into it keeps it going.
    state.drifting = Math.abs(state.speed) > 8 && state.driftAngle > 0.16;

    state.pos.x += state.vel.x * dt;
    state.pos.z += state.vel.z * dt;

    // World bounds.
    const B = CFG.world;
    state.pos.x = Math.max(B.minX + 6, Math.min(B.maxX - 6, state.pos.x));
    state.pos.z = Math.max(B.minZ + 6, Math.min(B.maxZ - 6, state.pos.z));

    // Circle vs building AABBs: push out, scrub speed, flag the crash.
    const r = 1.7;
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(state.pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(state.pos.z, c.maxZ));
      const dx = state.pos.x - cx;
      const dz = state.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.001;
        const push = r - d;
        state.pos.x += (dx / d) * push;
        state.pos.z += (dz / d) * push;
        if (Math.abs(state.speed) > 4 && state.crashCooldown <= 0) {
          state.crashed = true;
          state.crashCooldown = 0.6;
        }
        state.speed *= 0.42;
        state.vel.multiplyScalar(0.42);
      }
    }
    return state;
  }

  return { state, update, forward };
}
