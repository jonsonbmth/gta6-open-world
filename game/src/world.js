// SOLMAR BAY city: a neon coastal city in a rainstorm, built procedurally
// from a seed. Dark asphalt (never a gold wash), canvas-texture facades with
// lit windows, neon shop fronts spanning the whole avenue, palms, street
// lights with additive light pools (wet-road reflections are faked with glow
// sprites, NOT specular reflection), a marina with rough dark quay tops, rain,
// stars and a moon.
//
// WEDGE PREVENTION (V9's marina shot grew a giant translucent tan wedge from
// a specular streak on a smooth surface, amplified by bloom): every ground
// surface under a light is ROUGH (roughness ~1) and DARK, so no surface can
// throw a sharp specular streak, and the bloom threshold stays high.
import * as THREE from 'three';
import { mulberry32, rand, pick } from './util.js';

export const AVENUE = { minZ: -112, maxZ: 98, halfWidth: 7 };
export const MARINA = { quayZ: 40, x0: 30, x1: 68 };

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  return canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
}

let _glowTex = null;
export function makeGlowSprite(color, scale, opacity = 0.8) {
  if (!_glowTex) _glowTex = glowTexture();
  const mat = new THREE.SpriteMaterial({
    map: _glowTex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false, // glows must not be eaten by distance fog
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// A facade texture: dark concrete with a grid of lit windows (warm + cool).
function facadeTexture(rng, floors, cols) {
  return canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#0d0d18';
    g.fillRect(0, 0, w, h);
    const cw = w / cols;
    const ch = h / floors;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        if (rng() < 0.32) continue; // dark window
        const warm = rng() < 0.6;
        g.fillStyle = warm
          ? `rgba(255,${180 + Math.floor(rng() * 60)},90,${0.75 + rng() * 0.25})`
          : `rgba(140,220,255,${0.7 + rng() * 0.3})`;
        g.fillRect(c * cw + cw * 0.22, f * ch + ch * 0.25, cw * 0.56, ch * 0.5);
      }
    }
  });
}

// A neon shop sign texture with glowing text.
function signTexture(text, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#05050c';
    g.fillRect(0, 0, w, h);
    g.font = 'bold 64px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 28;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 8;
    g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2);
  });
}

const SIGN_WORDS = [
  ['AZURE', '#22d3ee'], ['BAR', '#f472b6'], ['NOODLE', '#fbbf24'],
  ['24H TACOS', '#fb923c'], ['NEON MOTEL', '#e879f9'], ['KTV', '#a78bfa'],
  ['ARCADE', '#34d399'], ['COFFEE', '#fca5a5'], ['RAMEN', '#facc15'],
  ['HOTEL LUNA', '#93c5fd'], ['CLUB VELVET', '#f472b6'], ['PIZZA', '#fdba74'],
  ['BODEGA', '#86efac'], ['LIQUOR', '#fda4af'], ['GYM', '#67e8f9'],
  ['PHARMACY', '#a5f3fc'],
];

function makeBuilding(rng, type, w, d, h) {
  const group = new THREE.Group();
  const facade = facadeTexture(rng, Math.max(4, Math.floor(h / 3)), Math.max(3, Math.floor(w / 3)));
  const side = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.9, metalness: 0.05 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x11111c, roughness: 1 });

  if (type === 2) {
    // Stepped tower: two stacked slabs, the top one smaller and rotated 0 deg.
    const lower = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.62, d), [side, side, roof, roof, side, side]);
    lower.position.y = h * 0.31;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.38, d * 0.62), [side, side, roof, roof, side, side]);
    upper.position.y = h * 0.62 + h * 0.19;
    group.add(lower, upper);
  } else if (type === 3) {
    // Cylindrical tower with a lit crown ring.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.55, h, 20), side);
    body.position.y = h / 2;
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(w * 0.52, 0.18, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5da2 }),
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.y = h + 0.2;
    group.add(body, crown);
  } else if (type === 1) {
    // Slab tower with a vertical neon edge strip.
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
    body.position.y = h / 2;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, h * 0.9, 0.25),
      new THREE.MeshBasicMaterial({ color: pick(rng, [0x22d3ee, 0xf472b6, 0xfacc15]) }),
    );
    strip.position.set(w / 2 + 0.1, h * 0.45, d / 2 + 0.1);
    group.add(body, strip);
  } else {
    // Low block with a rooftop water tank (cylinder + cone cap).
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
    body.position.y = h / 2;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.8 }));
    tank.position.set(w * 0.2, h + 1.4, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0x2c2c38, roughness: 0.8 }));
    cap.position.set(w * 0.2, h + 2.9, 0);
    group.add(body, tank, cap);
  }
  return group;
}

