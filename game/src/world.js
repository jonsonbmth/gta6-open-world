// SOLMAR BAY — the city: roads, four building types, neon shopfronts,
// street lamps, palms, marina, bridge, sky, rain and wet-road reflections.
// Everything procedural; the RNG is seeded so screenshots are reproducible.
import * as THREE from 'three';
import { CITY, DISTRICTS, SHOPS, PALETTE } from './config.js';
import {
  makeGlowTexture, makeStreakTexture, makeWindowTexture,
  makeNeonSignTexture, makeRoadTexture, makeSidewalkTexture,
} from './textures.js';
import { buildBoat } from './cars.js';

const glowWarm = makeGlowTexture('#ffb45e');
const glowWhite = makeGlowTexture('#fff6d8');

function makeGlowSprite(tex, scale, opacity = 0.8) {
  const m = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(scale, scale, 1);
  return s;
}

/** A wet-road reflection streak lying flat on the asphalt. */
function addStreak(parent, x, z, color, length, width, angle = 0, opacity = 0.55) {
  const tex = makeStreakTexture(color);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = angle;
  m.position.set(x, 0.06, z);
  parent.add(m);
  return m;
}

/** Gradient night sky dome (own GLSL, no post-processing). */
function makeSkyDome() {
  const geo = new THREE.SphereGeometry(880, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(0x1a1440) },
      horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.9, h))
                          : mix(horizon, mid, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -10;
  return dome;
}

function makeStars(rng) {
  const count = 420;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = rng.range(0, Math.PI * 2);
    const phi = rng.range(0.12, 1.2);
    const r = 820;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) + 20;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xcdd8ff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.65, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/** Rain: slanted line segments falling fast, recycled above the player. */
function makeRain(rng, count = 1300) {
  const pos = new Float32Array(count * 6);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = rng.range(-70, 70);
    const y = rng.range(0, 55);
    const z = rng.range(-70, 70);
    pos.set([x, y, z, x + 0.35, y - 1.1, z + 0.1], i * 6);
    speeds[i] = rng.range(48, 62);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x9fb4ff, transparent: true, opacity: 0.42,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return { lines, speeds, count };
}

function makePalm(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1e18, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x0e2418, roughness: 0.85, side: THREE.DoubleSide,
  });
  // Curved trunk from three stacked, slightly rotated segments.
  let y = 0, tilt = 0;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.02, 0.18 - i * 0.02, 2.2, 6), trunkMat);
    seg.position.set(Math.sin(tilt) * 0.4, y + 1.1, 0);
    seg.rotation.z = tilt;
    group.add(seg);
    y += 2.1;
    tilt += rng.range(0.05, 0.14) * rng.sign();
  }
  // Fronds: long flattened cones drooping outward.
  const frondGeo = new THREE.ConeGeometry(0.28, 3.4, 4);
  frondGeo.scale(1, 1, 0.18);
  const topX = Math.sin(tilt) * 1.2;
  for (let i = 0; i < 8; i++) {
    const frond = new THREE.Mesh(frondGeo, frondMat);
    const a = (i / 8) * Math.PI * 2 + rng.range(-0.15, 0.15);
    frond.position.set(topX, y + 0.3, 0);
    frond.rotation.set(Math.PI / 2 + rng.range(0.45, 0.8), a, 0, 'YXZ');
    frond.rotateY(a);
    group.add(frond);
  }
  // A few coconuts.
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), trunkMat);
    nut.position.set(topX + rng.range(-0.3, 0.3), y + 0.1, rng.range(-0.3, 0.3));
    group.add(nut);
  }
  return group;
}

/**
 * Build the whole city. Returns { colliders, rain, update, lamps, signs }.
 * colliders: AABBs the car and the player cannot pass through.
 */
