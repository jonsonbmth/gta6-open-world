// AURELIA BAY city: a street grid with WIDE sidewalks, named shopfronts at
// street level, a market street, and a beachfront. Buildings sit on a tidy
// grid with consistent setbacks and a clean street wall; the roadside is
// never a blank wall — every avenue-facing ground floor is a shop with a
// sign, an awning and goods on display.

import { makeRng } from './util.js';
import {
  asphaltTexture,
  sidewalkTexture,
  sandTexture,
  waterTexture,
  facadeTexture,
  shopSignTexture,
  awningTexture,
  posterTexture,
} from './textures.js';

export const SHOP_NAMES = [
  'SOL & SAGE', 'PALMA DELI', 'TIDE POOL TACOS', 'MARINA BOOKS',
  'GILDED QUAY CAFE', 'CORAL CUPS', 'EMBER ROAST', 'VIDRIO SURF',
  'LANTERN NOODLES', 'SUNSET FLOWERS', 'AURELIA BAKERY', 'PIER 9 PIZZA',
  'DUNE RECORDS', 'KITE & KALE', 'BAY CYCLE CO', 'MANGO MORNINGS',
];

export const DISTRICTS = [
  { name: 'Vidrio Dunes', x: -120, z: -120, color: '#d9c27a' },
  { name: 'Coral Market', x: 0, z: 40, color: '#7fb069' },
  { name: 'Palma Row', x: 90, z: -60, color: '#c98d5a' },
  { name: 'Gilded Quay', x: -90, z: 60, color: '#7fa8c9' },
  { name: 'Marina Row', x: 60, z: 110, color: '#5a8fb0' },
  { name: 'Ember Heights', x: 120, z: 60, color: '#b06a8a' },
  { name: 'Ember Strand', x: -150, z: 0, color: '#5ab0a0' },
  { name: 'Sunset Mile', x: 0, z: -60, color: '#d9a05a' },
  { name: 'Lantern District', x: 40, z: -130, color: '#8a7fc9' },
];

// Avenue centerlines (roads run north-south along x, east-west along z).
export const AVENUES = [-120, -60, 0, 60, 120];
export const STREETS = [-120, -80, -40, 0, 40, 80, 120];
export const ROAD_HALF = 8; // main avenues are 16 wide
export const CROSS_HALF = 6; // cross streets are 12 wide
export const WALK = 7; // sidewalks are 7 wide — visibly wide, full of people

