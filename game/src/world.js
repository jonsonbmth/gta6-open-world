// SOLMAR BAY — the city: wet roads, neon shop rows, lamps, palms, marina,
// skyline, sky, rain and lightning. All textures are procedural canvas work.
(function () {
  'use strict';
  var SB = window.SB = window.SB || {};
  var U = SB.utils;

  // --- City layout ------------------------------------------------------------
  var AVENUES = [-80, -40, 0, 40, 80];      // x coords, roads run along Z
  var STREETS = [-80, -40, 0, 40, 80];      // z coords, roads run along X
  var SOLMAR_X = 0;
  var CITY = { x0: -115, x1: 130, z0: -130, z1: 115 };
  var BAY_X = 132;                          // water starts east of here

  var AVENUE_NAMES = { '-80': 'CROWN ROAD', '-40': 'CROWN ROAD', '0': 'SOLMAR AVENUE', '40': 'HARBOUR WAY', '80': 'HARBOUR WAY' };
  var STREET_NAMES = { '-80': 'CANAL STREET', '-40': 'VELA STREET', '0': 'SOLMAR AVENUE', '40': 'MIRAMAR BEACH', '80': 'PALM BOULEVARD' };

  var SHOPS = [
    ['TIDE & DINE', '#ffb84d', 'SEAFOOD'], ['NEON PETALS', '#ff2d95', 'FLOWERS'],
    ['COMET BURGER', '#00e5ff', '24 HOURS'], ['VELA MARKET', '#3dff7a', 'GROCERY'],
    ['LUNA TACOS', '#ffd21f', 'TAQUERIA'], ['ORBIT RECORDS', '#b06fd8', 'VINYL'],
    ['CORAL SUSHI', '#ff6b60', 'SUSHI BAR'], ['PELICAN CAFE', '#7ad9ff', 'COFFEE'],
    ['MIDNIGHT INK', '#ff2d95', 'TATTOO'], ['STARLIGHT MOTEL', '#ffd21f', 'VACANCY'],
    ['AZURE BAR', '#00e5ff', 'COCKTAILS'], ['KOBALT GYM', '#3dff7a', 'OPEN LATE'],
    ['MANGO GROOVE', '#ffb84d', 'JUICE BAR'], ['TURBO WASH', '#7ad9ff', 'CAR WASH'],
    ['SALT & SMOKE', '#ff6b60', 'BBQ'], ['NOVA BOWL', '#b06fd8', 'RAMEN']
  ];

  var ANCHORS = {
    marina: { x: 104, z: 55 }, garage: { x: -40, z: -52 }, velaMarket: { x: -12, z: -40 },
    mamaHouse: { x: -70, z: 20 }, lenaWorkshop: { x: 52, z: -20 }, crownRoad: { x: -40, z: 30 },
    docks: { x: 108, z: 78 }, lighthouse: { x: 118, z: -100 }, plaza: { x: 0, z: 95 },
    safehouse: { x: -90, z: 95 }, palmRow: { x: 0, z: 80 }, miramar: { x: 40, z: 40 }
  };

  function districtAt(x, z) {
    if (x > 100) return 'HARBOUR LIGHTS';
    if (z > 60) return x > 0 ? 'MIRAMAR' : 'CROWN HEIGHTS';
    if (z < -60) return 'PALM ROW';
    if (x < -40 && z < 0) return 'VELA QUARTER';
    if (x > 40 && z < 0) return 'DOCKSIDE';
    if (Math.abs(x) < 9) return 'SOLMAR AVENUE';
    return 'SOLMAR BAY';
  }

  // --- Small geometry helpers ---------------------------------------------------
  function toNonIndexed(geo) { return geo.index ? geo.toNonIndexed() : geo; }
  function paintGeo(geo, hex) {
    var g = toNonIndexed(geo);
    var n = g.attributes.position.count;
    var col = new THREE.Color(hex);
    var arr = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  }
  function mergeGeos(list) {
    var pos = [], norm = [], uv = [], col = [], hasCol = false, hasUv = false;
    list.forEach(function (g) {
      var gg = toNonIndexed(g);
      pos.push(gg.attributes.position.array);
      norm.push(gg.attributes.normal.array);
      if (gg.attributes.uv) { uv.push(gg.attributes.uv.array); hasUv = true; }
      if (gg.attributes.color) { col.push(gg.attributes.color.array); hasCol = true; }
    });
    function cat(arrays, item) {
      var total = 0; arrays.forEach(function (a) { total += a.length; });
      var out = new Float32Array(total), o = 0;
      arrays.forEach(function (a) { out.set(a, o); o += a.length; });
      return new THREE.BufferAttribute(out, item);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', cat(pos, 3));
    geo.setAttribute('normal', cat(norm, 3));
    if (hasUv) geo.setAttribute('uv', cat(uv, 2));
    if (hasCol) geo.setAttribute('color', cat(col, 3));
    return geo;
  }
  function xform(geo, x, y, z, ry, sx, sy, sz) {
    var m = new THREE.Matrix4();
    var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0));
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx || 1, sy || 1, sz || 1));
    var g = geo.clone();
    g.applyMatrix4(m);
    return g;
  }

  // --- Glow points: one draw call for every static glow in the city ------------
  var GLOW_VERT = [
    'attribute float aSize;',
    'attribute vec3 aColor;',
    'varying vec3 vColor;',
    'void main() {',
    '  vColor = aColor;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = aSize * (240.0 / -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var GLOW_FRAG = [
    'varying vec3 vColor;',
    'void main() {',
    '  vec2 d = gl_PointCoord - vec2(0.5);',
    '  float a = smoothstep(0.5, 0.0, length(d));',
    '  a = a * a * 1.6;',
    '  gl_FragColor = vec4(vColor * a, a);',
    '}'
  ].join('\n');

  function GlowSystem() {
    this.pos = []; this.col = []; this.size = [];
  }
  GlowSystem.prototype.add = function (x, y, z, hex, size) {
    var c = new THREE.Color(hex);
    this.pos.push(x, y, z); this.col.push(c.r, c.g, c.b); this.size.push(size);
  };
  GlowSystem.prototype.build = function () {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(this.size, 1));
    var mat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  };

  // --- Road texture -------------------------------------------------------------
  function roadTexture() {
    var c = U.makeCanvas(128, 512), g = c.getContext('2d');
    g.fillStyle = '#12141f'; g.fillRect(0, 0, 128, 512);
    var rng = new U.RNG(7);
    for (var i = 0; i < 900; i++) {
      g.fillStyle = rng.next() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)';
      g.fillRect(rng.next() * 128, rng.next() * 512, 2, 2);
    }
    g.fillStyle = '#c8a83a';
    for (var y = 0; y < 512; y += 64) g.fillRect(62, y + 8, 4, 34);
    g.fillStyle = 'rgba(220,230,255,0.5)';
    g.fillRect(6, 0, 3, 512); g.fillRect(119, 0, 3, 512);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function crosswalkTexture() {
    var c = U.makeCanvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#12141f'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(230,238,255,0.85)';
    for (var x = 6; x < 128; x += 18) g.fillRect(x, 10, 10, 108);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // --- The build ------------------------------------------------------------------
  var state = null;

  function build(scene, opts) {
    opts = opts || {};
    var rng = new U.RNG(opts.seed || 9);
    var glow = new GlowSystem();
    var pools = [];   // {x, z, r, color}
    var streaks = []; // {x, z, len, w, color, ry}
    var beacons = []; // blinking rooftop beacons {mesh, phase}
    var buildings = []; // AABBs for collision {x0, x1, z0, z1}
    var root = new THREE.Group();
    scene.add(root);

    // Ground + fog + sky
    scene.fog = new THREE.FogExp2(0x0d1130, 0.0038);
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshStandardMaterial({ color: 0x0b0e1a, roughness: 0.92, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
    ground.receiveShadow = true;
    root.add(ground);

    var sky = new THREE.Mesh(
      new THREE.SphereGeometry(700, 24, 16),
      new THREE.MeshBasicMaterial({ map: U.skyTexture(), side: THREE.BackSide, fog: false })
    );
    root.add(sky);

    // Stars
    (function () {
      var n = 420, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var a = rng.next() * Math.PI * 2, e = 0.15 + rng.next() * 1.2, r = 640;
        pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
        pos[i * 3 + 1] = Math.sin(e) * r;
        pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var stars = new THREE.Points(g, new THREE.PointsMaterial({
        color: 0xcfe0ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false
      }));
      root.add(stars);
    })();

    // Moon + halo
    var moon = new THREE.Mesh(
      new THREE.CircleGeometry(16, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false })
    );
    moon.position.set(90, 210, 420); moon.lookAt(0, 0, 0);
    root.add(moon);
    glow.add(90, 210, 420, 0xaFC4ff, 90);

    // Lights
    var hemi = new THREE.HemisphereLight(0x2a3566, 0x0a0c18, 0.95);
    scene.add(hemi);
    var moonLight = new THREE.DirectionalLight(0x8fa8ff, 0.9);
    moonLight.position.set(-70, 130, -50);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.left = -130; moonLight.shadow.camera.right = 130;
    moonLight.shadow.camera.top = 130; moonLight.shadow.camera.bottom = -130;
    moonLight.shadow.camera.far = 400;
    moonLight.shadow.bias = -0.0006;
    scene.add(moonLight);
    var warmLamp = new THREE.PointLight(0xffc06a, 60, 46, 1.8);
    warmLamp.position.set(6, 7, 30);
    scene.add(warmLamp);
    // Two more warm pools down Solmar Avenue so the road never goes black.
    [[-6, -52], [6, 84]].forEach(function (p) {
      var l = new THREE.PointLight(0xffc06a, 50, 42, 1.8);
      l.position.set(p[0], 7, p[1]);
      scene.add(l);
    });

    // Roads (wet asphalt: low roughness + metalness for specular streaks)
    var roadTex = roadTexture();
    function roadStrip(x, z, w, len, alongZ) {
      var tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, Math.max(1, Math.round(len / 24)));
      var mat = new THREE.MeshStandardMaterial({
        map: tex, color: 0xffffff, roughness: 0.16, metalness: 0.55
      });
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      m.rotation.x = -Math.PI / 2;
      if (!alongZ) m.rotation.z = Math.PI / 2;
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      root.add(m);
      return m;
    }
    var roadLen = CITY.z1 - CITY.z0 + 30;
    AVENUES.forEach(function (x) {
      roadStrip(x, (CITY.z0 + CITY.z1) / 2, x === SOLMAR_X ? 16 : 12, roadLen, true);
    });
    var roadWid = CITY.x1 - CITY.x0 + 30;
    STREETS.forEach(function (z) {
      roadStrip((CITY.x0 + CITY.x1) / 2, z, 12, roadWid, false);
    });

    // Sidewalks
    var walkMat = new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.85, metalness: 0.05 });
    function walkStrip(x, z, w, len, alongZ) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), walkMat);
      m.rotation.x = -Math.PI / 2;
      if (!alongZ) m.rotation.z = Math.PI / 2;
      m.position.set(x, 0.05, z);
      m.receiveShadow = true;
      root.add(m);
    }
    AVENUES.forEach(function (x) {
      var hw = (x === SOLMAR_X ? 8 : 6) + 1.8;
      walkStrip(x - hw, (CITY.z0 + CITY.z1) / 2, 3.4, roadLen, true);
      walkStrip(x + hw, (CITY.z0 + CITY.z1) / 2, 3.4, roadLen, true);
    });
    STREETS.forEach(function (z) {
      walkStrip((CITY.x0 + CITY.x1) / 2, z - 7.8, 3.4, roadWid, false);
      walkStrip((CITY.x0 + CITY.x1) / 2, z + 7.8, 3.4, roadWid, false);
    });

    // Crosswalks on Solmar Avenue
    var crossTex = crosswalkTexture();
    STREETS.forEach(function (z) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 7),
        new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.5, metalness: 0.1 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(SOLMAR_X, 0.04, z);
      root.add(m);
    });

    // Buildings
    var facades = [];
    for (var f = 0; f < 6; f++) facades.push(U.facadeTextures(100 + f * 13, 12, 8));
    var roofMat = new THREE.MeshStandardMaterial({ color: 0x0d101c, roughness: 0.9 });
    var propMat = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.8 });
    var blockXs = [[-110, -86], [-74, -46], [-34, -8], [8, 34], [46, 74], [86, 108]];
    var blockZs = [[-128, -86], [-74, -46], [-34, -8], [8, 34], [46, 74], [86, 110]];
    blockXs.forEach(function (bx, bi) {
      blockZs.forEach(function (bz, bj) {
        // Marina zone stays open (east blocks, middle rows).
        if (bx[0] >= 86 && bz[0] >= 8 && bz[0] < 86) return;
        var downtown = bz[0] >= 46 && bx[0] >= -74 && bx[0] < 74;
        var count = rng.int(1, 2);
        for (var k = 0; k < count; k++) {
          var w = rng.range(14, bx[1] - bx[0] - 4);
          var d = rng.range(12, bz[1] - bz[0] - 4);
          var h = downtown ? rng.range(26, 58) : rng.range(8, 24);
          var x = rng.range(bx[0] + w / 2 + 1, bx[1] - w / 2 - 1);
          var z = rng.range(bz[0] + d / 2 + 1, bz[1] - d / 2 - 1);
          var fac = facades[rng.int(0, 5)];
          var floors = Math.max(3, Math.round(h / 3.4));
          var tex = U.facadeTextures(200 + bi * 31 + bj * 17 + k * 7, floors, Math.max(4, Math.round(w / 3)));
          var mat = new THREE.MeshStandardMaterial({
            map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff,
            emissiveIntensity: 1.15, roughness: 0.85, metalness: 0.1
          });
          var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          b.position.set(x, h / 2, z);
          b.castShadow = true; b.receiveShadow = true;
          root.add(b);
          buildings.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
          // Roof slab + props
          var roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), roofMat);
          roof.position.set(x, h + 0.25, z);
          root.add(roof);
          var r = rng.next();
          if (r < 0.3) {
            var tank = new THREE.Group();
            var cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10), propMat);
            cyl.position.y = 2.4;
            var cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.4, 10), propMat);
            cone.position.y = 4.4;
            tank.add(cyl); tank.add(cone);
            tank.position.set(x + rng.range(-w / 4, w / 4), h + 0.5, z + rng.range(-d / 4, d / 4));
            root.add(tank);
          } else if (r < 0.6) {
            var ac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), propMat);
            ac.position.set(x + rng.range(-w / 4, w / 4), h + 1.1, z + rng.range(-d / 4, d / 4));
            ac.castShadow = true;
            root.add(ac);
          }
          if (h > 20 && rng.next() < 0.5) {
            var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 5), propMat);
            ant.position.set(x, h + 3.5, z);
            root.add(ant);
            var beacon = new THREE.Mesh(
              new THREE.SphereGeometry(0.5, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0xff2a2a })
            );
            beacon.position.set(x, h + 6.6, z);
            root.add(beacon);
            beacons.push({ mesh: beacon, phase: rng.next() * Math.PI * 2 });
            glow.add(x, h + 6.6, z, 0xff2a2a, 14);
          }
        }
      });
    });

    // Shops along Solmar Avenue — neon on BOTH sides, full span so the chase
    // camera always sees signs ahead.
    var shopBoxGeo = new THREE.BoxGeometry(7, 5.5, 9);
    var awnGeo = new THREE.PlaneGeometry(8.6, 2.2);
    var winGeo = new THREE.PlaneGeometry(6, 2.2);
    var winGeos = [];
    var shopMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 });
    var shopIdx = 0;
    [-1, 1].forEach(function (side) {
      for (var z = -112; z <= 98; z += 14) {
        var shop = SHOPS[shopIdx % SHOPS.length]; shopIdx++;
        var x = side * 12.6;
        var facing = side > 0 ? -Math.PI / 2 : Math.PI / 2; // sign faces the road
        // Box + awning merged with vertex colours.
        var boxG = paintGeo(shopBoxGeo, 0x1a1e2e);
        var awn = new THREE.BoxGeometry(2.4, 0.12, 8.6);
        awn.rotateZ(side * 0.35); // slope down toward the road
        var awnG = paintGeo(awn, new THREE.Color(shop[1]).multiplyScalar(0.55).getHex());
        var parts = [
          xform(boxG, x, 2.75, z, 0),
          xform(awnG, x - side * 3.9, 4.15, z, 0)
        ];
        var shopMesh = new THREE.Mesh(mergeGeos(parts), shopMat);
        shopMesh.castShadow = true; shopMesh.receiveShadow = true;
        root.add(shopMesh);
        // Neon sign (always bright) + glow + pool + streak.
        var sign = new THREE.Mesh(
          new THREE.PlaneGeometry(7.6, 1.9),
          new THREE.MeshBasicMaterial({ map: U.signTexture(shop[0], shop[1], shop[2]), toneMapped: false })
        );
        sign.position.set(x - side * 3.55, 4.6, z);
        sign.rotation.y = facing;
        root.add(sign);
        glow.add(x - side * 4.4, 4.6, z, shop[1], 16);
        // Lit window (merged later into one mesh).
        var wg = winGeo.clone();
        wg.rotateY(facing);
        winGeos.push(xform(wg, x - side * 3.56, 1.9, z, 0));
        // Light pool + reflection streak on the road.
        pools.push({ x: x - side * 5.5, z: z, r: 5.5, color: shop[1] });
        streaks.push({ x: x - side * 6.5, z: z, len: 11, w: 1.6, color: shop[1], ry: 0 });
      }
    });
    var winMesh = new THREE.Mesh(
      mergeGeos(winGeos),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })
    );
    root.add(winMesh);

    // Street lamps (poles + heads merged; light via pools/streaks/glow points).
    var poleGeos = [], headGeos = [];
    var poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 7, 6);
    var armGeo = new THREE.BoxGeometry(2.4, 0.18, 0.18);
    var headGeo = new THREE.BoxGeometry(0.9, 0.28, 0.5);
    // Lamp arm reaches over the road: dirX = +1 on the west side, -1 on the east.
    function lamp(x, z, dirX) {
      poleGeos.push(xform(poleGeo, x, 3.5, z, 0));
      poleGeos.push(xform(armGeo, x + dirX * 1.1, 6.9, z, 0));
      headGeos.push(xform(headGeo, x + dirX * 2.1, 6.85, z, 0));
      glow.add(x + dirX * 2.1, 6.8, z, 0xffc06a, 13);
      pools.push({ x: x + dirX * 2.4, z: z, r: 6, color: 0xffc06a });
      streaks.push({ x: x + dirX * 2.4, z: z, len: 9, w: 1.4, color: 0xffc06a, ry: 0 });
    }
    for (var lz = -120; lz <= 104; lz += 16) {
      lamp(-9.6, lz, 1); lamp(9.6, lz, -1);
    }
    [-40, 40, -80, 80].forEach(function (ax) {
      [-40, 0, 40, 80].forEach(function (sz) { lamp(ax + 7, sz, -1); });
    });
    var poleMesh = new THREE.Mesh(mergeGeos(poleGeos),
      new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.6, metalness: 0.7 }));
    poleMesh.castShadow = true;
    root.add(poleMesh);
    root.add(new THREE.Mesh(mergeGeos(headGeos),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })));

    // Palms (silhouettes framing the avenue).
    var trunkGeos = [], frondGeos = [];
    var trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 6.4, 7);
    var frondGeo = new THREE.PlaneGeometry(0.55, 3.4, 1, 3);
    // Bend the frond: tip droops down.
    (function () {
      var p = frondGeo.attributes.position;
      for (var i = 0; i < p.count; i++) {
        var y = p.getY(i);
        var t = (y + 1.7) / 3.4;
        p.setZ(i, -t * t * 1.1);
      }
      frondGeo.computeVertexNormals();
    })();
    for (var pz = -110; pz <= 100; pz += 22) {
      [-10.4, 10.4].forEach(function (px) {
        var lean = rng.range(-0.08, 0.08);
        var tg = trunkGeo.clone();
        tg.rotateZ(lean);
        trunkGeos.push(xform(tg, px, 3.2, pz + rng.range(-2, 2), 0));
        var topY = 6.3, topX = px + lean * -6;
        for (var fi = 0; fi < 7; fi++) {
          var fg = frondGeo.clone();
          fg.rotateX(-Math.PI / 2 + rng.range(0.5, 0.9));
          fg.rotateY((fi / 7) * Math.PI * 2 + rng.next());
          frondGeos.push(xform(fg, topX, topY, pz, 0));
        }
      });
    }
    var trunkMesh = new THREE.Mesh(mergeGeos(trunkGeos),
      new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.95 }));
    trunkMesh.castShadow = true;
    root.add(trunkMesh);
    root.add(new THREE.Mesh(mergeGeos(frondGeos),
      new THREE.MeshStandardMaterial({ color: 0x0d2a18, roughness: 0.95, side: THREE.DoubleSide })));

    // Marina + bay (east edge).
    var water = new THREE.Mesh(
      new THREE.PlaneGeometry(380, 460),
      new THREE.MeshStandardMaterial({ color: 0x0a1e38, roughness: 0.08, metalness: 0.85 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(132 + 190, 0.0, 0);
    root.add(water);
    glow.add(200, 2, 20, 0x8fb8ff, 60); // moon streak on the water

    var quayMat = new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.85 });
    var quay = new THREE.Mesh(new THREE.BoxGeometry(26, 1.1, 84), quayMat);
    quay.position.set(114, 0.5, 55);
    quay.receiveShadow = true; quay.castShadow = true;
    root.add(quay);
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3421, roughness: 0.9 });
    [30, 55, 80].forEach(function (dz) {
      var pier = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 2.6), woodMat);
      pier.position.set(122, 0.55, dz);
      pier.castShadow = true;
      root.add(pier);
      for (var mx = 116; mx <= 128; mx += 4) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 6), woodMat);
        post.position.set(mx, 0.9, dz + 1.5);
        root.add(post);
      }
    });
    // Boats: extruded hull + cabin + mast + warm light.
    function boat(x, z, ry, hullColor) {
      var g = new THREE.Group();
      var shape = new THREE.Shape();
      shape.moveTo(-3.4, 0); shape.lineTo(3.4, 0); shape.lineTo(2.4, 1.1);
      shape.lineTo(-2.4, 1.1); shape.closePath();
      var hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2 });
      hullGeo.rotateY(Math.PI / 2);
      hullGeo.translate(0, 0.4, 0);
      var hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.35, metalness: 0.3 }));
      hull.castShadow = true;
      g.add(hull);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.5 }));
      cabin.position.set(0, 1.7, -0.3);
      g.add(cabin);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4, 5), propMat);
      mast.position.set(0, 3.6, 0.6);
      g.add(mast);
      var lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe9b0, toneMapped: false }));
      lampMesh.position.set(0, 1.9, 1.6);
      g.add(lampMesh);
      g.position.set(x, 0.1, z);
      g.rotation.y = ry;
      root.add(g);
      glow.add(x, 2.2, z, 0xffe9b0, 10);
    }
    boat(120, 26, 0.2, 0x1e5fa8); boat(121, 48, -0.15, 0xa8232a); boat(119, 62, 0.1, 0x1e8a5a);
    boat(122, 74, 0.3, 0xe8e4da); boat(120, 88, -0.2, 0x2a6f8e);
    // Crates + marina lamps.
    var crateMat = new THREE.MeshStandardMaterial({ color: 0x6a4a26, roughness: 0.9 });
    [[106, 34], [107.5, 34], [106.5, 35.5], [105, 70], [106.5, 70], [103, 44]].forEach(function (p, i) {
      var crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), crateMat);
      crate.position.set(p[0], 1.7 + (i % 2) * 0.1, p[1]);
      crate.rotation.y = rng.next();
      crate.castShadow = true;
      root.add(crate);
    });
    [26, 55, 84].forEach(function (mz) {
      var mpole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.6, metalness: 0.7 }));
      mpole.position.set(104, 1.1 + 3.5, mz);
      mpole.castShadow = true;
      root.add(mpole);
      var mhead = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }));
      mhead.position.set(104, 8.0, mz);
      root.add(mhead);
      glow.add(104, 8.0, mz, 0xffc06a, 14);
      pools.push({ x: 104, z: mz, r: 7, color: 0xffc06a });
    });
    // Real light over the quay staging area (z=40, between the lamp poles)
    // so the marina shot isn't a black void.
    var marinaLight = new THREE.PointLight(0xffc06a, 55, 40, 1.8);
    marinaLight.position.set(106, 6.5, 40);
    scene.add(marinaLight);

    // Lighthouse (far north-east).
    (function () {
      var g = new THREE.Group();
      for (var i = 0; i < 5; i++) {
        var seg = new THREE.Mesh(
          new THREE.CylinderGeometry(2.2 - i * 0.18, 2.4 - i * 0.18, 3.4, 12),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0xb03030 : 0xe8e4da, roughness: 0.6 })
        );
        seg.position.y = 1.7 + i * 3.4;
        g.add(seg);
      }
      var lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0, toneMapped: false }));
      lampRoom.position.y = 18.4;
      g.add(lampRoom);
      var cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.6, 10), propMat);
      cap.position.y = 20.2;
      g.add(cap);
      g.position.set(118, 0, -100);
      root.add(g);
      glow.add(118, 18.4, -100, 0xfff2b0, 30);
    })();

    // Light pools (one instanced mesh) and reflection streaks (one instanced mesh).
    var poolTex = U.poolTexture();
    var poolGeo = new THREE.CircleGeometry(1, 20);
    poolGeo.rotateX(-Math.PI / 2);
    var poolMat = new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: 0.55, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false
    });
    var poolMesh = new THREE.InstancedMesh(poolGeo, poolMat, pools.length);
    var m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sc = new THREE.Vector3();
    pools.forEach(function (p, i) {
      m4.compose(new THREE.Vector3(p.x, 0.06, p.z), q0, sc.set(p.r, 1, p.r));
      poolMesh.setMatrixAt(i, m4);
      poolMesh.setColorAt(i, new THREE.Color(p.color));
    });
    poolMesh.instanceMatrix.needsUpdate = true;
    if (poolMesh.instanceColor) poolMesh.instanceColor.needsUpdate = true;
    root.add(poolMesh);

    var streakTex = U.streakTexture();
    var streakGeo = new THREE.BufferGeometry();
    (function () {
      // Quad in XZ, bright end (v=1) at z=0 fading to z=10.
      var pos = new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 10, -0.5, 0, 10]);
      var uv = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
      var norm = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
      streakGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      streakGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      streakGeo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      streakGeo.setIndex([0, 1, 2, 0, 2, 3]);
    })();
    var streakMat = new THREE.MeshBasicMaterial({
      map: streakTex, transparent: true, opacity: 0.6, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide
    });
    var streakMesh = new THREE.InstancedMesh(streakGeo, streakMat, streaks.length);
    streaks.forEach(function (s, i) {
      var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.ry || 0, 0));
      m4.compose(new THREE.Vector3(s.x, 0.05, s.z), q, sc.set(s.w, 1, s.len / 10));
      streakMesh.setMatrixAt(i, m4);
      streakMesh.setColorAt(i, new THREE.Color(s.color));
    });
    streakMesh.instanceMatrix.needsUpdate = true;
    if (streakMesh.instanceColor) streakMesh.instanceColor.needsUpdate = true;
    root.add(streakMesh);

    // Static glow points.
    root.add(glow.build());

    // Rain (follows the camera).
    var RAIN_N = 1400;
    var rainPos = new Float32Array(RAIN_N * 3);
    for (var ri = 0; ri < RAIN_N; ri++) {
      rainPos[ri * 3] = rng.range(-50, 50);
      rainPos[ri * 3 + 1] = rng.range(0, 55);
      rainPos[ri * 3 + 2] = rng.range(-50, 50);
    }
    var rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    var rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
      map: U.rainTexture(), size: 1.7, transparent: true, opacity: 0.55,
      depthWrite: false, color: 0xaec6ff, sizeAttenuation: true
    }));
    rain.frustumCulled = false;
    scene.add(rain);

    state = {
      root: root, rain: rain, rainPos: rainPos, rainN: RAIN_N,
      beacons: beacons, hemi: hemi, moonLight: moonLight,
      buildings: buildings,
      lightningAt: 8 + Math.random() * 10, flash: 0, rng: rng
    };
    return state;
  }

  function update(dt, t, camera, frozen) {
    if (!state) return;
    // Rain falls and wraps inside a box around the camera.
    var pos = state.rainPos;
    for (var i = 0; i < state.rainN; i++) {
      pos[i * 3 + 1] -= 52 * dt;
      pos[i * 3] += 7 * dt;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 55;
        pos[i * 3] = (Math.random() - 0.5) * 100;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }
    state.rain.geometry.attributes.position.needsUpdate = true;
    if (camera) {
      state.rain.position.set(camera.position.x, 0, camera.position.z);
    }
    // Rooftop beacons blink.
    state.beacons.forEach(function (b) {
      b.mesh.visible = (Math.sin(t * 2.2 + b.phase) > 0);
    });
    // Lightning: rare distant flash, never while a shot is frozen.
    if (!frozen) {
      state.lightningAt -= dt;
      if (state.lightningAt <= 0) {
        state.flash = 0.16;
        state.lightningAt = 9 + Math.random() * 14;
      }
    }
    if (state.flash > 0) {
      state.flash -= dt;
      var k = Math.max(0, state.flash / 0.16);
      state.moonLight.intensity = 0.9 + k * 2.4;
      state.hemi.intensity = 0.95 + k * 0.9;
    } else {
      state.moonLight.intensity = 0.9;
      state.hemi.intensity = 0.95;
    }
  }

  SB.world = {
    build: build, update: update, districtAt: districtAt,
    AVENUES: AVENUES, STREETS: STREETS, SOLMAR_X: SOLMAR_X,
    CITY: CITY, BAY_X: BAY_X, ANCHORS: ANCHORS,
    AVENUE_NAMES: AVENUE_NAMES, STREET_NAMES: STREET_NAMES, SHOPS: SHOPS
  };
})();
