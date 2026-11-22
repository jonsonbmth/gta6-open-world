// vehicles.js — the sculpted vehicle factory for AURELIA BAY. Cars are
// built from a bezier side profile extruded WITH BEVEL (a real sports-car
// silhouette: sloped nose, curved roofline, tapered tail, wheel arches
// cut into the outline) — never a box. The same factory builds the hero
// DORADO GT, the ABPD cruisers and the parked cars; the helicopter is a
// separate build with a spotlight cone and a ground pool.
//
// Local car space: length along X (front at +X), width along Z, height Y.
// Cars are rotated +90 degrees about Y to face down the street (-Z).

(function () {
  'use strict';

  // Shared geometries/materials: cloned wheels and shared parts keep the
  // draw-call count down with dozens of cars on screen.
  var shared = {};

  function getShared() {
    if (shared.tireGeo) return shared;
    shared.tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20);
    shared.tireGeo.rotateX(Math.PI / 2);
    shared.rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.28, 16);
    shared.rimGeo.rotateX(Math.PI / 2);
    shared.spokeGeo = new THREE.BoxGeometry(0.05, 0.34, 0.05);
    shared.tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 });
    shared.rimMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.9 });
    shared.spokeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6, metalness: 0.4 });
    shared.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d141c, roughness: 0.12, metalness: 0.9,
      clearcoat: 1, clearcoatRoughness: 0.08,
    });
    shared.chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.25, metalness: 1 });
    shared.trimMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.7, metalness: 0.2 });
    shared.plateMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5, metalness: 0.1 });
    return shared;
  }

  // The sculpted side profile of a sports sedan: sloped nose, curved
  // beltline, tapered tail — with the wheel arches cut into the bottom
  // edge as arc detours (not holes, so the outline stays one clean loop).
  function carBodyShape() {
    var s = new THREE.Shape();
    s.moveTo(-2.2, 0.32); // tail, lower
    s.lineTo(-2.2, 0.78); // tail face
    s.quadraticCurveTo(-2.12, 0.86, -1.9, 0.87); // deck edge
    s.quadraticCurveTo(-0.5, 0.88, 0.6, 0.82); // beltline to cowl
    s.quadraticCurveTo(1.3, 0.78, 1.9, 0.7); // hood slope
    s.quadraticCurveTo(2.22, 0.64, 2.24, 0.5); // nose round
    s.quadraticCurveTo(2.24, 0.34, 2.1, 0.26); // nose bottom
    // Bottom edge back to the tail, arcing up around each wheel.
    s.lineTo(1.89, 0.24);
    s.absarc(1.45, 0.24, 0.44, 0, Math.PI, false); // front arch
    s.lineTo(-1.01, 0.24);
    s.absarc(-1.45, 0.24, 0.44, 0, Math.PI, false); // rear arch
    s.lineTo(-2.2, 0.24);
    s.closePath();
    return s;
  }

  // The glasshouse: windshield + side glass + roof, a narrower extrusion
  // that sits on the beltline. Dark glossy glass, not body color.
  function glasshouseShape() {
    var s = new THREE.Shape();
    s.moveTo(-1.5, 0.78);
    s.quadraticCurveTo(-1.38, 1.0, -0.9, 1.08); // rear glass slope
    s.quadraticCurveTo(-0.2, 1.15, 0.4, 1.1); // roof
    s.quadraticCurveTo(0.95, 1.02, 1.15, 0.78); // windshield
    s.closePath();
    return s;
  }

  function makeWheel() {
    var sh = getShared();
    var wheel = new THREE.Group();
    var tire = new THREE.Mesh(sh.tireGeo, sh.tireMat);
    tire.castShadow = true;
    wheel.add(tire);
    var rim = new THREE.Mesh(sh.rimGeo, sh.rimMat);
    wheel.add(rim);
    // Five spokes on each outer face.
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 5; i++) {
        var spoke = new THREE.Mesh(sh.spokeGeo, sh.spokeMat);
        spoke.position.z = side * 0.13;
        spoke.rotation.z = (i / 5) * Math.PI * 2;
        wheel.add(spoke);
      }
    }
    return wheel;
  }

  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  // One sculpted car. opts: color (hex), spoiler (bool), stripes (bool),
  // police (bool), detail (bool — full trim vs. a lighter parked car).
  function createSculptedCar(opts) {
    var o = opts || {};
    var sh = getShared();
    var group = new THREE.Group();
    group.name = o.name || 'car';

    var paint = new THREE.MeshPhysicalMaterial({
      color: o.color || 0xc01818,
      roughness: 0.35,
      metalness: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });

    // Body: bezier profile extruded with a bevel, so every edge is
    // rounded and the silhouette reads as a car, not a slab.
    var bodyGeo = new THREE.ExtrudeGeometry(carBodyShape(), {
      depth: 1.7,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 3,
      curveSegments: 16,
      steps: 1,
    });
    bodyGeo.translate(0, 0, -0.85);
    var body = new THREE.Mesh(bodyGeo, paint);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Glasshouse.
    var glassGeo = new THREE.ExtrudeGeometry(glasshouseShape(), {
      depth: 1.42,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
      curveSegments: 12,
      steps: 1,
    });
    glassGeo.translate(0, 0, -0.71);
    var glass = new THREE.Mesh(glassGeo, sh.glassMat);
    glass.castShadow = true;
    group.add(glass);

    // Wheels: spoked rims filling the arches.
    var wheelPositions = [
      [1.45, 0.36, 0.82], [1.45, 0.36, -0.82],
      [-1.45, 0.36, 0.82], [-1.45, 0.36, -0.82],
    ];
    wheelPositions.forEach(function (p) {
      var w = makeWheel();
      w.position.set(p[0], p[1], p[2]);
      group.add(w);
    });

    if (o.detail !== false) {
      // White racing stripes along the hood and the rear deck.
      if (o.stripes) {
        var stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.4, metalness: 0.2 });
        [-0.14, 0.14].forEach(function (z) {
          var hood = box(1.15, 0.015, 0.17, stripeMat, 1.45, 0.755, z);
          hood.rotation.z = -0.09; // follow the hood slope
          group.add(hood);
          group.add(box(0.85, 0.015, 0.17, stripeMat, -1.62, 0.885, z));
        });
      }
      // Headlights: emissive white blocks, slightly proud of the nose.
      var headMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xfff6c8, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.1,
      });
      group.add(box(0.06, 0.13, 0.42, headMat, 2.24, 0.56, 0.58));
      group.add(box(0.06, 0.13, 0.42, headMat, 2.24, 0.56, -0.58));
      // Grille + front bumper lip.
      group.add(box(0.05, 0.16, 1.05, sh.trimMat, 2.25, 0.4, 0));
      group.add(box(0.3, 0.07, 1.7, sh.trimMat, 2.05, 0.22, 0));
      // PROUD red LED tail bar: mounted in front of the rear face on a
      // black housing strip, so it reads at the chase camera.
      group.add(box(0.05, 0.1, 1.56, sh.trimMat, -2.26, 0.64, 0)); // housing
      var ledMat = new THREE.MeshStandardMaterial({
        color: 0xff2020, emissive: 0xff1818, emissiveIntensity: 2.2, roughness: 0.3,
      });
      group.add(box(0.04, 0.06, 1.5, ledMat, -2.29, 0.64, 0)); // LED bar
      // Corner taillights.
      group.add(box(0.04, 0.12, 0.2, ledMat, -2.27, 0.64, 0.74));
      group.add(box(0.04, 0.12, 0.2, ledMat, -2.27, 0.64, -0.74));
      // License plate + rear bumper band + diffuser fins.
      group.add(box(0.03, 0.15, 0.42, sh.plateMat, -2.28, 0.44, 0));
      group.add(box(0.06, 0.1, 1.7, sh.trimMat, -2.24, 0.28, 0));
      [-0.5, 0, 0.5].forEach(function (z) {
        group.add(box(0.22, 0.12, 0.05, sh.trimMat, -2.2, 0.24, z));
      });
      // Exhaust tips.
      var exhaustGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10);
      exhaustGeo.rotateZ(Math.PI / 2);
      [-0.55, 0.55].forEach(function (z) {
        var ex = new THREE.Mesh(exhaustGeo, sh.chromeMat);
        ex.position.set(-2.26, 0.3, z);
        group.add(ex);
      });
      // Side skirts + mirrors.
      group.add(box(3.4, 0.09, 0.06, sh.trimMat, 0, 0.27, 0.9));
      group.add(box(3.4, 0.09, 0.06, sh.trimMat, 0, 0.27, -0.9));
      [0.95, -0.95].forEach(function (z) {
        group.add(box(0.05, 0.04, 0.12, sh.trimMat, 0.95, 0.86, z));
        group.add(box(0.1, 0.09, 0.05, paint, 0.95, 0.88, z + (z > 0 ? 0.06 : -0.06)));
      });
      // Wing spoiler on two struts (a shaped wing, not a plank).
      if (o.spoiler) {
        var wingGeo = new THREE.ExtrudeGeometry((function () {
          var w = new THREE.Shape();
          w.moveTo(-0.28, 0);
          w.quadraticCurveTo(0, 0.09, 0.28, 0.02);
          w.lineTo(0.28, -0.04);
          w.quadraticCurveTo(0, 0.02, -0.28, -0.04);
          w.closePath();
          return w;
        })(), { depth: 1.55, bevelEnabled: false, curveSegments: 8 });
        wingGeo.translate(0, 0, -0.775);
        var wing = new THREE.Mesh(wingGeo, sh.trimMat);
        wing.position.set(-2.02, 1.02, 0);
        wing.rotation.z = 0.08;
        wing.castShadow = true;
        group.add(wing);
        group.add(box(0.07, 0.16, 0.07, sh.trimMat, -2.02, 0.92, 0.55));
        group.add(box(0.07, 0.16, 0.07, sh.trimMat, -2.02, 0.92, -0.55));
      }
      // Police light bar: red left, blue right, emissive.
      if (o.police) {
        group.add(box(0.34, 0.07, 1.1, sh.trimMat, -0.15, 1.18, 0));
        var redMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 2.5 });
        var blueMat = new THREE.MeshStandardMaterial({ color: 0x2060ff, emissive: 0x1040ff, emissiveIntensity: 2.5 });
        group.add(box(0.3, 0.09, 0.5, redMat, -0.15, 1.25, 0.28));
        group.add(box(0.3, 0.09, 0.5, blueMat, -0.15, 1.25, -0.28));
        // White door stripe.
        var doorMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.2 });
        group.add(box(1.5, 0.3, 0.02, doorMat, -0.1, 0.6, 0.92));
        group.add(box(1.5, 0.3, 0.02, doorMat, -0.1, 0.6, -0.92));
        // Push bar.
        group.add(box(0.08, 0.3, 1.3, sh.trimMat, 2.3, 0.45, 0));
      }
    }

    return group;
  }

  // The hero: a red DORADO GT with stripes and a wing.
  function createHeroCar() {
    var car = createSculptedCar({
      name: 'hero', color: 0xc01818, spoiler: true, stripes: true, detail: true,
    });
    return car;
  }

  // An ABPD cruiser: dark navy with a light bar and white doors.
  function createCruiser(name) {
    var car = createSculptedCar({
      name: name, color: 0x1b2a4a, police: true, detail: true,
    });
    return car;
  }

  // A parked car: sculpted body, lighter trim, a random PS2-era color.
  function createParkedCar(rng) {
    var colors = [0x7a4a21, 0x2a5a8a, 0x5a5a5a, 0x8a8a2a, 0x3a6a3a, 0x6a2a5a, 0x9a9a9a, 0x24425e];
    var idx = Math.floor(rng() * colors.length);
    return createSculptedCar({
      name: 'parked', color: colors[idx], detail: false,
    });
  }

  // The ABPD helicopter AIR-3: high over the street center, nose down the
  // street, tail boom foreshortened toward the camera — never touching a
  // building. A thin spotlight cone drops to a soft pool on the road.
  function createHelicopter() {
    var group = new THREE.Group();
    group.name = 'heli';
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x22303f, roughness: 0.4, metalness: 0.6 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x10161d, roughness: 0.6, metalness: 0.4 });
    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1622, roughness: 0.1, metalness: 0.9, clearcoat: 1 });

    // Fuselage: a scaled sphere (rounded, not a box).
    var fuselage = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), bodyMat);
    fuselage.scale.set(1.25, 0.95, 1.0);
    fuselage.castShadow = true;
    group.add(fuselage);
    // Cockpit glass: a flattened dark sphere at the nose (-Z).
    var cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), glassMat);
    cockpit.scale.set(1.0, 0.75, 0.9);
    cockpit.position.set(0, 0.15, -0.85);
    group.add(cockpit);
    // Tail boom: a tapering cylinder back toward +Z, angled slightly up.
    var boomGeo = new THREE.CylinderGeometry(0.12, 0.28, 3.4, 10);
    boomGeo.rotateX(Math.PI / 2);
    var boom = new THREE.Mesh(boomGeo, bodyMat);
    boom.position.set(0, 0.35, 2.6);
    boom.rotation.x = -0.08;
    boom.castShadow = true;
    group.add(boom);
    // Tail fin + tail rotor.
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.55), bodyMat);
    fin.position.set(0, 0.75, 4.1);
    group.add(fin);
    var tailRotor = new THREE.Group();
    tailRotor.position.set(0.18, 0.7, 4.15);
    var trBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.12), darkMat);
    tailRotor.add(trBlade);
    var trBlade2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.12), darkMat);
    trBlade2.rotation.x = Math.PI / 2;
    tailRotor.add(trBlade2);
    group.add(tailRotor);
    // Main rotor: two long thin blades on a mast.
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), darkMat);
    mast.position.set(0, 1.15, 0);
    group.add(mast);
    var rotor = new THREE.Group();
    rotor.position.set(0, 1.42, 0);
    rotor.name = 'mainRotor';
    var bladeGeo = new THREE.BoxGeometry(0.22, 0.04, 4.6);
    var blade1 = new THREE.Mesh(bladeGeo, darkMat);
    rotor.add(blade1);
    var blade2 = new THREE.Mesh(bladeGeo, darkMat);
    blade2.rotation.y = Math.PI / 2;
    rotor.add(blade2);
    rotor.rotation.y = 0.6; // a pleasing static angle for the shot
    group.add(rotor);
    // Skids.
    [-0.75, 0.75].forEach(function (x) {
      var skidGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8);
      skidGeo.rotateX(Math.PI / 2);
      var skid = new THREE.Mesh(skidGeo, darkMat);
      skid.position.set(x, -1.05, 0);
      group.add(skid);
      [-0.7, 0.7].forEach(function (z) {
        var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), darkMat);
        strut.position.set(x, -0.85, z);
        group.add(strut);
      });
    });
    // Searchlight housing under the nose.
    var lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8d0, emissiveIntensity: 2 }),
    );
    lamp.position.set(0, -0.85, -0.9);
    group.add(lamp);

    // Spotlight cone: apex at the heli, widening to the road. Additive,
    // faint — a beam of light, not a solid object.
    var coneHeight = 19;
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, coneHeight, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff6c0, transparent: true, opacity: 0.1,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      }),
    );
    cone.position.set(0, -coneHeight / 2 - 0.5, -0.5);
    cone.name = 'spotCone';
    group.add(cone);
    // Ground pool: a soft additive disc where the beam lands.
    var pool = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfff2b0, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, -coneHeight + 0.6, -0.5);
    pool.name = 'spotPool';
    group.add(pool);

    return { group: group, rotor: rotor, tailRotor: tailRotor };
  }

  window.AB.vehicles = {
    createSculptedCar: createSculptedCar,
    createHeroCar: createHeroCar,
    createCruiser: createCruiser,
    createParkedCar: createParkedCar,
    createHelicopter: createHelicopter,
  };
})();

