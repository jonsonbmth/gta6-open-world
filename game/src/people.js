// People: proportional pedestrians with walk cycles, plus the player
// character. The crowd fills the WIDE sidewalks: walkers in both directions,
// pairs talking, people waiting at crossings, market browsers, beachgoers.
// Peds are built from simple parts (head, torso, arms, legs) with varied
// skin tones, clothes and hats so the street reads alive at a glance.

import { makeRng, clamp } from './util.js';
import { AVENUES, STREETS, ROAD_HALF, WALK } from './city.js';

const SKIN_TONES = [0xf2c9a0, 0xd9a066, 0xa06a3a, 0x8a5a30, 0xe8b88a, 0x6b4423];
const SHIRT_COLORS = [
  0xd94f3d, 0x2f7fd0, 0xe8a020, 0x3d9e5f, 0x8a4fd0, 0xe87ab0,
  0xf2f2ee, 0x2c3e50, 0x16a085, 0xd35400, 0x7f8c8d, 0xc0392b,
];
const PANTS_COLORS = [0x2c3e50, 0x34495e, 0x5d4037, 0x1a1a1a, 0x7f8c8d, 0x4a6b8a];
const HAIR_COLORS = [0x1a1a1a, 0x4a2c14, 0x8a6a3a, 0xd9d9d9, 0x6b4423];

// A proportional person, ~1.8 units tall: head, hair, torso, arms, legs.
// Arms and legs swing with a walk phase; the whole figure leans slightly
// into its stride. Returns { group, parts } for animation.
export function buildPerson(opts = {}) {
  const rng = opts.rng || makeRng(Math.floor(Math.random() * 1e9));
  const skin = opts.skin ?? rng.pick(SKIN_TONES);
  const shirt = opts.shirt ?? rng.pick(SHIRT_COLORS);
  const pants = opts.pants ?? rng.pick(PANTS_COLORS);
  const hair = opts.hair ?? rng.pick(HAIR_COLORS);
  const scale = opts.scale ?? rng.range(0.94, 1.06);

  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const hairMat = new THREE.MeshLambertMaterial({ color: hair });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

  // Legs (pivot at the hip so they swing).
  const legGeo = new THREE.BoxGeometry(0.17, 0.8, 0.2);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.12, 0.4, 0);
  legR.position.set(0.12, 0.4, 0);
  legL.geometry.translate(0, -0.4, 0);
  legR.geometry.translate(0, -0.4, 0);
  legL.position.y = 0.8;
  legR.position.y = 0.8;
  legL.castShadow = true;
  legR.castShadow = true;
  group.add(legL, legR);
  // Shoes.
  for (const s of [-0.12, 0.12]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.34), shoeMat);
    shoe.position.set(s, 0.05, 0.05);
    group.add(shoe);
  }
  // Torso.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), shirtMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  // Arms (pivot at the shoulder).
  const armGeo = new THREE.BoxGeometry(0.13, 0.62, 0.15);
  armGeo.translate(0, -0.28, 0);
  const armL = new THREE.Mesh(armGeo, shirtMat);
  const armR = new THREE.Mesh(armGeo, shirtMat);
  armL.position.set(-0.34, 1.38, 0);
  armR.position.set(0.34, 1.38, 0);
  // Hands.
  const handGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const handL = new THREE.Mesh(handGeo, skinMat);
  const handR = new THREE.Mesh(handGeo, skinMat);
  handL.position.set(0, -0.62, 0);
  handR.position.set(0, -0.62, 0);
  armL.add(handL);
  armR.add(handR);
  group.add(armL, armR);
  // Head + hair cap.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), skinMat);
  head.position.y = 1.66;
  head.castShadow = true;
  group.add(head);
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.34), hairMat);
  hairCap.position.y = 1.86;
  group.add(hairCap);
  // Optional hat.
  if (opts.hat || rng.chance(0.22)) {
    const hatMat = new THREE.MeshLambertMaterial({ color: opts.hatColor ?? rng.pick(SHIRT_COLORS) });
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 10), hatMat);
    hat.position.y = 1.94;
    group.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 10), hatMat);
    brim.position.y = 1.89;
    group.add(brim);
  }
  group.scale.setScalar(scale);
  return {
    group,
    parts: { legL, legR, armL, armR, torso, head },
    setWalkPhase(phase, amount) {
      const swing = Math.sin(phase) * 0.55 * amount;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
      group.position.y = Math.abs(Math.sin(phase)) * 0.04 * amount;
    },
    setIdle(breathe) {
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      armL.rotation.x = Math.sin(breathe) * 0.05;
      armR.rotation.x = -Math.sin(breathe) * 0.05;
      torso.rotation.y = Math.sin(breathe * 0.5) * 0.06;
    },
  };
}

