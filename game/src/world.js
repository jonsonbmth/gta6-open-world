// SOLMAR BAY — the city: roads, four building types, neon shops, lamps,
// palms, skyline, marina, bay, sky dome and rain. All geometry is built in
// code; all textures come from SB.textures.
(function () {
  'use strict';
  window.SB = window.SB || {};
  var C = SB.config;
  var U = SB.utils;
  var T = SB.textures;

  var W = {
    colliders: [], // {x, z, hw, hd} axis-aligned boxes the cars and Rico hit
    rain: null,
    rainVel: null,
    boats: [],
    beacon: null,
  };

  function addCollider(x, z, hw, hd) {
    W.colliders.push({ x: x, z: z, hw: hw, hd: hd });
  }

  // --- sky dome: simple gradient shader, deep blue top to purple horizon ---
  function buildSky(scene) {
    var geo = new THREE.SphereGeometry(700, 24, 16);
    var mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(C.skyTop) },
        bottom: { value: new THREE.Color(C.skyHorizon) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.65, h)), 1.0); }',
    });
    var dome = new THREE.Mesh(geo, mat);
    scene.add(dome);
    // Stars: dim points high up.
    var starGeo = new THREE.BufferGeometry();
    var starPos = new Float32Array(400 * 3);
    var rng = U.mulberry32(42);
    for (var i = 0; i < 400; i++) {
      var a = rng() * Math.PI * 2;
      var e = 0.15 + rng() * 1.2;
      var r = 640;
      starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      starPos[i * 3 + 1] = Math.sin(e) * r;
      starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xaac4ff, size: 1.6, sizeAttenuation: false,
      transparent: true, opacity: 0.7, fog: false,
    }));
    scene.add(stars);
    // Moon glow.
    var moon = U.glowSprite(0xcdd8ff, 90, 0.5);
    moon.position.set(-260, 300, -420);
    scene.add(moon);
  }

  // --- ground, roads, sidewalks ---
  function buildGround(scene) {
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshStandardMaterial({ color: 0x0d1020, roughness: 0.9, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    // Bay water to the east.
    var water = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 700),
      new THREE.MeshStandardMaterial({ color: 0x06283e, roughness: 0.12, metalness: 0.85 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(290, 0.02, 0);
    scene.add(water);
    // Marina inlet water (southwest).
    var inlet = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x06283e, roughness: 0.12, metalness: 0.85 })
    );
    inlet.rotation.x = -Math.PI / 2;
    inlet.position.set(-170, 0.02, 165);
    scene.add(inlet);

    // Lumen Avenue: the main north-south road.
    var roadTex = T.road();
    var ave = new THREE.Mesh(
      new THREE.PlaneGeometry(C.avenueWidth, 420),
      new THREE.MeshStandardMaterial({
        map: roadTex, color: 0xffffff,
        roughness: C.roadRoughness, metalness: C.roadMetalness,
      })
    );
    ave.rotation.x = -Math.PI / 2;
    ave.position.set(C.avenueX, 0, 0);
    roadTex.repeat.set(1, 26);
    scene.add(ave);

    // Cross streets.
    var streetMat = new THREE.MeshStandardMaterial({
      color: C.roadColor, roughness: 0.25, metalness: 0.6,
    });
    for (var z = -160; z <= 160; z += C.streetEvery) {
      var st = new THREE.Mesh(new THREE.PlaneGeometry(340, 12), streetMat);
      st.rotation.x = -Math.PI / 2;
      st.position.set(0, 0.01, z);
      scene.add(st);
    }

    // Sidewalks flanking the avenue.
    var walkTex = T.sidewalk();
    walkTex.repeat.set(2, 60);
    var walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.8, metalness: 0.1 });
    [-12, 12].forEach(function (x) {
      var w = new THREE.Mesh(new THREE.PlaneGeometry(7, 420), walkMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(x, 0.03, 0);
      scene.add(w);
    });
  }

  // --- one building: 4 types, lit windows, rooftop props ---
  var windowMats = [];
  function buildingMaterials() {
    if (windowMats.length) return windowMats;
    for (var v = 0; v < 4; v++) {
      windowMats.push(new THREE.MeshStandardMaterial({
        color: 0x141828,
        roughness: 0.85,
        metalness: 0.2,
        emissive: 0xffffff,
        emissiveMap: T.windows(v),
        emissiveIntensity: 1.1,
      }));
    }
    return windowMats;
  }

  function rooftopProps(group, w, h, d, rng) {
    // Antenna.
    if (rng() < 0.6) {
      var ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4 + rng() * 5, 5),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })
      );
      ant.position.set(U.rand(rng, -w / 4, w / 4), h + 2.5, U.rand(rng, -d / 4, d / 4));
      group.add(ant);
      var tip = U.glowSprite(0xff4040, 1.6, 0.9);
      tip.position.set(ant.position.x, h + 5 + rng() * 2, ant.position.z);
      group.add(tip);
    }
    // Water tank.
    if (rng() < 0.5) {
      var tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 2.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.8 })
      );
      tank.position.set(U.rand(rng, -w / 4, w / 4), h + 1.1, U.rand(rng, -d / 4, d / 4));
      group.add(tank);
    }
    // AC unit.
    if (rng() < 0.7) {
      var ac = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x2a2e3e, roughness: 0.9 })
      );
      ac.position.set(U.rand(rng, -w / 4, w / 4), h + 0.5, U.rand(rng, -d / 4, d / 4));
      group.add(ac);
    }
  }

  function buildBuilding(scene, x, z, w, h, d, type, rng) {
    var mats = buildingMaterials();
    var mat = mats[Math.floor(rng() * mats.length)];
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    if (type === 0) {
      // Slab.
      var slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      slab.position.y = h / 2;
      g.add(slab);
    } else if (type === 1) {
      // Cylindrical tower.
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 14), mat);
      cyl.position.y = h / 2;
      g.add(cyl);
      var cap = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2 + 0.4, w / 2 + 0.4, 1.2, 14),
        new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.7 })
      );
      cap.position.y = h + 0.6;
      g.add(cap);
    } else if (type === 2) {
      // 3-tier setback.
      var tiers = [[w, h * 0.5], [w * 0.78, h * 0.3], [w * 0.55, h * 0.2]];
      var y = 0;
      tiers.forEach(function (t) {
        var box = new THREE.Mesh(new THREE.BoxGeometry(t[0], t[1], d * (t[0] / w)), mat);
        box.position.y = y + t[1] / 2;
        g.add(box);
        y += t[1];
      });
    } else {
      // Pyramid roof.
      var base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.8, d), mat);
      base.position.y = h * 0.4;
      g.add(base);
      var roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.35, 4),
        new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.7 })
      );
      roof.position.y = h * 0.8 + h * 0.17;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }
    rooftopProps(g, w, h, d, rng);
    scene.add(g);
    addCollider(x, z, w / 2 + 0.5, d / 2 + 0.5);
    return g;
  }

  // --- neon shop fronts along the avenue ---
  function buildShops(scene, rng) {
    var shops = C.shops;
    var z = -112;
    var side = 1;
    shops.forEach(function (shop, i) {
      var x = side * 13.5;
      var facing = -side; // sign faces the avenue
      var g = new THREE.Group();
      g.position.set(x, 0, z);
      // Shop box.
      var box = new THREE.Mesh(
        new THREE.BoxGeometry(7, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x181c2c, roughness: 0.8 })
      );
      box.position.y = 3;
      g.add(box);
      // Lit storefront window.
      var win = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 2.6),
        new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })
      );
      win.position.set(facing * 3.55, 1.8, 0);
      win.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(win);
      // Awning stripe.
      var awn = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.25, 6.4),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(shop.color), roughness: 0.5 })
      );
      awn.position.set(facing * 3.8, 3.6, 0);
      g.add(awn);
      // Neon sign.
      var sign = new THREE.Mesh(
        new THREE.PlaneGeometry(7.5, 1.9),
        new THREE.MeshBasicMaterial({ map: T.neonSign(shop.name, shop.color), toneMapped: false })
      );
      sign.position.set(facing * 3.6, 5, 0);
      sign.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(sign);
      var glow = U.glowSprite(new THREE.Color(shop.color).getHex(), 7, 0.5);
      glow.position.set(facing * 4.4, 5, 0);
      g.add(glow);
      // Wet-road reflection streak under the sign.
      var streak = U.reflectionStreak(new THREE.Color(shop.color).getHex(), 2.2, 26, 0.45);
      streak.position.set(facing * 5.5, 0.06, z + 6);
      streak.rotation.z = 0;
      scene.add(streak);
      scene.add(g);
      addCollider(x, z, 3.8, 5.2);
      z += 14;
      side = -side;
    });
  }

  // --- street lamps with warm pools and reflections ---
  function buildLamps(scene) {
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1d28, roughness: 0.6, metalness: 0.5 });
    for (var z = -180; z <= 180; z += 24) {
      [-11, 11].forEach(function (x, idx) {
        if ((z / 24 + idx) % 2 !== 0) return; // stagger sides
        var g = new THREE.Group();
        g.position.set(x, 0, z);
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat);
        pole.position.y = 3.5;
        g.add(pole);
        var arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.14), poleMat);
        arm.position.set(x > 0 ? -0.8 : 0.8, 6.9, 0);
        g.add(arm);
        var head = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 8, 8),
          new THREE.MeshBasicMaterial({ color: C.lampWarm, toneMapped: false })
        );
        head.position.set(x > 0 ? -1.6 : 1.6, 6.8, 0);
        g.add(head);
        var glow = U.glowSprite(C.lampWarm, 4.5, 0.55);
        glow.position.copy(head.position);
        g.add(glow);
        scene.add(g);
        var pool = U.lightPool(C.lampWarm, 5, 0.28);
        pool.position.set(x > 0 ? x - 2 : x + 2, 0.05, z);
        scene.add(pool);
        var streak = U.reflectionStreak(C.lampWarm, 1.2, 10, 0.22);
        streak.position.set(x > 0 ? x - 3 : x + 3, 0.06, z + 3);
        scene.add(streak);
      });
    }
  }

  // --- palms: dark silhouettes framing the avenue ---
  function buildPalm(scene, x, z, rng) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.95 });
    var lean = U.rand(rng, -0.16, 0.16);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = lean;
    g.add(trunk);
    var frondMat = new THREE.MeshStandardMaterial({
      color: 0x0d2818, roughness: 0.9, side: THREE.DoubleSide,
    });
    for (var i = 0; i < 8; i++) {
      var frond = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.1, 4), frondMat);
      var a = (i / 8) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 0.9, 7, Math.sin(a) * 0.9);
      frond.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
      frond.scale.set(1, 1, 0.24);
      g.add(frond);
    }
    scene.add(g);
    addCollider(x, z, 0.5, 0.5);
  }

  function buildPalms(scene, rng) {
    for (var z = -170; z <= 170; z += 20) {
      if (rng() < 0.75) buildPalm(scene, -11.5, z + U.rand(rng, -3, 3), rng);
      if (rng() < 0.75) buildPalm(scene, 11.5, z + U.rand(rng, -3, 3), rng);
    }
    // Marina palms.
    for (var i = 0; i < 8; i++) {
      buildPalm(scene, -150 + rng() * 60, 120 + rng() * 40, rng);
    }
  }

  // --- downtown skyline backdrop ---
  function buildSkyline(scene, rng) {
    for (var x = -150; x <= 150; x += 18) {
      var h = 45 + rng() * 65;
      var w = 12 + rng() * 8;
      buildBuilding(scene, x + U.rand(rng, -4, 4), -178 - rng() * 12, w, h, w, Math.floor(rng() * 4), rng);
    }
    // Lumen Tower: the landmark spire with a neon crown.
    var tower = new THREE.Group();
    tower.position.set(30, 0, -170);
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(16, 120, 16),
      buildingMaterials()[1]
    );
    body.position.y = 60;
    tower.add(body);
    var crown = new THREE.Mesh(
      new THREE.BoxGeometry(17, 3, 17),
      new THREE.MeshBasicMaterial({ color: C.neonPink, toneMapped: false })
    );
    crown.position.y = 121;
    tower.add(crown);
    var crownGlow = U.glowSprite(C.neonPink, 30, 0.6);
    crownGlow.position.y = 122;
    tower.add(crownGlow);
    scene.add(tower);
  }

  // --- marina: docks, boats, crates, lamps ---
  function buildBoat(scene, x, z, rotY, rng, hullColor) {
    var g = new THREE.Group();
    g.position.set(x, 0.4, z);
    g.rotation.y = rotY;
    // Extruded hull: pointed bow profile.
    var s = new THREE.Shape();
    s.moveTo(-4.5, 0);
    s.lineTo(4.5, 0);
    s.lineTo(3.2, 1.1);
    s.lineTo(-3.2, 1.1);
    s.closePath();
    var hull = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25 }),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.35, metalness: 0.4 })
    );
    hull.rotation.y = Math.PI / 2;
    hull.position.x = 1.1;
    g.add(hull);
    var cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.4, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.5 })
    );
    cabin.position.set(0, 1.8, 0);
    g.add(cabin);
    var mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 4.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    mast.position.set(0.6, 4, 0);
    g.add(mast);
    var lamp = U.glowSprite(0xffe9a8, 2.4, 0.9);
    lamp.position.set(0.6, 6.2, 0);
    g.add(lamp);
    scene.add(g);
    W.boats.push({ group: g, phase: rng() * Math.PI * 2 });
    return g;
  }

  function buildMarina(scene, rng) {
    var woodTex = T.dockWood();
    var woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
    // Warm floodlight over the quay gathering + a cool one over the docks:
    // the marina reads as a place, not a black void.
    var quayLight = new THREE.PointLight(0xffd9a0, 90, 48, 1.6);
    quayLight.position.set(-146, 8, 150);
    scene.add(quayLight);
    var dockLight = new THREE.PointLight(0x9fd8ff, 60, 40, 1.6);
    dockLight.position.set(-136, 7, 174);
    scene.add(dockLight);
    // Main dock.
    for (var i = 0; i < 3; i++) {
      var dock = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 42), woodMat);
      dock.position.set(-150 + i * 14, 0.3, 168);
      scene.add(dock);
      // Dock lamps.
      var post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1d28 })
      );
      post.position.set(-150 + i * 14, 2, 186);
      scene.add(post);
      var lampGlow = U.glowSprite(C.lampWarm, 3.6, 0.7);
      lampGlow.position.set(-150 + i * 14, 3.8, 186);
      scene.add(lampGlow);
    }
    // Boats moored along the docks.
    var hullColors = [0xd8d8e0, 0x2e6fd8, 0xc81e2b, 0x1fae5f, 0xe8b93f];
    for (var b = 0; b < 6; b++) {
      buildBoat(scene, -158 + b * 12, 150 + (b % 2) * 26, (b % 2 ? 0.15 : -0.1), rng, hullColors[b % hullColors.length]);
    }
    // Crates and barrels.
    var crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4e2e, roughness: 0.9 });
    for (var k = 0; k < 14; k++) {
      var crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), crateMat);
      crate.position.set(-160 + rng() * 46, 0.8 + (k % 3 === 0 ? 1.6 : 0), 138 + rng() * 14);
      crate.rotation.y = rng() * Math.PI;
      scene.add(crate);
    }
    // Pelican Isle + lighthouse across the bay.
    var isle = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 19, 3, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a2432, roughness: 0.9 })
    );
    isle.position.set(195, 0.6, -40);
    scene.add(isle);
    var light = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.6, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.6 })
    );
    light.position.set(195, 8, -40);
    scene.add(light);
    var beam = new THREE.Mesh(
      new THREE.ConeGeometry(6, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2b0, transparent: true, opacity: 0.14,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    beam.position.set(195, 14, -40);
    beam.rotation.z = Math.PI / 2.4;
    scene.add(beam);
    W.beacon = beam;
    // Bridge to the isle.
    var bridge = new THREE.Mesh(
      new THREE.BoxGeometry(70, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.7 })
    );
    bridge.position.set(175, 1.2, -40);
    scene.add(bridge);
  }

  // --- rain: fast falling streaks in a box that follows the camera ---
  function buildRain(scene) {
    var count = 900;
    var positions = new Float32Array(count * 6);
    var vel = new Float32Array(count);
    var rng = U.mulberry32(7);
    for (var i = 0; i < count; i++) {
      var x = (rng() - 0.5) * 120;
      var y = rng() * 60;
      var z = (rng() - 0.5) * 120;
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x + 0.5;
      positions[i * 6 + 4] = y - 1.6;
      positions[i * 6 + 5] = z + 0.2;
      vel[i] = 42 + rng() * 18;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0x9fb8e8, transparent: true, opacity: 0.5,
    }));
    rain.frustumCulled = false;
    scene.add(rain);
    W.rain = rain;
    W.rainVel = vel;
  }

  // --- the whole city ---
  W.build = function (scene, seed) {
    var rng = U.mulberry32(seed || 1);
    scene.fog = new THREE.FogExp2(C.fogColor, C.fogDensity);
    scene.background = new THREE.Color(C.fogColor);

    // Lighting: bright-ish night so nothing reads as muddy black.
    scene.add(new THREE.AmbientLight(0x8899ff, 0.55));
    var hemi = new THREE.HemisphereLight(0x8090ff, 0x1a1430, 0.85);
    scene.add(hemi);
    var moon = new THREE.DirectionalLight(0xa8b8ff, 0.7);
    moon.position.set(-80, 120, -60);
    scene.add(moon);

    buildSky(scene);
    buildGround(scene);
    buildShops(scene, rng);
    buildLamps(scene);
    buildPalms(scene, rng);
    buildSkyline(scene, rng);
    buildMarina(scene, rng);
    buildRain(scene);

    // City blocks: buildings on the grid, skipping roads and the avenue.
    for (var gx = -160; gx <= 160; gx += C.blockSize) {
      for (var gz = -180; gz <= 180; gz += C.blockSize) {
        if (Math.abs(gx) < 24) continue; // avenue corridor
        if (gz < -150) continue; // skyline zone
        if (gx < -130 && gz > 110) continue; // marina
        if (gx > 130) continue; // bay edge
        if (rng() < 0.18) continue; // empty lot / parking
        var w = 16 + rng() * 12;
        var d = 16 + rng() * 12;
        var h = 10 + rng() * rng() * 34;
        buildBuilding(
          scene,
          gx + U.rand(rng, -4, 4), gz + U.rand(rng, -4, 4),
          w, h, d, Math.floor(rng() * 4), rng
        );
      }
    }
    return W;
  };

  W.update = function (dt, focusX, focusZ, time) {
    // Rain falls and re-centers on the focus point.
    if (W.rain) {
      var pos = W.rain.geometry.attributes.position.array;
      for (var i = 0; i < W.rainVel.length; i++) {
        var fall = W.rainVel[i] * dt;
        pos[i * 6 + 1] -= fall;
        pos[i * 6 + 4] -= fall;
        if (pos[i * 6 + 1] < 0) {
          pos[i * 6 + 1] = 55 + Math.random() * 5;
          pos[i * 6 + 4] = pos[i * 6 + 1] - 1.6;
        }
      }
      W.rain.geometry.attributes.position.needsUpdate = true;
      W.rain.position.x = focusX;
      W.rain.position.z = focusZ;
    }
    // Boats bob gently.
    W.boats.forEach(function (b) {
      b.group.position.y = 0.4 + Math.sin(time * 0.8 + b.phase) * 0.12;
      b.group.rotation.z = Math.sin(time * 0.6 + b.phase) * 0.02;
    });
    // Lighthouse beam sweeps.
    if (W.beacon) W.beacon.rotation.y = time * 0.25;
  };

  // Circle vs building colliders: push a circle out, return hit or null.
  W.collideCircle = function (x, z, r) {
    for (var i = 0; i < W.colliders.length; i++) {
      var c = W.colliders[i];
      var nx = U.clamp(x, c.x - c.hw, c.x + c.hw);
      var nz = U.clamp(z, c.z - c.hd, c.z + c.hd);
      var dx = x - nx, dz = z - nz;
      var d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        var d = Math.sqrt(d2) || 0.001;
        return { x: nx + (dx / d) * r, z: nz + (dz / d) * r, hit: true };
      }
    }
    return null;
  };

  SB.world = W;
})();
