// SOLMAR BAY — people: capsule torso, sphere head, cylinder limbs.
// Pedestrians walk the sidewalks and PANIC (run, arms flailing) when a police
// chase or a speeding car comes close. Rico wears the yellow raincoat.
import * as THREE from 'three';
import { CREW } from './config.js';

const SKINS = [0xc98d5e, 0x8d5524, 0xe8b08a, 0xb57a4a, 0x6b4423, 0xf1c27d];
const COATS = [0x2b6cb0, 0x9b2c2c, 0x276749, 0x744210, 0x553c9a, 0x97266d, 0x2d3748, 0xd69e2e];
const HAIRS = [0x1a1210, 0x2b1a12, 0x3a2415, 0x0d0d0d, 0x5a3a1a, 0xe8e8e8];

/** Build one person. Returns a Group; userData holds the limbs for walking. */
export function makePerson(opts = {}) {
  const coat = opts.coat ?? 0x2b6cb0;
  const skin = opts.skin ?? 0xc98d5e;
  const hair = opts.hair ?? 0x1a1210;
  const group = new THREE.Group();
  group.name = opts.name || 'ped';

  const coatMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.55, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.85 });

  // Legs.
  const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.78, 8);
  const legL = new THREE.Mesh(legGeo, darkMat);
  legL.position.set(-0.13, 0.42, 0);
  const legR = new THREE.Mesh(legGeo, darkMat);
  legR.position.set(0.13, 0.42, 0);
  // Torso: capsule (raincoat body).
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.52, 4, 10), coatMat);
  torso.position.y = 1.18;
  // Arms.
  const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.66, 8);
  const armL = new THREE.Mesh(armGeo, coatMat);
  armL.position.set(-0.36, 1.28, 0);
  const armR = new THREE.Mesh(armGeo, coatMat);
  armR.position.set(0.36, 1.28, 0);
  // Head + hair.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
  head.position.y = 1.78;
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
  hairMesh.position.y = 1.82;
  group.add(legL, legR, torso, armL, armR, head, hairMesh);

  if (opts.hood) {
    // Raincoat hood: a slightly larger half-sphere in coat colour.
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
      coatMat,
    );
    hood.position.y = 1.8;
    group.add(hood);
  }
  if (opts.umbrella) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), darkMat);
    stick.position.set(0.3, 2.0, 0);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: opts.umbrella, roughness: 0.4, side: THREE.DoubleSide }),
    );
    canopy.position.set(0.3, 2.45, 0);
    group.add(stick, canopy);
  }
  group.userData = {
    limbs: { legL, legR, armL, armR, torso, head },
    walkPhase: Math.random() * Math.PI * 2,
    speed: 0,
    state: 'walk',
    panicUntil: 0,
    downUntil: 0,
  };
  return group;
}

/** Rico Marín on foot: yellow raincoat, hood up. */
export function makeRico() {
  const rico = makePerson({
    name: 'Rico', coat: 0xffd60a, skin: CREW.rico.skin, hair: 0x1a1210, hood: true,
  });
  rico.scale.setScalar(1.02);
  return rico;
}

function swingLimbs(person, phase, amp) {
  const { legL, legR, armL, armR } = person.userData.limbs;
  const s = Math.sin(phase);
  legL.rotation.x = s * amp;
  legR.rotation.x = -s * amp;
  armL.rotation.x = -s * amp * 0.8;
  armR.rotation.x = s * amp * 0.8;
}

/** Pedestrian crowd manager. */
export function createCrowd(scene, rng, count = 26) {
  const peds = [];
  // Sidewalk routes: along Lumen Ave (x = ±15.5) and the cross streets.
  const routes = [];
  for (const sx of [-1, 1]) {
    routes.push({ ax: sx * 15.5, az: -250, bx: sx * 15.5, bz: 250 });
    routes.push({ ax: sx * 15.5, az: 250, bx: sx * 15.5, bz: -250 });
  }
  for (const z of [-80, 0, 80, 160]) {
    routes.push({ ax: -180, az: z + 8.5, bx: 300, bz: z + 8.5 });
    routes.push({ ax: 300, az: z - 8.5, bx: -180, bz: z - 8.5 });
  }
  // Marina strollers.
  routes.push({ ax: -196, az: 80, bx: -196, bz: 230 });
  routes.push({ ax: -226, az: 110, bx: -200, bz: 110 });

  for (let i = 0; i < count; i++) {
    const person = makePerson({
      coat: rng.pick(COATS), skin: rng.pick(SKINS), hair: rng.pick(HAIRS),
      umbrella: rng.chance(0.35) ? rng.pick([0xff2d95, 0x00e5ff, 0xffb020, 0x39ff88]) : null,
    });
    const route = rng.pick(routes);
    const t = rng.f();
    person.position.set(
      route.ax + (route.bx - route.ax) * t,
      0,
      route.az + (route.bz - route.az) * t,
    );
    const heading = Math.atan2(route.bx - route.ax, route.bz - route.az);
    person.rotation.y = heading;
    person.userData.route = route;
    person.userData.routeT = t;
    person.userData.walkSpeed = rng.range(0.9, 1.6);
    person.userData.fleeDir = new THREE.Vector3();
    scene.add(person);
    peds.push(person);
  }

  function panicNear(point, radius, now) {
    for (const p of peds) {
      if (p.position.distanceTo(point) < radius && p.userData.state !== 'down') {
        p.userData.state = 'panic';
        p.userData.panicUntil = now + 4;
        p.userData.fleeDir.set(p.position.x - point.x, 0, p.position.z - point.z).normalize();
        if (p.userData.fleeDir.lengthSq() < 0.01) p.userData.fleeDir.set(1, 0, 0);
      }
    }
  }

  function knock(person, now) {
    person.userData.state = 'down';
    person.userData.downUntil = now + 5;
    person.rotation.x = -Math.PI / 2;
    person.position.y = 0.3;
  }

  function update(dt, now) {
    for (const p of peds) {
      const u = p.userData;
      if (u.state === 'down') {
        if (now > u.downUntil) {
          u.state = 'walk';
          p.rotation.x = 0;
          p.position.y = 0;
        }
        continue;
      }
      if (u.state === 'panic') {
        if (now > u.panicUntil) {
          u.state = 'walk';
        } else {
          // Run away, arms flailing up.
          p.position.addScaledVector(u.fleeDir, 4.6 * dt);
          p.rotation.y = Math.atan2(u.fleeDir.x, u.fleeDir.z);
          u.walkPhase += dt * 11;
          swingLimbs(p, u.walkPhase, 0.9);
          u.limbs.armL.rotation.z = 2.4;
          u.limbs.armR.rotation.z = -2.4;
          continue;
        }
      }
      // Walk the route.
      u.limbs.armL.rotation.z = 0;
      u.limbs.armR.rotation.z = 0;
      const r = u.route;
      const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
      u.routeT += (u.walkSpeed * dt) / len;
      if (u.routeT >= 1) {
        u.routeT = 0;
        // Reverse the route.
        u.route = { ax: r.bx, az: r.bz, bx: r.ax, bz: r.az };
      }
      const nr = u.route;
      p.position.set(
        nr.ax + (nr.bx - nr.ax) * u.routeT,
        0,
        nr.az + (nr.bz - nr.az) * u.routeT,
      );
      p.rotation.y = Math.atan2(nr.bx - nr.ax, nr.bz - nr.az);
      u.walkPhase += dt * 6 * u.walkSpeed;
      swingLimbs(p, u.walkPhase, 0.55);
    }
  }

  return { peds, update, panicNear, knock };
}