// The player character, Dante: red jacket, dark jeans, red cap — readable
// from behind at a glance.
export function buildPlayer() {
  const person = buildPerson({
    skin: 0xd9a066,
    shirt: 0xc0392b,
    pants: 0x2c3e50,
    hair: 0x1a1a1a,
    hat: true,
    hatColor: 0xc0392b,
    scale: 1.02,
    rng: makeRng(7),
  });
  return person;
}

// The crowd: walkers on every avenue sidewalk (both directions), talkers in
// pairs, waiters at crossings, market browsers, and beachgoers. Walkers
// follow straight sidewalk lanes and wrap at the city edge.
export function createCrowd(scene, seed) {
  const rng = makeRng(seed);
  const walkers = [];
  const idlers = [];

  function addWalker(x, z, axis, dir, speed) {
    const p = buildPerson({ rng });
    p.group.position.set(x, 0, z);
    p.group.rotation.y = axis === 'z' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(p.group);
    walkers.push({ p, x, z, axis, dir, speed, phase: rng.next() * Math.PI * 2 });
  }

  // Sidewalk walkers: both sides of every avenue, both directions.
  for (const ax of AVENUES) {
    for (const side of [-1, 1]) {
      const wx = ax + side * (ROAD_HALF + WALK / 2 + rng.range(-1.5, 1.5));
      for (let i = 0; i < 7; i++) {
        addWalker(wx, rng.range(-165, 165), 'z', side > 0 ? 1 : -1, rng.range(1.1, 2.1));
      }
    }
  }
  // Sidewalk walkers along cross streets.
  for (const sz of STREETS) {
    for (const side of [-1, 1]) {
      const wz = sz + side * (6 + WALK / 2);
      for (let i = 0; i < 4; i++) {
        addWalker(rng.range(-165, 165), wz, 'x', side > 0 ? 1 : -1, rng.range(1.1, 2.0));
      }
    }
  }
  // Zebra crossers: a few peds mid-crossing at junctions.
  for (const cx of [0, 60, -60]) {
    for (const cz of [0, 40, -40]) {
      addWalker(cx + rng.range(-2, 2), cz - 8.5, 'z', 1, 1.4);
      addWalker(cx + rng.range(-2, 2), cz + 8.5, 'z', -1, 1.4);
    }
  }

  function addIdler(x, z, facing, kind) {
    const p = buildPerson({ rng });
    p.group.position.set(x, 0, z);
    p.group.rotation.y = facing;
    scene.add(p.group);
    idlers.push({ p, kind, t: rng.next() * 10 });
  }

  // Talker pairs outside shops on Sunset Mile and the coastal road.
  const talkSpots = [
    [-11.5, -8, 0.6], [11.5, -2, -0.6], [-11.5, 18, 0.9], [11.5, 26, -0.9],
    [-11.5, 52, 0.4], [11.5, -48, -0.5], [-108.5, -24, 0.7], [-108.5, 16, -0.7],
    [-131.5, 30, 0.5], [-131.5, -50, -0.5],
  ];
  for (const [x, z, f] of talkSpots) {
    addIdler(x, z, f, 'talk');
    addIdler(x + 0.9, z + 0.4, f + Math.PI, 'talk');
  }
  // Waiters at crossings.
  for (const [x, z, f] of [[-11, -8.5, 0], [11, 31.5, Math.PI], [-11, 71.5, 0], [11, -48.5, Math.PI]]) {
    addIdler(x, z, f, 'wait');
  }
  // Market browsers at the stalls.
  for (let i = 0; i < 10; i++) {
    const sx = -55 + i * 12;
    const sz = 40 + (i % 2 === 0 ? -3.5 : 3.5);
    addIdler(sx + rng.range(-1, 1), sz + (i % 2 === 0 ? 2.2 : -2.2), i % 2 === 0 ? Math.PI : 0, 'browse');
    if (i % 2 === 0) addIdler(sx + 2, sz + (i % 2 === 0 ? 2.4 : -2.4), Math.PI / 2, 'browse');
  }
  // Market walkers threading between the stalls.
  for (let i = 0; i < 8; i++) {
    addWalker(rng.range(-60, 60), 40 + rng.range(-6, 6), 'x', i % 2 === 0 ? 1 : -1, rng.range(0.9, 1.6));
  }
  // Beachgoers: walkers on the sand and a few sitting / lying.
  for (let i = 0; i < 10; i++) {
    addWalker(-150 + rng.range(-14, 14), rng.range(-150, 150), 'z', i % 2 === 0 ? 1 : -1, rng.range(0.8, 1.5));
  }
  for (let i = 0; i < 8; i++) {
    const p = buildPerson({ rng });
    const bx = -150 + rng.range(-12, 12);
    const bz = -140 + i * 36 + rng.range(-6, 6);
    p.group.position.set(bx, 0.25, bz);
    p.group.rotation.x = -Math.PI / 2 + 0.25; // lying on a towel
    p.group.rotation.z = rng.next() * Math.PI;
    scene.add(p.group);
    idlers.push({ p, kind: 'sunbathe', t: 0 });
  }

  return {
    walkers,
    idlers,
    update(dt) {
      for (const w of walkers) {
        w.phase += dt * w.speed * 3.2;
        if (w.axis === 'z') {
          w.z += w.dir * w.speed * dt;
          if (w.z > 170) w.z = -170;
          if (w.z < -170) w.z = 170;
        } else {
          w.x += w.dir * w.speed * dt;
          if (w.x > 170) w.x = -170;
          if (w.x < -170) w.x = 170;
        }
        w.p.group.position.set(w.x, 0, w.z);
        w.p.setWalkPhase(w.phase, 1);
      }
      for (const id of idlers) {
        id.t += dt;
        if (id.kind === 'sunbathe') continue;
        id.p.setIdle(id.t);
        if (id.kind === 'talk') {
          id.p.parts.armR.rotation.x = -0.6 + Math.sin(id.t * 1.4) * 0.25;
        }
      }
    },
  };
}

