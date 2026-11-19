// SOLMAR BAY — the city. Dusk golden hour: warm gradient sky, low sun with
// a visible glow, long shadows, neon shops lining Solmar Avenue, a marina
// with boats, Pelican Isle, Harbor Bridge, and a downtown skyline.
// Every surface is textured; buildings get setbacks, parapets and rooftop
// props so no silhouette reads as a plain box.
import * as THREE from 'three';
import { CITY, DISTRICTS, LANDMARKS, SHOPS, PALETTE, rng, pick } from './config.js';
import {
  asphaltTexture, concreteTexture, quayTexture, facadeTexture, brickTexture,
  roofTexture, awningTexture, neonSignTexture, glowTexture, waterTexture,
  woodTexture, groundTexture, sandTexture,
} from './textures.js';

const SUN_DIR = new THREE.Vector3(-0.55, 0.36, 1).normalize(); // low sun, ahead-left, clears rooftops

function skyDome() {
  const geo = new THREE.SphereGeometry(480, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      sunDir: { value: SUN_DIR },
      sunColor: { value: new THREE.Color(PALETTE.sunGlow) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
      uniform vec3 sunDir; uniform vec3 sunColor;
      void main() {
        float h = clamp(vDir.y, -0.1, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.18, 0.65, h));
        float s = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 18.0);
        col += sunColor * s * 0.5;
        float s2 = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 220.0);
        col += vec3(1.0, 0.95, 0.8) * s2 * 1.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function makeGlowSprite(texture, color, scale, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: texture, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(scale, scale, 1);
  return spr;
}

function buildPalm(rand, glowTex) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: 0.8, side: THREE.DoubleSide });
  // Curved trunk: 3 stacked, slightly offset segments.
  let y = 0, x = 0;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.02, 0.17 - i * 0.02, 1.6, 7), trunkMat);
    seg.position.set(x, y + 0.8, 0);
    seg.rotation.z = 0.08 * (i + 1) * (rand() > 0.5 ? 1 : -1);
    seg.castShadow = true;
    g.add(seg);
    x += 0.12 * (rand() > 0.5 ? 1 : -1);
    y += 1.55;
  }
  // Fronds: bent planes drooping from the crown.
  const crownY = y + 0.3;
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.PlaneGeometry(0.5, 2.6, 1, 5);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const t = (pos.getY(v) + 1.3) / 2.6; // 0 at base, 1 at tip
      pos.setZ(v, -t * t * 1.1); // droop
      pos.setX(v, pos.getX(v) * (1 - t * 0.7)); // taper
    }
    geo.computeVertexNormals();
    const frond = new THREE.Mesh(geo, frondMat);
    frond.position.set(x, crownY, 0);
    frond.rotation.y = (i / 8) * Math.PI * 2;
    frond.rotation.x = -Math.PI / 2 + 0.5 + rand() * 0.25;
    frond.translateY(1.3);
    frond.castShadow = true;
    g.add(frond);
  }
  // Coconuts: 3 small spheres under the crown.
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 }));
    nut.position.set(x + (rand() - 0.5) * 0.3, crownY - 0.15, (rand() - 0.5) * 0.3);
    g.add(nut);
  }
  return g;
}

function buildStreetlight(glowTex) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.6, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8), poleMat);
  pole.position.y = 2.6;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.7, 5.15, 0);
  g.add(arm);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0xffc46a, emissiveIntensity: 2.4 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampMat);
  lamp.position.set(1.4, 5.05, 0);
  g.add(lamp);
  const glow = makeGlowSprite(glowTex, 0xffc46a, 2.2, 0.55);
  glow.position.set(1.4, 5.05, 0);
  g.add(glow);
  // Warm pool on the ground.
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(1.4, 0.03, 0);
  g.add(pool);
  return g;
}

