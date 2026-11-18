// Solmar Bay itself: a seeded coastal grid city. Roads every 48 units, blocks
// of procedural buildings between them, a sand beach and ocean to the south,
// palms along the coastal highway, and the landmarks the jobs are about.
// Also owns the collision boxes and the road helpers traffic drives on.

import * as THREE from 'three';
import { CITY, PALETTE, PLACES } from './config.js';
import { facadeMaterial } from './render.js';
import { range, pick } from './random.js';

const ROAD_LINES = [];
for (let k = -5; k <= 5; k += 1) ROAD_LINES.push(k * CITY.roadGap);

function isRoadCoord(v) {
  return ROAD_LINES.some((r) => Math.abs(v - r) < CITY.roadWidth / 2 + 1);
}

export function onRoad(x, z) {
  return isRoadCoord(x) || isRoadCoord(z);
}

export function nearestRoadPoint(x, z) {
  let bx = ROAD_LINES[0];
  let bz = ROAD_LINES[0];
  for (const r of ROAD_LINES) {
    if (Math.abs(r - x) < Math.abs(bx - x)) bx = r;
    if (Math.abs(r - z) < Math.abs(bz - z)) bz = r;
  }
  return Math.abs(bx - x) < Math.abs(bz - z) ? { x: bx, z, axis: 'z' } : { x, z: bz, axis: 'x' };
}

