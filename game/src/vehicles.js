// Vehicles for AURELIA BAY, built to the gold-F40 reference: LOW, WIDE and
// CURVED. Bodies are extruded from a sculpted side profile with bevelled
// edges, so they read as real cars — sloped nose, curved roofline, visible
// wheel arches, big alloy wheels, rear spoiler. Never a box on wheels.
(function () {
  const AB = window.AB || (window.AB = {});
  const U = AB.Util;

  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242e });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const alloyMat = new THREE.MeshLambertMaterial({ color: 0xc8ccd2 });
  const darkTrimMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a33 });

  // Sculpted body from a side-profile shape, extruded across the width.
  function bodyFromProfile(points, width, depth, color) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: width, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08,
      bevelSegments: 3, steps: 1, curveSegments: 6,
    });
    geo.translate(0, 0, -width / 2);
    const mat = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  // Side profile of a low supercar (x = length, y = height). Nose at +x.
  const HERO_PROFILE = [
    [2.35, 0.28], [2.28, 0.5], [1.9, 0.62], [1.2, 0.68], [0.55, 0.72],
    [0.1, 0.98], [-0.5, 1.06], [-1.1, 1.02], [-1.6, 0.78], [-2.05, 0.7],
    [-2.32, 0.62], [-2.35, 0.3], [-2.3, 0.18], [2.3, 0.18],
  ];
  // Upright sedan profile.
  const SEDAN_PROFILE = [
    [2.2, 0.3], [2.12, 0.62], [1.5, 0.74], [0.8, 0.8], [0.3, 1.18],
    [-0.5, 1.28], [-1.2, 1.2], [-1.7, 0.86], [-2.15, 0.8], [-2.2, 0.32],
    [-2.15, 0.2], [2.15, 0.2],
  ];

  function makeWheel(radius, width) {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    g.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.04, 14), alloyMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    // Five spokes.
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.07, radius * 0.95, width + 0.06), darkTrimMat);
      spoke.rotation.z = (i / 5) * Math.PI * 2;
      g.add(spoke);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width + 0.08, 8), darkTrimMat);
    cap.rotation.x = Math.PI / 2;
    g.add(cap);
    return g;
  }

  // Dark arch disc behind each wheel so the wheel arch reads in profile.
  function archDisc(radius) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.22, 18),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
    return m;
  }

  function makeCar(opts) {
    const o = opts || {};
    const style = o.style || 'sedan';
    const color = o.color !== undefined ? o.color : 0xc0392b;
    const car = new THREE.Group();
    const isHero = style === 'hero';
    const profile = isHero ? HERO_PROFILE : SEDAN_PROFILE;
    const bodyW = isHero ? 1.86 : 1.72;
    const noseX = isHero ? 2.43 : 2.28; // profile tip + bevel
    const body = bodyFromProfile(profile, bodyW, 0, color);
    car.add(body);

    // Glass cabin: sits proud of the roofline so the glasshouse reads from
    // every angle — a dark band along the top, not a box on the roof.
    const cabin = new THREE.Group();
    const cabY = isHero ? 1.08 : 1.3;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(isHero ? 1.5 : 1.7, 0.26, bodyW * 0.78), glassMat);
    canopy.position.set(isHero ? -0.35 : -0.25, cabY, 0);
    canopy.rotation.z = isHero ? 0.06 : 0.02;
    canopy.castShadow = true;
    cabin.add(canopy);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, bodyW * 0.76), glassMat);
    shield.position.set(isHero ? 0.42 : 0.62, cabY - 0.13, 0);
    shield.rotation.z = isHero ? 0.62 : 0.5;
    cabin.add(shield);
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, bodyW * 0.76), glassMat);
    rearGlass.position.set(-1.15, cabY - 0.1, 0);
    rearGlass.rotation.z = isHero ? -0.55 : -0.45;
    cabin.add(rearGlass);
    car.add(cabin);

    // Headlights + taillight blocks, proud of the bevelled faces.
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.42), lightMat);
    hl.position.set(noseX + 0.02, 0.52, 0.6); car.add(hl);
    const hl2 = hl.clone(); hl2.position.z = -0.6; car.add(hl2);
    [-0.55, 0.55].forEach(function (z) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.5), tailMat);
      tl.position.set(-noseX - 0.02, 0.56, z);
      car.add(tl);
    });

    // Lower side skirt + bumpers.
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, bodyW + 0.2), darkTrimMat);
    skirt.position.set(0, 0.2, 0); car.add(skirt);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, bodyW * 0.9), darkTrimMat);
    nose.position.set(noseX - 0.05, 0.26, 0); car.add(nose);
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, bodyW * 0.9), darkTrimMat);
    rearBumper.position.set(-noseX + 0.05, 0.26, 0); car.add(rearBumper);

    // Rear spoiler: high above the rear deck, F40-style, on two struts.
    if (isHero || style === 'sport') {
      const wingY = isHero ? 1.3 : 1.56;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, bodyW),
        new THREE.MeshLambertMaterial({ color: 0x1a1a1c }));
      wing.position.set(-2.2, wingY, 0);
      wing.rotation.z = 0.1;
      wing.castShadow = true;
      car.add(wing);
      [-0.6, 0.6].forEach(function (z) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, wingY - 0.68, 0.08), darkTrimMat);
        strut.position.set(-2.2, (wingY + 0.68) / 2, z);
        car.add(strut);
      });
    }

    // Police livery: white doors + roof light bar.
    if (style === 'cruiser') {
      const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, bodyW + 0.2),
        new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
      door.position.set(-0.1, 0.55, 0);
      car.add(door);
      const bar = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 1.1), darkTrimMat);
      bar.add(base);
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      red.position.z = 0.28; bar.add(red);
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      blue.position.z = -0.28; bar.add(blue);
      bar.position.set(-0.25, 1.52, 0);
      car.add(bar);
      car.userData.lightBar = bar;
    }
    if (style === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.34),
        new THREE.MeshBasicMaterial({ color: 0xffe066 }));
      sign.position.set(-0.25, 1.52, 0);
      car.add(sign);
    }

    // Wheels: big alloys, slightly proud of the body sides, with arch discs.
    const wr = isHero ? 0.42 : 0.38;
    const wz = bodyW / 2 + 0.02;
    const az = bodyW / 2 + 0.09;
    const wheels = [];
    [[1.45, wz, true], [1.45, -wz, true], [-1.45, wz, false], [-1.45, -wz, false]].forEach(function (w) {
      const steer = new THREE.Group();
      steer.position.set(w[0], wr, w[1]);
      const wheel = makeWheel(wr, 0.3);
      steer.add(wheel);
      const arch = archDisc(wr);
      arch.position.set(w[0], wr, w[1] > 0 ? az : -az);
      arch.rotation.y = w[1] > 0 ? 0 : Math.PI;
      car.add(arch);
      car.add(steer);
      wheels.push({ steer: steer, spin: wheel, front: w[2] });
    });

    car.userData = car.userData || {};
    car.userData.wheels = wheels;
    car.userData.wheelRadius = wr;
    car.userData.style = style;
    return car;
  }

  // Spin wheels + steer the front pair.
  function driveWheels(car, speed, steer, dt) {
    const wr = car.userData.wheelRadius;
    car.userData.wheels.forEach(function (w) {
      w.spin.rotation.x += (speed / wr) * dt;
      if (w.front) w.steer.rotation.y = steer * 0.42;
    });
  }

  // Ambient traffic: cars cruising a straight lane, wrapping at the ends.
  const TRAFFIC_COLORS = [0x3a6ea5, 0xc0c0c8, 0x7a4a2a, 0x2e7d5b, 0x8a8f96, 0xa83232, 0x2b2f36, 0xd8d8d8, 0xe8b93c, 0x4a6b8a];
  function makeTraffic(scene) {
    const lanes = [
      { axis: 'z', fixed: 4, dir: -1, from: 170, to: -170 },   // Sunset Mile NB
      { axis: 'z', fixed: -4, dir: 1, from: -170, to: 170 },   // Sunset Mile SB
      { axis: 'x', fixed: 3, dir: 1, from: -74, to: 170 },    // Coral Market EB
      { axis: 'x', fixed: -3, dir: -1, from: 170, to: -74 },  // Coral Market WB
      { axis: 'z', fixed: -67.5, dir: -1, from: 170, to: -170 }, // Aurelia NB
      { axis: 'z', fixed: -74.5, dir: 1, from: -170, to: 170 },  // Aurelia SB
    ];
    const cars = [];
    for (let i = 0; i < 26; i++) {
      const lane = lanes[i % lanes.length];
      const style = U.pick(['sedan', 'sedan', 'sedan', 'taxi', 'sport']);
      const car = makeCar({ style: style, color: style === 'taxi' ? 0xf2c230 : U.pick(TRAFFIC_COLORS) });
      const t = U.rand(0, 1);
      const pos = U.lerp(lane.from, lane.to, t);
      if (lane.axis === 'z') {
        car.position.set(lane.fixed, 0, pos);
        car.rotation.y = lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        car.position.set(pos, 0, lane.fixed);
        car.rotation.y = lane.dir > 0 ? Math.PI : 0;
      }
      car.userData.lane = lane;
      car.userData.speed = U.rand(6, 11);
      scene.add(car);
      cars.push(car);
    }
    return cars;
  }

  function updateTraffic(cars, dt) {
    cars.forEach(function (car) {
      const lane = car.userData.lane;
      const step = lane.dir * car.userData.speed * dt;
      if (lane.axis === 'z') {
        car.position.z += step;
        if (lane.dir < 0 && car.position.z < lane.to) car.position.z = lane.from;
        if (lane.dir > 0 && car.position.z > lane.to) car.position.z = lane.from;
      } else {
        car.position.x += step;
        if (lane.dir > 0 && car.position.x > lane.to) car.position.x = lane.from;
        if (lane.dir < 0 && car.position.x < lane.to) car.position.x = lane.from;
      }
      driveWheels(car, car.userData.speed, 0, dt);
    });
  }

  AB.Vehicles = { makeCar, driveWheels, makeTraffic, updateTraffic };
})();
