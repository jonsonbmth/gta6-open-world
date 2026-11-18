// SOLMAR BAY city: night-rain coastal grid — wet avenue, neon shops, palms,
// downtown towers, marina, rain. All geometry is procedural; all signs are canvas.
import * as THREE from 'three';
import { rng, CITY, clamp } from './state.js';
import { neonSignTexture, windowsTexture, glowTexture, streakTexture } from './util.js';

export const colliders = []; // {x0,z0,x1,z1} AABBs the player and cars cannot enter
const dyn = { rain: null, rainVel: null, flicker: [], water: null, streaks: [] };

const SHOPS = [
  ['LUMEN', '#ff2d95', 'COCKTAILS'], ['VELVET', '#00e5ff', 'CLUB'], ['TIDE POOL', '#ffd23f', 'SEAFOOD'],
  ['CORAL', '#ff7a3c', 'SUSHI'], ['PIER 9', '#3dff7a', 'ARCADE'], ['MAMBO', '#ff2d95', 'DANCE'],
  ['HALO', '#00e5ff', 'HOTEL'], ['ZINC', '#ffd23f', '24H DINER'], ['OPAL', '#c77dff', 'JEWELS'],
  ['NOVA', '#ff5a64', 'BAR'], ['KAIRO', '#3dff7a', 'RAMEN'], ['SALT', '#7ee2ff', 'MARKET'],
  ['MIRA', '#ff2d95', 'TATTOO'], ['ORBIT', '#00e5ff', 'GAMES'], ['LOTUS', '#ffd23f', 'SPA'],
  ['DELTA', '#ff7a3c', 'PIZZA'], ['AZURE', '#7ee2ff', 'FISH'], ['EMBER', '#ff5a64', 'GRILL'],
];

function box(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.y = ry; return m;
}

