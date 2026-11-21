// SOLSTICE BAY — the city: painted ground, facaded buildings with parapets
// and varied rooflines, palms, street furniture, beach and marina.
window.SB = window.SB || {};
SB.buildCity = function (scene) {
  const M = SB.Models;
  const world = { buildings: [], palms: [], signs: [], marina: new THREE.Group() };
  const R = (function () { let s = 1234; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

  // ---- sky dome + sun + clouds
  const skyGeo = new THREE.SphereGeometry(420, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({ map: SB.TEX.sky(), side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  const sunTex = (function () {
    const c = SB.TEX.canvas(128, 128);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,240,200,1)');
    grad.addColorStop(0.35, 'rgba(255,190,110,0.9)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return SB.TEX.tex(c);
  })();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sun.position.set(-320, 70, -80);
  sun.scale.set(150, 150, 1);
  scene.add(sun);
  const cloudTex = SB.TEX.cloud();
  for (let i = 0; i < 12; i++) {
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.75, fog: false, depthWrite: false }));
    cl.position.set(-300 + R() * 500, 70 + R() * 60, -260 + R() * 420);
    cl.scale.set(90 + R() * 90, 26 + R() * 18, 1);
    scene.add(cl);
  }

  // ---- ground: one painted canvas (roads, crosswalks, sidewalks, sand, water)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshStandardMaterial({ map: SB.TEX.ground(), roughness: 0.95, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- water strip (west edge): glossy translucent plane over the painted sea
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 420),
    new THREE.MeshStandardMaterial({ color: 0x2e8fa8, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.82 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-187, 0.06, 0);
  scene.add(water);

  // ---- buildings
  const palettes = [
    { base: '#d8b48f', shop: '#20303e', sign: 'MANGO & RYE', awning: '#e84c6a' },
    { base: '#c9d4d8', shop: '#2e3a2e', sign: 'BOLT BURGER', awning: '#e8a33c' },
    { base: '#e0c9a8', shop: '#3e2a20', sign: 'TACO MARLIN', awning: '#3fae8a' },
    { base: '#b9c4a8', shop: '#232a3e', sign: 'SURF & SUPPLY', awning: '#4c7de8' },
    { base: '#d8a8a8', shop: '#33202a', sign: 'CORAL NAILS', awning: '#e8e04c' },
    { base: '#a8b8d8', shop: '#1e2e2a', sign: 'HARBOUR BOOKS', awning: '#c04ce8' },
  ];
  function building(x, z, w, d, h, pal, opts) {
    const o = opts || {};
    const g = new THREE.Group();
    const facadeTex = SB.TEX.facade({ base: pal.base, floors: Math.max(2, Math.round(h / 4.5)), seed: Math.floor(x * 7 + z * 13), sign: pal.sign, shopColor: pal.shop, awning: pal.awning });
    const side = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.85, metalness: 0 });
    const top = new THREE.MeshStandardMaterial({ color: 0x8a8078, roughness: 1 });
    const mats = [side, side, top, top, side, side];
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    // parapet rim: slightly wider thin lip around the roof edge
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.7, d + 0.5),
      new THREE.MeshStandardMaterial({ color: 0x6e655c, roughness: 0.95 }));
    rim.position.y = h + 0.2;
    rim.castShadow = true;
    g.add(rim);
    if (o.roof === 'prism') {
      // triangular prism roof (3-sided cylinder laid flat)
      const prism = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.42, Math.min(w, d) * 0.42, Math.max(w, d) * 0.9, 3, 1),
        new THREE.MeshStandardMaterial({ color: 0xa84c3c, roughness: 0.8 }));
      prism.rotation.z = Math.PI / 2;
      prism.rotation.y = w >= d ? 0 : Math.PI / 2;
      prism.rotation.x = Math.PI; // flat face down
      prism.position.y = h + Math.min(w, d) * 0.2;
      prism.castShadow = true;
      g.add(prism);
    }
    if (o.roof === 'tower') {
      // stepped setback floor
      const set = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.22, d * 0.55), side);
      set.position.y = h + h * 0.11;
      set.castShadow = true;
      g.add(set);
      const rim2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55 + 0.4, 0.5, d * 0.55 + 0.4), rim.material);
      rim2.position.y = h + h * 0.22 + 0.1;
      g.add(rim2);
    }
    // rooftop props: AC cylinders, water tank, antenna
    if (R() < 0.7) {
      const ac = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 14),
        new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.6, metalness: 0.4 }));
      ac.position.set(w * 0.25, h + 0.6, d * 0.2);
      ac.castShadow = true;
      g.add(ac);
    }
    if (R() < 0.4) {
      const tank = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 14),
        new THREE.MeshStandardMaterial({ color: 0x9a7a5a, roughness: 0.9 }));
      cyl.position.y = 0.9;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 14),
        new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }));
      cap.position.y = 2.2;
      tank.add(cyl, cap);
      tank.position.set(-w * 0.28, h + 0.4, -d * 0.22);
      tank.traverse((m) => { m.castShadow = true; });
      g.add(tank);
    }
    if (R() < 0.5) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.5, metalness: 0.6 }));
      ant.position.set(w * 0.3, h + 2.2, -d * 0.25);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.5 }));
      tip.position.set(w * 0.3, h + 4.3, -d * 0.25);
      g.add(ant, tip);
    }
    // striped awning over the shop front (faces the street, +Z side)
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.2),
      new THREE.MeshStandardMaterial({ color: pal.awning, roughness: 0.9, side: THREE.DoubleSide }));
    awn.position.set(0, 3.4, d / 2 + 0.9);
    awn.rotation.x = -0.5;
    awn.castShadow = true;
    g.add(awn);
    g.position.set(x, 0, z);
    g.rotation.y = o.rot || 0;
    scene.add(g);
    world.buildings.push(g);
    return g;
  }

  // blocks between roads (roads at multiples of 44; blocks centred at +22)
  let bi = 0;
  for (let i = -4; i <= 3; i++) {
    for (let j = -4; j <= 3; j++) {
      const cx = i * 44 + 22, cz = j * 44 + 22;
      if (cx < -140) continue; // beach zone
      // marina quarter stays open
      if (cx < -100 && cz > 40) continue;
      const distC = Math.hypot(cx, cz);
      const tall = distC < 70 ? 0.5 : 0.15;
      const pal = palettes[(Math.abs(i * 3 + j * 7 + bi) % palettes.length)];
      bi++;
      const h = R() < tall ? 22 + R() * 20 : 8 + R() * 12;
      const w = 16 + R() * 10, d = 14 + R() * 10;
      const roof = R() < 0.3 ? 'prism' : (R() < 0.3 ? 'tower' : 'flat');
      building(cx + (R() - 0.5) * 4, cz + (R() - 0.5) * 4, w, d, h, pal, { roof, rot: (R() < 0.5 ? 0 : Math.PI) });
      // second smaller building on the block
      if (R() < 0.6) {
        const pal2 = palettes[(bi + 2) % palettes.length];
        building(cx + (R() - 0.5) * 14, cz + (R() - 0.5) * 14, 10 + R() * 6, 9 + R() * 5, 7 + R() * 7, pal2, { roof: 'flat' });
      }
    }
  }
  // landmark hotel tower near the beach
  building(-118, -60, 22, 20, 42, palettes[1], { roof: 'tower' });
  // casino with a neon sign
  const casino = building(-118, 10, 26, 20, 14, { base: '#2a2038', shop: '#1a1424', sign: 'LUCKY PELICAN', awning: '#ff5d8f' }, { roof: 'flat' });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(16, 3),
    new THREE.MeshBasicMaterial({ map: SB.TEX.sign('LUCKY PELICAN', '#14101f', '#ff5d8f'), transparent: false }));
  neon.position.set(-118, 12.5, 21);
  scene.add(neon);
  world.signs.push(neon);

  // ---- palms along the beach + avenues
  for (let z = -180; z <= 180; z += 18) {
    const p = M.palm(Math.floor(z));
    p.position.set(-158 + R() * 6, 0, z + R() * 6);
    p.rotation.y = R() * Math.PI * 2;
    scene.add(p);
    world.palms.push(p);
  }
  for (let x = -120; x <= 170; x += 36) {
    for (const z of [-66, 22, 110]) {
      if (R() < 0.6) {
        const p = M.palm(Math.floor(x + z));
        p.position.set(x + 8, 0, z + 8);
        p.scale.setScalar(0.85);
        scene.add(p);
        world.palms.push(p);
      }
    }
  }
  // round-canopy trees in block courtyards
  for (let i = 0; i < 26; i++) {
    const t = M.tree(i);
    t.position.set(-120 + R() * 280, 0, -170 + R() * 340);
    scene.add(t);
  }

  // ---- streetlights + traffic lights at intersections
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const x = i * 44, z = j * 44;
      if (x < -130) continue;
      const sl = M.streetlight();
      sl.position.set(x + 8.5, 0, z + 8.5);
      sl.rotation.y = (i + j) % 2 ? Math.PI / 2 : 0;
      scene.add(sl);
      if ((i + j) % 2 === 0) {
        const tl = M.trafficLight();
        tl.position.set(x - 8.5, 0, z - 8.5);
        tl.rotation.y = Math.PI / 4;
        scene.add(tl);
      }
    }
  }

  // ---- marina: docks + boats (southwest, x -150..-190, z 60..130)
  const marina = world.marina;
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.95 });
  for (let d = 0; d < 3; d++) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(34, 0.35, 2.6), dockMat);
    dock.position.set(-172, 0.35, 66 + d * 26);
    dock.castShadow = true;
    dock.receiveShadow = true;
    marina.add(dock);
    for (let p = 0; p < 5; p++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 8), dockMat);
      post.position.set(-186 + p * 7, 0.4, 64.6 + d * 26);
      marina.add(post);
    }
  }
  const boatColors = [0xf2f0ea, 0xdfeaf2, 0xf2e3d8, 0xe2f2e8, 0xf2dfe8];
  [[-178, 58], [-170, 86], [-180, 112], [-162, 122], [-166, 72]].forEach(([x, z], i) => {
    const b = M.boat(boatColors[i % boatColors.length]);
    b.position.set(x, 0.12, z);
    b.rotation.y = (i % 2 ? 0.2 : -0.15) + (i % 3 === 0 ? Math.PI : 0);
    marina.add(b);
  });
  // marina crew platform (where the crew stands for the marina shot)
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.4, 0.5, 20), dockMat);
  platform.position.set(-152, 0.25, 92);
  platform.castShadow = true;
  platform.receiveShadow = true;
  marina.add(platform);
  scene.add(marina);

  return world;
};
