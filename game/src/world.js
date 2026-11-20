// Coral Vista city: sky, ground, roads, buildings (4 types), shops, palms,
// beach, ocean, ferris wheel, marina. Deterministic from the seed.
var CV = window.CV || (window.CV = {});

CV.world = (function () {
  var C = CV.config;
  var colliders = [];
  var animated = []; // {update(dt, t)} — ferris wheel, boats, ocean
  var checkpointMeshes = [];

  function box(w, h, d, mat, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function buildSky(scene) {
    // Gradient dome. Blue fills in by h = 0.30 so a street-level camera sees
    // blue sky, not a flat orange wash (the V16 sky fix).
    var geo = new THREE.SphereGeometry(900, 24, 16);
    var mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(C.SKY.top) },
        mid: { value: new THREE.Color(C.SKY.mid) },
        low: { value: new THREE.Color(C.SKY.low) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;' +
        'void main(){ float h = normalize(vP).y; vec3 c = h > 0.30 ? mix(mid, top, smoothstep(0.30, 0.75, h)) : mix(low, mid, smoothstep(-0.05, 0.30, h)); gl_FragColor = vec4(c, 1.0); }',
    });
    scene.add(new THREE.Mesh(geo, mat));
    // Sun disc + glow sprite.
    var sunMat = new THREE.SpriteMaterial({
      map: CV.textures.glow('rgba(255,225,160,1)'),
      transparent: true, depthWrite: false, depthTest: true,
    });
    var sun = new THREE.Sprite(sunMat);
    sun.scale.set(180, 180, 1);
    sun.position.set(C.SUN.pos[0] * 5, C.SUN.pos[1] * 4, C.SUN.pos[2] * 5);
    sun.name = 'sunSprite';
    scene.add(sun);
  }

  function buildLights(scene) {
    var hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a6a4a, 0.65);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(C.SUN.color, C.SUN.intensity);
    sun.position.set(C.SUN.pos[0], C.SUN.pos[1], C.SUN.pos[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
    sun.shadow.camera.far = 600;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    scene.add(sun.target);
    // Warm fill from the opposite side so shadow faces stay readable.
    var fill = new THREE.DirectionalLight(0xff9a5c, 0.5);
    fill.position.set(120, 60, 140);
    scene.add(fill);
    return sun;
  }

  function groundPlane(w, d, mat, x, z, y) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y || 0, z);
    m.receiveShadow = true;
    return m;
  }

  function buildGround(scene) {
    var cityMat = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.95 });
    scene.add(groundPlane(560, 560, cityMat, 0, 0, -0.05));
    // Ocean (east + south).
    var waterMat = new THREE.MeshStandardMaterial({ map: CV.textures.water(), roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.96 });
    var ocean = groundPlane(320, 560, waterMat, 320, 0, 0.02);
    scene.add(ocean);
    var oceanS = groundPlane(560, 200, waterMat, 0, 280, 0.02);
    scene.add(oceanS);
    animated.push({ update: function (dt) { waterMat.map.offset.y += dt * 0.004; } });
    // Beach sand.
    var sandMat = new THREE.MeshStandardMaterial({ map: CV.textures.sand(), roughness: 1 });
    scene.add(groundPlane(48, 440, sandMat, 136, 0, 0.0));
    scene.add(groundPlane(200, 60, sandMat, 60, 190, 0.0));
    // Roads: Coral Avenue (N-S at x=90) + grid.
    var roadMat = new THREE.MeshStandardMaterial({ map: CV.textures.road(), roughness: 0.75, metalness: 0.05 });
    function road(x, z, w, d, ry) {
      var m = groundPlane(w, d, roadMat, x, z, 0.03);
      if (ry) m.rotation.z = ry;
      scene.add(m);
    }
    road(C.AVENUE_X, 0, C.ROAD_W, 420);
    [-120, -80, -40, 0, 40].forEach(function (x) { road(x, -20, 12, 360); });
    [-160, -120, -80, -40, 0, 40, 80, 120].forEach(function (z) { road(-30, z, 12, 300, Math.PI / 2); });
    // Sidewalks flanking the avenue.
    var walkMat = new THREE.MeshStandardMaterial({ map: CV.textures.sidewalk(), roughness: 0.9 });
    scene.add(groundPlane(6, 420, walkMat, C.AVENUE_X - 11, 0, 0.06));
    scene.add(groundPlane(6, 420, walkMat, C.AVENUE_X + 11, 0, 0.06));
    // Crosswalks on the avenue.
    var crossMat = new THREE.MeshStandardMaterial({ map: CV.textures.crosswalk(), roughness: 0.8 });
    [-160, -120, -80, -40, 0, 40, 80, 120].forEach(function (z) {
      scene.add(groundPlane(C.ROAD_W, 6, crossMat, C.AVENUE_X, z, 0.05));
    });
  }

  var FACADES = ['#c9b8a3', '#b8c4c9', '#d4c5a0', '#c9a3a3', '#a3b8c9', '#c9c2b0'];
  var ROOFS = ['#7a6a58', '#6a7a72', '#8a7a6a'];

  function buildBuilding(scene, rng, x, z, w, d) {
    var h = rng.range(10, 55);
    var type = rng.pick(['slab', 'slab', 'cylinder', 'setback', 'pyramid']);
    var base = rng.pick(FACADES);
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    var fac = CV.textures.facade(rng.int(1, 9999), base, Math.max(3, Math.round(h / 4)), 0.42);
    var mat = new THREE.MeshStandardMaterial({ map: fac, roughness: 0.85 });
    var roofMat = new THREE.MeshStandardMaterial({ color: rng.pick(ROOFS), roughness: 0.95 });
    if (type === 'cylinder') {
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.46, h, 12), mat);
      cyl.position.y = h / 2; cyl.castShadow = true; cyl.receiveShadow = true;
      g.add(cyl);
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.42, 1, 12), roofMat);
      cap.position.y = h + 0.5; g.add(cap);
    } else if (type === 'setback') {
      var b1 = box(w, h * 0.6, d, mat, 0, h * 0.3, 0, g);
      var b2 = box(w * 0.66, h * 0.4, d * 0.66, mat, 0, h * 0.8, 0, g);
      box(w * 0.66, 1, d * 0.66, roofMat, 0, h + 0.5, 0, g);
      void b1; void b2;
    } else if (type === 'pyramid') {
      box(w, h * 0.75, d, mat, 0, h * 0.375, 0, g);
      var pyr = new THREE.Mesh(new THREE.ConeGeometry(w * 0.55, h * 0.3, 4), roofMat);
      pyr.position.y = h * 0.75 + h * 0.15; pyr.rotation.y = Math.PI / 4;
      pyr.castShadow = true; g.add(pyr);
    } else {
      box(w, h, d, mat, 0, h / 2, 0, g);
      box(w * 0.9, 1, d * 0.9, roofMat, 0, h + 0.5, 0, g);
    }
    // Rooftop clutter: AC boxes, water tower, antenna.
    if (rng.chance(0.7)) box(rng.range(2, 4), 1.2, rng.range(2, 4), roofMat, rng.range(-w / 4, w / 4), h + 1, rng.range(-d / 4, d / 4), g);
    if (rng.chance(0.35)) {
      var tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 8), roofMat);
      tank.position.set(rng.range(-w / 4, w / 4), h + 2.2, rng.range(-d / 4, d / 4));
      tank.castShadow = true; g.add(tank);
    }
    if (rng.chance(0.5)) {
      var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, rng.range(4, 9), 4),
        new THREE.MeshStandardMaterial({ color: 0x333333 }));
      ant.position.set(rng.range(-w / 3, w / 3), h + 4, rng.range(-d / 3, d / 3));
      g.add(ant);
    }
    scene.add(g);
    colliders.push({ x0: x - w / 2 - 0.5, x1: x + w / 2 + 0.5, z0: z - d / 2 - 0.5, z1: z + d / 2 + 0.5 });
    return h;
  }

  function buildCity(scene, rng) {
    var count = 0;
    // Blocks west of the avenue + a few east-side blocks north of the beach.
    for (var gx = -160; gx <= 60; gx += C.BLOCK) {
      for (var gz = -200; gz <= 120; gz += C.BLOCK) {
        // skip road corridors
        if (Math.abs((gx + 20) - C.AVENUE_X) < 22) continue;
        var cx = gx + 20, cz = gz + 20;
        // keep the marina basin + beach clear
        if (cz > 140) continue;
        if (rng.chance(0.12)) continue; // empty lot / parking
        var w = rng.range(18, 26), d = rng.range(18, 26);
        buildBuilding(scene, rng, cx + rng.range(-2, 2), cz + rng.range(-2, 2), w, d);
        count++;
      }
    }
    // A row of towers east of the avenue (skyline behind the chase).
    for (var i = 0; i < 10; i++) {
      buildBuilding(scene, rng, 104 + rng.range(0, 4), -180 + i * 34, rng.range(10, 14), rng.range(10, 14));
      count++;
    }
    return count;
  }

  function buildShops(scene) {
    C.SHOPS.forEach(function (s) {
      var g = new THREE.Group();
      g.position.set(s.x, 0, s.z);
      var wallMat = new THREE.MeshStandardMaterial({ color: 0xdad2c4, roughness: 0.9 });
      box(10, 5, 8, wallMat, 0, 2.5, 0, g);
      var signMat = new THREE.MeshStandardMaterial({ map: CV.textures.sign(s.name, s.bg, s.fg), emissive: 0xffffff, emissiveMap: CV.textures.sign(s.name, s.bg, s.fg), emissiveIntensity: 0.35, roughness: 0.6 });
      var sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), signMat);
      sign.position.set(s.x < C.AVENUE_X ? 5.1 : -5.1, 3.9, 0);
      sign.rotation.y = s.x < C.AVENUE_X ? Math.PI / 2 : -Math.PI / 2;
      g.add(sign);
      // awning + door glow
      var awn = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: s.bg, roughness: 0.8 }));
      awn.position.set(s.x < C.AVENUE_X ? 5.2 : -5.2, 2.6, 0);
      g.add(awn);
      var glowMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd97a, emissiveIntensity: 1.4 });
      box(0.2, 2.4, 6, glowMat, s.x < C.AVENUE_X ? 5.05 : -5.05, 1.2, 0, g);
      scene.add(g);
      colliders.push({ x0: s.x - 5, x1: s.x + 5, z0: s.z - 4, z1: s.z + 4 });
    });
    // Billboards on poles.
    C.BILLBOARDS.forEach(function (b) {
      var g = new THREE.Group();
      g.position.set(b.x, 0, b.z);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 9, 6),
        new THREE.MeshStandardMaterial({ color: 0x555555 }));
      pole.position.y = 4.5; pole.castShadow = true; g.add(pole);
      var bm = new THREE.MeshStandardMaterial({ map: CV.textures.billboard(b.text, b.sub), emissive: 0xffffff, emissiveMap: CV.textures.billboard(b.text, b.sub), emissiveIntensity: 0.25, roughness: 0.7 });
      var board = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), bm);
      board.position.y = 11; board.rotation.y = Math.PI / 2; g.add(board);
      var back = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      back.position.y = 11; back.rotation.y = -Math.PI / 2; g.add(back);
      scene.add(g);
    });
  }

  function palm(scene, x, z, rng) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    var lean = rng.range(-0.14, 0.14);
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 6), trunkMat);
    trunk.position.y = 3.5; trunk.rotation.z = lean; trunk.castShadow = true;
    g.add(trunk);
    var frondMat = new THREE.MeshStandardMaterial({ color: 0x2e8b3d, roughness: 0.9, side: THREE.DoubleSide });
    for (var i = 0; i < 7; i++) {
      var frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), frondMat);
      var a = (i / 7) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.4, 7.1, Math.sin(a) * 1.4);
      frond.rotation.set(Math.sin(a) * 1.1, 0, Math.cos(a) * 1.1);
      frond.scale.set(1, 1, 0.28);
      frond.castShadow = true;
      g.add(frond);
    }
    // coconuts
    var nut = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
    nut.position.set(0.4, 6.7, 0.2); g.add(nut);
    scene.add(g);
    return g;
  }

  function buildStreetFurniture(scene, rng) {
    // Palms along the avenue (both sidewalks) + beach row.
    for (var z = -190; z <= 150; z += 19) {
      if (rng.chance(0.85)) palm(scene, C.AVENUE_X - 12.5, z + rng.range(-3, 3), rng);
      if (rng.chance(0.85)) palm(scene, C.AVENUE_X + 12.5, z + rng.range(-3, 3), rng);
    }
    for (var z2 = -180; z2 <= 180; z2 += 24) {
      if (rng.chance(0.8)) palm(scene, 118 + rng.range(-2, 6), z2, rng);
    }
    // Street lamps along the avenue.
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.6 });
    var lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 1.6 });
    for (var z3 = -180; z3 <= 140; z3 += 40) {
      [C.AVENUE_X - 10.5, C.AVENUE_X + 10.5].forEach(function (x) {
        var g = new THREE.Group();
        g.position.set(x, 0, z3);
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), poleMat);
        pole.position.y = 4; pole.castShadow = true; g.add(pole);
        var arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.14), poleMat);
        arm.position.set(x < C.AVENUE_X ? 1.1 : -1.1, 7.9, 0); g.add(arm);
        var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), lampMat);
        lamp.position.set(x < C.AVENUE_X ? 2.2 : -2.2, 7.8, 0); g.add(lamp);
        scene.add(g);
      });
    }
    // Traffic lights at avenue intersections.
    [-120, -40, 40, 120].forEach(function (z) {
      var g = new THREE.Group();
      g.position.set(C.AVENUE_X + 9.5, 0, z + 7);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), poleMat);
      pole.position.y = 3; pole.castShadow = true; g.add(pole);
      var head = box(0.7, 1.8, 0.5, new THREE.MeshStandardMaterial({ color: 0x222222 }), 0, 6.2, 0, g);
      void head;
      ['#ff3b30', '#ffcc00', '#34c759'].forEach(function (col, i) {
        var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: i === 2 ? 1.8 : 0.25 }));
        lamp.position.set(0, 6.8 - i * 0.55, 0.28); g.add(lamp);
      });
      scene.add(g);
    });
    // Beach umbrellas + benches.
    var umbColors = [0xe84a5f, 0x2e86ab, 0xffc53d, 0x3d8b4f, 0x8b3d7a];
    for (var i = 0; i < 14; i++) {
      var ux = 122 + rng.range(0, 26), uz = -170 + i * 26 + rng.range(-6, 6);
      var g2 = new THREE.Group();
      g2.position.set(ux, 0, uz);
      var pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), poleMat);
      pole2.position.y = 1.3; g2.add(pole2);
      var top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: umbColors[i % umbColors.length], roughness: 0.85, side: THREE.DoubleSide }));
      top.position.y = 2.8; top.castShadow = true; g2.add(top);
      scene.add(g2);
    }
    for (var b = 0; b < 8; b++) {
      var bx = C.AVENUE_X + 13.5, bz = -150 + b * 42;
      box(2.2, 0.5, 0.7, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }), bx, 0.45, bz, scene);
    }
  }

  function buildFerrisWheel(scene) {
    var g = new THREE.Group();
    g.position.set(128, 0, 10);
    var frameMat = new THREE.MeshStandardMaterial({ color: 0xe84a5f, roughness: 0.6, metalness: 0.3 });
    var legMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.7 });
    [-6, 6].forEach(function (dx) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 22, 6), legMat);
      leg.position.set(dx, 11, 0); leg.rotation.z = dx > 0 ? 0.28 : -0.28;
      leg.castShadow = true; g.add(leg);
    });
    var wheel = new THREE.Group();
    wheel.position.y = 21;
    var rim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.35, 8, 32), frameMat);
    rim.castShadow = true; wheel.add(rim);
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 20, 4), frameMat);
      spoke.rotation.z = a; wheel.add(spoke);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.4),
        new THREE.MeshStandardMaterial({ color: [0x2e86ab, 0xffc53d, 0x3d8b4f, 0xe84a5f][i % 4], roughness: 0.7 }));
      cab.position.set(Math.cos(a) * 10, Math.sin(a) * 10, 0);
      wheel.add(cab);
    }
    g.add(wheel);
    animated.push({ update: function (dt) { wheel.rotation.z += dt * 0.12; } });
    scene.add(g);
  }

  function buildMarina(scene, rng) {
    // Wooden docks + 6 boats in the south-east basin.
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 1 });
    for (var d = 0; d < 3; d++) {
      var dock = box(3, 0.5, 34, woodMat, 60 + d * 30, 0.25, 195, scene);
      void dock;
      for (var p = 0; p < 5; p++) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 5), woodMat);
        post.position.set(60 + d * 30 + 1.6, 0.7, 182 + p * 8);
        scene.add(post);
      }
    }
    var hullColors = [0xd94f3d, 0x2e86ab, 0xe8e8e8, 0x3d8b4f, 0xffc53d, 0x8b3d7a];
    var boats = [];
    for (var i = 0; i < 6; i++) {
      var bg = new THREE.Group();
      var row = Math.floor(i / 3);
      var bx = 48 + (i % 3) * 30 + rng.range(-4, 4);
      // Near row sits broadside to the marina camera so the hulls read as
      // boats, not boxes; far row keeps its mooring angle.
      var bz = (row === 0 ? 184 : 208) + rng.range(-2, 2);
      bg.position.set(bx, 0.1, bz);
      bg.rotation.y = row === 0 ? Math.PI / 2 + rng.range(-0.12, 0.12) : rng.range(-0.15, 0.15);
      // hull: stretched, tapered box + bow wedge
      var hullMat = new THREE.MeshStandardMaterial({ color: hullColors[i], roughness: 0.4, metalness: 0.2 });
      var hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 7.5), hullMat);
      hull.position.y = 0.55; hull.castShadow = true; bg.add(hull);
      var bow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 4), hullMat);
      bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
      bow.position.set(0, 0.55, 4.8); bow.scale.set(1, 1, 0.6); bg.add(bow);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 2.6),
        new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }));
      cabin.position.set(0, 1.6, -0.6); cabin.castShadow = true; bg.add(cabin);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5, 5),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 }));
      mast.position.set(0, 4, 0.8); bg.add(mast);
      scene.add(bg);
      boats.push(bg);
    }
    animated.push({
      update: function (dt, t) {
        boats.forEach(function (b, i) {
          b.position.y = 0.1 + Math.sin(t * 0.8 + i * 1.3) * 0.08;
          b.rotation.z = Math.sin(t * 0.6 + i) * 0.02;
        });
      },
    });
  }

  function buildCheckpoints(scene) {
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    var pillarMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    C.CHECKPOINTS.forEach(function (cp, i) {
      var g = new THREE.Group();
      g.position.set(cp.x, 0, cp.z);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 8, 32), ringMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; g.add(ring);
      var pillar = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 16, 1, true), pillarMat);
      pillar.position.y = 13; g.add(pillar);
      g.visible = i === 0;
      scene.add(g);
      checkpointMeshes.push(g);
    });
  }

  function build(scene, seed) {
    var rng = new CV.random.RNG(seed);
    scene.fog = new THREE.Fog(C.FOG.color, C.FOG.near, C.FOG.far);
    buildSky(scene);
    var sun = buildLights(scene);
    buildGround(scene);
    var nBuildings = buildCity(scene, rng);
    buildShops(scene);
    buildStreetFurniture(scene, rng);
    buildFerrisWheel(scene);
    buildMarina(scene, rng);
    buildCheckpoints(scene);
    return { sun: sun, buildings: nBuildings };
  }

  function update(dt, t) {
    animated.forEach(function (a) { a.update(dt, t); });
  }

  function setCheckpoint(i) {
    checkpointMeshes.forEach(function (g, j) { g.visible = j === i; });
  }

  function districtAt(x, z) {
    for (var i = 0; i < C.DISTRICTS.length; i++) {
      var d = C.DISTRICTS[i];
      if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
    }
    return C.DISTRICTS[0];
  }

  // Push a circle (car) out of building colliders; returns corrected position.
  function collide(x, z, r) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var nx = Math.max(c.x0, Math.min(x, c.x1));
      var nz = Math.max(c.z0, Math.min(z, c.z1));
      var dx = x - nx, dz = z - nz;
      var d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 0.0001) {
          var d = Math.sqrt(d2);
          x = nx + (dx / d) * r;
          z = nz + (dz / d) * r;
        } else {
          x = c.x1 + r;
        }
      }
    }
    x = Math.max(-190, Math.min(150, x));
    z = Math.max(-230, Math.min(230, z));
    return { x: x, z: z };
  }

  return {
    build: build, update: update, setCheckpoint: setCheckpoint,
    districtAt: districtAt, collide: collide, colliders: colliders,
  };
})();
