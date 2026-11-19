// The city of Solmar Bay: streets, buildings, neon shops, palms, lamps,
// skyline, marina, rain and the wet-road reflections that sell the night look.

import { CFG, SHOPS, NEON_COLORS } from './config.js';
import { mulberry32, glowTexture, streakTexture } from './utils.js';
import { facadeTexture, signTexture, roadTexture } from './textures.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function skyDome(scene) {
  const geo = new THREE.SphereGeometry(420, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(CFG.skyTop) },
      horizon: { value: new THREE.Color(CFG.skyHorizon) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
      void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.18, 0.0, 1.0);
      vec3 c = mix(horizon, top, pow(h, 0.8));
      c += vec3(0.10, 0.05, 0.12) * pow(1.0 - abs(normalize(vP).y), 3.0);
      gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
}

function rainField(scene) {
  const N = 900;
  const pos = new Float32Array(N * 6);
  const rnd = mulberry32(99);
  for (let i = 0; i < N; i++) {
    const x = (rnd() - 0.5) * 160, y = rnd() * 55, z = 40 - rnd() * 300;
    pos.set([x, y, z, x - 0.35, y - 1.1, z], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x9db4ff, transparent: true, opacity: 0.45 });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  scene.add(lines);
  return {
    mesh: lines,
    update(dt) {
      const a = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const o = i * 6;
        a[o + 1] -= 34 * dt;
        a[o + 4] -= 34 * dt;
        a[o] -= 2.2 * dt;
        a[o + 3] -= 2.2 * dt;
        if (a[o + 4] < 0) {
          const nx = (Math.random() - 0.5) * 160, nz = 40 - Math.random() * 300;
          a[o] = nx; a[o + 1] = 50 + Math.random() * 5; a[o + 2] = nz;
          a[o + 3] = nx - 0.35; a[o + 4] = a[o + 1] - 1.1; a[o + 5] = nz;
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// A soft additive streak on the road under a light — the fake wet reflection.
function addStreak(scene, x, z, color, len = 7, width = 1.4, opacity = 0.55) {
  const tex = streakTexture(color);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, len), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.PI; // fade runs away from the light
  m.position.set(x, 0.03, z + len / 2 - 0.5);
  scene.add(m);
  return m;
}

function glowSprite(color, scale) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale, scale, 1);
  return s;
}

function palmTree(rnd) {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 5.2, 6), bark);
  trunk.position.y = 2.6;
  trunk.rotation.z = (rnd() - 0.5) * 0.22;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x0d2818, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.4, 4), leafMat);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.1, 5.4, Math.sin(a) * 1.1);
    frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    frond.scale.set(1, 1, 0.18);
    g.add(frond);
  }
  return g;
}

function streetLamp(glow) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 6), poleMat);
  pole.position.y = 3.2;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMat);
  arm.position.set(0.7, 6.3, 0);
  g.add(arm);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc46b }),
  );
  bulb.position.set(1.4, 6.2, 0);
  g.add(bulb);
  const s = glowSprite('#ffb85c', 2.2);
  s.position.copy(bulb.position);
  g.add(s);
  return g;
}

function makeBuilding(type, w, h, d, seed) {
  const rnd = mulberry32(seed);
  let mat;
  if (type === 'shop') {
    const f = facadeTexture({ cols: 5, rows: 2, lit: 0.8, seed, warm: '#ffd27a' });
    mat = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.85 });
  } else if (type === 'apartment') {
    const f = facadeTexture({ cols: 6, rows: Math.max(4, Math.round(h / 3)), lit: 0.5, seed });
    mat = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.9 });
  } else if (type === 'tower') {
    const f = facadeTexture({ cols: 10, rows: Math.max(10, Math.round(h / 2.4)), lit: 0.42, seed, warm: '#ffe9a8', cool: '#8fd8ff' });
    mat = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.75, roughness: 0.9 });
  } else { // warehouse
    mat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.85, metalness: 0.2 });
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.y = h / 2;
  // rooftop details on taller blocks
  if (type === 'apartment' || type === 'tower') {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.3, 1.2, d * 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.9 }),
    );
    roof.position.set((rnd() - 0.5) * w * 0.4, h + 0.6, (rnd() - 0.5) * d * 0.4);
    mesh.add(roof);
    if (type === 'tower' && rnd() < 0.6) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3344 }),
      );
      beacon.position.set(0, h + 1.6, 0);
      mesh.add(beacon);
      const gs = glowSprite('#ff3344', 2.4);
      gs.position.copy(beacon.position);
      mesh.add(gs);
    }
  }
  return mesh;
}

