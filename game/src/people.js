// People: stylized pedestrians with walk cycles, plus the marina crew.
// Figures are built from capsules and spheres — no downloaded models.

import { CFG } from './config.js';

const SKIN = [0xf2c89b, 0xc98d5e, 0x8a5a34, 0xf7d7b0];
const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1];
const PANTS = [0x2c3e50, 0x5d4037, 0x37474f, 0x4e342e, 0x1a237e];
const HAIR = [0x1a1a1a, 0x4a2c14, 0x8a6a3a, 0xd9d9d9, 0x6b4226];

const shared = { mats: new Map() };
function mat(color, rough = 0.85) {
  const key = `${color}|${rough}`;
  if (!shared.mats.has(key)) {
    shared.mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough }));
  }
  return shared.mats.get(key);
}

// One stylized person, ~1.75 m tall. Returns the group plus limb pivots for
// the walk animation.
export function buildFigure(rng) {
  const g = new THREE.Group();
  const skin = mat(rng.pick(SKIN));
  const shirt = mat(rng.pick(SHIRTS), 0.9);
  const pants = mat(rng.pick(PANTS), 0.95);
  const hair = mat(rng.pick(HAIR), 0.9);

  const legGeo = new THREE.CapsuleGeometry(0.09, 0.62, 3, 8);
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.11, 0.48, 0);
  const legR = new THREE.Mesh(legGeo, pants);
  legR.position.set(0.11, 0.48, 0);
  // Pivot at the hip so legs can swing.
  const hipL = new THREE.Group();
  hipL.position.set(-0.11, 0.86, 0);
  legL.position.set(0, -0.38, 0);
  hipL.add(legL);
  const hipR = new THREE.Group();
  hipR.position.set(0.11, 0.86, 0);
  legR.position.set(0, -0.38, 0);
  hipR.add(legR);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.5, 4, 10), shirt);
  torso.position.y = 1.22;

  const armGeo = new THREE.CapsuleGeometry(0.07, 0.5, 3, 8);
  const armL = new THREE.Mesh(armGeo, shirt);
  const shoulderL = new THREE.Group();
  shoulderL.position.set(-0.28, 1.45, 0);
  armL.position.set(0, -0.3, 0);
  shoulderL.add(armL);
  const armR = new THREE.Mesh(armGeo, shirt);
  const shoulderR = new THREE.Group();
  shoulderR.position.set(0.28, 1.45, 0);
  armR.position.set(0, -0.3, 0);
  shoulderR.add(armR);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skin);
  head.position.y = 1.72;
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
  );
  hairCap.position.y = 1.74;

  g.add(hipL, hipR, torso, shoulderL, shoulderR, head, hairCap);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { group: g, hipL, hipR, shoulderL, shoulderR };
}

function sidewalkPath(rng) {
  // Walk along a sidewalk beside a random avenue or street.
  const alongAvenue = rng.chance(0.5);
  if (alongAvenue) {
    const av = rng.pick(CFG.avenues);
    const side = rng.chance(0.5) ? 1 : -1;
    const x = av.x + side * ((av.width || CFG.roadWidth) / 2 + 2.2);
    const z0 = rng.range(-280, 60);
    const z1 = z0 + rng.range(60, 180);
    return { x0: x, z0, x1: x, z1: Math.min(z1, 300) };
  }
  const st = rng.pick(CFG.streets);
  const side = rng.chance(0.5) ? 1 : -1;
  const z = st.z + side * (CFG.roadWidth / 2 + 2.2);
  const x0 = rng.range(-280, 60);
  const x1 = x0 + rng.range(60, 180);
  return { x0, z0: z, x1: Math.min(x1, 240), z1: z };
}

export function buildPedestrians(scene, rng, count = 20) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const fig = buildFigure(rng);
    const path = sidewalkPath(rng);
    const t = rng.next();
    const ped = {
      ...fig,
      path,
      t,
      dir: rng.chance(0.5) ? 1 : -1,
      speed: rng.range(0.9, 1.7),
      phase: rng.range(0, Math.PI * 2),
      fallen: false,
      fallTimer: 0,
    };
    const x = path.x0 + (path.x1 - path.x0) * t;
    const z = path.z0 + (path.z1 - path.z0) * t;
    fig.group.position.set(x, 0, z);
    scene.add(fig.group);
    peds.push(ped);
  }

  function update(dt) {
    for (const p of peds) {
      if (p.fallen) {
        p.fallTimer += dt;
        if (p.fallTimer > 6) {
          // Gets back up and walks on.
          p.fallen = false;
          p.fallTimer = 0;
          p.group.rotation.x = 0;
          p.group.position.y = 0;
        }
        continue;
      }
      const len = Math.hypot(p.path.x1 - p.path.x0, p.path.z1 - p.path.z0) || 1;
      p.t += (p.dir * p.speed * dt) / len;
      if (p.t > 1) {
        p.t = 1;
        p.dir = -1;
      } else if (p.t < 0) {
        p.t = 0;
        p.dir = 1;
      }
      const x = p.path.x0 + (p.path.x1 - p.path.x0) * p.t;
      const z = p.path.z0 + (p.path.z1 - p.path.z0) * p.t;
      p.group.position.set(x, 0, z);
      const heading = Math.atan2(
        (p.path.x1 - p.path.x0) * p.dir,
        (p.path.z1 - p.path.z0) * p.dir,
      );
      p.group.rotation.y = heading;
      p.phase += dt * p.speed * 5.2;
      const swing = Math.sin(p.phase) * 0.55;
      p.hipL.rotation.x = swing;
      p.hipR.rotation.x = -swing;
      p.shoulderL.rotation.x = -swing * 0.7;
      p.shoulderR.rotation.x = swing * 0.7;
      p.group.position.y = Math.abs(Math.sin(p.phase)) * 0.04;
    }
  }

  function knockDown(ped) {
    if (ped.fallen) return;
    ped.fallen = true;
    ped.fallTimer = 0;
    ped.group.rotation.x = -Math.PI / 2;
    ped.group.position.y = 0.25;
    ped.hipL.rotation.x = 0;
    ped.hipR.rotation.x = 0;
  }

  return { peds, update, knockDown };
}
