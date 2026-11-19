// SOLMAR BAY — the city itself: roads, blocks, buildings, shops, palms, lamps,
// the marina, the bay, the bridge, the lighthouse, the sky. Everything procedural,
// everything from one seed, so the same seed always builds the same city.
//
// Layout: avenues run north (-Z) at x = -72, -36, 0, 36, 72; streets run east-west
// at z = -72, -36, 0, 36, 72. The bay is east of x = 88. The sun sits in the
// south-west sky, so a camera looking north always sees lit faces.
import * as THREE from 'three';
import { DISTRICTS, LANDMARKS, SHOPS, WORLD } from './config.js';
import { asphaltTexture, awningTexture, facadeTexture, glowTexture, lightPoolTexture, plankTexture, waterTexture } from './textures.js';
import { pick, range, rangeInt } from './random.js';

const FACADE_BASES = ['#e8d9b0', '#d9c49a', '#efe6d0', '#c9b18a', '#e0d0ae', '#d4c5a0', '#cbb98f'];
const AWNING_PAIRS = [['#d94a4a', '#f2ede0'], ['#3a6ea8', '#f2ede0'], ['#2e8a5a', '#f2ede0'], ['#d9a83c', '#f2ede0']];

function signTexture(text, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#f5efdd';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2e5a9a');
  grad.addColorStop(0.45, '#6f9fd0');
  grad.addColorStop(0.72, '#f7c873');
  grad.addColorStop(0.85, '#f2b25c');
  grad.addColorStop(1, '#e8a04a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePalm(random) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.8, side: THREE.DoubleSide });
  const height = range(random, 4.5, 6.5);
  const lean = range(random, -0.14, 0.14);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, height, 8), trunkMat);
  trunk.position.y = height / 2;
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  palm.add(trunk);
  const topX = -Math.sin(lean) * height;
  const fronds = rangeInt(random, 6, 8);
  for (let i = 0; i < fronds; i += 1) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.4, 4), frondMat);
    frond.scale.set(1, 1, 0.16);
    const angle = (i / fronds) * Math.PI * 2 + random() * 0.5;
    const droop = range(random, 0.9, 1.25);
    frond.position.set(topX + Math.cos(angle) * 0.7, height - 0.15, Math.sin(angle) * 0.7);
    frond.rotation.set(Math.sin(angle) * droop, 0, -Math.cos(angle) * droop);
    frond.castShadow = true;
    palm.add(frond);
  }
  for (let i = 0; i < 2; i += 1) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 }));
    nut.position.set(topX + range(random, -0.2, 0.2), height - 0.35, range(random, -0.2, 0.2));
    palm.add(nut);
  }
  return palm;
}

function makeLamp(textures) {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.6, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 8), poleMat);
  pole.position.y = 3.2;
  pole.castShadow = true;
  lamp.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), poleMat);
  arm.position.set(0.6, 6.35, 0);
  lamp.add(arm);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffe9b0, emissiveIntensity: 2.2 }),
  );
  head.position.set(1.25, 6.25, 0);
  lamp.add(head);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glow, color: 0xffe9b0, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(2.2, 2.2, 1);
  glow.position.set(1.25, 6.25, 0);
  lamp.add(glow);
  return lamp;
}

function makeBoat(random) {
  const boat = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2ede0, roughness: 0.4, metalness: 0.1 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: pick(random, ['#d94a4a', '#3a6ea8', '#2e8a5a']), roughness: 0.5 });
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.2, 0);
  hullShape.quadraticCurveTo(-3.4, 0.9, -2.6, 1.1);
  hullShape.lineTo(2.6, 1.1);
  hullShape.quadraticCurveTo(3.4, 0.9, 3.2, 0);
  hullShape.quadraticCurveTo(0, -0.5, -3.2, 0);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2 });
  hullGeo.translate(0, 0, -0.8);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.y = Math.PI / 2;
  hull.castShadow = true;
  boat.add(hull);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 5.6), stripeMat);
  stripe.position.set(0, 0.75, 0);
  boat.add(stripe);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 2.4), hullMat);
  cabin.position.set(0, 1.5, -0.3);
  cabin.castShadow = true;
  boat.add(cabin);
  const cabinGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.4, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.15, metalness: 0.85 }),
  );
  cabinGlass.position.set(0, 1.65, -0.3);
  boat.add(cabinGlass);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.4, metalness: 0.7 }));
  mast.position.set(0, 3.4, 0.6);
  boat.add(mast);
  return boat;
}

