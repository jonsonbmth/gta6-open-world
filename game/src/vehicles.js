// Sirena Bay — vehicles. Cars are built from CURVED shapes: the body is a
// bezier side profile extruded with a bevel, so the edges are round and the
// silhouette reads as a car, never a slab. Wheels are torus tyres with
// spoked hubs. The police helicopter has a capsule fuselage, a glass
// cockpit, a tail boom with a tail rotor, a spinning main rotor, skids and
// a spotlight cone that pools on the hero car.

(function () {
  'use strict';

  function mat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({
      color: color, roughness: rough === undefined ? 0.35 : rough, metalness: metal === undefined ? 0.55 : metal,
    });
  }

  // The side profile of a low sports car, drawn with beziers: nose low,
  // hood rising gently, cabin hump, rear deck falling to a short tail.
  // x = length (-2.1 rear .. +2.1 front), y = height from the ground.
  function sportsProfile() {
    const s = new THREE.Shape();
    s.moveTo(-2.05, 0.32);
    s.lineTo(-2.05, 0.52);
    s.quadraticCurveTo(-2.0, 0.72, -1.70, 0.76); // tail
    s.bezierCurveTo(-1.30, 0.82, -0.95, 1.02, -0.55, 1.06); // rear deck -> roof
    s.bezierCurveTo(-0.20, 1.09, 0.25, 1.09, 0.55, 1.02); // roof
    s.bezierCurveTo(0.95, 0.94, 1.35, 0.78, 1.75, 0.70); // windshield -> hood
    s.quadraticCurveTo(2.05, 0.64, 2.08, 0.42); // nose
    s.lineTo(2.08, 0.32);
    s.quadraticCurveTo(1.55, 0.26, 1.05, 0.32); // front wheel arch hint
    s.lineTo(-1.05, 0.32);
    s.quadraticCurveTo(-1.55, 0.26, -2.05, 0.32);
    return s;
  }

  // A taller, boxier-but-bevelled profile for vans and SUVs.
  function vanProfile() {
    const s = new THREE.Shape();
    s.moveTo(-2.1, 0.30);
    s.lineTo(-2.1, 1.15);
    s.quadraticCurveTo(-2.08, 1.42, -1.80, 1.44);
    s.lineTo(1.15, 1.44);
    s.quadraticCurveTo(1.55, 1.42, 1.85, 1.05);
    s.quadraticCurveTo(2.1, 0.80, 2.1, 0.45);
    s.lineTo(2.1, 0.30);
    s.closePath();
    return s;
  }

  function extrudeBody(profile, width, material) {
    const geo = new THREE.ExtrudeGeometry(profile, {
      depth: width, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.10,
      bevelSegments: 3, steps: 1, curveSegments: 18,
    });
    geo.center();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    // The profile's +X is the car's front; rotate so front faces +Z.
    mesh.rotation.y = -Math.PI / 2;
    return mesh;
  }

  function buildWheel(r) {
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.36, 12, 24), mat('#141414', 0.9, 0.05));
    tyre.castShadow = true;
    g.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, r * 0.5, 18), mat('#c8ccd2', 0.3, 0.9));
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    // Five spokes — thin cylinders radiating from the hub.
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, r * 1.05, 6), mat('#8a8f96', 0.35, 0.85));
      sp.rotation.z = (i / 5) * Math.PI * 2;
      sp.rotation.x = Math.PI / 2;
      // Lay the spoke across the wheel face: rotate around the wheel axis.
      const holder = new THREE.Group();
      holder.rotation.z = (i / 5) * Math.PI * 2;
      sp.rotation.set(0, 0, 0);
      sp.position.set(0, 0, 0);
      sp.rotation.x = Math.PI / 2;
      holder.add(sp);
      g.add(holder);
    }
    return g;
  }

  function lamp(color, x, y, z, sx) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.6, roughness: 0.3 })
    );
    m.scale.set(sx || 1.6, 0.8, 0.6);
    m.position.set(x, y, z);
    return m;
  }

  // opts: color, profile ('sports'|'van'), police (bool), name (for decals).
  // Returns { group, wheels[] } — wheels spin around their local X axis.
  function buildCar(opts) {
    opts = opts || {};
    const paint = mat(opts.color || '#c0392b', 0.28, 0.6);
    const glassMat = new THREE.MeshStandardMaterial({ color: '#0e1a24', roughness: 0.12, metalness: 0.9 });
    const g = new THREE.Group();
    const profile = opts.profile === 'van' ? vanProfile() : sportsProfile();
    const body = extrudeBody(profile, 1.55, paint);
    body.position.y = 0.42;
    g.add(body);

    // Glasshouse: a smaller curved extrude sitting on the body, dark glass.
    // Kept low and narrow so the car reads as a car, not a black box.
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-1.0, 0);
    cabinShape.quadraticCurveTo(-0.9, 0.34, -0.4, 0.37);
    cabinShape.lineTo(0.3, 0.37);
    cabinShape.quadraticCurveTo(0.8, 0.34, 1.0, 0);
    cabinShape.closePath();
    const cabin = extrudeBody(cabinShape, 1.12, glassMat);
    cabin.position.y = 1.24;
    g.add(cabin);

    // Wheels: torus tyres at the four corners, big and proud of the body.
    const wheels = [];
    const wy = 0.37, wz = 1.35, wx = 0.86;
    [[-wx, -wz], [wx, -wz], [-wx, wz], [wx, wz]].forEach((p) => {
      const w = buildWheel(0.37);
      w.position.set(p[0], wy, p[1]);
      w.rotation.y = Math.PI / 2;
      g.add(w);
      wheels.push(w);
    });

    // Lights: emissive headlamps and a wide tail bar.
    g.add(lamp('#fff6c8', -0.55, 0.72, 2.02));
    g.add(lamp('#fff6c8', 0.55, 0.72, 2.02));
    const tail = lamp('#ff2a1e', 0, 0.78, -2.04, 6.0);
    tail.scale.set(6.0, 0.7, 0.5);
    g.add(tail);

    // Grille: a dark flattened nose detail, and side skirts along the sills.
    const grille = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat('#14181f', 0.6, 0.3));
    grille.scale.set(3.4, 1.1, 0.8);
    grille.position.set(0, 0.52, 2.06);
    g.add(grille);
    [-0.88, 0.88].forEach((x) => {
      const skirt = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 2.6, 4, 8), mat('#14181f', 0.6, 0.3));
      skirt.rotation.x = Math.PI / 2;
      skirt.position.set(x, 0.32, 0);
      g.add(skirt);
    });

    // Spoiler: a thin curved wing on two small struts.
    const wingShape = new THREE.Shape();
    wingShape.moveTo(-0.28, 0);
    wingShape.quadraticCurveTo(0, 0.10, 0.28, 0);
    wingShape.lineTo(0.28, -0.05);
    wingShape.quadraticCurveTo(0, 0.03, -0.28, -0.05);
    wingShape.closePath();
    const wingMesh = extrudeBody(wingShape, 1.5, paint);
    wingMesh.position.set(0, 1.06, -1.95);
    wingMesh.rotation.y = -Math.PI / 2;
    g.add(wingMesh);
    [-0.55, 0.55].forEach((x) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), mat('#1a1a1a', 0.6, 0.4));
      strut.position.set(x, 0.96, -1.95);
      g.add(strut);
    });

    // Side mirrors: small spheres on tiny stalks.
    [-0.95, 0.95].forEach((x) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), paint);
      stalk.rotation.z = Math.PI / 2;
      stalk.position.set(x, 1.12, 0.75);
      g.add(stalk);
      const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), paint);
      mirror.scale.set(1, 0.8, 1.2);
      mirror.position.set(x + (x > 0 ? 0.08 : -0.08), 1.12, 0.75);
      g.add(mirror);
    });

    if (opts.police) {
      // Light bar: red and blue emissive capsules on the roof.
      const barBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 10), mat('#101010', 0.5, 0.4));
      barBase.rotation.z = Math.PI / 2;
      barBase.position.set(0, 1.62, -0.1);
      g.add(barBase);
      const red = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 4, 10), new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff2020', emissiveIntensity: 2.2 }));
      red.rotation.z = Math.PI / 2;
      red.position.set(-0.32, 1.66, -0.1);
      g.add(red);
      const blue = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 4, 10), new THREE.MeshStandardMaterial({ color: '#2060ff', emissive: '#2060ff', emissiveIntensity: 2.2 }));
      blue.rotation.z = Math.PI / 2;
      blue.position.set(0.32, 1.66, -0.1);
      g.add(blue);
      // Push bar: two curved tubes at the nose.
      [-0.45, 0.45].forEach((x) => {
        const push = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 16, Math.PI), mat('#222222', 0.4, 0.8));
        push.position.set(x, 0.55, 2.12);
        push.rotation.y = Math.PI / 2;
        g.add(push);
      });
      // POLICE door decals: canvas text on transparent planes.
      const decalTex = window.SB.util.makeTexture(256, 64, (ctx) => {
        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = '#0a1a3a';
        ctx.font = 'bold 40px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('POLICE', 128, 34);
      });
      [-0.92, 0.92].forEach((x) => {
        const decal = new THREE.Mesh(
          new THREE.PlaneGeometry(1.15, 0.29),
          new THREE.MeshBasicMaterial({ map: decalTex, transparent: true })
        );
        decal.position.set(x, 0.82, 0.1);
        decal.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(decal);
      });
    }

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { group: g, wheels: wheels };
  }

  // The police helicopter. Capsule fuselage, glass cockpit bubble, tail boom
  // with fin and tail rotor, four-blade main rotor, skids, and a spotlight
  // cone aimed at the ground. Returns { group, rotor, tailRotor, beam }.
  function buildHelicopter() {
    const g = new THREE.Group();
    const navy = mat('#16283f', 0.35, 0.5);
    const white = mat('#e8ecf0', 0.35, 0.4);
    const glassMat = new THREE.MeshStandardMaterial({ color: '#0a1c28', roughness: 0.08, metalness: 0.95 });

    // Fuselage: a horizontal capsule with a rounded nose.
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.7, 8, 18), navy);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1, 1, 0.92);
    body.castShadow = true;
    g.add(body);
    // White belly: a flattened sphere under the fuselage.
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.82, 18, 12), white);
    belly.scale.set(0.95, 0.55, 1.7);
    belly.position.y = -0.35;
    g.add(belly);
    // Cockpit glass: a dark bubble at the front.
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), glassMat);
    cockpit.scale.set(0.92, 0.78, 1.0);
    cockpit.position.set(0, 0.18, 1.15);
    g.add(cockpit);
    // Tail boom: a tapered cylinder running back, plus a fin.
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 3.4, 12), navy);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 0.25, -2.9);
    boom.castShadow = true;
    g.add(boom);
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.55, 0.15);
    finShape.lineTo(0.75, 1.05);
    finShape.lineTo(0.15, 1.0);
    finShape.closePath();
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: false }), navy);
    fin.position.set(-0.04, 0.15, -4.55);
    g.add(fin);
    // Tail rotor: two thin blades on a hub at the tail.
    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.28, 0.55, -4.45);
    const tailHub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10), mat('#222222', 0.5, 0.5));
    tailHub.rotation.z = Math.PI / 2;
    tailRotor.add(tailHub);
    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.03), mat('#1a1a1a', 0.6, 0.3));
      blade.rotation.x = (i / 2) * Math.PI;
      tailRotor.add(blade);
    }
    g.add(tailRotor);
    // Main rotor: hub + four long thin blades.
    const rotor = new THREE.Group();
    rotor.position.y = 1.05;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 10), mat('#222222', 0.5, 0.5));
    mast.position.y = -0.15;
    rotor.add(mast);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat('#222222', 0.5, 0.5));
    rotor.add(hub);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 3.6), mat('#181818', 0.55, 0.3));
      blade.position.z = 1.95;
      const holder = new THREE.Group();
      holder.rotation.y = (i / 4) * Math.PI * 2;
      holder.add(blade);
      rotor.add(holder);
    }
    g.add(rotor);
    // Skids: two bent tubes under the fuselage.
    [-0.75, 0.75].forEach((x) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, -0.95, 1.5),
        new THREE.Vector3(x, -1.05, 0.6),
        new THREE.Vector3(x, -1.05, -0.9),
        new THREE.Vector3(x, -0.85, -1.5),
      ]);
      const skid = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.045, 8), mat('#30343a', 0.4, 0.7));
      g.add(skid);
      [-0.5, 0.7].forEach((z) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), mat('#30343a', 0.4, 0.7));
        strut.position.set(x, -0.85, z);
        g.add(strut);
      });
    });
    // Spotlight beam: a truncated cone of unit height, open-ended. The game
    // aims it: it stretches from the helicopter to the pool on the ground,
    // so it always reaches whatever the spotlight is tracking. It is NOT a
    // child of the helicopter group — the game adds it to the scene and
    // positions it in world space every frame.
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#fff6c0', transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.9, 1, 20, 1, true), beamMat);
    // The pool of light on the ground is a separate circle, placed by the game.
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { group: g, rotor: rotor, tailRotor: tailRotor, beam: beam };
  }

  window.SB.vehicles = { buildCar, buildHelicopter, sportsProfile, vanProfile };
})();
