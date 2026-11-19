// The city of Solmar Bay: golden-hour sky, sun-soaked streets, textured
// buildings in natural tones, shops spanning the avenue, the marina, the
// bridge, palms and streetlights. All deterministic (seeded).
import * as THREE from 'three';
import { PALETTE, WORLD, SHOPS } from './config.js';
import {
  mulberry32, asphaltTexture, roadTexture, sidewalkTexture, facadeTexture,
  brickTexture, awningTexture, signTexture, skyTexture, waterTexture, quayTexture,
} from './textures.js';

function box(w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function buildWorld(scene) {
  const rnd = mulberry32(20261119);
  const counts = { buildings: 0, signs: 0, palms: 0, streetlights: 0, boats: 0, shops: 0 };

  // ---- Sky, sun, fog ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 130, 400);

  const sun = new THREE.DirectionalLight(PALETTE.sun, PALETTE.sunIntensity);
  sun.position.set(-70, 40, -45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9db8dd, 0x8a7a5e, 1.0));
  scene.add(new THREE.AmbientLight(PALETTE.ambient, 0.6));
  // Warm fill from the east so shadow sides are never black.
  const fill = new THREE.DirectionalLight(0xffe9c4, 0.55);
  fill.position.set(80, 40, 60);
  scene.add(fill);

  // ---- Ground, roads, sidewalks ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.groundSize, WORLD.groundSize),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(7), roughness: 0.96 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture(11), roughness: 0.9 });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(14, 244), roadMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.y = 0.02;
  avenue.receiveShadow = true;
  scene.add(avenue);
  for (const sz of WORLD.streets) {
    const street = new THREE.Mesh(new THREE.PlaneGeometry(220, 10), roadMat);
    street.rotation.x = -Math.PI / 2;
    street.rotation.z = Math.PI / 2;
    street.position.set(-25, 0.02, sz);
    street.receiveShadow = true;
    scene.add(street);
  }
  const walkMat = new THREE.MeshStandardMaterial({ map: sidewalkTexture(3), roughness: 0.95 });
  for (const sx of [-9.5, 9.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(5, 244), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(sx, 0.03, 0);
    walk.receiveShadow = true;
    scene.add(walk);
  }
  // Crosswalks at every avenue intersection.
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d0 });
  for (const sz of WORLD.streets) {
    for (let i = 0; i < 6; i += 1) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 11), crossMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-5 + i * 2, 0.04, sz);
      scene.add(stripe);
    }
  }

  // ---- Buildings ----
  const facades = PALETTE.buildingTones.map((tone, i) =>
    facadeTexture('#' + tone.toString(16).padStart(6, '0'), 5 + i * 3, 0.3 + (i % 3) * 0.12));
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6a625a, roughness: 0.95 });
  const brickMat = new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 0.95 });
  const zBlocks = [[-115, -85], [-75, -45], [-35, -5], [5, 35], [45, 75], [85, 115]];
  const xBlocks = [[-100, -14], [14, 56]];
  for (const [x0, x1] of xBlocks) {
    for (const [z0, z1] of zBlocks) {
      // Three buildings per block, split along the street with small gaps.
      const sub = 3;
      const gap = 2.5;
      const subDepth = (z1 - z0 - gap * (sub - 1)) / sub;
      for (let s = 0; s < sub; s += 1) {
        const sz0 = z0 + s * (subDepth + gap);
        const sz1 = sz0 + subDepth;
        buildOne(x0, x1, sz0, sz1);
      }
    }
  }

  function buildOne(x0, x1, z0, z1) {
      const bw = Math.min(26, x1 - x0);
      const bd = z1 - z0;
      const bx = (x0 + x1) / 2 + (x0 < 0 ? 4 : -4);
      const bz = (z0 + z1) / 2;
      const h = 9 + Math.floor(rnd() * 26);
      const tall = rnd() < 0.18;
      const height = tall ? h + 22 : h;
      const useBrick = rnd() < 0.25;
      const sideMat = useBrick ? brickMat : new THREE.MeshStandardMaterial({
        map: facades[Math.floor(rnd() * facades.length)],
        roughness: 0.9,
      });
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(bw, height, bd),
        [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat],
      );
      b.position.set(bx, height / 2, bz);
      b.castShadow = true;
      b.receiveShadow = true;
      scene.add(b);
      counts.buildings += 1;
      // Setback crown on taller buildings.
      if (height > 22) {
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(bw * 0.62, height * 0.22, bd * 0.62),
          [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat],
        );
        crown.position.set(bx, height + height * 0.11, bz);
        crown.castShadow = true;
        scene.add(crown);
      }
      // Rooftop props: AC boxes, water tank.
      if (rnd() < 0.6) scene.add(box(2, 1, 1.6, roofMat, bx + bw * 0.2, height + 0.5, bz));
      if (rnd() < 0.4) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10), roofMat);
        tank.position.set(bx - bw * 0.25, height + 1.4, bz + bd * 0.2);
        tank.castShadow = true;
        scene.add(tank);
      }
  }

  // ---- Shops spanning the avenue (neon reaches the chase camera) ----
  const signMats = SHOPS.map((s) => {
    const tex = signTexture(s.name, s.color);
    return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.4, roughness: 0.6 });
  });
  const awnMats = ['#c2185b', '#1565c0', '#ef6c00', '#2e7d32'].map((c) =>
    new THREE.MeshStandardMaterial({ map: awningTexture(c, '#f5f0e6'), roughness: 0.85, side: THREE.DoubleSide }));
  let shopIdx = 0;
  for (let z = -104; z <= 104; z += 16) {
    for (const sx of [-1, 1]) {
      if (WORLD.streets.some((s) => Math.abs(s - z) < 7)) continue;
      const shop = SHOPS[shopIdx % SHOPS.length];
      const mat = signMats[shopIdx % signMats.length];
      shopIdx += 1;
      const x = sx * 12.5;
      const storefront = box(5, 4.4, 9, new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.9 }), x, 2.2, z);
      scene.add(storefront);
      const glass = box(0.3, 2.6, 7.5, new THREE.MeshStandardMaterial({ color: 0x2a4a66, roughness: 0.2, metalness: 0.6 }), x - sx * 2.6, 1.5, z);
      scene.add(glass);
      const awn = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.2), awnMats[shopIdx % awnMats.length]);
      awn.position.set(x - sx * 3.2, 3.6, z);
      awn.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      awn.rotation.x = 0;
      awn.rotateX(-0.5);
      scene.add(awn);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), mat);
      sign.position.set(x - sx * 2.75, 4.4, z);
      sign.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(sign);
      counts.shops += 1;
      counts.signs += 1;
    }
  }

  // ---- Streetlights (emissive lamps + fake pools, no extra real lights) ----
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0xffd9a0, emissiveIntensity: 2.2 });
  for (let z = -108; z <= 108; z += 24) {
    for (const sx of [-8.5, 8.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), poleMat);
      pole.position.set(sx, 3.25, z);
      pole.castShadow = true;
      scene.add(pole);
      const arm = box(1.6, 0.08, 0.08, poleMat, sx - Math.sign(sx) * 0.8, 6.4, z);
      scene.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampMat);
      lamp.position.set(sx - Math.sign(sx) * 1.5, 6.3, z);
      scene.add(lamp);
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(sx - Math.sign(sx) * 1.5, 0.05, z);
      scene.add(pool);
      counts.streetlights += 1;
    }
  }

  // ---- Palms ----
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85, side: THREE.DoubleSide });
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 5.5 * s, 7), trunkMat);
    trunk.position.y = 2.75 * s;
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 7; i += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 3.4 * s, 4), frondMat);
      const a = (i / 7) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.1 * s, 5.6 * s, Math.sin(a) * 1.1 * s);
      frond.rotation.z = Math.PI / 2 + 0.5;
      frond.rotation.y = -a;
      frond.scale.set(1, 1, 0.28);
      frond.castShadow = true;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    counts.palms += 1;
  }
  for (let z = -100; z <= 100; z += 25) {
    palm(-11.5, z, 0.9 + rnd() * 0.3);
    palm(11.5, z + 12, 0.9 + rnd() * 0.3);
  }

  // ---- Marina: water, quay, docks, boats ----
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 150),
    new THREE.MeshStandardMaterial({ map: waterTexture(21), roughness: 0.5, metalness: 0.15 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(112, 0.06, 0);
  scene.add(water);
  // Quay: ROUGH dark planks — no specular streaks under the marina lights.
  const quay = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 90),
    new THREE.MeshStandardMaterial({ map: quayTexture(13), roughness: 1.0, metalness: 0.0 }),
  );
  quay.rotation.x = -Math.PI / 2;
  quay.position.set(68, 0.1, 10);
  quay.receiveShadow = true;
  scene.add(quay);
  // Docks reaching into the water.
  for (const dz of [-12, 8, 28]) {
    scene.add(box(24, 0.5, 3, new THREE.MeshStandardMaterial({ map: quayTexture(17), roughness: 1 }), 82, 0.25, dz));
  }
  // Boats moored along the docks.
  function boat(x, z, heading, hullColor) {
    const g = new THREE.Group();
    // Hull with a raked, pointed bow (not a trapezoid wedge).
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-3, 0.15);
    hullShape.lineTo(2.1, 0.15);
    hullShape.lineTo(3, 0.55);
    hullShape.lineTo(2.6, 1.05);
    hullShape.lineTo(-2.6, 1.05);
    hullShape.lineTo(-3, 0.55);
    hullShape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 });
    hullGeo.translate(0, 0, -0.9);
    hullGeo.rotateY(Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.45 }));
    hull.castShadow = true;
    g.add(hull);
    // Dark waterline stripe along the hull (wider than the hull so it shows).
    const stripe = box(2.2, 0.14, 5.6, new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.6 }), 0, 0.3, 0);
    g.add(stripe);
    const cabin = box(1.5, 0.9, 2.2, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }), 0, 1.4, -0.3);
    g.add(cabin);
    const glassBand = box(1.56, 0.35, 1.8, new THREE.MeshStandardMaterial({ color: 0x1a2e40, roughness: 0.15, metalness: 0.7 }), 0, 1.5, -0.3);
    g.add(glassBand);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.5, 6), poleMat);
    mast.position.set(0, 3.4, 0.6);
    g.add(mast);
    g.position.set(x, 0.1, z);
    g.rotation.y = heading;
    scene.add(g);
    counts.boats += 1;
  }
  boat(86, -16, 0.15, 0xf2f2ee);
  boat(88, 4, -0.1, 0xdde8f0);
  boat(86, 24, 0.2, 0xf0e6d2);
  boat(96, 34, -0.3, 0xf2f2ee);
  boat(96, -26, 0.1, 0xe8d8c8);
  boat(104, 12, 0.4, 0xdde8f0);
  // Marina dock lights: two small point lights, high and to the sides so any
  // highlight falls outside the marina camera's view. Quay tops are rough.
  const dockLightA = new THREE.PointLight(0x66d9e8, 18, 26, 1.8);
  dockLightA.position.set(66, 5.5, -4);
  scene.add(dockLightA);
  const dockLightB = new THREE.PointLight(0xff9ec4, 18, 26, 1.8);
  dockLightB.position.set(66, 5.5, 20);
  scene.add(dockLightB);
  // Warm area light over the marina: the quay sits in the buildings' long
  // golden-hour shadow, so it needs its own sun.
  const marinaSun = new THREE.PointLight(0xffd9a0, 200, 80, 1.6);
  marinaSun.position.set(78, 20, 10);
  scene.add(marinaSun);
  for (const [lx, lz, lc] of [[66, -4, 0x66d9e8], [66, 20, 0xff9ec4]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5, 8), poleMat);
    post.position.set(lx, 2.5, lz);
    scene.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: lc, emissiveIntensity: 3 }));
    bulb.position.set(lx, 5.2, lz);
    scene.add(bulb);
  }
  // Crates and bollards on the quay.
  for (let i = 0; i < 8; i += 1) {
    scene.add(box(1.4, 1.1, 1.4, new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 }), 63 + rnd() * 8, 0.55, -24 + i * 7));
  }

  // ---- Harbor Bridge (north, z=-60 — a distant silhouette, never blocking) ----
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xa84a3a, roughness: 0.7 });
  scene.add(box(120, 1.6, 6, bridgeMat, 80, 7.5, -60));
  for (const tx of [45, 115]) {
    scene.add(box(3, 24, 6, bridgeMat, tx, 12, -60));
    for (const [cx, cy, cz, len, ang] of [[tx - 16, 16, -60, 20, 0.7], [tx + 16, 16, -60, 20, -0.7]]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 6), bridgeMat);
      cable.position.set(cx, cy, cz);
      cable.rotation.z = ang;
      scene.add(cable);
    }
  }

  // ---- Pelican Isle + lighthouse ----
  const isle = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 12, 1.2, 18),
    new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: 1 }),
  );
  isle.position.set(130, 0.4, -40);
  scene.add(isle);
  palm(128, -44, 1.1);
  palm(133, -36, 0.9);
  const lightTower = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 13, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 }));
  lightTower.position.set(96, 6.5, -96);
  lightTower.castShadow = true;
  scene.add(lightTower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.05, 2, 12), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }));
  band.position.set(96, 9, -96);
  scene.add(band);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2, 10), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe9a8, emissiveIntensity: 2.5 }));
  lampRoom.position.set(96, 13.8, -96);
  scene.add(lampRoom);

  return { counts, sun };
}