export function createCity(r, random) {
  const group = new THREE.Group();
  const colliders = []; // {minX,maxX,minZ,maxZ} building footprints
  const buildings = []; // for the minimap + map screen
  const roadMeshes = [];
  const { scene, geo, mat, facades, roadTex } = r;

  // Ground: city slab, then sand, then the ocean plane.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, CITY.half * 2), mat(0x9aa08a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2, 56), mat(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 212);
  sand.receiveShadow = true;
  group.add(sand);

  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1600, 500), new THREE.MeshLambertMaterial({ color: PALETTE.ocean, transparent: true, opacity: 0.92 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.0, 490);
  group.add(ocean);

  // Roads: long asphalt strips with a dashed centre line, both directions.
  for (const line of ROAD_LINES) {
    for (const horizontal of [true, false]) {
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, CITY.half * 2 / 14);
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(CITY.half * 2, CITY.roadWidth),
        new THREE.MeshLambertMaterial({ map: tex }),
      );
      road.rotation.x = -Math.PI / 2;
      if (!horizontal) road.rotation.z = Math.PI / 2;
      road.position.set(horizontal ? 0 : line, 0.06, horizontal ? line : 0);
      road.receiveShadow = true;
      group.add(road);
      roadMeshes.push(road);
    }
  }

  // Blocks: between the roads, 1-3 buildings each. Downtown (near centre)
  // grows tall; the beachfront stays low.
  const blockCenters = [];
  for (let ix = -5; ix < 5; ix += 1) {
    for (let iz = -5; iz < 5; iz += 1) {
      blockCenters.push({ x: ix * CITY.roadGap + CITY.roadGap / 2, z: iz * CITY.roadGap + CITY.roadGap / 2 });
    }
  }
  const sidewalkMat = mat(PALETTE.sidewalk);
  for (const b of blockCenters) {
    if (b.z > 168) continue; // beach blocks stay open
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(CITY.block + 6, CITY.block + 6), sidewalkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(b.x, 0.04, b.z);
    walk.receiveShadow = true;
    group.add(walk);

    const distC = Math.hypot(b.x, b.z);
    const downtown = distC < 110;
    const count = downtown ? 1 : 1 + Math.floor(random() * 2);
    for (let i = 0; i < count; i += 1) {
      const w = downtown ? range(random, 24, 30) : range(random, 12, 18);
      const d = downtown ? range(random, 24, 30) : range(random, 12, 18);
      const h = downtown ? range(random, 42, 78) : range(random, 10, 26);
      const ox = count === 1 ? 0 : (i === 0 ? -8 : 8);
      const oz = count === 1 ? 0 : (i === 0 ? -8 : 8);
      const x = b.x + ox;
      const z = b.z + oz;
      const tex = pick(random, facades);
      const mesh = new THREE.Mesh(geo.box, facadeMaterial(tex));
      mesh.scale.set(w, h, d);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      // Rooftop cap
      const cap = new THREE.Mesh(geo.box, mat(0x6b6258));
      cap.scale.set(w + 0.6, 1, d + 0.6);
      cap.position.set(x, h + 0.5, z);
      group.add(cap);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      buildings.push({ x, z, w, d, h });
    }
  }

  // Landmarks.
  // Downtown tower — the tallest building in Solmar Bay.
  const tower = new THREE.Mesh(geo.box, facadeMaterial(facades[5]));
  tower.scale.set(26, 110, 26);
  tower.position.set(24, 55, -72);
  tower.castShadow = true;
  group.add(tower);
  colliders.push({ minX: 11, maxX: 37, minZ: -85, maxZ: -59 });
  buildings.push({ x: 24, z: -72, w: 26, d: 26, h: 110 });

  // Casino Royale Bay — wide, gold-trimmed.
  const casino = new THREE.Mesh(geo.box, mat(0x8a6d3b, { emissive: 0x332211 }));
  casino.scale.set(30, 16, 22);
  casino.position.set(72, 8, -24);
  casino.castShadow = true;
  group.add(casino);
  colliders.push({ minX: 57, maxX: 87, minZ: -35, maxZ: -13 });
  buildings.push({ x: 72, z: -24, w: 30, d: 22, h: 16 });

  // Marina piers reaching into the ocean.
  const pierMat = mat(0x7a5c3e);
  for (const px of [96, 120, 144]) {
    const pier = new THREE.Mesh(geo.box, pierMat);
    pier.scale.set(4, 1, 42);
    pier.position.set(px, 0.6, 232);
    group.add(pier);
  }

  // Port cranes at the east docks.
  const craneMat = mat(0xc75b39);
  for (const cx of [168, 192]) {
    const leg = new THREE.Mesh(geo.box, craneMat);
    leg.scale.set(3, 34, 3);
    leg.position.set(cx, 17, 120);
    leg.castShadow = true;
    group.add(leg);
    const arm = new THREE.Mesh(geo.box, craneMat);
    arm.scale.set(3, 3, 26);
    arm.position.set(cx, 33, 108);
    group.add(arm);
  }

  // Palms along the coastal highway and the marina.
  const trunkMat = mat(PALETTE.trunk);
  const frondMat = mat(PALETTE.palm);
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(geo.cyl, trunkMat);
    trunk.scale.set(0.5 * s, 7 * s, 0.5 * s);
    trunk.position.y = 3.5 * s;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const frond = new THREE.Mesh(geo.cone, frondMat);
      frond.scale.set(1.6 * s, 4.5 * s, 1.6 * s);
      frond.position.y = 7.4 * s;
      frond.rotation.z = 1.15;
      frond.rotation.y = (i / 6) * Math.PI * 2;
      frond.translateY(1.4 * s);
      g.add(frond);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  for (let x = -216; x <= 216; x += 24) {
    palm(x + range(random, -3, 3), 186);
    if (random() < 0.6) palm(x + range(random, -3, 3), 202);
  }
  for (let i = 0; i < 14; i += 1) palm(range(random, 84, 168), range(random, 150, 180));

  // Streetlights along the main avenues.
  const poleMat = mat(0x3a3f46);
  const lampMat = mat(0xffe9a8, { emissive: 0xffdf8a, emissiveIntensity: 0.9 });
  for (const line of [-144, -48, 48, 144]) {
    for (let v = -192; v <= 192; v += 96) {
      const pole = new THREE.Mesh(geo.cyl, poleMat);
      pole.scale.set(0.3, 8, 0.3);
      pole.position.set(line + 8, 4, v);
      group.add(pole);
      const lamp = new THREE.Mesh(geo.sph, lampMat);
      lamp.scale.set(1.1, 0.7, 1.1);
      lamp.position.set(line + 8, 8.2, v);
      group.add(lamp);
    }
  }

  // Place markers (safehouse, garage, marina...) get a glowing beacon pillar
  // in the world so the player can find them from anywhere.
  const beacons = {};
  for (const [key, p] of Object.entries(PLACES)) {
    const beam = new THREE.Mesh(
      geo.cyl,
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    beam.scale.set(3.5, 60, 3.5);
    beam.position.set(p.x, 30, p.z);
    beam.visible = false;
    group.add(beam);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.25, p.z);
    ring.visible = false;
    group.add(ring);
    beacons[key] = { beam, ring };
  }

  scene.add(group);

  return {
    group, colliders, buildings, beacons, roadLines: ROAD_LINES,
    showBeacon(key, on) {
      const b = beacons[key];
      if (b) { b.beam.visible = on; b.ring.visible = on; }
    },
    hideAllBeacons() {
      for (const b of Object.values(beacons)) { b.beam.visible = false; b.ring.visible = false; }
    },
  };
}

// Circle vs building-box collision: push `p` (radius r) out of every collider.
export function collideCircle(colliders, p, r) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(p.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    const dx = p.x - nx;
    const dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * r;
        p.z = nz + (dz / d) * r;
      } else {
        p.x = c.maxX + r;
      }
    }
  }
  const H = CITY.half - 6;
  p.x = Math.max(-H, Math.min(H, p.x));
  p.z = Math.max(-H, Math.min(H + 4, p.z));
}
