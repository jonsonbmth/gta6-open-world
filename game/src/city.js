// Aurelia Bay itself: Sunset Mile boulevard, the beach and ocean to the
// west (where the sun sets), warm pastel city blocks to the east, the
// Gilded Quay marina to the south, a ferris wheel on the sand, and the
// roadside explosion the chase shot drives past. Everything is lit for
// golden hour: lit windows, streetlights on, long shadows.

import { canvasTexture, glowSprite, mulberry32, pick, rand } from './util.js';

const SHOP_NAMES = [
  'SOL & SALT', 'CAFÉ EMBER', 'TACO LUNA', 'PIER 9 BAIT',
  'GOLDEN CRUST', 'NEON PALM MOTEL', 'CORAL CUTS', 'LA PLAYA SURF',
  'MAMA LUZ KITCHEN', 'EMBER BOOKS', 'DUSK TATTOO', 'PALMA GROCER',
];

function facadeTexture(base, litRatio, rng) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // Subtle vertical shading.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Window grid: many lit warm at dusk.
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 6; col++) {
        const wx = 14 + col * 40;
        const wy = 12 + row * 30;
        const lit = rng() < litRatio;
        ctx.fillStyle = lit ? '#ffd98a' : '#2c2338';
        if (lit) {
          ctx.shadowColor = '#ffb340';
          ctx.shadowBlur = 8;
        }
        ctx.fillRect(wx, wy, 24, 18);
        ctx.shadowBlur = 0;
      }
    }
    // Ground-floor shop band.
    ctx.fillStyle = 'rgba(20,10,20,0.55)';
    ctx.fillRect(0, h - 30, w, 30);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(pick(rng, SHOP_NAMES), w / 2, h - 11);
  });
}

function roadTexture(rng) {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#33302e';
    ctx.fillRect(0, 0, w, h);
    // Asphalt noise.
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,240,220' : '0,0,0'},${0.05 + rng() * 0.06})`;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
    // Double yellow centre line.
    ctx.fillStyle = '#e8b93b';
    ctx.fillRect(w / 2 - 7, 0, 5, h);
    ctx.fillRect(w / 2 + 2, 0, 5, h);
    // White dashed lane lines.
    ctx.fillStyle = '#e8e4da';
    for (let y = 0; y < h; y += 64) {
      ctx.fillRect(w / 4 - 2, y, 4, 34);
      ctx.fillRect((3 * w) / 4 - 2, y, 4, 34);
    }
    // Edge lines.
    ctx.fillRect(4, 0, 3, h);
    ctx.fillRect(w - 7, 0, 3, h);
  });
}

function sidewalkTexture(rng) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8d7f74';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke();
    }
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rng() * 0.08})`;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
  });
}

function sandTexture(rng) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8c07a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,235,190' : '170,120,60'},${0.08 + rng() * 0.1})`;
      ctx.fillRect(rng() * w, rng() * h, 2, 2);
    }
  });
}

function signTexture(name, bg, fg) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = fg;
    ctx.font = '900 52px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, w / 2, h / 2 + 2);
  });
}

function makePalm(rng, scale) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 7), trunkMat);
  trunk.position.y = 3.5;
  trunk.rotation.z = rand(rng, -0.09, 0.09);
  trunk.castShadow = true;
  g.add(trunk);
  // Fronds: flattened drooping cones, deep green with a warm rim.
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x1f6b2e, roughness: 0.7, side: THREE.DoubleSide,
  });
  const frondGeo = new THREE.ConeGeometry(0.55, 4.6, 4);
  frondGeo.scale(1, 1, 0.16);
  frondGeo.translate(0, -2.0, 0);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const f = new THREE.Mesh(frondGeo, frondMat);
    const a = (i / n) * Math.PI * 2 + rng() * 0.3;
    f.position.y = 7;
    f.rotation.set(Math.PI / 2 + rand(rng, 0.5, 0.9), a, 0, 'YXZ');
    f.castShadow = true;
    g.add(f);
  }
  // Coconuts.
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), nutMat);
    nut.position.set(rand(rng, -0.4, 0.4), 6.7, rand(rng, -0.4, 0.4));
    g.add(nut);
  }
  g.scale.setScalar(scale);
  return g;
}