export function createWorld(scene, random) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const textures = {
    glow: glowTexture(),
    lightPool: lightPoolTexture(),
  };

  // Sky dome + sun disc.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  group.add(sky);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glow, color: 0xffe9b0, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sunSprite.scale.set(90, 90, 1);
  sunSprite.position.set(-180, 110, 320);
  group.add(sunSprite);

  // Ground: warm sand-grey under everything, bay water to the east.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(40, -0.05, 0);
  ground.receiveShadow = true;
  group.add(ground);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 560),
    new THREE.MeshStandardMaterial({ map: waterTexture(random), roughness: 0.25, metalness: 0.55 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(208, 0.0, 0);
  group.add(water);

  // Roads: avenues at y 0.01, streets at y 0.02 (offsets stop z-fighting).
  const asphaltA = asphaltTexture(random);
  const asphaltB = asphaltA.clone();
  asphaltB.center.set(0.5, 0.5);
  asphaltB.rotation = Math.PI / 2;
  asphaltB.needsUpdate = true;
  const roadMatA = new THREE.MeshStandardMaterial({ map: asphaltA, roughness: 0.85, metalness: 0.05 });
  const roadMatB = new THREE.MeshStandardMaterial({ map: asphaltB, roughness: 0.85, metalness: 0.05 });
  for (const x of WORLD.avenueX) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadHalf * 2, 224), roadMatA);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, 0);
    road.receiveShadow = true;
    group.add(road);
  }
  for (const z of WORLD.streetZ) {
    // Streets stop at the quay (x = 88) — they must not pave over the bay.
    const road = new THREE.Mesh(new THREE.PlaneGeometry(200, WORLD.roadHalf * 2), roadMatB);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-12, 0.02, z);
    road.receiveShadow = true;
    group.add(road);
  }

  // City blocks: concrete plinths + buildings between the roads. The inner blocks
  // start at ±11 (not ±5.5) so the shop row along Solmar Avenue has its own
  // sidewalk strip clear of the building faces.
  const blockXs = [[-105, -77.5], [-66.5, -41.5], [-30.5, -11], [11, 30.5], [41.5, 66.5], [77.5, 86]];
  const blockZs = [[-105, -77.5], [-66.5, -41.5], [-30.5, -5.5], [5.5, 30.5], [41.5, 66.5], [77.5, 105]];
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xb8ab8c, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 0.9 });
  for (const [x0, x1] of blockXs) {
    for (const [z0, z1] of blockZs) {
      // The marina blocks stay open: no buildings east of the quay.
      if (x0 >= 77.5 && z0 >= 5.5) continue;
      const w = x1 - x0;
      const d = z1 - z0;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), plinthMat);
      plinth.position.set(cx, 0.12, cz);
      plinth.receiveShadow = true;
      group.add(plinth);
      const kind = random();
      const base = pick(random, FACADE_BASES);
      if (kind < 0.3) {
        // Tower: tall, with a setback top floor.
        const h = range(random, 20, 38);
        const bw = w * range(random, 0.55, 0.8);
        const bd = d * range(random, 0.55, 0.8);
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(bw, h, bd),
          new THREE.MeshStandardMaterial({ map: facadeTexture(random, base), roughness: 0.85 }),
        );
        tower.position.set(cx, 0.27 + h / 2, cz);
        tower.castShadow = true;
        tower.receiveShadow = true;
        group.add(tower);
        const top = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.6, h * 0.12, bd * 0.6), roofMat);
        top.position.set(cx, 0.27 + h + h * 0.06, cz);
        top.castShadow = true;
        group.add(top);
        colliders.push({ minX: cx - bw / 2, maxX: cx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2 });
      } else if (kind < 0.55) {
        // Glass office.
        const h = range(random, 14, 28);
        const bw = w * range(random, 0.6, 0.85);
        const bd = d * range(random, 0.6, 0.85);
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(bw, h, bd),
          new THREE.MeshStandardMaterial({
            map: facadeTexture(random, '#7a97ac'), roughness: 0.25, metalness: 0.55,
          }),
        );
        glass.position.set(cx, 0.27 + h / 2, cz);
        glass.castShadow = true;
        group.add(glass);
        colliders.push({ minX: cx - bw / 2, maxX: cx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2 });
      } else {
        // Two mid-rise buildings side by side.
        for (let i = 0; i < 2; i += 1) {
          const h = range(random, 8, 16);
          const bw = w * 0.42;
          const bd = d * range(random, 0.7, 0.9);
          const bx = cx + (i === 0 ? -w * 0.26 : w * 0.26);
          const mid = new THREE.Mesh(
            new THREE.BoxGeometry(bw, h, bd),
            new THREE.MeshStandardMaterial({ map: facadeTexture(random, pick(random, FACADE_BASES)), roughness: 0.85 }),
          );
          mid.position.set(bx, 0.27 + h / 2, cz);
          mid.castShadow = true;
          mid.receiveShadow = true;
          group.add(mid);
          const cornice = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.35, bd + 0.4), roofMat);
          cornice.position.set(bx, 0.27 + h + 0.15, cz);
          group.add(cornice);
          colliders.push({ minX: bx - bw / 2, maxX: bx + bw / 2, minZ: cz - bd / 2, maxZ: cz + bd / 2 });
        }
      }
    }
  }

  // Shops along Solmar Avenue, both sides, spanning the full street (-112..+98)
  // so neon reaches the chase camera wherever it sits. They stand on the
  // sidewalk strip (x = ±8.2) between the road edge and the block faces.
  let shopIndex = 0;
  for (let z = -105; z <= 98; z += 14) {
    for (const side of [-1, 1]) {
      const x = side * 8.2;
      const name = SHOPS[shopIndex % SHOPS.length];
      shopIndex += 1;
      const shop = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 5.2, 6.5),
        new THREE.MeshStandardMaterial({ map: facadeTexture(random, pick(random, FACADE_BASES)), roughness: 0.85 }),
      );
      shop.position.set(x, 2.6, z + range(random, -1.5, 1.5));
      shop.castShadow = true;
      shop.receiveShadow = true;
      group.add(shop);
      const [awningA, awningB] = pick(random, AWNING_PAIRS);
      const awning = new THREE.Mesh(
        new THREE.PlaneGeometry(5.8, 2.2),
        new THREE.MeshStandardMaterial({ map: awningTexture(random, awningA, awningB), roughness: 0.8, side: THREE.DoubleSide }),
      );
      awning.position.set(x - side * 2.6, 3.6, z);
      awning.rotation.set(-0.5, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      awning.castShadow = true;
      group.add(awning);
      const signTex = signTexture(name, pick(random, ['#20304a', '#4a2028', '#1f3a2a', '#3a2a10']));
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 1.3),
        new THREE.MeshStandardMaterial({
          map: signTex,
          emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35, roughness: 0.6,
        }),
      );
      sign.position.set(x - side * 2.85, 4.6, z);
      sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(sign);
      colliders.push({ minX: x - 2.5, maxX: x + 2.5, minZ: z - 3.25, maxZ: z + 3.25 });
    }
  }

  // Palms along the avenues + at the marina. On Solmar Avenue the shops occupy
  // the sidewalk strip, so the palms there sit behind the shop row (x = ±11.5).
  for (const x of WORLD.avenueX) {
    for (let z = -100; z <= 100; z += 26) {
      const palm = makePalm(random);
      const offset = x === 0 ? pick(random, [-11.5, 11.5]) : pick(random, [-7.6, 7.6]);
      palm.position.set(x + offset, 0, z + range(random, -3, 3));
      palm.rotation.y = random() * Math.PI * 2;
      group.add(palm);
    }
  }
  for (let z = -20; z <= 70; z += 18) {
    const palm = makePalm(random);
    palm.position.set(90, 0, z);
    group.add(palm);
  }

  // Street lamps along Solmar Avenue and the ring streets.
  for (let z = -100; z <= 100; z += 24) {
    for (const side of [-1, 1]) {
      if ((Math.round(z / 24) + side) % 2 !== 0) continue;
      const lamp = makeLamp(textures);
      lamp.position.set(side * 6.8, 0, z);
      lamp.rotation.y = side > 0 ? Math.PI : 0;
      group.add(lamp);
    }
  }

  // Marina: wooden quay (ROUGH tops — no specular streak), pier, boats, bridge.
  const quay = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 150),
    new THREE.MeshStandardMaterial({ map: plankTexture(random), roughness: 0.95, metalness: 0 }),
  );
  quay.rotation.x = -Math.PI / 2;
  quay.position.set(94, 0.06, 25);
  quay.receiveShadow = true;
  group.add(quay);
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.5, 6),
    new THREE.MeshStandardMaterial({ map: plankTexture(random), roughness: 0.95, metalness: 0 }),
  );
  pier.position.set(114, 0.3, 24);
  pier.castShadow = true;
  pier.receiveShadow = true;
  group.add(pier);
  const boats = [];
  const boatSpots = [[108, 8], [122, 30], [112, 44]];
  for (const [bx, bz] of boatSpots) {
    const boat = makeBoat(random);
    boat.position.set(bx, 0.1, bz);
    boat.rotation.y = range(random, -0.3, 0.3);
    group.add(boat);
    boats.push(boat);
  }
  // Pelican Isle: sand + palms in the bay.
  const isle = new THREE.Mesh(new THREE.CylinderGeometry(14, 17, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0xd9c48a, roughness: 1 }));
  isle.position.set(118, 0.4, -18);
  isle.receiveShadow = true;
  group.add(isle);
  for (let i = 0; i < 4; i += 1) {
    const palm = makePalm(random);
    palm.position.set(118 + range(random, -8, 8), 1.2, -18 + range(random, -8, 8));
    group.add(palm);
  }
  // Harbour Bridge at z = -60 (north, out of the marina camera's frame).
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xb85a3a, roughness: 0.6, metalness: 0.2 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(52, 1.2, 8), bridgeMat);
  deck.position.set(114, 9, -60);
  deck.castShadow = true;
  group.add(deck);
  for (const tx of [100, 128]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 24, 3), bridgeMat);
    tower.position.set(tx, 12, -60);
    tower.castShadow = true;
    group.add(tower);
    colliders.push({ minX: tx - 1.5, maxX: tx + 1.5, minZ: -61.5, maxZ: -58.5 });
  }
  // Lighthouse at the north-east point.
  const lightBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 14, 12), new THREE.MeshStandardMaterial({ color: 0xf2ede0, roughness: 0.7 }));
  lightBase.position.set(78, 7, -78);
  lightBase.castShadow = true;
  group.add(lightBase);
  const lightBand = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.5, 3, 12), new THREE.MeshStandardMaterial({ color: 0xd94a4a, roughness: 0.7 }));
  lightBand.position.set(78, 9, -78);
  group.add(lightBand);
  const lightRoom = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2c0, emissiveIntensity: 2.5 }),
  );
  lightRoom.position.set(78, 15, -78);
  group.add(lightRoom);
  const lightGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glow, color: 0xfff2c0, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  lightGlow.scale.set(10, 10, 1);
  lightGlow.position.set(78, 15, -78);
  group.add(lightGlow);
  colliders.push({ minX: 75, maxX: 81, minZ: -81, maxZ: -75 });

  // The hero light pool: an additive radial decal that follows the hero car so
  // it never sits on pitch-black asphalt. Positioned per frame by main.js.
  const lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({
      map: textures.lightPool, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(0, 0.08, 30);
  group.add(lightPool);

  return { group, colliders, textures, lightPool, boats, DISTRICTS, LANDMARKS };
}
