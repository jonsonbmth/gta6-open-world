// The city of AURELIA BAY. LAYOUT RULE (the V28 fix): the street network is
// ONE continuous asphalt plane. Sidewalks are raised islands ONLY along the
// building lines at the edges — nothing paved ever sits in the middle of a
// road. The boulevard's only center divider is a hedge of green bushes.
// Streets are the gaps between blocks, so asphalt is unbroken by construction.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;
  const T = AB.Textures;

  // Street center lines (x = east-west, z = north-south).
  const STREETS = {
    sunsetMile: { x: 0, half: 8, axis: 'z' },      // main boulevard N-S
    coralMarket: { z: 0, half: 6, axis: 'x' },     // market street E-W
    aureliaBlvd: { x: -71, half: 7, axis: 'z' },   // coastal road N-S
    crossNorth: { z: -80, half: 5, axis: 'x' },
    crossSouth: { z: 80, half: 5, axis: 'x' },
    eastAve: { x: 60, half: 5, axis: 'z' },
  };

  // City blocks: [x0, x1, z0, z1] — raised sidewalk islands with buildings.
  // West of the coastal road there are NO blocks: that strip is open beach
  // (promenade, sand, palms, umbrellas) all the way to the ocean.
  const BLOCKS = [
    [-64, -8, -170, -85], [8, 55, -170, -85], [65, 170, -170, -85],
    [-64, -8, -75, -6], [8, 55, -75, -6], [65, 170, -75, -6],
    [-64, -8, 6, 75], [8, 55, 6, 75], [65, 170, 6, 75],
    [-64, -8, 85, 170], [8, 55, 85, 170], [65, 170, 85, 170],
  ];

  const SHOPS = [
    ['PALMA DELI', '#c0392b', '#fff7e6'], ['TIDE POOL TACOS', '#e67e22', '#ffffff'],
    ['EMBER ROAST', '#6b3a2a', '#ffd98a'], ['CORAL CUPS', '#e75480', '#ffffff'],
    ['VIDRIO SURF', '#1f7a8c', '#eafffb'], ['DUNE RECORDS', '#2c3e50', '#f5d76e'],
    ['SOL MARKET', '#27ae60', '#ffffff'], ['MARINA BAIT', '#2e5f8a', '#dff0ff'],
    ['LANTERN NOODLES', '#b03a2e', '#ffe9a8'], ['GILDED QUAY', '#8e6b2f', '#fff3c4'],
    ['MANGO & RYE', '#d35400', '#fff7e6'], ['NEON BARBER', '#8e44ad', '#f5e6ff'],
    ['LUNA BAKERY', '#b5651d', '#fff0d6'], ['RIO GROCER', '#229954', '#ffffff'],
    ['PIER PIZZA', '#c0392b', '#ffe9a8'], ['COVE BOOKS', '#34495e', '#eaf2f8'],
    ['SAND DOLLAR', '#7d6608', '#fff8dc'], ['HARBOR GYM', '#1a5276', '#ffffff'],
    ['VELVET VINTAGE', '#6c3483', '#f9e8ff'], ['ORBIT ARCADE', '#1b4f72', '#aed6f1'],
    ['CORAL FLOWERS', '#c2185b', '#fff0f5'], ['TIDE LAUNDRY', '#117a65', '#e8f8f5'],
    ['SUNSET MOTEL', '#935116', '#fdebd0'], ['KAI JUICE', '#7d6608', '#fef9e7'],
    ['BRISA BOUTIQUE', '#7b2d8b', '#f4ecf7'], ['ANCHOR PUB', '#1e8449', '#fdebd0'],
    ['FIESTA MARKET', '#b9770e', '#fef9e7'], ['PALM CELLULAR', '#2e86c1', '#eaf2f8'],
    ['WAVE SKATE', '#148f77', '#e8f8f5'], ['CITRUS CAFE', '#ca6f1e', '#fef5e7'],
    ['DOCK DINER', '#922b21', '#fdedec'], ['SEA GLASS', '#0e6655', '#e8f8f5'],
    ['RUSTIC ROAST', '#5d4037', '#efebe9'], ['NEON NAILS', '#ad1457', '#fce4ec'],
    ['AZURE HOTEL', '#1565c0', '#e3f2fd'], ['BAY PHARMACY', '#2e7d32', '#e8f5e9'],
  ];

  const FACADE_COLORS = ['#e8dcc8', '#d9c2a3', '#c9b8a6', '#b8c4c9', '#d8b4a0', '#a8b8c8', '#e0cfae', '#c4a882', '#bfae9c', '#d6c7b4', '#cbb9a0', '#b0b8a0'];

  function box(w, h, d, mat, x, y, z, shadow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }

  function buildCity(scene) {
    const group = new THREE.Group();
    const asphaltTex = T.asphalt();
    const concreteTex = T.concrete();
    const sandTex = T.sand();
    const waterTex = T.water();
    const foliageTex = T.foliage();
    const brickTex = T.brick();
    const asphaltMat = new THREE.MeshLambertMaterial({ map: asphaltTex });
    const concreteMat = new THREE.MeshLambertMaterial({ map: concreteTex });
    const sandMat = new THREE.MeshLambertMaterial({ map: sandTex });
    const waterMat = new THREE.MeshLambertMaterial({ map: waterTex });

    // --- ONE continuous asphalt surface for the whole street network ---
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), asphaltMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    group.add(ground);

    // --- Coast: sand then ocean, west of the promenade ---
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(110, 800), sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(-141, 0.02, 0);
    sand.receiveShadow = true;
    group.add(sand);
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(240, 800), waterMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-316, 0.03, 0);
    group.add(ocean);

    // Promenade sidewalk along the beach (west curb of Aurelia Blvd).
    const prom = box(8, 0.18, 340, concreteMat, -82, 0.09, 0, true);
    group.add(prom);

    // --- Lane markings: thin planes just above the asphalt ---
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf2f2ea });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
    function stripe(w, l, x, z) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), whiteMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z);
      group.add(m);
    }
    function stripeY(w, l, x, z) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), yellowMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z);
      group.add(m);
    }
    // Sunset Mile: double yellow is REPLACED by the hedge median; white lane
    // dashes at x = +/-4 mark the two lanes on each side.
    for (let z = -166; z < 166; z += 8) {
      stripe(0.25, 3.4, -4, z); stripe(0.25, 3.4, 4, z);
    }
    // Coral Market St: double yellow center line (stops at the coast road).
    for (let x = -74; x < 166; x += 6) { stripeY(0.22, 3.4, x, -0.45); stripeY(0.22, 3.4, x, 0.45); }
    // Aurelia Blvd: double yellow center line.
    for (let z = -166; z < 166; z += 6) { stripeY(3.4, 0.22, -71.45, z); stripeY(3.4, 0.22, -70.55, z); }
    // Cross streets: dashed white centers.
    for (let x = -74; x < 166; x += 9) { stripe(3.2, 0.22, x, -80); stripe(3.2, 0.22, x, 80); }
    for (let z = -166; z < 166; z += 9) { stripe(0.22, 3.2, 60, z); }
    // Crosswalks at the main intersections (white zebra bars).
    function crosswalk(cx, cz, alongX) {
      for (let i = 0; i < 7; i++) {
        const off = (i - 3) * 1.6;
        if (alongX) stripe(0.7, 7, cx + off, cz);
        else stripe(7, 0.7, cx, cz + off);
      }
    }
    crosswalk(0, -10, true); crosswalk(0, 10, true);
    crosswalk(-10, 0, false); crosswalk(10, 0, false);
    crosswalk(-71, -10, true); crosswalk(-71, 10, true);
    crosswalk(0, -70, true); crosswalk(0, 70, true);

    // --- Hedge median on Sunset Mile (green bushes, gaps at intersections) ---
    [[-164, -91], [-69, -12], [12, 69], [91, 164]].forEach(function (seg) {
      const len = seg[1] - seg[0];
      const hedge = AB.Trees.makeHedge(len, foliageTex);
      hedge.rotation.y = Math.PI / 2;
      hedge.position.set(0, 0, (seg[0] + seg[1]) / 2);
      group.add(hedge);
    });

    // --- Blocks: raised sidewalk islands + buildings aligned to the grid ---
    const shopfronts = [];
    let shopIdx = 0;
    const facadeMats = FACADE_COLORS.map(function (c) {
      return new THREE.MeshLambertMaterial({ map: T.facade(c, 4 + Math.floor(U.rng() * 4), 0.28) });
    });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8a7f72 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });

    BLOCKS.forEach(function (b, bi) {
      const w = b[1] - b[0], d = b[3] - b[2];
      const cx = (b[0] + b[1]) / 2, cz = (b[2] + b[3]) / 2;
      // Raised sidewalk island (the block itself).
      const slab = box(w, 0.18, d, concreteMat, cx, 0.09, cz, true);
      slab.receiveShadow = true;
      group.add(slab);

      // Buildings: 1-3 per block, inset 2.5 from the block edge, aligned.
      const nB = w > 40 ? 3 : w > 24 ? 2 : 1;
      const bw = (w - 5 - (nB - 1) * 3) / nB;
      for (let i = 0; i < nB; i++) {
        const bx = b[0] + 2.5 + bw / 2 + i * (bw + 3);
        const bd = d - 5 - U.rand(0, 6);
        const bz = cz + U.rand(-2, 2);
        const bh = [9, 13, 18, 24, 30][Math.floor(U.rng() * 5)];
        // Facade texture repeated to the building's size, so windows stay
        // window-sized instead of stretching into stripes on big faces.
        const baseMat = facadeMats[(bi * 3 + i) % facadeMats.length];
        const faceTex = baseMat.map.clone();
        faceTex.repeat.set(Math.max(1, Math.round(bw / 7)), Math.max(1, Math.round(bh / 7)));
        faceTex.needsUpdate = true;
        const mat = new THREE.MeshLambertMaterial({ map: faceTex });
        const bld = box(bw, bh, bd, mat, bx, 0.18 + bh / 2, bz, true);
        group.add(bld);
        // Roof cap + props.
        group.add(box(bw + 0.4, 0.35, bd + 0.4, roofMat, bx, 0.18 + bh + 0.17, bz));
        if (U.rng() < 0.6) group.add(box(1.6, 1.1, 1.6, darkMat, bx + bw * 0.25, 0.18 + bh + 0.9, bz, true));
        if (U.rng() < 0.45) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 10), new THREE.MeshLambertMaterial({ color: 0x9a7a52 }));
          tank.position.set(bx - bw * 0.25, 0.18 + bh + 1.2, bz + bd * 0.2);
          tank.castShadow = true; group.add(tank);
          const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 10), tank.material);
          cone.position.set(tank.position.x, tank.position.y + 1.3, tank.position.z);
          group.add(cone);
        }
        if (U.rng() < 0.5) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 5), darkMat);
          ant.position.set(bx, 0.18 + bh + 2.2, bz - bd * 0.25);
          group.add(ant);
        }
        // Shopfront on the building's street-facing wall — only for the
        // building whose face sits nearest the street, so the sign and
        // awning sit ON the wall instead of floating over the sidewalk.
        let face = null; // sign anchor + outward direction (toward the street)
        if (b[1] === -8 && i === nB - 1) face = { x: b[1] - 2.4, z: bz, ry: Math.PI / 2, outX: 1, outZ: 0 };
        else if (b[0] === 8 && i === 0) face = { x: b[0] + 2.4, z: bz, ry: -Math.PI / 2, outX: -1, outZ: 0 };
        else if (b[0] === -64 && i === 0) face = { x: b[0] + 2.4, z: bz, ry: -Math.PI / 2, outX: -1, outZ: 0 };
        else if (b[3] === -6) face = { x: bx, z: bz + bd / 2 + 0.1, ry: 0, outX: 0, outZ: 1 };
        else if (b[2] === 6) face = { x: bx, z: bz - bd / 2 - 0.1, ry: Math.PI, outX: 0, outZ: -1 };
        if (face && shopIdx < SHOPS.length) {
          const s = SHOPS[shopIdx++];
          const signTex = T.shopSign(s[0], s[1], s[2]);
          const signMat = new THREE.MeshBasicMaterial({ map: signTex });
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(bw - 1, 9), 1.7), signMat);
          sign.position.set(face.x, 3.6, face.z);
          sign.rotation.y = face.ry;
          group.add(sign);
          // Striped awning: a group aimed at the street, plane tilted down.
          const awnGroup = new THREE.Group();
          awnGroup.position.set(face.x + face.outX * 0.4, 2.9, face.z + face.outZ * 0.4);
          awnGroup.rotation.y = face.ry;
          const awnMat = new THREE.MeshLambertMaterial({ map: T.awning('#e74c3c', '#fdf6e3'), side: THREE.DoubleSide });
          const awn = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(bw - 1, 9), 1.9), awnMat);
          awn.rotation.x = -Math.PI / 2 + 0.5;
          awn.position.set(0, -0.2, 0.85);
          awn.castShadow = true;
          awnGroup.add(awn);
          group.add(awnGroup);
          shopfronts.push({ name: s[0], x: face.x + face.outX * 1.5, z: face.z + face.outZ * 1.5 });
          // Crates + goods by the door, on the sidewalk.
          for (let k = 0; k < 3; k++) {
            group.add(box(0.7, 0.5, 0.7, new THREE.MeshLambertMaterial({ color: 0xa8794a }),
              face.x + face.outX * (1.6 + U.rand(0, 1.2)) + U.rand(-2, 2) * Math.abs(face.outZ),
              0.43,
              face.z + face.outZ * (1.6 + U.rand(0, 1.2)) + U.rand(-2, 2) * Math.abs(face.outX), true));
          }
        }
      }

      // Trees along the block edges (palms on main streets, leafy inside).
      const edge = (b[1] === -8 || b[0] === 8 || b[0] === -64 || b[3] === -6 || b[2] === 6);
      for (let t = 0; t < 4; t++) {
        const tx = U.rand(b[0] + 2, b[1] - 2), tz = U.rand(b[2] + 2, b[3] - 2);
        // Keep trees on the sidewalk ring, away from building footprints.
        const nearEdge = Math.min(tx - b[0], b[1] - tx, tz - b[2], b[3] - tz) < 3.2;
        if (!nearEdge) continue;
        const tree = edge ? AB.Trees.makePalm(U.rand(6.5, 9)) : AB.Trees.makeLeafyTree(U.rand(0.9, 1.25));
        tree.position.set(tx, 0.18, tz);
        group.add(tree);
      }
    });

    // --- Street lamps along the main streets ---
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x2e3438 });
    const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    function lamp(x, z, ry) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.4, 6), lampMat);
      pole.position.y = 3.2; pole.castShadow = true; g.add(pole);
      const arm = box(1.8, 0.12, 0.12, lampMat, 0.8, 6.3, 0, true);
      g.add(arm);
      const head = box(0.7, 0.18, 0.4, lampHeadMat, 1.6, 6.2, 0, false);
      g.add(head);
      g.position.set(x, 0.18, z);
      g.rotation.y = ry;
      group.add(g);
    }
    for (let z = -160; z <= 160; z += 26) { lamp(-10.5, z, Math.PI / 2); lamp(10.5, z, -Math.PI / 2); }
    for (let x = -70; x <= 160; x += 30) { lamp(x, -8.5, Math.PI); lamp(x, 8.5, 0); }
    for (let z = -160; z <= 160; z += 30) { lamp(-61.5, z, -Math.PI / 2); lamp(-85.5, z, Math.PI / 2); }

    // --- Traffic lights at the two main intersections ---
    function trafficLight(x, z, ry) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.4, 6), lampMat);
      pole.position.y = 2.7; pole.castShadow = true; g.add(pole);
      const arm = box(3.4, 0.14, 0.14, lampMat, 1.6, 5.3, 0, true);
      g.add(arm);
      const housing = box(0.5, 1.3, 0.35, new THREE.MeshLambertMaterial({ color: 0x1c1f22 }), 3.0, 4.6, 0, true);
      g.add(housing);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0x2ecc40 }));
      dot.position.set(3.0, 4.25, 0.19); g.add(dot);
      const dot2 = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0x332211 }));
      dot2.position.set(3.0, 4.95, 0.19); g.add(dot2);
      g.position.set(x, 0.18, z);
      g.rotation.y = ry;
      group.add(g);
    }
    trafficLight(-10.5, -9.5, Math.PI / 2);
    trafficLight(10.5, 9.5, -Math.PI / 2);
    trafficLight(-73.5, -9.5, Math.PI / 2);
    trafficLight(-68.5, 9.5, -Math.PI / 2);

    // --- Market stalls on Coral Market St (shot 2) ---
    const stallColors = [['#e74c3c', '#fdf6e3'], ['#2e86c1', '#fdf6e3'], ['#27ae60', '#fdf6e3'], ['#e67e22', '#fdf6e3']];
    const fruitColors = [0xe74c3c, 0xf39c12, 0x27ae60, 0x8e44ad, 0xf1c40f, 0xc0392b];
    function stall(x, z, ry) {
      const g = new THREE.Group();
      const cols = stallColors[Math.floor(U.rng() * stallColors.length)];
      for (let px = -1.4; px <= 1.4; px += 2.8) {
        for (let pz = -1.1; pz <= 1.1; pz += 2.2) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 5), lampMat);
          pole.position.set(px, 1.45, pz); g.add(pole);
        }
      }
      const canopy = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.8),
        new THREE.MeshLambertMaterial({ map: T.awning(cols[0], cols[1]), side: THREE.DoubleSide }));
      canopy.rotation.x = -Math.PI / 2 + 0.4;
      canopy.position.y = 2.95;
      canopy.castShadow = true;
      g.add(canopy);
      g.add(box(3.0, 0.9, 1.4, new THREE.MeshLambertMaterial({ color: 0x8a6a44 }), 0, 0.45, 0, true));
      // Produce piles: colored spheres in rows.
      for (let r = 0; r < 3; r++) {
        for (let c2 = 0; c2 < 6; c2++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6),
            new THREE.MeshLambertMaterial({ color: fruitColors[(r * 2 + c2) % fruitColors.length] }));
          f.position.set(-1.2 + c2 * 0.48, 0.98, -0.4 + r * 0.4);
          g.add(f);
        }
      }
      g.position.set(x, 0.18, z);
      g.rotation.y = ry;
      group.add(g);
    }
    for (let i = 0; i < 6; i++) stall(-28 + i * 11, 9.5, Math.PI);
    for (let i = 0; i < 4; i++) stall(-22 + i * 14, -9.5, 0);
    // String lights across the market street, hung on a sagging wire.
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    for (let x = -30; x <= 40; x += 12) {
      const pts = [];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        const p = new THREE.Vector3(x, 5.2 - Math.sin(t * Math.PI) * 0.9, -8 + t * 16);
        pts.push(p);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), bulbMat);
        bulb.position.copy(p);
        group.add(bulb);
      }
      const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
      group.add(wire);
    }

    // --- Beach props: umbrellas, towels, lifeguard tower, palms ---
    const umbColors = [0xe74c3c, 0x2e86c1, 0xf1c40f, 0x27ae60, 0xe67e22];
    for (let i = 0; i < 9; i++) {
      const ux = U.rand(-130, -95), uz = U.rand(-150, 150);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5), lampMat);
      pole.position.set(ux, 1.2, uz); group.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 10),
        new THREE.MeshLambertMaterial({ color: umbColors[i % umbColors.length] }));
      canopy.position.set(ux, 2.6, uz); canopy.castShadow = true; group.add(canopy);
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9),
        new THREE.MeshLambertMaterial({ color: umbColors[(i + 2) % umbColors.length] }));
      towel.rotation.x = -Math.PI / 2; towel.rotation.z = U.rand(0, 3);
      towel.position.set(ux + U.rand(-1.5, 1.5), 0.05, uz + U.rand(-1.5, 1.5));
      group.add(towel);
    }
    // Lifeguard tower.
    const tower = new THREE.Group();
    [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(function (p) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 5), lampMat);
      leg.position.set(p[0], 1.7, p[1]); tower.add(leg);
    });
    tower.add(box(3.6, 2.2, 3.0, new THREE.MeshLambertMaterial({ color: 0xf1c40f }), 0, 4.5, 0, true));
    tower.add(box(4.0, 0.2, 3.4, new THREE.MeshLambertMaterial({ color: 0xe74c3c }), 0, 5.7, 0, true));
    const towerWin = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x1d2a3a }));
    towerWin.position.set(0, 4.7, 1.52); tower.add(towerWin);
    tower.position.set(-100, 0.02, -30);
    tower.rotation.y = Math.PI / 2;
    group.add(tower);
    // Palm rows: promenade + beach.
    for (let z = -160; z <= 160; z += 14) {
      const p1 = AB.Trees.makePalm(U.rand(7, 10));
      p1.position.set(-84.5, 0.18, z + U.rand(-2, 2)); group.add(p1);
      if (U.rng() < 0.7) {
        const p2 = AB.Trees.makePalm(U.rand(6, 8.5));
        p2.position.set(U.rand(-140, -95), 0.02, z + U.rand(-4, 4)); group.add(p2);
      }
    }
    // Benches on the promenade.
    for (let z = -140; z <= 140; z += 28) {
      const bench = new THREE.Group();
      bench.add(box(2.0, 0.12, 0.5, new THREE.MeshLambertMaterial({ color: 0x8a6a44 }), 0, 0.5, 0, true));
      bench.add(box(2.0, 0.5, 0.1, new THREE.MeshLambertMaterial({ color: 0x8a6a44 }), 0, 0.85, -0.22, true));
      bench.add(box(0.12, 0.5, 0.5, lampMat, -0.85, 0.25, 0, true));
      bench.add(box(0.12, 0.5, 0.5, lampMat, 0.85, 0.25, 0, true));
      bench.position.set(-80.5, 0.18, z);
      bench.rotation.y = -Math.PI / 2;
      group.add(bench);
    }

    scene.add(group);
    return { group, streets: STREETS, blocks: BLOCKS, shopfronts: shopfronts };
  }

  AB.City = { buildCity, STREETS: STREETS, BLOCKS: BLOCKS };
})();