export function buildWorld(scene, rng) {
  const colliders = [];
  const animated = []; // { mesh, kind, phase }
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  // --- Lights: BRIGHT night. Strong ambient + hemisphere so nothing is murky.
  scene.add(new THREE.AmbientLight(0x8899ff, 0.75));
  const hemi = new THREE.HemisphereLight(0x4a5aa8, 0x241a30, 0.9);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.6);
  moon.position.set(120, 220, 60);
  scene.add(moon);
  // Warm fill from the south: lights the camera side of cars on Lumen Ave
  // (the chase cam looks north, so without this the hero's rear is black).
  const fill = new THREE.DirectionalLight(0xffd9a0, 0.55);
  fill.position.set(-60, 80, 240);
  scene.add(fill);
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0031);

  // --- Sky, stars, moon glow.
  group.add(makeSkyDome());
  group.add(makeStars(rng));
  const moonGlow = makeGlowSprite(glowWhite, 90, 0.55);
  moonGlow.position.set(-320, 320, -480);
  group.add(moonGlow);

  // --- Ground, water, beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshStandardMaterial({ color: 0x141828, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(40, 0, 0);
  group.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 760),
    new THREE.MeshStandardMaterial({
      color: PALETTE.water, roughness: 0.12, metalness: 0.7,
      transparent: true, opacity: 0.96,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-310, 0.05, 0);
  group.add(water);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 760),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.95 }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-191, 0.02, 0);
  group.add(beach);

  // --- Roads (wet asphalt: low roughness + high metalness).
  const roadTex = makeRoadTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex, roughness: 0.18, metalness: 0.55, color: 0xffffff,
  });
  function roadPlane(width, length, x, z, rotate90 = false) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(rotate90 ? length / 24 : width / 24, rotate90 ? width / 24 : length / 24);
    const mat = roadMat.clone();
    mat.map = tex;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
    m.rotation.x = -Math.PI / 2;
    if (rotate90) m.rotation.z = Math.PI / 2;
    m.position.set(x, 0.04, z);
    group.add(m);
    return m;
  }
  // Lumen Avenue (main boulevard, 24 m wide).
  roadPlane(24, 580, CITY.avenueX, 0);
  // Cross streets + side streets.
  for (const z of CITY.crossStreetsZ) roadPlane(14, 620, 10, z, true);
  for (const x of CITY.sideStreetsX) roadPlane(14, 580, x, 0);

  // Sidewalks flanking Lumen Avenue.
  const walkTex = makeSidewalkTexture();
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.35, metalness: 0.35 });
  for (const sx of [-1, 1]) {
    const tex = walkTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 40);
    const mat = walkMat.clone();
    mat.map = tex;
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(6, 580), mat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(sx * 15, 0.08, 0);
    group.add(walk);
  }

  // --- Buildings: four types, window textures glowing at night.
  const windowTexs = [
    makeWindowTexture(rng, 8, 16, 0.6),
    makeWindowTexture(rng, 6, 12, 0.45),
    makeWindowTexture(rng, 10, 20, 0.7),
  ];
  const facadeColors = [0x232838, 0x1d2233, 0x2a2438, 0x1f2a33];
  const roofProps = [];

  function windowMaterial(rng, w, h) {
    const tex = rng.pick(windowTexs).clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 22)));
    return new THREE.MeshStandardMaterial({
      color: rng.pick(facadeColors),
      roughness: 0.6, metalness: 0.25,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.15,
    });
  }

  function addRoofProps(building, w, h, d) {
    if (rng.chance(0.55)) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.09, rng.range(3, 7), 5),
        new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.7, roughness: 0.5 }),
      );
      antenna.position.set(rng.range(-w / 4, w / 4), h / 2 + 2, rng.range(-d / 4, d / 4));
      building.add(antenna);
      const beacon = makeGlowSprite(makeGlowTexture('#ff2222'), 1.6, 0.9);
      beacon.position.copy(antenna.position);
      beacon.position.y += rng.range(1.5, 3.5);
      building.add(beacon);
      animated.push({ mesh: beacon, kind: 'blink', phase: rng.range(0, 6) });
    }
    if (rng.chance(0.5)) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 1.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 0.8 }),
      );
      tank.position.set(rng.range(-w / 4, w / 4), h / 2 + 0.9, rng.range(-d / 4, d / 4));
      building.add(tank);
    }
    for (let i = 0; i < rng.int(1, 3); i++) {
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.7, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 0.7, metalness: 0.4 }),
      );
      ac.position.set(rng.range(-w / 3, w / 3), h / 2 + 0.35, rng.range(-d / 3, d / 3));
      building.add(ac);
    }
  }

  function addBuilding(x, z, w, h, d, type) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    const mat = windowMaterial(rng, w, h);
    if (type === 'cylinder') {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 14), mat);
      tower.position.y = h / 2;
      b.add(tower);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2 + 0.4, w / 2 + 0.4, 0.8, 14),
        new THREE.MeshStandardMaterial({ color: 0x2a2f42, roughness: 0.5, metalness: 0.4 }),
      );
      cap.position.y = h + 0.4;
      b.add(cap);
    } else if (type === 'setback') {
      let y = 0;
      let ww = w, dd = d;
      for (let i = 0; i < 3; i++) {
        const hh = h * (i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2);
        const tier = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), i === 0 ? mat : windowMaterial(rng, ww, hh));
        tier.position.y = y + hh / 2;
        b.add(tier);
        y += hh;
        ww *= 0.72; dd *= 0.72;
      }
    } else if (type === 'pyramid') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.82, d), mat);
      base.position.y = h * 0.41;
      b.add(base);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.28, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.5, metalness: 0.5 }),
      );
      roof.position.y = h * 0.82 + h * 0.14;
      roof.rotation.y = Math.PI / 4;
      b.add(roof);
    } else {
      // slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      slab.position.y = h / 2;
      b.add(slab);
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.5, 0.7, d + 0.5),
        new THREE.MeshStandardMaterial({ color: 0x2a2f42, roughness: 0.5, metalness: 0.4 }),
      );
      trim.position.y = h + 0.35;
      b.add(trim);
    }
    addRoofProps(b, w, h, d);
    group.add(b);
    colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return b;
  }

  // City blocks between streets.
  const blockX = [[-312, -167], [-153, -87], [-73, -7], [7, 73], [87, 153], [167, 313]];
  const blockZ = [[-312, -247], [-233, -167], [-153, -87], [-73, -7], [7, 73], [87, 153], [167, 233], [247, 313]];
  const downtown = (x, z) => Math.abs(x) < 80 && Math.abs(z) < 80;
  for (const [x0, x1] of blockX) {
    for (const [z0, z1] of blockZ) {
      if (x1 < -195) continue; // bay
      if (x0 > -200 && x0 < -80 && z0 >= 80) continue; // harbour lots (marina props)
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const bw = x1 - x0, bd = z1 - z0;
      const isDowntown = downtown(cx, cz);
      const type = rng.pick(['slab', 'slab', 'cylinder', 'setback', 'pyramid']);
      const h = isDowntown ? rng.range(28, 72) : rng.range(8, 26);
      const w = Math.min(bw - 10, rng.range(18, 34));
      const d = Math.min(bd - 10, rng.range(18, 34));
      addBuilding(cx, cz, w, h, d, type);
      // A second smaller building fills big blocks.
      if (bw > 50 && bd > 50 && rng.chance(0.6)) {
        addBuilding(
          cx + rng.range(-bw / 4, bw / 4), cz + rng.range(-bd / 4, bd / 4),
          rng.range(12, 20), rng.range(7, 16), rng.range(12, 20),
          rng.pick(['slab', 'setback', 'pyramid']),
        );
      }
    }
  }
  // Distant skyline silhouettes beyond the ring road (cheap depth).
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(360, 520);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (x < -260) continue;
    const h = rng.range(40, 120);
    const w = rng.range(18, 34);
    const sil = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      new THREE.MeshBasicMaterial({ color: 0x0d1130 }),
    );
    sil.position.set(x, h / 2, z);
    group.add(sil);
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, h * 0.85),
      new THREE.MeshBasicMaterial({
        map: rng.pick(windowTexs), transparent: true, opacity: 0.5,
      }),
    );
    win.position.set(x, h / 2, z - w / 2 - 0.2);
    win.rotation.y = Math.PI;
    group.add(win);
  }

  // --- Neon shopfronts along Lumen Avenue (both sides).
  const shopSpots = [];
  for (let i = 0; i < 16; i++) {
    const z = -130 + i * 17.5;
    for (const sx of [-1, 1]) {
      if (rng.chance(0.18)) continue;
      shopSpots.push({ x: sx * 20.5, z, side: sx });
    }
  }
  const shopMats = SHOPS.map((s) => ({
    ...s,
    signTex: makeNeonSignTexture(s.name, s.color),
    glowTex: makeGlowTexture(s.color),
    streakTex: makeStreakTexture(s.color),
  }));
  let shopIdx = 0;
  for (const spot of shopSpots) {
    const shop = shopMats[shopIdx++ % shopMats.length];
    const store = new THREE.Group();
    store.position.set(spot.x, 0, spot.z);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(11, 5.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x171b2c, roughness: 0.7, metalness: 0.2 }),
    );
    box.position.y = 2.6;
    store.add(box);
    // Glowing shop window.
    const winGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.6),
      new THREE.MeshBasicMaterial({ color: 0xffd489, transparent: true, opacity: 0.85 }),
    );
    winGlow.position.set(-spot.side * 5.55, 1.6, 0);
    winGlow.rotation.y = spot.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    store.add(winGlow);
    // Neon sign facing the road.
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 2.2),
      new THREE.MeshBasicMaterial({ map: shop.signTex }),
    );
    sign.position.set(-spot.side * 5.6, 4.1, 0);
    sign.rotation.y = spot.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    store.add(sign);
    const signGlow = makeGlowSprite(shop.glowTex, 7, 0.5);
    signGlow.position.set(-spot.side * 6.4, 4.1, 0);
    store.add(signGlow);
    // Awning (small, sloping down from the wall).
    const awning = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.6),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(shop.color), roughness: 0.6, side: THREE.DoubleSide }),
    );
    awning.position.set(-spot.side * 6.2, 3.0, 0);
    awning.rotation.set(0, spot.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    awning.rotateX(-0.85);
    store.add(awning);
    group.add(store);
    colliders.push({
      x0: spot.x - 5.5, z0: spot.z - 6, x1: spot.x + 5.5, z1: spot.z + 6,
    });
    // Wet streak on the road in front of the shop.
    addStreak(group, spot.x - spot.side * 9, spot.z, shop.color, 16, 3.2, 0, 0.5);
  }

  // --- Street lamps along Lumen Avenue + intersections.
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6.4, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f42, metalness: 0.6, roughness: 0.5 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd489 });
  const lampSpots = [];
  for (let z = -260; z <= 260; z += 26) {
    lampSpots.push({ x: -13.5, z });
    lampSpots.push({ x: 13.5, z });
  }
  for (const z of CITY.crossStreetsZ) {
    lampSpots.push({ x: -87, z: z - 8 });
    lampSpots.push({ x: 87, z: z + 8 });
  }
  for (const spot of lampSpots) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(spot.x, 3.2, spot.z);
    group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), headMat);
    head.position.set(spot.x, 6.5, spot.z);
    group.add(head);
    const glow = makeGlowSprite(glowWarm, 5, 0.65);
    glow.position.set(spot.x, 6.5, spot.z);
    group.add(glow);
    // Warm pool + streak on the asphalt.
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffb45e, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(spot.x, 0.07, spot.z);
    group.add(pool);
    addStreak(group, spot.x * 0.55, spot.z, '#ffb45e', 11, 2.2, 0, 0.4);
  }

  // --- Palms: Lumen Ave sidewalks, beachfront, marina.
  const palmVariants = [makePalm(rng), makePalm(rng), makePalm(rng)];
  const palmSpots = [];
  for (let z = -250; z <= 250; z += 34) {
    palmSpots.push({ x: -16.5, z: z + rng.range(-3, 3) });
    palmSpots.push({ x: 16.5, z: z + 8 + rng.range(-3, 3) });
  }
  for (let z = -240; z <= 240; z += 30) palmSpots.push({ x: -196, z });
  for (const spot of palmSpots) {
    const palm = rng.pick(palmVariants).clone();
    palm.position.set(spot.x, 0, spot.z);
    palm.rotation.y = rng.range(0, Math.PI * 2);
    const s = rng.range(0.85, 1.25);
    palm.scale.set(s, s, s);
    group.add(palm);
  }

  // --- Marina: piers, boats, containers, lighthouse, bridge, Pelican Isle.
  // A warm point light over the main pier so the marina reads at night.
  const pierLight = new THREE.PointLight(0xffb45e, 45, 48, 1.5);
  pierLight.position.set(-212, 6, 150);
  group.add(pierLight);
  const pierLight2 = new THREE.PointLight(0x00e5ff, 40, 40, 1.5);
  pierLight2.position.set(-226, 5, 110);
  group.add(pierLight2);
  // Warm light over the harbour promenade (the marina shot's crew).
  const promLight = new THREE.PointLight(0xffc98a, 35, 32, 1.5);
  promLight.position.set(-198, 5, 148);
  group.add(promLight);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.9 });
  for (const pz of [110, 150, 190]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 4), pierMat);
    pier.position.set(-214, 0.5, pz);
    group.add(pier);
    // Edge light strips along the pier deck.
    for (const sz of [-1, 1]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(26, 0.12, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xffd489 }),
      );
      strip.position.set(-214, 0.95, pz + sz * 1.9);
      group.add(strip);
    }
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), pierMat);
      post.position.set(-226 + i * 8, 0.9, pz + (i % 2 === 0 ? 1.8 : -1.8));
      group.add(post);
    }
    const lamp = makeGlowSprite(glowWarm, 3.5, 0.7);
    lamp.position.set(-226, 2.2, pz);
    group.add(lamp);
  }
  for (let i = 0; i < 8; i++) {
    const boat = buildBoat(rng);
    boat.position.set(rng.range(-236, -206), 0.1, rng.range(96, 210));
    boat.rotation.y = rng.range(-0.4, 0.4) + (i % 2 === 0 ? 0 : Math.PI);
    group.add(boat);
  }
  // Two white-hulled boats moored right beside Pier 9 (the marina shot).
  for (const [bx, bz, rot] of [[-224, 144, 0.2], [-224, 158, -0.15]]) {
    const boat = buildBoat(rng, { color: 0xf2f2ea });
    boat.position.set(bx, 0.1, bz);
    boat.rotation.y = rot;
    group.add(boat);
  }
  // Moonlight + pier-light streaks on the water near the marina.
  addStreak(group, -222, 130, '#ffb45e', 26, 5, Math.PI / 2, 0.35);
  addStreak(group, -228, 170, '#00e5ff', 22, 4, Math.PI / 2, 0.3);
  addStreak(group, -240, 90, '#ffd489', 30, 6, Math.PI / 2, 0.25);
  // Containers at Coral Docks.
  const containerColors = [0x9b2c2c, 0x2b6cb0, 0x276749, 0xd69e2e, 0x744210];
  for (let i = 0; i < 14; i++) {
    const cont = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2.6, 2.4),
      new THREE.MeshStandardMaterial({ color: rng.pick(containerColors), roughness: 0.6, metalness: 0.3 }),
    );
    const cx = rng.range(200, 280), cz = rng.range(100, 220);
    cont.position.set(cx, 1.3 + (i % 3 === 0 ? 2.6 : 0), cz);
    cont.rotation.y = rng.pick([0, Math.PI / 2]);
    group.add(cont);
    colliders.push({ x0: cx - 3, z0: cz - 3, x1: cx + 3, z1: cz + 3 });
  }
  // Old Lighthouse on the point.
  const lighthouse = new THREE.Group();
  lighthouse.position.set(-248, 0, -56);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3, 22, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7 }),
  );
  tower.position.y = 11;
  lighthouse.add(tower);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 2.4, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
  );
  lampRoom.position.y = 23;
  lighthouse.add(lampRoom);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff6d8, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  beam.position.set(0, 23, 0);
  beam.rotation.z = Math.PI / 2;
  beam.geometry.translate(0, -20, 0);
  lighthouse.add(beam);
  animated.push({ mesh: beam, kind: 'rotate', phase: 0 });
  const towerGlow = makeGlowSprite(glowWhite, 10, 0.7);
  towerGlow.position.set(0, 23, 0);
  lighthouse.add(towerGlow);
  group.add(lighthouse);
  // Solmar Bridge + Pelican Isle.
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x2a2f42, roughness: 0.6, metalness: 0.4 });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(64, 1, 10), bridgeMat);
  bridge.position.set(-232, 1.2, -40);
  group.add(bridge);
  for (let i = 0; i < 7; i++) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 8), bridgeMat);
    pillar.position.set(-262 + i * 10, -1.5, -40);
    group.add(pillar);
    const bl = makeGlowSprite(makeGlowTexture('#00e5ff'), 2.4, 0.6);
    bl.position.set(-262 + i * 10, 2.6, -40);
    group.add(bl);
  }
  const isle = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 30, 3, 18),
    new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.9 }),
  );
  isle.position.set(-276, 0.5, -40);
  group.add(isle);
  for (let i = 0; i < 6; i++) {
    const palm = rng.pick(palmVariants).clone();
    const a = rng.range(0, Math.PI * 2);
    palm.position.set(-276 + Math.cos(a) * 16, 2, -40 + Math.sin(a) * 16);
    group.add(palm);
  }
  const isleHouse = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5, 7),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.8 }),
  );
  isleHouse.position.set(-276, 4.5, -40);
  group.add(isleHouse);

  // --- Rain.
  const rain = makeRain(rng);
  group.add(rain.lines);

  // --- Update: rain falls around the camera, beacons blink, beam rotates.
  const rainPos = rain.lines.geometry.attributes.position;
  function update(dt, t, focus) {
    const arr = rainPos.array;
    for (let i = 0; i < rain.count; i++) {
      const drop = rain.speeds[i] * dt;
      arr[i * 6 + 1] -= drop;
      arr[i * 6 + 4] -= drop;
      if (arr[i * 6 + 1] < 0) {
        const nx = focus.x + (Math.random() - 0.5) * 140;
        const nz = focus.z + (Math.random() - 0.5) * 140;
        const ny = 45 + Math.random() * 12;
        arr[i * 6] = nx; arr[i * 6 + 1] = ny; arr[i * 6 + 2] = nz;
        arr[i * 6 + 3] = nx + 0.35; arr[i * 6 + 4] = ny - 1.1; arr[i * 6 + 5] = nz + 0.1;
      }
    }
    rainPos.needsUpdate = true;
    for (const a of animated) {
      if (a.kind === 'blink') {
        a.mesh.material.opacity = (Math.sin(t * 2.4 + a.phase) > 0.2) ? 0.9 : 0.08;
      } else if (a.kind === 'rotate') {
        a.mesh.rotation.y = t * 0.35;
      }
    }
  }

  return { colliders, update, group };
}
