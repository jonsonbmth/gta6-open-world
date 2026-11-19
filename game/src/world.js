// Solmar Bay itself: the painted ground, the buildings, palm-lined
// boulevard, beach and ocean, and the marina. Everything is procedural —
// canvas textures and geometry built in code, no external assets.
//
// Boat hulls are extruded rounded profiles: no cones, no wedge shapes.

import { CFG } from './config.js';
import { buildFigure } from './people.js';

const WORLD = CFG.world;
const TEX = 2048; // ground texture size (px), covering 700 m
const SCALE = TEX / WORLD.ground;

function px(v) {
  return (v + WORLD.ground / 2) * SCALE;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Road edge intervals, used by both the ground painter and the builders.
function roadLines() {
  const v = CFG.avenues.map((a) => ({
    a: a.x - (a.width || CFG.roadWidth) / 2,
    b: a.x + (a.width || CFG.roadWidth) / 2,
  }));
  const h = CFG.streets.map((s) => ({
    a: s.z - CFG.roadWidth / 2,
    b: s.z + CFG.roadWidth / 2,
  }));
  return { v, h };
}

function blockIntervals() {
  const { v, h } = roadLines();
  const xs = [-WORLD.ground / 2, ...v.flatMap((r) => [r.a, r.b]), WORLD.ground / 2];
  const zs = [-WORLD.ground / 2, ...h.flatMap((r) => [r.a, r.b]), WORLD.ground / 2];
  xs.sort((a, b) => a - b);
  zs.sort((a, b) => a - b);
  const xBlocks = [];
  for (let i = 0; i < xs.length - 1; i += 2) xBlocks.push([xs[i], xs[i + 1]]);
  const zBlocks = [];
  for (let i = 0; i < zs.length - 1; i += 2) zBlocks.push([zs[i], zs[i + 1]]);
  return { xBlocks, zBlocks };
}

function paintGround(rng) {
  const [c, g] = makeCanvas(TEX, TEX);
  // Base: warm concrete.
  g.fillStyle = '#b3aa9c';
  g.fillRect(0, 0, TEX, TEX);

  const { xBlocks, zBlocks } = blockIntervals();
  const blockTones = ['#8fae6b', '#c9c0ab', '#a8bf7e', '#bfae90', '#9db38a', '#c4b89e'];
  for (const [x0, x1] of xBlocks) {
    for (const [z0, z1] of zBlocks) {
      if (x0 >= 240) continue; // beach column handled below
      g.fillStyle = rng.pick(blockTones);
      g.fillRect(px(x0) + 4, px(z0) + 4, px(x1) - px(x0) - 8, px(z1) - px(z0) - 8);
      // Sidewalk border.
      g.strokeStyle = '#cfc8b8';
      g.lineWidth = 5;
      g.strokeRect(px(x0) + 2, px(z0) + 2, px(x1) - px(x0) - 4, px(z1) - px(z0) - 4);
    }
  }

  // Roads: dark asphalt.
  const { v, h } = roadLines();
  g.fillStyle = '#3b3b42';
  for (const r of v) g.fillRect(px(r.a), 0, px(r.b) - px(r.a), TEX);
  for (const r of h) g.fillRect(0, px(r.a), TEX, px(r.b) - px(r.a));

  // Asphalt speckle.
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 2600; i++) {
    g.fillRect(rng.range(0, TEX), rng.range(0, TEX), 2, 2);
  }

  // Lane markings: dashed centre lines + solid edge lines.
  g.strokeStyle = '#e8c33c';
  g.lineWidth = 2;
  g.setLineDash([18, 26]);
  for (const a of CFG.avenues) {
    g.beginPath();
    g.moveTo(px(a.x), 0);
    g.lineTo(px(a.x), TEX);
    g.stroke();
  }
  for (const s of CFG.streets) {
    g.beginPath();
    g.moveTo(0, px(s.z));
    g.lineTo(TEX, px(s.z));
    g.stroke();
  }
  g.setLineDash([]);
  g.strokeStyle = 'rgba(240,240,240,0.75)';
  g.lineWidth = 2;
  for (const r of v) {
    for (const e of [r.a + 1, r.b - 1]) {
      g.beginPath();
      g.moveTo(px(e), 0);
      g.lineTo(px(e), TEX);
      g.stroke();
    }
  }
  for (const r of h) {
    for (const e of [r.a + 1, r.b - 1]) {
      g.beginPath();
      g.moveTo(0, px(e));
      g.lineTo(TEX, px(e));
      g.stroke();
    }
  }

  // Crosswalks at every intersection.
  g.fillStyle = 'rgba(245,245,245,0.85)';
  for (const a of CFG.avenues) {
    for (const s of CFG.streets) {
      for (let i = -2; i <= 2; i++) {
        g.fillRect(px(a.x) + i * 9 - 3, px(s.z) - 9, 6, 18);
      }
    }
  }

  // Beach: sand gradient with soft patches, east of the boulevard.
  const sand = g.createLinearGradient(px(243), 0, px(330), 0);
  sand.addColorStop(0, '#e9d29e');
  sand.addColorStop(0.6, '#ecdcae');
  sand.addColorStop(1, '#e2c78d');
  g.fillStyle = sand;
  g.fillRect(px(243), 0, TEX - px(243), TEX);
  g.fillStyle = 'rgba(180,150,90,0.25)';
  for (let i = 0; i < 40; i++) {
    const x = rng.range(px(250), px(315));
    const z = rng.range(0, TEX);
    g.beginPath();
    g.ellipse(x, z, rng.range(14, 50), rng.range(8, 22), rng.range(0, 3), 0, Math.PI * 2);
    g.fill();
  }
  // Shoreline foam.
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let z = 0; z < TEX; z += 6) {
    const wob = Math.sin(z * 0.02) * 6 + Math.sin(z * 0.061) * 3;
    g.fillRect(px(318) + wob, z, 8, 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Facade textures: an albedo canvas (wall + window frames) and an emissive
// canvas (warm lit windows only) so buildings glow at golden hour.
function facadeTextures(base, litRatio, rng) {
  const [mc, mg] = makeCanvas(128, 256);
  const [ec, eg] = makeCanvas(128, 256);
  mg.fillStyle = base;
  mg.fillRect(0, 0, 128, 256);
  eg.fillStyle = '#000000';
  eg.fillRect(0, 0, 128, 256);
  const cols = 6;
  const rows = 12;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = 6 + col * 20;
      const y = 8 + r * 20;
      const lit = rng.next() < litRatio;
      mg.fillStyle = lit ? '#ffe1a8' : '#2e3540';
      mg.fillRect(x, y, 14, 13);
      if (lit) {
        eg.fillStyle = '#ffb85e';
        eg.fillRect(x, y, 14, 13);
      }
    }
  }
  const map = new THREE.CanvasTexture(mc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  const emissiveMap = new THREE.CanvasTexture(ec);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  return { map, emissiveMap };
}

// Scale a building's UVs so the window grid repeats every ~14 m instead of
// stretching across the whole facade.
function scaleUVs(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
}

function buildBoat(rng, length) {
  const g = new THREE.Group();
  const beam = length * 0.32;
  // Hull: a rounded side profile extruded across the beam. The bow sweeps
  // up in a curve and the keel is rounded — never a wedge.
  const s = new THREE.Shape();
  const L = length;
  s.moveTo(-L / 2, 0.12);
  s.lineTo(-L / 2, 0.95); // transom
  s.lineTo(L / 2 - 1.4, 0.95); // sheer line
  s.quadraticCurveTo(L / 2 - 0.2, 0.95, L / 2, 0.55); // bow curve
  s.quadraticCurveTo(L / 2 - 0.6, 0.05, L / 2 - 2.2, 0.02); // forefoot
  s.quadraticCurveTo(0, -0.05, -L / 2, 0.12); // rounded keel
  const hullGeo = new THREE.ExtrudeGeometry(s, {
    depth: beam,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.18,
    bevelSegments: 3,
    steps: 1,
  });
  hullGeo.translate(0, 0, -beam / 2);
  // Shape x is the hull length, extrude z is the beam: no rotation needed.
  // Deep saturated hull colours: white hulls vanish against pale water
  // and golden haze, coloured ones read as boats from across the marina.
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: rng.pick([0x1b4f72, 0x922b21, 0x145a32, 0x6c3483, 0x935116]),
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.6,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  g.add(hull);

  // Hull stripe: kept short of the bow curve and the transom so it never
  // pokes out of the hull.
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.7, 0.14, beam + 0.5),
    new THREE.MeshStandardMaterial({ color: 0xf4f1e8 }),
  );
  stripe.position.set(-L * 0.05, 0.82, 0);
  g.add(stripe);

  // Deck + cabin.
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.96, 0.1, beam * 0.94),
    new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.9 }),
  );
  deck.position.y = 0.98;
  g.add(deck);
  const cabin = new THREE.Mesh(
    new THREE.RoundedBoxGeometry(L * 0.4, 0.85, beam * 0.72, 3, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.4 }),
  );
  cabin.position.set(-L * 0.08, 1.45, 0);
  g.add(cabin);
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.5, beam * 0.6),
    new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.1, metalness: 0.7 }),
  );
  windshield.position.set(L * 0.14, 1.5, 0);
  windshield.rotation.z = -0.35;
  g.add(windshield);

  if (rng.chance(0.45)) {
    // Sailboat: mast + boom.
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 8.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.4, metalness: 0.6 }),
    );
    mast.position.set(L * 0.05, 5.4, 0);
    const boom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, L * 0.42, 8),
      mast.material,
    );
    boom.rotation.z = Math.PI / 2;
    boom.position.set(-L * 0.14, 2.6, 0);
    g.add(mast, boom);
  } else {
    // Motorboat: outboard + rails.
    const motor = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.55, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.5, metalness: 0.4 }),
    );
    motor.position.set(-L / 2 - 0.15, 0.72, 0);
    g.add(motor);
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

