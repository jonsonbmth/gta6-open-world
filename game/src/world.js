// The city of Verano Bay: sky dome, ocean + beach, road grid, buildings with
// lit windows and shop signs, palms, streetlights, traffic lights, crosswalks
// and marina props. Everything is procedural boxes/planes/cylinders.

(function () {
  'use strict';
  const U = VB.util;

  const WORLD = {
    group: null, ocean: null, clouds: [],
    bounds: { minX: -160, maxX: 160, minZ: -160, maxZ: 160 },
  };

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  function buildSky(scene) {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(420, 24, 16),
      new THREE.MeshBasicMaterial({ map: U.skyTexture(), side: THREE.BackSide, fog: false })
    );
    scene.add(sky);
    scene.fog = new THREE.Fog(VB.CONFIG.fog, 90, 380);

    const sun = new THREE.DirectionalLight(0xffd9a0, 2.4);
    sun.position.set(90, 120, 60);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x8a7fd8, 0x8a5a3a, 1.1));
    const amb = new THREE.AmbientLight(0xffc9a0, 0.55);
    scene.add(amb);
  }

  function buildGround(scene) {
    const g = new THREE.Group();
    const tex = U.groundTexture();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);

    // Beach strip (east side) + ocean beyond it.
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 42),
      new THREE.MeshStandardMaterial({ color: 0xe8c98f, roughness: 1 })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.05, -186);
    g.add(sand);
    WORLD.ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 220),
      new THREE.MeshStandardMaterial({ color: 0x1e6f8e, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.92 })
    );
    WORLD.ocean.rotation.x = -Math.PI / 2;
    WORLD.ocean.position.set(0, 0.02, -310);
    g.add(WORLD.ocean);

    // Boardwalk band along the beach.
    const board = box(340, 0.3, 8, new THREE.MeshStandardMaterial({ color: 0x9a6b4a, roughness: 1 }), 0, 0.15, -162);
    g.add(board);
    scene.add(g);
  }

  function buildBuildings(scene) {
    const g = new THREE.Group();
    const rnd = U.mulberry32(20261121);
    const walls = ['#c98d6b', '#b07a8a', '#8a9ab0', '#d8b48f', '#7a8a9a', '#c9a05a'];
    const facades = walls.map((w, i) => U.facadeTexture(100 + i * 7, w, '#ffd98a'));
    const blocks = [];
    for (let ix = -2; ix <= 2; ix++) {
      for (let iz = -2; iz <= 2; iz++) {
        if (ix === 0 && iz === 0) continue; // keep the chase avenue clear
        blocks.push([ix * 62, iz * 62]);
      }
    }
    for (const [bx, bz] of blocks) {
      const n = 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const w = 16 + rnd() * 14, d = 16 + rnd() * 14, h = 14 + rnd() * rnd() * 46;
        const x = bx + (k - 0.5) * 26 + (rnd() - 0.5) * 8;
        const z = bz + (rnd() - 0.5) * 14;
        const mat = new THREE.MeshStandardMaterial({ map: facades[Math.floor(rnd() * facades.length)], roughness: 0.9 });
        const b = box(w, h, d, mat, x, h / 2, z);
        g.add(b);
        // Roof rim.
        g.add(box(w + 1, 1, d + 1, new THREE.MeshStandardMaterial({ color: 0x4a3a32, roughness: 1 }), x, h + 0.5, z));
        // Rooftop AC / water tank props.
        if (rnd() < 0.6) g.add(box(3, 2, 3, new THREE.MeshStandardMaterial({ color: 0x6a6a72 }), x + w / 4, h + 1.5, z));
      }
    }
    // Two tall towers for the skyline.
    const towerMat = new THREE.MeshStandardMaterial({ map: U.facadeTexture(777, '#5a6a8a', '#ffe9a8'), roughness: 0.85 });
    g.add(box(22, 95, 22, towerMat, -95, 47.5, -110));
    g.add(box(20, 78, 20, towerMat, 110, 39, -95));
    scene.add(g);
  }

  function buildShops(scene) {
    const g = new THREE.Group();
    const rnd = U.mulberry32(555);
    const spots = [
      [-24, -40, 0], [-24, 24, 0], [30, -52, Math.PI], [30, 40, Math.PI],
      [-52, -8, Math.PI / 2], [58, 8, -Math.PI / 2], [-8, -72, 0], [8, 72, Math.PI],
    ];
    VB.CONFIG.shops.forEach((name, i) => {
      const [x, z, rot] = spots[i % spots.length];
      const shop = new THREE.Group();
      const body = box(14, 7, 8, new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.95 }), 0, 3.5, 0);
      shop.add(body);
      const awning = box(15, 0.6, 3.5, new THREE.MeshStandardMaterial({ color: [0xd84a5a, 0x2a9a8a, 0xe8a33d, 0x5a7ad8][i % 4], roughness: 0.8 }), 0, 5.2, 4.6);
      shop.add(awning);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 2.2),
        new THREE.MeshBasicMaterial({ map: U.signTexture(name, ['#20243a', '#7a1a2a', '#143a5a', '#3a2a5a'][i % 4], '#ffe9a8') })
      );
      sign.position.set(0, 6.2, 4.1);
      shop.add(sign);
      // Lit storefront window.
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 3.4),
        new THREE.MeshBasicMaterial({ color: 0xffe9b0 })
      );
      win.position.set(0, 2.4, 4.05);
      shop.add(win);
      shop.position.set(x + (rnd() - 0.5) * 4, 0, z + (rnd() - 0.5) * 4);
      shop.rotation.y = rot;
      g.add(shop);
    });
    scene.add(g);
  }

  function palm(x, z, s, lean) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * s, 0.42 * s, 7 * s, 6),
      new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 })
    );
    trunk.position.y = 3.5 * s;
    trunk.rotation.z = lean || 0;
    g.add(trunk);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8a3a, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1 * s, 4.6 * s), frondMat);
      const a = (i / 7) * Math.PI * 2;
      f.position.set(Math.cos(a) * 1.7 * s, 7 * s - 0.4, Math.sin(a) * 1.7 * s);
      f.rotation.set(Math.sin(a) * 0.9 - 0.5, 0, Math.cos(a) * 0.9 + 0.5);
      f.rotation.y = -a;
      g.add(f);
    }
    const nuts = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * s, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a })
    );
    nuts.position.y = 6.8 * s;
    g.add(nuts);
    g.position.set(x, 0, z);
    return g;
  }

  function buildPalmsAndLights(scene) {
    const g = new THREE.Group();
    const rnd = U.mulberry32(99);
    // Palms lining the chase avenue and the beach boardwalk.
    for (let z = -140; z <= 140; z += 18) {
      g.add(palm(-17 + (rnd() - 0.5) * 2, z, 1 + rnd() * 0.4, (rnd() - 0.5) * 0.16));
      g.add(palm(19 + (rnd() - 0.5) * 2, z + 9, 1 + rnd() * 0.4, (rnd() - 0.5) * 0.16));
    }
    for (let x = -150; x <= 150; x += 16) {
      g.add(palm(x, -158 + (rnd() - 0.5) * 3, 1.1 + rnd() * 0.5, (rnd() - 0.5) * 0.2));
    }
    // Streetlights with warm pools.
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.7, metalness: 0.5 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
    for (let z = -120; z <= 120; z += 40) {
      for (const x of [-15, 17]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 8, 6), poleMat);
        pole.position.set(x, 4, z);
        g.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
        lamp.position.set(x, 8.2, z);
        g.add(lamp);
      }
    }
    // Traffic light at the main junction.
    const tl = new THREE.Group();
    tl.add(box(0.4, 7, 0.4, poleMat, 0, 3.5, 0));
    tl.add(box(1.1, 2.6, 0.5, new THREE.MeshStandardMaterial({ color: 0x222222 }), 0, 7.4, 0));
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    red.position.set(0, 8.1, 0.3); tl.add(red);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2aff66 }));
    green.position.set(0, 6.7, 0.3); tl.add(green);
    tl.position.set(-14, 0, -28);
    g.add(tl);
    scene.add(g);
  }

  // Marina: docks, boats, bollards, crates — the marina shot's set.
  function buildMarina(scene) {
    const g = new THREE.Group();
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
    for (let i = 0; i < 3; i++) {
      g.add(box(4, 0.5, 46, dockMat, -20 + i * 18, 0.35, -185));
    }
    g.add(box(70, 0.5, 5, dockMat, -2, 0.35, -164));
    // Boats: hull + cabin + mast.
    const hullCols = [0xf2f2f2, 0x2a7ad8, 0xd84a5a, 0xf2e8d8];
    for (let i = 0; i < 4; i++) {
      const boat = new THREE.Group();
      const hull = box(4, 1.6, 12, new THREE.MeshStandardMaterial({ color: hullCols[i], roughness: 0.6 }), 0, 0.8, 0);
      boat.add(hull);
      boat.add(box(3, 1.6, 5, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 0, 2.2, -1));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
      mast.position.set(0, 6, 1);
      boat.add(mast);
      boat.position.set(-30 + i * 18, 0, -196 - (i % 2) * 8);
      boat.rotation.y = (i % 2 ? 0.06 : -0.05);
      g.add(boat);
    }
    // Crates + bollards on the quay.
    for (let i = 0; i < 6; i++) {
      g.add(box(1.6, 1.6, 1.6, new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 1 }), -28 + i * 9, 0.8, -160));
    }
    scene.add(g);
  }

  // Puffy cloud billboards for a richer marina sky.
  function buildClouds(scene) {
    const tex = U.cloudTexture();
    const spots = [[-60, 70, -260], [20, 88, -280], [90, 64, -250], [-120, 80, -230], [140, 90, -270]];
    for (const [x, y, z] of spots) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
      sp.position.set(x, y, z);
      sp.scale.set(90, 42, 1);
      scene.add(sp);
      WORLD.clouds.push(sp);
    }
  }

  WORLD.build = function (scene) {
    buildSky(scene);
    buildGround(scene);
    buildBuildings(scene);
    buildShops(scene);
    buildPalmsAndLights(scene);
    buildMarina(scene);
    buildClouds(scene);
  };

  WORLD.update = function (t) {
    if (WORLD.ocean) WORLD.ocean.position.y = 0.02 + Math.sin(t * 0.5) * 0.05;
    for (let i = 0; i < WORLD.clouds.length; i++) {
      WORLD.clouds[i].position.x += Math.sin(t * 0.05 + i) * 0.004;
    }
  };

  VB.world = WORLD;
})();