function buildBoat(rand) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: pick(rand, [0xe8e4da, 0x3a7ad8, 0xd84a5a, 0x2a9ab0]), roughness: 0.4, metalness: 0.2 });
  // Hull: extruded boat profile with bevel (curved, not a box).
  const s = new THREE.Shape();
  s.moveTo(-2.6, 0.3);
  s.quadraticCurveTo(-2.6, 1.0, -1.6, 1.05);
  s.lineTo(1.6, 1.05);
  s.quadraticCurveTo(2.6, 1.0, 2.6, 0.3);
  s.quadraticCurveTo(1.8, -0.15, 0, -0.2);
  s.quadraticCurveTo(-1.8, -0.15, -2.6, 0.3);
  const hullGeo = new THREE.ExtrudeGeometry(s, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2, curveSegments: 8 });
  hullGeo.translate(0, 0, -0.55);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.y = Math.PI / 2;
  hull.castShadow = true;
  g.add(hull);
  // Cabin: rounded box with windows.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.5 }));
  cabin.position.set(0, 1.25, -0.3);
  cabin.castShadow = true;
  g.add(cabin);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x10202e, roughness: 0.1, metalness: 0.8 });
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.3), winMat);
    win.position.set(sx * 0.56, 1.28, -0.3);
    win.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(win);
  }
  // Mast + antenna.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 }));
  mast.position.set(0, 2.3, 0.6);
  g.add(mast);
  return g;
}