function makePalm(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3421, roughness: 1 });
  // Curved trunk from three stacked, slightly offset segments.
  let x = 0;
  let y = 0;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.6, 7), trunkMat);
    seg.position.set(x, y + 0.8, 0);
    seg.rotation.z = 0.12 * i;
    group.add(seg);
    x += 0.3;
    y += 1.5;
  }
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x1d5c33, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 4), frondMat);
    frond.scale.set(1, 1, 0.18);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(x + Math.cos(a) * 0.9, y + 0.4, Math.sin(a) * 0.9);
    frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    group.add(frond);
  }
  return group;
}

function makeStreetlight() {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.7, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7, 8), poleMat);
  pole.position.y = 3.5;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), poleMat);
  arm.position.set(0.7, 6.9, 0);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
  );
  head.position.set(1.4, 6.8, 0);
  const glow = makeGlowSprite(0xffe9a8, 3.2, 0.55);
  glow.position.copy(head.position);
  // Light pool on the road: a flat additive disc (fakes wet asphalt safely).
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 24),
    new THREE.MeshBasicMaterial({
      map: glowTexture(),
      color: 0xffdf8a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(1.4, 0.05, 0);
  group.add(pole, arm, head, glow, pool);
  return group;
}

function makeBoat(rng) {
  const group = new THREE.Group();
  // Hull from an extruded side profile (pointed bow, flat stern).
  const s = new THREE.Shape();
  s.moveTo(-2.4, 0);
  s.lineTo(2.6, 0);
  s.lineTo(1.8, 0.9);
  s.lineTo(-1.6, 0.9);
  s.lineTo(-2.4, 0);
  const hullGeo = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  hullGeo.translate(0, 0, -0.7);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({
    color: pick(rng, [0xe8e8f0, 0x274b73, 0x7a2020]), roughness: 0.35, metalness: 0.4,
  }));
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f5, roughness: 0.5 }),
  );
  cabin.position.set(-0.3, 1.3, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.5 }));
  mast.position.set(0.6, 1.8, 0);
  const lamp = makeGlowSprite(0xfff2c0, 1.4, 0.7);
  lamp.position.set(0.6, 2.9, 0);
  group.add(hull, cabin, mast, lamp);
  return group;
}

