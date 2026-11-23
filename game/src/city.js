// Aurelia Bay — the city. A tidy 5x5 street grid (consistent setbacks, clean
// street walls, planned heights), a palm-lined main boulevard, a beach and
// pier on the west edge, and named districts. Buildings get varied canvas
// facades (brick / panel / stucco), shop signs, awnings and rooftop props so
// no two blocks read the same. Every building also registers a collision box.
(function () {
  'use strict';
  var U = window.AB.util;
  var T = window.AB.textures;

  var ROAD_X = [-120, -60, 0, 60, 120];   // north-south roads
  var ROAD_Z = [-120, -60, 0, 60, 120];   // east-west roads
  var ROAD_W = 14;
  var BOULEVARD_W = 18;                    // Sunset Mile is wider
  var BLOCK = 46;                          // block size between road edges
  var CITY_MIN = -150, CITY_MAX = 150;

  var NS_NAMES = ['Ember Strand Ave', 'Coral Market St', 'Sunset Mile', 'Palma Row', 'Vidrio Blvd'];
  var EW_NAMES = ['Lantern Way', 'Gilded Quay Rd', 'Marina Row', 'Coral Shore Dr', 'Airfield Rd'];

  var DISTRICTS = [
    { name: 'CORAL MARKET', x0: -150, x1: -30, z0: -150, z1: -30, color: 0x7fb069 },
    { name: 'PALMA ROW', x0: 30, x1: 150, z0: -150, z1: -30, color: 0xc98a4b },
    { name: 'SUNSET MILE', x0: -30, x1: 30, z0: -90, z1: 90, color: 0xe0a458 },
    { name: 'GILDED QUAY', x0: -210, x1: -150, z0: -60, z1: 60, color: 0x5fa8a0 },
    { name: 'VIDRIO DUNES', x0: -210, x1: -150, z0: -210, z1: -60, color: 0xd9c58a },
    { name: 'MARINA ROW', x0: -150, x1: -30, z0: 30, z1: 150, color: 0x4b8fc9 },
    { name: 'EMBER HEIGHTS', x0: 30, x1: 150, z0: 30, z1: 150, color: 0xb05a7f },
    { name: 'EMBER STRAND', x0: -210, x1: -30, z0: 90, z1: 210, color: 0xd98a63 },
    { name: 'ABX AIRFIELD', x0: 90, x1: 150, z0: 90, z1: 150, color: 0x8a8fa3 }
  ];

  var FACADES = [
    { base: '#f2e3c6', style: 'stucco' }, { base: '#e8d5b0', style: 'stucco' },
    { base: '#d98a63', style: 'brick' }, { base: '#c96f4a', style: 'brick' },
    { base: '#5fa8a0', style: 'panel' }, { base: '#7fb069', style: 'stucco' },
    { base: '#f5f2ea', style: 'panel' }, { base: '#f0d98c', style: 'stucco' },
    { base: '#d98a8a', style: 'brick' }, { base: '#8fa3b8', style: 'panel' },
    { base: '#e07856', style: 'stucco' }, { base: '#c9b896', style: 'brick' }
  ];

  var SHOPS = [
    { name: 'CORAL MARKET', sub: 'FRESH · DAILY', bg: '#a63a2e', fg: '#ffffff' },
    { name: 'EMBERS DINER', sub: 'EAT · 24 HOURS', bg: '#1f3a5f', fg: '#ffd98a' },
    { name: 'PALM CAFE', sub: 'COFFEE · JUICE', bg: '#2e6b4f', fg: '#ffffff' },
    { name: 'VICE TUNING', sub: 'CARS · PARTS', bg: '#22222a', fg: '#ffe14d' },
    { name: 'AZUL CASINO', sub: 'SLOTS · BAR', bg: '#274b9f', fg: '#ffffff' },
    { name: 'MANGO & RYE', sub: 'BAKERY', bg: '#c97b2d', fg: '#ffffff' },
    { name: 'BOLT BURGER', sub: 'FAST · HOT', bg: '#c22e2e', fg: '#ffe14d' },
    { name: 'SOL SURF SHOP', sub: 'BOARDS · GEAR', bg: '#2f8fa8', fg: '#ffffff' },
    { name: 'MARINA MOTORS', sub: 'BOATS · REPAIR', bg: '#37505e', fg: '#cfe8ff' },
    { name: 'GILDED PAWN', sub: 'BUY · SELL · TRADE', bg: '#6b4f9e', fg: '#ffd98a' }
  ];

  function districtAt(x, z) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
    }
    return DISTRICTS[2];
  }

  function nearestStreet(x, z) {
    var best = null, bd = 1e9;
    for (var i = 0; i < ROAD_X.length; i++) {
      var d = Math.abs(x - ROAD_X[i]);
      if (d < bd) { bd = d; best = NS_NAMES[i]; }
    }
    for (var j = 0; j < ROAD_Z.length; j++) {
      var d2 = Math.abs(z - ROAD_Z[j]);
      if (d2 < bd) { bd = d2; best = EW_NAMES[j]; }
    }
    return best;
  }

  function buildCity(scene, rng) {
    var group = new THREE.Group();
    group.name = 'city';
    var colliders = [];
    var roads = []; // {axis:'x'|'z', at:number, name:string}

    var asphaltTex = T.asphalt(U.CITY_SEED + 11);
    var sidewalkTex = T.sidewalk(U.CITY_SEED + 12);
    var sandTex = T.sand(U.CITY_SEED + 13);
    var waterTex = T.water(U.CITY_SEED + 14);
    var woodTex = T.wood(U.CITY_SEED + 15);
    var crossTex = T.crosswalk();

    // Facade variants, generated once and reused across buildings.
    var facadeMats = [];
    for (var f = 0; f < FACADES.length; f++) {
      var fd = FACADES[f];
      var tex = T.facade(U.CITY_SEED + 100 + f, fd.base, fd.style, 4 + (f % 3), 4 + (f % 2));
      facadeMats.push(new THREE.MeshLambertMaterial({ map: tex }));
    }
    var roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });
    var roofEdgeMat = new THREE.MeshLambertMaterial({ color: 0x6b6b74 });
    var curbMat = new THREE.MeshLambertMaterial({ color: 0x9a9384 });

    // ---- ground: one big sidewalk-coloured base, then road strips ----
    var base = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 560),
      new THREE.MeshLambertMaterial({ map: sidewalkTex })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(-20, 0, 0);
    base.receiveShadow = true;
    group.add(base);

    var roadMat = new THREE.MeshLambertMaterial({ map: asphaltTex });
    function roadStrip(x, z, w, len, horizontal) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(horizontal ? len : w, horizontal ? w : len), roadMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      group.add(m);
    }
    for (var i = 0; i < ROAD_X.length; i++) {
      var w = ROAD_X[i] === 0 ? BOULEVARD_W : ROAD_W;
      roadStrip(ROAD_X[i], 0, w, 320, false);
      roads.push({ axis: 'x', at: ROAD_X[i], name: NS_NAMES[i], width: w });
    }
    for (var j = 0; j < ROAD_Z.length; j++) {
      roadStrip(0, ROAD_Z[j], ROAD_W, 320, true);
      roads.push({ axis: 'z', at: ROAD_Z[j], name: EW_NAMES[j], width: ROAD_W });
    }

    // ---- lane dashes: crisp yellow centre lines, white edge dashes ----
    var dashMatY = new THREE.MeshBasicMaterial({ color: 0xf5c542 });
    var dashGeo = new THREE.PlaneGeometry(0.5, 4);
    var edgeMat = new THREE.MeshBasicMaterial({ color: 0xe8e6df });
    var edgeGeo = new THREE.PlaneGeometry(0.35, 3);
    function dashes(at, horizontal, len) {
      for (var d = -len / 2 + 8; d < len / 2 - 4; d += 9) {
        var m = new THREE.Mesh(dashGeo, dashMatY);
        m.rotation.x = -Math.PI / 2;
        if (!horizontal) m.rotation.z = Math.PI / 2;
        m.position.set(horizontal ? d : at, 0.04, horizontal ? at : d);
        group.add(m);
      }
    }
    for (var k = 0; k < ROAD_X.length; k++) dashes(ROAD_X[k], false, 300);
    for (var l = 0; l < ROAD_Z.length; l++) dashes(ROAD_Z[l], true, 300);

    // ---- crosswalks at the main intersections ----
    var crossGeo = new THREE.PlaneGeometry(12, 5);
    var crossMat = new THREE.MeshLambertMaterial({ map: crossTex, transparent: true });
    for (var ci = 0; ci < ROAD_X.length; ci++) {
      for (var cj = 0; cj < ROAD_Z.length; cj++) {
        if ((ci + cj) % 2 === 1) continue;
        var cx = ROAD_X[ci], cz = ROAD_Z[cj];
        var c1 = new THREE.Mesh(crossGeo, crossMat);
        c1.rotation.x = -Math.PI / 2;
        c1.position.set(cx, 0.05, cz - 9);
        group.add(c1);
        var c2 = new THREE.Mesh(crossGeo, crossMat);
        c2.rotation.x = -Math.PI / 2; c2.rotation.z = Math.PI / 2;
        c2.position.set(cx - 9, 0.05, cz);
        group.add(c2);
      }
    }

    // ---- buildings: tidy grid, aligned setbacks, planned heights ----
    var acGeo = new THREE.BoxGeometry(1.6, 0.9, 1.2);
    var acMat = new THREE.MeshLambertMaterial({ color: 0xb8bcc2 });
    var tankGeo = new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10);
    var tankMat = new THREE.MeshLambertMaterial({ color: 0x8a6b45 });
    var antMat = new THREE.MeshBasicMaterial({ color: 0x3a3a40 });

    function addBuilding(bx, bz, w, d, floors, matIdx, shop) {
      var h = floors * 4;
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMats[matIdx]);
      b.position.set(bx, h / 2, bz);
      b.castShadow = true; b.receiveShadow = true;
      group.add(b);
      var roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), roofEdgeMat);
      roof.position.set(bx, h + 0.25, bz);
      roof.castShadow = true;
      group.add(roof);
      // rooftop props
      var nAc = 1 + Math.floor(rng.next() * 3);
      for (var a = 0; a < nAc; a++) {
        var ac = new THREE.Mesh(acGeo, acMat);
        ac.position.set(bx + rng.range(-w / 2 + 2, w / 2 - 2), h + 0.9, bz + rng.range(-d / 2 + 2, d / 2 - 2));
        ac.castShadow = true;
        group.add(ac);
      }
      if (rng.chance(0.3)) {
        var tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(bx + rng.range(-w / 4, w / 4), h + 1.6, bz + rng.range(-d / 4, d / 4));
        tank.castShadow = true;
        group.add(tank);
      }
      if (rng.chance(0.5)) {
        var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 4 + rng.next() * 4, 5), antMat);
        ant.position.set(bx + rng.range(-w / 3, w / 3), h + 2.5, bz + rng.range(-d / 3, d / 3));
        group.add(ant);
      }
      // shopfront: sign + striped awning on the street-facing side
      if (shop) {
        var signTex = T.sign(shop.name, shop.sub, shop.bg, shop.fg);
        var sign = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.min(w * 0.8, 12), 3),
          new THREE.MeshLambertMaterial({ map: signTex })
        );
        sign.position.set(bx, 4.6, bz + d / 2 + 0.15);
        group.add(sign);
        var awnTex = T.awning(rng.pick(['#c22e2e', '#2e6b4f', '#274b9f', '#c97b2d']), '#f5f2ea');
        var awn = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.min(w * 0.8, 12), 2.2),
          new THREE.MeshLambertMaterial({ map: awnTex, side: THREE.DoubleSide })
        );
        awn.rotation.x = -Math.PI / 2 + 0.5;
        awn.position.set(bx, 3.4, bz + d / 2 + 1.1);
        awn.castShadow = true;
        group.add(awn);
      }
      colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
    }

    // Blocks: between roads. Each block holds 1-2 buildings with a 3-unit
    // setback from the road edge, so the street wall stays clean.
    var blockCentersX = [-90, -30, 30, 90];
    var blockCentersZ = [-90, -30, 30, 90];
    var shopIdx = 0;
    for (var bx = 0; bx < blockCentersX.length; bx++) {
      for (var bz = 0; bz < blockCentersZ.length; bz++) {
        var cx = blockCentersX[bx], cz = blockCentersZ[bz];
        var isHeights = cx > 0 && cz > 0;      // Ember Heights: towers
        var isMarket = cx < 0 && cz < 0;       // Coral Market: low + shops
        if (rng.chance(0.72)) {
          // one big building
          var floors = isHeights ? rng.int(7, 10) : (isMarket ? rng.int(2, 3) : rng.int(3, 6));
          var shop = (cz === -30 || cx === -30) && shopIdx < SHOPS.length ? SHOPS[shopIdx++] : null;
          addBuilding(cx, cz, BLOCK - 6, BLOCK - 6, floors, Math.floor(rng.next() * FACADES.length), shop);
        } else {
          // two buildings split along x
          var w2 = (BLOCK - 10) / 2;
          addBuilding(cx - w2 / 2 - 2, cz, w2, BLOCK - 6, rng.int(2, 5), Math.floor(rng.next() * FACADES.length), null);
          var shop2 = (cz === -30 || cx === -30) && shopIdx < SHOPS.length ? SHOPS[shopIdx++] : null;
          addBuilding(cx + w2 / 2 + 2, cz, w2, BLOCK - 6, rng.int(2, 5), Math.floor(rng.next() * FACADES.length), shop2);
        }
      }
    }

    // ---- street lamps, traffic lights, benches, hydrants ----
    var poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
    var lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0x554411 });
    var poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 7, 6);
    var armGeo = new THREE.BoxGeometry(2.2, 0.18, 0.18);
    var headGeo = new THREE.BoxGeometry(1.1, 0.3, 0.5);
    function lamp(x, z, faceEast) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 3.5; pole.castShadow = true;
      g.add(pole);
      var arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(faceEast ? 1 : -1, 6.9, 0);
      g.add(arm);
      var head = new THREE.Mesh(headGeo, lampHeadMat);
      head.position.set(faceEast ? 2 : -2, 6.8, 0);
      g.add(head);
      g.position.set(x, 0, z);
      group.add(g);
    }
    for (var li = 0; li < ROAD_X.length; li++) {
      for (var lz = -135; lz <= 135; lz += 30) {
        lamp(ROAD_X[li] + (ROAD_X[li] === 0 ? 10 : 8), lz, false);
      }
    }
    // traffic lights at the four central intersections
    var tlBoxGeo = new THREE.BoxGeometry(0.7, 2.1, 0.5);
    var tlMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    function trafficLight(x, z) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.4, 6), poleMat);
      pole.position.y = 2.7; pole.castShadow = true;
      g.add(pole);
      var box = new THREE.Mesh(tlBoxGeo, tlMat);
      box.position.y = 5.4;
      g.add(box);
      var lampCols = [0xff3b30, 0xffcc00, 0x34c759];
      for (var q = 0; q < 3; q++) {
        var dot = new THREE.Mesh(
          new THREE.CircleGeometry(0.22, 10),
          new THREE.MeshBasicMaterial({ color: lampCols[q] })
        );
        dot.position.set(0, 6.05 - q * 0.65, 0.26);
        g.add(dot);
      }
      g.position.set(x, 0, z);
      group.add(g);
    }
    trafficLight(-8, -68); trafficLight(8, -52); trafficLight(-8, 52); trafficLight(8, 68);
    trafficLight(-68, -8); trafficLight(68, 8);

    // benches + hydrants on sidewalks
    var benchMat = new THREE.MeshLambertMaterial({ color: 0x7a5a34 });
    var benchGeo = new THREE.BoxGeometry(2.2, 0.18, 0.6);
    var hydMat = new THREE.MeshLambertMaterial({ color: 0xd23b2e });
    for (var bn = 0; bn < 14; bn++) {
      var bx2 = rng.pick(ROAD_X) + rng.pick([-9, 9]);
      var bz2 = rng.range(-130, 130);
      var bench = new THREE.Group();
      var seat = new THREE.Mesh(benchGeo, benchMat);
      seat.position.y = 0.55; seat.castShadow = true;
      bench.add(seat);
      var back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.12), benchMat);
      back.position.set(0, 0.95, -0.28);
      bench.add(back);
      bench.position.set(bx2, 0, bz2);
      bench.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
      group.add(bench);
    }
    for (var hn = 0; hn < 10; hn++) {
      var hyd = new THREE.Group();
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 8), hydMat);
      body.position.y = 0.35; body.castShadow = true;
      hyd.add(body);
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), hydMat);
      cap.position.y = 0.75;
      hyd.add(cap);
      hyd.position.set(rng.pick(ROAD_X) + rng.pick([-8.5, 8.5]), 0, rng.range(-130, 130));
      group.add(hyd);
    }

    // ---- palm trees: boulevard rows + beach line ----
    var trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 7, 7);
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a34 });
    var frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e, side: THREE.DoubleSide });
    var frondGeo = new THREE.PlaneGeometry(1.1, 4.4);
    frondGeo.translate(0, 2.2, 0);
    function palm(x, z, lean) {
      var g = new THREE.Group();
      var trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3.5;
      trunk.rotation.z = lean || 0;
      trunk.castShadow = true;
      g.add(trunk);
      for (var f = 0; f < 7; f++) {
        var fr = new THREE.Mesh(frondGeo, frondMat);
        fr.position.y = 7;
        fr.rotation.y = (f / 7) * Math.PI * 2;
        fr.rotation.x = -0.9 - rng.next() * 0.35;
        fr.castShadow = true;
        g.add(fr);
      }
      // coconuts
      var nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshLambertMaterial({ color: 0x6b4a26 }));
      nut.position.set(0.4, 6.7, 0.2);
      g.add(nut);
      g.position.set(x, 0, z);
      g.rotation.y = rng.next() * Math.PI * 2;
      group.add(g);
    }
    for (var pz = -140; pz <= 140; pz += 14) {
      palm(-10.5, pz, rng.range(-0.06, 0.06));
      palm(10.5, pz + 7, rng.range(-0.06, 0.06));
    }
    for (var pb = -140; pb <= 140; pb += 18) {
      palm(-156 + rng.range(-2, 2), pb, rng.range(-0.12, 0.12));
    }

    // ---- beach, ocean, pier, boats ----
    var sand = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 460),
      new THREE.MeshLambertMaterial({ map: sandTex })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(-185, 0.01, 0);
    sand.receiveShadow = true;
    group.add(sand);

    var ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 900),
      new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, opacity: 0.96 })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-380, 0.03, 0);
    group.add(ocean);

    // foam line where waves meet sand
    var foam = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 460),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(-219, 0.06, 0);
    group.add(foam);

    // pier: planks + posts + a small hut at the end
    var pier = new THREE.Group();
    var deck = new THREE.Mesh(new THREE.BoxGeometry(60, 0.5, 8), new THREE.MeshLambertMaterial({ map: woodTex }));
    deck.position.y = 1.2; deck.castShadow = true; deck.receiveShadow = true;
    pier.add(deck);
    for (var pp = -28; pp <= 28; pp += 8) {
      for (var ps = -3.4; ps <= 3.4; ps += 6.8) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 6), trunkMat);
        post.position.set(pp, 0, ps);
        pier.add(post);
      }
    }
    var hut = new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 5), new THREE.MeshLambertMaterial({ color: 0xe8dcc0 }));
    hut.position.set(26, 3.1, 0); hut.castShadow = true;
    pier.add(hut);
    var hutRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2, 4), new THREE.MeshLambertMaterial({ color: 0xc22e2e }));
    hutRoof.position.set(26, 5.7, 0); hutRoof.rotation.y = Math.PI / 4;
    pier.add(hutRoof);
    pier.position.set(-248, 0, 0);
    group.add(pier);

    // sailboats anchored off the pier
    function sailboat(x, z, rot) {
      var g = new THREE.Group();
      var hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 6), new THREE.MeshLambertMaterial({ color: 0xf5f2ea }));
      hull.position.y = 0.5;
      g.add(hull);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7, 5), poleMat);
      mast.position.y = 4;
      g.add(mast);
      var sailShape = new THREE.Shape();
      sailShape.moveTo(0, 0); sailShape.lineTo(0, 5.4); sailShape.lineTo(2.6, 0); sailShape.lineTo(0, 0);
      var sail = new THREE.Mesh(
        new THREE.ShapeGeometry(sailShape),
        new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      sail.position.set(0.1, 1.2, 0);
      g.add(sail);
      g.position.set(x, 0.1, z);
      g.rotation.y = rot;
      group.add(g);
    }
    sailboat(-245, -28, 0.5); sailboat(-258, 18, -0.4); sailboat(-268, -52, 0.9); sailboat(-240, 44, 0.2);

    // beach umbrellas + towels: the beach is alive, not empty sand
    var umbCols = [0xe84a5f, 0x2f8fa8, 0xf5c542, 0x7fb069];
    for (var ub = 0; ub < 8; ub++) {
      var ux = rng.range(-205, -165), uz = rng.range(-120, 120);
      var upole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), poleMat);
      upole.position.set(ux, 1.3, uz);
      group.add(upole);
      var canopy = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 1, 8),
        new THREE.MeshLambertMaterial({ color: umbCols[ub % umbCols.length] })
      );
      canopy.position.set(ux, 2.9, uz);
      canopy.castShadow = true;
      group.add(canopy);
      var towel = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 2.2),
        new THREE.MeshLambertMaterial({ color: umbCols[(ub + 2) % umbCols.length] })
      );
      towel.rotation.x = -Math.PI / 2;
      towel.position.set(ux + 1.6, 0.08, uz + 0.6);
      group.add(towel);
    }

    scene.add(group);
    return {
      group: group,
      colliders: colliders,
      roads: roads,
      districts: DISTRICTS,
      districtAt: districtAt,
      nearestStreet: nearestStreet,
      ROAD_X: ROAD_X,
      ROAD_Z: ROAD_Z
    };
  }

  window.AB.city = { buildCity: buildCity, districtAt: districtAt, nearestStreet: nearestStreet };
})();
