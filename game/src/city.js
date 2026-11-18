// SOLMAR BAY city: a BRIGHT rainy neon night. No black holes — every surface
// carries light: lit windows, neon glow, wet-road reflection streaks, lamp pools.
import * as THREE from 'three';
import { mulberry32, neonSignTexture, windowTextures, makeGlow, roadStreak, lightPool, clamp, extrudeProfile, roundedSlab } from './util.js';

export const CITY = {
  roadLength: 420,
  roadWidth: 22,
  crossZ: [-140, -60, 20, 100],
  marinaZ: 185,
  downtownZ: -190,
};

// Shop names — our own inventions, never the competitor's.
const SHOPS = [
  ['VELVET', 'CLUB', '#ff2d95'], ['TIDE POOL', 'BAR', '#00e5ff'],
  ['DELTA', 'PIZZA', '#ffb020'], ['AZURE', 'FISH', '#4fc3ff'],
  ['MIRAGE', 'HOTEL', '#ff5b8a'], ['ORBIT', 'ARCADE', '#7a5cff'],
  ['SALT & SMOKE', 'DINER', '#ffd23e'], ['LUMEN', 'CINEMA', '#00e5a0'],
  ['CORAL', 'SUSHI', '#ff7a5c'], ['NOVA', 'GYM', '#ff2d95'],
  ['HARBOUR', 'TACKLE', '#4fc3ff'], ['GILDED', 'PAWN', '#ffd23e'],
  ['STATIC', 'RADIO', '#00e5ff'], ['PEARL', 'DIVE BAR', '#ff5b8a'],
  ['EMBER', 'GRILL', '#ffb020'], ['HALCYON', 'MOTEL', '#7a5cff'],
  ['BAYLINE', 'FERRIES', '#00e5a0'], ['OPAL', 'JEWELS', '#ff2d95'],
];