export function buildWorld(scene, seed = 1) {
  const rng = mulberry32(seed);
  const root = new THREE.Group();
  scene.add(root);
  const animated = [];

  // --- Ground: dark, rough, never gold. ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // --- Avenue road (Solmar Avenue, along Z) + cross streets. ---
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x12121c, roughness: 0.85, metalness: 0.05 });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(14, AVENUE.maxZ - AVENUE.minZ), roadMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(0, 0.01, (AVENUE.minZ + AVENUE.maxZ) / 2);
  avenue.receiveShadow = true;
  root.add(avenue);
  const crossZ = [-80, -40, 0, 40, 80];
  for (const z of crossZ) {
    const street = new THREE.Mesh(new THREE.PlaneGeometry(180, 9), roadMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.01, z);
    root.add(street);
  }
  // Lane dashes (dim, not glowing gold).
  const dashMat = new THREE.MeshBasicMaterial({ color: 0x8a8a9a });
  for (let z = AVENUE.minZ + 4; z < AVENUE.maxZ - 4; z += 8) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.03, z);
    root.add(dash);
  }
  // Sidewalks.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a26, roughness: 1 });
  for (const sx of [-9, 9]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(4, AVENUE.maxZ - AVENUE.minZ), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(sx, 0.02, (AVENUE.minZ + AVENUE.maxZ) / 2);
    root.add(walk);
  }

  // --- Buildings in blocks on both sides of the avenue. ---
  const blocks = [];
  for (let z = -104; z <= 92; z += 24) {
    for (const sx of [-1, 1]) blocks.push({ x: sx * (16 + rand(rng, 0, 8)), z: z + rand(rng, -3, 3) });
  }
  for (const b of blocks) {
    const type = Math.floor(rand(rng, 0, 4));
    const h = type === 0 ? rand(rng, 7, 12) : rand(rng, 14, 42);
    const bld = makeBuilding(rng, type, rand(rng, 10, 16), rand(rng, 10, 16), h);
    bld.position.set(b.x, 0, b.z);
    root.add(bld);
  }

  // --- Shops spanning the FULL avenue (neon must reach the chase camera). ---
  let signIdx = 0;
  for (let z = AVENUE.minZ; z <= AVENUE.maxZ - 10; z += 11) {
    for (const sx of [-1, 1]) {
      const [word, color] = SIGN_WORDS[signIdx++ % SIGN_WORDS.length];
      const front = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 5.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.9 }),
      );
      front.position.set(sx * 12.6, 2.6, z + 5);
      root.add(front);
      // Lit shop window.
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, 2.4),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }),
      );
      win.position.set(sx * 10.85, 1.5, z + 5);
      win.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      root.add(win);
      // Neon sign above the window.
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(7.5, 1.9),
        new THREE.MeshBasicMaterial({ map: signTexture(word, color), transparent: false }),
      );
      sign.position.set(sx * 10.85, 4.2, z + 5);
      sign.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      root.add(sign);
      const glow = makeGlowSprite(new THREE.Color(color), 5, 0.35);
      glow.position.set(sx * 10.2, 4.2, z + 5);
      root.add(glow);
    }
  }

  // --- Palms + streetlights along the avenue. ---
  for (let z = AVENUE.minZ + 6; z < AVENUE.maxZ; z += 16) {
    const palm = makePalm(rng);
    palm.position.set(z % 32 < 16 ? -11.5 : 11.5, 0, z);
    root.add(palm);
    const lamp = makeStreetlight();
    lamp.position.set(z % 32 < 16 ? 8.2 : -8.2, 0, z + 8);
    lamp.rotation.y = z % 32 < 16 ? Math.PI : 0;
    root.add(lamp);
  }
  // A few real point lights down the avenue (sparse: 4, for perf).
  for (const z of [-70, -20, 30, 80]) {
    const pl = new THREE.PointLight(0xffd9a0, 60, 42, 1.8);
    pl.position.set(0, 8, z);
    root.add(pl);
  }

  // --- Marina / docks (east side). Quay tops are ROUGH + DARK: no streak. ---
  const quayMat = new THREE.MeshStandardMaterial({ color: 0x241c15, roughness: 1, metalness: 0 });
  const quay = new THREE.Mesh(new THREE.BoxGeometry(38, 0.6, 44), quayMat);
  quay.position.set(49, 0.3, MARINA.quayZ);
  quay.receiveShadow = true;
  root.add(quay);
  // Wooden dock fingers into the bay.
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 1, metalness: 0 });
  for (const dz of [26, 40, 54]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 3), dockMat);
    dock.position.set(72, 0.4, dz);
    root.add(dock);
  }
  // Bay water: dark, matte-ish (no mirror streaks).
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 200),
    new THREE.MeshStandardMaterial({ color: 0x06121f, roughness: 0.55, metalness: 0.15 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(120, 0.05, 40);
  root.add(water);
  // Moored boats.
  for (let i = 0; i < 5; i++) {
    const boat = makeBoat(rng);
    boat.position.set(76 + rand(rng, 0, 10), 0.15, 22 + i * 9);
    boat.rotation.y = rand(rng, -0.2, 0.2);
    root.add(boat);
    animated.push({ obj: boat, baseY: 0.15, phase: rng() * 6 });
  }
  // Lamp poles on the quay at z = 26 / 55 / 84 (V9 fix), lights to the SIDES.
  for (const dz of [26, 55, 84]) {
    const lamp = makeStreetlight();
    lamp.position.set(34, 0.6, dz);
    lamp.rotation.y = Math.PI / 2;
    root.add(lamp);
  }
  // Two marina point lights: one behind the quay, one FORWARD over the docks
  // so the marina shot's subject is lit. Quay tops are rough + dark, so no
  // specular streak can form (V10 wedge prevention).
  const m1 = new THREE.PointLight(0xffc98a, 50, 36, 1.8);
  m1.position.set(33, 7, 30);
  const m2 = new THREE.PointLight(0x9fd8ff, 55, 40, 1.8);
  m2.position.set(58, 7, 48);
  root.add(m1, m2);
  // Dock-edge glow posts so the waterline reads at night.
  for (const [dx, dz, col] of [[66, 28, 0x22d3ee], [66, 52, 0xf472b6]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.7 }));
    post.position.set(dx, 1.6, dz);
    const lampGlow = makeGlowSprite(col, 3.4, 0.8);
    lampGlow.position.set(dx, 3.0, dz);
    root.add(post, lampGlow);
  }
  // Crates + barrels on the quay (set dressing, rough materials).
  for (let i = 0; i < 8; i++) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(rand(rng, 1, 2), rand(rng, 1, 1.8), rand(rng, 1, 2)),
      new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 1 }),
    );
    crate.position.set(rand(rng, 36, 60), 0.9, rand(rng, 22, 58));
    crate.rotation.y = rand(rng, 0, 3);
    root.add(crate);
  }

  // --- Sky: stars + moon glow. ---
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = rng() * Math.PI * 2;
    const e = rand(rng, 0.15, 1.4);
    const r = 320;
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xcdd8ff, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false,
  }));
  root.add(stars);
  const moon = makeGlowSprite(0xdfe8ff, 26, 0.9);
  moon.position.set(-120, 150, -180);
  root.add(moon);
  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2f6ff, fog: false }),
  );
  moonDisc.position.set(-120, 150, -180);
  moonDisc.lookAt(0, 0, 0);
  root.add(moonDisc);

  // --- Rain: falling streak points around the origin. ---
  const RAIN_N = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_N * 3);
  const rainVel = new Float32Array(RAIN_N);
  for (let i = 0; i < RAIN_N; i++) {
    rainPos[i * 3] = rand(rng, -120, 120);
    rainPos[i * 3 + 1] = rand(rng, 0, 60);
    rainPos[i * 3 + 2] = rand(rng, -120, 120);
    rainVel[i] = rand(rng, 22, 34);
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const streakTex = canvasTexture(16, 64, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(180,200,255,0)');
    grad.addColorStop(0.5, 'rgba(180,200,255,0.7)');
    grad.addColorStop(1, 'rgba(180,200,255,0)');
    g.fillStyle = grad;
    g.fillRect(6, 0, 4, 64);
  });
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    map: streakTex, color: 0xaec6ff, size: 1.6, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  root.add(rain);

  function update(dt, t) {
    // Rain falls and wraps.
    const pos = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN_N; i++) {
      pos[i * 3 + 1] -= rainVel[i] * dt;
      pos[i * 3] -= 2.5 * dt; // slight wind slant
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 60;
        pos[i * 3] = rand(rng, -120, 120);
        pos[i * 3 + 2] = rand(rng, -120, 120);
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
    // Boats bob gently.
    for (const b of animated) {
      b.obj.position.y = b.baseY + Math.sin(t * 0.7 + b.phase) * 0.12;
      b.obj.rotation.z = Math.sin(t * 0.5 + b.phase) * 0.02;
    }
  }

  return { root, update, avenue: AVENUE, marina: MARINA };
}
