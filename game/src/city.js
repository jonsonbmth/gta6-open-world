// city.js — the city of EMBER STRAND for AURELIA BAY. Sunset Mile runs
// along Z: a 14 m road with textured asphalt, crosswalks, sidewalks with
// pavers, and flush rows of textured buildings (tidy street walls, planned
// heights) with shopfronts, signs and striped awnings. West is the marina:
// beach, water, a plank pier and boats. Street life comes from palms,
// power lines, billboards, lamps, parked cars and 36 pedestrians.
//
// Layout (meters): road x in [-7, 7]; sidewalks x in [7, 10] and
// [-10, -7]; building facades at x = +-10; the marina beach from x=-70
// to x=-22; water beyond x=-70. The hero sits at the crosswalk, z=0.

(function () {
  'use strict';

  var util = window.AB.util;
  var textures = window.AB.textures;

  var SHOPS = [
    { name: 'ABX AIR', bg: '#274a6a', fg: '#ffffff', awning: ['#c0392b', '#f5f0e6'] },
    { name: 'VICE TUNING', bg: '#1f3a52', fg: '#ffd94a', awning: ['#1f6a8a', '#f5f0e6'] },
    { name: 'GILDED PAWN', bg: '#4a3a1a', fg: '#ffe9a8', awning: ['#8a6a2a', '#f5f0e6'] },
    { name: 'CORAL MARKET', bg: '#7a2a3a', fg: '#ffffff', awning: ['#c0392b', '#f5f0e6'] },
    { name: 'EMBER DINER', bg: '#3a2a4a', fg: '#ffd94a', awning: ['#e07a3a', '#f5f0e6'] },
    { name: 'PALMA CAFE', bg: '#2a5a3a', fg: '#ffffff', awning: ['#2a8a5a', '#f5f0e6'] },
    { name: 'VIDRIO HOTEL', bg: '#5a2a5a', fg: '#ffffff', awning: ['#7a4a8a', '#f5f0e6'] },
    { name: 'SUNSET MOTORS', bg: '#8a4a1a', fg: '#ffffff', awning: ['#c05a1a', '#f5f0e6'] },
  ];

  var FACADE_COLORS = [
    { base: '#7fa8a0', trim: '#5d7f78' }, // teal
    { base: '#c9b18c', trim: '#a68d68' }, // sand brick
    { base: '#9aa5ad', trim: '#767f87' }, // grey blue
    { base: '#b08a7a', trim: '#8d6a5c' }, // dusty rose brick
    { base: '#8fa3b8', trim: '#6d7f92' }, // steel blue
    { base: '#c2a878', trim: '#9c854e' }, // ochre
  ];

  function buildCity(scene) {
    var rng = util.mulberry32(20261122);
    var group = new THREE.Group();
    group.name = 'city';
    scene.add(group);

    var pedestrians = [];
    var parkedCars = [];

    // ---- Base ground: a big muted plane under everything. ----
    var base = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 1 }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, -0.05, -40);
    base.receiveShadow = true;
    group.add(base);

    // ---- Road: asphalt tile (14 m wide) repeated along the street. ----
    var asphaltTex = textures.asphalt(11);
    asphaltTex.repeat.set(1, 17);
    var road = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 238),
      new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -50);
    road.receiveShadow = true;
    group.add(road);

    // ---- Crosswalk at z=0: white stripes across the road. ----
    var stripeMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.9 });
    for (var s = -6; s <= 6; s += 2) {
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 3.4), stripeMat);
      stripe.position.set(s, 0.02, 0);
      stripe.receiveShadow = true;
      group.add(stripe);
    }
    // A second crossing further down the street.
    for (var s2 = -6; s2 <= 6; s2 += 2) {
      var stripe2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 3.4), stripeMat);
      stripe2.position.set(s2, 0.02, -48);
      group.add(stripe2);
    }

    // ---- Sidewalks: paver texture, both sides. ----
    var walkTex = textures.sidewalk(23);
    walkTex.repeat.set(1, 40);
    [-8.5, 8.5].forEach(function (x) {
      var walk = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 238),
        new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1 }),
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.02, -50);
      walk.receiveShadow = true;
      group.add(walk);
    });

    // ---- Buildings: flush street walls, planned heights (taller toward
    // the center of the strip), UV-scaled facades, shopfronts + signs +
    // striped awnings at street level. ----
    var facadeTexs = FACADE_COLORS.map(function (fc, i) {
      return textures.facade(100 + i, fc.base, fc.trim);
    });
    var shopIndex = 0;
    [-1, 1].forEach(function (side) {
      var z = 58;
      var block = 0;
      while (z > -168) {
        var depth = 13 + rng() * 6;
        var width = 11 + rng() * 3;
        // Planned heights: taller near the middle of the strip.
        var centerDist = Math.abs(z + 55) / 115;
        var height = 12 + (1 - centerDist) * 16 + rng() * 5;
        var cx = side * (10 + width / 2);
        var cz = z - depth / 2;
        var tex = facadeTexs[Math.floor(rng() * facadeTexs.length)].clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, Math.round(width / 6)), Math.max(1, Math.round(height / 6)));
        var bMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
        var b = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bMat);
        b.position.set(cx, height / 2, cz);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        // Roof cap: a thin darker slab so the top reads as a roof.
        var roof = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.3, 0.3, depth + 0.3),
          new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 }),
        );
        roof.position.set(cx, height + 0.15, cz);
        group.add(roof);

        // Shopfront on the street face (ground floor).
        var shop = SHOPS[shopIndex % SHOPS.length];
        shopIndex++;
        var faceX = side * 10;
        var glass = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 3.2, Math.min(depth - 2, 12)),
          new THREE.MeshPhysicalMaterial({
            color: 0x2a3a44, roughness: 0.15, metalness: 0.7,
            clearcoat: 0.6, emissive: 0x1a2410, emissiveIntensity: 0.35,
          }),
        );
        glass.position.set(faceX - side * 0.1, 1.7, cz);
        group.add(glass);
        // Sign board above the shopfront.
        var signTex = textures.sign(shop.name, shop.bg, shop.fg);
        var sign = new THREE.Mesh(
          new THREE.PlaneGeometry(7.5, 1.9),
          new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }),
        );
        sign.position.set(faceX - side * 0.25, 4.6, cz);
        sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(sign);
        // Striped awning over the shopfront: a thin box sloping down
        // toward the street, stripes running along the storefront.
        var awnTex = textures.awning(shop.awning[0], shop.awning[1]);
        awnTex.repeat.set(3, 1);
        awnTex.center.set(0.5, 0.5);
        awnTex.rotation = Math.PI / 2;
        var awning = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.06, Math.min(depth - 2, 12)),
          new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.85 }),
        );
        awning.position.set(faceX - side * 0.75, 3.75, cz);
        awning.rotation.z = side * 0.35; // slope down toward the street
        awning.castShadow = true;
        group.add(awning);

        z -= depth + 1.2;
        block++;
      }
    });

    // ---- Distant skyline: tall muted blocks on the horizon so the
    // street never ends in empty sky. ----
    var skylineMat = new THREE.MeshStandardMaterial({ color: 0x8a9aa8, roughness: 1 });
    for (var k = 0; k < 14; k++) {
      var h = 25 + rng() * 45;
      var w = 12 + rng() * 14;
      var tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 12), skylineMat);
      var tx = (rng() - 0.5) * 260;
      tower.position.set(tx, h / 2, -195 - rng() * 40);
      group.add(tower);
    }

    // ---- Street lamps: pole + arm + head, alternating sides. ----
    var lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.6, metalness: 0.6 });
    var lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 0.7 });
    for (var lz = 30; lz >= -140; lz -= 24) {
      var lside = ((lz / 24) % 2 === 0) ? 1 : -1;
      var lx = lside * 9.4;
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 8), lampPoleMat);
      pole.position.set(lx, 3.5, lz);
      pole.castShadow = true;
      group.add(pole);
      var arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.09), lampPoleMat);
      arm.position.set(lx - lside * 0.8, 6.9, lz);
      group.add(arm);
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.3), lampHeadMat);
      head.position.set(lx - lside * 1.5, 6.85, lz);
      group.add(head);
    }

    // ---- Traffic lights at the crosswalk. ----
    [1, -1].forEach(function (side) {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 6.5, 8), lampPoleMat);
      pole.position.set(side * 7.6, 3.25, 2.6);
      pole.castShadow = true;
      group.add(pole);
      var arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.1), lampPoleMat);
      arm.position.set(side * 5.9, 6.4, 2.6);
      group.add(arm);
      var housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 1.0, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }),
      );
      housing.position.set(side * 4.4, 5.9, 2.6);
      group.add(housing);
      var lampColors = [0xff2a2a, 0xffc82a, 0x2aff5a];
      lampColors.forEach(function (lc, i) {
        var lamp = new THREE.Mesh(
          new THREE.CircleGeometry(0.11, 12),
          new THREE.MeshStandardMaterial({
            color: lc, emissive: lc, emissiveIntensity: i === 0 ? 1.6 : 0.15,
          }),
        );
        lamp.position.set(side * 4.4, 6.22 - i * 0.3, 2.74);
        group.add(lamp);
      });
    });

    // ---- Palm trees along the sidewalks. ----
    function makePalm(x, z, s) {
      var palm = new THREE.Group();
      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 5.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }),
      );
      trunk.position.y = 2.75;
      trunk.rotation.z = (rng() - 0.5) * 0.14;
      trunk.castShadow = true;
      palm.add(trunk);
      var frondMat = new THREE.MeshStandardMaterial({ color: 0x2a7a34, roughness: 0.9, side: THREE.DoubleSide });
      for (var f = 0; f < 7; f++) {
        var frond = new THREE.Mesh(new THREE.ConeGeometry(0.28, 3.4, 4), frondMat);
        var a = (f / 7) * Math.PI * 2;
        frond.position.set(Math.cos(a) * 1.1, 5.6, Math.sin(a) * 1.1);
        frond.rotation.z = Math.cos(a) * 1.15;
        frond.rotation.x = -Math.sin(a) * 1.15;
        frond.scale.set(1, 1, 0.18);
        frond.castShadow = true;
        palm.add(frond);
      }
      palm.position.set(x, 0, z);
      palm.scale.setScalar(s);
      return palm;
    }
    var palmSpots = [
      [-9.2, 14, 1.1], [9.2, -10, 1.0], [-9.2, -26, 1.2], [9.2, -38, 0.95],
      [-9.2, -58, 1.05], [9.2, -70, 1.15], [-9.2, -86, 1.0], [9.2, -102, 1.1],
      [-9.2, -118, 0.9], [9.2, 26, 1.0],
    ];
    palmSpots.forEach(function (p) {
      group.add(makePalm(p[0], p[1], p[2]));
    });

    // ---- Power lines: poles with sagging wires down the east side. ----
    var wireMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    var poleTops = [];
    for (var pz = 40; pz >= -140; pz -= 36) {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8.5, 8), lampPoleMat);
      pole.position.set(9.6, 4.25, pz);
      pole.castShadow = true;
      group.add(pole);
      var cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.8), lampPoleMat);
      cross.position.set(9.6, 8.2, pz);
      group.add(cross);
      poleTops.push(new THREE.Vector3(9.6, 8.2, pz));
    }
    for (var wi = 0; wi < poleTops.length - 1; wi++) {
      var a = poleTops[wi];
      var b = poleTops[wi + 1];
      var mid = a.clone().lerp(b, 0.5);
      mid.y -= 1.1; // sag
      var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      var wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.03, 5), wireMat);
      group.add(wire);
    }

    // ---- Billboards on rooftops. ----
    var bb1 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      new THREE.MeshStandardMaterial({ map: textures.billboard(7, 'EMBER STRAND', 'Live where the sun stays up'), roughness: 0.7 }),
    );
    bb1.position.set(16, 26, -60);
    bb1.rotation.y = -Math.PI / 2 - 0.3;
    group.add(bb1);
    var bb2 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      new THREE.MeshStandardMaterial({ map: textures.billboard(8, 'DORADO GT', 'Outrun the ordinary'), roughness: 0.7 }),
    );
    bb2.position.set(-16, 24, -110);
    bb2.rotation.y = Math.PI / 2 + 0.25;
    group.add(bb2);

    // ---- The marina (west): beach, water, pier, boats. ----
    var sandTex = textures.sand(31);
    sandTex.repeat.set(8, 8);
    var beach = new THREE.Mesh(
      new THREE.PlaneGeometry(48, 120),
      new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(-46, 0.01, 0);
    beach.receiveShadow = true;
    group.add(beach);
    var waterTex = textures.water(37);
    waterTex.repeat.set(10, 10);
    var water = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 240),
      new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.25, metalness: 0.1 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(-125, 0.0, -20);
    group.add(water);
    // Pier: plank deck on posts, reaching into the water.
    var pierTex = textures.pier(41);
    pierTex.repeat.set(6, 1);
    var pier = new THREE.Mesh(
      new THREE.BoxGeometry(34, 0.4, 5),
      new THREE.MeshStandardMaterial({ map: pierTex, roughness: 0.95 }),
    );
    pier.position.set(-56, 0.5, -6);
    pier.castShadow = true;
    pier.receiveShadow = true;
    group.add(pier);
    var postMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
    for (var pp = -40; pp >= -72; pp -= 8) {
      [-8.2, -3.8].forEach(function (pz2) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 8), postMat);
        post.position.set(pp, 0.1, pz2);
        group.add(post);
      });
    }
    // Pier rails.
    [-8.3, -3.7].forEach(function (pz3) {
      var rail = new THREE.Mesh(new THREE.BoxGeometry(34, 0.08, 0.08), postMat);
      rail.position.set(-56, 1.35, pz3);
      group.add(rail);
    });
    // Boats: simple hulls with masts and sails.
    function makeBoat(x, z, rot, hullColor) {
      var boat = new THREE.Group();
      var hull = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.6 }),
      );
      hull.scale.set(1.8, 0.8, 0.7);
      hull.rotation.x = Math.PI;
      hull.position.y = 0.35;
      boat.add(hull);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.5, 6), postMat);
      mast.position.y = 2.4;
      boat.add(mast);
      var sailShape = new THREE.Shape();
      sailShape.moveTo(0, 0);
      sailShape.lineTo(0, 3.6);
      sailShape.lineTo(1.9, 0.2);
      sailShape.closePath();
      var sail = new THREE.Mesh(
        new THREE.ShapeGeometry(sailShape),
        new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.9, side: THREE.DoubleSide }),
      );
      sail.position.set(0.1, 0.7, 0);
      boat.add(sail);
      boat.position.set(x, 0, z);
      boat.rotation.y = rot;
      return boat;
    }
    group.add(makeBoat(-82, 8, 0.5, 0xffffff));
    group.add(makeBoat(-88, -22, -0.4, 0xd8e8f0));
    group.add(makeBoat(-76, -34, 0.9, 0xf0e0d0));
    // Beach palms + a soccer ball on the sand.
    group.add(makePalm(-30, 12, 1.3));
    group.add(makePalm(-28, -18, 1.15));
    var ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 }),
    );
    ball.position.set(-36, 0.22, 3.5);
    ball.castShadow = true;
    group.add(ball);
    for (var bi = 0; bi < 5; bi++) {
      var spot = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 8),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
      );
      var ba = (bi / 5) * Math.PI * 2;
      spot.position.set(-36 + Math.cos(ba) * 0.19, 0.22 + Math.sin(ba * 2) * 0.08, 3.5 + Math.sin(ba) * 0.19);
      spot.lookAt(-36, 0.22, 3.5);
      spot.rotateY(Math.PI);
      group.add(spot);
    }

    // ---- The explosion down the street: a fireball and a smoke column
    // rising behind the rooftops. The chase shot reads it as a distant
    // blast beside the sky.
    var explosion = new THREE.Group();
    explosion.name = 'explosion';
    explosion.position.set(-4, 0, -82);
    var fireMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 2.4, roughness: 0.6 });
    var coreMat = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffc21a, emissiveIntensity: 3, roughness: 0.5 });
    var fireball = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), fireMat);
    fireball.position.y = 2.6;
    explosion.add(fireball);
    var core = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), coreMat);
    core.position.y = 2.4;
    explosion.add(core);
    var smokeMat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 1, transparent: true, opacity: 0.85 });
    for (var si = 0; si < 6; si++) {
      var puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + si * 0.45, 10, 8), smokeMat);
      puff.position.set(si * 0.7, 5 + si * 2.2, -si * 0.3);
      puff.scale.y = 0.8;
      explosion.add(puff);
    }
    group.add(explosion);

    // ---- Parked cars along the street edges. ----
    var parkedSpots = [
      [-5.6, -14, 0], [5.6, -22, Math.PI], [-5.6, -38, 0],
      [5.6, -64, Math.PI], [-5.6, -78, 0], [5.6, 18, Math.PI],
    ];
    parkedSpots.forEach(function (spot) {
      var car = window.AB.vehicles.createParkedCar(rng);
      car.position.set(spot[0], 0, spot[1]);
      car.rotation.y = Math.PI / 2 + spot[2];
      group.add(car);
      parkedCars.push(car);
    });

    // ---- Pedestrians: 24 on the sidewalks in the chase view (both
    // sides, walking / talking / phone / carrying), plus 12 ambient
    // further out for play mode. ----
    var people = window.AB.people;
    var skins = [0xc68e5e, 0x8a5a34, 0xe8b48c, 0x6a3a22, 0xd9a06a];
    var shirts = [0x3a6ab0, 0xc03a2a, 0x2a8a5a, 0xe0a03a, 0x7a4a9a, 0x2a9ab0, 0xd06a8a, 0x5a7a2a, 0xeeeeee, 0x2a2f38];
    var hairStyles = ['crop', 'bob', 'ponytail', 'cap', 'beard', 'bald'];
    var hairColors = [0x201510, 0x3a2410, 0x0c0c0c, 0x8a6a3a, 0xa01818, 0xd8d0b0];

    function addPedestrian(x, z, rotY, activity, seed) {
      var p = people.createPerson({
        skin: skins[Math.floor(rng() * skins.length)],
        shirt: shirts[Math.floor(rng() * shirts.length)],
        pants: [0x2a2f38, 0x3a4a6a, 0x5a4a3a, 0x1a1a1a][Math.floor(rng() * 4)],
        hairStyle: hairStyles[Math.floor(rng() * hairStyles.length)],
        hair: hairColors[Math.floor(rng() * hairColors.length)],
        activity: activity,
        seed: seed,
        name: 'ped' + seed,
      });
      p.group.position.set(x, 0, z);
      p.group.rotation.y = rotY;
      group.add(p.group);
      pedestrians.push(p);
      return p;
    }

    // Chase-view crowd: both sidewalks, z from -55 to +14.
    var crowdPlan = [
      // [side, z, activity, facing]
      [1, 10, 'walk', -1], [-1, 6, 'phone', 0.4], [1, -4, 'walk', 1], [-1, -8, 'carry', -1],
      [1, -14, 'talk', -0.6], [1, -15.5, 'talk', 0.6], [-1, -18, 'walk', 1], [1, -22, 'wave', 0.2],
      [-1, -26, 'talk', 0.5], [-1, -27.5, 'talk', -0.5], [1, -30, 'walk', -1], [-1, -34, 'walk', 1],
      [1, -38, 'phone', -0.3], [-1, -42, 'carry', -1], [1, -46, 'walk', 1], [-1, -50, 'walk', -1],
      [1, -54, 'talk', -0.5], [1, -55.5, 'talk', 0.5], [-1, -12, 'walk', -1], [1, 2, 'carry', 1],
      [-1, -2, 'walk', 1], [1, -8, 'phone', 0.3], [-1, -46, 'wave', 0.1], [1, -62, 'walk', -1],
    ];
    crowdPlan.forEach(function (plan, i) {
      var side = plan[0];
      var faceAlong = plan[3] === 1 ? 0 : plan[3] === -1 ? Math.PI : plan[3];
      // Walkers face along the street; talkers face each other across
      // a small gap; phone/wave face the street (toward the camera).
      var rotY = plan[2] === 'walk' ? (plan[3] === 1 ? Math.PI : 0) : plan[3];
      if (plan[2] === 'talk') rotY = side > 0 ? -Math.PI / 2 + plan[3] : Math.PI / 2 + plan[3];
      addPedestrian(side * 8.5, plan[1], rotY, plan[2], 1000 + i);
    });
    // Ambient crowd further out (play mode).
    for (var ai = 0; ai < 12; ai++) {
      var aside = ai % 2 === 0 ? 1 : -1;
      var az = ai < 6 ? -70 - ai * 12 : 20 + (ai - 6) * 10;
      addPedestrian(aside * 8.5, az, ai % 3 === 0 ? 0 : Math.PI, 'walk', 2000 + ai);
    }

    // ---- The marina crew: six people in a row on the sand, facing the
    // marina camera (east, +X). Their heads are the marina shot's check.
    var crewDefs = [
      { name: 'Sofia', shirt: 0x3a6ab0, pants: 0xb0a080, hairStyle: 'bob', hair: 0xd8d0b0, activity: 'idle' },
      { name: 'Marco', shirt: 0xc03a2a, pants: 0x1a1a1a, hairStyle: 'cap', hair: 0x1a1a1a, activity: 'idle' },
      { name: 'Nina', shirt: 0x7a4a9a, pants: 0x2a3a5a, hairStyle: 'bob', hair: 0xa01818, activity: 'idle' },
      { name: 'Hugo', shirt: 0xe07a2a, pants: 0x2a2f38, hairStyle: 'beard', hair: 0x14100c, activity: 'carry' },
      { name: 'Lena', shirt: 0x2a9a4a, pants: 0x1a1a1a, hairStyle: 'ponytail', hair: 0x3a2410, activity: 'wave' },
      { name: 'Dante', shirt: 0xeeeeee, pants: 0x2a4a6a, hairStyle: 'crop', hair: 0x1c1410, activity: 'idle' },
    ];
    var crew = [];
    crewDefs.forEach(function (def, i) {
      var p = people.createPerson({
        skin: skins[i % skins.length],
        shirt: def.shirt,
        pants: def.pants,
        hairStyle: def.hairStyle,
        hair: def.hair,
        activity: def.activity,
        seed: 3000 + i,
        name: def.name,
      });
      // Row along Z at x=-38, facing +X (toward the marina camera).
      p.group.position.set(-38, 0, -4 + i * 1.6);
      p.group.rotation.y = Math.PI / 2;
      group.add(p.group);
      crew.push(p);
    });

    return {
      group: group,
      explosion: explosion,
      pedestrians: pedestrians,
      parkedCars: parkedCars,
      crew: crew,
    };
  }

  window.AB.city = {
    buildCity: buildCity,
  };
})();
