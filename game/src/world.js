// SOLMAR BAY — the world: a coastal city at golden hour with CLEAR AIR.
// V15's core fix lives here: thin linear fog (380 m to 1500 m) so the skyline stays
// sharp and crisp, building windows stay visible at distance, and there is no
// whiteout. Warm palette, sun in the south-west, sea to the east, marina south-east.

var SB = window.SB || (window.SB = {});

SB.world = (function () {
  const cfg = SB.config;
  const R = SB.random;
  let scene = null;
  let sunLight = null;
  const colliders = [];
  const boats = [];
  const crewSpots = [];
  let buildingCount = 0;

  // --- procedural canvas textures -------------------------------------------

  function canvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // Ground: one 2048 px texture for the whole 700 m city — sidewalks, asphalt
  // roads with dashed centre lines, white edges and crosswalks, sand east.
  function groundTexture() {
    const S = 2048;
    const px = S / 700; // pixels per metre
    const toPx = (v) => (v + 350) * px;
    return canvasTexture(S, S, (g) => {
      g.fillStyle = '#a89f92'; // sidewalk / concrete base
      g.fillRect(0, 0, S, S);
      // Sand on the east strip.
      g.fillStyle = '#e0c896';
      g.fillRect(toPx(cfg.beachX), 0, S - toPx(cfg.beachX), S);
      // Roads.
      for (const s of cfg.streets) {
        g.fillStyle = '#3d3d41';
        g.fillRect(toPx(s - cfg.roadHalf), 0, cfg.roadHalf * 2 * px, S);
        g.fillRect(0, toPx(s - cfg.roadHalf), S, cfg.roadHalf * 2 * px);
      }
      // Centre dashes (gold) and edge lines (white).
      g.fillStyle = '#d8b25a';
      g.strokeStyle = '#e8e8e8';
      g.lineWidth = 1.5;
      for (const s of cfg.streets) {
        for (let d = -340; d < 340; d += 24) {
          g.fillRect(toPx(s) - 2, toPx(d), 4, 13);
          g.fillRect(toPx(d), toPx(s) - 2, 13, 4);
        }
        g.beginPath(); g.moveTo(toPx(s - cfg.roadHalf + 0.6), 0); g.lineTo(toPx(s - cfg.roadHalf + 0.6), S); g.stroke();
        g.beginPath(); g.moveTo(toPx(s + cfg.roadHalf - 0.6), 0); g.lineTo(toPx(s + cfg.roadHalf - 0.6), S); g.stroke();
        g.beginPath(); g.moveTo(0, toPx(s - cfg.roadHalf + 0.6)); g.lineTo(S, toPx(s - cfg.roadHalf + 0.6)); g.stroke();
        g.beginPath(); g.moveTo(0, toPx(s + cfg.roadHalf - 0.6)); g.lineTo(S, toPx(s + cfg.roadHalf - 0.6)); g.stroke();
      }
      // Crosswalks at every intersection.
      g.fillStyle = '#e8e8e8';
      for (const sx of cfg.streets) {
        for (const sz of cfg.streets) {
          for (let i = -3; i <= 3; i++) {
            g.fillRect(toPx(sx + i * 1.6) - 1, toPx(sz - cfg.roadHalf - 1.5), 2, 3);
            g.fillRect(toPx(sx + i * 1.6) - 1, toPx(sz + cfg.roadHalf - 1.5), 2, 3);
            g.fillRect(toPx(sx - cfg.roadHalf - 1.5), toPx(sz + i * 1.6) - 1, 3, 2);
            g.fillRect(toPx(sx + cfg.roadHalf - 1.5), toPx(sz + i * 1.6) - 1, 3, 2);
          }
        }
      }
    });
  }

  // Building facades: a few window-pattern variants, some windows lit warm.
  function facadeTexture(base, litRatio) {
    return canvasTexture(128, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const cols = 6, rows = 12;
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = R.next() < litRatio;
          g.fillStyle = lit ? '#ffd27a' : '#2a3542';
          g.fillRect(c * cw + 3, r * ch + 4, cw - 6, ch - 8);
        }
      }
      // Ground-floor shopfront band.
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, h - 22, w, 22);
    });
  }

  function districtAt(x, z) {
    for (const d of cfg.districts) {
      if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
    }
    return cfg.districts[3];
  }

  // --- sky, sun, lights ------------------------------------------------------

  function buildSky() {
    const skyGeo = new THREE.SphereGeometry(1800, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(cfg.skyTop) },
        horizon: { value: new THREE.Color(cfg.skyHorizon) },
        sunDir: { value: new THREE.Vector3(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]).normalize() },
        sunColor: { value: new THREE.Color(0xffe9b0) },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'varying vec3 vDir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor;',
        'void main(){',
        '  float h = clamp(vDir.y, 0.0, 1.0);',
        '  vec3 col = mix(horizon, top, pow(h, 0.65));',
        '  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);',
        '  col += sunColor * pow(s, 90.0) * 0.9 + sunColor * pow(s, 8.0) * 0.18;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}',
      ].join('\n'),
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Sun disc, low in the south-west.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(55, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false })
    );
    const d = new THREE.Vector3(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]).normalize().multiplyScalar(1650);
    disc.position.copy(d);
    disc.lookAt(0, 0, 0);
    scene.add(disc);

    // A few high, soft clouds for depth — far away, low opacity, never haze.
    const cloudTex = canvasTexture(128, 64, (g) => {
      const grad = g.createRadialGradient(64, 32, 4, 64, 32, 60);
      grad.addColorStop(0, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 64);
    });
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.55, fog: false }));
      sp.position.set(R.range(-900, 900), R.range(280, 420), R.range(-900, 900));
      sp.scale.set(R.range(220, 420), R.range(50, 90), 1);
      scene.add(sp);
    }
  }

  function buildLights() {
    const hemi = new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity);
    scene.add(hemi);
    sunLight = new THREE.DirectionalLight(cfg.sunColor, cfg.sunIntensity);
    sunLight.position.set(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(SB.lowfx ? 1024 : 2048, SB.lowfx ? 1024 : 2048);
    sunLight.shadow.camera.left = -170;
    sunLight.shadow.camera.right = 170;
    sunLight.shadow.camera.top = 170;
    sunLight.shadow.camera.bottom = -170;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 900;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    scene.add(sunLight.target);
  }

  // --- ground, roads, buildings ----------------------------------------------

  function buildGround() {
    const tex = groundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Sea: a flat, calm plane east of the sand (opaque — no reflection tricks,
    // so no wedge artefacts like the old marina bug).
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 760),
      new THREE.MeshStandardMaterial({ color: 0x2f6f8f, roughness: 0.28, metalness: 0.05 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(530, -0.35, 0);
    sea.receiveShadow = true;
    scene.add(sea);
  }

  function buildBuildings() {
    const facades = [
      facadeTexture('#e8dcc8', 0.35),
      facadeTexture('#d9c4a5', 0.3),
      facadeTexture('#cfd8de', 0.4),
      facadeTexture('#e0cfa8', 0.32),
    ];
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a5348, roughness: 0.95 });
    const streets = cfg.streets;
    for (let bx = 0; bx < streets.length - 1; bx++) {
      for (let bz = 0; bz < streets.length - 1; bz++) {
        const x0 = streets[bx] + 10, x1 = streets[bx + 1] - 10;
        const z0 = streets[bz] + 10, z1 = streets[bz + 1] - 10;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (cx > cfg.beachX - 20) continue; // beach / sea
        if (cx > 200 && cz > 100) continue; // marina basin
        const district = districtAt(cx, cz);
        const tall = district.name === 'DOWNTOWN';
        const count = R.next() < 0.45 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const w = R.range(16, count === 2 ? 26 : 34);
          const d = R.range(16, count === 2 ? 26 : 34);
          const h = tall ? R.range(24, 58) : R.range(10, 28);
          const px = count === 2 ? x0 + w / 2 + (i === 0 ? 2 : x1 - x0 - w - 2) : cx + R.range(-6, 6);
          const pz = cz + R.range(-6, 6);
          const tex = R.pick(facades).clone();
          tex.needsUpdate = true;
          tex.repeat.set(Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 14)));
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          const wall = new THREE.MeshStandardMaterial({
            map: tex, roughness: 0.85, metalness: 0.05,
            color: R.pick(cfg.buildingColors),
          });
          const geo = new THREE.BoxGeometry(w, h, d);
          const b = new THREE.Mesh(geo, [wall, wall, roofMat, roofMat, wall, wall]);
          b.position.set(px, h / 2, pz);
          b.castShadow = true;
          b.receiveShadow = true;
          scene.add(b);
          colliders.push({ x0: px - w / 2 - 0.4, z0: pz - d / 2 - 0.4, x1: px + w / 2 + 0.4, z1: pz + d / 2 + 0.4 });
          buildingCount++;
          // Rooftop clutter on some buildings.
          if (R.next() < 0.4) {
            const ac = new THREE.Mesh(
              new THREE.BoxGeometry(R.range(2, 4), 1.2, R.range(2, 4)),
              new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.9 })
            );
            ac.position.set(px + R.range(-w / 4, w / 4), h + 0.6, pz + R.range(-d / 4, d / 4));
            scene.add(ac);
          }
          if (tall && R.next() < 0.3) {
            const ant = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12, 0.12, R.range(6, 12), 6),
              new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.6 })
            );
            ant.position.set(px, h + 4, pz);
            scene.add(ant);
          }
        }
      }
    }
  }

  // --- palms -----------------------------------------------------------------

  function buildPalms() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.95 });
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.8, side: THREE.DoubleSide });
    let placed = 0;
    let guard = 0;
    while (placed < 46 && guard++ < 600) {
      const along = R.pick(cfg.streets);
      const across = R.range(-320, 320);
      const onXStreet = R.next() < 0.5;
      const x = onXStreet ? along + R.pick([-9.5, 9.5]) : across;
      const z = onXStreet ? across : along + R.pick([-9.5, 9.5]);
      if (x > cfg.beachX - 10) continue;
      if (x > 200 && z > 100) continue;
      const g = new THREE.Group();
      const lean = R.range(-0.12, 0.12);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 7), trunkMat);
      trunk.position.y = 3.5;
      trunk.rotation.z = lean;
      trunk.castShadow = true;
      g.add(trunk);
      for (let i = 0; i < 7; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 4), frondMat);
        const a = (i / 7) * Math.PI * 2;
        frond.position.set(Math.cos(a) * 1.2 + lean * 6, 7.1, Math.sin(a) * 1.2);
        frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
        frond.scale.set(1, 1, 0.28);
        frond.castShadow = true;
        g.add(frond);
      }
      g.position.set(x, 0, z);
      scene.add(g);
      placed++;
    }
  }

  // --- marina ------------------------------------------------------------------

  function buildMarina() {
    const m = cfg.marina;
    // Marina water: raised just above the ground plane (y 0.08) so the basin
    // reads as blue water, not the ground texture under it. Calm and opaque —
    // no reflection tricks, so no wedge artefacts.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(123, 110),
      new THREE.MeshStandardMaterial({ color: 0x2a6484, roughness: 0.22, metalness: 0.05 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(293.5, 0.08, m.z);
    water.receiveShadow = true;
    scene.add(water);

    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.9 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x6b543a, roughness: 0.9 });
    // Three wooden piers running east, boats moored alongside them.
    const pierZ = [m.z - 24, m.z, m.z + 24];
    for (let p = 0; p < 3; p++) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(58, 0.5, 5), wood);
      pier.position.set(258, 0.25, pierZ[p]);
      pier.castShadow = true;
      pier.receiveShadow = true;
      scene.add(pier);
      // Piles at the pier end.
      for (const dz of [-2, 2]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.4, 8), woodDark);
        pile.position.set(286, 0.6, pierZ[p] + dz);
        scene.add(pile);
      }
      // Two boats per pier, hulls long-axis east-west, moored just off the pier.
      for (let b = 0; b < 2; b++) {
        const hullColor = cfg.boatHulls[(p * 2 + b) % cfg.boatHulls.length];
        const boat = SB.cars.buildBoat(hullColor);
        const side = b === 0 ? -1 : 1;
        boat.position.set(252 + p * 4, -0.2, pierZ[p] + side * 6.5);
        scene.add(boat);
        boats.push(boat);
      }
    }
    // Crew: three people standing on the middle pier, facing south (toward the
    // marina camera), so they read clearly in the marina shot.
    const crewColors = [0xe8b93c, 0x2e6fb0, 0xd25a5a];
    for (let i = 0; i < cfg.marinaCrew; i++) {
      const person = SB.people.buildPerson(crewColors[i], 0x2a2a33);
      person.position.set(246 + i * 7, 0.5, m.z + 1.5);
      person.rotation.y = Math.PI; // face south, toward the camera
      scene.add(person);
      crewSpots.push(person.position.clone());
    }
  }

  // --- public API --------------------------------------------------------------

  return {
    colliders: colliders,
    boats: boats,
    crewSpots: crewSpots,
    buildingCount: function () { return buildingCount; },
    build: function (sc) {
      scene = sc;
      scene.fog = new THREE.Fog(cfg.fogColor, cfg.fogNear, cfg.fogFar);
      buildSky();
      buildLights();
      buildGround();
      buildBuildings();
      buildPalms();
      buildMarina();
    },
    // Keep the sun's shadow box centred on the car.
    updateSun: function (pos) {
      if (!sunLight) return;
      const d = new THREE.Vector3(cfg.sunPos[0], cfg.sunPos[1], cfg.sunPos[2]).normalize();
      sunLight.position.set(pos.x + d.x * 320, (pos.y || 0) + d.y * 320, pos.z + d.z * 320);
      sunLight.target.position.set(pos.x, 0, pos.z);
      sunLight.target.updateMatrixWorld();
    },
  };
})();