export function buildWorld(scene, seed = 1) {
  const rand = rng(seed);
  const group = new THREE.Group();
  scene.add(group);

  // --- Sky, fog, lights ------------------------------------------------------
  scene.add(skyDome());
  scene.fog = new THREE.Fog(PALETTE.fog, 70, 430);
  scene.background = new THREE.Color(PALETTE.skyHorizon);

  const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 1.3);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(PALETTE.ambient, 0.65);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(PALETTE.sunLight, 2.0);
  sun.position.copy(SUN_DIR).multiplyScalar(160);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 20; sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  // Warm fill from the south-east, LOW (a high fill's specular on the rear
  // window blows out white in the chase shot; a low one lights the rear face).
  const fill = new THREE.DirectionalLight(0xff9a7a, 0.7);
  fill.position.set(50, 15, -80);
  scene.add(fill);

  // Sun disc + halo, low on the horizon ahead of the chase camera.
  const sunPos = SUN_DIR.clone().multiplyScalar(420);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(13, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sunCore, fog: false }));
  disc.position.copy(sunPos);
  disc.lookAt(0, 10, 0);
  scene.add(disc);
  const glowTex = glowTexture('#ffcf9a');
  const halo = makeGlowSprite(glowTex, 0xffb36b, 120, 0.55);
  halo.material.fog = false;
  halo.position.copy(sunPos);
  scene.add(halo);

  // --- Ground -----------------------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ map: groundTexture(61), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // --- Roads ------------------------------------------------------------------
  const asphalt = asphaltTexture(7);
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.42, metalness: 0.5 });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(CITY.avenueHalfWidth * 2, 290), roadMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set(CITY.avenueX, 0.02, 0);
  avenue.receiveShadow = true;
  group.add(avenue);
  for (const z of CITY.crossStreets) {
    const street = new THREE.Mesh(new THREE.PlaneGeometry(290, 10), roadMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.02, z);
    street.receiveShadow = true;
    group.add(street);
  }
  // Lane markings: dashed centre line + edge lines on the avenue.
  const markMat = new THREE.MeshBasicMaterial({ color: 0xf5f0dc });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xe8c33a });
  for (let z = -138; z < 138; z += 6) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 3), markMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.045, z);
    group.add(dash);
  }
  for (const sx of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 280), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(sx * 6.6, 0.045, 0);
    group.add(edge);
  }
  // Crosswalks at each intersection.
  for (const z of CITY.crossStreets) {
    for (let x = -6; x <= 6; x += 1.4) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.4), markMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.045, z + 6.5);
      group.add(stripe);
    }
  }

  // --- Sidewalks ---------------------------------------------------------------
  const walkMat = new THREE.MeshStandardMaterial({ map: concreteTexture(11), roughness: 0.95 });
  for (const sx of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 290), walkMat);
    walk.position.set(sx * (CITY.avenueHalfWidth + 1.7), 0.1, 0);
    walk.receiveShadow = true;
    group.add(walk);
  }

  // --- Buildings ---------------------------------------------------------------
  const facadeBases = ['#7a6a58', '#6a5a6a', '#5a6a7a', '#8a6a4a', '#6a7a6a', '#7a5a5a'];
  const roofTex = roofTexture(31);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.95 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 1 });
  const buildings = [];
  function addBuilding(x, z, w, d, floors, facadeSeed, baseColor) {
    const h = floors * 3.4;
    const facade = new THREE.MeshStandardMaterial({ map: facadeTexture(facadeSeed, baseColor), roughness: 0.85 });
    const mats = [facade, facade, roofMat, darkMat, facade, facade];
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
    buildings.push(b);
    // Setback top floor (varied silhouette — kills the plain box).
    if (floors >= 4 && rand() > 0.3) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 3.2, d * 0.6), mats);
      top.position.set(x + (rand() - 0.5) * w * 0.2, h + 1.6, z + (rand() - 0.5) * d * 0.2);
      top.castShadow = true;
      group.add(top);
    }
    // Parapet rim.
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x4a443e, roughness: 1 }));
    parapet.position.set(x, h + 0.25, z);
    group.add(parapet);
    // Rooftop props: AC units, water tank, antenna.
    const propMat = new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.7, metalness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.9), propMat);
      ac.position.set(x + (rand() - 0.5) * (w - 2), h + 0.85, z + (rand() - 0.5) * (d - 2));
      ac.castShadow = true;
      group.add(ac);
    }
    if (rand() > 0.5) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.9 }));
      tank.position.set(x + (rand() - 0.5) * (w - 3), h + 1.3, z + (rand() - 0.5) * (d - 3));
      tank.castShadow = true;
      group.add(tank);
    }
    if (rand() > 0.6) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 4, 6), propMat);
      ant.position.set(x, h + 2.5, z);
      group.add(ant);
    }
    return b;
  }

  // Avenue-facing blocks: buildings between cross streets, both sides.
  const blockEdges = [-140, ...CITY.crossStreets, 140];
  let facadeSeed = 100;
  for (let b = 0; b < blockEdges.length - 1; b++) {
    const z0 = blockEdges[b] + 8, z1 = blockEdges[b + 1] - 8;
    const depth = z1 - z0;
    if (depth < 12) continue;
    for (const sx of [-1, 1]) {
      const n = 1 + Math.floor(rand() * 2);
      const seg = depth / n;
      for (let i = 0; i < n; i++) {
        const zc = z0 + seg * (i + 0.5);
        const w = 12 + rand() * 10;
        const floors = 3 + Math.floor(rand() * 5);
        addBuilding(
          sx * (CITY.avenueHalfWidth + 3.4 + w / 2 + 1.5), zc, w, seg - 2.5,
          floors, facadeSeed++, pick(rand, facadeBases),
        );
      }
    }
  }
  // Second row (deeper blocks, taller, for skyline depth).
  for (let i = 0; i < 14; i++) {
    const sx = rand() > 0.5 ? 1 : -1;
    const z = -130 + rand() * 260;
    const w = 14 + rand() * 12;
    addBuilding(sx * (46 + rand() * 40), z, w, 12 + rand() * 10, 6 + Math.floor(rand() * 7), facadeSeed++, pick(rand, facadeBases));
  }
  // Downtown skyline far north.
  for (let i = 0; i < 9; i++) {
    const x = -90 + i * 22 + (rand() - 0.5) * 8;
    addBuilding(x, CITY.skylineZ + (rand() - 0.5) * 14, 12 + rand() * 8, 12 + rand() * 6, 14 + Math.floor(rand() * 10), facadeSeed++, pick(rand, facadeBases));
  }

  // --- Shops: neon fronts spanning the avenue (-112..+98) -----------------------
  const shopSpots = [];
  for (let z = -112; z <= 98; z += 14) {
    for (const sx of [-1, 1]) {
      if (CITY.crossStreets.some((cz) => Math.abs(z - cz) < 7)) continue;
      shopSpots.push({ z, sx });
    }
  }
  const neonGlow = glowTexture('#ffffff');
  shopSpots.forEach((spot, i) => {
    const shop = SHOPS[i % SHOPS.length];
    const x = spot.sx * (CITY.avenueHalfWidth + 3.4 + 0.4);
    const faceX = spot.sx * (CITY.avenueHalfWidth + 3.4 + 0.1);
    // Shopfront: lit glass + awning + neon sign, facing the avenue.
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a2430, emissive: 0xffc98a, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.6,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), glassMat);
    glass.position.set(faceX, 1.8, spot.z);
    glass.rotation.y = spot.sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(glass);
    // Awning: a thin striped slab sloping down from the wall toward the road.
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 9.4),
      new THREE.MeshStandardMaterial({ map: awningTexture(shop.color), roughness: 0.9 }));
    awning.position.set(faceX - spot.sx * 0.85, 3.7, spot.z);
    awning.rotation.z = spot.sx * -0.42; // outer edge drops toward the road
    awning.castShadow = true;
    group.add(awning);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.1),
      new THREE.MeshBasicMaterial({ map: neonSignTexture(shop.name, shop.color) }));
    sign.position.set(faceX, 4.9, spot.z);
    sign.rotation.y = spot.sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);
    const glow = makeGlowSprite(neonGlow, new THREE.Color(shop.color).getHex(), 7, 0.5);
    glow.position.set(faceX - spot.sx * 0.5, 4.9, spot.z);
    group.add(glow);
    // Neon reflection streak on the road below the sign — long and faint,
    // so it reads as a reflection, not a painted patch. Skipped near the
    // chase camera (a streak passing under the camera reads as a huge wedge).
    if (spot.z < -40 || spot.z > 10) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 5),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(shop.color), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false }));
      streak.rotation.x = -Math.PI / 2;
      streak.position.set(spot.sx * (CITY.avenueHalfWidth - 1.5), 0.05, spot.z);
      group.add(streak);
    }
  });

  // --- Palms + streetlights along the avenue --------------------------------------
  for (let z = -130; z <= 130; z += 13) {
    for (const sx of [-1, 1]) {
      if (CITY.crossStreets.some((cz) => Math.abs(z - cz) < 6)) continue;
      if (rand() > 0.25) {
        const palm = buildPalm(rand, glowTex);
        palm.position.set(sx * (CITY.avenueHalfWidth + 2.6), 0.22, z + (rand() - 0.5) * 4);
        palm.rotation.y = rand() * Math.PI * 2;
        group.add(palm);
      }
    }
  }
  for (let z = -130; z <= 130; z += 26) {
    for (const sx of [-1, 1]) {
      const light = buildStreetlight(glowTex);
      light.position.set(sx * (CITY.avenueHalfWidth + 0.6), 0, z);
      light.rotation.y = sx > 0 ? Math.PI : 0;
      group.add(light);
    }
  }

  // --- Marina ----------------------------------------------------------------------
  const quayMat = new THREE.MeshStandardMaterial({ map: quayTexture(13), roughness: 1.0, metalness: 0.0 });
  const quay = new THREE.Mesh(new THREE.BoxGeometry(56, 0.5, 84), quayMat);
  quay.position.set(CITY.marinaX + 6, 0.22, CITY.marinaZ);
  quay.receiveShadow = true;
  group.add(quay);
  // Marina area light: a warm pool over the quay near Rico's stance so the
  // marina foreground reads bright, not a black void. No shadow (perf).
  const quayLight = new THREE.PointLight(0xffb36a, 40, 34, 1.8);
  quayLight.position.set(CITY.marinaX + 2, 7, CITY.marinaZ);
  group.add(quayLight);
  // Water: big bay plane east of the marina.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(300, 480),
    new THREE.MeshStandardMaterial({ map: waterTexture(41), roughness: 0.18, metalness: 0.75, color: 0x9fc8dd }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(280, 0.02, 0);
  group.add(water);
  // Docks: wooden fingers into the water.
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(51), roughness: 0.9 });
  const boats = [];
  for (let i = 0; i < 4; i++) {
    const dz = -30 + i * 20;
    const dock = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 2.4), woodMat);
    dock.position.set(CITY.marinaX + 36, 0.35, dz);
    dock.castShadow = true;
    group.add(dock);
    for (const side of [-1, 1]) {
      const boat = buildBoat(rand);
      boat.position.set(CITY.marinaX + 34 + rand() * 4, 0.1, dz + side * 3.4);
      boat.rotation.y = (rand() - 0.5) * 0.2;
      group.add(boat);
      boats.push(boat);
    }
    // Dock light posts (cyan / pink glow) — angled so highlights fall AWAY
    // from the marina camera (which looks east from the quay).
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.6, metalness: 0.6 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), postMat);
    post.position.set(CITY.marinaX + 44, 1.9, dz);
    group.add(post);
    const lampColor = i % 2 ? 0xff6ab0 : 0x4ad8ff;
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: lampColor, emissiveIntensity: 2.2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampMat);
    lamp.position.set(CITY.marinaX + 44, 3.7, dz);
    group.add(lamp);
    const lampGlow = makeGlowSprite(glowTex, lampColor, 3.2, 0.6);
    lampGlow.position.set(CITY.marinaX + 44, 3.7, dz);
    group.add(lampGlow);
  }
  // Crates + bollards on the quay (mid-ground detail, no specular surfaces).
  const crateMat = new THREE.MeshStandardMaterial({ map: woodTexture(77), roughness: 1 });
  for (let i = 0; i < 10; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
    crate.position.set(CITY.marinaX - 12 + rand() * 30, 0.8, -36 + rand() * 72);
    crate.rotation.y = rand() * Math.PI;
    crate.castShadow = true;
    group.add(crate);
  }
  // Marina warehouse (brick, low, with a big door).
  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 12),
    new THREE.MeshStandardMaterial({ map: brickTexture(21), roughness: 0.9 }));
  warehouse.position.set(CITY.marinaX - 22, 3, -28);
  warehouse.castShadow = true;
  group.add(warehouse);

  // --- Beach, Pelican Isle, Harbor Bridge, Lighthouse ------------------------------
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(40, 90),
    new THREE.MeshStandardMaterial({ map: sandTexture(71), roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(132, 0.03, -90);
  group.add(sand);
  const isle = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, 2.5, 14),
    new THREE.MeshStandardMaterial({ map: sandTexture(73), roughness: 1 }));
  isle.position.set(150, 0.6, -30);
  group.add(isle);
  for (let i = 0; i < 5; i++) {
    const palm = buildPalm(rand, glowTex);
    palm.position.set(150 + (rand() - 0.5) * 18, 1.8, -30 + (rand() - 0.5) * 18);
    group.add(palm);
  }
  // Harbor Bridge: deck + towers + cables — crosses the bay NORTH of the
  // marina (z=-60), so its tower never blocks the marina camera's east view.
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xd86a4a, roughness: 0.6, metalness: 0.3 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(90, 1.2, 8), bridgeMat);
  deck.position.set(175, 6, -60);
  deck.castShadow = true;
  group.add(deck);
  for (const bx of [150, 200]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 22, 3), bridgeMat);
    tower.position.set(bx, 11, -60);
    tower.castShadow = true;
    group.add(tower);
  }
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2e });
  for (const bx of [150, 200]) {
    for (const dz of [-1, 1]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 26, 4), cableMat);
      cable.position.set(bx, 14, -60 + dz * 3.6);
      cable.rotation.z = dz * 0.5;
      cable.rotation.x = 0.35;
      group.add(cable);
    }
  }
  // Lighthouse: white/red striped tower with a lamp.
  const lh = new THREE.Group();
  const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 3, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 }));
  lhBase.position.y = 1.5;
  lh.add(lhBase);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.9 - i * 0.12, 2.0 - i * 0.12, 2.6, 12),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd83a3a : 0xf2f0e8, roughness: 0.8 }));
    band.position.y = 4.3 + i * 2.6;
    band.castShadow = true;
    lh.add(band);
  }
  const lhLamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff2b0, emissiveIntensity: 3 }));
  lhLamp.position.y = 15.2;
  lh.add(lhLamp);
  const lhGlow = makeGlowSprite(glowTex, 0xfff2b0, 8, 0.7);
  lhGlow.position.y = 15.2;
  lh.add(lhGlow);
  lh.position.set(108, 0, -105);
  group.add(lh);

  return {
    group, buildings, boats, sun, sunPos,
    // Layout summary for the minimap / city map.
    layout: {
      roads: [{ x: 0, z: 0, w: 14, h: 290, vertical: true },
        ...CITY.crossStreets.map((z) => ({ x: 0, z, w: 290, h: 10, vertical: false }))],
      water: { x0: 128, z0: -240, x1: 430, z1: 240 },
      districts: DISTRICTS,
      landmarks: LANDMARKS,
      marina: { x: CITY.marinaX, z: CITY.marinaZ },
    },
    update(dt, t) {
      // Gentle boat bob; water shimmer via light movement is skipped for perf.
      for (let i = 0; i < boats.length; i++) {
        boats[i].position.y = 0.1 + Math.sin(t * 0.7 + i * 1.3) * 0.06;
        boats[i].rotation.z = Math.sin(t * 0.5 + i) * 0.015;
      }
    },
  };
}