function boatHull(color) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-3.2, 0);
  shape.lineTo(-2.2, 0.9);
  shape.lineTo(2.2, 0.9);
  shape.lineTo(3.2, 0);
  shape.lineTo(2.2, -0.5);
  shape.lineTo(-2.2, -0.5);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false });
  geo.translate(0, 0, -0.8);
  const hull = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3 }));
  hull.rotation.y = Math.PI / 2;
  g.add(hull);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.9, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.5 }),
  );
  cabin.position.y = 1.1;
  g.add(cabin);
  const lamp = glowSprite('#ffd27a', 2.2);
  lamp.position.set(0, 1.8, 0);
  g.add(lamp);
  return g;
}

export function buildWorld(scene) {
  const rnd = mulberry32(20261119);
  const stats = { signs: 0, buildings: 0, palms: 0, lamps: 0 };
  scene.background = new THREE.Color(CFG.fogColor);
  scene.fog = new THREE.FogExp2(CFG.fogColor, CFG.fogDensity);
  skyDome(scene);

  // base lights: dim blue hemisphere + faint moon directional + warm ambient lift
  // (kept bright enough that the hero car and road read clearly, never murky)
  scene.add(new THREE.HemisphereLight(0x33406e, 0x0a0c18, 1.35));
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.6);
  moon.position.set(-40, 80, 30);
  scene.add(moon);
  scene.add(new THREE.AmbientLight(0x2a2a44, 0.95));

  // warm street glow along the chase stretch of the avenue — lifts the road
  // and the cars so the night reads bright, not black
  for (const z of [2, -20, -40]) {
    const streetGlow = new THREE.PointLight(0xffc46b, 55, 36, 1.6);
    streetGlow.position.set(0, 6.5, z);
    scene.add(streetGlow);
  }

  // ground slab (dark city floor)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: 0x0d0f16, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, -0.05, -90);
  scene.add(ground);

  // avenue road (wet asphalt: low roughness + high metalness + fake streaks)
  const roadTex = roadTexture();
  roadTex.repeat.set(1, 22);
  const avenue = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 340),
    new THREE.MeshStandardMaterial({ map: roadTex, color: 0xbfc6dd, roughness: 0.16, metalness: 0.62 }),
  );
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, 0.01, -90);
  scene.add(avenue);

  // cross streets
  const crossMat = new THREE.MeshStandardMaterial({ color: 0x141724, roughness: 0.2, metalness: 0.55 });
  for (const z of CFG.crossStreets) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(128, 10), crossMat);
    c.rotation.x = -Math.PI / 2;
    c.position.set(0, 0.01, z);
    scene.add(c);
  }

  // sidewalks along the avenue
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x232635, roughness: 0.6, metalness: 0.2 });
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 340), walkMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(side * 9.2, 0.02, -90);
    scene.add(w);
  }

  // bay water (east)
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 420),
    new THREE.MeshStandardMaterial({ color: 0x0a2038, roughness: 0.08, metalness: 0.85 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(150, 0.0, -90);
  scene.add(water);

  // ---- shop rows along the avenue: neon signs span the FULL street length ----
  const signGeo = new THREE.PlaneGeometry(4.6, 1.15);
  let shopIdx = 0;
  for (const side of [-1, 1]) {
    for (let z = 26; z >= -168; z -= 8.5) {
      // skip cross-street gaps
      if (CFG.crossStreets.some((cz) => Math.abs(z - cz) < 7)) continue;
      const name = SHOPS[shopIdx % SHOPS.length];
      const color = NEON_COLORS[shopIdx % NEON_COLORS.length];
      shopIdx++;
      const x = side * 11.6;
      // shop box
      const shop = makeBuilding('shop', 5.5, 4.2 + rnd() * 2.4, 7.5, 100 + shopIdx);
      shop.position.set(x + side * 2.2, 0, z);
      scene.add(shop);
      stats.buildings++;
      // neon sign facing the avenue
      const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({
        map: signTexture(name, color), transparent: false,
      }));
      sign.position.set(x - side * 0.6, 3.6, z);
      sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(sign);
      const gs = glowSprite(color, 4.2);
      gs.position.set(x - side * 1.0, 3.6, z);
      scene.add(gs);
      // wet reflection streak on the road under the sign
      addStreak(scene, side * (4 + rnd() * 3), z, color, 6 + rnd() * 3, 1.2, 0.4);
      // lit shop window
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 1.7),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.32) }),
      );
      win.position.set(x - side * 0.55, 1.5, z);
      win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(win);
      stats.signs++;
    }
  }

  // extra wet-reflection streaks on the chase stretch (z +10..-60) so the
  // road in front of the camera reads glossy, not matte black
  const chaseStreaks = [
    [-3.2, 6, '#ff2d95'], [3.6, -2, '#00e5ff'], [-2.6, -10, '#ffd23f'],
    [2.8, -16, '#ff2222'], [-3.8, -24, '#2266ff'], [3.2, -34, '#ff2d95'],
    [-2.4, -44, '#00e5ff'], [3.8, -52, '#ffd23f'],
  ];
  for (const [sx, sz, sc] of chaseStreaks) addStreak(scene, sx, sz, sc, 8, 1.6, 0.5);

  // ---- mid blocks: apartments + towers behind the shops ----
  const blockRows = [
    { z0: -34, z1: -84 }, { z0: -96, z1: -134 }, { z0: -146, z1: -184 }, { z0: -196, z1: -224 },
  ];
  for (const row of blockRows) {
    for (const side of [-1, 1]) {
      const n = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const z = row.z0 - ((row.z0 - row.z1) * (i + 0.5)) / n + (rnd() - 0.5) * 3;
        const x = side * (20 + rnd() * 26);
        if (side > 0 && x > 54) continue; // keep the marina clear
        const tower = rnd() < 0.3;
        const h = tower ? 34 + rnd() * 30 : 12 + rnd() * 14;
        const b = makeBuilding(tower ? 'tower' : 'apartment', 10 + rnd() * 8, h, 10 + rnd() * 8, 500 + stats.buildings);
        b.position.set(x, 0, z);
        scene.add(b);
        stats.buildings++;
      }
    }
  }

  // ---- far skyline (north + west), silhouettes with lit windows ----
  for (let i = 0; i < 16; i++) {
    const x = -90 + i * 13 + rnd() * 6;
    const h = 40 + rnd() * 55;
    const t = makeBuilding('tower', 11 + rnd() * 6, h, 11, 900 + i);
    t.position.set(x, 0, -252 - rnd() * 18);
    scene.add(t);
    stats.buildings++;
  }
  for (let i = 0; i < 8; i++) {
    const z = 40 - i * 38 - rnd() * 10;
    const h = 30 + rnd() * 40;
    const t = makeBuilding('tower', 11, h, 11, 950 + i);
    t.position.set(-88 - rnd() * 10, 0, z);
    scene.add(t);
    stats.buildings++;
  }

  // ---- palms + lamps along the avenue ----
  for (let z = 34; z >= -220; z -= 17) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.82) {
        const p = palmTree(rnd);
        p.position.set(side * 8.6, 0, z + (rnd() - 0.5) * 4);
        scene.add(p);
        stats.palms++;
      }
      const lamp = streetLamp();
      lamp.position.set(side * 8.2, 0, z + 8);
      lamp.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(lamp);
      stats.lamps++;
      addStreak(scene, side * 5.5, z + 8, '#ffb85c', 5.5, 1.0, 0.32);
    }
  }

  // ---- marina: quay, docks, boats, lamps ----
  const quayMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3c, roughness: 0.5, metalness: 0.3 });
  const quay = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 52), quayMat);
  quay.position.set(58, 0.4, -18);
  scene.add(quay);
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.9 });
  const boatColors = [0x2a6cff, 0xe62129, 0x39ff8e, 0xd8a13c, 0x8a5cff];
  for (let i = 0; i < 5; i++) {
    const z = -38 + i * 10;
    const dock = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 1.6), dockMat);
    dock.position.set(68, 0.55, z);
    scene.add(dock);
    const boat = boatHull(boatColors[i]);
    boat.position.set(72 + (i % 2) * 4, 0.2, z + 2.5);
    boat.rotation.y = (rnd() - 0.5) * 0.4;
    scene.add(boat);
    // dock lamp
    const lamp = glowSprite('#ffd27a', 2.6);
    lamp.position.set(72, 1.6, z);
    scene.add(lamp);
  }
  // marina warehouse
  const wh = makeBuilding('warehouse', 12, 7, 16, 77);
  wh.position.set(50, 0, -44);
  scene.add(wh);
  stats.buildings++;

  // marina point lights (brighten the on-foot shot)
  const marinaLights = [];
  for (const [x, z] of [[54, -6], [54, -30]]) {
    const pl = new THREE.PointLight(0xffc46b, 60, 26, 1.8);
    pl.position.set(x, 5, z);
    scene.add(pl);
    marinaLights.push(pl);
    const gs = glowSprite('#ffc46b', 3);
    gs.position.set(x, 5, z);
    scene.add(gs);
  }

  const rain = rainField(scene);

  // billboard on a tower near the chase street (original ad)
  const bb = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 5),
    new THREE.MeshBasicMaterial({ map: signTexture('SOLMAR BAY NIGHTS', '#00e5ff', { w: 1024, h: 256 }) }),
  );
  bb.position.set(-14, 18, -120);
  bb.rotation.y = Math.PI / 2;
  scene.add(bb);
  const bbGlow = glowSprite('#00e5ff', 9);
  bbGlow.position.set(-13.4, 18, -120);
  scene.add(bbGlow);

  return {
    stats,
    marinaLights,
    update(dt) {
      rain.update(dt);
    },
  };
}
