// SOLMAR BAY city: varied buildings, dense streets, marina, sea, sky.
// Everything procedural from a seed — no model files.
import { CITY, STREET_X, STREET_Z, ROAD_HALF, SEA_X, BEACH_X, DISTRICTS, LANDMARKS, CHECKPOINTS, PALETTE, SHOP_SIGNS } from './config.js';
import { facadeTexture, roadTexture, sidewalkTexture, signTexture, glowTexture, poolTexture, sandTexture, seaTexture } from './textures.js';
import { clamp } from './random.js';

const THREE = window.THREE;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
}

export function buildWorld(scene, rng) {
  const world = {
    colliders: [], // {x0,z0,x1,z1} axis-aligned building footprints
    obstacles: [], // {x,z,r} round obstacles (palms, lamps, poles)
    checkpoints: CHECKPOINTS.map((c) => ({ ...c })),
    spawn: { x: 240, z: -80, angle: Math.PI }, // on the z=-80 street, facing east
    marina: { x: 340, z: 220 },
    beacons: [],
    seaMesh: null,
    sunPos: new THREE.Vector3(-420, 320, -260),
  };

  // ---- sky: clean gradient dome (no clouds, no artefacts) ----
  const skyGeo = new THREE.SphereGeometry(1100, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(0xf7b26a) },
      bot: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      // The visible sky only spans h ~ 0..0.35 from a street-level camera
      // (the camera looks slightly down), so the blue top must start low —
      // otherwise the whole sky reads as one flat orange band.
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.30, h)) : mix(bot, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Sun: a proper disc with a soft glow sprite — no pillar, no blobs.
  const sunDir = new THREE.Vector3(PALETTE.sunDir.x, PALETTE.sunDir.y, PALETTE.sunDir.z).normalize();
  const sunPos = sunDir.clone().multiplyScalar(950);
  world.sunPos.copy(sunPos);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false, transparent: true, opacity: 0.98 }),
  );
  sunDisc.position.copy(sunPos);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,220,140,0.9)', 'rgba(255,220,140,0)'),
    transparent: true, opacity: 0.85, fog: false, depthWrite: false,
  }));
  sunGlow.scale.set(180, 180, 1);
  sunGlow.position.copy(sunPos);
  scene.add(sunGlow);
  // Exposed so the game can hide the sun when it is behind the camera:
  // a Sprite behind the camera smears across the whole screen.
  world.sunDisc = sunDisc;
  world.sunGlow = sunGlow;

  // ---- lights ----
  const sun = new THREE.DirectionalLight(PALETTE.sunColor, 2.6);
  sun.position.copy(sunDir).multiplyScalar(420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 1200;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 0.85));
  scene.fog = new THREE.FogExp2(PALETTE.fog, PALETTE.fogDensity);

  // ---- ground: one big sidewalk-coloured base, roads on top ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 900),
    new THREE.MeshStandardMaterial({ map: sidewalkTexture(rng), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(40, 0, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- roads (with lane dashes + crosswalks) ----
  const roadMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.18 });
  const roadGeoX = new THREE.PlaneGeometry(CITY.maxZ - CITY.minZ + 80, ROAD_HALF * 2);
  const roadGeoZ = new THREE.PlaneGeometry(CITY.maxX - CITY.minX + 80, ROAD_HALF * 2);
  for (const x of STREET_X) {
    const tex = roadTexture(CITY.maxZ - CITY.minZ, rng);
    const m = new THREE.Mesh(roadGeoX, roadMat.clone());
    m.material.map = tex;
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.PI / 2;
    m.position.set(x, 0.02, 0);
    m.receiveShadow = true;
    scene.add(m);
  }
  for (const z of STREET_Z) {
    const tex = roadTexture(CITY.maxX - CITY.minX, rng);
    const m = new THREE.Mesh(roadGeoZ, roadMat.clone());
    m.material.map = tex;
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.02, z);
    m.receiveShadow = true;
    scene.add(m);
  }

  // ---- blocks: raised sidewalk slabs between streets ----
  const blockMat = new THREE.MeshStandardMaterial({ map: sidewalkTexture(rng), roughness: 0.95 });
  for (let ix = 0; ix < STREET_X.length - 1; ix++) {
    for (let iz = 0; iz < STREET_Z.length - 1; iz++) {
      const x0 = STREET_X[ix] + ROAD_HALF + 1;
      const x1 = STREET_X[ix + 1] - ROAD_HALF - 1;
      const z0 = STREET_Z[iz] + ROAD_HALF + 1;
      const z1 = STREET_Z[iz + 1] - ROAD_HALF - 1;
      if (x1 - x0 < 20 || z1 - z0 < 20) continue;
      const block = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0), blockMat);
      block.position.set((x0 + x1) / 2, 0.15, (z0 + z1) / 2);
      block.receiveShadow = true;
      scene.add(block);
    }
  }

  // ---- buildings: 4 types, varied heights, textured facades ----
  const facadeCache = new Map();
  function facade(base, glass, floors, cols) {
    const key = `${base}|${glass}|${floors}|${cols}`;
    if (!facadeCache.has(key)) facadeCache.set(key, facadeTexture(base, glass, rng, floors, cols));
    return facadeCache.get(key);
  }
  const signCache = new Map();
  function signMat(text) {
    if (!signCache.has(text)) {
      const bg = rng.pick(['#c81e3a', '#14532d', '#1e3a8a', '#7c2d12', '#0f766e', '#a16207']);
      signCache.set(text, new THREE.MeshBasicMaterial({ map: signTexture(text, bg, '#ffffff') }));
    }
    return signCache.get(text);
  }

  function addBuilding(cx, cz, w, d, h, type) {
    const g = new THREE.Group();
    const base = rng.pick(PALETTE.buildingBase);
    const glass = rng.pick(PALETTE.glass);
    const floors = clamp(Math.round(h / 4.5), 3, 14);
    const cols = clamp(Math.round(Math.max(w, d) / 6), 3, 7);
    const f = facade(base, glass, floors, cols);
    const wall = mat(0xffffff, { map: f, roughness: 0.9 });
    if (type === 'cylinder') {
      const r = Math.min(w, d) / 2;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 20), wall);
      tower.position.y = h / 2;
      tower.castShadow = true; tower.receiveShadow = true;
      g.add(tower);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.8, 3, 20), mat('#8a7a6a'));
      crown.position.y = h + 1.5;
      g.add(crown);
    } else if (type === 'pyramid') {
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        const sc = 1 - (s / steps) * 0.55;
        const sh = h / steps;
        const box = new THREE.Mesh(new THREE.BoxGeometry(w * sc, sh, d * sc), wall);
        box.position.y = sh / 2 + s * sh;
        box.castShadow = true; box.receiveShadow = true;
        g.add(box);
      }
      const tip = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.22, 4, 4), mat('#b8a888'));
      tip.position.y = h + 2;
      tip.rotation.y = Math.PI / 4;
      g.add(tip);
    } else if (type === 'setback') {
      let y = 0; let sw = w; let sd = d;
      const tiers = rng.int(2, 3);
      for (let s = 0; s < tiers; s++) {
        const sh = h / tiers;
        const box = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), wall);
        box.position.y = y + sh / 2;
        box.castShadow = true; box.receiveShadow = true;
        g.add(box);
        y += sh; sw *= 0.72; sd *= 0.72;
      }
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10), mat('#7a6a5a'));
      tank.position.set(w * 0.18, y + 1.3, d * 0.15);
      g.add(tank);
    } else {
      // slab, with a set-back rooftop box
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
      tower.position.y = h / 2;
      tower.castShadow = true; tower.receiveShadow = true;
      g.add(tower);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 2.4, d * 0.5), mat('#8a7a6a'));
      roof.position.set(w * 0.1, h + 1.2, -d * 0.08);
      roof.castShadow = true;
      g.add(roof);
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.4), mat('#9a9a9a', { metalness: 0.4, roughness: 0.5 }));
      ac.position.set(-w * 0.25, h + 0.55, d * 0.2);
      g.add(ac);
    }
    // shop sign + awning on the street-facing side
    if (rng.chance(0.55)) {
      const sign = rng.pick(SHOP_SIGNS);
      const sw = Math.min(w * 0.7, 16);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 4), signMat(sign));
      plane.position.set(0, 4.6, d / 2 + 0.12);
      g.add(plane);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.25, 2.2), mat(rng.pick(['#c81e3a', '#14532d', '#e8a020', '#1e3a8a'])));
      awn.position.set(0, 3.4, d / 2 + 1.1);
      awn.rotation.x = 0.25;
      g.add(awn);
    }
    g.position.set(cx, 0.3, cz);
    g.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
    scene.add(g);
    world.colliders.push({ x0: cx - w / 2 - 0.5, z0: cz - d / 2 - 0.5, x1: cx + w / 2 + 0.5, z1: cz + d / 2 + 0.5 });
    return g;
  }

  // Fill each block with 1-4 buildings of mixed types.
  const types = ['slab', 'slab', 'cylinder', 'setback', 'pyramid', 'slab'];
  for (let ix = 0; ix < STREET_X.length - 1; ix++) {
    for (let iz = 0; iz < STREET_Z.length - 1; iz++) {
      const x0 = STREET_X[ix] + ROAD_HALF + 4;
      const x1 = STREET_X[ix + 1] - ROAD_HALF - 4;
      const z0 = STREET_Z[iz] + ROAD_HALF + 4;
      const z1 = STREET_Z[iz + 1] - ROAD_HALF - 4;
      const bw = x1 - x0; const bd = z1 - z0;
      if (bw < 24 || bd < 24) continue;
      const n = rng.pick([1, 2, 2, 3]);
      if (n === 1) {
        const h = rng.range(26, 68);
        addBuilding((x0 + x1) / 2, (z0 + z1) / 2, bw * 0.72, bd * 0.72, h, rng.pick(types));
      } else {
        const colsN = n === 2 ? 2 : 2;
        for (let k = 0; k < colsN; k++) {
          const cx = x0 + (bw * (k + 0.5)) / colsN;
          const cz = (z0 + z1) / 2 + (k % 2 === 0 ? -bd * 0.16 : bd * 0.16);
          const h = rng.range(16, 52);
          addBuilding(cx, cz, bw / colsN - 8, bd * 0.55, h, rng.pick(types));
        }
        if (n === 3) {
          addBuilding((x0 + x1) / 2, z0 + bd * 0.2, bw * 0.5, bd * 0.22, rng.range(12, 26), 'slab');
        }
      }
    }
  }

  // ---- palms along sidewalks ----
  const trunkMat = mat('#7a5a3a', { roughness: 1 });
  const frondMat = mat('#2a7a3a', { roughness: 0.9, side: THREE.DoubleSide });
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    const segs = 3;
    let px = 0; let py = 0;
    for (let i = 0; i < segs; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 2.2 * s, 7), trunkMat);
      seg.position.set(px, py + 1.1 * s, 0);
      seg.rotation.z = 0.12 * (i - 1);
      seg.castShadow = true;
      g.add(seg);
      px += 0.24 * s * (i - 1) * 0.4; py += 2.1 * s;
    }
    // Fronds: two tiers of narrow drooping blades (flat green shards read badly
    // up close, so keep them slim and angled down).
    for (let tier = 0; tier < 2; tier++) {
      const n = tier === 0 ? 7 : 5;
      const len = (tier === 0 ? 2.6 : 1.8) * s;
      for (let i = 0; i < n; i++) {
        const a = ((i + tier * 0.35) / n) * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * s, len), frondMat);
        blade.position.set(px + Math.cos(a) * (len * 0.32), py + 0.5 * s - tier * 0.35 * s, Math.sin(a) * (len * 0.32));
        blade.rotation.set(Math.sin(a) * 1.15 - 0.55, 0, Math.cos(a) * 1.15 + 0.5);
        blade.rotation.y = -a;
        blade.castShadow = true;
        g.add(blade);
      }
    }
    g.position.set(x, 0.3, z);
    scene.add(g);
    world.obstacles.push({ x, z, r: 0.7 });
  }
  for (const x of STREET_X) {
    for (let z = CITY.minZ + 30; z < CITY.maxZ; z += 52) {
      if (rng.chance(0.6)) palm(x + ROAD_HALF + 3.4, z + rng.range(-6, 6));
      if (rng.chance(0.6)) palm(x - ROAD_HALF - 3.4, z + 26 + rng.range(-6, 6));
    }
  }

  // ---- street lamps with warm glow + light pools ----
  const lampPoleMat = mat('#3a3a42', { metalness: 0.6, roughness: 0.4 });
  const lampGlowTex = glowTexture('rgba(255,210,130,1)', 'rgba(255,210,130,0)');
  const poolTex = poolTexture();
  for (const z of STREET_Z) {
    for (let x = CITY.minX + 40; x < CITY.maxX; x += 64) {
      if (!rng.chance(0.7)) continue;
      const side = rng.chance(0.5) ? 1 : -1;
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 8), lampPoleMat);
      pole.position.y = 3.5;
      pole.castShadow = true;
      g.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.4), lampPoleMat);
      arm.position.set(0, 6.9, side * 1.1);
      g.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
      bulb.position.set(0, 6.8, side * 2.2);
      g.add(bulb);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlowTex, transparent: true, opacity: 0.75, depthWrite: false }));
      glow.scale.set(7, 7, 1);
      glow.position.copy(bulb.position);
      g.add(glow);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
        new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, 0.06, side * 2.2);
      g.add(pool);
      g.position.set(x, 0.3, z + (ROAD_HALF + 2.4) * side);
      scene.add(g);
      world.obstacles.push({ x: g.position.x, z: g.position.z, r: 0.5 });
    }
  }

  // ---- beach + sea (east) ----
  // Sand strip 360-384, sea from 380 — boats and piers sit in water, not sand.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(24, 620),
    new THREE.MeshStandardMaterial({ map: sandTexture(rng), roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(BEACH_X + 12, 0.03, 0);
  sand.receiveShadow = true;
  scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 900),
    new THREE.MeshStandardMaterial({ map: seaTexture(rng), roughness: 0.25, metalness: 0.35 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(SEA_X + 150, 0.01, 0);
  scene.add(sea);
  world.seaMesh = sea;

  // ---- marina: wooden piers + 6 boats with coloured hulls ----
  const pierMat = mat('#8a6a42', { roughness: 0.95 });
  const pierDark = mat('#6a4e2e', { roughness: 0.95 });
  function pier(x, z, w, l) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, l), pierMat);
    p.position.set(x, 0.25, z);
    p.receiveShadow = true;
    scene.add(p);
    // plank lines
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.06, 0.3), pierDark);
      line.position.set(x, 0.52, z - l / 2 + (i + 0.5) * (l / 6));
      scene.add(line);
    }
  }
  pier(396, 200, 8, 90);
  pier(414, 230, 8, 60);
  pier(396, 260, 8, 50);
  function boat(x, z, hullColor, angle = 0) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat(hullColor, { roughness: 0.5, metalness: 0.2 }));
    hull.scale.set(7, 1.6, 2.4);
    hull.position.y = 0.4;
    hull.castShadow = true;
    g.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 2.0), mat('#f0ece2', { roughness: 0.6 }));
    cabin.position.set(-0.4, 1.8, 0);
    cabin.castShadow = true;
    g.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 6), mat('#c8c0b0'));
    mast.position.set(1.6, 4.2, 0);
    g.add(mast);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.35, 2.5), mat('#ffffff', { roughness: 0.5 }));
    stripe.position.y = 1.15;
    g.add(stripe);
    g.position.set(x, 0.1, z);
    g.rotation.y = angle;
    scene.add(g);
  }
  boat(404, 178, '#1e3a8a', 0.2);
  boat(404, 214, '#c81e3a', -0.15);
  boat(422, 196, '#14532d', 0.1);
  boat(404, 248, '#7c2d12', 0.25);
  boat(422, 246, '#0f766e', -0.2);
  boat(424, 268, '#a16207', 0.05);

  // ---- checkpoint beacons: ground ring + slim glowing column + floating diamond ----
  const ringGeo = new THREE.TorusGeometry(4.5, 0.35, 8, 32);
  for (const cp of world.checkpoints) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffa020 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    g.add(ring);
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.4, 16, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb340, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    col.position.y = 8;
    g.add(col);
    const dia = new THREE.Mesh(new THREE.OctahedronGeometry(1.4),
      new THREE.MeshBasicMaterial({ color: 0xffc860 }));
    dia.position.y = 9;
    g.add(dia);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,180,60,0.9)', 'rgba(255,180,60,0)'), transparent: true, opacity: 0.7, depthWrite: false,
    }));
    glow.scale.set(12, 12, 1);
    glow.position.y = 9;
    g.add(glow);
    g.position.set(cp.x, 0.3, cp.z);
    scene.add(g);
    world.beacons.push(g);
  }

  return world;
}