export function buildCity(scene) {
  const GLOW = glowTexture();
  const STREAK = streakTexture();
  scene.background = new THREE.Color(0x070818);
  scene.fog = new THREE.FogExp2(0x0a0e2a, 0.0038);

  // --- lights: dim blue night, no shadow maps (fake blobs instead) ---
  scene.add(new THREE.HemisphereLight(0x2a3560, 0x0a0c18, 1.3));
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.55);
  moon.position.set(-60, 120, -80); scene.add(moon);
  const warm = new THREE.PointLight(0xffb45e, 60, 90, 1.8); warm.position.set(-52, 9, 96); scene.add(warm); // garage spill
  const marinaLight = new THREE.PointLight(0x7ee2ff, 50, 80, 1.8); marinaLight.position.set(0, 8, 278); scene.add(marinaLight);

  // --- sky dome: vertical gradient shader (own GLSL) ---
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 top = vec3(0.012,0.016,0.06);
        vec3 mid = vec3(0.07,0.07,0.22);
        vec3 hor = vec3(0.16,0.11,0.30);
        vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h));
        c = mix(c, top, smoothstep(0.2,0.65,h));
        gl_FragColor = vec4(c,1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat));

  // --- stars ---
  {
    const n = 350, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, e = 0.25 + rng() * 1.1, r = 820;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaac4ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })));
  }

  // --- ground + roads (wet asphalt) ---
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0c16, roughness: 0.9, metalness: 0.1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x0b0d1c, roughness: 0.14, metalness: 0.72 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x141828, roughness: 0.55, metalness: 0.25 });
  function roadPlane(w, d, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); scene.add(m); return m;
  }
  roadPlane(18, 640, 0, 0); // main avenue
  for (const z of CITY.crossZ) roadPlane(420, 14, 0, z); // cross streets
  // sidewalks along the avenue
  for (const sx of [-11.5, 11.5]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 640), walkMat);
    s.rotation.x = -Math.PI / 2; s.position.set(sx, 0.06, 0); scene.add(s);
  }
  // lane markings: dashed centre line + edge lines on the avenue
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8b13a });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x8a93b8 });
  for (let z = -310; z < 256; z += 12) scene.add(box(0.35, 0.02, 5, lineMat, 0, 0.02, z));
  for (const ex of [-8.6, 8.6]) scene.add(box(0.3, 0.02, 620, edgeMat, ex, 0.02, 0));
  // crosswalks at each intersection (dim, so they read as paint, not planks)
  const walkMat2 = new THREE.MeshStandardMaterial({ color: 0x8a93b8, roughness: 0.7 });
  for (const z of CITY.crossZ) for (let i = -4; i <= 4; i++) scene.add(box(1.0, 0.02, 2.0, walkMat2, i * 1.9, 0.02, z + 8.5));

  // --- reflection streaks: fake wet-road reflections under every light ---
  function addStreak(x, z, len, color, opacity = 0.55, w = 2.2) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, len),
      new THREE.MeshBasicMaterial({ map: STREAK, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; // gradient fades toward the road
    m.position.set(x, 0.04, z); scene.add(m); dyn.streaks.push(m); return m;
  }

  // --- glow sprite helper ---
  function glowSprite(x, y, z, color, scale, opacity = 0.8) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, y, z); s.scale.setScalar(scale); scene.add(s); return s;
  }

  // --- buildings: blocks between streets, window textures, neon on the avenue ---
  const facadeMats = [];
  for (let i = 0; i < 5; i++) {
    const t = windowsTexture(6 + Math.floor(rng() * 4), 10 + Math.floor(rng() * 8));
    facadeMats.push(new THREE.MeshStandardMaterial({ color: 0x11142a, roughness: 0.85, metalness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85 }));
  }
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a0c18, roughness: 0.9 });
  function building(x, z, w, d, h, mat) {
    const g = new THREE.Group();
    const body = box(w, h, d, mat, 0, h / 2, 0); g.add(body);
    g.add(box(w + 0.6, 0.5, d + 0.6, roofMat, 0, h + 0.2, 0));
    // rooftop props: AC box + antenna with blinking light
    g.add(box(2, 1.2, 2, roofMat, w * 0.25, h + 1, d * 0.2));
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 4), roofMat);
    ant.position.set(-w * 0.3, h + 3, 0); g.add(ant);
    const tip = glowSprite(-w * 0.3, h + 6.2, 0, 0xff3b30, 2.2, 0.9); g.add(tip);
    dyn.flicker.push({ s: tip, phase: rng() * 10 });
    g.position.set(x, 0, z); scene.add(g);
    colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    return g;
  }
  // blocks: rows between cross streets, columns east/west of the avenue
  const zRows = [-280, -150, -50, 50, 150, 230];
  for (const zc of zRows) {
    for (const xc of [-160, -95, -45, 45, 95, 160]) {
      if (zc === 230 && Math.abs(xc) < 100) continue; // marina approach stays open
      const w = 26 + rng() * 14, d = 26 + rng() * 12, h = 9 + rng() * 26;
      building(xc + (rng() - 0.5) * 8, zc + (rng() - 0.5) * 8, w, d, h, facadeMats[Math.floor(rng() * facadeMats.length)]);
    }
  }
  // downtown towers far north
  for (let i = 0; i < 14; i++) {
    const x = -190 + rng() * 380, h = 45 + rng() * 55;
    building(x, -290 - rng() * 40, 22 + rng() * 14, 22 + rng() * 14, h, facadeMats[Math.floor(rng() * facadeMats.length)]);
  }
  // skyline silhouette ring (cheap dark boxes with lit windows, far away)
  const skyMat2 = facadeMats[1];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.1, r = 420 + rng() * 80;
    const b = box(30 + rng() * 30, 60 + rng() * 90, 30, skyMat2, Math.cos(a) * r, 0, Math.sin(a) * r);
    b.position.y = b.geometry.parameters.height / 2; scene.add(b);
  }

  // --- neon shopfronts along the avenue (both sides) ---
  let shopIdx = 0;
  for (let z = -195; z <= 195; z += 26) {
    for (const side of [-1, 1]) {
      if (rng() < 0.18) continue;
      const [name, color, sub] = SHOPS[shopIdx++ % SHOPS.length];
      const x = side * 14.5;
      // shopfront box
      const front = box(0.6, 7, 18, new THREE.MeshStandardMaterial({ color: 0x0d1020, roughness: 0.7 }), x, 3.5, z);
      scene.add(front);
      // lit shop window
      const win = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.4),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }));
      win.position.set(x - side * 0.4, 2.2, z); win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(win);
      // neon sign above
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25),
        new THREE.MeshBasicMaterial({ map: neonSignTexture(name, color, sub), transparent: false }));
      sign.position.set(x - side * 0.5, 5.6, z); sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(sign);
      glowSprite(x - side * 1.6, 5.6, z, new THREE.Color(color), 7, 0.5);
      // wet-road reflection streak from the sign onto the avenue
      addStreak(side * 6.5, z, 24 + rng() * 12, new THREE.Color(color), 0.6, 4 + rng() * 2);
      colliders.push({ x0: x - 0.8, x1: x + 0.8, z0: z - 9.5, z1: z + 9.5 });
    }
  }

  // --- streetlights: warm pools along the avenue + cross streets ---
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1e30, roughness: 0.6, metalness: 0.7 });
  function streetlight(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 8, 6), poleMat);
    pole.position.y = 4; g.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc46b }));
    lamp.position.set(0, 8.2, 0); g.add(lamp);
    const gl = glowSprite(0, 8.2, 0, 0xffc46b, 6, 0.55); g.add(gl);
    // warm pool on the ground
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 20),
      new THREE.MeshBasicMaterial({ color: 0xff9d2e, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.05; g.add(pool);
    g.position.set(x, 0, z); scene.add(g);
    addStreak(x * 0.55, z, 14, 0xffb45e, 0.42, 3);
  }
  for (let z = -210; z <= 210; z += 30) { streetlight(-10.5, z); streetlight(10.5, z + 15); }
  for (const z of CITY.crossZ) { streetlight(-60, z - 9); streetlight(60, z + 9); }

  // --- palms: dark silhouettes framing the avenue ---
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x0c1a10, roughness: 1, side: THREE.DoubleSide });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 7.5, 6), trunkMat);
    trunk.position.y = 3.7; trunk.rotation.z = (rng() - 0.5) * 0.18; g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.7, 5.2, 4), frondMat);
      const a = (i / 7) * Math.PI * 2;
      f.position.set(Math.cos(a) * 1.7, 7.6, Math.sin(a) * 1.7);
      f.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      f.scale.set(1, 1, 0.28); g.add(f);
    }
    g.position.set(x, 0, z); scene.add(g);
    colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 });
  }
  for (let z = -205; z <= 235; z += 22) { palm(-13.6, z); palm(13.6, z + 11); }

  // --- Lena's garage (west side) ---
  {
    const g = new THREE.Group();
    g.add(box(20, 8, 14, new THREE.MeshStandardMaterial({ color: 0x18203a, roughness: 0.7 }), 0, 4, 0));
    const door = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.4),
      new THREE.MeshStandardMaterial({ color: 0x2a3358, roughness: 0.4, metalness: 0.6 }));
    door.position.set(10.1, 2.8, 0); door.rotation.y = Math.PI / 2; g.add(door);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.6),
      new THREE.MeshBasicMaterial({ map: neonSignTexture("LENA'S", '#3dff7a', 'GARAGE · REPAIRS') }));
    sign.position.set(10.2, 7, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
    glowSprite(11, 7, 0, 0x3dff7a, 8, 0.5); g.add(glowSprite(11, 3, 0, 0xffc46b, 9, 0.35));
    g.position.set(CITY.garage.x, 0, CITY.garage.z); scene.add(g);
    colliders.push({ x0: CITY.garage.x - 10, x1: CITY.garage.x + 10, z0: CITY.garage.z - 7, z1: CITY.garage.z + 7 });
  }

  // --- impound lot (east side): fence + parked cars area ---
  {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x39406a, roughness: 0.5, metalness: 0.8 });
    for (let i = 0; i < 12; i++) {
      const p = box(0.25, 3, 0.25, fenceMat, CITY.impound.x - 16 + i * 3, 1.5, CITY.impound.z - 12);
      scene.add(p);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4),
      new THREE.MeshBasicMaterial({ map: neonSignTexture('IMPOUND', '#ffd23f', 'SBPD LOT 4') }));
    sign.position.set(CITY.impound.x, 5.5, CITY.impound.z - 12); scene.add(sign);
    glowSprite(CITY.impound.x, 5.5, CITY.impound.z - 11, 0xffd23f, 7, 0.45);
  }

  // --- marina: water, docks, boats, crates ---
  {
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x06122e, roughness: 0.08, metalness: 0.9,
      emissive: 0x0a1e42, emissiveIntensity: 0.7 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(460, 150), waterMat);
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.06, 345); scene.add(water);
    dyn.water = water;
    // concrete quay between the avenue's end and the water
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(460, 16),
      new THREE.MeshStandardMaterial({ color: 0x181c2c, roughness: 0.8 }));
    quay.rotation.x = -Math.PI / 2; quay.position.set(0, 0.04, 264); scene.add(quay);
    // moon/neon streak on the water
    addStreak(0, 330, 90, 0x7ee2ff, 0.4, 34);
    // dock lamps: warm posts with glow along the quay
    for (const dx of [-80, -40, 0, 40, 80]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), poleMat);
      post.position.set(dx, 2.5, 262); scene.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffc46b }));
      lamp.position.set(dx, 5.2, 262); scene.add(lamp);
      glowSprite(dx, 5.2, 262, 0xffc46b, 6, 0.7);
    }
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x2a1f14, roughness: 0.9 });
    for (const dx of [-60, -20, 20, 60]) {
      scene.add(box(4, 0.7, 34, dockMat, dx, 0.4, 282));
      for (let k = 0; k < 5; k++) scene.add(box(0.5, 1.6, 0.5, dockMat, dx - 2.4, 0.8, 270 + k * 7));
      // boat beside the dock
      const boat = new THREE.Group();
      const hull = box(3.4, 1.6, 9, new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.35 }), 0, 0.8, 0);
      boat.add(hull);
      boat.add(box(2.2, 1.4, 3.4, new THREE.MeshStandardMaterial({ color: 0x22335c, roughness: 0.4 }), 0, 2.2, -0.5));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7, 5), dockMat);
      mast.position.set(0, 5, 1.5); boat.add(mast);
      const bl = glowSprite(0, 8.6, 1.5, 0xffe9a8, 3, 0.8); boat.add(bl);
      boat.position.set(dx + 5.5, 0, 282 + (rng() - 0.5) * 6);
      boat.rotation.y = (rng() - 0.5) * 0.2; scene.add(boat);
    }
    // crates + containers on the quay
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x6e4a22, roughness: 0.9 });
    const contMat = new THREE.MeshStandardMaterial({ color: 0x274d6e, roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < 10; i++) {
      const cx = -90 + rng() * 180, cz = 252 + rng() * 10;
      scene.add(box(2 + rng() * 1.5, 2 + rng() * 1.5, 2 + rng() * 1.5, rng() < 0.5 ? crateMat : contMat, cx, 1.2, cz, rng() * 0.6));
    }
    // harbour sign
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.8),
      new THREE.MeshBasicMaterial({ map: neonSignTexture('OLD HARBOUR', '#00e5ff', 'MARINA · PIER 9') }));
    sign.position.set(-30, 8, 252); scene.add(sign);
    glowSprite(-30, 8, 251, 0x00e5ff, 9, 0.5);
  }

  // --- rain: falling streaks in a box around the origin, recycled ---
  {
    const N = 1400;
    const pos = new Float32Array(N * 6);
    dyn.rainVel = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (rng() - 0.5) * 220, y = rng() * 60, z = (rng() - 0.5) * 220;
      pos.set([x, y, z, x - 0.35, y - 1.6, z + 0.12], i * 6);
      dyn.rainVel[i] = 42 + rng() * 22;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dyn.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9db8e8, transparent: true, opacity: 0.5 }));
    dyn.rain.frustumCulled = false; scene.add(dyn.rain);
  }

  // --- puddles: dark glossy discs that catch the streak glow ---
  {
    const pudMat = new THREE.MeshStandardMaterial({ color: 0x0d1226, roughness: 0.05, metalness: 0.95 });
    for (let i = 0; i < 26; i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(1.5 + rng() * 3.5, 18), pudMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set((rng() - 0.5) * 16, 0.03, -240 + rng() * 480);
      p.scale.y = 0.6 + rng() * 0.8; scene.add(p);
    }
  }
}