export function buildCity(scene) {
  const rng = makeRng(20261123);
  const group = new THREE.Group();
  scene.add(group);
  const out = { shops: [], stalls: [], palms: [], crossings: [] };

  const asphalt = new THREE.MeshLambertMaterial({ map: asphaltTexture() });
  const walkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture() });
  const sandMat = new THREE.MeshLambertMaterial({ map: sandTexture() });
  const waterMat = new THREE.MeshLambertMaterial({ map: waterTexture() });
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x7fae5f });

  function box(w, h, d, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }

  // Base ground (grass/dirt under everything).
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // Ocean + beach on the west edge.
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(220, 560), waterMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-290, 0.02, 0);
  group.add(ocean);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(72, 560), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-158, 0.01, 0);
  sand.receiveShadow = true;
  group.add(sand);
  // Boardwalk along the sand.
  box(6, 0.3, 560, new THREE.MeshLambertMaterial({ color: 0xa9855e }), -120, 0.15, 0);

  // Roads: avenues north-south, streets east-west.
  for (const x of AVENUES) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 340), asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    road.receiveShadow = true;
    group.add(road);
  }
  for (const z of STREETS) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(340, CROSS_HALF * 2), asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    road.receiveShadow = true;
    group.add(road);
  }
  // Yellow center lines on avenues.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8c832 });
  for (const x of AVENUES) {
    for (let z = -160; z < 160; z += 10) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.05, z);
      group.add(dash);
    }
  }
  // Zebra crossings at every avenue/street junction.
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf2f2ee });
  for (const x of AVENUES) {
    for (const z of STREETS) {
      for (let i = -3; i <= 3; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5), zebraMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x + i * 2, 0.05, z - CROSS_HALF - 2.5);
        group.add(stripe);
      }
      out.crossings.push({ x, z });
    }
  }

  // Sidewalks: wide slabs flanking every road.
  for (const x of AVENUES) {
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(WALK, 340), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x + side * (ROAD_HALF + WALK / 2), 0.06, 0);
      walk.receiveShadow = true;
      group.add(walk);
    }
  }
  for (const z of STREETS) {
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(340, WALK), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(0, 0.06, z + side * (CROSS_HALF + WALK / 2));
      walk.receiveShadow = true;
      group.add(walk);
    }
  }

  // Buildings: one per block face, aligned to the grid, heights planned in
  // tiers (taller toward the center), facades from 6 textured variants.
  const facadeMats = [];
  for (let v = 0; v < 6; v++) {
    facadeMats.push(new THREE.MeshLambertMaterial({ map: facadeTexture(v, 100 + v * 17) }));
  }
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b6259 });
  const roofProps = [];
  function building(x, z, w, d, h, variant, shopName) {
    const mat = facadeMats[variant % facadeMats.length];
    const b = box(w, h, d, mat, x, h / 2, z);
    b.castShadow = true;
    // Roof slab + props (AC units, water tank, antenna).
    box(w + 0.6, 0.5, d + 0.6, roofMat, x, h + 0.25, z);
    const nProps = 1 + Math.floor(rng.next() * 3);
    for (let i = 0; i < nProps; i++) {
      const px = x + rng.range(-w / 3, w / 3);
      const pz = z + rng.range(-d / 3, d / 3);
      if (rng.chance(0.5)) {
        const ac = box(2.2, 1.1, 1.6, roofMat, px, h + 1, pz);
        ac.castShadow = true;
        roofProps.push(ac);
      } else {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10),
          new THREE.MeshLambertMaterial({ color: 0x8a7f72 }),
        );
        tank.position.set(px, h + 1.6, pz);
        tank.castShadow = true;
        group.add(tank);
        roofProps.push(tank);
      }
    }
    if (shopName) addShopfront(x, z, w, d, h, shopName);
    return b;
  }

  // Shopfront: a glass front, a big named sign board, a striped awning, and
  // goods on display (crates, racks, a sandwich board) with room for people
  // to browse outside. Faces the nearest avenue.
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fc8dd, transparent: true, opacity: 0.55 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3a332c });
  const signColors = [
    ['#274b73', '#ffffff'], ['#8a2f2f', '#ffe9a8'], ['#2f6b4f', '#ffffff'],
    ['#c96a1e', '#ffffff'], ['#5b2f6b', '#ffd98a'], ['#1e6b6b', '#ffffff'],
  ];
  function addShopfront(x, z, w, d, h, name) {
    // The shop faces the avenue: pick the avenue side nearest to the building.
    let faceX = x;
    let faceZ = z;
    let ry = 0;
    let fx = 0;
    let fz = 0;
    let nearest = Infinity;
    for (const ax of AVENUES) {
      const dist = Math.abs(ax - x) - w / 2;
      if (dist < nearest) { nearest = dist; faceX = ax; }
    }
    const dx = faceX - x;
    if (Math.abs(dx) > 0.5) {
      fx = Math.sign(dx);
      faceZ = z;
      ry = fx > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      // Faces a cross street instead.
      let nearestZ = Infinity;
      for (const sz of STREETS) {
        const dist = Math.abs(sz - z) - d / 2;
        if (dist < nearestZ) { nearestZ = dist; faceZ = sz; }
      }
      fz = Math.sign(faceZ - z);
      ry = fz > 0 ? 0 : Math.PI;
    }
    const frontX = x + fx * (w / 2 + 0.15);
    const frontZ = z + fz * (d / 2 + 0.15);
    const wide = fx !== 0 ? d : w;
    // Glass storefront.
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(wide - 2, 14), 3.4), glassMat);
    glass.position.set(frontX, 1.9, frontZ);
    glass.rotation.y = ry;
    group.add(glass);
    // Sign board with the shop's name.
    const [bg, fg] = signColors[Math.floor(rng.next() * signColors.length)];
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(wide - 1, 15), 2.4),
      new THREE.MeshLambertMaterial({ map: shopSignTexture(name, bg, fg) }),
    );
    sign.position.set(frontX + fx * 0.1, 4.6, frontZ + fz * 0.1);
    sign.rotation.y = ry;
    group.add(sign);
    // Striped awning.
    const awning = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(wide - 1, 15), 2.2),
      new THREE.MeshLambertMaterial({ map: awningTexture(bg, '#f5efe0'), side: THREE.DoubleSide }),
    );
    awning.position.set(frontX + fx * 1.1, 3.6, frontZ + fz * 1.1);
    awning.rotation.y = ry;
    awning.rotation.x = ry === 0 || ry === Math.PI ? -0.5 : 0;
    awning.rotation.z = fx !== 0 ? (fx > 0 ? 0.5 : -0.5) : 0;
    if (fx !== 0) awning.rotation.x = 0;
    group.add(awning);
    // Goods on display: crates + a rack outside the door.
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x9a7a4e });
    const fruitMat = new THREE.MeshLambertMaterial({ color: 0xd97b2f });
    for (let i = 0; i < 3; i++) {
      const cx = frontX + fx * (1.6 + i * 1.4) + (fz !== 0 ? (i - 1) * 1.4 : 0);
      const cz = frontZ + fz * (1.6 + i * 1.4) + (fx !== 0 ? (i - 1) * 1.4 : 0);
      const crate = box(1.1, 0.8, 1.1, crateMat, cx, 0.4, cz);
      crate.castShadow = true;
      const goods = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), fruitMat);
      goods.position.set(cx, 1.05, cz);
      group.add(goods);
    }
    out.shops.push({ name, x: frontX, z: frontZ, fx, fz });
  }

  // Fill the blocks: buildings between avenues and streets. Avenues are 60
  // apart with 16-wide roads + 7-wide sidewalks, so each block band is 30
  // wide (centers midway between avenues); streets are 40 apart with
  // 12-wide roads + 7-wide sidewalks, so each block is 14 deep. Buildings
  // sit INSIDE those bands with a setback — never on a road or sidewalk.
  // Every avenue-facing ground floor is a shop.
  let shopIdx = 0;
  const blockXs = [-90, -30, 30, 90];
  const blockZs = [-100, -60, -20, 20, 60, 100];
  for (const bx of blockXs) {
    for (const bz of blockZs) {
      const distCenter = Math.hypot(bx, bz);
      const tall = distCenter < 70;
      const h = tall ? rng.range(16, 30) : rng.range(8, 18);
      const w = rng.range(18, 26);
      const d = rng.range(10, 13);
      const name = SHOP_NAMES[shopIdx++ % SHOP_NAMES.length];
      building(bx, bz, w, d, h, Math.floor(rng.next() * 6), name);
    }
  }

  // Guaranteed hero shops along Sunset Mile near the chase shot (z -60..60),
  // so shots 1 and 2 always have named storefronts in frame. They sit just
  // behind the sidewalk (x = ±20, w = 8) at block centers.
  const heroShops = [
    { x: -20, z: -60, name: 'MANGO MORNINGS' },
    { x: 20, z: -60, name: 'SOL & SAGE' },
    { x: -20, z: -20, name: 'PALMA DELI' },
    { x: 20, z: -20, name: 'TIDE POOL TACOS' },
    { x: -20, z: 20, name: 'CORAL CUPS' },
    { x: 20, z: 20, name: 'EMBER ROAST' },
    { x: -20, z: 60, name: 'LANTERN NOODLES' },
    { x: 20, z: 60, name: 'AURELIA BAKERY' },
  ];
  for (const s of heroShops) {
    building(s.x, s.z, 8, 12, 12, Math.floor(rng.next() * 6), s.name);
  }
  // Hero shops along the coastal road for shot 4 (x = -100, just behind the
  // east sidewalk of Ember Strand Ave).
  const coastShops = [
    { x: -100, z: -60, name: 'DUNE RECORDS' },
    { x: -100, z: -20, name: 'VIDRIO SURF' },
    { x: -100, z: 20, name: 'PIER 9 PIZZA' },
    { x: -100, z: 60, name: 'SUNSET FLOWERS' },
  ];
  for (const s of coastShops) {
    building(s.x, s.z, 8, 12, 10, Math.floor(rng.next() * 6), s.name);
  }

  // Coral Market (z = 40): a pedestrian shopping street with stalls,
  // colorful canopies, string lights and crates — the on-foot shot's home.
  const canopyColors = ['#d94f3d', '#2f7fd0', '#e8a020', '#3d9e5f', '#8a4fd0', '#e87ab0'];
  for (let i = 0; i < 10; i++) {
    const sx = -55 + i * 12;
    const sz = 40 + (i % 2 === 0 ? -3.5 : 3.5);
    // Stall table + posts + canopy.
    box(4.5, 0.9, 2.4, new THREE.MeshLambertMaterial({ color: 0x7a5a3a }), sx, 0.9, sz);
    const canopyMat = new THREE.MeshLambertMaterial({
      map: awningTexture(canopyColors[i % canopyColors.length], '#f5efe0'),
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.4), canopyMat);
    canopy.rotation.x = -Math.PI / 2 + 0.25;
    canopy.position.set(sx, 3.1, sz);
    canopy.castShadow = true;
    group.add(canopy);
    for (const [px, pz] of [[-2.2, -1.3], [2.2, -1.3], [-2.2, 1.3], [2.2, 1.3]]) {
      box(0.15, 2.6, 0.15, frameMat, sx + px, 1.3, sz + pz);
    }
    // Goods on the stall: colorful produce piles.
    const goodsColors = [0xe86a2f, 0x7fb03a, 0xd94040, 0xe8c832];
    for (let g = 0; g < 4; g++) {
      const pile = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshLambertMaterial({ color: goodsColors[g % goodsColors.length] }),
      );
      pile.position.set(sx - 1.5 + g, 1.55, sz + (g % 2 === 0 ? -0.5 : 0.5));
      pile.scale.y = 0.7;
      group.add(pile);
    }
    out.stalls.push({ x: sx, z: sz });
  }
  // String lights across the market street.
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
  for (let x = -60; x <= 60; x += 6) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 14, 4),
      new THREE.MeshBasicMaterial({ color: 0x222222 }),
    );
    wire.rotation.x = Math.PI / 2;
    wire.position.set(x, 5.2, 40);
    group.add(wire);
    for (let k = -3; k <= 3; k++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), bulbMat);
      bulb.position.set(x, 5.1, 40 + k * 2);
      group.add(bulb);
    }
  }

  // Palm trees lining the avenues and the beach.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8a4f, side: THREE.DoubleSide });
  function palm(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 7, 7), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = rng.range(-0.08, 0.08);
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), frondMat);
      frond.position.y = 7;
      frond.rotation.y = (i / 7) * Math.PI * 2;
      frond.rotation.x = -0.5;
      frond.translateY(0.4);
      frond.translateZ(2);
      g.add(frond);
    }
    const coconut = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 5),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2a }),
    );
    coconut.position.y = 6.8;
    g.add(coconut);
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    group.add(g);
    out.palms.push({ x, z });
    return g;
  }
  for (const x of AVENUES) {
    for (let z = -150; z <= 150; z += 30) {
      palm(x - ROAD_HALF - WALK - 1, z + rng.range(-2, 2), rng.range(0.85, 1.2));
      palm(x + ROAD_HALF + WALK + 1, z + 15 + rng.range(-2, 2), rng.range(0.85, 1.2));
    }
  }
  for (let z = -160; z <= 160; z += 18) {
    palm(-138 + rng.range(-3, 3), z, rng.range(0.9, 1.3));
  }

  // Beach props: umbrellas, towels, a lifeguard tower, the pier.
  const umbrellaColors = [0xe84f6f, 0x2f9ed0, 0xe8a020, 0x3d9e5f];
  for (let i = 0; i < 12; i++) {
    const ux = -150 + rng.range(-12, 12);
    const uz = -140 + i * 26 + rng.range(-4, 4);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), frameMat);
    pole.position.set(ux, 1.3, uz);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 0.9, 8),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length], side: THREE.DoubleSide }),
    );
    top.position.set(ux, 2.8, uz);
    top.castShadow = true;
    group.add(top);
    const towel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.2),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[(i + 1) % umbrellaColors.length] }),
    );
    towel.rotation.x = -Math.PI / 2;
    towel.position.set(ux + 1.6, 0.08, uz + 0.5);
    group.add(towel);
  }
  // Lifeguard tower.
  box(3, 0.4, 3, frameMat, -150, 3.4, -60);
  for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
    box(0.25, 3.4, 0.25, frameMat, -150 + lx, 1.7, -60 + lz);
  }
  box(3.4, 2.2, 3.4, new THREE.MeshLambertMaterial({ color: 0xe84f3d }), -150, 4.7, -60);
  // Pier reaching into the ocean.
  box(60, 0.5, 8, new THREE.MeshLambertMaterial({ color: 0x8a6a48 }), -215, 0.6, 20);
  for (let px = -190; px >= -240; px -= 8) {
    box(0.5, 2.4, 0.5, frameMat, px, -0.6, 17);
    box(0.5, 2.4, 0.5, frameMat, px, -0.6, 23);
  }
  const ferris = new THREE.Group();
  const wheel = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.5, 8, 24),
    new THREE.MeshLambertMaterial({ color: 0xe8a020 }),
  );
  ferris.add(wheel);
  for (let i = 0; i < 8; i++) {
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }),
    );
    const a = (i / 8) * Math.PI * 2;
    cab.position.set(Math.cos(a) * 9, Math.sin(a) * 9, 0);
    ferris.add(cab);
  }
  ferris.position.set(-238, 12, 20);
  group.add(ferris);

  // Street furniture: lamps, hydrants, benches, bus stops, posters.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2f3336 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xfff2b8 });
  for (const x of AVENUES) {
    for (let z = -140; z <= 140; z += 40) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), lampMat);
      pole.position.set(x + ROAD_HALF + 0.6, 3.5, z);
      pole.castShadow = true;
      group.add(pole);
      const arm = box(1.8, 0.12, 0.12, lampMat, x + ROAD_HALF - 0.3, 7, z);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lampGlow);
      head.position.set(x + ROAD_HALF - 1.1, 6.9, z);
      group.add(head);
    }
  }
  const hydrantMat = new THREE.MeshLambertMaterial({ color: 0xd94040 });
  for (let i = 0; i < 20; i++) {
    const hx = AVENUES[i % AVENUES.length] + (i % 2 === 0 ? 1 : -1) * (ROAD_HALF + 1.5);
    const hz = -140 + i * 14;
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 8), hydrantMat);
    hyd.position.set(hx, 0.45, hz);
    hyd.castShadow = true;
    group.add(hyd);
  }
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  for (let i = 0; i < 16; i++) {
    const bx = AVENUES[i % AVENUES.length] + (i % 2 === 0 ? 1 : -1) * (ROAD_HALF + WALK - 1);
    const bz = -130 + i * 17;
    box(2.4, 0.18, 0.7, benchMat, bx, 0.55, bz);
    box(2.4, 0.7, 0.15, benchMat, bx, 0.95, bz + 0.3);
    box(0.15, 0.55, 0.6, benchMat, bx - 1, 0.28, bz);
    box(0.15, 0.55, 0.6, benchMat, bx + 1, 0.28, bz);
  }
  // Posters on avenue walls.
  const posterLines = [['AURELIA', 'BAY NIGHTS'], ['SURF', 'FESTIVAL'], ['PIER 9', 'LIVE MUSIC']];
  for (let i = 0; i < 9; i++) {
    const px = AVENUES[i % AVENUES.length] + (i % 2 === 0 ? 1 : -1) * (ROAD_HALF + WALK + 0.3);
    const pz = -120 + i * 30;
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.8),
      new THREE.MeshLambertMaterial({ map: posterTexture(posterLines[i % 3], '#274b73', '#ffffff') }),
    );
    poster.position.set(px, 2.2, pz);
    poster.rotation.y = px > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(poster);
  }

  return out;
}