// On-foot player controller: WASD walk/run relative to the camera heading,
// with the walk cycle and a simple bounds check.
export function createWalker(player, startX, startZ, startHeading) {
  const state = { x: startX, z: startZ, heading: startHeading, phase: 0, moving: false, running: false };
  player.group.position.set(state.x, 0, state.z);
  player.group.rotation.y = state.heading;
  return {
    state,
    update(dt, input, camHeading) {
      let mx = 0;
      let mz = 0;
      if (input.forward) { mz += 1; }
      if (input.back) { mz -= 1; }
      if (input.left) { mx -= 1; }
      if (input.right) { mx += 1; }
      const len = Math.hypot(mx, mz);
      state.moving = len > 0;
      state.running = state.moving && input.run;
      if (state.moving) {
        mx /= len;
        mz /= len;
        const speed = state.running ? 7.5 : 4;
        // Move relative to the camera heading.
        const sin = Math.sin(camHeading);
        const cos = Math.cos(camHeading);
        const wx = mx * cos - mz * sin;
        const wz = mx * sin + mz * cos;
        const nx = clamp(state.x + wx * speed * dt, -168, 168);
        const nz = clamp(state.z + wz * speed * dt, -168, 168);
        state.x = nx;
        state.z = nz;
        state.heading = Math.atan2(wx, wz);
        state.phase += dt * speed * 1.6;
        player.setWalkPhase(state.phase, 1);
      } else {
        player.setIdle(performance.now() / 500);
      }
      player.group.position.set(state.x, 0, state.z);
      player.group.rotation.y = state.heading;
      return state;
    },
  };
}