export function updateCity(dt, t, camX, camZ) {
  // rain falls and recycles around the camera
  if (dyn.rain) {
    const pos = dyn.rain.geometry.attributes.position.array;
    const N = dyn.rainVel.length;
    for (let i = 0; i < N; i++) {
      const v = dyn.rainVel[i] * dt;
      pos[i * 6 + 1] -= v; pos[i * 6 + 4] -= v;
      if (pos[i * 6 + 1] < 0) {
        const x = camX + (rng() - 0.5) * 220, z = camZ + (rng() - 0.5) * 220, y = 45 + rng() * 15;
        pos.set([x, y, z, x - 0.35, y - 1.6, z + 0.12], i * 6);
      }
    }
    dyn.rain.geometry.attributes.position.needsUpdate = true;
    dyn.rain.position.set(camX, 0, camZ);
  }
  // antenna tips blink
  for (const f of dyn.flicker) f.s.material.opacity = (Math.sin(t * 2 + f.phase) > 0.2) ? 0.9 : 0.08;
  // water shimmer
  if (dyn.water) dyn.water.material.roughness = 0.06 + Math.sin(t * 0.7) * 0.03;
}

// Cheap circle-vs-AABB collision resolve (player and cars).
export function resolveCollision(x, z, r) {
  for (const c of colliders) {
    const nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1);
    const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 1e-6) { x = c.x1 + r; continue; }
      const d = Math.sqrt(d2), push = (r - d) / d;
      x += dx * push; z += dz * push;
    }
  }
  // world bounds
  x = clamp(x, CITY.west, CITY.east);
  z = clamp(z, CITY.north, CITY.south + 30);
  return { x, z };
}