function makeStreetlight() {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.6, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 8), poleMat);
  pole.position.y = 3.75;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8), poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.85, 7.4, 0);
  g.add(arm);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  head.position.set(1.7, 7.35, 0);
  g.add(head);
  const glow = glowSprite('rgba(255,210,120,0.5)', 4.5, 0.75);
  glow.position.copy(head.position);
  g.add(glow);
  const pool = glowSprite('rgba(255,190,90,0.35)', 7, 0.4);
  pool.position.set(1.7, 0.3, 0);
  g.add(pool);
  return g;
}

function makeBuilding(rng, w, h, d, palette) {
  const tex = facadeTexture(pick(rng, palette), 0.55, rng);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 14)));
  const mat = new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: 0x664422, roughness: 0.85,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildCity(scene) {
  const rng = mulberry32(2407);
  const animated = [];
  const group = new THREE.Group();
  scene.add(group);

  // ---- ground base ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: 0x5a4a3e, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.08, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // ---- ocean (west) + sun glint ----
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 520),
    new THREE.MeshStandardMaterial({ color: 0x14586e, roughness: 0.22, metalness: 0.65 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-270, 0.02, 0);
  group.add(ocean);
  const glint = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 60),
    new THREE.MeshBasicMaterial({
      color: 0xffc46b, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  glint.rotation.x = -Math.PI / 2;
  glint.position.set(-260, 0.06, -18);
  glint.rotation.z = 0.12;
  group.add(glint);

  // ---- beach (sand strip) ----
  const sandTex = sandTexture(rng);
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(10, 26);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 520),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-85, 0, 0);
  sand.receiveShadow = true;
  group.add(sand);

  // ---- Sunset Mile: the main boulevard (runs along Z at x = 0) ----
  const roadTex = roadTexture(rng);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 14);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.94 });
  const mile = new THREE.Mesh(new THREE.PlaneGeometry(17, 360), roadMat);
  mile.rotation.x = -Math.PI / 2;
  mile.position.set(0, 0.01, 0);
  mile.receiveShadow = true;
  group.add(mile);

  // Cross streets (along X) at several z.
  const crossTex = roadTexture(rng);
  crossTex.wrapS = crossTex.wrapT = THREE.RepeatWrapping;
  crossTex.repeat.set(1, 9);
  const crossMat = new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.94 });
  for (const z of [-120, -60, 0, 60, 120]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(13, 220), crossMat);
    c.rotation.x = -Math.PI / 2;
    c.rotation.z = Math.PI / 2;
    c.position.set(55, 0.005, z);
    c.receiveShadow = true;
    group.add(c);
  }

  // Sidewalks along the boulevard.
  const walkTex = sidewalkTexture(rng);
  walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
  walkTex.repeat.set(2, 60);
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1 });
  for (const x of [-11.5, 11.5]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(6, 360), walkMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(x, 0.02, 0);
    w.receiveShadow = true;
    group.add(w);
  }

  // ---- city blocks (east of the boulevard) ----
  const palette = ['#e8a87c', '#d98e73', '#e8c07a', '#c97b6a', '#d9a066', '#b87a8a', '#e0b184', '#cf8f6a'];
  const blockX = [30, 62, 94, 126];
  const blockZ = [-150, -90, -30, 30, 90, 150];
  for (const bx of blockX) {
    for (const bz of blockZ) {
      if (rng() < 0.12) continue; // occasional plaza / parking
      const w = rand(rng, 16, 24);
      const d = rand(rng, 16, 24);
      const h = rand(rng, 10, 34) * (bx > 90 ? 1.5 : 1);
      const b = makeBuilding(rng, w, h, d, palette);
      b.position.set(bx + rand(rng, -2, 2), h / 2, bz + rand(rng, -2, 2));
      group.add(b);
      // Rooftop water tower on some.
      if (rng() < 0.3) {
        const tower = new THREE.Group();
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10),
          new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }),
        );
        tank.position.y = 2.4;
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(1.9, 1.2, 10),
          new THREE.MeshStandardMaterial({ color: 0x6e452c, roughness: 0.9 }),
        );
        roof.position.y = 4.3;
        tower.add(tank, roof);
        tower.position.set(b.position.x, h, b.position.z);
        group.add(tower);
      }
    }
  }

  // Ember Tower: the skyline landmark, lit crown.
  const towerTex = facadeTexture('#d98e73', 0.7, rng);
  towerTex.wrapS = THREE.RepeatWrapping;
  towerTex.wrapT = THREE.RepeatWrapping;
  towerTex.repeat.set(2, 5);
  const emberTower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 64, 22),
    new THREE.MeshStandardMaterial({ map: towerTex, emissiveMap: towerTex, emissive: 0x664422, roughness: 0.85 }),
  );
  emberTower.position.set(108, 32, -30);
  emberTower.castShadow = true;
  emberTower.receiveShadow = true;
  group.add(emberTower);
  const crown = glowSprite('rgba(255,190,90,0.8)', 26, 0.8);
  crown.position.set(108, 66, -30);
  group.add(crown);

  // ---- palms: boulevard median + beach rows ----
  for (let z = -170; z <= 170; z += 17) {
    // Keep the chase-camera zone clear: a median palm next to the camera
    // would fill the frame with one giant trunk.
    if (z >= 8 && z <= 30) continue;
    const p = makePalm(rng, rand(rng, 0.8, 1.0));
    p.position.set(rand(rng, -1, 1), 0, z + rand(rng, -2, 2));
    group.add(p);
  }
  for (let z = -160; z <= 160; z += 13) {
    const p = makePalm(rng, rand(rng, 1.0, 1.3));
    p.position.set(-24 + rand(rng, -3, 3), 0, z + rand(rng, -3, 3));
    group.add(p);
    if (rng() < 0.6) {
      const p2 = makePalm(rng, rand(rng, 0.9, 1.2));
      p2.position.set(-42 + rand(rng, -4, 4), 0, z + rand(rng, -3, 3));
      group.add(p2);
    }
  }

  // ---- streetlights along the boulevard ----
  for (let z = -165; z <= 165; z += 22) {
    const l1 = makeStreetlight();
    l1.position.set(-9.5, 0, z);
    l1.rotation.y = Math.PI / 2;
    group.add(l1);
    const l2 = makeStreetlight();
    l2.position.set(9.5, 0, z + 11);
    l2.rotation.y = -Math.PI / 2;
    group.add(l2);
  }

  // ---- beach props: umbrellas, towels, volleyball ----
  const umbrellaCols = ['#ff5d5d', '#39d0c0', '#ffb340', '#ff5d8f', '#7fb2ff'];
  for (let i = 0; i < 14; i++) {
    const u = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 }),
    );
    pole.position.y = 1.3;
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: pick(rng, umbrellaCols), roughness: 0.8, side: THREE.DoubleSide }),
    );
    top.position.y = 2.7;
    u.add(pole, top);
    u.position.set(rand(rng, -120, -34), 0, rand(rng, -150, 150));
    u.rotation.y = rng() * Math.PI;
    group.add(u);
    const towel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.2),
      new THREE.MeshStandardMaterial({ color: pick(rng, umbrellaCols), roughness: 1, side: THREE.DoubleSide }),
    );
    towel.rotation.x = -Math.PI / 2;
    towel.rotation.z = rng() * Math.PI;
    towel.position.set(u.position.x + rand(rng, -2, 2), 0.03, u.position.z + rand(rng, -2, 2));
    group.add(towel);
  }

  // ---- ferris wheel on the beach (sunset silhouette) ----
  const wheel = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x3a2a44, roughness: 0.6, metalness: 0.4 });
  const legGeo = new THREE.CylinderGeometry(0.35, 0.5, 26, 8);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, wheelMat);
    leg.position.set(s * 5.5, 11, 0);
    leg.rotation.z = s * 0.22;
    wheel.add(leg);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(15, 0.5, 8, 40), wheelMat);
  rim.position.y = 24;
  wheel.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(9, 0.35, 8, 32), wheelMat);
  rim2.position.y = 24;
  wheel.add(rim2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 15, 6), wheelMat);
    spoke.position.set(Math.cos(a) * 7.5, 24 + Math.sin(a) * 7.5, 0);
    spoke.rotation.z = a + Math.PI / 2;
    wheel.add(spoke);
  }
  const gondolas = new THREE.Group();
  gondolas.position.y = 24;
  const gondolaCols = ['#ff5d5d', '#ffb340', '#39d0c0', '#ff5d8f', '#7fb2ff', '#9dff57'];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const cab = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: pick(rng, gondolaCols), roughness: 0.5 }),
    );
    body.scale.set(1, 0.8, 0.8);
    const light = glowSprite('rgba(255,220,130,0.8)', 3, 0.8);
    cab.add(body, light);
    cab.position.set(Math.cos(a) * 15, Math.sin(a) * 15, 0);
    gondolas.add(cab);
  }
  wheel.add(gondolas);
  wheel.position.set(-78, 0, -72);
  wheel.rotation.y = Math.PI / 2.4;
  group.add(wheel);
  animated.push({ update: (t) => { gondolas.rotation.z = t * 0.05; } });

  // ---- Gilded Quay marina (south-west) ----
  const marina = new THREE.Group();
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2c, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 26), dockMat);
    dock.position.set(-58 - i * 9, 0.35, 108);
    dock.castShadow = true;
    dock.receiveShadow = true;
    marina.add(dock);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 3), dockMat);
  cross.position.set(-71.5, 0.35, 95);
  cross.castShadow = true;
  marina.add(cross);
  // Quay promenade.
  const quay = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 22),
    new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1 }),
  );
  quay.rotation.x = -Math.PI / 2;
  quay.position.set(-55, 0.04, 84);
  quay.receiveShadow = true;
  marina.add(quay);
  // Boats: rounded hulls, bobbing.
  const boats = [];
  const hullCols = ['#f2ead8', '#ff8a5c', '#39d0c0', '#7fb2ff', '#ffd94d'];
  for (let i = 0; i < 6; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 10),
      new THREE.MeshStandardMaterial({ color: pick(rng, hullCols), roughness: 0.4 }),
    );
    hull.scale.set(1, 0.45, 2.6);
    hull.position.y = 0.4;
    hull.castShadow = true;
    boat.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5 }),
    );
    cabin.scale.set(1, 0.7, 1.4);
    cabin.position.set(0, 1.1, -0.6);
    boat.add(cabin);
    if (i % 2 === 0) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.8 }),
      );
      mast.position.set(0, 3.6, 0.8);
      boat.add(mast);
      const sail = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 4.4, 4),
        new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.9, side: THREE.DoubleSide }),
      );
      sail.scale.set(1, 1, 0.12);
      sail.position.set(0, 4.4, 0.8);
      sail.rotation.y = Math.PI / 4;
      boat.add(sail);
    }
    boat.position.set(-52 - i * 9.5, 0, 108 + (i % 2) * 8);
    boat.rotation.y = (rng() - 0.5) * 0.4;
    marina.add(boat);
    boats.push({ g: boat, phase: rng() * Math.PI * 2 });
  }
  animated.push({
    update: (t) => {
      for (const b of boats) {
        b.g.position.y = Math.sin(t * 0.7 + b.phase) * 0.14;
        b.g.rotation.z = Math.sin(t * 0.5 + b.phase) * 0.02;
      }
    },
  });
  // Working props on the quay + two boats pulled up close, so the marina
  // reads at shot distance (the docked boats sit 25 m behind the crew).
  const propMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3f6a8a, roughness: 0.7, metalness: 0.3 });
  for (const [cx, cz] of [[-50, 88.5], [-62, 87.5], [-54, 90.5], [-60, 90]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), propMat);
    crate.position.set(cx, 0.4, cz);
    crate.rotation.y = rng() * Math.PI;
    crate.castShadow = true;
    marina.add(crate);
  }
  for (const [bx, bz] of [[-51, 89.5], [-63, 89], [-57, 91]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 12), barrelMat);
    barrel.position.set(bx, 0.48, bz);
    barrel.castShadow = true;
    marina.add(barrel);
  }
  // Foreground dressing for the marina shot: the camera sits at z=75.5
  // looking at the crew (z≈82-85), so the ground at z≈79.5-80 fills the
  // bottom band of the frame. Low props only — nothing taller than 0.5 m
  // — so no face or foot is ever covered.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xb09a6a, roughness: 0.95 });
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 20), ropeMat);
  coil.rotation.x = -Math.PI / 2;
  coil.position.set(-55, 0.12, 79.5);
  coil.castShadow = true;
  marina.add(coil);
  const pallet = new THREE.Group();
  const palletMat = new THREE.MeshStandardMaterial({ color: 0x9a7a48, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.22), palletMat);
    slat.position.set(0, 0.12, -0.35 + i * 0.35);
    pallet.add(slat);
  }
  pallet.position.set(-57.5, 0, 80);
  pallet.rotation.y = 0.4;
  marina.add(pallet);
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x2e4a5e, roughness: 0.6, metalness: 0.4 });
  const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10), bollardMat);
  bollard.position.set(-60.5, 0.25, 79.5);
  bollard.castShadow = true;
  marina.add(bollard);
  const fgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), barrelMat);
  fgBarrel.position.set(-50.5, 0.25, 79.5);
  fgBarrel.castShadow = true;
  marina.add(fgBarrel);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.3, 10), propMat);
  bucket.position.set(-52.5, 0.15, 79.8);
  marina.add(bucket);
  for (const [hx, hz, hc] of [[-48, 100, '#ff8a5c'], [-64, 102, '#39d0c0']]) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 12, 10),
      new THREE.MeshStandardMaterial({ color: hc, roughness: 0.4 }),
    );
    hull.scale.set(1, 0.45, 2.4);
    hull.position.y = 0.4;
    hull.castShadow = true;
    boat.add(hull);
    const cabin = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5 }),
    );
    cabin.scale.set(1, 0.7, 1.3);
    cabin.position.set(0, 1.05, -0.5);
    boat.add(cabin);
    boat.position.set(hx, 0, hz);
    boat.rotation.y = (rng() - 0.5) * 0.6;
    marina.add(boat);
  }
  // Marina sign.
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: signTexture('GILDED QUAY', '#40204e', '#ffd94d') }),
  );
  sign.position.set(-55, 7, 76);
  marina.add(sign);
  const signPosts = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3a2a44 }),
  );
  signPosts.position.set(-62, 3.5, 76);
  marina.add(signPosts);
  const signPosts2 = signPosts.clone();
  signPosts2.position.x = -48;
  marina.add(signPosts2);
  group.add(marina);

  // ---- the explosion: a burning wreck ahead-right of the chase ----
  const boom = new THREE.Group();
  const fireCols = ['#ffdf6b', '#ff9a3c', '#ff5d2e'];
  const flames = [];
  for (let i = 0; i < 7; i++) {
    const f = glowSprite(fireCols[i % 3], rand(rng, 4, 9), 0.9);
    f.position.set(rand(rng, -2, 2), rand(rng, 0.5, 4.5), rand(rng, -2, 2));
    boom.add(f);
    flames.push(f);
  }
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x2a2028, roughness: 1, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(rng, 1.6, 3), 8, 8), smokeMat);
    s.position.set(rand(rng, -1.5, 1.5), 5 + i * 2.2, rand(rng, -1.5, 1.5));
    s.scale.y = 0.8;
    boom.add(s);
  }
  const fireLight = new THREE.PointLight(0xff7a2e, 60, 40, 1.8);
  fireLight.position.set(0, 3, 0);
  boom.add(fireLight);
  // The wreck itself: a burnt-out rounded car shell.
  const wreck = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1618, roughness: 0.9 }),
  );
  wreck.scale.set(1, 0.5, 2.2);
  wreck.position.y = 0.5;
  wreck.rotation.y = 0.5;
  boom.add(wreck);
  boom.position.set(14, 0, -52);
  group.add(boom);
  animated.push({
    update: (t) => {
      fireLight.intensity = 50 + Math.sin(t * 11) * 14 + Math.sin(t * 23) * 8;
      flames.forEach((f, i) => {
        f.material.opacity = 0.65 + 0.3 * Math.sin(t * 9 + i * 1.7);
      });
    },
  });

  // ---- shop signs on the boulevard buildings ----
  const signDefs = [
    { name: 'SOL & SALT', bg: '#0e4a5e', fg: '#ffd94d', x: 15.2, z: -40, ry: -Math.PI / 2 },
    { name: 'CAFÉ EMBER', bg: '#5e1f2a', fg: '#ffe9b0', x: 15.2, z: 24, ry: -Math.PI / 2 },
    { name: 'TACO LUNA', bg: '#c2521e', fg: '#fff3c4', x: 15.2, z: 84, ry: -Math.PI / 2 },
    { name: 'LA PLAYA SURF', bg: '#14586e', fg: '#9dff57', x: 15.2, z: -100, ry: -Math.PI / 2 },
  ];
  for (const s of signDefs) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3),
      new THREE.MeshBasicMaterial({ map: signTexture(s.name, s.bg, s.fg) }),
    );
    m.position.set(s.x, 6, s.z);
    m.rotation.y = s.ry;
    group.add(m);
  }

  // Traffic lanes (for the traffic system): [x, direction z, min z, max z].
  const lanes = [
    { x: -4.2, dir: -1, min: -175, max: 175 },
    { x: -1.4, dir: -1, min: -175, max: 175 },
    { x: 1.4, dir: 1, min: -175, max: 175 },
    { x: 4.2, dir: 1, min: -175, max: 175 },
  ];

  return {
    group,
    lanes,
    explosion: boom,
    ferrisWheel: wheel,
    update(t) {
      for (const a of animated) a.update(t);
    },
  };
}
