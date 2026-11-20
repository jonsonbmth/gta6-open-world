// SOLMAR BAY — vehicles: the bright red hero sports car (extruded profile,
// spoked wheels, full-width taillight bar, diffuser, dual exhausts), traffic
// cars, police cars with flashing light bars, and marina boats.

var SB = window.SB || (window.SB = {});

SB.cars = (function () {
  // A spoked wheel: dark tyre torus, light rim disc, five spokes.
  function buildWheel() {
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.12, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
    );
    g.add(tyre);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.85, roughness: 0.3 })
    );
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.35 });
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.04), spokeMat);
      const a = (i / 5) * Math.PI * 2;
      spoke.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0.06);
      spoke.rotation.z = a;
      g.add(spoke);
    }
    return g;
  }

  // The hero: a bright red sports car, built from an extruded side profile so
  // it reads as a sculpted car, not a box. Forward is +z after the rotate.
  function buildHeroCar() {
    const car = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({
      color: SB.config.car.color, metalness: 0.6, roughness: 0.32,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x16222e, metalness: 0.9, roughness: 0.12,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });

    // Lower body: low nose, rising beltline, fastback tail.
    const s = new THREE.Shape();
    s.moveTo(-2.25, 0.32);
    s.lineTo(2.05, 0.32); // front low
    s.lineTo(2.25, 0.55); // nose tip
    s.lineTo(2.05, 0.72); // hood
    s.lineTo(0.55, 0.82); // cowl
    s.lineTo(-0.35, 0.86); // roof base front
    s.lineTo(-1.55, 0.84); // fastback slope
    s.lineTo(-2.25, 0.62); // tail
    s.lineTo(-2.25, 0.32);
    const bodyGeo = new THREE.ExtrudeGeometry(s, {
      depth: 1.78, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2, steps: 1,
    });
    bodyGeo.translate(0, 0, -0.89);
    bodyGeo.rotateY(-Math.PI / 2); // profile x-axis (length) -> +z (forward)
    const body = new THREE.Mesh(bodyGeo, paint);
    body.castShadow = true;
    car.add(body);

    // Cabin glass: trapezoid, slightly narrower than the body.
    const c = new THREE.Shape();
    c.moveTo(-1.35, 0.82);
    c.lineTo(0.35, 0.82);
    c.lineTo(-0.05, 1.28);
    c.lineTo(-0.95, 1.28);
    c.lineTo(-1.35, 0.82);
    const cabGeo = new THREE.ExtrudeGeometry(c, {
      depth: 1.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, steps: 1,
    });
    cabGeo.translate(0, 0, -0.75);
    cabGeo.rotateY(-Math.PI / 2);
    const cabin = new THREE.Mesh(cabGeo, glass);
    cabin.castShadow = true;
    car.add(cabin);

    // Spoiler on two supports.
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.42), paint);
    spoiler.position.set(0, 1.06, -2.05);
    spoiler.castShadow = true;
    car.add(spoiler);
    for (const dx of [-0.6, 0.6]) {
      const sup = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), dark);
      sup.position.set(dx, 0.94, -2.05);
      car.add(sup);
    }

    // FULL-WIDTH taillight bar (emissive red) + brake glow handled by main.js.
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 0.09, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1a1a, emissiveIntensity: 1.6 })
    );
    bar.position.set(0, 0.62, -2.28);
    car.add(bar);
    car.userData.taillight = bar;

    // Headlights.
    for (const dx of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.08, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff6d8, emissiveIntensity: 2.2 })
      );
      hl.position.set(dx, 0.6, 2.28);
      car.add(hl);
    }

    // Diffuser with fins under the tail.
    const diff = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.3), dark);
    diff.position.set(0, 0.3, -2.2);
    car.add(diff);
    for (let i = -2; i <= 2; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.28), dark);
      fin.position.set(i * 0.32, 0.28, -2.2);
      car.add(fin);
    }

    // Dual exhausts.
    const chrome = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.9, roughness: 0.25 });
    for (const dx of [-0.42, 0.42]) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10), chrome);
      ex.rotation.x = Math.PI / 2;
      ex.position.set(dx, 0.32, -2.32);
      car.add(ex);
    }

    // Side skirts.
    for (const dx of [-0.92, 0.92]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 3.4), dark);
      skirt.position.set(dx, 0.32, 0);
      car.add(skirt);
    }

    // Four spoked wheels (steerable fronts stored for main.js).
    const wheels = [];
    const wheelPos = [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]];
    for (let i = 0; i < 4; i++) {
      const w = buildWheel();
      w.position.set(wheelPos[i][0], 0.36, wheelPos[i][1]);
      w.castShadow = true;
      car.add(w);
      wheels.push(w);
    }
    car.userData.wheels = wheels;
    car.userData.frontWheels = [wheels[0], wheels[1]];
    return car;
  }

  // A plain traffic car (box body + glass cabin + wheels).
  function buildTrafficCar(color) {
    const car = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: color, metalness: 0.4, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 4.1), paint);
    body.position.y = 0.62;
    body.castShadow = true;
    car.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.55, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x1c2836, metalness: 0.8, roughness: 0.2 })
    );
    cabin.position.set(0, 1.18, -0.25);
    cabin.castShadow = true;
    car.add(cabin);
    for (const dx of [-0.55, 0.55]) {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.08, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2c0, emissiveIntensity: 1.2 })
      );
      hl.position.set(dx, 0.62, 2.08);
      car.add(hl);
    }
    for (const [wx, wz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12),
        new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      car.add(w);
    }
    return car;
  }

  // A police car: black-and-white livery, roof light bar (red/blue, flashed by police.js).
  function buildPoliceCar() {
    const car = buildTrafficCar(0x1a1a1a);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.84, 0.4, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.4, roughness: 0.5 })
    );
    door.position.set(0, 0.66, -0.1);
    car.add(door);
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }));
    barBase.position.set(0, 1.52, -0.25);
    car.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff0000, emissiveIntensity: 2.5 }));
    red.position.set(-0.28, 1.56, -0.25);
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x000033, emissive: 0x2244ff, emissiveIntensity: 2.5 }));
    blue.position.set(0.28, 1.56, -0.25);
    car.add(blue);
    car.userData.lightRed = red;
    car.userData.lightBlue = blue;
    return car;
  }

  // A marina boat, side-on: coloured hull, white cabin, mast. Long axis is x.
  function buildBoat(hullColor) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 1.1, 2.4),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.45, metalness: 0.25 })
    );
    hull.position.y = 0.55;
    hull.castShadow = true;
    boat.add(hull);
    // Sloped bow.
    const bow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 1.2, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.45, metalness: 0.25 })
    );
    bow.rotation.set(0, Math.PI / 4, 0);
    bow.rotation.z = -Math.PI / 2; // tapered point faces +x (the bow)
    bow.position.set(4.3, 0.55, 0);
    bow.scale.set(1, 1, 1.5);
    boat.add(bow);
    // White cabin.
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.0, 1.9),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })
    );
    cabin.position.set(-0.4, 1.55, 0);
    cabin.castShadow = true;
    boat.add(cabin);
    // Windows on the cabin.
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.4, 1.94),
      new THREE.MeshStandardMaterial({ color: 0x1c2836, metalness: 0.7, roughness: 0.2 })
    );
    win.position.set(-0.4, 1.65, 0);
    boat.add(win);
    // Mast.
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.3 })
    );
    mast.position.set(0.6, 3.4, 0);
    boat.add(mast);
    return boat;
  }

  return {
    buildHeroCar: buildHeroCar,
    buildTrafficCar: buildTrafficCar,
    buildPoliceCar: buildPoliceCar,
    buildBoat: buildBoat,
  };
})();