export function buildWorld(scene, rng) {
  const colliders = [];
  const counts = { buildings: 0, palms: 0, boats: 0, lamps: 0, crew: 0 };

  // --- Ground ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.ground, WORLD.ground),
    new THREE.MeshStandardMaterial({ map: paintGround(rng), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Ocean ---
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 760),
    new THREE.MeshPhysicalMaterial({
      color: CFG.palette.ocean,
      roughness: 0.07,
      metalness: 0.08,
      transparent: true,
      opacity: 0.95,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(520, 0.04, 0);
  scene.add(ocean);
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 760),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(324, 0.06, 0);
  scene.add(foam);

  // --- Buildings ---
  const facadeMats = [
    '#f2e3c9',
    '#f0c8a0',
    '#cfe0d0',
    '#e8a48c',
    '#e0d0b0',
    '#d8cdb8',
  ].map((base) => {
    const { map, emissiveMap } = facadeTextures(base, 0.42, rng);
    return new THREE.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: 0xffc27a,
      emissiveIntensity: 0.85,
      roughness: 0.85,
    });
  });
  const glassTex = facadeTextures('#7fa8c0', 0.5, rng);
  const glassMat = new THREE.MeshPhysicalMaterial({
    map: glassTex.map,
    emissiveMap: glassTex.emissiveMap,
    emissive: 0xffc27a,
    emissiveIntensity: 0.7,
    color: 0xbdd8e8,
    roughness: 0.18,
    metalness: 0.75,
  });

  const { xBlocks, zBlocks } = blockIntervals();
  const isDowntown = (cx, cz) => cx >= -120 && cx <= 120 && cz >= -320 && cz <= -40;

  for (const [x0, x1] of xBlocks) {
    for (const [z0, z1] of zBlocks) {
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const w = x1 - x0;
      const d = z1 - z0;
      if (w < 24 || d < 24) continue;
      if (cx > 200 && cz > 100) continue; // marina quarter
      if (cx > 236) continue; // beach
      if (isDowntown(cx, cz)) {
        // Glass tower with a setback crown.
        const bw = w * rng.range(0.55, 0.75);
        const bd = d * rng.range(0.55, 0.75);
        const h = rng.range(42, 105);
        const towerGeo = new THREE.BoxGeometry(bw, h, bd);
        scaleUVs(towerGeo, Math.max(bw, bd) / 14, h / 14);
        const tower = new THREE.Mesh(towerGeo, glassMat);
        tower.position.set(cx, h / 2, cz);
        const crownGeo = new THREE.BoxGeometry(bw * 0.55, h * 0.14, bd * 0.55);
        scaleUVs(crownGeo, bw / 28, h / 100);
        const crown = new THREE.Mesh(crownGeo, glassMat);
        crown.position.set(cx, h + h * 0.07, cz);
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.2, 12, 6),
          new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.8 }),
        );
        antenna.position.set(cx, h + h * 0.14 + 6, cz);
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2222, emissiveIntensity: 3 }),
        );
        beacon.position.set(cx, h + h * 0.14 + 12, cz);
        scene.add(tower, crown, antenna, beacon);
        tower.castShadow = true;
        tower.receiveShadow = true;
        colliders.push({ minX: cx - bw / 2, maxX: cx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2 });
        counts.buildings++;
      } else {
        // One to three low pastel buildings per block.
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) {
          const bw = Math.min(w * rng.range(0.32, 0.6), 46);
          const bd = Math.min(d * rng.range(0.32, 0.6), 46);
          const bx = cx + rng.range(-1, 1) * (w / 2 - bw / 2 - 3);
          const bz = cz + rng.range(-1, 1) * (d / 2 - bd / 2 - 3);
          const h = rng.range(7, 26);
          const rounded = rng.chance(0.5);
          const geo = rounded
            ? new THREE.RoundedBoxGeometry(bw, h, bd, 3, 1.4)
            : new THREE.BoxGeometry(bw, h, bd);
          scaleUVs(geo, Math.max(bw, bd) / 14, h / 14);
          const b = new THREE.Mesh(geo, rng.pick(facadeMats));
          b.position.set(bx, h / 2, bz);
          b.castShadow = true;
          b.receiveShadow = true;
          scene.add(b);
          if (rng.chance(0.5)) {
            const top = new THREE.Mesh(
              new THREE.BoxGeometry(bw * 0.5, rng.range(2, 4), bd * 0.5),
              b.material,
            );
            top.position.set(bx, h + 1.5, bz);
            top.castShadow = true;
            scene.add(top);
          }
          if (rng.chance(0.4)) {
            const ac = new THREE.Mesh(
              new THREE.BoxGeometry(2.4, 1.1, 1.6),
              new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.7, metalness: 0.4 }),
            );
            ac.position.set(bx + bw * 0.25, h + 0.55, bz);
            scene.add(ac);
          }
          colliders.push({
            minX: bx - bw / 2,
            maxX: bx + bw / 2,
            minZ: bz - bd / 2,
            maxZ: bz + bd / 2,
          });
          counts.buildings++;
        }
      }
    }
  }

  // --- Palms (instanced trunks + fronds) ---
  const palmSpots = [];
  for (let z = -300; z <= 300; z += 20) {
    palmSpots.push([227.5, z]);
    if (z < 110 || z > 265) palmSpots.push([242.5, z]);
  }
  for (let z = -290; z <= 290; z += 26) palmSpots.push([268, z + rng.range(-4, 4)]);
  for (let i = 0; i < 14; i++) {
    palmSpots.push([rng.range(-280, 210), rng.range(-280, 280)]);
  }
  const trunkCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.15, 3, 0.05),
    new THREE.Vector3(0.45, 5.6, 0.1),
  );
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 6, 0.16, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const frondGeo = new THREE.ConeGeometry(0.85, 4.6, 4);
  frondGeo.scale(1, 1, 0.14);
  frondGeo.translate(0, 2.3, 0); // pivot at the frond's base, tip outward
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x4da35c,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palmSpots.length * 9);
  const dummy = new THREE.Object3D();
  palmSpots.forEach(([x, z], i) => {
    const s = rng.range(0.85, 1.25);
    const yaw = rng.range(0, Math.PI * 2);
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    const topX = x + Math.sin(yaw) * 0.1 + 0.45 * Math.cos(yaw) * s;
    const topZ = z + Math.cos(yaw) * 0.1 - 0.45 * Math.sin(yaw) * s;
    for (let f = 0; f < 9; f++) {
      const fa = (f / 9) * Math.PI * 2 + rng.range(-0.2, 0.2);
      dummy.position.set(topX, 5.6 * s, topZ);
      dummy.rotation.set(0, 0, 0);
      dummy.rotation.order = 'YXZ';
      dummy.rotation.y = fa;
      dummy.rotation.x = rng.range(1.35, 1.8); // arc outward, tip drooping down
      dummy.scale.set(s * rng.range(0.9, 1.15), s, s);
      dummy.updateMatrix();
      fronds.setMatrixAt(i * 9 + f, dummy.matrix);
    }
  });
  trunks.castShadow = true;
  fronds.castShadow = true;
  scene.add(trunks, fronds);
  counts.palms = palmSpots.length;

  // --- Street lamps (instanced) ---
  const lampSpots = [];
  for (const a of CFG.avenues) {
    for (let z = -290; z <= 290; z += 58) lampSpots.push([a.x + 7.5, z]);
  }
  for (const s of CFG.streets) {
    for (let x = -290; x <= 210; x += 58) lampSpots.push([x, s.z + 7.5]);
  }
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 7, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2e3430, roughness: 0.6, metalness: 0.5 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const headGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x332e18,
    emissive: 0xffe6a8,
    emissiveIntensity: 2.2,
  });
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    dummy.position.set(x, 3.5, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 7.1, z);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
  });
  scene.add(poles, heads);
  counts.lamps = lampSpots.length;

  // --- Beach umbrellas + towels ---
  const umbrellaColors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x9b59b6];
  for (let i = 0; i < 9; i++) {
    const x = rng.range(262, 305);
    const z = rng.range(-280, 280);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6),
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 }),
    );
    pole.position.set(x, 1.15, z);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: rng.pick(umbrellaColors), roughness: 0.85, side: THREE.DoubleSide }),
    );
    canopy.position.set(x, 2.4, z);
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.04, 0.85),
      new THREE.MeshStandardMaterial({ color: rng.pick(umbrellaColors), roughness: 1 }),
    );
    towel.position.set(x + 1.6, 0.05, z + 0.8);
    towel.rotation.y = rng.range(0, 3);
    pole.castShadow = true;
    canopy.castShadow = true;
    scene.add(pole, canopy, towel);
  }

  // --- Welcome sign over Ocean Drive ---
  {
    const [sc, sg] = makeCanvas(1024, 128);
    sg.fillStyle = '#0e3a3a';
    sg.fillRect(0, 0, 1024, 128);
    sg.strokeStyle = '#ff9e57';
    sg.lineWidth = 6;
    sg.strokeRect(6, 6, 1012, 116);
    sg.fillStyle = '#ffd9a0';
    sg.font = 'bold 64px Arial, sans-serif';
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.shadowColor = '#ff9e57';
    sg.shadowBlur = 18;
    sg.fillText('S O L M A R   B A Y', 512, 52);
    sg.shadowBlur = 0;
    sg.fillStyle = '#7fd9c9';
    sg.font = 'bold 26px Arial, sans-serif';
    sg.fillText('OCEAN DRIVE  •  EST. 1962', 512, 102);
    const signTex = new THREE.CanvasTexture(sc);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2e3430, roughness: 0.6, metalness: 0.4 });
    for (const x of [226, 244]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 7.4, 10), postMat);
      post.position.set(x, 3.7, 18);
      post.castShadow = true;
      scene.add(post);
    }
    const panelMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.55,
      roughness: 0.6,
    });
    for (const face of [1, -1]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(19, 2.4), panelMat);
      panel.position.set(235, 6.6, 18 + face * 0.1);
      if (face < 0) panel.rotation.y = Math.PI;
      scene.add(panel);
    }
  }

  // --- Marina: piers, boats, crew ---
  const marina = { center: new THREE.Vector3(355, 0, 195), boats: [], crew: [] };
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.95 });
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(10, 0.7, 135), new THREE.MeshStandardMaterial({ color: 0xa89a80, roughness: 0.95 }));
  walkway.position.set(317, 0.35, 190);
  walkway.receiveShadow = true;
  scene.add(walkway);
  for (const pz of [150, 190, 230]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(68, 0.55, 4.2), woodMat);
    pier.position.set(354, 0.42, pz);
    pier.receiveShadow = true;
    pier.castShadow = true;
    scene.add(pier);
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 1.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x5e4630, roughness: 1 }),
      );
      post.position.set(326 + i * 11, 0.4, pz + 2.4);
      scene.add(post);
    }
  }
  const boatSpots = [
    [348, 168, 0.06],
    [368, 172, -0.04],
    [346, 208, 0.1],
    [366, 212, -0.08],
    [352, 248, 0.05],
    [370, 244, -0.06],
  ];
  for (const [bx, bz, rot] of boatSpots) {
    const boat = buildBoat(rng, rng.range(8, 12));
    boat.position.set(bx, 0.02, bz);
    boat.rotation.y = rot;
    scene.add(boat);
    marina.boats.push(boat);
    counts.boats++;
  }
  // Three crew on the docks.
  const crewSpots = [
    [316, 160, Math.PI / 2],
    [317, 200, Math.PI / 2],
    [316, 236, Math.PI / 2],
  ];
  for (const [cx, cz, rot] of crewSpots) {
    const fig = buildFigure(rng);
    fig.group.position.set(cx, 0.7, cz);
    fig.group.rotation.y = rot;
    scene.add(fig.group);
    marina.crew.push({ group: fig.group, phase: rng.range(0, Math.PI * 2), baseY: 0.7 });
    counts.crew++;
  }

  return { colliders, counts, marina };
}
