// Sirena Bay — the city. A coastal grid: Mermaid Mile, the palm boulevard,
// runs north-south; cross streets cut east-west; the beach and the sea lie
// east; the marina sits at the south end. Everything is painted canvas
// textures (road markings, lit windows, shop signs) on simple geometry, so
// the city costs no image files and no network request.
//
// Layout (metres, origin at the boulevard's middle):
//   Mermaid Mile: x = 0, running along Z, four lanes, z from -170 to +170.
//   Cross streets: z = -120, -80, -40, 0, 40, 80, 120.
//   Beach: x from 95 to 140. Sea: x > 140. Marina dock: x -45..-15, z 100..132.

(function () {
  'use strict';

  const U = window.SB.util;

  const SHOP_NAMES = [
    'CORAL CAFE', 'SURF SHACK', 'TACO TIDE', 'HOTEL SIRENA', 'PIER 9 DINER',
    'MANGO GROVE', 'BOLT BURGERS', 'LA PLAYA', 'REEL & BAIT', 'NEON PALMS',
    'CASINO SOL', 'BIKE HIRE', 'JUICE JOINT', 'HARBOUR BOOKS', 'TIDE POOL BAR',
  ];
  const FACADE_COLORS = ['#e8b48a', '#d98e7e', '#c9d6a3', '#a8c8d8', '#e8d8a8', '#d8a8b8', '#b8c8e8', '#e0c0a0'];

  function mat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough === undefined ? 0.9 : rough, metalness: metal || 0 });
  }

  // Asphalt with a yellow centre line and white dashes, tiling along the road.
  function roadTexture() {
    return U.makeTexture(256, 256, (ctx) => {
      ctx.fillStyle = '#2e3138';
      ctx.fillRect(0, 0, 256, 256);
      const rng = U.makeRng(7);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(rng() * 256, rng() * 256, 2, 2);
      }
      ctx.fillStyle = '#d8b93a';
      ctx.fillRect(122, 0, 6, 256);
      ctx.fillRect(134, 0, 6, 256);
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(60, 20, 5, 60);
      ctx.fillRect(60, 148, 5, 60);
      ctx.fillRect(191, 20, 5, 60);
      ctx.fillRect(191, 148, 5, 60);
    }, true);
  }

  // A building facade: pastel wall, a grid of windows (some lit warm),
  // and a ground-floor shopfront with a painted sign.
  function facadeTexture(rng, name, color) {
    return U.makeTexture(256, 512, (ctx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 512);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, 256, 14);
      // Window grid, 4 across, 7 up.
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 4; c++) {
          const x = 18 + c * 58;
          const y = 26 + r * 52;
          const lit = rng() > 0.55;
          ctx.fillStyle = lit ? '#ffd98a' : '#1d2f42';
          ctx.fillRect(x, y, 38, 32);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(x, y, 38, 5);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x + 17, y, 3, 32);
        }
      }
      // Shopfront: awning stripes, glass, sign board with the shop's name.
      ctx.fillStyle = '#20242c';
      ctx.fillRect(0, 412, 256, 100);
      ctx.fillStyle = '#9fd8e8';
      ctx.fillRect(14, 436, 228, 56);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(14, 436, 228, 10);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#c0392b' : '#f5f0e6';
        ctx.fillRect(14 + i * 30, 412, 30, 20);
      }
      ctx.fillStyle = '#14181f';
      ctx.fillRect(28, 396, 200, 26);
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 410);
    });
  }

  function woodTexture() {
    return U.makeTexture(256, 256, (ctx) => {
      ctx.fillStyle = '#8a6a42';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#7d5f3a' : '#93744a';
        ctx.fillRect(0, i * 32, 256, 32);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, i * 32, 256, 2);
      }
      const rng = U.makeRng(11);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(60,40,15,0.25)';
        ctx.fillRect(rng() * 256, rng() * 256, 14, 2);
      }
    }, true);
  }

  function buildSky(scene) {
    const skyTex = U.makeTexture(64, 512, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, '#2a4a7a');
      g.addColorStop(0.45, '#7aa8d8');
      g.addColorStop(0.72, '#f7c98a');
      g.addColorStop(0.88, '#ff9e6a');
      g.addColorStop(1, '#e8785a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 512);
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(600, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    scene.add(dome);
    scene.fog = new THREE.Fog(0xf2b98a, 120, 420);
    // Sun: warm directional light with shadows.
    const sun = new THREE.DirectionalLight(0xffe0b0, 2.4);
    sun.position.set(-60, 90, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -170;
    sun.shadow.camera.right = 170;
    sun.shadow.camera.top = 170;
    sun.shadow.camera.bottom = -170;
    sun.shadow.camera.far = 300;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    // A soft frontal fill so faces never fall black.
    const fill = new THREE.DirectionalLight(0xfff2dd, 0.9);
    fill.position.set(40, 40, -80);
    scene.add(fill);
    const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x8a6a4a, 1.1);
    scene.add(hemi);
  }

  function flat(w, d, material, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    m.rotation.x = -Math.PI / 2;
    if (ry) m.rotation.z = ry;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    return m;
  }

  function buildGround(scene) {
    // Grass base.
    scene.add(flat(500, 500, mat('#7fae5a', 1), 0, -0.05, 0));
    // Sand beach, east side.
    const sand = flat(46, 400, mat('#e8d29a', 1), 118, 0.0, 0);
    scene.add(sand);
    // Sea: a glossy blue plane east of the sand.
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 500),
      new THREE.MeshStandardMaterial({ color: '#2a7ab8', roughness: 0.15, metalness: 0.55, transparent: true, opacity: 0.94 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(250, 0.02, 0);
    sea.receiveShadow = true;
    scene.add(sea);
    // Marina lagoon at the south end.
    const lagoon = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 80),
      new THREE.MeshStandardMaterial({ color: '#2a7ab8', roughness: 0.15, metalness: 0.55, transparent: true, opacity: 0.94 })
    );
    lagoon.rotation.x = -Math.PI / 2;
    lagoon.position.set(-30, 0.02, 155);
    scene.add(lagoon);
  }

  function buildRoads(scene) {
    const tex = roadTexture();
    tex.repeat.set(1, 12);
    // Mermaid Mile, the boulevard (14 wide, along Z).
    const mile = flat(14, 340, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), 0, 0.02, 0);
    scene.add(mile);
    // Cross streets (10 wide, along X).
    [-120, -80, -40, 0, 40, 80, 120].forEach((z) => {
      const t = tex.clone();
      t.needsUpdate = true;
      t.repeat.set(10, 1);
      const road = flat(200, 10, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), 0, 0.02, z, Math.PI / 2);
      scene.add(road);
    });
    // Sidewalks: pale strips flanking the boulevard.
    [-8.5, 8.5].forEach((x) => {
      scene.add(flat(3, 340, mat('#c9c2b4', 1), x, 0.06, 0));
    });
    // Zebra crossings where the boulevard meets each cross street.
    [-80, -40, 0, 40, 80].forEach((z) => {
      for (let i = 0; i < 7; i++) {
        scene.add(flat(0.9, 3.2, mat('#f0eee8', 1), -5.4 + i * 1.8, 0.05, z + 7.5));
        scene.add(flat(0.9, 3.2, mat('#f0eee8', 1), -5.4 + i * 1.8, 0.05, z - 7.5));
      }
    });
  }

  // Returns the building footprints so the game can collide with them.
  const buildingBoxes = [];
  function buildBuildings(scene, rng) {
    const blocks = [];
    for (let bx = -3; bx <= 3; bx++) {
      for (let bz = -3; bz <= 2; bz++) {
        if (bx === 0) continue; // the boulevard
        blocks.push({ x: bx * 26, z: bz * 40 + 20 });
      }
    }
    let shopIdx = 0;
    blocks.forEach((b) => {
      if (rng() < 0.18) return; // an empty lot, a pocket park
      const w = U.range(rng, 12, 18);
      const d = U.range(rng, 12, 18);
      const h = U.range(rng, 9, 34);
      const color = U.pick(rng, FACADE_COLORS);
      const name = SHOP_NAMES[shopIdx++ % SHOP_NAMES.length];
      const facade = facadeTexture(rng, name, color);
      const geo = new THREE.BoxGeometry(w, h, d);
      const side = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.85 });
      const top = mat('#8a8a8a', 1);
      const building = new THREE.Mesh(geo, [side, side, top, top, side, side]);
      building.position.set(b.x, h / 2, b.z);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      buildingBoxes.push({ x: b.x, z: b.z, w: w, d: d });
      // Rooftop props: a cylinder water tank or an AC dome.
      if (rng() > 0.5) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 12), mat('#9a8a7a', 0.9));
        tank.position.set(b.x + U.range(rng, -3, 3), h + 1.1, b.z + U.range(rng, -3, 3));
        tank.castShadow = true;
        scene.add(tank);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#7a6a5a', 0.9));
        cap.position.copy(tank.position);
        cap.position.y = h + 2.2;
        scene.add(cap);
      }
    });
    // Two round towers near the beach for a skyline that is not all boxes.
    [[70, -60, 42], [78, 60, 36]].forEach((t) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, t[2], 20), mat('#d8c8b0', 0.85));
      tower.position.set(t[0], t[2] / 2, t[1]);
      tower.castShadow = true;
      scene.add(tower);
      const domeTop = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b83a2a', 0.6));
      domeTop.position.set(t[0], t[2], t[1]);
      scene.add(domeTop);
      buildingBoxes.push({ x: t[0], z: t[1], w: 16, d: 16 });
    });
  }

  function buildPalm(x, z, rng) {
    const g = new THREE.Group();
    const lean = U.range(rng, -0.25, 0.25);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean * 2, 3, 0),
      new THREE.Vector3(lean * 4.5, 6, 0),
      new THREE.Vector3(lean * 6.5, 8.2, 0),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.22, 8), mat('#7a5a38', 0.95));
    trunk.castShadow = true;
    g.add(trunk);
    const top = new THREE.Vector3(lean * 6.5, 8.2, 0);
    // Seven fronds: flattened ellipsoids drooping outward.
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat('#3f9a3a', 0.9));
      frond.scale.set(2.6, 0.12, 0.7);
      const holder = new THREE.Group();
      holder.position.copy(top);
      holder.rotation.y = (i / 7) * Math.PI * 2;
      frond.position.set(2.2, -0.4, 0);
      frond.rotation.z = -0.45;
      holder.add(frond);
      g.add(holder);
    }
    // Coconuts: three small spheres under the crown.
    for (let i = 0; i < 3; i++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat('#5a3a1e', 0.9));
      nut.position.set(top.x + Math.cos(i * 2.1) * 0.3, top.y - 0.35, Math.sin(i * 2.1) * 0.3);
      g.add(nut);
    }
    g.position.set(x, 0, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function buildPalms(scene, rng) {
    for (let z = -160; z <= 160; z += 20) {
      scene.add(buildPalm(-11.5, z + U.range(rng, -2, 2), rng));
      scene.add(buildPalm(11.5, z + 10 + U.range(rng, -2, 2), rng));
    }
    for (let z = -140; z <= 140; z += 26) {
      scene.add(buildPalm(100 + U.range(rng, -4, 4), z, rng));
    }
  }

  function buildStreetProps(scene, rng) {
    // Streetlights along the boulevard.
    for (let z = -150; z <= 150; z += 30) {
      [-11, 11].forEach((x) => {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), mat('#3a3f46', 0.6, 0.6));
        pole.position.y = 3.25;
        g.add(pole);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), mat('#3a3f46', 0.6, 0.6));
        arm.rotation.z = Math.PI / 2;
        arm.position.set(x > 0 ? -0.7 : 0.7, 6.4, 0);
        g.add(arm);
        const lampHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 8),
          new THREE.MeshStandardMaterial({ color: '#fff2b0', emissive: '#ffdf70', emissiveIntensity: 1.2 })
        );
        lampHead.scale.set(1.4, 0.6, 0.8);
        lampHead.position.set(x > 0 ? -1.4 : 1.4, 6.35, 0);
        g.add(lampHead);
        g.position.set(x, 0, z);
        g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(g);
      });
    }
    // Beach umbrellas + towels.
    for (let i = 0; i < 10; i++) {
      const x = 102 + rng() * 26;
      const z = -130 + rng() * 260;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), mat('#e8e8e8', 0.8));
      pole.position.set(x, 1.2, z);
      scene.add(pole);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 12), mat(U.pick(rng, ['#e85a5a', '#4a90d8', '#f2c230', '#5ab87a']), 0.85));
      shade.position.set(x, 2.6, z);
      shade.castShadow = true;
      scene.add(shade);
      const towel = flat(1.1, 2.2, mat(U.pick(rng, ['#e85a8a', '#4ad8c8', '#f2a230']), 1), x + 2.2, 0.04, z + 1);
      scene.add(towel);
    }
    // Hydrants: small red rounded posts near corners.
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 10), mat('#c0392b', 0.6));
      body.position.y = 0.28;
      g.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#c0392b', 0.6));
      cap.position.y = 0.58;
      g.add(cap);
      g.position.set(U.pick(rng, [-10.5, 10.5]), 0, -120 + i * 34);
      scene.add(g);
    }
  }

  function buildBoat(rng, color) {
    const g = new THREE.Group();
    // Hull: a stretched, tapered shape from a lathe-like profile — built as
    // a scaled sphere cut by a deck plane, plus a pointed bow cone.
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(color, 0.4, 0.3));
    hull.scale.set(1.1, 0.65, 2.6);
    hull.position.y = 0.25;
    g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 12), mat(color, 0.4, 0.3));
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0.3, 2.6);
    bow.scale.set(1, 1, 0.7);
    g.add(bow);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 16), mat('#e8e0d0', 0.8));
    deck.scale.set(1, 1, 2.4);
    deck.position.y = 0.62;
    g.add(deck);
    const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.8, 4, 12), mat('#f5f2ea', 0.5));
    cabin.rotation.x = Math.PI / 2;
    cabin.position.set(0, 1.0, -0.4);
    g.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 8), mat('#d8d0c0', 0.7));
    mast.position.set(0, 2.2, 0.6);
    g.add(mast);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  // The marina: a wooden dock over the lagoon, posts, boats, crates and
  // barrels — the stage for the crew shot. Returns the dock's centre.
  function buildMarina(scene, rng) {
    const wood = woodTexture();
    wood.repeat.set(6, 2);
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.5, 26),
      new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 })
    );
    dock.position.set(-30, 0.35, 118);
    dock.receiveShadow = true;
    dock.castShadow = true;
    scene.add(dock);
    // Dock posts: rounded cylinders along the edges.
    for (let x = -44; x <= -16; x += 4) {
      [-0, 0].forEach(() => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 10), mat('#5a4630', 0.95));
        post.position.set(x, 0.6, 130.5);
        post.castShadow = true;
        scene.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat('#5a4630', 0.95));
        cap.position.set(x, 1.45, 130.5);
        scene.add(cap);
      });
    }
    // Boats floating past the dock edge.
    const boat1 = buildBoat(rng, '#e8e8e8');
    boat1.position.set(-38, 0.1, 138);
    boat1.rotation.y = 0.4;
    scene.add(boat1);
    const boat2 = buildBoat(rng, '#3a6ab0');
    boat2.position.set(-20, 0.1, 140);
    boat2.rotation.y = -0.3;
    scene.add(boat2);
    // Crates (rounded-edge boxes are crates — cargo, not people) and barrels.
    const crateMat = mat('#b08a4a', 0.9);
    [[-40, 108], [-38.5, 109.5], [-39.2, 107.2]].forEach((p, i) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
      crate.position.set(p[0], 0.6 + (i === 2 ? 1.1 : 0), p[1]);
      crate.rotation.y = rng() * 0.6;
      crate.castShadow = true;
      scene.add(crate);
    });
    [[-22, 110], [-21, 111.2], [-23, 111]].forEach((p) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 12), mat('#3a7ab0', 0.7));
      barrel.position.set(p[0], 1.15, p[1]);
      barrel.castShadow = true;
      scene.add(barrel);
    });
    // A spare outboard engine on a crate — the mechanic's work.
    const engine = new THREE.Group();
    const engineBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 10), mat('#2b2f36', 0.5, 0.6));
    engineBody.position.y = 0.5;
    engine.add(engineBody);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), mat('#4a4f56', 0.5, 0.6));
    shaft.position.y = -0.15;
    engine.add(shaft);
    engine.position.set(-26, 1.15, 112);
    engine.rotation.z = 0.2;
    scene.add(engine);
    return { dockCenter: new THREE.Vector3(-30, 0.6, 118), boat1: boat1, boat2: boat2 };
  }

  function buildCity(scene, seed) {
    const rng = U.makeRng(seed || 20261121);
    buildSky(scene);
    buildGround(scene);
    buildRoads(scene);
    buildBuildings(scene, rng);
    buildPalms(scene, rng);
    buildStreetProps(scene, rng);
    const marina = buildMarina(scene, rng);
    return { marina: marina, buildings: buildingBoxes };
  }

  window.SB.city = { buildCity, buildBoat, buildPalm };
})();
