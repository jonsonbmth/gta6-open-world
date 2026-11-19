// People: Rico on foot, pedestrians, panicking runners, the crew at the marina.
// Bodies are capsule torso + sphere head + cylinder limbs — never boxy.

import { mulberry32 } from './utils.js';

function limbMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
}

export function createPerson({ coat = 0x33415e, skin = 0xd9a06b, hair = 0x2a1a0c, pants = 0x1c1e26, hat = null, umbrella = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.55, 4, 10),
    limbMat(coat),
  );
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), limbMat(skin));
  head.position.y = 1.72;
  g.add(head);
  const hairM = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    limbMat(hair),
  );
  hairM.position.y = 1.76;
  g.add(hairM);
  if (hat) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.09, 12), limbMat(hat));
    cap.position.y = 1.9;
    g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.22), limbMat(hat));
    brim.position.set(0, 1.87, -0.26);
    g.add(brim);
  }
  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 8), limbMat(coat));
    arm.position.set(side * 0.34, 1.12, 0);
    g.add(arm);
    arms.push(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 8), limbMat(pants));
    leg.position.set(side * 0.13, 0.42, 0);
    g.add(leg);
    legs.push(leg);
  }
  if (umbrella) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), limbMat(0x222222));
    stick.position.set(0.34, 1.75, 0);
    g.add(stick);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: 0xff2d95, roughness: 0.5, side: THREE.DoubleSide }),
    );
    canopy.position.set(0.34, 2.2, 0);
    g.add(canopy);
  }
  g.scale.setScalar(scale);
  return {
    group: g,
    walkPhase: Math.random() * 6,
    animate(dt, speed) {
      this.walkPhase += dt * (2 + speed * 3.2);
      const s = Math.sin(this.walkPhase) * Math.min(1, speed * 0.9 + 0.12);
      arms[0].rotation.x = s * 0.7;
      arms[1].rotation.x = -s * 0.7;
      legs[0].rotation.x = -s * 0.8;
      legs[1].rotation.x = s * 0.8;
      g.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.04 * Math.min(1, speed);
    },
    idle() {
      arms[0].rotation.x = 0; arms[1].rotation.x = 0;
      legs[0].rotation.x = 0; legs[1].rotation.x = 0;
    },
  };
}

export function createRico() {
  const rico = createPerson({ coat: 0xffd23f, skin: 0xd9a06b, hair: 0x3a2410, pants: 0x22242e, hat: 0xe62129 });
  rico.group.rotation.y = Math.PI; // face the camera start view
  return rico;
}

// Pedestrians strolling the sidewalks; some panic and run when the heat is on.
export function buildPedestrians(scene, count = 16) {
  const rnd = mulberry32(4242);
  const coats = [0x33415e, 0x6e3b3b, 0x2f5e4a, 0x5e4a2f, 0x4a3a6e, 0x8a8f9e, 0xb8455c];
  const skins = [0xd9a06b, 0xc98d5f, 0xb97f52, 0x8a5a33, 0xe8b88a];
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = createPerson({
      coat: coats[i % coats.length],
      skin: skins[i % skins.length],
      hair: 0x1a120a + (i % 3) * 0x101010,
      umbrella: rnd() < 0.4,
      scale: 0.94 + rnd() * 0.12,
    });
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (8.4 + rnd() * 1.6);
    const z = 40 - rnd() * 260;
    const dir = rnd() < 0.5 ? -1 : 1;
    p.group.position.set(x, 0, z);
    p.group.rotation.y = dir < 0 ? 0 : Math.PI;
    p.dir = dir;
    p.side = side;
    p.speed = 1.1 + rnd() * 0.7;
    p.panicking = false;
    scene.add(p.group);
    peds.push(p);
  }
  return {
    peds,
    panicAll() { for (const p of peds) p.panicking = Math.random() < 0.6; },
    calmAll() { for (const p of peds) p.panicking = false; },
    update(dt) {
      for (const p of peds) {
        const sp = p.panicking ? p.speed * 4.2 : p.speed;
        p.group.position.z += p.dir * sp * dt;
        if (p.group.position.z < -245) { p.group.position.z = 55; }
        if (p.group.position.z > 60) { p.group.position.z = -240; }
        p.animate(dt, sp);
      }
    },
  };
}

// The crew standing on the marina quay (dialogue shot).
export function buildCrew(scene) {
  const crew = [];
  const defs = [
    { who: 'lena', coat: 0xff7a1a, skin: 0xc98d5f, hair: 0x7a2d12, x: 54.5, z: -12, rot: -1.2 },
    { who: 'rosa', coat: 0xb98cff, skin: 0xb97f52, hair: 0xe8e8e8, x: 57.5, z: -10, rot: -1.6 },
    { who: 'dario', coat: 0x39ff8e, skin: 0x8a5a33, hair: 0x141414, x: 60.5, z: -13, rot: -2.0 },
  ];
  for (const d of defs) {
    const p = createPerson({ coat: d.coat, skin: d.skin, hair: d.hair, umbrella: true, scale: 1.02 });
    p.group.position.set(d.x, 0.8, d.z);
    p.group.rotation.y = d.rot;
    p.who = d.who;
    scene.add(p.group);
    crew.push(p);
  }
  return crew;
}
