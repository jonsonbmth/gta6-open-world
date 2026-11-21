// SOLSTICE BAY — 3D models built from CURVED geometry only. This is the
// anti-Minecraft file: no box-body cars, no cube people, no plain boxes.
// Cars are extruded side-profiles with bevelled edges; people are capsules
// and spheres; palms are curved tubes with drooping fronds.
window.SB = window.SB || {};
SB.Models = (function () {
  const M = {};
  function std(color, rough, metal, extra) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.7 : rough, metalness: metal || 0 });
    if (extra) Object.assign(m, extra);
    return m;
  }
  function mesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // ---- CAR: side-profile shape with a curved roofline, extruded + bevelled.
  // Forward is +X. The silhouette must read as a CAR, never a brick.
  function carBodyGeo() {
    const s = new THREE.Shape();
    s.moveTo(-2.30, 0.34);                                    // tail bottom
    s.quadraticCurveTo(-2.38, 0.95, -2.02, 1.02);             // tail curve up
    s.lineTo(-1.25, 1.06);                                    // rear deck
    s.quadraticCurveTo(-0.72, 1.62, -0.12, 1.66);             // rear glass -> roof
    s.lineTo(0.55, 1.66);                                     // roof
    s.quadraticCurveTo(1.18, 1.60, 1.58, 1.08);               // windshield slope
    s.lineTo(2.14, 1.00);                                     // hood
    s.quadraticCurveTo(2.40, 0.94, 2.36, 0.55);               // nose curve down
    s.quadraticCurveTo(2.32, 0.34, 2.02, 0.34);               // nose bottom
    s.lineTo(-2.30, 0.34);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 1.66, bevelEnabled: true, bevelThickness: 0.14,
      bevelSize: 0.12, bevelSegments: 4, curveSegments: 18,
    });
    g.translate(0, 0, -0.83);
    return g;
  }
  function wheel() {
    const w = new THREE.Group();
    const tire = mesh(new THREE.TorusGeometry(0.33, 0.14, 14, 28), std(0x17181c, 0.9, 0), 0, 0, 0);
    const hub = mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 20), std(0xd8dde2, 0.25, 0.9), 0, 0, 0);
    hub.rotation.x = Math.PI / 2;
    const cap = mesh(new THREE.SphereGeometry(0.07, 12, 10), std(0x8a9096, 0.3, 0.9), 0, 0, 0.09);
    // 5 spokes as slim cylinders radiating from the hub
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const sp = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.3, 6), std(0xb9bfc6, 0.3, 0.9), Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.06);
      sp.rotation.z = a + Math.PI / 2;
      w.add(sp);
    }
    w.add(tire, hub, cap);
    return w;
  }
  M.car = function (opts) {
    const o = opts || {};
    const g = new THREE.Group();
    const paint = new THREE.MeshPhysicalMaterial({
      color: o.color || 0xc2242e, roughness: 0.32, metalness: 0.55,
      clearcoat: 0.9, clearcoatRoughness: 0.25,
    });
    const body = mesh(carBodyGeo(), paint, 0, 0, 0);
    g.add(body);
    // windshield + rear glass: dark glossy planes laid on the slopes.
    // Plane local X spans the car width after rotation.y; local Y runs along
    // the slope. Slope angle from horizontal ≈ 0.52 rad.
    const glass = new THREE.MeshStandardMaterial({ color: 0x0d1b28, roughness: 0.08, metalness: 0.9, side: THREE.DoubleSide });
    const ws = mesh(new THREE.PlaneGeometry(1.18, 1.05), glass, 1.08, 1.40, 0);
    ws.rotation.order = 'YXZ';
    ws.rotation.y = Math.PI / 2;
    ws.rotation.x = -(Math.PI / 2 - 0.52);
    const rw = mesh(new THREE.PlaneGeometry(1.05, 0.95), glass, -0.70, 1.40, 0);
    rw.rotation.order = 'YXZ';
    rw.rotation.y = -Math.PI / 2;
    rw.rotation.x = -(Math.PI / 2 - 0.52);
    g.add(ws, rw);
    // side windows: thin dark band along the cabin, just outside the bevel
    const side = mesh(new THREE.PlaneGeometry(1.5, 0.42), glass, 0.2, 1.42, 0.98);
    const side2 = side.clone(); side2.position.z = -0.98; side2.rotation.y = Math.PI;
    g.add(side, side2);
    // wheels (kept in userData so the game loop can spin + steer them)
    const wheels = {};
    for (const [key, x, z] of [['fl', 1.45, 0.86], ['fr', 1.45, -0.86], ['rl', -1.45, 0.86], ['rr', -1.45, -0.86]]) {
      const w = wheel();
      w.position.set(x, 0.47, z);
      wheels[key] = w;
      g.add(w);
    }
    g.userData.wheels = wheels;
    // rounded bumpers: flattened spheres, chrome-dark
    const bump = std(0x2a2d33, 0.4, 0.7);
    const bF = mesh(new THREE.SphereGeometry(0.5, 16, 12), bump, 2.28, 0.42, 0);
    bF.scale.set(0.45, 0.28, 1.85);
    const bR = bF.clone(); bR.position.x = -2.28;
    g.add(bF, bR);
    // headlights / taillights: emissive rounded lenses
    const hl = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.6, roughness: 0.2 });
    const tl = new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2222, emissiveIntensity: 1.4, roughness: 0.2 });
    for (const z of [0.55, -0.55]) {
      const h = mesh(new THREE.SphereGeometry(0.14, 12, 10), hl, 2.32, 0.82, z);
      h.scale.set(0.5, 0.55, 1.1);
      const t = mesh(new THREE.SphereGeometry(0.13, 12, 10), tl, -2.34, 0.84, z);
      t.scale.set(0.5, 0.55, 1.2);
      g.add(h, t);
    }
    // mirrors: stalk + rounded head
    for (const z of [0.98, -0.98]) {
      const stalk = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), std(0x1a1a1e, 0.6, 0.4), 0.95, 1.28, z * 0.96);
      stalk.rotation.x = Math.PI / 2;
      const head = mesh(new THREE.SphereGeometry(0.09, 10, 8), paint, 0.95, 1.28, z);
      head.scale.set(1.4, 0.8, 0.6);
      g.add(stalk, head);
    }
    if (o.police) {
      // light bar: dark capsule + red/blue emissive domes
      const bar = mesh(new THREE.CapsuleGeometry(0.09, 0.85, 4, 10), std(0x14161a, 0.5, 0.5), 0.2, 1.78, 0);
      bar.rotation.x = Math.PI / 2;
      const red = new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0xff2020, emissiveIntensity: 2.2 });
      const blue = new THREE.MeshStandardMaterial({ color: 0x0022cc, emissive: 0x2255ff, emissiveIntensity: 2.2 });
      const dR = mesh(new THREE.SphereGeometry(0.12, 12, 10), red, 0.2, 1.86, 0.3);
      const dB = mesh(new THREE.SphereGeometry(0.12, 12, 10), blue, 0.2, 1.86, -0.3);
      g.add(bar, dR, dB);
      g.userData.lightDomes = { red: dR, blue: dB };
      // door decals: POLICE text planes
      const dc = document.createElement('canvas'); dc.width = 256; dc.height = 64;
      const dg = dc.getContext('2d');
      dg.fillStyle = '#101418'; dg.fillRect(0, 0, 256, 64);
      dg.fillStyle = '#ffffff'; dg.font = 'bold 38px Arial'; dg.textAlign = 'center';
      dg.fillText('POLICE', 128, 46);
      const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
      for (const z of [0.99, -0.99]) {
        const p = mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.6 }), 0.1, 0.85, z);
        if (z < 0) p.rotation.y = Math.PI;
        g.add(p);
      }
      // push bar: curved torus arc on the nose
      const push = mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 16, Math.PI), std(0x1a1a1e, 0.5, 0.6), 2.42, 0.5, 0);
      push.rotation.y = Math.PI / 2;
      g.add(push);
    }
    return g;
  };

  // ---- PERSON: capsules + sphere head with a drawn face. No cubes anywhere.
  M.person = function (opts) {
    const o = opts || {};
    const g = new THREE.Group();
    const skin = std(o.skin || '#c98d64', 0.65, 0);
    const shirt = std(o.shirt || '#4c9e8f', 0.85, 0);
    const pants = std(o.pants || '#2e3440', 0.9, 0);
    const hairM = std(o.hair || '#2a1a12', 0.95, 0);
    // torso: capsule
    const torso = mesh(new THREE.CapsuleGeometry(0.21, 0.42, 6, 14), shirt, 0, 1.02, 0);
    // hips
    const hips = mesh(new THREE.SphereGeometry(0.2, 14, 10), pants, 0, 0.72, 0);
    hips.scale.set(1, 0.7, 0.85);
    // head: sphere with a canvas face texture (face centre faces +X)
    const faceCanvas = SB.TEX.face({ skin: o.skin, hair: o.hair, shirt: o.shirt, hairStyle: o.hairStyle, smile: o.smile });
    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const head = mesh(new THREE.SphereGeometry(0.175, 22, 18), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6 }), 0, 1.52, 0);
    // hair cap: slightly larger flattened sphere, offset up-back
    const hair = mesh(new THREE.SphereGeometry(0.185, 18, 14), hairM, -0.03, 1.58, 0);
    hair.scale.set(1, 0.82, 1);
    g.add(torso, hips, head, hair);
    // arms: capsules, angled slightly out + bent
    for (const s of [1, -1]) {
      const arm = mesh(new THREE.CapsuleGeometry(0.06, 0.38, 4, 10), shirt, s * 0.28, 1.08, 0);
      arm.rotation.z = s * 0.25;
      arm.rotation.x = (o.pose === 'panic' ? -2.4 : 0.12);
      const hand = mesh(new THREE.SphereGeometry(0.06, 10, 8), skin, s * 0.33, 0.82, 0.02);
      g.add(arm, hand);
    }
    // legs: capsules in a walking stance
    const legF = mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 10), pants, 0.1, 0.38, 0.1);
    legF.rotation.x = 0.28;
    const legB = mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 10), pants, -0.1, 0.38, -0.12);
    legB.rotation.x = -0.3;
    const shoeM = std(0x1c1c22, 0.5, 0.2);
    const shF = mesh(new THREE.SphereGeometry(0.09, 10, 8), shoeM, 0.1, 0.06, 0.22);
    shF.scale.set(1, 0.6, 1.6);
    const shB = mesh(new THREE.SphereGeometry(0.09, 10, 8), shoeM, -0.1, 0.06, -0.22);
    shB.scale.set(1, 0.6, 1.6);
    g.add(legF, legB, shF, shB);
    const sc = o.scale || 1;
    g.scale.setScalar(sc);
    return g;
  };

  // ---- PALM: curved tube trunk + drooping cone fronds + coconuts.
  M.palm = function (seed) {
    const g = new THREE.Group();
    const lean = (seed % 5 - 2) * 0.12;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean * 0.4, 1.6, 0.05),
      new THREE.Vector3(lean, 3.1, -0.05),
      new THREE.Vector3(lean * 1.5, 4.4, 0.1),
    ]);
    const trunk = mesh(new THREE.TubeGeometry(curve, 10, 0.09, 7), std(0x7a5a38, 1, 0), 0, 0, 0);
    g.add(trunk);
    const top = new THREE.Vector3(lean * 1.5, 4.4, 0.1);
    const frondMat = std(0x2f8f4e, 0.85, 0);
    const frondMat2 = std(0x37a35a, 0.85, 0);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + seed;
      const frond = mesh(new THREE.ConeGeometry(0.34, 2.6, 5), i % 2 ? frondMat : frondMat2, top.x, top.y, top.z);
      frond.scale.set(1, 1, 0.14);
      frond.rotation.order = 'YXZ';
      frond.rotation.y = a;
      frond.rotation.x = 1.95; // droop outward-down
      frond.translateY(1.05);
      g.add(frond);
    }
    for (let i = 0; i < 3; i++) {
      const nut = mesh(new THREE.SphereGeometry(0.09, 10, 8), std(0x5a4020, 0.9, 0),
        top.x + Math.cos(i * 2.1) * 0.18, top.y - 0.18, top.z + Math.sin(i * 2.1) * 0.18);
      g.add(nut);
    }
    return g;
  };

  // ---- Round-canopy tree: cylinder trunk + clustered spheres.
  M.tree = function (seed) {
    const g = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.6, 8), std(0x6b4a2a, 1, 0), 0, 0.8, 0);
    g.add(trunk);
    const greens = [0x3d8a4a, 0x4a9a55, 0x2f7a3e];
    const blobs = [[0, 2.2, 0, 0.95], [0.6, 1.9, 0.2, 0.6], [-0.55, 2.0, -0.15, 0.62], [0.1, 2.7, -0.1, 0.55]];
    blobs.forEach(([x, y, z, r], i) => {
      g.add(mesh(new THREE.SphereGeometry(r, 14, 12), std(greens[(i + seed) % 3], 0.9, 0), x, y, z));
    });
    return g;
  };

  // ---- HELICOPTER: scaled-sphere body, tapered tail, spinning rotor, spotlight.
  M.heli = function () {
    const g = new THREE.Group();
    const bodyM = std(0x1d2733, 0.45, 0.6);
    const body = mesh(new THREE.SphereGeometry(1.0, 20, 16), bodyM, 0, 0, 0);
    body.scale.set(1.7, 0.95, 1.0);
    const glass = mesh(new THREE.SphereGeometry(0.85, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x0d1b28, roughness: 0.08, metalness: 0.9 }), 0.95, 0.12, 0);
    glass.scale.set(0.85, 0.7, 0.85);
    const belly = mesh(new THREE.SphereGeometry(0.7, 14, 10), std(0xe8e4da, 0.5, 0.3), 0, -0.55, 0);
    belly.scale.set(1.4, 0.5, 0.85);
    const tail = mesh(new THREE.CylinderGeometry(0.1, 0.05, 2.6, 8), bodyM, -2.3, 0.15, 0);
    tail.rotation.z = Math.PI / 2 - 0.06;
    const fin = mesh(new THREE.ConeGeometry(0.35, 0.9, 4), bodyM, -3.4, 0.45, 0);
    fin.scale.set(1, 1, 0.18);
    const beacon = mesh(new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0xff2222, emissiveIntensity: 2.5 }), 0, 1.0, 0);
    // skids: bent tubes
    for (const z of [0.75, -0.75]) {
      const skid = mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 14, Math.PI), std(0x30343a, 0.4, 0.7), 0, -1.05, z);
      skid.rotation.y = Math.PI / 2;
      skid.rotation.z = Math.PI;
      g.add(skid);
    }
    // main rotor: 4 slim blades + hub
    const rotor = new THREE.Group();
    rotor.position.y = 1.05;
    const hub = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 10), std(0x30343a, 0.4, 0.7), 0, 0, 0);
    rotor.add(hub);
    for (let i = 0; i < 4; i++) {
      const blade = mesh(new THREE.BoxGeometry(3.4, 0.03, 0.16), std(0x14161a, 0.5, 0.4), 0, 0, 0);
      const holder = new THREE.Group();
      blade.position.x = 1.75;
      holder.rotation.y = (i / 4) * Math.PI * 2;
      holder.add(blade);
      rotor.add(holder);
    }
    // tail rotor
    const tRotor = new THREE.Group();
    tRotor.position.set(-3.35, 0.25, 0.12);
    for (let i = 0; i < 2; i++) {
      const b = mesh(new THREE.BoxGeometry(0.7, 0.03, 0.1), std(0x14161a, 0.5, 0.4), 0, 0, 0);
      const h = new THREE.Group();
      b.position.x = 0.36;
      h.rotation.x = i * Math.PI;
      h.add(b);
      tRotor.add(h);
    }
    // spotlight cone (additive, soft) + lens
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 24, 1, true), coneMat);
    cone.position.set(2.2, -13.5, 0);
    cone.rotation.z = -0.12;
    const lens = mesh(new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2a0, emissiveIntensity: 3 }), 1.55, -0.75, 0);
    g.add(body, glass, belly, tail, fin, beacon, rotor, tRotor, cone, lens);
    g.userData.rotor = rotor;
    g.userData.tailRotor = tRotor;
    g.userData.beam = cone;
    return g;
  };

  // ---- BOAT: extruded hull with a pointed bow + rounded cabin.
  M.boat = function (color) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-2.4, 0.1);
    s.quadraticCurveTo(-2.4, 0.9, -1.6, 0.95);
    s.lineTo(1.4, 0.95);
    s.quadraticCurveTo(2.4, 0.9, 2.4, 0.1);
    s.quadraticCurveTo(1.2, -0.5, 0, -0.55);
    s.quadraticCurveTo(-1.2, -0.5, -2.4, 0.1);
    const hullGeo = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3, curveSegments: 12 });
    hullGeo.translate(0, 0, -0.65);
    const hull = mesh(hullGeo, std(color || 0xf2f0ea, 0.4, 0.1), 0, 0, 0);
    const cabin = mesh(new THREE.CapsuleGeometry(0.55, 1.1, 6, 12), std(0xffffff, 0.35, 0.1), -0.3, 1.1, 0);
    cabin.rotation.z = Math.PI / 2;
    cabin.scale.set(1, 1, 0.7);
    const mast = mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.6, 6), std(0x8a8f96, 0.4, 0.7), 0.6, 2.2, 0);
    g.add(hull, cabin, mast);
    return g;
  };

  // ---- Streetlight: curved arm + glowing globe.
  M.streetlight = function () {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 4.6, 0),
      new THREE.Vector3(0.4, 5.6, 0), new THREE.Vector3(1.4, 5.9, 0),
    ]);
    const pole = mesh(new THREE.TubeGeometry(curve, 12, 0.07, 7), std(0x2c3138, 0.5, 0.6), 0, 0, 0);
    const lamp = mesh(new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 1.8 }), 1.5, 5.85, 0);
    const shade = mesh(new THREE.ConeGeometry(0.34, 0.22, 12, 1, true), std(0x2c3138, 0.5, 0.6), 1.5, 6.02, 0);
    g.add(pole, lamp, shade);
    return g;
  };

  // ---- Traffic light: pole + rounded head with 3 glowing lenses.
  M.trafficLight = function () {
    const g = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 8), std(0x2c3138, 0.5, 0.6), 0, 2.2, 0);
    const head = mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), std(0x14161a, 0.6, 0.3), 0, 4.7, 0);
    const cols = [0xff2a2a, 0xffc21a, 0x2aff66];
    const on = [1, 0, 0];
    cols.forEach((c, i) => {
      const lens = mesh(new THREE.SphereGeometry(0.11, 10, 8),
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: on[i] ? 2.0 : 0.15 }),
        0, 4.95 - i * 0.3, 0.2);
      g.add(lens);
    });
    g.add(pole, head);
    return g;
  };

  return M;
})();