const SKY_VERT = `
varying vec3 vPos;
void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SKY_FRAG = `
varying vec3 vPos;
void main() {
  float h = normalize(vPos).y;
  vec3 top = vec3(0.075, 0.06, 0.22);
  vec3 mid = vec3(0.17, 0.12, 0.38);
  vec3 hor = vec3(0.42, 0.26, 0.58);
  vec3 col = mix(hor, mid, smoothstep(0.0, 0.25, h));
  col = mix(col, top, smoothstep(0.2, 0.7, h));
  // warm city glow band right above the horizon
  col += vec3(0.30, 0.16, 0.05) * pow(max(0.0, 1.0 - abs(h - 0.03) * 9.0), 2.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function buildCity(scene) {
  const rnd = mulberry32(20261118);
  const animated = { rain: null, signs: [], copPools: [] };

  // --- sky, fog, lights: BRIGHT baseline, no pitch black anywhere ---
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(sky);
  scene.fog = new THREE.FogExp2(0x38306e, 0.0032);

  scene.add(new THREE.HemisphereLight(0x9a8cff, 0x40305e, 1.7));
  scene.add(new THREE.AmbientLight(0x8080c8, 0.75));
  const moon = new THREE.DirectionalLight(0xb8c8ff, 1.0);
  moon.position.set(-60, 120, 40);
  scene.add(moon);
  // warm city bounce from the south (marina side)
  const bounce = new THREE.DirectionalLight(0xff9a5c, 0.35);
  bounce.position.set(40, 60, 160);
  scene.add(bounce);

  // --- ground ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0x232044, roughness: 0.85, metalness: 0.1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  // --- roads: Lumen Avenue (Z axis) + cross streets (X axis) ---
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3d4470, roughness: 0.18, metalness: 0.85, envMapIntensity: 1.6 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, CITY.roadLength), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  scene.add(road);
  for (const z of CITY.crossZ) {
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(260, 14), roadMat);
    cross.rotation.x = -Math.PI / 2;
    cross.position.set(0, 0.02, z);
    scene.add(cross);
  }
  // bright lane markings
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x9fd8ff });
  for (let z = -200; z < 200; z += 12) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.04, z);
    scene.add(dash);
  }
  for (const x of [-10.4, 10.4]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.4, CITY.roadLength), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.04, 0);
    scene.add(edge);
  }
  // sidewalks (lighter than the road so the street reads as a bright corridor)
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x565a80, roughness: 0.6, metalness: 0.2 });
  for (const x of [-15.5, 15.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(9, CITY.roadLength), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(x, 0.06, 0);
    scene.add(walk);
  }

  // --- buildings: VARIED forms, never a row of identical cubes ---
  const winSets = [windowTextures(11), windowTextures(23), windowTextures(37), windowTextures(51)];
  const facades = [0x4a4a72, 0x55507a, 0x42426a, 0x5a4a6e];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c2c44, roughness: 0.8, metalness: 0.3 });
  function roofDetails(x, z, topY, w, seed) {
    const r = mulberry32(seed * 7919 + 13);
    // antenna with a red tip light
    if (r() < 0.5) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 6 + r() * 6, 6), roofMat);
      a.position.set(x + (r() - 0.5) * w * 0.5, topY + 3 + r() * 3, z + (r() - 0.5) * w * 0.5);
      scene.add(a);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
      tip.position.set(a.position.x, a.position.y + 3 + r() * 3, a.position.z);
      scene.add(tip);
    }
    // water tank: cylinder + cone cap
    if (r() < 0.45) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 10), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 }));
      tank.position.set(x + (r() - 0.5) * w * 0.4, topY + 1.2, z + (r() - 0.5) * w * 0.4);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 10), roofMat);
      cap.position.set(tank.position.x, topY + 2.9, tank.position.z);
      scene.add(tank, cap);
    }
    // AC units: small rounded boxes
    for (let i = 0; i < 2; i++) {
      if (r() < 0.7) {
        const ac = roundedSlab(1.6, 0.9, 1.2, roofMat, 0.08);
        ac.position.set(x + (r() - 0.5) * w * 0.6, topY, z + (r() - 0.5) * w * 0.6);
        scene.add(ac);
      }
    }
  }
  function building(x, z, w, h, d, seedIdx) {
    const ws = winSets[seedIdx % winSets.length];
    const mat = new THREE.MeshStandardMaterial({
      color: facades[seedIdx % facades.length], roughness: 0.7, metalness: 0.3,
      map: ws.map, emissive: 0xffffff, emissiveMap: ws.emissive, emissiveIntensity: 1.35,
    });
    const type = seedIdx % 4;
    let topY = h;
    if (type === 1) {
      // cylindrical tower — the window texture wraps around it
      const r = Math.min(w, d) / 2;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h, 16), mat);
      tower.position.set(x, h / 2, z);
      scene.add(tower);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.92, 2.5, 16), roofMat);
      crown.position.set(x, h + 1.2, z);
      scene.add(crown);
      topY = h + 2.5;
    } else if (type === 2) {
      // stepped setbacks: three shrinking tiers
      const tiers = [[1, 0.52], [0.72, 0.3], [0.45, 0.18]];
      let y = 0;
      for (const [s, hf] of tiers) {
        const th = h * hf;
        const tier = new THREE.Mesh(new THREE.BoxGeometry(w * s, th, d * s), mat);
        tier.position.set(x, y + th / 2, z);
        scene.add(tier);
        y += th;
      }
    } else if (type === 3) {
      // slab + pyramid roof
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, h / 2, z);
      scene.add(b);
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 4 + h * 0.08, 4), roofMat);
      pyr.position.set(x, h + 2 + h * 0.04, z);
      pyr.rotation.y = Math.PI / 4;
      scene.add(pyr);
      topY = h + 4 + h * 0.08;
    } else {
      // slab with a protruding entrance canopy + vertical fin trim
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, h / 2, z);
      scene.add(b);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.25, 2.4), roofMat);
      canopy.position.set(x + (x < 0 ? w / 2 : -w / 2) * 0.9, 3.2, z);
      scene.add(canopy);
    }
    roofDetails(x, z, topY, w, seedIdx * 31 + Math.floor(Math.abs(x)) + Math.floor(Math.abs(z)));
    // rooftop beacon glow so the skyline reads at a glance
    if (h > 26) {
      const g = makeGlow(0xff8095, 4, 0.5);
      g.position.set(x, topY + 1.5, z);
      scene.add(g);
    }
  }
  // rows along Lumen Avenue
  for (let z = -190; z <= 170; z += 24) {
    if (CITY.crossZ.some((cz) => Math.abs(z - cz) < 12)) continue;
    building(-26 - rnd() * 6, z, 14, 12 + rnd() * 22, 18, Math.floor(rnd() * 4));
    building(26 + rnd() * 6, z, 14, 12 + rnd() * 22, 18, Math.floor(rnd() * 4));
  }
  // downtown towers at the far north end (the cover's backdrop)
  for (let i = 0; i < 9; i++) {
    const x = -70 + i * 18 + rnd() * 6;
    building(x, CITY.downtownZ - rnd() * 30, 14, 42 + rnd() * 46, 14, i % 4);
  }
  // side blocks
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    building(side * (55 + rnd() * 45), -170 + rnd() * 320, 18, 10 + rnd() * 26, 18, i % 4);
  }

  // --- neon shop signs: MANY, BIG, strong glow + wide road reflections ---
  const signMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: false });
  SHOPS.forEach(([name, sub, color], i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -168 + i * 19;
    const tex = neonSignTexture(name, sub, color);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), signMat(tex));
    sign.position.set(side * 20.4, 6.5, z);
    sign.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(sign);
    // big halo glow behind the sign
    const halo = makeGlow(new THREE.Color(color), 13, 0.55);
    halo.position.set(side * 20.2, 6.5, z);
    scene.add(halo);
    // WIDE bright reflection streak on the wet road under the sign
    const streak = roadStreak(new THREE.Color(color), 3.4, 26, 0.5);
    streak.position.set(side * 8, 0.05, z);
    scene.add(streak);
    const pool = lightPool(new THREE.Color(color), 7, 0.3);
    pool.position.set(side * 9, 0.05, z);
    scene.add(pool);
    animated.signs.push(sign);
    // lit shopfront window below the sign
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 3.2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }),
    );
    win.position.set(side * 20.4, 2.2, z);
    win.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(win);
  });

  // --- street lamps: warm pools + streaks, every 20 units ---
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.5, metalness: 0.7 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  for (let z = -200; z <= 180; z += 40) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), poleMat);
      pole.position.set(side * 12.5, 3.5, z);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), bulbMat);
      bulb.position.set(side * 12.5, 7.2, z);
      scene.add(bulb);
      const glow = makeGlow(0xffc46a, 7, 0.6);
      glow.position.set(side * 12.5, 7.2, z);
      scene.add(glow);
      const pool = lightPool(0xffc46a, 6.5, 0.38);
      pool.position.set(side * 10.5, 0.05, z);
      scene.add(pool);
      const streak = roadStreak(0xffc46a, 2.2, 20, 0.4);
      streak.position.set(side * 8.5, 0.05, z);
      scene.add(streak);
    }
  }

  // --- palms: cylinder trunk + DROOPING curved fronds (ellipsoids), never blocks ---
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1e2e, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x14301c, roughness: 0.9, emissive: 0x0a2a1a, emissiveIntensity: 0.6 });
  const frondGeo = new THREE.SphereGeometry(1, 8, 6);
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    // coconut cluster at the crown
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), nutMat);
      nut.position.set(Math.cos(i * 2.1) * 0.35, 6.9, Math.sin(i * 2.1) * 0.35);
      g.add(nut);
    }
    for (let i = 0; i < 8; i++) {
      const frond = new THREE.Mesh(frondGeo, frondMat);
      const a = (i / 8) * Math.PI * 2;
      // long, flat, drooping ellipsoid — a curved palm frond
      frond.scale.set(2.4, 0.16, 0.55);
      frond.position.set(Math.cos(a) * 1.9, 7.1, Math.sin(a) * 1.9);
      frond.rotation.y = -a;
      frond.rotation.z = -0.5; // droop downward
      g.add(frond);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let z = -180; z <= 160; z += 56) {
    palm(-14.5, z + 6);
    palm(14.5, z + 20);
  }

  // --- marina: Old Harbour at the south end ---
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 90),
    new THREE.MeshStandardMaterial({ color: 0x3a6ab0, roughness: 0.08, metalness: 0.9, envMapIntensity: 2.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, CITY.marinaZ + 40);
  scene.add(water);
  // bright reflections on the water so it reads as water, not a dark void
  for (const [x, z, col] of [[-20, 205, 0xffd9a0], [10, 215, 0x00e5ff], [35, 200, 0xff2d95], [-45, 220, 0xffe9b0]]) {
    const wg = makeGlow(col, 12, 0.5);
    wg.position.set(x, 1.5, z);
    scene.add(wg);
    const ws = roadStreak(col, 3, 22, 0.45);
    ws.position.set(x, 0.05, z);
    scene.add(ws);
  }
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 34), dockMat);
    dock.position.set(-30 + i * 20, 0.3, CITY.marinaZ + 18);
    scene.add(dock);
    const lamp = makeGlow(0xffd9a0, 5, 0.7);
    lamp.position.set(-30 + i * 20, 4, CITY.marinaZ + 32);
    scene.add(lamp);
  }
  const boatColors = [0xffffff, 0xffd23e, 0x4fc3ff, 0xff5b8a];
  // hull side profile: flat stern, pointed bow — extruded, bevelled, no box
  const HULL = [[-5, 0.2], [-5, 1.3], [-2, 1.55], [3.5, 1.55], [5, 0.7], [4.4, 0.2]];
  const CABIN_PROF = [[-2, 0], [2, 0], [2, 1.1], [0.5, 1.5], [-2, 1.5]];
  for (let i = 0; i < 4; i++) {
    const boat = new THREE.Group();
    const hull = extrudeProfile(HULL, 3.6, new THREE.MeshStandardMaterial({ color: boatColors[i], roughness: 0.4, metalness: 0.3 }), 0.08);
    hull.position.y = -0.3; // hull sits IN the water, not floating above it
    boat.add(hull);
    const cabin = extrudeProfile(CABIN_PROF, 2.4, new THREE.MeshStandardMaterial({ color: 0x22304e, roughness: 0.4, metalness: 0.4 }), 0.06);
    cabin.position.set(0, 1.15, -1);
    boat.add(cabin);
    const bl = makeGlow(0xffe9b0, 3.5, 0.8);
    bl.position.set(0, 3.0, -1);
    boat.add(bl);
    boat.position.set(-24 + i * 18, 0, CITY.marinaZ + 26);
    boat.rotation.y = 0.06 * (i - 1.5);
    scene.add(boat);
  }
  // crates + containers on the quay
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.85 });
  const contCols = [0x2a7a5a, 0x7a2a4a, 0x2a4a7a];
  for (let i = 0; i < 8; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), crateMat);
    crate.position.set(-40 + i * 5, 0.9, CITY.marinaZ - 6 + (i % 2) * 3);
    crate.rotation.y = rnd() * 0.8;
    scene.add(crate);
  }
  for (let i = 0; i < 3; i++) {
    const cont = roundedSlab(3, 3, 8, new THREE.MeshStandardMaterial({ color: contCols[i], roughness: 0.6, metalness: 0.4 }), 0.12);
    cont.position.set(30 + i * 11, 0, CITY.marinaZ - 4);
    scene.add(cont);
  }

  // --- rain: bright streaks, clearly visible ---
  const RAIN_N = 900;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainVel = new Float32Array(RAIN_N);
  for (let i = 0; i < RAIN_N; i++) {
    const x = (rnd() - 0.5) * 220;
    const y = rnd() * 60;
    const z = (rnd() - 0.5) * 420;
    rainPos.set([x, y, z, x + 0.35, y - 1.6, z], i * 6);
    rainVel[i] = 55 + rnd() * 35;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.5 }));
  scene.add(rain);
  animated.rain = { geo: rainGeo, vel: rainVel, n: RAIN_N };

  // distant glow domes over downtown so the horizon never goes black
  for (const [x, z, col, s] of [[-40, -190, 0xff2d95, 60], [30, -200, 0x00e5ff, 70], [0, -170, 0xffd23e, 50]]) {
    const dome = makeGlow(col, s, 0.28);
    dome.position.set(x, 26, z);
    scene.add(dome);
  }

  function update(dt) {
    // rain falls around the origin; recycle to the top
    const pos = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN_N; i++) {
      const v = rainVel[i] * dt;
      pos[i * 6 + 1] -= v;
      pos[i * 6 + 4] -= v;
      if (pos[i * 6 + 1] < 0) {
        const y = 45 + Math.random() * 15;
        pos[i * 6 + 1] = y;
        pos[i * 6 + 4] = y - 1.6;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  return { update, roadMat };
}
