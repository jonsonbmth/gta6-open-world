// Solmar Bay itself: a seeded coastal grid city. Roads every 48 units, blocks
// of procedural buildings with lit windows, setbacks, roof clutter and neon
// storefronts, a sand beach and ocean to the south, palms along the coastal
// highway, traffic lights, billboards and the landmarks the jobs are about.
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

// Canvas text texture for signs and neon billboards.
function textTexture(text, fg, bg, w = 512, h = 128, font = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.font = `900 ${font}px Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = fg;
  g.shadowBlur = 18;
  g.fillStyle = fg;
  g.fillText(text, w / 2, h / 2 + 4);
  g.shadowBlur = 0;
  g.fillStyle = fg;
  g.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const STORE_SIGNS = [
  ['CAFE', '#ffd166', '#2b1d3a'], ['TACOS', '#7dff8a', '#3a1d1d'], ['HOTEL', '#7dd7ff', '#1d2b3a'],
  ['BAR', '#ff7d9e', '#2b1d2b'], ['PIZZA', '#ffb35c', '#33241a'], ['SURF SHOP', '#8affd9', '#123a2e'],
  ['DONUTS', '#ff9ecf', '#3a1d33'], ['LAUNDROMAT', '#a8c8ff', '#1d243a'],
];

export function createCity(r, random) {
  const group = new THREE.Group();
  const colliders = []; // {minX,maxX,minZ,maxZ} building footprints
  const buildings = []; // for the minimap + map screen
  const roadMeshes = [];
  const { scene, geo, mat, facades, roadTex } = r;

  function box(m, sx, sy, sz, x, y, z, shadow = false) {
    const mesh = new THREE.Mesh(geo.box, m);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
    group.add(mesh);
    return mesh;
  }

  // Neon billboard: a glowing canvas-text plane on two posts (or a roof).
  function billboard(text, fg, bg, x, y, z, rotY, w = 18, h = 4.5) {
    const tex = textTexture(text, fg, bg, 512, 128, 58);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    group.add(mesh);
    const back = new THREE.Mesh(geo.box, mat(0x1a1d22));
    back.scale.set(w + 0.6, h + 0.6, 0.4);
    back.rotation.y = rotY;
    back.position.set(x, y, z);
    // Sit the backing just behind the face, along the plane's normal.
    back.position.x -= Math.sin(rotY) * 0.35;
    back.position.z -= Math.cos(rotY) * 0.35;
    group.add(back);
    return mesh;
  }

  // Ground: city slab, then sand, then the ocean plane with a warm sun
  // glitter path running toward the sunset.
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
  const glitterGeo = new THREE.PlaneGeometry(90, 520);
  glitterGeo.rotateX(-Math.PI / 2);
  glitterGeo.rotateY(-0.73);
  const glitter = new THREE.Mesh(glitterGeo, new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: 0.2, depthWrite: false }));
  glitter.position.set(-140, 0.06, 380);
  group.add(glitter);

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

  // Zebra crossings over the coastal highway and downtown avenues.
  const zebraMat = mat(0xf2f2ee);
  function zebra(x, z, horizontal) {
    for (let i = -2; i <= 2; i += 1) {
      const s = new THREE.Mesh(geo.box, zebraMat);
      if (horizontal) { s.scale.set(0.9, 0.06, 11); s.position.set(x + i * 2.2, 0.09, z); }
      else { s.scale.set(11, 0.06, 0.9); s.position.set(x, 0.09, z + i * 2.2); }
      group.add(s);
    }
  }
  zebra(48, 192, true);
  zebra(96, 192, true);
  zebra(144, 192, true);
  zebra(-48, 192, true);
  zebra(-96, 192, true);
  zebra(-144, 192, true);
  zebra(0, 0, true);
  zebra(48, 0, false);
  zebra(-48, 48, true);
  zebra(0, -48, false);

  // Traffic lights at the busiest intersections.
  function trafficLight(x, z, rotY, greenOn) {
    const g = new THREE.Group();
    const poleMat = mat(0x2e3238);
    const pole = new THREE.Mesh(geo.cyl, poleMat);
    pole.scale.set(0.35, 7, 0.35);
    pole.position.y = 3.5;
    g.add(pole);
    const arm = new THREE.Mesh(geo.box, poleMat);
    arm.scale.set(0.3, 0.3, 4.5);
    arm.position.set(0, 6.6, 2);
    g.add(arm);
    const head = new THREE.Mesh(geo.box, poleMat);
    head.scale.set(0.9, 2.4, 0.9);
    head.position.set(0, 5.6, 4.2);
    g.add(head);
    const lampCols = [0xff2a2a, 0xffc42a, 0x2aff66];
    lampCols.forEach((c, i) => {
      const on = (i === 2) === greenOn;
      const lamp = new THREE.Mesh(geo.sph, mat(c, { emissive: c, emissiveIntensity: on ? 2.2 : 0.25 }));
      lamp.scale.set(0.55, 0.55, 0.55);
      lamp.position.set(0, 6.4 - i * 0.75, 4.75);
      g.add(lamp);
    });
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
  }
  trafficLight(52, 186, Math.PI, true);
  trafficLight(100, 186, Math.PI, false);
  trafficLight(148, 186, Math.PI, true);
  trafficLight(-52, 186, Math.PI, true);
  trafficLight(-100, 186, Math.PI, false);
  trafficLight(-148, 186, Math.PI, true);
  trafficLight(4, -6, 0, true);
  trafficLight(-44, 52, Math.PI / 2, false);

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
      // Rooftop cap + parapet rim.
      box(mat(0x6b6258), w + 0.6, 1, d + 0.6, x, h + 0.5, z);
      // Tall towers get a setback penthouse; short ones get AC boxes.
      if (h > 45) {
        const top = new THREE.Mesh(geo.box, facadeMaterial(pick(random, facades)));
        top.scale.set(w * 0.6, 9, d * 0.6);
        top.position.set(x, h + 5.5, z);
        top.castShadow = true;
        group.add(top);
        box(mat(0x6b6258), w * 0.6 + 0.5, 0.8, d * 0.6 + 0.5, x, h + 10.2, z);
      } else if (random() < 0.7) {
        box(mat(0x8a8f96), range(random, 2, 3.4), 1.1, range(random, 1.6, 2.6), x + range(random, -w / 4, w / 4), h + 1.5, z + range(random, -d / 4, d / 4));
      }
      // Antenna with a red beacon on the tallest roofs.
      if (h > 55) {
        const ant = new THREE.Mesh(geo.cyl, mat(0x2e3238));
        ant.scale.set(0.18, 9, 0.18);
        ant.position.set(x + w / 4, h + 5.5, z - d / 4);
        group.add(ant);
        const beacon = new THREE.Mesh(geo.sph, mat(0xff2222, { emissive: 0xff2222, emissiveIntensity: 2.5 }));
        beacon.scale.set(0.7, 0.7, 0.7);
        beacon.position.set(x + w / 4, h + 10.2, z - d / 4);
        group.add(beacon);
      }
      // Ground-floor storefront: darker base band, a striped awning and a
      // glowing sign, so the street level reads as a real shopping street.
      if (h < 28 && random() < 0.55) {
        const [signText, signFg, signBg] = pick(random, STORE_SIGNS);
        box(mat(0x4a4038), w + 0.4, 2.6, d + 0.4, x, 1.3, z);
        const awn = box(mat(pick(random, [0xc23b3b, 0x2b6cb0, 0xd9a441, 0x3f7a5a])), w * 0.62, 0.18, 2.2, x, 2.9, z + d / 2 + 0.9);
        awn.rotation.x = 0.32;
        const signTex = textTexture(signText, signFg, signBg, 256, 64, 36);
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.55, 1.2),
          new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }),
        );
        sign.position.set(x, 3.9, z + d / 2 + 0.25);
        group.add(sign);
      }
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
  const towerTop = new THREE.Mesh(geo.box, facadeMaterial(facades[7]));
  towerTop.scale.set(15, 12, 15);
  towerTop.position.set(24, 116, -72);
  towerTop.castShadow = true;
  group.add(towerTop);
  box(mat(0x6b6258), 26.6, 1, 26.6, 24, 110.5, -72);
  const towerAnt = new THREE.Mesh(geo.cyl, mat(0x2e3238));
  towerAnt.scale.set(0.2, 12, 0.2);
  towerAnt.position.set(30, 128, -78);
  group.add(towerAnt);
  const towerBeacon = new THREE.Mesh(geo.sph, mat(0xff2222, { emissive: 0xff2222, emissiveIntensity: 2.5 }));
  towerBeacon.scale.set(0.9, 0.9, 0.9);
  towerBeacon.position.set(30, 134.5, -78);
  group.add(towerBeacon);
  colliders.push({ minX: 11, maxX: 37, minZ: -85, maxZ: -59 });
  buildings.push({ x: 24, z: -72, w: 26, d: 26, h: 110 });

  // Casino Royale Bay — wide, gold-trimmed, with a neon roof sign.
  const casino = new THREE.Mesh(geo.box, mat(0x8a6d3b, { emissive: 0x332211 }));
  casino.scale.set(30, 16, 22);
  casino.position.set(72, 8, -24);
  casino.castShadow = true;
  group.add(casino);
  box(mat(0xd9a441, { emissive: 0x6a4a00, emissiveIntensity: 0.6 }), 30.6, 0.8, 22.6, 72, 16.4, -24);
  billboard('CASINO ROYALE BAY', '#ffd166', '#3a2408', 72, 20, -12, 0, 24, 4);
  colliders.push({ minX: 57, maxX: 87, minZ: -35, maxZ: -13 });
  buildings.push({ x: 72, z: -24, w: 30, d: 22, h: 16 });

  // Neon billboards the chase drives past on the coastal highway. The chase
  // runs west, into the sunset, so the big ones face east — head-on for the
  // camera coming down the road.
  // South-side boards face north-east (rotY just short of pi) so a driver
  // coming west down Coastal Hwy reads them face-on instead of edge-on.
  billboard('FLAMINGO FM 101.2', '#ff7dd8', '#2b0a24', -185, 20, 215, Math.PI - 0.5, 24, 6);
  billboard('SOLMAR BAY', '#7dd7ff', '#0a1d2b', -120, 12, 210, Math.PI - 0.5, 20, 5);
  billboard('NEON TIDE', '#ff5c8a', '#1d0a24', 152, 9, 190, Math.PI, 16, 4);
  billboard('TACOS EL FARO', '#7dff8a', '#1d2b12', -40, 8, 180, 0, 16, 4);

  // Distant skyline silhouettes ringing the city, hazed by the fog.
  const skyMat = mat(0x5a4258);
  for (let i = 0; i < 30; i += 1) {
    const ang = (i / 30) * Math.PI * 2 + random() * 0.15;
    const rad = 560 + random() * 110;
    const sx = Math.cos(ang) * rad;
    const sz = Math.sin(ang) * rad;
    const sw = range(random, 22, 46);
    const sh = range(random, 30, 115);
    const sd = range(random, 22, 40);
    const sil = new THREE.Mesh(geo.box, skyMat);
    sil.scale.set(sw, sh, sd);
    sil.position.set(sx, sh / 2 - 2, sz);
    group.add(sil);
  }

  // Marina piers reaching into the ocean, with lamp posts at the ends.
  const pierMat = mat(0x7a5c3e);
  for (const px of [96, 120, 144]) {
    const pier = new THREE.Mesh(geo.box, pierMat);
    pier.scale.set(4, 1, 42);
    pier.position.set(px, 0.6, 232);
    group.add(pier);
    for (let pz = 214; pz <= 250; pz += 9) {
      for (const sx of [-1.9, 1.9]) {
        const post = new THREE.Mesh(geo.cyl, mat(0x5a4632));
        post.scale.set(0.3, 1.6, 0.3);
        post.position.set(px + sx, 1.4, pz);
        group.add(post);
      }
    }
    const lampPost = new THREE.Mesh(geo.cyl, mat(0x2e3238));
    lampPost.scale.set(0.3, 4.5, 0.3);
    lampPost.position.set(px + 1.6, 3.2, 250);
    group.add(lampPost);
    const lampHead = new THREE.Mesh(geo.sph, mat(0xffe9a8, { emissive: 0xffdf8a, emissiveIntensity: 1.6 }));
    lampHead.scale.set(0.9, 0.6, 0.9);
    lampHead.position.set(px + 1.6, 5.6, 250);
    group.add(lampHead);
  }

  // Boats: a real hull profile extruded across the beam, a mast, a triangular
  // sail, and a cabin — sailboats and a couple of yachts at the piers.
  function hullGeometry(len, beam) {
    const s = new THREE.Shape();
    s.moveTo(-len / 2, 0.2);
    s.lineTo(len / 2 - 2, 0.2);
    s.lineTo(len / 2, 1.15);
    s.lineTo(len / 2 - 0.6, 1.3);
    s.lineTo(-len / 2, 1.3);
    s.closePath();
    const g2 = new THREE.ExtrudeGeometry(s, { depth: beam, bevelEnabled: false });
    g2.translate(0, 0, -beam / 2);
    g2.rotateY(Math.PI / 2);
    return g2;
  }
  function sailGeometry(h, w) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0, h);
    s.lineTo(w, 0.9);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xf2ead8, side: THREE.DoubleSide });
  const sailMatOrange = new THREE.MeshLambertMaterial({ color: 0xe87a3a, side: THREE.DoubleSide });
  function boat(x, z, hullColor, withSail, len = 9, beam = 2.6) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(hullGeometry(len, beam), mat(hullColor));
    hull.castShadow = true;
    g.add(hull);
    const stripe = new THREE.Mesh(geo.box, mat(0x1a2733));
    stripe.scale.set(0.2, 0.25, len * 0.9);
    stripe.position.set(0, 1.05, 0);
    g.add(stripe);
    const cabin = new THREE.Mesh(geo.box, mat(0xe8e4da));
    cabin.scale.set(1.9, 1.1, 2.8);
    cabin.position.set(0, 1.8, 0.8);
    cabin.castShadow = true;
    g.add(cabin);
    if (withSail) {
      const mast = new THREE.Mesh(geo.cyl, mat(0x8a6d3b));
      mast.scale.set(0.16, 8, 0.16);
      mast.position.set(0, 5.2, -0.4);
      g.add(mast);
      const boom = new THREE.Mesh(geo.cyl, mat(0x8a6d3b));
      boom.scale.set(0.12, 3.4, 0.12);
      boom.rotation.x = Math.PI / 2;
      boom.position.set(0, 1.9, 0.6);
      g.add(boom);
      const sail = new THREE.Mesh(sailGeometry(6.4, 2.8), Math.random() < 0.5 ? sailMat : sailMatOrange);
      sail.position.set(0.1, 2.1, -0.4);
      sail.rotation.y = 0.12;
      g.add(sail);
      const jib = new THREE.Mesh(sailGeometry(5, 2.2), sailMat);
      jib.position.set(-0.1, 1.6, -0.4);
      jib.rotation.y = Math.PI - 0.12;
      jib.scale.x = -1;
      g.add(jib);
    } else {
      // Yacht: flybridge + radar arch instead of a sail.
      const bridge = new THREE.Mesh(geo.box, mat(0xe8e4da));
      bridge.scale.set(2.2, 1.0, 3.2);
      bridge.position.set(0, 2.8, 0.6);
      g.add(bridge);
      const arch = new THREE.Mesh(geo.box, mat(0x2e3238));
      arch.scale.set(0.25, 1.6, 2.4);
      arch.position.set(0, 3.4, 2.2);
      g.add(arch);
    }
    g.position.set(x, 0.1, z);
    g.rotation.y = (random() - 0.5) * 0.35;
    group.add(g);
    return g;
  }
  const hullColors = [0xe8e4da, 0x2b6cb0, 0xc23b3b, 0xd9a441, 0x3f7a5a];
  const boatSpots = [[92, 220], [100, 234], [116, 222], [124, 240], [140, 224], [148, 238], [108, 246], [132, 216]];
  for (const [bx, bz] of boatSpots) {
    boat(bx, bz, pick(random, hullColors), random() < 0.75, range(random, 8, 10.5), range(random, 2.4, 3));
  }
  boat(112, 252, 0xf2f2ee, false, 13, 3.6);
  boat(136, 254, 0x2b6cb0, false, 12, 3.4);

  // Crates, barrels and bollards around the marina and the port.
  const crateMat = mat(0xa8864e);
  const barrelMat = mat(0x4a6a7a);
  for (let i = 0; i < 16; i += 1) {
    const cx = range(random, 84, 168);
    const cz = range(random, 150, 185);
    box(crateMat, range(random, 1.4, 2.4), range(random, 1.2, 2), range(random, 1.4, 2.4), cx, 0.8, cz, true);
    if (i % 2 === 0) {
      const b = new THREE.Mesh(geo.cyl, barrelMat);
      b.scale.set(1.1, 1.6, 1.1);
      b.position.set(cx + range(random, 2, 4), 0.8, cz + range(random, -2, 2));
      b.castShadow = true;
      group.add(b);
    }
  }
  for (const bx of [88, 104, 128, 152, 168]) {
    const post = new THREE.Mesh(geo.cyl, mat(0x3a3f46));
    post.scale.set(0.5, 1.4, 0.5);
    post.position.set(bx, 0.7, 210);
    group.add(post);
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
    const cab = new THREE.Mesh(geo.box, mat(0x2e3238));
    cab.scale.set(4, 3, 4);
    cab.position.set(cx, 30, 120);
    group.add(cab);
  }

  // Colourful beach umbrellas along the sand, with towels underneath.
  const umbrellaCols = [0xff5c8a, 0xffd166, 0x2ec4b6, 0xff7b54, 0x7dd7ff, 0xff9ecf];
  for (let i = 0; i < 10; i += 1) {
    const ux = -170 + i * 36 + range(random, -6, 6);
    const uz = range(random, 204, 214);
    const pole = new THREE.Mesh(geo.cyl, mat(0xe8e4da));
    pole.scale.set(0.16, 2.6, 0.16);
    pole.position.set(ux, 1.3, uz);
    group.add(pole);
    const canopy = new THREE.Mesh(geo.cone, mat(pick(random, umbrellaCols)));
    canopy.scale.set(4.2, 1.6, 4.2);
    canopy.position.set(ux, 3.2, uz);
    canopy.castShadow = true;
    group.add(canopy);
    const towel = new THREE.Mesh(geo.box, mat(pick(random, umbrellaCols)));
    towel.scale.set(1.8, 0.1, 0.9);
    towel.position.set(ux + range(random, 1.5, 3), 0.12, uz + range(random, -1, 1));
    towel.rotation.y = random() * Math.PI;
    group.add(towel);
  }

  // Beach kiosk and lifeguard tower on the sand.
  const kiosk = new THREE.Group();
  const kBase = new THREE.Mesh(geo.box, mat(0xe8e4da));
  kBase.scale.set(4.5, 2.8, 3.5);
  kBase.position.y = 1.4;
  kBase.castShadow = true;
  kiosk.add(kBase);
  const kCounter = new THREE.Mesh(geo.box, mat(0x7a5c3e));
  kCounter.scale.set(4.5, 0.9, 0.8);
  kCounter.position.set(0, 1.1, 2);
  kiosk.add(kCounter);
  for (let i = 0; i < 5; i += 1) {
    const stripe = new THREE.Mesh(geo.box, mat(i % 2 === 0 ? 0xc23b3b : 0xf2f2ee));
    stripe.scale.set(0.95, 0.12, 2.4);
    stripe.position.set(-1.9 + i * 0.95, 3.15, 0.6);
    stripe.rotation.x = 0.25;
    kiosk.add(stripe);
  }
  const kSignTex = textTexture('BEACH KIOSK', '#ffd166', '#1d2b3a', 256, 64, 34);
  const kSign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: kSignTex, toneMapped: false }));
  kSign.position.set(0, 2.6, 1.85);
  kiosk.add(kSign);
  kiosk.position.set(-20, 0, 202);
  group.add(kiosk);
  const lifeTower = new THREE.Group();
  for (const [lx, lz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
    const leg = new THREE.Mesh(geo.cyl, mat(0x7a5c3e));
    leg.scale.set(0.25, 4.4, 0.25);
    leg.position.set(lx, 2.2, lz);
    lifeTower.add(leg);
  }
  const cab = new THREE.Mesh(geo.box, mat(0xe8e4da));
  cab.scale.set(2.8, 2.2, 2.8);
  cab.position.y = 5.2;
  cab.castShadow = true;
  lifeTower.add(cab);
  const roof = new THREE.Mesh(geo.box, mat(0xc23b3b));
  roof.scale.set(3.4, 0.25, 3.4);
  roof.position.y = 6.5;
  lifeTower.add(roof);
  const lgTex = textTexture('LIFEGUARD', '#c23b3b', '#f2ead8', 256, 64, 34);
  const lgSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: lgTex, toneMapped: false }));
  lgSign.position.set(0, 5.4, 1.45);
  lifeTower.add(lgSign);
  lifeTower.position.set(36, 0, 206);
  group.add(lifeTower);

  // Palms: a curved trunk of stacked segments, drooping fronds, coconuts.
  const trunkMat = mat(PALETTE.trunk);
  const frondMat = mat(PALETTE.palm);
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    let px = 0;
    for (let i = 0; i < 3; i += 1) {
      const seg = new THREE.Mesh(geo.cyl, trunkMat);
      seg.scale.set(0.5 * s, 2.6 * s, 0.5 * s);
      seg.position.set(px, (1.3 + i * 2.4) * s, 0);
      seg.rotation.z = -0.06 * (i + 1);
      seg.castShadow = true;
      g.add(seg);
      px += 0.28 * s;
    }
    const crownX = px + 0.3 * s;
    const crownY = 7.2 * s;
    for (let i = 0; i < 7; i += 1) {
      const pivot = new THREE.Group();
      pivot.position.set(crownX, crownY, 0);
      pivot.rotation.y = (i / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(geo.box, frondMat);
      frond.scale.set(3.1 * s, 0.1 * s, 0.9 * s);
      frond.position.set(1.5 * s, -0.3 * s, 0);
      frond.rotation.z = -0.55;
      frond.castShadow = true;
      pivot.add(frond);
      g.add(pivot);
    }
    for (const [cx, cz] of [[0.3, 0.25], [-0.2, -0.3], [0.1, 0.35]]) {
      const nut = new THREE.Mesh(geo.sph, mat(0x5a4632));
      nut.scale.set(0.35 * s, 0.35 * s, 0.35 * s);
      nut.position.set(crownX + cx * s, crownY - 0.4 * s, cz * s);
      g.add(nut);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  for (let x = -216; x <= 216; x += 24) {
    palm(x + range(random, -3, 3), 186);
    if (random() < 0.6) palm(x + range(random, -3, 3), 202);
  }
  for (let i = 0; i < 12; i += 1) palm(range(random, 84, 168), range(random, 150, 180));
  for (let i = 0; i < 16; i += 1) {
    const bx = pick(random, [-120, -72, -24, 24, 72, 120]) + range(random, -14, 14);
    const bz = pick(random, [-120, -72, -24, 24, 72, 120]) + range(random, -14, 14);
    palm(bx, bz, range(random, 0.8, 1.1));
  }

  // Streetlights along the main avenues, with warm pools of light.
  const poleMat = mat(0x3a3f46);
  const lampMat = mat(0xffe9a8, { emissive: 0xffdf8a, emissiveIntensity: 0.9 });
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffdf8a, transparent: true, opacity: 0.16, depthWrite: false });
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
      const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(line + 8, 0.09, v);
      group.add(pool);
    }
  }

  // Sidewalk props: hydrants, benches, bins and planters near the centre.
  function hydrant(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(geo.cyl, mat(0xc23b3b));
    body.scale.set(0.6, 1.0, 0.6);
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    const dome = new THREE.Mesh(geo.sph, mat(0xc23b3b));
    dome.scale.set(0.6, 0.5, 0.6);
    dome.position.y = 1.05;
    g.add(dome);
    for (const s of [-1, 1]) {
      const nozzle = new THREE.Mesh(geo.cyl, mat(0x8a2a2a));
      nozzle.scale.set(0.25, 0.3, 0.25);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.set(s * 0.35, 0.6, 0);
      g.add(nozzle);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  function bench(x, z, rotY) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(geo.box, mat(0x7a5c3e));
    seat.scale.set(2.0, 0.16, 0.65);
    seat.position.y = 0.55;
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(geo.box, mat(0x7a5c3e));
    back.scale.set(2.0, 0.7, 0.12);
    back.position.set(0, 0.95, -0.3);
    back.rotation.x = -0.15;
    g.add(back);
    for (const s of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(geo.box, mat(0x2e3238));
      leg.scale.set(0.14, 0.55, 0.6);
      leg.position.set(s, 0.28, 0);
      g.add(leg);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
  }
  function bin(x, z) {
    const b = new THREE.Mesh(geo.cyl, mat(0x2e3238));
    b.scale.set(0.9, 1.2, 0.9);
    b.position.set(x, 0.6, z);
    b.castShadow = true;
    group.add(b);
  }
  function planter(x, z) {
    const p = new THREE.Mesh(geo.box, mat(0x8a8f96));
    p.scale.set(1.7, 0.8, 1.7);
    p.position.set(x, 0.4, z);
    p.castShadow = true;
    group.add(p);
    const bush = new THREE.Mesh(geo.sph, mat(0x3f7a3a));
    bush.scale.set(1.5, 1.0, 1.5);
    bush.position.set(x, 1.1, z);
    bush.castShadow = true;
    group.add(bush);
  }
  for (let i = 0; i < 26; i += 1) {
    const px = pick(random, [-144, -96, -48, 0, 48, 96, 144]) + range(random, 9, 15) * (random() < 0.5 ? -1 : 1);
    const pz = pick(random, [-144, -96, -48, 0, 48, 96, 144]) + range(random, 9, 15) * (random() < 0.5 ? -1 : 1);
    const kind = i % 4;
    if (kind === 0) hydrant(px, pz);
    else if (kind === 1) bench(px, pz, random() * Math.PI);
    else if (kind === 2) bin(px, pz);
    else planter(px, pz);
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
